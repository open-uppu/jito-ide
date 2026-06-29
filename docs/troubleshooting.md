# Troubleshooting

> "It doesn't work" → 99% of the time it's one of the things below.

If `jito-ide` is misbehaving, **don't open an issue yet**. Walk this page top to bottom — there's a checklist at the end that resolves ~9 out of 10 reports.

---

## 1. "jito binary not found"

You'll see this banner at the bottom of VS Code:

> `[jito-ide] jito binary not found at "jito". Install jito v0.2.0 or set "jito-ide.jitoPath" in settings. Extension will run in degraded mode.`

### Cause

`jito` is either not installed or not on `$PATH` for the shell VS Code inherits.

### Fix

```bash
# 1) Install jito v0.2.0
curl -fsSL https://raw.githubusercontent.com/open-uppu/jito/main/scripts/install.sh | bash

# 2) Confirm it landed (in the SAME shell VS Code uses)
jito version
# → jito 0.2.0
```

If `jito version` works in a fresh terminal but **not inside VS Code** (Linux/macOS), VS Code was launched from a shell that didn't source your rc file. Two options:

- **A.** Open VS Code from a terminal that has `~/.local/bin` on `$PATH`: `code .`
- **B.** Point the extension at the binary directly:
  - `Ctrl+Shift+P` → `jito: Open Settings` → **jito path** → `/home/<you>/.local/bin/jito`

### Verify

Send any chat message. The status bar (bottom) should turn mode-tinted and stream. If the warning toast stays, restart VS Code so the new `$PATH` (from `code .`) gets picked up.

---

## 2. "API key invalid" / first request 401

A red banner replaces your streamed reply:

> `⚠️ Error: 401 Unauthorized — invalid api key`

### Cause

The stored key isn't accepted by Minimax. Most often: typo, leading space, or the key was rotated.

### Fix

1. Re-copy the key from <https://api.minimax.io>. It should start with `eyJ` (it's a JWT).
2. `Ctrl+Shift+P` → `jito: Open Settings` → **API key** → clear, then paste.
3. **Save** and look for the green checkmark next to the field.

> The extension stores the key in **SecretStorage**, not in `settings.json`. If you've set `jito-ide.apiKey` in `settings.json` *and* in SecretStorage, **SecretStorage wins**.

### Verify

Send a 1-token message like `hi` in `universal` mode. If the status bar pulses and you see a reply, the key is good. If you see 401 again, re-check the rotation page — Minimax sometimes issues pending-revocation keys during a project migration.

---

## 3. Rate-limit hit (HTTP 429)

You'll see:

> `⚠️ Error: 429 — slow down`

### Cause

Minimax rate-limits per-API-key per-minute. Default quotas are generous for Dev / Reason / Universal, lower for Audit (`MiniMax-M3` consumes more tokens per turn).

### Fix

- **Quick:** wait 60 seconds and resend.
- **Persistent:** check your quota at <https://api.minimax.io/dashboard>.
- **Permanent:** if you're consistently hitting 429, switch to `MiniMax-M3` (smaller context) or upgrade at the Minimax dashboard.

`jito-ide` does not retry on 429 — by design, so the user sees the failure immediately and can decide whether to shorten the prompt. Auto-retry would hide quota burn.

---

## 4. Mode pill is stuck / won't switch

You click a mode pill, the chat card stripe turns the new color, but the next response still sounds like the old mode.

### Cause

Stale `workspaceState` value, often after restoring a `.vscode` folder from backup or switching worktrees.

### Fix

```text
Ctrl+Shift+P  →  "Developer: Reload Window"
```

On reload, the mode pill reads `jito-ide.defaultMode` again from the fresh state.

---

## 5. Inline edit (`Ctrl+K`) does nothing

Likely cause: no editor text is selected, or no active editor.

### Fix

1. Click into an editor tab.
2. Select the code block (multi-line is fine).
3. `Ctrl+K` → modal opens → type your instruction → `Enter`.

If the modal opens but the response is empty, check **[`#1` jito binary]** above — inline edit uses the same code path.

---

## 6. `@file` mentions resolve to nothing

Type `@foo.ts` in the composer and… nothing. No chip appears.

### Cause

The file isn't in any open workspace folder, or the file is too new (the file watcher hasn't indexed it yet).

### Fix

- **Always** open the folder containing the file before mentioning it. Multi-root workspaces work — both folders need to be open.
- If the file was just created, `Ctrl+Shift+P` → **"Developer: Reload Window"** to refresh the file index.
- For very large files, lower `jito-ide.maxContextFiles` (Settings) to keep the message under the model's input cap.

---

## 7. Chat panel is blank / won't open

`Ctrl+Shift+P` → `jito: Open Chat` — nothing appears, or the panel opens blank.

### Cause

The webview bundle (`webview/dist/assets/index.js`) is missing — usually because `npm run build:webview` wasn't run after pulling.

### Fix

```bash
cd webview
npm install
npm run build
cd ..
# Then VS Code → "Developer: Reload Window"
```

If you installed from VSIX and the issue is reproducible, the VSIX is broken — re-build with `npm run package`.

---

## 8. Status bar stays gray, no mode tint

Indicates the extension activated but never reached `setReady()` — usually a `jito` subprocess spawn failure.

### Fix

1. `Ctrl+Shift+P` → **"Developer: Toggle Developer Tools"** → **Console** tab.
2. Look for `[jito-ide]` lines.
3. Most likely you'll see:
   - `[jito-ide] jito verification failed: spawn jito ENOENT` → go to **#1**.
   - `[jito-ide] jito verification failed: EACCES` → `chmod +x $(which jito)`.

---

## 9. Settings page won't save

`Ctrl+Shift+P` → `jito: Open Settings` → change a value → click `Save` → reload → value reverted.

### Cause

The `workspaceState` was loaded from `.vscode/settings.json` (workspace-scope) and your save hits the **Global** scope. The two-step is intentional for solo projects but trips multi-root users.

### Fix

Open `settings.json` directly and set the value there:

```jsonc
// .vscode/settings.json
{
  "jito-ide.defaultMode": "reason",
  "jito-ide.telemetry": false,
  "jito-ide.maxContextFiles": 20
}
```

Reload window. The settings webview will reflect the new values.

---

## 10. "JSON-RPC parse error" — common mid-stream

The card shows:

> `⚠️ Error: JSON-RPC parse error`

A delta line from `jito` was malformed (a partial line buffered until the line-end).

### Fix

This is **transient**. Click **Stop** on the card, then re-send. The error does not affect your API quota (the model wasn't billed for an incomplete response). If it persists across 3+ retries, file an issue with the failing message ID from the card footer.

---

## 11. Diagnostic checklist (copy-paste before opening an issue)

Walk this in order; one of them is almost always the answer.

- [ ] `jito version` prints `0.2.0` in the same shell that launched VS Code
- [ ] `Ctrl+Shift+P` → `jito: Open Settings` → API key shows green ✓
- [ ] Status bar tints when you send a message (no warning toast)
- [ ] Workspace folder is open (one of `File → Open Folder…`)
- [ ] `webview/dist/assets/index.js` exists (`ls webview/dist/assets/`)
- [ ] No `[jito-ide] …` errors in **Developer → Toggle Developer Tools → Console**
- [ ] `Output → jito-ide` channel (if present) is empty or just info lines

If all seven pass and it still doesn't work, open an issue at <https://github.com/open-uppu/jito-ide/issues> with:

- `jito version` output
- The exact message ID from a failing card footer
- Screenshot of the Developer Tools console with the `[jito-ide]` lines

---

## Where to look in code

- Extension host activation: [`src/extension.ts`](../src/extension.ts) — `activate()` is where every error path starts.
- Subprocess spawn: [`src/jito-client.ts`](../src/jito-client.ts) — `verify()` does the binary check; `chat()` does the spawn.
- Webview bootstrap: [`src/chat-panel.ts`](../src/chat-panel.ts) — `getHtml()` returns the `<script src>` for the bundled React app.
- Settings persistence: [`src/settings.ts`](../src/settings.ts) — note the `SecretStorage` lookup that always wins over `settings.json`.

---

> See also: **[Security](./security.md)** — when an error message looks like it's leaking data, double-check that page.
