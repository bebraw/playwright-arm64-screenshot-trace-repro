#!/bin/sh
set -eu

playwright_version="${1:-1.63.0}"
trace_screenshots="${2:-on}"
browser_mode="${3:-shell}"
case "$playwright_version" in
  1.63.0|1.62.1) ;;
  *) printf '%s\n' 'Version must be 1.63.0 or 1.62.1.' >&2; exit 2 ;;
esac
case "$trace_screenshots" in
  on|off) ;;
  *) printf '%s\n' 'Screenshots must be on or off.' >&2; exit 2 ;;
esac
case "$browser_mode" in
  shell|full) ;;
  *) printf '%s\n' 'Browser mode must be shell or full.' >&2; exit 2 ;;
esac

repo_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
docker run --rm --init --platform linux/arm64 --ipc=host \
  --mount "type=bind,source=$repo_dir,target=/repro,readonly" \
  -e "PW_VERSION=$playwright_version" \
  -e "TRACE_SCREENSHOTS=$trace_screenshots" \
  -e "BROWSER_MODE=$browser_mode" \
  -e "DEBUG=${DEBUG:-}" \
  "mcr.microsoft.com/playwright:v$playwright_version-noble" \
  /bin/sh -eu -c '
    mkdir /tmp/repro
    cp /repro/package.json /repro/package-lock.json /repro/repro.mjs /tmp/repro/
    cd /tmp/repro
    if [ "$PW_VERSION" != "1.63.0" ]; then
      npm install --package-lock-only --save-exact --ignore-scripts --no-audit --no-fund "playwright@$PW_VERSION"
    fi
    npm ci --ignore-scripts --no-audit --no-fund
    npm run repro
  '
