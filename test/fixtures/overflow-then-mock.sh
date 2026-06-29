#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MARKER="${MOCK_OVERFLOW_MARKER:?MOCK_OVERFLOW_MARKER is required}"

if [ ! -f "$MARKER" ]; then
  touch "$MARKER"
  node -e "const line = 'x'.repeat(2 * 1024 * 1024) + '\n'; process.stdout.write(line + line + line); setTimeout(() => {}, 60000)"
fi

exec "$ROOT_DIR/scripts/run-mock.sh" "$@"
