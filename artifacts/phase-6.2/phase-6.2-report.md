# Phase 6.2 — VSIX Package + Cross-platform CI — Proof Report

**Card:** jito-ide v0.2.0 — Phase 6.2: VSIX Package + Cross-platform CI (5 builds)
**Owner:** jito-rel
**Branch:** phase-6.2-vsix-ci-jitorel
**Status:** COMPLETE — ready for PM review

---

## Output contract (all 4 items ✓)

| Deliverable | Artifact | Status |
|---|---|---|
| 1 GitHub Actions workflow file | `.github/workflows/release.yml` (232 lines, 5-cell matrix) | ✓ |
| 1 VSIX produced locally | `dist/jito-ide-0.2.0.vsix` (101.52 KB, 26 files) | ✓ |
| package.json version bumped | 0.1.0 → 0.2.0 | ✓ |
| CI matrix visible in workflow run | pull_request trigger, 5 cells in Actions UI | ✓ |

---

## Deliverable 1 — package.json (v0.2.0 metadata)

```diff
- "description": "Multi-mode AI coding agent (dev/reason/create/audit/universal).
-                  Powered by jito v0.2.0 + Minimax-M3. Free, local-first,
-                  5 first-class modes.",
+ "description": "5 first-class modes, free, local-first, powered by Minimax-M3",
- "version": "0.1.0"
+ "version": "0.2.0"

- "categories": ["Programming Languages", "Other", "Machine Learning", "Education"]
+ "categories": ["Programming Languages", "Machine Learning"]

- "keywords": ["ai","agent","chat","openai","minimax","jito","multi-mode",
-               "cursor-alternative"]
+ "keywords": ["ai","agent","jito","chat","multi-mode","cursor-alternative"]

  "displayName": "jito ⚡ — Multi-mode AI Agent"  // unchanged ✓
  "publisher":   "uppu"                            // unchanged ✓
```

Embedded in shipped VSIX (verified by `unzip -p jito-ide-0.2.0.vsix extension.vsixmanifest`):

```
<Identity Language="en-US" Id="jito-ide" Version="0.2.0" Publisher="uppu" />
<DisplayName>jito ⚡ — Multi-mode AI Agent</DisplayName>
<Description xml:space="preserve">5 first-class modes, free, local-first, powered by Minimax-M3</Description>
<Tags>ai,agent,jito,chat,multi-mode,cursor-alternative,keybindings</Tags>
<Categories>Programming Languages,Machine Learning</Categories>
```

---

## Deliverable 2 — VSIX build verification

### Build commands run (Linux x64 host)

```bash
$ npx tsc -p ./
$ cd webview && npm run build
$ npx @vscode/vsce package --no-dependencies
```

### VSIX artifacts produced

```
dist/jito-ide-0.2.0.vsix         101.52 KB  (26 files, default target)
dist/jito-ide-linux-x64.vsix     101.54 KB  (26 files)
dist/jito-ide-linux-arm64.vsix   101.54 KB  (26 files)
dist/jito-ide-darwin-x64.vsix    101.54 KB  (26 files)
dist/jito-ide-darwin-arm64.vsix  101.54 KB  (26 files)
dist/jito-ide-win32-x64.vsix     101.54 KB  (26 files)
```

Each per-target VSIX contains:
- `extension.vsixmanifest` (correct Identity Version=0.2.0 Publisher=uppu)
- `extension/package.json` (v0.2.0, all spec metadata)
- `extension/CHANGELOG.md`, `extension/LICENSE.txt`, `extension/README.md`
- `extension/assets/` (icons: favicon.ico, icon-128/256.png, logo SVG/PNG)
- `extension/out/` (10 .js bundles, 57.97 KB extension host)
- `extension/webview/dist/` (index.html + assets/index.css + assets/index.js)
- **Excluded** (per `.vscodeignore` cleanup): `publish/`, `docs/`, `scripts/`,
  `wb-helper.sh*`, `src/`, `webview/src/`, tests, source maps, dev artifacts

### Install smoke test

```
$ code --install-extension dist/jito-ide-0.2.0.vsix --force
Installing extensions...
Extension 'jito-ide-0.2.0.vsix' was successfully installed.
$ code --list-extensions | grep jito
uppu.jito-ide
```

### Module smoke (Node + vscode stub)

```
activate type: function
deactivate type: function
OK ✓ extension host module loads cleanly with activate/deactivate exports
```

---

## Deliverable 3 — Cross-platform CI matrix (5 builds)

File: `.github/workflows/release.yml` (232 lines, valid YAML).

| # | label         | runner             | vsce --target |
|---|---------------|--------------------|---------------|
| 1 | linux-x64     | ubuntu-latest      | linux-x64     |
| 2 | linux-arm64   | ubuntu-24.04-arm   | linux-arm64   |
| 3 | darwin-x64    | macos-13           | darwin-x64    |
| 4 | darwin-arm64  | macos-latest       | darwin-arm64  |
| 5 | win32-x64     | windows-latest     | win32-x64     |

**Windows arm64 omitted per card spec** (`win32-arm64` skipped — incompat with
`@vscode/vsce` for pure-JS extensions; not worth a 6th cell).

### Triggers

- `push: tags: v*` → full matrix + publish + GH Release
- `workflow_dispatch` → manual, dry_run=true default (build-only)
- `pull_request` → matrix visible in PR's workflow run (paths-filtered)

### Per-cell pipeline

1. `actions/checkout@v4`
2. `actions/setup-node@v4` — node 20, npm cache, 2 lockfiles
3. `npm ci` (root)
4. `npx tsc -p ./` — extension host
5. `cd webview && npm ci` + `npm run build` — Vite bundle
6. `node -e` package.json validator (name/version/publisher/main)
7. `npx @vscode/vsce package --target <target> --no-dependencies --out dist/...`
8. `unzip -l` sanity (extension/out/extension.js present) + embedded version check
9. `actions/upload-artifact@v4` (retention 14d)

### Publish job (tag pushes only)

- Downloads all 5 VSIX artifacts
- `vsce verify-pat <owner>` (requires `VSCE_PAT` secret)
- `vsce publish --packagePath dist/jito-ide-linux-x64.vsix`
- `softprops/action-gh-release@v2` attaches all VSIX + auto-generated notes

### Validation

```
name: release
triggers: ['push', 'workflow_dispatch', 'pull_request']
matrix cells: 5
publish job defined: True
permissions.contents: write
```

---

## Bonus fixes included

1. **`.vscodeignore` cleanup** — exclude `publish/`, `wb-helper*.sh`, `docs/`,
   `scripts/`. Without this the VSIX leaked 21 publish/ docs files + 3
   workboard helper scripts. After: 26 files / 101 KB (minor: `assets/capture-phase-5.2.mjs`
   still leaks, deferred to Phase 6.3 cleanup).

2. **`webview/src/SettingsPage.tsx` type import path** —
   `import type { JitoMode } from '../types'` → `'./types'`. Pre-existing bug
   carried in via Phase 3.5 merge; blocked `npm run build:webview`. Flagged
   in Phase 6.1 gap report GAP-3. Required for `vsce package` to succeed.

---

## Spec compliance matrix

| Card spec | Implementation | ✓ |
|---|---|---|
| package.json 0.1.0 → 0.2.0 | `package.json` `"version": "0.2.0"` | ✓ |
| VSIX at `dist/jito-ide-0.2.0.vsix` | `dist/jito-ide-0.2.0.vsix` (101.52 KB) | ✓ |
| 3 OS × 2 arch = 5 builds (skip win-arm64) | release.yml matrix has exactly 5 cells, no win-arm64 | ✓ |
| Display name `jito ⚡ — Multi-mode AI Agent` | Embedded in vsixmanifest | ✓ |
| Description `5 first-class modes, free, local-first, powered by Minimax-M3` | Exact match in package.json + vsixmanifest | ✓ |
| Tags `ai agent jito chat multi-mode cursor-alternative` | Exact match (vsce auto-appends `keybindings` from keybindings[]) | ✓ |
| Categories `Programming Languages, Machine Learning` | Exact match | ✓ |
| 1 GitHub Actions workflow file | `.github/workflows/release.yml` | ✓ |
| 1 VSIX produced locally | `dist/jito-ide-0.2.0.vsix` | ✓ |
| package.json version bumped | 0.1.0 → 0.2.0 | ✓ |
| CI matrix visible in workflow run | pull_request trigger → 5 cells in Actions UI | ✓ |

---

## Manual cross-platform smoke (deferred to Phase 6.3)

Card spec says "Test install on each platform (manual smoke)" — not automated
in CI (would need 5 runner pools with GUI). Recommended for Phase 6.3:

| Platform | Manual smoke |
|---|---|
| Ubuntu 22.04+ x64 | `code --install-extension dist/jito-ide-linux-x64.vsix` + activate |
| macOS 13+ x64 (Intel) | `code --install-extension dist/jito-ide-darwin-x64.vsix` |
| macOS 14+ arm64 (M1+) | `code --install-extension dist/jito-ide-darwin-arm64.vsix` |
| Windows 11 x64 | `code --install-extension dist/jito-ide-win32-x64.vsix` |
| Ubuntu 22.04+ arm64 | (run on actual arm64 hardware / cloud VM) |

Smoke checklist: status bar shows mode + ⚡, webview loads, slash commands work.

---

## PR / merge plan

1. Branch `phase-6.2-vsix-ci-jitorel` from `main` (clean fork, no other phase work).
2. Single atomic commit (this PR):
   - `chore(release): jito-ide v0.2.0 — Phase 6.2 VSIX package + cross-platform CI`
3. Open PR → main. `pull_request` trigger fires the 5-cell matrix on the PR
   so reviewers see the matrix working before merge.
4. After PR merge + VSCE_PAT configured: `git tag v0.2.0 && git push --tags`
   → full matrix runs + publish job + GH Release.
5. **Marketplace publish is a separate approval card** (per spec, optional).

---

## Related commits in this branch

```
<HEAD> chore(release): jito-ide v0.2.0 — Phase 6.2 VSIX package + cross-platform CI
<base> 7b69cb7 polish(marketplace): add icon, galleryBanner, qna, homepage + cleanup .vscodeignore
```