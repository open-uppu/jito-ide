# jito-ide v0.2.0 — Publish runbook

**Card:** `55d13382-6490-4509-94c5-4f61f1aa32a6`
**Target:** VS Marketplace open beta + 6-channel launch + docs site + community
**Status:** All automated prep done ✅ — Steps below need your accounts/credentials

---

## ✅ Already done by jito-rel worker

- [x] **`.vsix` rebuilt** (`dist/jito-ide-0.2.0.vsix`, ~109 KB, 27 files, clean)
  - Note: `v0.2.0` not `v0.1.0` — origin/main already has the 0.2.0 version bump from Phase 6.2
- [x] **Marketplace metadata validated** (publisher=`uppu`, icon, banner, qna, homepage, categories, keywords all set)
- [x] **LICENSE = MIT** (was "Private — uppu internal use only")
  - `LICENSE` file: full MIT text
  - `package.json`: `"license": "MIT"`
- [x] **`.vscodeignore` tightened** — excludes `wb-helper*.sh` (contain credentials), `publish/**`, `coverage/**`, `vitest.config.ts`, `webview/dist-prod/**`, `package-lock.json`
- [x] **LICENSE swap branch pushed**: `release/v0.1.0-license` (commit `3d8974a`)
- [x] **LICENSE swap PR opened**: PR #6 — `chore: relicense to MIT for v0.2.0 public beta`
- [x] **6 launch post drafts** in `publish/drafts/`:
  - `dev-to.md` (long-form)
  - `hashnode.md` (long-form)
  - `show-hn.md` (HN-style)
  - `twitter-thread.md` (8 tweets)
  - `reddit-vscode.md` (r/vscode)
  - `reddit-programming.md` (r/programming)
- [x] **Docs site ready** (`gh-pages` branch, commit `d12e984`)
  - Jekyll + Cayman + custom CSS + CNAME for `ide.jito.dev`
  - Files: `index.md`, `_config.yml`, `_layouts/default.html`, `404.md`, `CNAME`, `assets/*`
- [x] **Community setup guide** (`publish/community-setup.md`) — Discord vs Slack decision + 90-min checklist
- [x] **CHANGELOG entry** for v0.2.0 (in `CHANGELOG.md`)

---

## ⚠️ Versions note

The card title says **v0.1.0**. The actual code on `origin/main` is `v0.2.0` (Phase 6.2 already bumped it). The VSIX was packaged as `jito-ide-0.2.0.vsix`. All launch copy and metadata reference v0.2.0.

If you want to publish as v0.1.0 instead, revert the version in `package.json` before Step 4. But honestly — the feature set is genuinely v0.2.0 (Composer, HeroHeader, ModePill, StatusBar with tints are all post-v0.1.0). Ship it as v0.2.0.

---

## 🔒 Step 1 — Merge LICENSE swap PR (you, ~1 min)

```bash
# Review PR #6
gh pr view 6 --repo open-uppu/jito-ide

# If looks good, merge
gh pr merge 6 --repo open-uppu/jito-ide --squash
```

This brings MIT license into `main` so the publish in Step 4 works.

---

## 📋 Step 2 — Create VS Marketplace publisher account (one-time, ~5 min)

1. Open https://marketplace.visualstudio.com/manage
2. Sign in with your Microsoft / Azure DevOps account (suggest using **uppu** as publisher name — already set in package.json)
3. If `uppu` is taken, you'll need to update `publisher` in `package.json` and the GitHub org references in the marketing copy
4. Verify your email; no payment needed for publishing free extensions

---

## 📋 Step 3 — Generate Azure DevOps PAT (one-time, ~2 min)

1. Open https://dev.azure.com/uppu/_usersSettings/tokens
2. Click **+ New Token**
3. Name: `jito-ide-vsce-publish`
4. Organization: **All accessible organizations**
5. Expiration: 90 days (custom)
6. **Scopes:** ✅ Marketplace → **Manage** (NOT "Full access")
7. Click **Create** → copy the token (you'll never see it again)
8. Save it somewhere secure (1Password, Bitwarden, `~/.config/vsce-token`)

---

## 📋 Step 4 — Login + publish (one-time per PAT expiration, ~5 min)

```bash
cd jito-ide-build

# Login (will prompt for PAT)
vsce login uppu

# Verify package contents (27 files expected, no wb-helper scripts, no coverage)
vsce ls

# Publish (this makes it live on the VS Marketplace)
vsce publish
```

After publish completes, verify at:
- https://marketplace.visualstudio.com/items?itemName=uppu.jito-ide (should load)
- https://marketplace.visualstudio.com/publishers/uppu/extensions/jito-ide/latest

---

## 📋 Step 5 — Post launch content (4 platforms, ~30 min total)

The drafts are in `publish/drafts/`. Pick the order:

| When | Where | File | Notes |
|---|---|---|---|
| Day 1, 09:00 PT | dev.to | `dev-to.md` | Cross-post to Hashnode the same day |
| Day 1, 09:00 PT | Hashnode | `hashnode.md` | Set canonical = dev.to URL |
| Day 1, 12:00 PT | Twitter | `twitter-thread.md` | Pin the thread after posting |
| Day 1, 14:00 PT | Hacker News | `show-hn.md` | **Best Show HN hour = 12-15 PT** |
| Day 2, 06:00 PT | Reddit r/vscode | `reddit-vscode.md` | Don't double-post: space out by 24h+ |
| Day 3, 06:00 PT | Reddit r/programming | `reddit-programming.md` | Same |

Pro tips:
- Hacker News: post **between 12:00-15:00 US Pacific** for max front-page time. Title matters more than body.
- Twitter: pin the thread to your profile for 48h.
- Reddit: don't mention "we" or marketing language. r/vscode and r/programming are allergic to self-promo. Lead with the differentiator, not the launch.
- dev.to / Hashnode: submit to their respective "AI" + "Open Source" tags.

---

## 📋 Step 6 — Enable GitHub Pages on gh-pages branch (~3 min)

1. Open https://github.com/open-uppu/jito-ide/settings/pages
2. **Source:** Deploy from a branch
3. **Branch:** `gh-pages` / `(root)`
4. Click **Save**
5. Wait ~2 min for the first build
6. Verify: https://ide.jito.dev (custom domain via CNAME — needs DNS configured)

---

## 📋 Step 7 — Configure DNS for ide.jito.dev (~5 min, depends on registrar)

The `gh-pages` branch has a `CNAME` file pointing at `ide.jito.dev`. To activate:

Add these DNS records at your registrar for `jito.dev`:

| Type | Name | Value | TTL |
|---|---|---|---|
| CNAME | `ide` | `open-uppu.github.io` | 3600 |

(Or use an ALIAS / ANAME if your registrar supports it.)

Then enable **Enforce HTTPS** on the GitHub Pages settings page once the cert provisions (~5-15 min).

---

## 📋 Step 8 — Set up Discord (recommended) or Slack (~90 min)

Full guide in `publish/community-setup.md`. TL;DR:

1. Create Discord server named "jito-ide"
2. Configure channels (welcome, announcements, general, help, show-and-tell, modes, contributing)
3. Set up roles (uppu, maintainer, contributor, early-adopter, member)
4. Get invite link, drop into README + docs site + Twitter bio

---

## 📋 Step 9 — Monitor first 100 installs (~1 week)

- Check VS Marketplace analytics: https://marketplace.visualstudio.com/manage → click jito-ide → "More actions" → "Analytics"
- Watch for issues: https://github.com/open-uppu/jito-ide/issues
- Read Discussions daily: https://github.com/open-uppu/jito-ide/discussions
- Collect top 5 slash-command requests for v0.3.0

---

## Quick human-action checklist (print this)

- [ ] **Step 1:** Merge PR #6 (LICENSE swap to MIT)
- [ ] **Step 2:** Create `uppu` publisher account on VS Marketplace
- [ ] **Step 3:** Generate Azure DevOps PAT with Marketplace → Manage scope
- [ ] **Step 4:** `vsce login uppu` + `vsce publish`
- [ ] **Step 5a:** Post dev.to + Hashnode (Day 1 morning)
- [ ] **Step 5b:** Post Twitter thread (Day 1, pin for 48h)
- [ ] **Step 5c:** Post Show HN (Day 1, 12-15 PT)
- [ ] **Step 5d:** Post r/vscode (Day 2)
- [ ] **Step 5e:** Post r/programming (Day 3)
- [ ] **Step 6:** Enable GitHub Pages from `gh-pages` branch
- [ ] **Step 7:** Configure DNS for `ide.jito.dev`
- [ ] **Step 8:** Create Discord server (or Slack workspace)
- [ ] **Step 9:** Monitor installs for 1 week, collect feedback

Total human time: ~3-4 hours spread across 3 days.