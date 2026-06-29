# Security & privacy

> What `jito-ide` stores, where it stores it, and what leaves your machine.

`jito-ide` is **local-first by default**. The only outbound network calls in the Free tier are the chat messages you send and the model responses you receive — and only when you press **Enter**.

This page is the contract.

---

## 1. Hard rules (from the project spec)

Five non-negotiables, lifted from [`companies/jito-ide.md`](https://github.com/open-uppu/openclaw-workspace/blob/main/companies/jito-ide.md) §"Hard rules":

1. **No telemetry by default.** Opt-in only. Off in the Free tier.
2. **No code leaves your machine** unless you explicitly send a chat message. Pinning, mode switching, slash commands, and settings do **not** make any network call.
3. **API key in VS Code SecretStorage** (encrypted at rest by VS Code / the OS keychain).
4. **No background network calls.** The extension does not phone home, does not check for updates, and does not warm up connections.
5. **Sandbox.** When `jito` itself runs shell (`!` / `!shell`), it inherits jito's bash sandbox. The extension never bypasses it.

If any of these ever breaks, it's a **P0 bug** — open an issue with a `[security]` tag.

---

## 2. Data flows at a glance

```
┌───────────────────────────┐
│       Your machine        │
│                           │
│  ┌─────────────────────┐  │
│  │  VS Code (you)      │  │
│  └────────┬────────────┘  │
│           │ postMessage   │
│  ┌────────▼────────────┐  │
│  │  Extension host     │  │
│  │  - settings         │  │
│  │  - SecretStorage    │  │
│  │  - websocket        │  │
│  └────────┬────────────┘  │
│           │ stdio         │
│  ┌────────▼────────────┐  │
│  │  jito v0.2.0 CLI    │  │
│  │  (local Go binary)  │  │
│  └────────┬────────────┘  │
│           │ HTTPS         │
└───────────┼───────────────┘
            │
            ▼
   ┌─────────────────────┐
   │  Minimax-M3 API     │ ← only on chat send
   └─────────────────────┘
```

Nothing in the diagram **leaves** the box except the HTTPS line — and only when you send a message.

---

## 3. What we store, where

| Item | Where | Encrypted | Cleared by |
|---|---|---|---|
| **Minimax API key** | VS Code `SecretStorage` (key: `jito-ide.apiKey`) | Yes — OS keychain on all platforms | `Settings → API key → Clear` or VS Code sign-out |
| **Active mode (per workspace)** | `workspaceState` | No (lives on your machine) | Workspace close, or `Restore defaults` |
| **Pinned files** | `workspaceState` | No | Sidebar `Clear all`, or `Restore defaults` |
| **Last-used model** | VS Code settings (`jito-ide.model`) | No — it's just a string | `Restore defaults` |
| **Theme** | VS Code settings | No | `Restore defaults` |
| **Telemetry opt-in** | VS Code settings | No | Untoggling, or `Restore defaults` |
| **Chat history** | jito's SQLite store (`~/.jito/history.db`) | Disk only, your user account | `jito history clear` from CLI |
| **`JITO.md` content** | Your filesystem | No | You delete the file |

**`Restore defaults`** (in `Ctrl+Shift+P` → `jito: Open Settings`) wipes the keys above **except the API key**.

---

## 4. Telemetry: **off by default** — opt-in

When you flip **Settings → Telemetry → `true`**, `jito-ide` sends a single POST per chat session at shutdown. The fields are exactly:

```
{
  "extensionVersion": "0.1.0",
  "vscodeVersion": "1.85.0",
  "os": "darwin",
  "mode": ["dev", "audit", "create", ...],   // which modes you used, never contents
  "messageCount": 12,
  "slashCommandsUsed": ["/review", "/test"],
  "errorBuckets": {"spawn_failed": 1}
}
```

It **never** contains:

- file paths
- message bodies
- code
- the API key
- anything user-typed

Telemetry is processed in aggregate (counts, ratios, error rates). The same POST rule applies to "Sentry-style" exception capture: only the **error class** (`spawn_failed`, `jsonrpc_parse_error`) goes out, never the stack frame's local variables.

> **You can audit what we'd send**: implementers, see `src/jito-client.ts` and the `onEvent` hooks in `src/status-bar.ts`. There is no hidden path.

---

## 5. What's on disk

Inspection commands a security reviewer might run:

### macOS / Linux

```bash
# API key location (SecretStorage = OS keychain)
security find-generic-password -s "vscode-jito-ide.apiKey"   # macOS
secret-tool search service jito-ide 2>/dev/null             # GNOME / libsecret
# Last fallback (development): ~/.config/Code/User/globalStorage/<id>/jito-ide/

# Chat history (jito-side)
ls -la ~/.jito/history.db
sqlite3 ~/.jito/history.db '.tables'

# Workspace state (per workspace)
cat .vscode/settings.json | jq '."jito-ide".*'
```

### Windows

```powershell
# API key in Credential Manager (VS Code's SecretStorage)
cmdkey /list | findstr "jito-ide"
```

---

## 6. Third-party code

| Component | License | Source |
|---|---|---|
| VS Code Extension API | MIT | <https://code.visualstudio.com/api> |
| `jito` CLI v0.2.0 | Apache-2.0 | <https://github.com/open-uppu/jito> |
| Minimax-M3 API (model) | proprietary | <https://api.minimax.io> |

We use one `npm` package (`ws`) for the local webview socket. It is built into `out/` and does not call out anywhere.

---

## 7. Reporting a vulnerability

**Email:** `security@uppu.dev` (PGP key on request).
**Response window:** 72 hours, three-business-day triage.
**Disclosure policy:** coordinated disclosure, 90-day window.

Please do **not** file public GitHub issues for suspected security problems. The maintainers appreciate private reports with repro steps and a Minimax-M3 chat ID if relevant.

---

## 8. Threat model cheatsheet

| Threat | Mitigation |
|---|---|
| Someone reads your `settings.json` | The API key isn't there — it's in SecretStorage. |
| `jito-ide` accidentally sends source code | It only does that on `send`. File-pinning and `@file` mentions don't trigger any network call. |
| Extension runs shell I didn't ask for | It doesn't. `jito` does, with its own sandbox; the extension forwards your prompt only. |
| Third-party telemetry | Telemetry is **off** until you turn it on, and what it sends is enumerated above. |
| Leaked Minimax API key | Rotate at <https://api.minimax.io>; the new key overrides the old one in SecretStorage instantly. |
| `JITO.md` ends up in a model response | It can — that's the point. Don't put secrets in it. |

---

## Where to look in code

- SecretStorage wrapper: [`src/settings.ts`](../src/settings.ts) — `SECRET_KEY = 'jito-ide.apiKey'`, `getApiKey()` / `setApiKey()`.
- Hard rules pinned in the codebase: [`src/extension.ts`](../src/extension.ts) — `activate()` shows the **only** network path (`JitoClient.verify()` at startup, and `JitoClient.chat()` on user send).
- Telemetry switch: `jito-ide.telemetry` setting, default `false`, see [`package.json`](../package.json).

---

> See also: **[Troubleshooting](./troubleshooting.md)** — covers "API key not working" and "how to confirm I'm actually reaching the API".
