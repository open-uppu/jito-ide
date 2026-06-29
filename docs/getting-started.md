# Getting started with `jito-ide`

> **Time to first chat:** ~5 minutes.
> **Audience:** solo devs and prosumers familiar with VS Code and the command line.

`jito-ide` is a VS Code extension that wraps the [`jito`](https://github.com/open-uppu/jito) CLI (v0.2.0+) as a backend subprocess. You get a native chat panel, a sidebar mode switcher, file context, slash commands, and inline edit — all powered by your local `jito` binary talking to the **Minimax-M3** model (identifier `minimax/MiniMax-M3`).

This page walks you from a fresh box to your first streamed response.

---

## 1. Install prerequisites

You need **two things** on your machine before the extension can talk to anything:

### a. `jito` v0.2.0 (the CLI backend)

`jito-ide` does **not** ship the agent. It spawns the `jito` binary as a subprocess. Install it once on your system:

```bash
# Recommended: official installer
curl -fsSL https://raw.githubusercontent.com/open-uppu/jito/main/scripts/install.sh | bash

# Verify it landed
jito version
# → jito 0.2.0
```

If `jito version` prints `command not found`, your shell can't see `~/.local/bin`. Add it:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

Other install paths (Homebrew, Go install, manual `go build`) all work — just make sure `which jito` points at a `0.2.x` binary.

### b. A Minimax API key

1. Get a key at <https://api.minimax.io> (it starts with `eyJ…`).
2. **Keep it secret.** `jito-ide` stores it in **VS Code SecretStorage** (encrypted at rest), not in your settings.json.

That's it. No other system-level setup.

## 2. Install the extension

### Option A — From VSIX (recommended for the open beta)

```bash
git clone https://github.com/open-uppu/jito-ide
cd jito-ide
npm install
cd webview && npm install && npm run build && cd ..
npm run package
# → dist/jito-ide-0.1.0.vsix
code --install-extension dist/jito-ide-0.1.0.vsix
```

### Option B — From source (extension developer mode)

```bash
git clone https://github.com/open-uppu/jito-ide
cd jito-ide
npm install
cd webview && npm install && cd ..
# In VS Code:
code .
# Press F5 → Extension Development Host opens with the extension live-reloaded
```

### Option C — Marketplace

> Coming once we hit `0.1.0 GA`. Once live, VS Code → Extensions → search **"jito"** → Install.

## 3. First-run configuration

After the extension activates (`onStartupFinished`):

1. `Ctrl+Shift+P` → **`jito: Open Settings`**.
2. Paste your **Minimax API key** into the **API key** field → `Save`.
   The extension shows a green checkmark when the key is stored.
3. (Optional) Set the **jito binary path** — leave blank to use the `jito` from `$PATH`.
4. (Optional) Pick a **default mode** (`dev` is the safest starting point).
5. (Optional) Set **max context files** (default 20 — controls `@file` mention cap).

All settings except the API key are visible to other workspace members. The key stays encrypted in your VS Code keychain.

## 4. Your first chat

1. `Ctrl+Shift+P` → **`jito: Open Chat`** (also: `Ctrl+Shift+J`, or click the ⚡ icon in the Activity Bar).
   The chat panel opens to the right of your editor.
2. The **mode pill** in the header defaults to `dev`. Click it to switch.
3. Type a question. Hit `Enter`. Watch the response stream in real time.

### What you should see

- A **message card** with a colored stripe on the left matching the mode (cyan/violet/pink/orange/cyan).
- A **header** with the mode icon, mode name, timestamp, and a `Stop` button while streaming.
- A **footer** once streaming finishes: `📎 N files · NN tokens · N.Ns`.
- The **status bar** (bottom of VS Code) tinted to match the active mode.

If anything goes wrong, jump to **[Troubleshooting](./troubleshooting.md)**.

## 5. First conversation in 5 prompts

Try these one after the other to feel out the modes:

| Mode | Prompt | What to look for |
|---|---|---|
| `dev` | `What does the file at @package.json do?` | File context cards, focused implementation answer |
| `reason` | `Should I use Vitest or @vscode/test-electron for the extension host tests?` | Comparison table, trade-offs called out |
| `create` | `Write a one-paragraph release note for v0.1.0` | Tone, marketing-copy phrasing |
| `audit` | `Review this handler for OWASP top 10: <paste>` | Numbered findings, severity |
| `universal` | `Explain the difference between the extension host and the webview` | Plain-language explanation |

## 6. Optional — turn on telemetry

**Off by default.** `jito-ide` never sends analytics in the Free tier unless you flip the switch.

In `Ctrl+Shift+P` → **`jito: Open Settings`** → **Telemetry** → `true`.

When enabled, we collect: extension version, mode, message counts, error buckets. We **never** send file paths, message bodies, code, or your API key. See **[Security](./security.md)** for the full data sheet.

## 7. Where to go next

- **[Modes deep dive](./modes.md)** — system prompts, icons, color tokens per mode.
- **[File context (`@file`)](./file-context.md)** — attach files to a chat turn.
- **[Slash commands](./slash-commands.md)** — `/review`, `/test`, `/refactor`, `/doc`, `/explain`.
- **[`JITO.md` context](./jito-md.md)** — give the agent project-wide memory.
- **[Security & privacy](./security.md)** — what's stored where, what leaves your machine.
- **[Troubleshooting](./troubleshooting.md)** — `jito not in PATH`, API key, rate limits, common errors.
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** — for the open beta.

## Commands quick reference

| Keybind | Action |
|---|---|
| `Ctrl+Shift+J` (macOS `Cmd+Shift+J`) | Open chat panel |
| `Ctrl+K` (macOS `Cmd+K`) | Inline edit (highlight code first) |
| `Ctrl+Shift+P` → `jito: Switch Mode` | Mode switcher |
| `Ctrl+Shift+P` → `jito: Add File to Context` | Pin a file |
| `Ctrl+Shift+P` → `jito: Open Settings` | Settings webview |

---

> Tip: when the response streams, hit `Stop` (top-right of the card) — the partial answer stays in the panel so you can ask a follow-up.
