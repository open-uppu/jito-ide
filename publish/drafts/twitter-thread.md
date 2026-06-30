---
platform: Twitter / X
type: thread (8 tweets)
created: 2026-06-30
card: 55d13382
---

🧵 We just open-sourced jito-ide to the VS Marketplace. Free Cursor alternative. 5 modes, not 1.

[1/8]

The pitch in 30 seconds:
→ Free (bring your own API key)
→ 5 modes: dev / reason / create / audit / universal
→ Local-first, open source (MIT)
→ Wraps our `jito` multi-mode agent CLI

[2/8]

The big bet: "AI in your editor" doesn't have to mean "one generic chat."

A debugging session wants different tools than a greenfield scaffold. Different tasks = different system prompts. So we made them first-class sidebar modes, not buried settings.

[3/8]

Switching modes changes the system prompt + tool set instantly.

→ dev: TDD, /review, /test, /refactor
→ reason: architecture, /plan, /compare
→ create: greenfield, /scaffold, /name
→ audit: security, /deps, /license-scan
→ universal: fallback

[4/8]

Architecture:
TypeScript extension host (Node 20)
  → spawn('jito', ['run','--format=jsonrpc','--stream'])
    → React webview (WebSocket)
      → Minimax-M3 API

Extension is a thin shell. All agent logic lives in jito core. One binary, one process tree.

[5/8]

What works today:
✅ Chat panel + streaming markdown
✅ 5-mode switcher
✅ @filename file context
✅ JITO.md project context loader
✅ /review /test /refactor slash commands
✅ Encrypted API key (VS Code SecretStorage)
✅ Hero header + composer + multi-mode icons

[6/8]

What's NOT in v0.2.0 (and that's deliberate):
❌ Ctrl+K inline edit → v0.3.0
❌ Conversation history → v0.3.0
❌ Multi-file selection → v0.3.0

We want feedback on chat + modes first.

[7/8]

Try it:
→ VS Marketplace: search "jito ide"
→ Source: github.com/open-uppu/jito-ide
→ Install jito CLI: curl -fsSL https://raw.githubusercontent.com/open-uppu/jito/main/install.sh | bash

[8/8]

Open beta question: which mode do you actually live in? Drop your top-3 slash command requests. Top 5 ship in v0.3.0.

Built by @openuppu 🤝