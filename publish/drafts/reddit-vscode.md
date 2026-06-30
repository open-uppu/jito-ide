---
platform: Reddit r/vscode
type: release post
created: 2026-06-30
card: 55d13382
---

# [Release] jito-ide v0.2.0 — free, open-source Cursor alternative with 5 AI modes (open beta)

Hey r/vscode — we just shipped `jito-ide` v0.2.0 to the Marketplace. It's a free, open-source VS Code extension wrapping our multi-mode agent CLI.

**TL;DR:**

- 5 first-class modes in the sidebar (dev / reason / create / audit / universal)
- Free (you bring your own API key — Minimax-M3 or OpenAI-compatible)
- Local-first, open source (MIT)
- Streaming chat panel + `@filename` file context + `JITO.md` project context

**Why modes?** Cursor's chat is great but generic. A `/refactor` wants different context than a `/scaffold`. We made them first-class sidebar modes, not buried settings toggles.

**Install:** Search "jito ide" in the VS Marketplace, or grab the VSIX from the [GitHub release](https://github.com/open-uppu/jito-ide/releases).

**Source:** [github.com/open-uppu/jito-ide](https://github.com/open-uppu/jito-ide) — ~3K LOC extension + ~1K LOC webview, genuinely readable.

**What works today:**

- Chat panel + streaming markdown
- 5-mode switcher with per-mode system prompts
- `@filename` file context
- `JITO.md` hierarchical project context loader
- `/review`, `/test`, `/refactor` slash commands
- Encrypted API key (VS Code SecretStorage)
- Status bar (mode + model + token count)
- Multi-mode icons + hero header + composer

**What's NOT in v0.2.0:**

- `Ctrl+K` inline edit → v0.3.0 (~+4 weeks)
- Conversation history → v0.3.0
- Multi-file selection → v0.3.0

**Architecture:**

TypeScript extension host → spawns `jito` subprocess → JSON-RPC over stdio → React webview. Extension is a thin shell. All agent logic lives in [jito core](https://github.com/open-uppu/jito). One binary, one process tree.

**Open beta feedback we want** (after 100 installs):

1. Which mode do you actually live in?
2. What slash commands do you wish existed? (Top 5 ship in v0.3.0)
3. What's blocking you from switching from Cursor / Continue / Cline?

GitHub Discussions is open: https://github.com/open-uppu/jito-ide/discussions

Built by uppu. AMA on architecture or multi-mode design.