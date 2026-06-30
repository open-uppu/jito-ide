---
layout: default
title: jito-ide — Multi-mode AI for VS Code
description: Free, open-source VS Code extension with 5 first-class AI modes (dev/reason/create/audit/universal). Local-first, BYO API key.
---

# jito ⚡🖥️ — Multi-mode AI for your editor

**5 first-class modes. One extension. Built for solo devs who ship.**

[Install from VS Marketplace](https://marketplace.visualstudio.com/items?itemName=uppu.jito-ide) ·
[Source on GitHub](https://github.com/open-uppu/jito-ide) ·
[Discussions](https://github.com/open-uppu/jito-ide/discussions)

![jito-ide preview]({{ site.baseurl }}/assets/preview-full.png)

---

## What it does

`jito-ide` is a VS Code extension that wraps the [`jito`](https://github.com/open-uppu/jito) multi-mode agent CLI.
You get a real chat panel in your sidebar with **5 first-class modes** you can switch between instantly:

| Mode | Use it for | Slash commands |
|---|---|---|
| **dev** | TDD, debug, code review | `/test`, `/review`, `/refactor` |
| **reason** | Architecture, trade-offs, planning | `/plan`, `/compare` |
| **create** | Greenfield, scaffolding, naming | `/scaffold`, `/name` |
| **audit** | Security, license, performance | `/audit`, `/deps` |
| **universal** | Everything else | — |

Each mode loads its own system prompt, tool set, and slash commands. Switching modes feels like swapping hats —
your context stays, your role changes.

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

## Features

- **Streaming chat panel** with markdown rendering and code highlighting
- **5-mode switcher** — change system prompt + tools instantly from the sidebar
- **`@filename` file context** — jito reads the file before answering
- **`JITO.md` loader** — hierarchical project context (like `.cursorrules`)
- **Slash commands** — `/review`, `/test`, `/refactor`; add your own via TOML
- **Status bar** — current mode + model + token count at a glance
- **Encrypted credentials** — API key in VS Code SecretStorage (never on disk in plaintext)
- **Local-first** — your code never leaves your machine unless you opt in
- **Hero header + composer** with multi-line input + keyboard shortcuts

## Why modes?

Cursor has one generic chat. We think **"AI in your editor" shouldn't mean "one generic chat."**

A debugging session wants different tools than a greenfield scaffold. A security review wants different
context than a planning session. We encode that as **discrete modes you switch between** in the sidebar —
not as system prompt toggles buried in settings.

Once you bounce between `/plan` in **reason** and `/scaffold` in **create** during a feature, single-mode
chat hurts.

## Architecture

```
VS Code extension (TypeScript + Node 20)
  → spawn('jito', ['run','--format=jsonrpc','--stream'])
    → React webview (WebSocket)
      → Minimax-M3 API
```

Extension is ~3K LOC, genuinely readable. All agent logic lives in [jito core](https://github.com/open-uppu/jito)
so every jito improvement lands in the IDE automatically. One binary, one process tree.

## Roadmap

- **v0.2.0** ✅ — Hero header, mode pills, status bar tints, composer, slash palette _(this release)_
- **v0.3.0** — `Ctrl+K` inline edit, conversation history, multi-file selection
- **v0.4.0** — Plugin marketplace for slash commands + custom modes
- **v0.5.0** — Team features (shared JITO.md, shared slash command library)

## Get involved

- [GitHub Discussions](https://github.com/open-uppu/jito-ide/discussions) — questions, ideas, show & tell
- [GitHub Issues](https://github.com/open-uppu/jito-ide/issues) — bug reports, feature requests
- Discord — real-time chat (invite link coming this week)

Built by [@openuppu](https://github.com/open-uppu). MIT licensed.
