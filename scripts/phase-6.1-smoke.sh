#!/usr/bin/env bash
# phase-6.1-smoke.sh — Headless E2E smoke test for jito-ide <-> jito v0.2.0
#
# Drives the REAL jito CLI binary through every mode × every prompt in the
# Phase 6.1 acceptance matrix. Uses the mock provider fallback (JITO_API_KEY
# absent / set to "mock") so this script runs without a Minimax API key.
#
# Why this script exists:
#   The jito-ide extension is wired to a JSON-RPC streaming server that the
#   jito CLI does not yet expose (`jito serve` is "unknown command"). Phase
#   4.1's "client verification" was tested against scripts/mock-jito-server.mjs,
#   not against `jito serve`. This harness exercises the CLI path that *does*
#   exist (`jito run --mode=X --no-tui`) so we still get signal on:
#     - 5-mode system prompt routing
#     - Streamed output (chunks land gradually)
#     - Time-to-first-token
#     - Exit code stability
#   The remaining GUI verification (mode badge color, footer token count,
#   console errors, F5 host) must be done by a human in VS Code.
#
# Usage:
#   ./scripts/phase-6.1-smoke.sh [<jito-binary>]
#   ./scripts/phase-6.1-smoke.sh /tmp/jito-probe
#
# Output:
#   Prints one JSON line per (mode, prompt) pair on stdout.
#   Writes a JSON report to artifacts/phase-6.1-smoke-report.json.
#   Exit 0 if all 10 messages produce non-empty output, exit 1 otherwise.

set -uo pipefail

JITO_BIN="${1:-$(command -v jito 2>/dev/null || echo /tmp/jito-probe)}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPORT="$REPO_ROOT/artifacts/phase-6.1-smoke-report.json"

# Force mock provider so we don't need JITO_API_KEY.
export JITO_MOCK="${JITO_MOCK:-1}"
unset JITO_API_KEY OPENAI_API_KEY MINIMAX_API_KEY

mkdir -p "$(dirname "$REPORT")"
: > "$REPORT"

if [[ ! -x "$JITO_BIN" ]]; then
  echo "{\"fatal\":\"jito binary not found at $JITO_BIN\"}" | tee -a "$REPORT"
  exit 2
fi

VERSION_OUT="$("$JITO_BIN" version 2>&1 | head -1 || echo 'unknown')"
export VERSION_OUT

MODES=(dev reason create audit universal)

declare -A PROMPTS=(
  [dev1]="Write a hello world in Rust"
  [dev2]="Refactor this loop to use iterators"
  [reason1]="Compare auth strategies: session vs JWT"
  [reason2]="Plan migration from REST to gRPC"
  [create1]="Write a tagline for jito-ide"
  [create2]="Draft a tweet announcing our v0.2.0 launch"
  [audit1]="Review this code: function add(a,b){ return a-b }"
  [audit2]="Find SQL injection risk in this query builder"
  [universal1]="What is TypeScript?"
  [universal2]="Summarise jito-ide in one sentence"
)

run_one() {
  local mode="$1"
  local prompt="$2"
  local key="${mode}$(( (RANDOM % 2) + 1 ))"
  # Alternate between the two prompts for the mode.
  case $((RANDOM % 2)) in
    0) key="${mode}1";;
    1) key="${mode}2";;
  esac
  local actual_prompt="${PROMPTS[$key]}"

  local started_ms first_ms done_ms
  started_ms=$(date +%s%3N)
  local chunk_count=0
  local total_bytes=0
  local first_chunk_ms=""

  # Read line-by-line so we can measure stream cadence.
  local output=""
  local line
  while IFS= read -r line; do
    if [[ -z "$first_chunk_ms" && -n "$line" ]]; then
      first_chunk_ms=$(date +%s%3N)
    fi
    chunk_count=$((chunk_count + 1))
    total_bytes=$((total_bytes + ${#line}))
    output+="$line"$'\n'
  done < <( "$JITO_BIN" --no-tui --mode="$mode" run "$actual_prompt" 2>&1 )
  local rc=$?
  done_ms=$(date +%s%3N)

  local ttft_ms="null"
  if [[ -n "$first_chunk_ms" ]]; then
    ttft_ms=$((first_chunk_ms - started_ms))
  fi
  local total_ms=$((done_ms - started_ms))

  python3 - "$mode" "$actual_prompt" "$rc" "$chunk_count" "$total_bytes" \
    "$ttft_ms" "$total_ms" "$VERSION_OUT" "$output" <<'PY'
import json, sys
mode, prompt, rc, chunks, size, ttft, total, ver, out = sys.argv[1:10]
print(json.dumps({
    "mode": mode,
    "prompt": prompt,
    "exit_code": int(rc),
    "streamed_chunks": int(chunks),
    "output_bytes": int(size),
    "ttft_ms": ttft if ttft == "null" else int(ttft),
    "total_ms": int(total),
    "jito_version_line": ver.strip(),
    "success": int(rc) == 0 and int(chunks) > 0 and int(size) > 0,
    "output_preview": (out.strip()[:160] + ("…" if len(out.strip()) > 160 else "")),
}, ensure_ascii=False))
PY
}

fatal_count=0
results=()
i=0
for mode in "${MODES[@]}"; do
  for n in 1 2; do
    line="$(run_one "$mode" "$n")"
    echo "$line"
    echo "$line" >> "$REPORT"
    if python3 -c "import sys,json;d=json.loads(sys.argv[1]);sys.exit(0 if d['success'] else 1)" "$line"; then
      :
    else
      fatal_count=$((fatal_count + 1))
    fi
    i=$((i + 1))
  done
done

if [[ "$fatal_count" -eq 0 ]]; then
  echo "{\"summary\":\"all 10 messages succeeded\"}" >> "$REPORT"
  exit 0
else
  echo "{\"summary\":\"$fatal_count/10 messages failed\"}" >> "$REPORT"
  exit 1
fi
