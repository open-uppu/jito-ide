# `JITO.md` — give the agent project memory

> A small Markdown file at the root of your project that the agent reads **on every chat**, before it ever sees your prompt.

`jito-ide` looks for a file named **`JITO.md`** (also accepts `jito.md` and `.jito/CONTEXT.md`) and silently prepends it to every chat message. The idea is the same as `CLAUDE.md` / `AGENTS.md` / `README.md`-as-context: declare **what the project is, how to talk in it, and what to never touch**, and the model respects it without you repeating yourself.

---

## 1. Where `jito-ide` looks (in order, additive)

The loader is **`src/context-loader.ts`**. It walks three scopes; everything found is sent.

| Scope | Path | Loaded on |
|---|---|---|
| **User** | `~/.jito/CONTEXT.md` | every chat, every workspace, every machine-user |
| **Workspace root** | `<workspace-root>/JITO.md` | every chat in this workspace |
| **Folder** | `<folder>/JITO.md` | if you scope a slash command or `@file` mention to that folder |

If multiple files exist in one workspace, they layer — the loader concatenates them in `user → workspace → folder` order. There is **no dedup** between scopes; if your `user` file says *"always use tabs"* and your workspace says *"always use spaces"*, the second wins (it appears later in the prompt).

The sidebar **File Context** view does *not* show these — they're invisible to the user but visible to the model.

---

## 2. What to put in `JITO.md`

A well-tuned `JITO.md` is short, concrete, and authoritative. Think of it as the project's *"house rules"* for an AI employee — not a README for humans.

### The minimum useful section

```markdown
# JITO.md — context for the jito-ide agent

## Stack
- Language: TypeScript (Node 20)
- Test runner: Vitest
- Build: esbuild

## Style
- 2-space indent, single quotes, trailing commas
- Prefer `async/await` over `.then`
- No default exports for utilities

## Forbidden
- Do NOT modify anything under `vendor/`
- Do NOT add new deps without saying so first
- Do NOT change the public shape of `JitoClient`
```

Anything you would normally paste in a one-off "here's the conventions" message is a candidate for `JITO.md`.

### Sections we recommend

- **Stack** — language, framework, runtime version.
- **Style** — formatting, naming, file organization.
- **Forbidden** — files / directories / patterns the agent must never touch.
- **Glossary** — domain-specific terms and what they mean here.
- **Run / verify** — `npm test`, `make`, `cargo test`, etc., so the model can reason about "did this fix it".

### Sections to avoid

- Long code dumps — you'll out-date them by next week.
- Anything that contains a **secret**. `JITO.md` is read by the model. If you have credentials, put them in a `.env` and call them out instead.
- Marketing fluff. The model reads this every turn — keep the signal high.

---

## 3. Loading order and precedence (real example)

Given:

- `~/.jito/CONTEXT.md` → `You are concise. Bullet lists only. No marketing prose.`
- `<workspace>/JITO.md` → `# stripe-checkout\n\nTypeScript + Vitest.`
- `<workspace>/packages/billing/JITO.md` → `## rules\nNever modify the webhook signature validator.`

A chat from `packages/billing/auth.ts` with `@packages/billing/auth.ts` context sends (effectively):

```
[user-context]
You are concise. Bullet lists only. No marketing prose.

[workspace-context]
# stripe-checkout
TypeScript + Vitest.

[folder-context]
## rules
Never modify the webhook signature validator.

[user message]
Why does this fail?
```

Same `JITO.md` for the entire workspace — the **folder-level** adds project-specific override. This is the pattern to use when one repo contains multiple services with different conventions.

---

## 4. Verifying it's loaded

Two ways:

### a. Quick eyeball test

In any chat, ask:

> Summarize the JITO.md context for this workspace.

`audit` and `reason` modes are best at this — they summarize faithfully. If the agent ignores the request or hallucinates, your file probably isn't being read. Check the path.

### b. Inspect from the host

```typescript
// From the VS Code Command Palette → "Developer: Toggle Developer Tools"
// (Not a user-facing path — use only when debugging.)
const files = await vscode.commands.executeCommand('jito-ide.loadContext');
// → returns the ContextLoader result: [{path, content, scope}, …]
```

For everyday use, trust the model — if it stops repeating your stack every turn, your `JITO.md` is doing its job.

---

## 5. Editing & reloading

`JITO.md` is read **at message-send time** (no caching). Edit, save, send a new message — the new content is in the next prompt immediately.

> If you've subscribed to message-level hot-reload, the side-effects appear in the response: the model suddenly follows a new "no default exports" rule.

---

## 6. Anti-patterns to watch out for

| Anti-pattern | Why it hurts |
|---|---|
| **`JITO.md` with 600 lines** | Eats context window; the model forgets middle sections on long chats. |
| **Copy-pasting your README** | README is for humans; the model needs rules. Don't conflate. |
| **Editing `JITO.md` mid-conversation** | The model might silently switch tone mid-stream. Finish the turn, then edit. |
| **Putting real secrets in `JITO.md`** | It's in the prompt, not in `.env`. The agent may quote it back. |
| **One `JITO.md` for the whole monorepo** | Folder-level overrides can't help you if every service shares one file. |

---

## 7. Templates

### A minimal TypeScript library

```markdown
# JITO.md

## Stack
TypeScript (Node 20), esbuild, Vitest.

## Style
- 2-space indent, single quotes, trailing commas.
- One export per file for public utilities.

## Forbidden
- Do NOT modify generated files under `dist/` or `*.gen.ts`.
- Do NOT add new deps without listing them in the reply first.
```

### A multi-service repo (use folder-level files too)

`<root>/JITO.md`:

```markdown
# JITO.md — root

This repo contains three services. Each has its own `JITO.md`.
Follow the closest scope (folder > workspace > user).
```

`<root>/services/api/JITO.md`:

```markdown
# API service — FastAPI + Postgres

- Python 3.12, SQLAlchemy 2.
- Migrations via Alembic.
- Forbidden: editing `alembic/versions/` without an explicit migration prompt.
```

`<root>/web/JITO.md`:

```markdown
# Web — Next.js 14 App Router

- React Server Components by default.
- Forbidden: client `useEffect` for data that can be `fetch()`-on-server.
```

---

## Where to look in code

- Loader: [`src/context-loader.ts`](../src/context-loader.ts) — `loadAll()`, `CONTEXT_FILES = ['JITO.md', 'jito.md', '.jito/CONTEXT.md']`.
- Wired into the chat pipeline: [`src/chat-panel.ts`](../src/chat-panel.ts) — `loadContext` handler is called on the webview's bootstrap.

---

> See also: **[Modes](./modes.md)** for how each mode interprets the same `JITO.md` through its own system prompt. `reason` reads it as policy. `audit` reads it as a threat model. `create` reads it as voice.
