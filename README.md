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

Verified on **2026-10-02** from a fresh GitHub clone of commit `51074c0`, using the commands above. Every case installed its own dependencies inside a fresh container. No application code, Lighthouse, host `node_modules`, or external page was involved.

| Playwright | Chromium | Node in image | Browser mode | Screenshots | Result | Exit | Screenshot events |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.63.0 | 153.0.8010.12 | 24.20.0 | shell | on | Browser closes during tracing | 1 | No completed trace |
| 1.63.0 | 153.0.8010.12 | 24.20.0 | shell | off | PASS | 0 | 0 |
| 1.62.1 | 151.0.7922.34 | 24.18.1 | shell | on | PASS | 0 | 1 |
| 1.63.0 | 153.0.8010.12 | 24.20.0 | full | on | GPU crashes; browser closes | 1 | No completed trace |
| 1.63.0 | 153.0.8010.12 | 24.20.0 | full | off | PASS | 0 | 0 |
| 1.62.1 | 151.0.7922.34 | 24.18.1 | full | on | PASS | 0 | 2 |

Screenshot event counts can vary; the important outcome is a completed trace with nonempty screenshot image events when enabled. The official image comparison changes the bundled Node version as well as Playwright and Chromium; each screenshot-disabled control keeps the same image and Node as its failing case.

### Environment

- Host: Apple M4 Max, macOS 27.0.1.
- Container runtime: OrbStack 2.2.3.
- Container OS: Ubuntu 24.04.4 LTS, native `linux/arm64`.
- Kernel: `7.0.14-orbstack-00380-ga7e0a2dc9535`.
- Chromium launched headless; host IPC enabled; default Playwright sandbox settings.
- The full executable case additionally passes `--disable-gpu`.
- Playwright 1.63.0 was the latest stable release when verified.

Exact image digests reported by the local ARM64 Docker engine:

```text
1.63.0-noble: mcr.microsoft.com/playwright@sha256:eff16c30e6f3f4af0a03fa4b706120d5e9b0891c344a27d64559aff5900a4a27
1.62.1-noble: mcr.microsoft.com/playwright@sha256:dcc5531e97840b9b5e794f2814476b21571c5124a3fca2267d73041f56e7580e
```

### Crash Evidence

`DEBUG=pw:browser ./run-docker.sh 1.63.0 on full` recorded six GPU-process exits with signal 4 before Chromium shut down. Relevant excerpts:

```text
Received signal 4 <unknown>
ERROR:content/browser/gpu/gpu_process_host.cc:1054] GPU process exited unexpectedly: exit_code=4
FATAL:content/browser/gpu/gpu_data_manager_impl_private.cc:417] GPU process isn't usable. Goodbye.
```

The reproduction then returned:

```json
{"platform":"linux","arch":"arm64","kernel":"7.0.14-orbstack-00380-ga7e0a2dc9535","node":"v24.20.0","playwright":"1.63.0","mode":"full","screenshots":true,"result":"FAIL","message":"page.waitForTimeout: Target page, context or browser has been closed"}
```

These results establish a version-dependent failure in the reported container environment. They do not establish that native Linux ARM64 hosts or other virtualization runtimes are affected, or identify the implementation cause. An existing Docker Desktop context was unavailable, so no second-runtime result is claimed.

Playwright 1.63 introduced Chrome for Testing builds on Linux ARM64 ([release notes](https://github.com/microsoft/playwright/releases/tag/v1.63.0)). This is relevant version context, not a proven cause.

This reproduction and its README were prepared with AI assistance. The results above were captured by actually running the commands; the underlying cause remains unconfirmed.
