---
platform: Reddit r/programming
type: release post
created: 2026-06-30
card: 55d13382
---

# jito-ide v0.2.0 — open-source VS Code AI extension with 5 modes (free, local-first, open beta)

We shipped `jito-ide` v0.2.0 to the VS Marketplace today. Open-source, free, local-first. Wraps our `jito` multi-mode agent CLI as a backend subprocess.

The differentiator from Cursor / Continue / Cline / Copilot is **5 first-class modes** instead of one generic chat:

| Mode | Purpose | Slash commands |
|---|---|---|
| dev | TDD, debug, code review | /test, /review, /refactor |
| reason | Architecture, planning | /plan, /compare |
| create | Greenfield, scaffolding | /scaffold, /name |
| audit | Security, deps, license | /audit, /deps |
| universal | Fallback | — |

Switching modes changes the system prompt + tool set instantly. This is the actual reason we built it — a debugging session wants different context than a greenfield scaffold, and "AI in your editor" doesn't have to mean "one generic chat."

**Pricing:** Free, BYO API key (Minimax-M3 or OpenAI-compatible). No $20/mo.

**Architecture:**

```
VS Code extension (TypeScript + Node 20)
  → spawn('jito', ['run','--format=jsonrpc','--stream'])
    → React webview (WebSocket)
      → Minimax-M3 API
```

Extension is ~3K LOC, genuinely readable. All agent logic lives in [jito core](https://github.com/open-uppu/jito) so every jito improvement lands in the IDE automatically.

**Open beta feedback we want after 100 installs:**

1. Which mode do you live in?
2. Top 5 missing slash commands
3. Cursor / Continue / Copilot switching blockers?

**Links:**

- Marketplace: search "jito ide"
- Source: github.com/open-uppu/jito-ide
- Discussions: github.com/open-uppu/jito-ide/discussions

License: MIT. Built by uppu.