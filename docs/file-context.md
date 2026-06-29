# File context — `@file` mentions and pinned files

> Give the agent the code you actually want it to read.

By default the agent only sees what you type in the composer. To make it actually look at a file, you have **two ways** to attach context. They compose — you can mix `@file` mentions and sidebar pins in the same turn.

---

## 1. `@file` mentions (inline)

Inside the chat composer, type `@` followed by a path. The webview renders the path as a chip. Hit `Enter` or `Space` to commit it.

```
Why does @src/jito-client.ts spawn the subprocess in --mode=jsonrpc?
```

You can mention as many files as you want, up to `jito-ide.maxContextFiles` (default **20**). Past the cap, the agent only sees the first N — confirmed in the response footer (`📎 N files`).

### Path resolution

| What you type | Resolves to |
|---|---|
| `@src/jito-client.ts` | `src/jito-client.ts` (relative to the workspace root) |
| `@./components/Composer.tsx` | `./components/Composer.tsx` |
| `@/usr/local/src/foo.ts` | absolute path (used as-is) |
| `@Composer.tsx` | fuzzy match — first hit by basename in the workspace |

For multi-folder workspaces, prefix with the folder name:

```
Compare @webview/src/components/Composer.tsx with @extension-host/src/jito-client.ts
```

### What gets sent to the model

The extension reads each resolved file from disk at message-send time and forwards the **raw UTF-8 content** to `jito` as part of the request body. The footer reports total files but **not** total bytes — large files are chunked by `jito` (see `jito-ide.maxContextFiles` in Settings).

### Cancelling a mention

Hover the `@…` chip, click the `×` — it disappears from the composer but stays a valid mention until you send.

---

## 2. Pinned files (sidebar)

The **File Context** view in the Activity Bar (click the 📎 icon or `Ctrl+Shift+P` → `jito: Add File to Context`) shows every file you've pinned for the current workspace.

### Pin a file

1. Open the file in the editor.
2. Right-click anywhere in the editor → **jito: Add File to Context**.
   Or: `Ctrl+Shift+P` → `jito: Add File to Context`.

The file lands at the bottom of the **File Context** sidebar.

### What the sidebar shows

```
📎 File Context
─────────────────
auth.ts
schema.prisma
app/api.ts
Dockerfile
…
[ Clear all ]
```

- **Each row** = one file. The badge uses the file's basename; the full path lives in `data-path`.
- **Hover** reveals the full path as a tooltip.
- **Click the `×`** to unpin that single file.
- **`Clear all`** wipes the whole list.

### How pinning interacts with `@file` mentions

| What you send | Files actually included |
|---|---|
| `@a.ts explain this` (no pins) | just `a.ts` |
| `explain the auth flow` (3 pins) | all 3 pinned files |
| `@b.ts and @c.ts compare` (3 pins) | `b.ts`, `c.ts` **and** the 3 pins — order: pins first, then `@` |

Pinning is sticky across messages and VS Code restarts (`workspaceState`). `@` mentions are per-turn.

---

## 3. Limits & gotchas

- **No files outside the workspace** (no `/etc/…`, no `~/`). The mention resolver only matches inside `vscode.workspaceFolders`. Use absolute paths only if the file sits in an open folder.
- **Binary files** (images, compiled `.node`, etc.) are skipped silently — the model never sees the bytes, and the chat card footer shows the reduced file count.
- **Huge files**: `jito` truncates with a clear `\n…[truncated]…` marker if a file would blow past the model's context window. Lower `jito-ide.maxContextFiles` to avoid surprises.
- **Glob patterns are not supported** in v0.1.0 (`@**/*.ts` does not expand). Pin or mention each file explicitly.

---

## 4. Inspector / where to look in code

- Mention resolution: [`src/chat-panel.ts:sendMessage`](../src/chat-panel.ts) — `contextFiles` is forwarded to `jito.chat()`.
- Pinned-file sidebar: [`src/file-context.ts`](../src/file-context.ts) — `FileContextProvider` powers the webview view.
- Cap: `jito-ide.maxContextFiles` setting, default `20`, see [`package.json`](../package.json).

---

## 5. Examples

**Single-file Q&A:**

> Compare the error handling in `@src/jito-client.ts` with `@src/settings.ts`. Which one is safer?

→ Sends both files in the same turn. Footer reads `📎 2 files · …`.

**Pinned workflow:**

1. Pin `Dockerfile`, `.env.example`, `package.json` (the deployment surface).
2. Ask: `What's the smallest change to make this image 40% smaller?`

→ All three pinned files ride along even though you typed no `@file`.

**Mixed:**

> Review this PR diff: `@.gitignore` against `@Dockerfile`. Add a recommended fix to the bottom of your answer.

→ 2 mentions + the pinned files (if any) = full context surface.

---

> Related: **[Slash commands](./slash-commands.md)** take `@file` mentions too. Most use cases for `/review` and `/refactor` *expect* you to attach the file in the same message.
