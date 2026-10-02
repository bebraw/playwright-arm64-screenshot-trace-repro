# Playwright Linux ARM64 Screenshot Trace Reproduction

Standalone reproduction for screenshot-tracing crashes observed with Playwright 1.63.0's bundled Chromium in a Linux ARM64 container on an Apple M4 Max host using OrbStack 2.2.3.

The page is an in-memory HTML heading. The sole dependency is Playwright. The script starts a DevTools trace, waits five seconds, reads the complete trace stream, and requires screenshot image events when screenshots are enabled.

## Run In Linux ARM64

```sh
git clone https://github.com/bebraw/playwright-arm64-screenshot-trace-repro.git
cd playwright-arm64-screenshot-trace-repro
./run-docker.sh 1.63.0 on shell
```

The helper selects the matching official Playwright Noble image and installs dependencies inside a disposable container. It mounts the repository read-only, uses host IPC, and writes working files only under the container's `/tmp/repro`. It does not use host `node_modules`, production services, or credentials.

Comparison commands:

```sh
./run-docker.sh 1.63.0 off shell
./run-docker.sh 1.62.1 on shell
./run-docker.sh 1.63.0 on full
./run-docker.sh 1.63.0 off full
./run-docker.sh 1.62.1 on full
```

`shell` uses default `chromium.launch()`. `full` uses `chromium.executablePath()` and `--disable-gpu`, matching the executable and GPU flag used by the original Lighthouse launcher. Both run headless. Browser binaries come from the matching image.

For Chromium process logs:

```sh
DEBUG=pw:browser ./run-docker.sh 1.63.0 on full
```

## Expected Behavior

Both browser modes finish tracing and return screenshot image events when screenshots are enabled. The script prints `result: PASS` and exits 0. A crash, missing screenshots, malformed/incomplete stream, or 30-second timeout exits nonzero.

The screenshot-disabled cases are diagnostic controls, not performance-audit workarounds.

## Verification

Verification results will be recorded after the standalone repository is tested from a fresh clone. Earlier application-level observations were: Playwright 1.63.0 crashes with screenshot tracing enabled, finishes with that category removed, and Playwright 1.62.1 finishes with screenshots enabled.

Those observations establish a version-dependent failure in the reported container environment. They do not establish that native Linux ARM64 or other virtualization runtimes are affected, or identify the implementation cause.

Playwright 1.63 introduced Chrome for Testing builds on Linux ARM64 ([release notes](https://github.com/microsoft/playwright/releases/tag/v1.63.0)). This is relevant version context, not a proven cause.

This reproduction was prepared with AI assistance. Results must come from actually running the commands above.
