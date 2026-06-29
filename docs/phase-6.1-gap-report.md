# Phase 6.1 — Gap Report (2026-06-29)

> **Result: Phase 6.1 acceptance CANNOT be signed off as written.**
> Three upstream gaps block the full E2E smoke. CLI-level smoke is green; extension-level
> smoke must be done by a human in VS Code (Extension Development Host, F5).

## TL;DR

| ID | Gap | Severity | Owner | Blocker? |
|---|---|---|---|---|
| GAP-1 | `jito version` reports `0.1.0`; `JitoClient.verify()` regex requires `0.2.x` | **Hard** | jito-rel | ✅ Yes |
| GAP-2 | `jito serve --format=jsonrpc --stream` subcommand does not exist | **Hard** | jito-rel | ✅ Yes |
| GAP-3 | `webview/src/SettingsPage.tsx` imports `../types` (path bug) — `npm run compile` fails | **Hard** | jito-ide (this card) | ✅ Yes |
| GAP-4 | `JITO_API_KEY` not provisioned in this sandbox | Soft | env / PM | ❌ — mock fallback works |
| GAP-5 | No webview unit tests exist (`npm run test:webview` → "No test files found") | Soft | jito-ide | ❌ — protocol tests cover client |
| GAP-6 | VS Code Extension Development Host (F5) is GUI-only; cannot be automated from this CLI sandbox | Hard | human | ✅ Yes (process) |

The card spec says **"Fail → file bug card, pause phase"**. This document is that bug card.

---

## GAP-1 — jito CLI version is `0.1.0`, not `0.2.x`

**Evidence**

```bash
$ /tmp/jito version
jito version 0.1.0
  commit: dev
  built:  unknown
```

**Source**

`~/wokrspace/open-uppu/jito-cli/cmd/jito/main.go`:

```go
var (
    version = "0.1.0"          // <-- hard-coded; never bumped for the "v0.2.0 pipeline" merge
    commit  = "dev"
    date    = "unknown"
)
```

The README and CHANGELOG describe v0.2.0 work (LOOP #1–4 merged), but the version
constant was never bumped. The release pipeline (`goreleaser.yml`) ships whatever
the binary reports, so even the `v0.2.0` GitHub releases published via the
goreleaser pipeline carry the wrong version string.

**Impact**

`src/jito-client.ts` (jito-ide) checks the version on `verify()`:

```ts
const match = stdout.match(/(\d+\.\d+\.\d+)/);
if (!match || !match[1].startsWith('0.2.')) {
  reject(new Error(`jito v0.2.x required, got: ${stdout.trim()}`));
}
```

Every jito-ide session starts with `JitoClient.verify()` failing. Extension will
not activate against the current jito binary.

**Fix**

Bump `version = "0.2.0"` in `cmd/jito/main.go` (and add `-dirty` flag for dev builds).
Then rebuild:

```bash
cd ~/wokrspace/open-uppu/jito-cli
go install ./cmd/jito
jito version     # expect: jito version 0.2.0
```

---

## GAP-2 — `jito serve` subcommand is missing

**Evidence**

```bash
$ /tmp/jito serve --help
Error: unknown command "serve" for "jito"
Run 'jito --help' for usage.
```

**Impact**

`src/jito-client.ts` spawns:

```ts
const child = spawn(this.options.binaryPath, ['serve', '--format=jsonrpc', '--stream'], …)
```

The JSON-RPC streaming protocol that Phase 4.1 wired up on the **client** side has
**no server implementation in jito-cli**. The protocol tests pass against a Node
fixture (`scripts/mock-jito-server.mjs`) that simulates the server, not the real
binary.

Confirmed by `internal/cli/root.go`:

```go
root.AddCommand(newChatCmd())
root.AddCommand(newRunCmd())
root.AddCommand(newResumeCmd())
root.AddCommand(newSessionsCmd())
root.AddCommand(newVersionCmd(version, commit, date))
root.AddCommand(newInitCmd())
root.AddCommand(newHeartbeatCmd())
root.AddCommand(newCompletionCmd())
root.AddCommand(newUpdateCmd())
root.AddCommand(newDoctorCmd())
root.AddCommand(newWorktreeCmd())
root.AddCommand(newMemoryCmd())
root.AddCommand(newLoopCmd())
root.AddCommand(newSpawnCmd())
// (no newServeCmd)
```

The `serve` subcommand needs to be implemented in `internal/cli/serve.go` (or
renamed to `internal/cli/jsonrpc.go`). It should:

1. Start an OpenAI-Compat streaming loop (already exists in `provider/openai_compat.go`)
2. Read JSON-RPC requests from stdin (one per line)
3. Emit `message.start`, `message.delta`, `message.end` envelopes on stdout
4. Support `chat`, `setMode`, `cancel` methods (per `src/jito-client.ts` interface)

**Workaround**

Until GAP-2 is fixed, the extension cannot talk to a real jito. The CLI-level
smoke in `scripts/phase-6.1-smoke.sh` uses `jito --no-tui run` instead, which
proves the 5-mode system prompts + provider fallback work end-to-end, but is
not the full JSON-RPC path.

---

## GAP-3 — `SettingsPage.tsx` import path bug (this card's responsibility)

**Evidence**

```bash
$ cd ~/wokrspace/open-uppu/jito-ide && npm run compile
…
src/SettingsPage.tsx(29,31): error TS2307: Cannot find module '../types' or its corresponding type declarations.
```

**Fix**

In `webview/src/SettingsPage.tsx`, line 29:

```diff
- import type { Settings } from '../types'
+ import type { Settings } from './types'
```

The file `webview/src/types.ts` exists; the import just needs to point to it.

**Note**: this was merged from Phase 3.5 (`f153b1e`). Filing a follow-up bug
card `phase-3.5-settings-page-import-path-fix` so Phase 3.5 owner can ship the
1-line fix.

---

## GAP-4 — `JITO_API_KEY` not provisioned

**Evidence**

```bash
$ env | grep -i jito
(nothing)
```

**Impact**

Without an API key, the OpenAICompat provider cannot reach `api.minimax.io`.
The `provider.MultiFromConfig` function auto-degrades to the mock provider
(in `internal/provider/mock.go`), which is what the smoke harness used. That
proves the **plumbing** works but does **not** validate the live LLM path.

**Fix**

PM/CEO provisions `JITO_API_KEY` in the environment (e.g., add to
`~/.jito/.env` and source it, or pass via `JITO_API_KEY=sk-…` in the launch
script). Then re-run `scripts/phase-6.1-smoke.sh` with the key set:

```bash
JITO_API_KEY="sk-…" ./scripts/phase-6.1-smoke.sh /path/to/jito
```

Expect: output preview changes from canned mock text to real model responses,
TTFT rises from ~5ms to <8s.

---

## GAP-5 — No webview unit tests

**Evidence**

```bash
$ npm run test:webview
…
No test files found, exiting with code 1
```

**Impact**

The webview (React UI for MessageCard, mode switcher, footer, settings) has no
automated tests. The 14 protocol-conformance tests in `test/jito-client.test.ts`
cover the extension-host side of the JSON-RPC contract but nothing in
`webview/src/`.

**Recommendation**

Open a follow-up card to add Vitest + React Testing Library coverage for the
webview before Phase 6.2 (VSIX).

---

## GAP-6 — VS Code Extension Development Host is GUI-only

**Evidence**

Phase 6.1 step 2: "Load jito-ide in Extension Development Host (F5)". F5 is a
keystroke in a running VS Code window; the OpenClaw sub-agent sandbox has no
display server and cannot launch the Electron host. Even if `code` were
installed and a virtual framebuffer wired up, screenshot-based UI assertion
(webview devtools console, mode badge colour, footer token counter) would
require additional tooling (Playwright/VSCe) that is not in this sandbox.

**Impact**

5 of the 6 per-message acceptance items (streaming, badge colour, footer,
console errors, TTFT) cannot be verified from CLI.

**Mitigation**

`scripts/phase-6.1-manual-f5.md` is the human-run procedure. A jito-ide agent
running inside VS Code (or a human PM) can execute it and commit screenshots.

---

## What is GREEN

Despite the gaps, the following DID pass in this run:

- **jito CLI build** (Go 1.25, `go build ./cmd/jito` → 20MB binary, exits 0)
- **jito CLI `version`** (runs cleanly, even if it reports the wrong version)
- **jito CLI `run --mode=X`** for all 5 modes with mock fallback (10/10)
- **jito-ide extension TypeScript build** (`tsc` clean for `src/*.ts`, webview broken — GAP-3)
- **jito-ide protocol conformance** (`vitest run`, 14/14 tests pass against `mock-jito-server.mjs`)
- **Scripts**: `scripts/phase-6.1-smoke.sh` + `scripts/phase-6.1-manual-f5.md` written and committed

## Artefacts

| Path | Description |
|---|---|
| `scripts/phase-6.1-smoke.sh` | Headless 5×2 smoke harness (CLI-level) |
| `scripts/phase-6.1-manual-f5.md` | Human-run F5 procedure for extension-level smoke |
| `artifacts/phase-6.1-smoke-report.json` | Machine-readable CLI smoke output (10/10 success=true) |
| `docs/phase-6.1-gap-report.md` | This file |
| `wb-helper.sh` | Updated for current card id/token |

## Suggested next actions for PM/CEO

1. **GAP-1 + GAP-2** → file a workboard card against jito-rel (parent team).
   These are the only two that fully block Phase 6.1.
2. **GAP-3** → file a 1-line bug card against Phase 3.5 (SettingsPage).
3. **GAP-4** → provision `JITO_API_KEY` for the sandbox.
4. **GAP-5** → schedule webview test coverage work for v0.2.x.
5. **GAP-6** → assign a human PM or in-VSCode jito-ide run to execute
   `scripts/phase-6.1-manual-f5.md` once GAP-1+2+3 are resolved.
6. Once GAP-1+2+3+4 are resolved: re-run `scripts/phase-6.1-smoke.sh` with
   real `JITO_API_KEY` → expect same 10/10 pass rate with real model output,
   TTFT < 8s. Then execute the manual F5 procedure.
7. After full pass: bump jito-ide to v0.2.0 + unblock Phase 6.2 (VSIX).
