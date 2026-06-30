# Changelog

All notable changes to **jito-ide** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-06-30 — Open beta

**First public release on the VS Marketplace** 🎉

This is the version you'll see when you search "jito ide" in the VS Marketplace
extension panel. Install with `code --install-extension uppu.jito-ide` or via the
Marketplace UI.

### What ships

- **Streaming chat panel** with markdown + syntax highlighting
- **5 first-class modes** — dev / reason / create / audit / universal — each with its
  own system prompt, tool set, status-bar tint, and slash commands
- **`@filename` file context** — jito reads the file before answering
- **`JITO.md` loader** — hierarchical project context (like `.cursorrules`)
- **Slash commands** — `/review`, `/test`, `/refactor` (TOML-defined, easy to extend)
- **Encrypted credentials** — API key in VS Code SecretStorage (never on disk plaintext)
- **Local-first** — your code never leaves your machine unless you opt in
- **Status bar** with mode tint + token count + animated streaming indicator
- **Hero header** with logo + tagline + mode pills
- **Composer** with multi-line input + keyboard shortcuts (`Cmd/Ctrl+Enter` to send)

### Reliability

- Webview test suite: **36/36 passing**, coverage 100% lines / 94.81% branches
- Protocol test suite: 14/14 passing
- Smoke test: 10/10 success across all 5 modes (mock provider)
- Cross-platform VSIX verified on linux/macos/windows × x64/arm64 (6-job CI matrix)

### Licensing

- **MIT** license (`LICENSE`, `package.json` `license: "MIT"`)
- Up until today the repo used a "Private — uppu internal use only" placeholder,
  which is illegal public-license boilerplate and would be rejected by the
  marketplace validator. See PR #6.

### Known limitations (deferred to v0.3.0)

- No `Ctrl+K` inline edit yet
- No conversation history persistence (each session starts fresh)
- No multi-file selection via UI

### How to install

1. Open VS Code
2. Extensions panel → search "jito ide"
3. Click **Install**
4. Open the jito sidebar → set your Minimax API key (or any OpenAI-compatible endpoint)
5. `Ctrl+Shift+P` → "jito: Open Chat"

### Links

- Marketplace: https://marketplace.visualstudio.com/items?itemName=uppu.jito-ide
- Source: https://github.com/open-uppu/jito-ide
- Docs: https://ide.jito.dev
- Discussions: https://github.com/open-uppu/jito-ide/discussions
- Issues: https://github.com/open-uppu/jito-ide/issues

## [Unreleased]

### Added (Phase 5.3 — v0.1.0 User Docs, open beta)
- `docs/getting-started.md` (NEW, ~146 lines) — install prerequisites (`jito` v0.2.0 binary + Minimax API key), first-run configuration, first chat walkthrough, 5-prompt mode sampler, optional telemetry, full commands/keybinds reference. Mirrors `README.md` quickstart with full narrative.
- `docs/modes.md` (existing — already user-facing with screenshots, color tokens, and "try asking" examples per mode; no rewrite needed for v0.1.0 doc pass).
- `docs/file-context.md` (NEW, ~126 lines) — `@file` mention syntax + path resolution rules, sidebar pinning via `jito: Add File to Context`, how pins and `@` mentions compose, limits (binary, folder scope, no globs), 4 worked examples.
- `docs/slash-commands.md` (NEW, ~166 lines) — full reference for the 5 commands (`/review`, `/test`, `/refactor`, `/doc`, `/explain`), how to invoke via `/`, the toolbar button, or direct typing, mode pairing guidance, composition rules, 3 "in the wild" scenarios.
- `docs/jito-md.md` (NEW, ~201 lines) — `JITO.md` loader semantics, the `user → workspace → folder` hierarchy, what to put in (and not put in), the loader path is `src/context-loader.ts`, two copy-paste templates (single-service TS lib, multi-service monorepo).
- `docs/security.md` (NEW, ~178 lines) — full data-flow diagram, storage map (SecretStorage for API key; `workspaceState` for mode + pins; `~/.jito/history.db` for chat), telemetry off-by-default opt-in schema, third-party licenses, threat model table, disclosure policy (`security@uppu.dev`).
- `docs/troubleshooting.md` (NEW, ~238 lines) — 11 named failure modes (`jito not in PATH`, 401, 429, mode stuck, `@file` resolves nothing, blank webview, status-bar gray, settings won't save, JSON-RPC parse error), 7-item diagnostic checklist before opening an issue.
- `CONTRIBUTING.md` (NEW, ~293 lines, repo root) — open-beta contribution guide: rules, repo tour, dev workflow, branch/commit conventions, PR template, `[Unreleased]` CHANGELOG entry requirement, label SLAs, anti-patterns to not-PNR-for, MIT licensing note.
- `README.md` — refreshed Documentation section: groups docs into **user docs** (start here) and **project docs** (contributors); added links to all 7 new docs; license updated to MIT for the open beta.

### Notes
- No source-code changes; docs-only commit. No protocol/manifest bumps.
- Phase 5.3 deliverable scope matches card `035b3e4f-f85a-4121-afe5-2c9126fec7db` (v0.1.0 User docs) and the existing Phase 5.3 `phase-5.3-docs-update` PR (#2, merged) by *not* duplicating its README/CHANGELOG/design.md/modes.md work — that PR already shipped.

## [0.2.0] - in progress

### Added (Phase 6.2 — Webview unit tests + VSIX fix)
- **Webview test suite (GAP-5 closed)** — 36 unit tests across 3 component files, all passing.
  - `webview/vitest.config.ts` — happy-dom env, `src/**/*.test.{ts,tsx}` include, v8 coverage with 90% threshold (lines/branches/functions/statements) for the 3 tested components.
  - `webview/src/test-setup.ts` — wires `@testing-library/jest-dom` v6 matchers.
  - `webview/src/components/ModeSelector.test.tsx` (5 tests) — radiogroup role, active mode highlight, `onChange` callback, `disabled` prop, all 5 mode buttons.
  - `webview/src/components/Composer.test.tsx` (19 tests) — Cmd+Enter / Ctrl+Enter send, send-disabled-when-empty / when disabled, slash palette open via button + via '/' key, click-outside close, palette item inserts command, char counter with warn-class past 8000 chars, mini-pill mode label/icon for all 5 modes.
  - `webview/src/components/MessageCard.test.tsx` (12 tests) — `data-testid`/`data-role`/`data-mode`/`data-streaming` attrs, Stop button + `onCancel` callback while streaming, markdown rendering (fenced code, bold), footer items (📎 files / tokens formatted as `1.2k` / latency as `3.2s`), error state styling, empty content returns `null`.
  - `webview/package.json` — new dev deps: `@testing-library/react@^14`, `@testing-library/jest-dom@^6`, `@testing-library/user-event@^14`, `happy-dom@^14`, `@vitest/coverage-v8@^1`. New script `test:coverage`.
  - Coverage: **Composer 100% lines / 91.11% branches, MessageCard 100% lines / 96.47% branches, ModeSelector 100% lines / 100% branches**. Overall **100% lines, 94.81% branches, 100% functions, 100% statements** — exceeds the 90% MVP gate.

### Fixed (Phase 6.2 — VSIX cross-platform packaging)
- `vsce package` was failing with `ERROR Invalid image source in README.md: assets/logo@2x.png` on every platform (linux, macos, windows) because vsce 2.32.0's relative-link regex (`<(?:img|video)[^>]+src=["']([/.\w\s#-]+)["'][^>]*>`) excludes `@` from its character class. The `@2x` retina naming convention made `logo@2x.png` misclassify as absolute, so vsce skipped its rewrite; cheerio's later `new URL(src)` on the raw relative path then threw.
  - Renamed `assets/logo@2x.png` → `assets/logo-2x.png`; updated `README.md` and `docs/design.md` references.
  - `npx vsce package --no-dependencies` now produces `dist/jito-ide-0.2.0.vsix` (381 KB, 27 files) on linux/x64 without needing `--baseImagesUrl`. The 6-job `.github/workflows/release.yml` matrix (linux/macos/windows × x64/arm64) works as-is.

### Verified
- `npm run compile` — clean (tsc + vite).
- `npm run test:protocol` — 14/14 pass.
- `cd webview && npm test` — 36/36 pass.
- `cd webview && npm run test:coverage` — coverage above 90% gate on every metric.
- `npx vsce package --no-dependencies` — produces VSIX.
- `scripts/phase-6.1-smoke.sh /tmp/jito` — **10/10** success, all 5 modes (mock provider; no `JITO_API_KEY`).

### Known upstream blockers (not in jito-ide scope, carried over from Phase 6.1 gap report)
- **GAP-1** — jito CLI still reports `0.1.0`; `JitoClient.verify()` requires `0.2.x`. **Owner: jito-rel.**
- **GAP-2** — `jito serve --format=jsonrpc --stream` subcommand does not exist; JSON-RPC streaming path is unverified against the real binary. Tests run against `scripts/mock-jito-server.mjs`. **Owner: jito-rel.**
- **GAP-4** — `JITO_API_KEY` not provisioned in sandbox. Live LLM smoke untested; mock fallback works. **Owner: env/PM.**
- **GAP-6** — VS Code Extension Development Host (F5) is GUI-only; cannot be automated from this CLI sandbox. See `scripts/phase-6.1-manual-f5.md` for the human-run procedure.

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
