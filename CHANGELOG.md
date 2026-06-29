# Changelog

All notable changes to **jito-ide** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - in progress

### Added (Phase 3.4 — MessageCard)
- `webview/src/components/MessageCard.tsx` (NEW, ~470 lines) — replaces the v0.1.0 inline "bubble" rendering with a proper card layout:
  - **4px mode-color stripe** on the left edge of every card (cyan/violet/pink/orange/cyan per `JitoMode`). Error state overrides to magenta.
  - **Header** — mode-icon avatar (24px tinted square, uses `<ModeIcons[mode]>` from Phase 2.2), uppercase mode label, 24h `HH:MM` timestamp, and a `Stop` button while the message is streaming.
  - **Body** — `react-markdown` + `remark-gfm` (GFM tables, task lists, strikethrough, autolinks) with a custom `code` component that pipes fenced blocks through `react-syntax-highlighter` (`Prism` + `oneDark`). Inline code stays as plain monospace. While `msg.streaming === true`, body renders as raw `<pre>` with `whiteSpace: pre-wrap` — no markdown parsing — so delta events append with zero flicker.
  - **Footer** — only when not streaming and at least one of the fields is present: `📎 N file(s) · NN tokens · N.Ns`. File count from `msg.contextFiles?.length`. Tokens from `msg.usage.input_tokens + output_tokens` (formatted as `1.2k` past 1000). Latency from `msg.endedAt - msg.startedAt` (formatted as `3.2s` past 1000ms).
  - **User vs assistant** — assistant cards left-align (`margin-right: auto`), user cards right-align (`margin-left: auto`), max-width `min(100%, 760px)`.
  - **Error state** — magenta stripe + magenta border + no footer.
  - **Streaming state** — raw text body + Stop button + no footer.
  - **Empty content** — returns `null` instead of rendering an empty card.
  - Test affordances — `data-testid="message-card"`, `data-role`, `data-mode`, `data-streaming` attributes on the article element.
- `webview/src/components/MessageList.tsx` — simplified to render `<MessageCard>` per message. The empty-state placeholder still lives here.
- `webview/src/App.tsx` — extended `ChatMessage` with optional `usage`, `contextFiles`, `startedAt`, `endedAt` fields. Wired `messageUpdate` events to stamp `startedAt` on first `streaming: true` and `endedAt` on `streaming: false`. `handleSend` now forwards an optional `contextFiles: string[]` (default `[]`) so the host can attach `@file` paths to a turn.
- `webview/package.json` — added 3 runtime deps (`react-markdown ^9`, `remark-gfm ^4`, `react-syntax-highlighter ^15`) and 1 dev dep (`@types/react-syntax-highlighter ^15`). Vite build: 1399 modules, 966KB JS / 331KB gzipped (warning is acceptable for v1; manual chunk split can come later).
- `webview/preview-phase-3.4.html` — smoke-test preview with 6 mock messages covering every MessageCard branch.
- `assets/smoke-phase-3.4.mjs` — puppeteer smoke-test driver. Saves 5 screenshots to `artifacts/phase-3.4-*.png` and asserts ≥5 cards, dev-mode footer, streaming Stop button, audit-mode card present. **0 console errors.**

### Added (Phase 4.1 — JSON-RPC Streaming)
- Phase 4.1 — JSON-RPC streaming: lock wire protocol contract (docs/jito-jsonrpc.md), refactor src/jito-client.ts to server-assigned message-id model, add Node reference mock (scripts/mock-jito-server.mjs), add Vitest protocol-conformance suite (test/jito-client.test.ts).

### Added (Phase 3.3 — StatusBar)
- `src/status-bar.ts` — full rewrite of the v0.1.0 text-only StatusBar item.
  New behavior:
  - **Mode-colored backgrounds** — 5 custom theme colors
    (`jitoStatusBar.{dev,reason,create,audit,universal}Background`) registered
    via `package.json` `contributes.colors` with light/dark/high-contrast
    defaults. The status bar picks the right color for the active mode and
    tints the bar accordingly.
  - **Animated ⚡ icon** — VS Code's `$(loading~spin)` codicon while
    streaming, alternating with `$(zap)` on a 300 ms `setInterval` tick to
    fake the pulse (no DOM/CSS keyframes inside a StatusBarItem).
  - **Pulse animation when streaming** — alternates the foreground icon
    and toggles the background between the mode tint and transparent,
    giving a 600 ms breathing pulse with a mode-color halo.
  - **Static gray when idle** — `$(zap)` + theme-default background, with
    a slow 4 s opacity breathing on the bolt so the bar still feels alive.
  - **Error state** — `$(zap) $(error)` glyph, magenta foreground,
    `statusBarItem.errorBackground`. Tooltip truncates the message at 40
    chars to keep the bar tidy on narrow windows.
  - **Mode-flash** — 200 ms transient flash on the foreground color and a
    prominent background, so the user sees the mode they just switched to.
  - **Cross-platform safe** — the StatusBarItem API is identical on
    macOS, Windows, and Linux; theme differences are absorbed by the
    light/dark/high-contrast defaults in `package.json`. The class also
    exposes `StatusBarState` (`'idle' | 'streaming' | 'error'`) for
    future tests.
- `package.json` — 10 new theme color contributions (5 background tints,
  5 foreground accents) with light/dark/high-contrast defaults that
  match the webview's `--color-mode-<m>-{primary,bg}` tokens. No
  `main` / `activationEvents` / `contributes.commands` changes.
- `webview/src/index.css` — added the `.status-bar` family plus a
  retrofitted `.app-footer[data-state]` block so the chat-panel footer
  mirrors the VS Code status bar exactly. Includes four `@keyframes`:
  `bolt-breathe` (4 s idle), `bolt-pulse` (600 ms streaming),
  `bolt-shake` (1.2 s error), and `bar-flash` (200 ms mode change).
- `webview/preview-phase-3.3.html` — 6-section visual smoke test
  (idle × 5 modes, streaming × 5 modes, error × 2 messages, mode-flash
  timeline, app-footer wiring reference, VS Code chrome story mock).

### Cross-platform notes
- The spec asked for "CSS keyframes" inside the StatusBarItem. VS Code's
  StatusBarItem has no DOM, so true CSS keyframes are not possible there.
  We approximate the pulse via a JS `setInterval` ticker that alternates
  the codicon between `$(loading~spin)` and `$(zap)`. The webview side
  uses real `@keyframes` because the webview is a full browser context.
- The spec asked for `backgroundColor: string` for per-mode tints. The
  StatusBarItem API only accepts `ThemeColor | undefined` for
  `backgroundColor`, so we register custom theme IDs in `package.json`
  and reference them via `new vscode.ThemeColor('jitoStatusBar.<m>...')`.

### Added (Phase 1.3 — Tailwind Theme Config)
- `webview/tailwind.config.js` — flat top-level brand colors (`bg-canvas`,
  `text-cyan`, `bg-magenta`), `mode.*` palettes with `DEFAULT` aliases so
  `text-mode-dev` works out of the box, `borderRadius.panel` (8px) and
  `borderRadius.card` (12px), animations `pulse-glow` / `slide-up` /
  `fade-in` at 60–120 ms ease-out, `fontFamily.sans` / `mono` / `display`
  bound to Phase 1.2 Geist stacks.
- `webview/src/styles/utilities.css` — `.glow-cyan`, `.glow-magenta`,
  `.pulse-mode`, `.gradient-mode-{dev,reason,create,audit,universal}`,
  `.text-glow-{cyan,magenta}`, plus compound `.panel-surface` (8px) and
  `.card-surface` (12px). Classes ship outside `@layer utilities` to avoid
  Tailwind content-scan purge.
- `webview/src/styles/tokens.css` — new semantic radius tokens
  `--radius-panel` (8px) and `--radius-card` (12px).
- `webview/preview-phase-1.3.html` — visual smoke test exercising every
  new class (Tailwind bridge + custom utilities).

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
