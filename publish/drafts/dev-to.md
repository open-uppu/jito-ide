---
platform: dev.to
type: long-form post
created: 2026-06-30
card: 55d13382
---

# jito-ide — a free Cursor alternative with 5 first-class modes (open beta)

**TL;DR.** We just open-sourced `jito-ide` on the VS Marketplace. It's an open-source VS Code extension that wraps the [`jito`](https://github.com/open-uppu/jito) multi-mode agent CLI. **5 first-class modes** in your sidebar (dev / reason / create / audit / universal), streaming chat, `@filename` file context, `JITO.md` project context. Free, local-first, bring your own API key. Cursor costs $20/mo for one mode — jito-ide gives you five, $0, with full source.

**Install:** search "jito ide" in the VS Marketplace, or [grab the VSIX](https://github.com/open-uppu/jito-ide/releases).

![banner](https://raw.githubusercontent.com/open-uppu/jito-ide/main/assets/og-banner.png)

![jito-ide demo](https://raw.githubusercontent.com/open-uppu/jito-ide/main/assets/demo.gif)

---

## Why we built it

Cursor proved the model — devs will pay for AI-native editor UX. But three things bugged us:

1. **One generic mode.** "Refactor this" and "explain this" want different prompts, but Cursor bakes them into one.
2. **$20/mo for the privilege.** Solo devs and prosumers shouldn't have to pay for what is basically a chat window with file context.
3. **Closed source.** Your code, your prompts, your history — locked into a black box.

So we built `jito-ide` as a thin VS Code wrapper around `jito` (our open-source multi-mode agent CLI). The extension is mostly a chat webview + subprocess plumbing. All the agent brains live in jito core — every improvement to jito lands in the IDE automatically.

## The five modes (the actual differentiator)

The sidebar has a mode dropdown. Switch and the system prompt, tool set, and tone change instantly:

| Mode | Use it for | Sample slash |
|---|---|---|
| **dev** | TDD, debugging, code review | `/test`, `/review`, `/refactor` |
| **reason** | Architecture, trade-offs, planning | `/plan`, `/compare` |
| **create** | Greenfield, scaffolding, naming | `/scaffold`, `/name` |
| **audit** | Security, license, deps | `/audit`, `/deps` |
| **universal** | Everything else | — |

Each mode has its own:

- **System prompt** — different framing, different priorities
- **Tool set** — e.g. dev mode has `run_tests`, audit mode has `read_file` + `regex_search` for license text
- **Status bar tint** — colored stripe at the bottom of VS Code so you always know which mode you're in
- **Slash commands** — the right verbs for the role

Once you bounce between `/plan` in **reason** and `/scaffold` in **create** during a feature, single-mode chat hurts.

## Features that ship in v0.2.0

- **Streaming chat panel** with markdown + syntax highlighting
- **5-mode switcher** with per-mode system prompts and tool sets
- **`@filename` file context** — jito reads the file before answering
- **`JITO.md` loader** — hierarchical project context (like `.cursorrules`)
- **Slash commands** — `/review`, `/test`, `/refactor` (TOML-defined, easy to add your own)
- **Status bar** with mode tint + model + token count
- **Encrypted credentials** — API key in VS Code SecretStorage (never on disk plaintext)
- **Local-first** — your code never leaves your machine unless you opt in
- **Hero header** with logo + tagline + mode pills
- **Composer** with multi-line input + keyboard shortcuts

## Architecture

```
VS Code extension (TypeScript + Node 20)
  → spawn('jito', ['run','--format=jsonrpc','--stream'])
    → React webview (WebSocket)
      → Minimax-M3 API
```

The extension is a thin shell — ~3K LOC for the extension host, ~1K LOC for the React webview. All the agent brains (tool calling, conversation management, token accounting, file access controls) live in [jito core](https://github.com/open-uppu/jito). One Go binary, one process tree. Every jito improvement lands in the IDE for free.

## Quick start

```bash
# 1. Install the extension from the VS Marketplace
#    → search "jito ide"
#    OR: code --install-extension uppu.jito-ide

# 2. Install the jito CLI (backend)
curl -fsSL https://raw.githubusercontent.com/open-uppu/jito/main/install.sh | bash

# 3. Set your API key (Minimax-M3 or OpenAI-compatible)
jito config set api-key sk-...

# 4. Open VS Code → Ctrl+Shift+P → "jito: Open Chat"
```

## What we want feedback on

After the first 100 installs, the open questions are:

1. **Which mode do you actually live in?** (We bet dev + reason.)
2. **What slash commands do you wish existed?** Top 5 requests ship in v0.3.0.
3. **What's blocking you from switching from Cursor / Continue / Cline / Copilot?**

We're going to be reading every response in [GitHub Discussions](https://github.com/open-uppu/jito-ide/discussions). If something's broken, open an issue. If something's missing, tell us which mode should have it.

## Roadmap

- **v0.3.0** — `Ctrl+K` inline edit, conversation history, multi-file selection
- **v0.4.0** — Plugin marketplace for slash commands + custom modes
- **v0.5.0** — Team features (shared JITO.md, shared slash command library)

## Get involved

- [GitHub Discussions](https://github.com/open-uppu/jito-ide/discussions) — questions, ideas, show & tell
- [GitHub Issues](https://github.com/open-uppu/jito-ide/issues) — bug reports, feature requests
- [Discord](https://discord.gg/uppu-jito) — real-time chat

Built by [@openuppu](https://github.com/open-uppu). MIT licensed.