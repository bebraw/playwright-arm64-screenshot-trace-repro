import { createRequire } from "node:module";
import { arch, platform, release } from "node:os";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const screenshots = process.env.TRACE_SCREENSHOTS !== "off";
const mode = process.env.BROWSER_MODE || "shell";
if (!["shell", "full"].includes(mode)) throw new Error("BROWSER_MODE must be shell or full.");

const environment = {
  platform: platform(),
  arch: arch(),
  kernel: release(),
  node: process.version,
  playwright: require("playwright/package.json").version,
  mode,
  screenshots,
};
let browser;
const timeout = setTimeout(() => {
  console.error(JSON.stringify({ ...environment, result: "TIMEOUT", timeoutMs: 30_000 }));
  process.exit(1);
}, 30_000);

try {
  browser = await chromium.launch(
    mode === "full" ? { executablePath: chromium.executablePath(), args: ["--disable-gpu"] } : {},
  );
  console.log(JSON.stringify({ ...environment, chromium: browser.version(), executableSelection: mode === "full" ? "chromium.executablePath()" : "default chromium.launch()" }));
  const page = await browser.newPage();
  const session = await page.context().newCDPSession(page);
  const categories = ["devtools.timeline", "v8.execute"];
  if (screenshots) categories.push("disabled-by-default-devtools.screenshot");

  await session.send("Tracing.start", { categories: categories.join(","), transferMode: "ReturnAsStream" });
  await page.goto("data:text/html,<h1>Browser tracing regression</h1>");
  await page.waitForTimeout(5_000);

  const completion = new Promise((resolve, reject) => {
    session.once("Tracing.tracingComplete", ({ stream }) => {
      if (stream) resolve(stream);
      else reject(new Error("Trace did not return a stream."));
    });
  });
  await session.send("Tracing.end");
  const stream = await completion;
  let contents = "";

  while (true) {
    const chunk = await session.send("IO.read", { handle: stream });
    contents += chunk.base64Encoded ? Buffer.from(chunk.data, "base64").toString("utf8") : chunk.data;
    if (chunk.eof) break;
  }
  await session.send("IO.close", { handle: stream });

  const events = JSON.parse(contents).traceEvents;
  const frames = events.filter((event) => event.name === "Screenshot" && typeof event.args?.snapshot === "string" && event.args.snapshot.length > 0);
  if (screenshots && frames.length === 0) throw new Error("Trace completed without screenshot image events.");
  console.log(JSON.stringify({ ...environment, result: "PASS", screenshotEvents: frames.length }));
} catch (error) {
  console.error(JSON.stringify({ ...environment, result: "FAIL", message: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
  await browser?.close();
}
