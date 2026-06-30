---
platform: Hacker News (Show HN)
type: post
created: 2026-06-30
card: 55d13382
---

# Show HN: jito-ide – free Cursor alternative with 5 AI modes (open beta)

Hey HN — we just shipped jito-ide v0.2.0 to the VS Marketplace. It's a free, open-source VS Code extension that wraps our `jito` multi-mode agent CLI.

The pitch:
- **5 first-class modes** in your sidebar (dev / reason / create / audit / universal). Switching changes the system prompt and tool set instantly.
- **Free.** You bring your own API key (Minimax-M3 or OpenAI-compatible). No $20/mo.
- **Local-first.** Code stays on your machine unless you opt in.
- **Open source** (MIT). ~3K LOC extension + ~1K LOC webview, actually readable.

The big bet is that "AI in your editor" doesn't have to mean "one generic chat." A debugging session wants different tools than a greenfield scaffold. We're encoding that as discrete modes you switch between, not as system prompt toggles buried in settings.

Architecture in 30s: TypeScript extension host → spawns `jito` subprocess → JSON-RPC over stdio → React webview. Extension is a thin shell; all agent logic lives in [jito core](https://github.com/open-uppu/jito). Every jito improvement lands in the IDE for free.

What works today:
- Chat panel + streaming markdown
- 5-mode switcher (dev / reason / create / audit / universal)
- @filename file context
- JITO.md project context (like Cursor's .cursorrules)
- /review /test /refactor slash commands
- Multi-mode icons + hero header + composer
- Encrypted API key in VS Code SecretStorage

What doesn't (yet): inline edit (Ctrl+K), conversation history, multi-file selection. All on the 3-month roadmap.

Install: search "jito ide" in the VS Marketplace, or grab the VSIX from the GitHub release.
Source: https://github.com/open-uppu/jito-ide

What we'd love feedback on after 100 installs:
1. Which mode do you actually live in?
2. What slash commands do you wish existed? (Top 5 ship in v0.3.0)
3. What would block you from switching from Cursor / Continue / Cline / Copilot?

Happy to answer questions on architecture, the multi-mode design, or why we built a subprocess wrapper instead of HTTP.