# Slash commands

> One-keystroke prompts for the most common tasks.

Slash commands are **short, structured instructions** you start a message with. The composer ships **5** of them out of the box:

| Command | What it does | Best paired with |
|---|---|---|
| `/review` | Code review focused on bugs, smells, and obvious risks | `@file` you want reviewed |
| `/test` | Generates tests for the supplied code | `@file` to test |
| `/refactor` | Suggests a refactor and returns the new code in a fenced block | selected code or `@file` |
| `/doc` | Writes or improves documentation | `@file` (often a `.ts` / `.py` / `.go` source) |
| `/explain` | Plain-English walkthrough of a file or block | `@file` (defaults to the active editor) |

The command runs **inside the active mode**. Run `/review` in **`audit`** mode for a security-flavoured review, or in **`reason`** mode for design-flavoured review. Mode always wins.

---

## 1. How to invoke

There are three ways to open a slash command:

### a. Open the palette with `/`

1. Click into the chat composer.
2. Type a single `/` on an empty line — the slash-command palette pops over the toolbar.
3. Keep typing to filter (`/re` matches `/review` and `/refactor`).
4. Use `↑` / `↓` to highlight, `Enter` to select. `Esc` closes the palette without inserting.

### b. Click the **⌘K slash** button

The toolbar button on the right of the composer (tooltip: *"Slash commands (/)"*) opens the same palette when the textarea is empty. Useful when you've forgotten the exact name.

### c. Type the command directly

Type `/review explain this function` and hit `Enter` — the slash is consumed as the command, the rest becomes the prompt body. Works whether or not the palette is open.

---

## 2. The 5 commands in detail

### `/review` — code review

> "Review this file for issues. Be specific: line ranges or quoted snippets."

Run from `audit` mode for security review, `reason` mode for design review, `dev` mode for correctness + readability. Always attach `@file` (or pin the file in the sidebar).

**Example:**

```
/review @src/jito-client.ts focus on retry logic in spawnJito()
```

Expected response shape:

- A short list of findings, each with `severity` (🔴/🟡/🟢), `lines`, and `why`.
- A **Recommended next step** line.
- No patch in the same message — use `/refactor` for that.

### `/test` — generate tests

> "Generate a Vitest test file for this code. Cover the happy path + 2 edge cases + 1 error path."

Pairs naturally with `dev` mode. The composer forwards the full file under the prompt so the model sees the surface under test.

**Example:**

```
/test @webview/src/components/Composer.tsx use vitest + @testing-library/react
```

Expected response: a single fenced code block (language `tsx` or `ts`) containing the new test file. Use the **Copy** button on the code card to paste into a new file.

### `/refactor` — refactor + return edited code

> "Refactor this code. Do NOT change behaviour. Return ONLY the edited source in a single fenced block."

**This is the only command that returns replaceable code** by default. The composer tells the model to wrap the entire answer in one fenced block so you can copy-paste straight back into your file.

**Example — inline edit:**

1. Highlight a function in the editor.
2. `Ctrl+K` → `Inline Edit`.
3. In the modal input box type `/refactor to async/await`.

The result opens in a new editor tab (v0.1.0; v0.2.0 adds diff preview).

### `/doc` — write docs

> "Add JSDoc to every exported function in this file. Keep existing prose where it's right."

Pairs with `create` mode for prose tone, `dev` mode for terse API reference. Works well on `.ts`, `.py`, `.go`, `.rs`.

**Example:**

```
/doc @src/file-context.ts use JSDoc with @returns and @example
```

### `/explain` — walkthrough

> "Explain this file like I'm a junior dev who's never seen the codebase. Highlight the 3 most important parts."

Pairs with `universal` mode for plain language, `reason` mode for design-rationale flavour. Default behaviour: if no file is mentioned, the composer falls back to the **active editor**.

**Example:**

```
/explain the active editor (use the current file)
```

---

## 3. Composition rules

- **One command per turn.** The first `/` that begins a new "word" at the line start is the command; anything else is treated as literal text. `/foo /bar` would not chain.
- **Whitespace is allowed** between the command and the rest of the prompt: `/review   find the race in this handler` is fine.
- **The command survives mode switch.** If you start a message with `/review` in `dev` mode, then click the mode pill to change to `audit`, the message is still a `/review` (just now security-flavoured).
- **`@file` mentions work the same way** inside or outside a slash command.

---

## 4. How commands are implemented

- The palette is a static list mirrored in [`webview/src/components/Composer.tsx`](https://github.com/open-uppu/jito-ide/blob/main/webview/src/components/Composer.tsx) — the **single source of truth** is `SLASH_COMMANDS`.
- The extension forwards the typed text to `jito` as a regular chat message; the command itself is **interpreted by the `jito` backend** (TOML prompt templates, shipped in the jito repo). That keeps commands reusable from the CLI, not just the extension.
- Adding new commands in a future release is a one-file change in the `jito` repo (TOML templates), not a recompile of the extension.

---

## 5. Examples in the wild

**Audit pass:**

```
/audit-mode? @src/auth.ts
```

→ doesn't exist as a slash command. Use **mode** to drive the tone:

```
# click the mode pill → 🛡 Audit
/review @src/auth.ts focus on session fixations and CSRF
```

**Generate + review loop:**

1. `/test @src/utils.ts` → paste the new tests next to `utils.ts`.
2. `/review @src/utils.ts.test.ts` → catch the over-mocks.

**Refactor → review:**

1. Highlight `function foo(...)` in the editor.
2. `Ctrl+K` → `/refactor make it pure, no side-effects`.
3. Paste the new code in.
4. `/review` the whole file to check nothing downstream breaks.

---

## 6. Where to look

- Code: [`webview/src/components/Composer.tsx` — `SLASH_COMMANDS`](../webview/src/components/Composer.tsx)
- Inline-edit entry-point: [`src/inline-edit.ts`](../src/inline-edit.ts) — `trigger()` is bound to `Ctrl+K`.
- jito prompt templates: <https://github.com/open-uppu/jito/tree/main/prompts/commands> (linked from the jito repo README).

> See also: **[Modes](./modes.md)** for how switching mode changes the *flavour* of the same slash command. Most projects benefit from a default combo (`/review` in `audit`, `/explain` in `reason`, `/test` in `dev`).
