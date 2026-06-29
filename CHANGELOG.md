# Changelog

All notable changes to **jito-ide** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Placeholder for the v0.3.0 cycle. Empty for now.

## [0.2.0] - 2026-06-29

### Added
- **Design system (Phase 1.1–1.3)** — `webview/src/styles/{tokens,typography,spacing}.css` three-layer token model (primitive→semantic→mode), five-mode palette (`#00A3FF` dev, `#A855F7` reason, `#FF1B6B` create, `#F97316` audit, `#00E5FF` universal), Geist + Geist Mono fonts, Tailwind theme bridge (`webview/tailwind.config.js`).
  - `webview/tailwind.config.js` adds flat brand colors, `mode.*` palettes with `DEFAULT` aliases, `borderRadius.panel` (8px), `borderRadius.card` (12px), `pulse-glow` / `slide-up` / `fade-in` animations, and Phase 1.2 Geist font stacks.
  - `webview/src/styles/utilities.css` adds `.glow-cyan`, `.glow-magenta`, `.pulse-mode`, `.gradient-mode-{dev,reason,create,audit,universal}`, `.text-glow-{cyan,magenta}`, `.panel-surface`, and `.card-surface` outside `@layer utilities` to avoid Tailwind content-scan purge.
  - `webview/src/styles/tokens.css` adds semantic radius tokens `--radius-panel` (8px) and `--radius-card` (12px).
- **Branding & icons (Phase 2.1–2.2)** — `assets/{logo.svg,logo@2x.png,logo-mark.svg,logo-mono.svg,icon-128.png,icon-256.png}`, five stroke-only SVG mode icons in `webview/src/components/icons/{Dev,Reason,Create,Audit,Universal}.tsx`.
- **Chat UI (Phase 3.1–3.5)** —
  - Hero header + mode pill in `webview/src/App.tsx`.
  - Per-mode stripe on message cards (`MessageList.tsx`).
  - Branded, animated status bar with per-mode background tints (`src/status-bar.ts`) — 10 new theme colors (`jitoStatusBar.{dev,reason,create,audit,universal}{Background,Foreground}`) with light/dark/high-contrast defaults; alternating ⚡ bolt during streaming; error-state glyph; pulse on mode-switch; cross-platform safe via StatusBarItem API.
    - Mode-colored backgrounds pick the active mode tint from custom `package.json` theme colors.
    - Streaming alternates `$(loading~spin)` and `$(zap)` on a 300 ms `setInterval` tick because VS Code StatusBarItem content cannot use DOM/CSS keyframes.
    - Idle state uses `$(zap)` with a theme-default background and a slow 4 s bolt breath.
    - Error state uses `$(zap) $(error)`, magenta foreground, `statusBarItem.errorBackground`, and a 40-character tooltip truncation.
    - Mode-switch flash applies a 200 ms transient foreground/background highlight.
    - `StatusBarState` (`'idle' | 'streaming' | 'error'`) is exposed for tests.
  - Full Settings page webview (`webview/src/SettingsPage.tsx`) with API-key field, jito path, default mode, telemetry toggle, max-context-files.
  - `webview/src/index.css` mirrors the VS Code status bar in the chat-panel footer with `.status-bar`, `.app-footer[data-state]`, and `bolt-breathe`, `bolt-pulse`, `bolt-shake`, `bar-flash` keyframes.
  - `webview/preview-phase-3.3.html` provides visual smoke coverage for idle modes, streaming modes, error messages, mode-flash timeline, app-footer wiring, and VS Code chrome mock.
- **Composer (Phase 4.1)** — Multi-line text input with toolbar and keyboard shortcuts, replacing the v0.1.0 single-line `InputBar.tsx` (`webview/src/components/Composer.tsx`, ~280 lines).
- **Docs (Phase 5.3)** — `docs/design.md` (user/contributor visual language), `docs/modes.md` (mode reference), README rewrite with hero + 5 mode screenshots + tagline "Multi-mode AI for your editor."

### Changed
- **README** — rewritten with `<p align="center">` hero (`assets/logo@2x.png`), tagline, inline 5-mode screenshots (`artifacts/phase-3.3-per-mode/streaming-{0..4}-{mode}.png`), and v0.2.0 status table.
- **package.json marketplace metadata** — `icon`, `galleryBanner.color` (`#0B1220`, dark theme), `qna` link, `homepage` URL, plus 10 new `contributes.colors` for status-bar theme tints.
- **Status bar** — full rewrite of `src/status-bar.ts` (v0.1.0 was a text-only `$(zap)` StatusBarItem); new behavior is animated, mode-tinted, and exposes `StatusBarState` for tests.
- **Webview chat surface** — Composer now handles multi-line input + shortcuts; `InputBar.tsx` removed.

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
