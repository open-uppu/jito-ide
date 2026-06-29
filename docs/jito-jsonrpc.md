# jito v0.2.0 — JSON-RPC Streaming Protocol

> **Status:** LOCKED — Phase 4.1 (jito-ide consumer-side contract verification)
> **Owner:** jito-ide (consumer); jito-rel + core implementer (server)
> **Wire:** JSON-RPC 2.0 over NDJSON (stdin = requests, stdout = streamed events + responses)
> **Scope:** jito serves one long-lived subprocess per jito-ide extension instance; no other transports.

## 0. Wire transport

- **Transport:** child-process stdio. The consumer (`jito-ide` extension host) spawns
  `jito serve --format=jsonrpc --stream` and writes NDJSON requests to its stdin,
  reads NDJSON frames from its stdout.
- **Framing:** one JSON value per line, terminated by `\n`. No embedded newlines
  inside a JSON value.
- **stdout purity:** **strict.** Stdout carries protocol frames only. All human logs,
  debug info, panics, and library chatter go to **stderr** (gated by `--verbose`).
  A single non-JSON byte on stdout is a **tier-1 protocol fault**.
- **stderr:** free-form human logs. Consumer may surface them in the host log channel;
  ignored by the parser.
- **`MAX_LINE_BYTES`:** 1 MiB default. Lines exceeding the cap are a tier-1 fault
  (drop line up to next `\n`, increment counter; **kill+respawn after 3 consecutive**).
- **stdin EOF:** graceful shutdown signal. Server finishes in-flight `chat` requests
  (emits `message.end` with `finish_reason='stop'` then the JSON-RPC response),
  flushes stdout, exits 0. SIGKILL only if it doesn't exit within 2s of EOF.

## 1. JSON-RPC envelope

Standard JSON-RPC 2.0. Every frame on the wire is a JSON object.

### 1.1 Request (consumer → server, on stdin)

```jsonc
{
  "jsonrpc": "2.0",
  "id": 1,                         // string or integer, MUST echo in response
  "method": "chat",
  "params": { /* method-specific */ }
}
```

### 1.2 Response (server → consumer, on stdout)

Returned **after** all streamed events for that request have been emitted
(see §2 streaming contract).

```jsonc
{
  "jsonrpc": "2.0",
  "id": 1,                         // echoes the request id (string or int)
  "result": { /* method-specific */ }
}
```

or, on a synchronous error:

```jsonc
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32601,                // standard JSON-RPC codes preferred
    "message": "method not found",
    "data"?: <any>
  }
}
```

### 1.3 Notification / streamed event (server → consumer, on stdout)

Streamed events are JSON-RPC **notifications**: they have `method` and `params`,
**no `id`**.

```jsonc
{
  "jsonrpc": "2.0",
  "method": "message.delta",
  "params": { /* event-specific; see §3 */ }
}
```

## 2. Streaming contract (MUST)

For a `chat` request, the server emits, in order:

```
(message.start | tool_call | message.delta | checkpoint)*   // 0..N interleaved
message.end                                                  // exactly once
<JSON-RPC response carrying chat.result>                    // exactly once, LAST
```

Hard rules:

1. `message.end` is emitted **exactly once** per `chat` request, regardless of outcome
   (success, length-cap, cancellation, or recoverable error).
2. The JSON-RPC `chat` response is emitted **after** `message.end`. Servers MUST NOT
   send the response first. Consumers MUST treat any response-without-end as a
   tier-1 fault.
3. `message.delta` events are monotonic in `params.index` per message. Gaps are
   allowed; consumers should still apply text in `index` order to preserve ordering
   under reconnection.
4. `tool_call` and `checkpoint` events may interleave with `message.delta`. Their
   `index` shares the same sequence space as `message.delta.index` so a consumer
   can rebuild the timeline linearly.
5. `message.error` MAY replace `message.end` if the failure is non-recoverable
   (`recoverable=false`). Consumers MUST NOT expect `message.end` after a
   non-recoverable error.

## 3. Methods

### 3.1 `chat`

Request:

```jsonc
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "chat",
  "params": {
    "message": "string",                       // required, ≤ 200 KiB
    "mode"?: "dev|reason|create|audit|universal",  // overrides sticky default
    "context_files"?: ["path/relative.ts", …], // resolved by server against cwd
    "session_id"?: "string",                   // resume an existing session
    "model"?: "string"                         // optional model override
  }
}
```

Response result (after all events):

```jsonc
{
  "message_id": "msg-uuid-string",   // server-issued, used in cancel + all events
  "mode": "dev",
  "model": "minimax/MiniMax-M3",
  "session_id": "…",
  "finish_reason": "stop|length|cancelled|error|tool_use",
  "usage": { "input_tokens": 123, "output_tokens": 456 },
  "started_at": "RFC3339",
  "ended_at":   "RFC3339"
}
```

**Message-id ownership:** server-issued. Consumers MUST NOT pre-assign and MUST
NOT rely on client-generated ids reaching the server. To cancel, capture
`message_id` from the `message.start` event (it's the same id) and send
`cancel` after that.

### 3.2 `setMode`

Request:

```jsonc
{ "jsonrpc":"2.0", "id":2, "method":"setMode", "params": { "mode":"audit" } }
```

Response:

```jsonc
{ "mode": "audit", "sticky": true }
```

Semantics:

- Sticky: applies to the **next** `chat` request that omits `params.mode`.
- Per-call `params.mode` on a `chat` overrides the sticky default for that one
  call and does **not** mutate the sticky default.
- Precedence (highest first): `chat.params.mode` > `setMode` sticky > server
  built-in default (`universal`).

### 3.3 `cancel`

Request:

```jsonc
{ "jsonrpc":"2.0", "id":3, "method":"cancel", "params": { "id":"msg-uuid-string" } }
```

Response:

```jsonc
{ "cancelled": true }     // OR
{ "cancelled": false, "reason": "already_finished" }
```

Semantics:

- Best-effort: server interrupts the in-flight LLM call, then emits **exactly one**
  `message.end` with `finish_reason="cancelled"`, then the original `chat` response
  (which carries its own `finish_reason="cancelled"`). The original `chat` caller
  always unblocks.
- Idempotent: a second `cancel` for the same id returns `{cancelled:false}` and
  emits no further events for that message.
- Cancelling a `message_id` for which `message.end` has already been emitted is
  not an error — just a no-op with `cancelled:false`.

## 4. Streamed events

All events are notifications (no `id`). All times are RFC3339 UTC with `Z`.
All ids are opaque strings unless otherwise noted.

### 4.1 `message.start`

```jsonc
{
  "jsonrpc":"2.0", "method":"message.start",
  "params": { "id":"msg-uuid-string", "mode":"dev", "model":"minimax/MiniMax-M3", "ts":"2026-06-29T14:00:00Z" }
}
```

### 4.2 `message.delta`

```jsonc
{
  "jsonrpc":"2.0", "method":"message.delta",
  "params": { "id":"msg-uuid-string", "index": 7, "text":"Hello, world" }
}
```

- `index` is monotonic per message starting at 0.
- `text` is appended to the message in index order by the consumer.

### 4.3 `message.end`

```jsonc
{
  "jsonrpc":"2.0", "method":"message.end",
  "params": {
    "id":"msg-uuid-string",
    "usage": { "input_tokens":123, "output_tokens":456 },
    "finish_reason": "stop|length|cancelled|error|tool_use"
  }
}
```

### 4.4 `tool_call`

```jsonc
{
  "jsonrpc":"2.0", "method":"tool_call",
  "params": { "id":"msg-uuid-string", "index": 8, "name":"bash", "args": { "cmd":"ls -la" } }
}
```

- `args` is a JSON object (the tool's parameter map).
- `index` shares the same sequence space as `message.delta.index`.

### 4.5 `checkpoint`

```jsonc
{
  "jsonrpc":"2.0", "method":"checkpoint",
  "params": { "id":"msg-uuid-string", "label":"after_tool_bash", "ts":"2026-06-29T14:00:05Z" }
}
```

- A checkpoint lets consumers persist `index` up to here for crash-safe resume.
- `label` is a human-readable identifier (server-defined).

### 4.6 `error` (domain / streamed)

```jsonc
{
  "jsonrpc":"2.0", "method":"message.error",
  "params": {
    "id":"msg-uuid-string",     // routes to a specific message; omit for session-level errors
    "code": 4001,
    "message": "rate limited by upstream",
    "data"?: { ... },
    "recoverable": false        // REQUIRED
  }
}
```

If `recoverable=false`, the message is terminated; consumers MUST NOT expect a
subsequent `message.end`. If `recoverable=true`, the server may retry internally
and emit further events.

## 5. Error model (three tiers)

| Tier | What | Consumer behavior |
|---|---|---|
| **1. Transport fault** | non-JSON on stdout, line > `MAX_LINE_BYTES`, missing `message.end` after response | Log; drop frame; **kill+respawn after 3 consecutive** |
| **2. JSON-RPC error** | response with `error` object | Reject the corresponding promise; **session stays alive** |
| **3. Domain error** | `message.error` event | Surface to UI on the routed message; respect `recoverable` |

`workboard_meta`: a tier-1 fault emits a stderr `[jsonrpc-fault] reason=X` line
for human diagnosis; never write to stdout.

## 6. Subprocess lifecycle

- Consumer spawns `jito serve --format=jsonrpc --stream` lazily on the first
  `chat` (not at extension activation — keeps cold-start snappy).
- Process is **long-lived and shared** across `chat` requests. It holds session
  state (sticky mode, conversation context).
- Kill only on (a) consumer `dispose()`, (b) repeated tier-1 faults (§5), (c)
  `process.exit ≠ 0` event from the OS.
- After a kill+respawn, the consumer MUST re-issue `setMode` and rebuild any
  session context it cares about.

## 7. jito CLI binding (the server side)

To minimize consumer coupling, the server's CLI MUST surface:

```
jito serve --format=jsonrpc [--stream] [--model <name>] [--config <path>]
```

- `--format=jsonrpc` is the contract trigger. Without it, `serve` MAY keep its
  legacy plain-text behavior (back-compat) — but jito-ide ONLY uses
  `--format=jsonrpc` and SHOULD assert at version-time.
- `--stream` is OPTIONAL (v0.2.0 server may default to streaming under
  `--format=jsonrpc`; flag is reserved for future non-streaming mode).

The `run` and `chat` subcommands keep their existing plain / TUI behavior; they
are NOT part of this contract.

## 8. Conformance tests (ship with this contract)

Two test layers — both ship in `jito-ide/test/`:

1. **Protocol conformance (consumer side)** — drives a Node.js reference server
   (in `scripts/mock-jito-server.mjs`) that implements this contract strictly.
   Asserts ordering, error tier routing, MAX_LINE_BYTES, cancel idempotency.
2. **Smoke harness (server side, recommended)** — when a real `jito` binary is
   available, the same Vitest suite can swap the reference server for the real
   binary and replay the same fixtures. Server implementer runs this; CI gate.

The reference server is treated as a **conformance oracle** — any disagreement
is a doc issue, not a code issue.

## 9. Versioning

- This contract is part of **jito v0.2.0**. Breaking changes require a new
  format token (e.g. `--format=jsonrpc-v2`) and a major version bump.
- Extension (jito-ide) MUST refuse to start if `jito version` is older than
  the minimum that ships `--format=jsonrpc` (currently `0.2.0`).

## 10. Out of scope (v0.2.0)

- HTTP / WebSocket transports
- Multiple concurrent sessions per subprocess (one process = one extension host
  = one session)
- Bidirectional streaming of partial deltas back to the server (no client ack
  mid-stream in v0.2.0; `cancel` only)

---

**Sign-off (cross-team):**
- jito-ide — protocol consumer, test author
- jito-rel — release engineer, ships `--format=jsonrpc` behind the version flag
- (core implementer TBD) — Go server in `internal/serve/`
