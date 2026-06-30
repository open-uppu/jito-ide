# Card 55d13382 — Publish proof (jito-rel respawn #4)

**Card:** `55d13382-6490-4509-94c5-4f61f1aa32a6`
**Title:** jito-ide v0.1.0 — Marketplace publish (open beta) + launch post
**Status (this attempt):** BLOCKED (cannot complete without human action)
**Respawn #:** 4 (prior 3 attempts ended in "blocked default" — heartbeats went stale before finalize)
**Worker:** jito-rel
**Date:** 2026-06-30

---

## What jito-rel shipped autonomously (4 attempts total)

### PR #6 — `release/v0.1.0-license` branch
- **URL:** https://github.com/open-uppu/jito-ide/pull/6
- **Status:** OPEN
- **State:** +961 / -128 across 13 files
- **Commits:**
  - `3d8974a` — chore: relicense to MIT for v0.2.0 public beta
  - `a27b7f23` — docs: add v0.2.0 launch assets (CHANGELOG entry + 6 drafts + runbook + community guide)

### `gh-pages` branch
- **Commit:** `d12e984`
- **Files:** `index.md`, `_config.yml`, `_layouts/default.html`, `404.md`, `CNAME` (ide.jito.dev), `assets/{favicon.ico, preview-full.png, preview-hero.png}`
- **Theme:** jekyll-theme-cayman + custom jito-themed CSS + 5-mode-pill header

### `.vsix` artifact (local + in dist/)
- **File:** `dist/jito-ide-0.2.0.vsix` (~109 KB, 27 files)
- **Publisher:** uppu
- **Version:** 0.2.0 (card title says v0.1.0; origin/main is genuinely v0.2.0 — Phase 6.2 already bumped)
- **License:** MIT (verified via `unzip -p .../package.json | jq -r .license`)

### Pre-existing TS build bugs fixed (caught while packaging)
1. `webview/src/lib/commands.ts` (JSX in `.ts` file) → renamed to `.tsx`
2. `webview/src/App.tsx` — broken import `InputBar` → `Composer`
3. `webview/src/SettingsPage.tsx` — wrong path `'../types'` → `'./types'`

These were unmerged on `phase-4.2-slash-palette` and would have broken the next `vsce package` run from main if not fixed.

---

## What cannot be completed without a human

These actions require a real human with browser/credentials the worker doesn't have:

### 🚫 Step 1 — Create `uppu` publisher account on VS Marketplace
- URL: https://marketplace.visualstudio.com/manage
- Requires: Microsoft / Azure DevOps account
- ~5 min

### 🚫 Step 2 — Generate Azure DevOps PAT
- URL: https://dev.azure.com/uppu/_usersSettings/tokens
- Scope: Marketplace → **Manage**
- Expiration: 90 days
- ~2 min

### 🚫 Step 3 — `vsce login uppu` + `vsce publish`
- Requires the PAT from Step 2
- ~5 min

### 🚫 Step 4 — Post launch content (4 platforms, ~30 min)
- dev.to (`publish/drafts/dev-to.md`)
- Hashnode (`publish/drafts/hashnode.md`)
- Twitter (`publish/drafts/twitter-thread.md`)
- Hacker News Show HN (`publish/drafts/show-hn.md`)
- Reddit r/vscode (`publish/drafts/reddit-vscode.md`)
- Reddit r/programming (`publish/drafts/reddit-programming.md`)

### 🚫 Step 5 — Enable GitHub Pages on `gh-pages` branch
- URL: https://github.com/open-uppu/jito-ide/settings/pages
- Branch: `gh-pages` / `(root)`
- ~3 min

### 🚫 Step 6 — Configure DNS for `ide.jito.dev`
- Add CNAME record: `ide` → `open-uppu.github.io`
- ~5 min

### 🚫 Step 7 — Set up Discord (per `publish/community-setup.md`)
- ~90 min

### 🚫 Step 8 — Monitor first 100 installs
- 1 week

**Total human time:** ~3-4 hours across 3 days, plus 1 week of monitoring.

---

## Why this blocks vs completes

The card is in `running` status because a worker claimed it. But the deliverable
("publish to VS Marketplace + post to 4 platforms") requires credentials and
social-media accounts the worker cannot create or operate. Attempting to fake
the publish would (a) fail at `vsce publish` with no PAT, and (b) spamming
social media with AI-generated launch posts would harm the brand more than help.

The honest path: BLOCK the card with a clear handoff to the human. All the
autonomous prep (LICENSE, docs site, launch drafts, runbook, community guide)
is merged on the `release/v0.1.0-license` branch (PR #6 ready to merge) and the
`gh-pages` branch is ready to enable. The human only needs to do Steps 1-8
above; everything else is push-button.

---

## Steps for the human (printable checklist)

- [ ] **Merge PR #6** → https://github.com/open-uppu/jito-ide/pull/6
- [ ] **Create publisher account** at https://marketplace.visualstudio.com/manage (publisher name: `uppu`)
- [ ] **Generate Azure DevOps PAT** at https://dev.azure.com/uppu/_usersSettings/tokens (scope: Marketplace → Manage, 90-day expiry)
- [ ] **Save the PAT** somewhere secure (1Password, Bitwarden, etc.)
- [ ] **Run locally:** `cd jito-ide-build && vsce login uppu && vsce publish`
- [ ] **Verify live:** https://marketplace.visualstudio.com/items?itemName=uppu.jito-ide
- [ ] **Enable GitHub Pages** at https://github.com/open-uppu/jito-ide/settings/pages (branch: `gh-pages`)
- [ ] **Configure DNS:** CNAME `ide.jito.dev` → `open-uppu.github.io`
- [ ] **Post launch content** (see `publish/drafts/` — 6 files, 3-day schedule)
- [ ] **Set up Discord** per `publish/community-setup.md`
- [ ] **Monitor for 1 week:** analytics + GitHub Discussions + Issues

---

## Why we BLOCK now (instead of completing)

The card title is "Marketplace publish (open beta) + launch post." Both
deliverables are impossible without human credentials. We could:
- **A.** Mark the card as `done` — dishonest, the marketplace listing doesn't exist
- **B.** Keep retrying with `workboard_complete` — fails the same way every respawn
- **C.** BLOCK with a precise handoff — honest, breaks the auto-respawn loop, gives the human a clear checklist

We pick C.

The PM (or whoever owns the workboard) can re-claim this card once Step 4
(`vsce publish`) succeeds, or close it as "blocked-on-credentials" and open
a new "Marketplace followup" card for the post-launch monitoring work.

---

## Why we keep getting respawned

The diagnostic on the card says `error: Repeated run failures`. Root cause:
each prior attempt did the autonomous work but timed out (heartbeat stale
~2300-2600s) before calling `workboard_block` to end the loop. The dispatcher
then auto-respawned with a fresh claim token.

This attempt (respawn #4) takes the explicit action to call `workboard_block`
BEFORE the heartbeat expires, breaking the loop.

---

## Branch + artifact pointers

| Resource | Location | State |
|---|---|---|
| LICENSE swap + launch pack | `release/v0.1.0-license` @ `a27b7f23` | Pushed to origin |
| Docs site | `gh-pages` @ `d12e984` | Pushed to origin |
| Pre-built VSIX (MIT license) | `dist/jito-ide-0.2.0.vsix` (109 KB, 27 files) | Local + ready to publish |
| PR #6 | https://github.com/open-uppu/jito-ide/pull/6 | OPEN, ready to merge |
| PUBLISH.md (runbook) | `publish/PUBLISH.md` | In PR #6 |
| 6 launch drafts | `publish/drafts/*.md` | In PR #6 |
| Community guide | `publish/community-setup.md` | In PR #6 |
| CHANGELOG v0.2.0 entry | `CHANGELOG.md` | In PR #6 |
| README polish | `README.md` (MIT + status table) | In PR #6 |

Nothing was lost across the 4 respawns — all artifacts were pushed to GitHub
(origin) before the heartbeats expired.