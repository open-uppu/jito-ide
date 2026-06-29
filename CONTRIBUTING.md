# Contributing to `jito-ide`

> **Status: open beta.** Issues, PRs, design feedback, and docs fixes are all welcome.

`jito-ide` is the VS Code frontend for the [`jito`](https://github.com/open-uppu/jito) CLI. It's small on purpose: a TypeScript extension host that wraps a Go subprocess. We move fast and we move in the open.

This page tells you **how to contribute**, what we review for, and how to ship a clean pull request.

---

## TL;DR

1. **Open an issue first** for anything bigger than a typo. Tag it `[bug]`, `[feature]`, `[docs]`, or `[security]`.
2. **Fork** and create a topic branch (`phase-X.Y-short-name`).
3. Keep PRs **small and scoped** — one phase, one concern. We merge or we send back, no in-between.
4. Run **`npm test` + `npm run test:protocol` + `npm run test:webview`** before opening the PR.
5. **Open the PR** against `main`. The CI runs lint + tests on every push; we'll review within ~48h on weekdays.

If that's enough, you're done. Read the rest only when something is unclear.

---

## 1. Ground rules

- **Be kind.** This is a small project. Disagreement is welcome; rudeness is not. Follow the [Contributor Covenant](https://www.contributor-covenant.org/).
- **No drive-by refactors in unrelated PRs.** If you see dead code in a file you're touching, open a follow-up issue, don't slip it into your PR.
- **APIs you add are public.** Anything reachable from `webview/src/lib/` or registered in `package.json` `#/contributes` is **public API** and needs a `[api]` note in your PR.
- **Don't check in generated files.** `out/`, `dist/`, `webview/dist/`, `node_modules/`. The `.vscodeignore` already excludes them; keep it that way.

---

## 2. Repo tour

```
jito-ide/
├── src/                        # Extension host (TypeScript)
│   ├── extension.ts            # activate / deactivate
│   ├── jito-client.ts          # JSON-RPC client over stdio
│   ├── chat-panel.ts           # webview host
│   ├── mode-switcher.ts        # sidebar webview
│   ├── file-context.ts         # @file mentions
│   ├── context-loader.ts       # JITO.md hierarchy
│   ├── inline-edit.ts          # Ctrl+K handler
│   ├── settings.ts             # SecretStorage wrapper
│   └── status-bar.ts           # mode-tinted status bar
├── webview/                    # React app (bundled separately)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/         # MessageList, ModeSelector, Composer, MessageCard
│   │   └── styles/             # tokens.css + utilities.css
│   └── vite.config.ts
├── docs/                       # user-facing docs (you are here)
│   ├── getting-started.md
│   ├── modes.md
│   ├── file-context.md
│   ├── slash-commands.md
│   ├── jito-md.md
│   ├── security.md
│   └── troubleshooting.md
├── test/                       # @vscode/test-electron + Vitest
├── package.json                # vsce manifest
└── tsconfig.json
```

---

## 3. Dev workflow

You need **three** things installed:

```bash
node --version   # v20.x
npm --version    # v10+
jito version     # 0.2.0
```

Then:

```bash
git clone https://github.com/open-uppu/jito-ide
cd jito-ide
npm install
cd webview && npm install && cd ..

# Open in VS Code
code .

# Press F5 to launch the Extension Development Host
# The host is a *separate* VS Code window with the extension live-installed.
# Edit either side; the host auto-reloads on save.
```

### Build targets

| Target | Command | Use for |
|---|---|---|
| Extension host (TS) | `npm run watch` | iterating on `src/*.ts` |
| Webview (Vite) | `cd webview && npm run dev` | iterating on `webview/src/**` |
| Everything | `npm run build` | before `npm test` |

### Tests

```bash
npm test                 # @vscode/test-electron — integration
npm run test:protocol    # Vitest — JSON-RPC wire-protocol conformance
npm run test:webview     # Vitest — webview component tests
```

If your PR changes the JSON-RPC contract (anything `src/jito-client.ts` does), update **[`docs/jito-jsonrpc.md`](docs/jito-jsonrpc.md)** in the same PR. The protocol test will fail if the doc and the implementation drift — that's by design.

### Lint / format

```bash
npm run lint      # ESLint on src/
npm run format    # Prettier on src/
```

We use the `eslint:recommended` ruleset + a few size guards (`max-lines`, `max-lines-per-function`). If a file's over the cap, split it.

---

## 4. Branching & commits

### Branch names

Format: **`phase-X.Y-short-name`** or **`fix/short-name`** or **`docs/topic`**.

Examples (good):

- `phase-4.2-streaming-cancel`
- `fix/inline-edit-empty-selection`
- `docs/security-clarify-telemetry`

Examples (don't):

- `patch-1`, `stuff`, `jito-ide-update`

### Commit messages

Conventional Commits — we don't enforce the tooling, we enforce the shape:

```
<type>(<scope>): <subject>

<body>

<footer>
```

| Type | When |
|---|---|
| `feat` | new user-visible behaviour |
| `fix` | bug fix |
| `docs` | docs only |
| `refactor` | no behaviour change |
| `test` | test only |
| `chore` | build / ci / tooling |

**Scope** is the affected surface — `host`, `webview`, `composer`, `protocol`, `security`, `docs`.

Example:

```
feat(composer): add /explain slash command with palette filter

Adds a 5th slash command (/explain) and wires it through the
webview palette. Updates docs/slash-commands.md.

Closes #142
```

> **One logical change per commit.** Multiple unrelated commits in one PR = we'll ask you to split.

---

## 5. Pull request checklist

Before opening the PR:

- [ ] Branch is up to date with `main` (`git pull --rebase origin main`).
- [ ] `npm test` passes locally.
- [ ] `npm run test:protocol` passes locally (if protocol touched).
- [ ] `npm run test:webview` passes locally (if webview touched).
- [ ] `npm run lint` clean.
- [ ] New files have header comments (`/** file.ts — one-line summary */`).
- [ ] No secrets, no API keys, no real user data in any diff.
- [ ] If you touched `package.json#contributes.*`, you ran `npm run compile` to confirm the manifest parses.

PR template — please fill the boxes:

```markdown
### What does this PR do?
(2–3 sentences)

### How to test it
(Manual steps + automated test commands)

### Checklist
- [ ] Tests added/updated
- [ ] Docs updated (if user-visible)
- [ ] CHANGELOG entry under [Unreleased]
```

### The `[Unreleased]` block

Add a line under the `[Unreleased]` heading in `CHANGELOG.md`. One bullet per PR.

```
## [Unreleased]

### Added (Phase X.Y — YourTitle)
- short description
```

CI won't reject a missing entry, but reviewers will.

---

## 6. Issue triage

We use labels:

| Label | Meaning | SLA |
|---|---|---|
| `[bug]` | Confirmed broken behaviour | 72h to first response |
| `[feature]` | Proposal / RFC | best-effort |
| `[docs]` | Docs only | best-effort |
| `[security]` | Security report | see `docs/security.md` §"Reporting" — **do not** file publicly for real vulns, email instead |
| `[good-first-issue]` | Scoped, mentored | maintainer pairing |

If you open an issue and the bot labels it `[needs-info]`, please respond within 7 days or it'll be auto-closed.

---

## 7. Coding style — house rules

- TypeScript strict mode. **No `any`** outside of `legacy/` (we don't have one yet — let's keep it that way).
- Naming: `camelCase` for variables/functions, `PascalCase` for types/components, `SCREAMING_SNAKE` for module-level constants.
- **One thing per file.** If a file has more than one React component that isn't the default export, split it.
- No `console.log` outside `activate/deactivate` lifecycle. Use the **Output → `jito-ide`** channel via `createOutputChannel` for diagnostics.
- **Hot paths** (`status-bar.ts`, `chat-panel.ts`) are size-capped (`max-lines-per-function: 80`). If a function grows, refactor first, change second.
- CSS lives in `webview/src/styles/`. **Do not** write inline styles for colours — pull from `tokens.css`.

---

## 8. What **not** to send a PR for

These are deliberate choices; PRs that go against them will be closed with a redirect to this list:

- **Switching the backend to a hosted service.** `jito-ide` is local-first by spec; see `companies/jito-ide.md` §"Hard rules".
- **Adding `telemetry` as default-on.** Telemetry is opt-in, always.
- **Removing the 5-mode switcher.** It's the differentiator; `add another mode if you want one`, never `pick one`.
- **Storing the API key anywhere except SecretStorage.** Even during dev workarounds. Use `setApiKey` in `src/settings.ts`.
- **Adding new runtime npm dependencies without discussion.** Each one ships to every user's VS Code. Be conservative.

---

## 9. Releases

We follow **Semantic Versioning**:

- `0.x.y` — open beta. Minor bumps add features freely.
- `1.0.0` — API stable. Breaking changes need a major bump.
- Patch-level = bug fixes only.

Release process (for maintainers):

1. PR `release/vX.Y.Z` with `CHANGELOG.md` + `package.json` version bump.
2. Tag `vX.Y.Z` after merge.
3. GitHub Actions builds the VSIX + signs + publishes. Details: [`docs/signing.md`](docs/signing.md).

---

## 10. Where to ask for help

- **Bug reports / RFCs**: <https://github.com/open-uppu/jito-ide/issues>
- **Q&A**: <https://github.com/open-uppu/jito-ide/discussions> (linked from `package.json#qna`)
- **Security**: `security@uppu.dev` (PGP on request)
- **Slack/matrix**: not yet — Discord TBD

---

## 11. License

By contributing, you agree your contributions are licensed under the project's **MIT License** (or, while still "private internal," under the terms of the contributing CLA below; we'll switch in lockstep with `0.1.0 GA`).

If you're contributing on behalf of an employer, please confirm you have authority to do so. We don't have a fancy CLA tool — a single comment in your first PR suffices:

> I confirm these contributions are my own / I have authority to contribute them under MIT.

---

Thanks for reading this far. Welcome to `jito-ide`. ⚡
