#!/bin/bash
# Workboard RPC helper for jito-ide Phase 3.5 (SettingsPage) card
# Usage:
#   wb-heartbeat <note>     # refresh claim heartbeat
#   wb-complete <summary> <proof>
#   wb-block <reason>
set -euo pipefail

CARD_ID="d7f70916-fe66-4097-b56e-1f009f4f3612"
TOKEN="5c1b988e-8022-4d03-bf51-af3e6c6118b2"
GATEWAY="http://127.0.0.1:18789"
AUTH_TOKEN="8f5708e73dc677c1b357122e21eb8042e556c79efa2d66cd"

call_tool() {
  local name="$1"
  local args_json="$2"
  curl -s -m 10 -X POST "$GATEWAY/tools/invoke" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d "{\"name\":\"$name\",\"args\":$args_json}" | head -c 4000
  echo
}

json_str() {
  python3 -c 'import sys,json;print(json.dumps(sys.stdin.read()))'
}

case "${1:-}" in
  hb|heartbeat)
    shift
    note="${1:-heartbeat}"
    call_tool "workboard_heartbeat" "$(printf '{"id":"%s","note":%s}' "$CARD_ID" "$(printf '%s' "$note" | json_str)")"
    ;;
  complete)
    shift
    summary="${1:-completed}"
    proof="${2:-proof}"
    call_tool "workboard_complete" "$(printf '{"id":"%s","summary":%s,"proof":%s}' "$CARD_ID" "$(printf '%s' "$summary" | json_str)" "$(printf '%s' "$proof" | json_str)")"
    ;;
  block)
    shift
    reason="${1:-blocked}"
    call_tool "workboard_block" "$(printf '{"id":"%s","reason":%s}' "$CARD_ID" "$(printf '%s' "$reason" | json_str)")"
    ;;
  *)
    echo "Usage: $0 {heartbeat <note>|complete <summary> <proof>|block <reason>}" >&2
    exit 2
    ;;
esac