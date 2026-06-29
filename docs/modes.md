# jito-ide modes

5 first-class modes, one extension.

jito-ide's differentiator vs Cursor, Copilot, and Continue is that modes are not
skins. Each mode has its own system prompt, its own stroke-only SVG icon, and
its own status-bar tint.

The result is a chat surface that changes behavior and visual state together:
dev for implementation, reason for decisions, create for language, audit for
review, and universal for the default path.

## At a glance

| Mode | Color | Hex | What it's for |
|---|---|---:|---|
| dev | Blue | `#00A3FF` | Coding, refactor, debug. |
| reason | Violet | `#A855F7` | Architecture, decisions, trade-offs. |
| create | Magenta | `#FF1B6B` | Writing copy, docs, READMEs. |
| audit | Orange | `#F97316` | Security review, OWASP, edge cases. |
| universal | Cyan | `#00E5FF` | Catch-all default with no special system prompt. |

## ⚙ Dev

![dev mode streaming screenshot](../artifacts/phase-3.3-per-mode/streaming-0-dev.png)

### What it's for

Dev mode is tuned for implementation work: coding, refactors, failing tests,
debugging, and small design corrections close to the source. Use it when the
answer should move quickly from diagnosis to code-level action.

### Try asking

- "Refactor this function to async"
- "Why is this test failing?"
- "Add error handling to api.ts"

### Color token

`--color-mode-dev-primary` in [`webview/src/styles/tokens.css`](../webview/src/styles/tokens.css).

### Icon source

`webview/src/components/icons/Dev.tsx` — `</>` chip.

## 🧠 Reason

![reason mode streaming screenshot](../artifacts/phase-3.3-per-mode/streaming-1-reason.png)

### What it's for

Reason mode is tuned for architecture, decisions, and trade-offs. Use it when
the right output is not a patch yet, but a clear comparison of options,
constraints, and consequences.

### Try asking

- "Should we use Postgres or SQLite here?"
- "Compare REST vs GraphQL for this API"
- "Walk me through the trade-offs of this schema"

### Color token

`--color-mode-reason-primary` in [`webview/src/styles/tokens.css`](../webview/src/styles/tokens.css).

### Icon source

`webview/src/components/icons/Reason.tsx` — φ node-graph.

## 🎨 Create

![create mode streaming screenshot](../artifacts/phase-3.3-per-mode/streaming-2-create.png)

### What it's for

Create mode is tuned for writing: product copy, docs, READMEs, release notes,
announcements, and editing tone. Use it when the goal is clear language that
ships with the project.

### Try asking

- "Write a release note for v0.2.0"
- "Draft a feature announcement"
- "Polish this paragraph"

### Color token

`--color-mode-create-primary` in [`webview/src/styles/tokens.css`](../webview/src/styles/tokens.css).

### Icon source

`webview/src/components/icons/Create.tsx` — ✨ spark.

## 🛡 Audit

![audit mode streaming screenshot](../artifacts/phase-3.3-per-mode/streaming-3-audit.png)

### What it's for

Audit mode is tuned for security review, OWASP issues, edge cases, and failure
paths. Use it when the useful answer is skeptical: what can break, what can be
abused, and what should be tightened before release.

### Try asking

- "Review auth.ts for OWASP top 10"
- "Find race conditions in this handler"
- "Check this user input handler"

### Color token

`--color-mode-audit-primary` in [`webview/src/styles/tokens.css`](../webview/src/styles/tokens.css).

### Icon source

`webview/src/components/icons/Audit.tsx` — 🛡 + scan lines.

## 🌐 Universal

![universal mode streaming screenshot](../artifacts/phase-3.3-per-mode/streaming-4-universal.png)

### What it's for

Universal mode is the catch-all default. It has no special system prompt, so it
is the right place for mixed work, quick explanations, translation between
languages, and general file understanding.

### Try asking

- "Explain what this does"
- "Translate this Python to Go"
- "Summarize this file"

### Color token

`--color-mode-universal-primary` in [`webview/src/styles/tokens.css`](../webview/src/styles/tokens.css).

### Icon source

`webview/src/components/icons/Universal.tsx` — ◯ ring.

## How mode switching works

The mode pills in the chat header
([`webview/src/components/ModeSelector.tsx`](../webview/src/components/ModeSelector.tsx))
and the sidebar activity-bar view (`jito-ide.modeSwitcher`) control the same
mode state.

The active mode drives three visible and behavioral surfaces:

- The system prompt sent to the `jito` CLI backend.
- The mode-color stripe on the active message card in `ModeSelector`.
- The tinted VS Code status bar background from
  [`src/status-bar.ts`](../src/status-bar.ts), using
  `jitoStatusBar.{mode}Background` theme colors.

Mode is per-workspace. It persists across messages and VS Code restarts through
the VS Code `workspaceState` API during
[`src/extension.ts`](../src/extension.ts) `activate`.

## What ships today vs what's next

- [x] Shipped: 5 icons (Phase 2.2).
- [x] Shipped: 5-mode palette in `tokens.css` (Phase 1.1).
- [x] Shipped: mode pills in chat header (Phase 3.1-3.2).
- [x] Shipped: per-mode stripe on message cards (Phase 3.4).
- [x] Shipped: mode-tinted animated status bar (Phase 3.3).
- [x] Shipped: mode-specific settings panel (Phase 3.5).
- [ ] Planned: per-mode slash commands.
- [ ] Planned: mode-specific dashboard widgets (v0.3+).

## Related

- [`README.md`](../README.md)
- [`docs/design.md`](./design.md)
