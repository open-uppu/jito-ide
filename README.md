# jito-ide ⚡🖥️

> **Multi-mode AI agent for VS Code.** Powered by [jito v0.2.0](https://github.com/open-uppu/jito) + Minimax-M3.
> Free, local-first, 5 first-class modes (dev/reason/create/audit/universal).

## What is this?

`jito-ide` is a VS Code extension that wraps the [`jito`](https://github.com/open-uppu/jito) CLI as a backend subprocess. You get a native chat panel, a sidebar mode switcher, file context, and (soon) inline edit — all inside VS Code, all powered by your local `jito` binary talking to Minimax-M3.

**5 first-class modes** are the differentiator vs Cursor / Copilot / Continue:

| Mode | Icon | Use for |
|---|---|---|
| `dev` | ⚙️ | Coding, refactor, debug |
| `reason` | 🧠 | Architecture, decisions |
| `create` | 🎨 | Marketing copy, docs |
| `audit` | 🛡️ | Security review, OWASP |
| `universal` | 🌐 | Catch-all default |

Switch modes in the sidebar — the system prompt changes instantly.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                jito-ide (VS Code)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────┐ │
│  │  Chat    │  │  Mode    │  │  Inline  │  │ Files │ │
│  │  panel   │  │ switcher │  │  edit    │  │  ctx  │ │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘  └───┬───┘ │
│        └──────────────┴──────┬───────┴────────────┘     │
│                              │                          │
│                    ┌─────────▼──────────┐               │
│                    │  TS Extension Host │               │
│                    │  (Node.js + ws)    │               │
│                    └─────────┬──────────┘               │
│                              │ subprocess               │
│                    ┌─────────▼──────────┐               │
│                    │  jito v0.2.0 CLI   │               │
│                    │  (Go binary)       │               │
│                    └─────────┬──────────┘               │
│                              │ HTTPS                    │
│                    ┌─────────▼──────────┐               │
│                    │  Minimax-M3 API    │               │
│                    └────────────────────┘               │
└──────────────────────────────────────────────────────┘
```

## Install

### From VS Code Marketplace (coming soon)
```
ext install uppu.jito-ide
```

### From VSIX (manual)
```bash
git clone https://github.com/open-uppu/jito-ide
cd jito-ide
npm install
cd webview && npm install && npm run build && cd ..
npm run package
# → dist/jito-ide-0.1.0.vsix
code --install-extension dist/jito-ide-0.1.0.vsix
```

## Prerequisites

1. **jito v0.2.0 binary** in your `PATH`
   ```bash
   # Install jito (see open-uppu/jito repo)
   curl -fsSL https://raw.githubusercontent.com/open-uppu/jito/main/scripts/install.sh | bash
   jito version  # should print 0.2.0
   ```

2. **Minimax API key** — get one at https://api.minimax.io
   - Open VS Code → `Ctrl+Shift+P` → `jito: Open Settings`
   - Set `jito-ide.apiKey` (stored in VS Code SecretStorage, encrypted)

## Usage

- **Open chat:** `Ctrl+Shift+P` → `jito: Open Chat` (or `Cmd+Shift+J` on Mac)
- **Switch mode:** click the mode pills in the chat header, or the sidebar
- **Add file context:** right-click in editor → `jito: Add File to Context`
- **Inline edit:** select code → `Ctrl+K` (coming in v0.2.0)
- **Slash commands:** type `/` in the input → pick from `/review`, `/test`, `/refactor`, etc.

## Project structure

```
jito-ide/
├── src/                  # Extension host (TypeScript)
│   ├── extension.ts      # entry point
│   ├── jito-client.ts    # subprocess client
│   ├── chat-panel.ts     # webview manager
│   ├── mode-switcher.ts  # sidebar
│   ├── file-context.ts   # @file mentions
│   ├── context-loader.ts # JITO.md hierarchy
│   ├── inline-edit.ts    # Ctrl+K
│   ├── settings.ts       # config + SecretStorage
│   └── status-bar.ts
├── webview/              # React app (separate bundle)
│   └── src/
│       ├── App.tsx
│       └── components/
│           ├── MessageList.tsx
│           ├── InputBar.tsx
│           └── ModeSelector.tsx
├── test/                 # @vscode/test-electron
├── package.json          # vsce manifest
└── tsconfig.json
```

## Develop

```bash
# Install
npm install
cd webview && npm install && cd ..

# Build webview
npm run build:webview

# Compile TS
npm run compile

# Open in Extension Development Host
# Press F5 in VS Code

# Run tests
npm test              # extension host
npm run test:webview  # webview (Vitest)

# Package VSIX
npm run package
```

## Status

🟡 **v0.1.0 MVP** — In development. Kickoff 2026-06-29.

| Feature | Status |
|---|---|
| Chat panel (webview, streaming) | ✅ done |
| 5-mode switcher (sidebar + chat header) | ✅ done |
| File context (`@file` mentions) | ✅ done |
| JITO.md loader (workspace + folder + user) | ✅ done |
| Slash commands (`/review`, `/test`, etc.) | ✅ done |
| Status bar | ✅ done |
| Settings + SecretStorage | ✅ done |
| Inline edit (Ctrl+K) | ⏳ stub (v0.2.0) |
| Multi-file selection | ⏳ planned (v0.2.0) |
| Conversation history (SQLite) | ⏳ planned (v0.2.0) |
| Theme support | ⏳ planned (v0.2.0) |
| Marketplace publish | ⏳ planned (v0.1.0 GA) |

## License

Private — uppu internal. (Will move to MIT/Apache for open beta.)

## Related

- [jito (parent)](https://github.com/open-uppu/jito) — Go CLI backend
- [jito docs](https://github.com/open-uppu/jito/blob/main/README.md)
- [Spec](../companies/jito-ide.md)
- [Agent](../agents/jito-ide.md)
