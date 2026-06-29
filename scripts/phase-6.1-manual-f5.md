# Phase 6.1 — Manual F5 Smoke Test (VS Code Extension Development Host)

> **Status: REQUIRED because Phase 6.1 cannot be automated from the OpenClaw sub-agent sandbox.**
> This document captures the exact acceptance flow that a human (or a jito-ide agent
> running *inside* VS Code) must perform to satisfy the visual + interactive parts of
> the Phase 6.1 acceptance matrix.

## Why this exists

Phase 6.1 requires:

1. Building the **real jito v0.2.0** binary (currently reports `0.1.0`, **GAP-1**)
2. Loading jito-ide in Extension Development Host (**GUI-only**)
3. Setting `JITO_API_KEY` (no API key in this sandbox, **GAP-2**)
4. Smoke matrix 5 modes × 2 messages (**partially automatable** — see `scripts/phase-6.1-smoke.sh`)
5. Per-message: streaming / mode badge / footer / no console errors / <8s TTFT (**GUI-only**)

The sub-agent sandbox can drive the CLI via `jito --mode=X --no-tui run "…"` and produces
the **CLI-level** smoke report at `artifacts/phase-6.1-smoke-report.json`. The remaining
**extension-level** assertions need an actual VS Code window.

## Prerequisites

| Item | Value | Notes |
|---|---|---|
| `code` (VS Code) | ≥ 1.85 | matches `engines.vscode` in `package.json` |
| `node` | v20.x | `nvm install 20 && nvm use 20` |
| `jito` binary | 0.2.x | see GAP-1 in `docs/phase-6.1-gap-report.md` |
| `JITO_API_KEY` | `sk-…` | see GAP-2 in gap report |

## Steps

1. **Build jito (GAP-1)**

   ```bash
   cd ~/wokrspace/open-uppu/jito-cli
   go install ./cmd/jito          # puts jito in $GOBIN
   jito version                   # MUST report 0.2.x — currently 0.1.0
   ```

2. **Install jito-ide dev deps**

   ```bash
   cd ~/wokrspace/open-uppu/jito-ide
   npm install                    # if not already
   npm run compile                # FIX GAP-3 (SettingsPage.tsx ../types) before this passes
   ```

3. **Set API key**

   ```bash
   export JITO_API_KEY="sk-your-minimax-key-here"
   ```

4. **Launch Extension Development Host**

   Open `~/wokrspace/open-uppu/jito-ide/` in VS Code, then press **F5**.
   A second VS Code window opens with the extension activated.

5. **Run the smoke matrix manually**

   For each (mode, prompt) pair below:
   - Click the jito icon in the activity bar (or `Ctrl+Shift+P` → "jito: Open Chat")
   - Pick the mode from the mode switcher
   - Paste the prompt, hit Enter
   - **Check** each row of the acceptance matrix below
   - **Capture** a screenshot into `artifacts/phase-6.1-manual-<mode>.png`

   | # | Mode | Prompt |
   |---|---|---|
   | 1 | dev | `Write a hello world in Rust` |
   | 2 | dev | `Refactor this loop to use iterators` |
   | 3 | reason | `Compare auth strategies: session vs JWT` |
   | 4 | reason | `Plan migration from REST to gRPC` |
   | 5 | create | `Write a tagline for jito-ide` |
   | 6 | create | `Draft a tweet announcing our v0.2.0 launch` |
   | 7 | audit | ``Review this code: function add(a,b){ return a-b }`` |
   | 8 | audit | `Find SQL injection risk in this query builder` |
   | 9 | universal | `What is TypeScript?` |
   | 10 | universal | `Summarise jito-ide in one sentence` |

6. **Per-message acceptance checklist**

   For each of the 10 prompts above, confirm:

   - [ ] **Streaming**: text appears in chunks (not all at once)
   - [ ] **Mode badge color**: matches the mode colour spec in `webview/tailwind.config.js`
     (dev=cyan, reason=violet, create=amber, audit=rose, universal=neutral)
   - [ ] **Footer token count**: visible and increments as streaming progresses
   - [ ] **No console errors**: open DevTools (`Help → Toggle Developer Tools`), filter by ERROR
   - [ ] **TTFT < 8s**: timestamp from message start to first chunk delta

7. **If any check fails**

   Loop back to the originating phase card:
   - Mode badge / footer / colours → **Phase 3.4 MessageCard** or **Phase 3.5 SettingsPage**
   - Streaming pipeline → **Phase 4.1 JSON-RPC Composer**
   - Token counter → **Phase 3.3 StatusBar**
   - New bug not covered above → file a new workboard bug card, then pause Phase 6

8. **If all 10 pass**

   Commit with the 10 screenshots + console-error log + this checklist ticked.
   Then call `wb-helper.sh complete "<summary>" "<commit-sha>"` and proceed to **Phase 6.2 (VSIX)**.

## What this document does NOT cover

- Automated regression — that's `npm run test:protocol` (14/14 pass against the mock server)
- Cross-platform packaging — that's Phase 6.2
- Real LLM quality — the smoke matrix uses toy prompts; production eval is out of scope

## Reference

- Workboard card: `9154e416-4e70-4a0b-bc13-fde147b5db59`
- Spec: `~/.openclaw/workspace/agents/jito-ide.md §11 Test/Verify`
- Gap report: `~/wokrspace/open-uppu/jito-ide/docs/phase-6.1-gap-report.md`
- CLI-level smoke (already passing): `artifacts/phase-6.1-smoke-report.json`
