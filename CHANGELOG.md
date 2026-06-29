# Changelog

All notable changes to **jito-ide** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-06-29 (kickoff)

### Added
- Initial bootstrap — VS Code extension scaffold
- Extension host (TypeScript + Node 20) wrapping jito v0.2.0 subprocess
- JSON-RPC client for `jito serve --format=jsonrpc --stream`
- Chat panel (webview) with streaming responses
- 5-mode switcher: `dev` · `reason` · `create` · `audit` · `universal`
- File context (`@file` mentions) with sidebar tree
- JITO.md hierarchy loader (workspace + folder + `~/.jito/CONTEXT.md`)
- Slash commands: `/review`, `/test`, `/refactor`, `/doc`, `/explain`
- Settings (Minimax API key in SecretStorage, jito path, default mode, telemetry opt-in)
- Status bar with mode + busy/error indicator
- Inline edit stub (Ctrl+K) — full diff preview in v0.2.0
- React 18 + Vite + TailwindCSS webview
- Commands: `jito-ide.openChat` (Ctrl+Shift+J), `jito-ide.switchMode`, `jito-ide.inlineEdit` (Ctrl+K), `jito-ide.addFileContext`, `jito-ide.openSettings`

### Security
- API key in VS Code SecretStorage (encrypted at rest)
- Telemetry off by default (opt-in)
- No code leaves local machine unless user explicitly sends

### Known limitations
- Inline edit returns edited code in new tab (no diff preview yet)
- No conversation history (planned v0.2.0)
- No marketplace publish (planned v0.1.0 GA)
