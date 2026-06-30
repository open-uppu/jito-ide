---
platform: Hashnode
type: long-form post
created: 2026-06-30
card: 55d13382
---

# Shipping jito-ide — open beta for a free Cursor alternative

We're open-sourcing `jito-ide` on the VS Marketplace today. It's a free, open-source VS Code extension that wraps the `jito` multi-mode agent CLI. Five modes in your sidebar. Streaming chat. Local-first. You bring your own API key.

**Install:** search "jito ide" in the VS Marketplace. **Source:** [github.com/open-uppu/jito-ide](https://github.com/open-uppu/jito-ide).

## Why

Cursor is great. Cursor is also $20/mo, one mode, closed source. We wanted:

- 5 modes instead of 1 (different tasks want different system prompts)
- Free for solo devs
- Open source so we can audit what the model sees
- Local-first — your code doesn't leave your machine unless you opt in

## The 5 modes

The sidebar has a mode dropdown. Switch and the system prompt + tool set change instantly:

- **dev** — TDD, debug, code review (`/test`, `/review`, `/refactor`)
- **reason** — architecture, trade-offs, planning (`/plan`)
- **create** — greenfield, scaffolding, naming (`/scaffold`)
- **audit** — security, license, deps (`/audit`)
- **universal** — fallback

This is the actual differentiator. Once you bounce between `/plan` in **reason** and `/scaffold` in **create** during a feature, single-mode chat hurts.

## Architecture

Extension host (TypeScript + Node 20) → spawns `jito` subprocess → JSON-RPC over stdio → streams tokens back to React webview. Extension is a thin shell. All agent logic lives in [jito core](https://github.com/open-uppu/jito). One binary, one process tree. Every jito improvement lands in the IDE automatically.

## What's in the open beta

- Streaming chat panel with markdown + syntax highlighting
- 5-mode switcher with per-mode system prompts
- `@filename` file context
- `JITO.md` project context loader (like `.cursorrules`)
- Slash commands (`/review`, `/test`, `/refactor`)
- Encrypted credentials (VS Code SecretStorage)
- Status bar with mode tint + token count
- Hero header + composer + keyboard shortcuts

## What isn't (and why)

We deliberately didn't ship these in v0.2.0:

- `Ctrl+K` inline edit → v0.3.0 (~2 months)
- Conversation history → v0.3.0
- Multi-file selection → v0.3.0
- Plugin marketplace → v0.4.0

We want feedback on chat + modes first. Shipping inline-edit before people have used the modes for a week would just mean bad data on which mode people prefer.

## Quick start

```bash
# 1. Install the extension from the VS Marketplace
#    → search "jito ide"

# 2. Install the jito CLI (backend)
curl -fsSL https://raw.githubusercontent.com/open-uppu/jito/main/install.sh | bash

# 3. Set your API key
jito config set api-key sk-...

# 4. Open VS Code → Ctrl+Shift+P → "jito: Open Chat"
```

## Roadmap

- **v0.3.0** — inline edit, conversation history, multi-file selection
- **v0.4.0** — plugin marketplace for slash commands + custom modes
- **v0.5.0** — team features

## Get involved

- [GitHub Discussions](https://github.com/open-uppu/jito-ide/discussions) — questions, ideas, show & tell
- [GitHub Issues](https://github.com/open-uppu/jito-ide/issues) — bug reports, feature requests
- [Discord](https://discord.gg/uppu-jito) — real-time chat

Built by [@openuppu](https://github.com/open-uppu). MIT licensed.