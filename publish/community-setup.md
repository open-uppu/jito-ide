---
title: Community setup guide
purpose: Step-by-step instructions for the human to set up Discord (or Slack) for jito-ide community
audience: human (CEO/marketing)
created: 2026-06-30
card: 55d13382
---

# jito-ide community setup

This is the checklist for spinning up the official jito-ide community channels.
Designed for a solo-dev launch — everything below can be done in 1-2 hours.

## TL;DR — what you need to do

1. Pick Discord (recommended) or Slack
2. Create the server
3. Configure channels + roles
4. Drop the invite link into README + docs site + Discord link on GitHub
5. Pin the launch post in `#announcements`

Total time: ~90 minutes if Discord, ~60 if Slack.

---

## Option A: Discord (recommended)

Why Discord over Slack:

- Free forever (Slack free tier caps at 90 days of message history)
- Better for OSS communities (Continue, Cline, Roo all use Discord)
- Voice channels for office hours
- Threaded conversations on messages (Slack free tier doesn't have these)
- Built-in roles + permissions + bot ecosystem (Carl-bot, MEE6, Statbot)

### Step 1 — Create the server

1. Open https://discord.com → Log in (create a personal account if you don't have one — use `openuppu` or your real name)
2. Click **+** (Add a Server) → **Create My Own** → **For me and my friends**
3. Server name: **jito-ide**
4. Icon: upload `assets/icon-128.png` from this repo (or `assets/logo-mark.svg`)
5. Region: closest to your users (default is fine for global)

### Step 2 — Channels

Delete `#general` (or repurpose) and create:

| Channel | Purpose | Visibility |
|---|---|---|
| `#welcome` | Rules + onboarding (read-only by default) | visible |
| `#announcements` | Releases, roadmap updates (read-only for members) | visible |
| `#general` | Anything jito-related (text + threads) | visible |
| `#help` | Bug reports, how-to questions | visible |
| `#show-and-tell` | What you built with jito | visible |
| `#modes` | Discussion of the 5 modes, slash command requests | visible |
| `#dev` | Dev-mode-specific chat | visible |
| `#reason` | Reason-mode-specific chat | visible |
| `#create` | Create-mode-specific chat | visible |
| `#audit` | Audit-mode-specific chat | visible |
| `#contributing` | PRs, code review, RFCs | visible |
| Voice: `Office Hours` | Drop-in voice, weekly schedule TBD | visible |

### Step 3 — Roles

| Role | Color | Permissions |
|---|---|---|
| `@uppu` (you) | jito cyan | admin |
| `@maintainer` | blue | manage messages, kick non-spam, pin |
| `@contributor` | green | honorary, given to merged-PR authors |
| `@early-adopter` | purple | first-100-install badge |
| `@member` | default | send messages in non-read-only channels |
| (everyone) | — | read `#welcome`, `#announcements`, `#general` |

### Step 4 — Welcome message

Pin this to `#welcome`:

```
Welcome to jito-ide ⚡🖥️

This is the community for the open-source multi-mode AI agent VS Code extension.

📖 Docs: https://github.com/open-uppu/jito-ide
💬 Discussions: https://github.com/open-uppu/jito-ide/discussions
🐛 Issues: https://github.com/open-uppu/jito-ide/issues
🚀 Install: search "jito ide" in the VS Marketplace

Ground rules (be excellent to each other):
1. Be kind. We're all learning.
2. Help others when you can. Credit where due.
3. Don't post API keys, tokens, or proprietary code.
4. Spam → kick. Harassment → ban.

Code of conduct: https://github.com/open-uppu/jito-ide/blob/main/CODE_OF_CONDUCT.md (TBD)
```

### Step 5 — Bots (optional but recommended)

- **Carl-bot** — auto-role on reaction, anti-spam, welcome messages
  - Invite: https://carl.gg → sign in → Add to jito-ide server
  - Set `#welcome` reaction: `✅` → `@member` role
- **Statbot** — channel activity stats (nice-to-have, ignore for MVP)
- **MEE6** — only if you want auto-moderation. Skip for now (Carl-bot covers it)

### Step 6 — Get the invite link

Server Settings → Invites → Create Invite → Set "Expire after" to **Never**, "Max uses" to **No limit**, channel to `#welcome` → Copy link.

Drop this link into:
- README.md (replace the placeholder)
- docs site (replace `https://discord.gg/uppu-jito` placeholder)
- Twitter bio
- GitHub org description

---

## Option B: Slack (only if you have an existing workspace)

If you already have a Slack workspace for `open-uppu`, just create channels there.

Free tier limitations to know:
- 90-day message history only (bad for searchable community knowledge)
- 10 app integrations max (annoying for bots)
- No threads on free plan in some regions

Channels (same as Discord, but Slack-prefixed):

| Channel | Purpose |
|---|---|
| `#jito-announce` | Releases (one-way, only admins post) |
| `#jito-general` | Anything jito-related |
| `#jito-help` | Bug reports, how-to |
| `#jito-modes` | Mode-specific discussion |
| `#jito-contrib` | PRs, code review |

---

## What comes after launch

Week 1:
- Pin the Show HN post in `#announcements`
- Cross-post the Twitter thread
- Add the Discord link to the GitHub repo's "About" sidebar

Week 2:
- Drop a "Top 5 slash command requests from week 1" thread
- Run first office hours session (90 min, recorded)

Month 1:
- First maintainer promotion (the most active contributor)
- "Used in production" thread — collect user stories

---

## Note on Hacker News / Reddit accounts

You probably already have these, but if not:

- **Hacker News** — sign up at https://news.ycombinator.com with a real-sounding username (not "company-marketing"). Use `uppu` or `openuppu` if available. Add a profile: bio + link to GitHub.
- **Reddit** — u/uppu or u/openuppu (pick one). Build some karma first by commenting in r/vscode and r/programming for a few weeks before the launch post.

These aren't strict requirements but they make the launch post 10x more credible.

---

## Cost: $0

Both Discord and Slack free tiers cover this use case. No paid plan needed until you cross ~500 active members.