# Signing & publishing `jito-ide` to the VS Marketplace

> Phase 5.0 — release engineering. Companion to `.github/workflows/release.yml`.

This document explains how VSIX "signing" actually works for a VS Code
extension, what is required to publish `jito-ide@0.1.0`, and how the
GitHub Actions release pipeline wires it together.

---

## TL;DR

There are **two kinds of signing** people conflate when they say "sign
the VSIX":

| Kind | What it is | Needed for `jito-ide`? |
|---|---|---|
| **VS Marketplace signing** | A cryptographic signature on the VSIX file, performed by Microsoft's build pipeline when you `vsce publish` with a publisher PAT. Proves the VSIX came from a verified publisher. | ✅ **Yes.** Required for any Marketplace publish. |
| **OS code-signing (Authenticode / Gatekeeper / apt)** | A separate X.509 cert that the OS uses to decide whether to trust a downloaded binary. For native `.exe` / `.dmg` / `.deb` artifacts. | ❌ **No** — VSIX is a ZIP; VS Code itself loads it. The Marketplace signature is what users see. |

**There is no separate "Microsoft cert" to procure.** The Marketplace
publisher identity *is* the signing identity, and you activate it by
creating a publisher in the Marketplace, then issuing a Personal Access
Token (PAT) tied to that publisher.

---

## One-time setup

### 1. Create a publisher

In the [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage):

1. Sign in with the Microsoft / Azure DevOps account that owns `uppu`.
2. **Publishers → Create publisher**.
3. **Publisher ID** must be `uppu` (matches `package.json#publisher`).
4. Fill in display name, description, and logo (we already have
   `assets/icon-128.png`).

> ⚠️ Publisher IDs are immutable once created. If `uppu` is taken by
> another tenant, you'll have to pick a different ID and update
> `package.json#publisher`.

### 2. Issue a Personal Access Token (PAT)

In Azure DevOps (the same org that owns the publisher):

1. **User settings → Personal access tokens → New Token**.
2. **Scopes:** `Marketplace → Manage` (this is what `vsce` needs to
   publish; "Read" is enough if you only want to verify).
3. **Expiration:** 90 days (max allowed). Calendar a rotation reminder.
4. Copy the token immediately — Azure DevOps won't show it again.

### 3. Store the PAT as a GitHub repo secret

In the `open-uppu/jito-ide` GitHub repo:

1. **Settings → Secrets and variables → Actions → New repository secret.**
2. Name: `VSCE_PAT`. Value: paste the PAT.

The `release` workflow reads it via `${{ secrets.VSCE_PAT }}` and passes
it to `vsce publish` through the `VSCE_PAT` env var. It is never echoed
to logs.

### 4. (Optional) Add trusted publishers + branch policies

For higher assurance, Azure DevOps supports **publisher verification**
(organization-level) and GitHub supports **allowed publishers** for
org-wide secret distribution. Both are out of scope for the v0.1.0
launch — single publisher + PAT is enough.

---

## Per-release flow

Once setup is done, cutting a release is a tag push:

```bash
# 1. Bump version + update CHANGELOG on main, commit, merge.
git checkout main
# edit package.json#version, CHANGELOG.md
git commit -am "chore(release): 0.1.0"
git push

# 2. Tag. The matrix kicks off.
git tag v0.1.0
git push origin v0.1.0
```

What happens next (in `.github/workflows/release.yml`):

1. **Build matrix** (6 jobs) — each runner clones, installs deps, runs
   `tsc` + `vite build`, then `vsce package` into
   `dist/<os>-<arch>.vsix`. The VSIX files are byte-identical (the build
   is pure JS), so this is more of a portability smoke test than a real
   cross-compile.
2. **Upload artifacts** — every VSIX is uploaded with the
   `vsix-<os>-<arch>` artifact name so you can compare them in the
   Actions UI if something looks off.
3. **Publish job** (only on `v*` tags) — downloads the artifacts,
   verifies the PAT, then calls `vsce publish --packagePath
   dist/linux-x64.vsix`. `vsce` re-signs and uploads to the Marketplace.
4. **GitHub release** — softprops/action-gh-release attaches all 6 VSIX
   files plus auto-generated notes to the GitHub Release.

---

## Local publishing (manual fallback)

Useful for hot-fixes without cutting a tag:

```bash
# 1. Login locally. Stores the PAT in ~/.vsce (0600).
npx @vscode/vsce login uppu
# (paste PAT when prompted)

# 2. Package + publish.
npm run package
npx @vscode/vsce publish --packagePath dist/jito-ide-0.1.0.vsix
```

Always run `vsce verify-pat uppu` first to confirm the token is still
valid (it expires every 90 days).

---

## Verifying a published extension

After `vsce publish` returns, the Marketplace takes ~5–10 minutes to
propagate. To verify:

```bash
# 1. Marketplace metadata
npx @vscode/vsce show uppu.jito-ide

# 2. Install from Marketplace
code --install-extension uppu.jito-ide

# 3. Confirm the publisher signature
unzip -l ~/.vscode/extensions/uppu.jito-ide-0.1.0/*.vsix \
  | grep -E "manifest|.signature"
```

The Marketplace signature is a `.signature` file in the VSIX that VS Code
checks at install time. If it's missing or invalid, VS Code shows
"Unknown Publisher" and refuses to install without an override flag.

---

## Why we DON'T sign the binary

Some extensions (mostly native node-addons) need Authenticode / codesign
to avoid SmartScreen warnings on Windows or Gatekeeper warnings on macOS.
`jito-ide` is **pure JavaScript** in the extension host plus a
webview bundle. There is no native executable, so:

- ✅ No SmartScreen prompt on Windows.
- ✅ No Gatekeeper prompt on macOS.
- ✅ No `electron-osx-sign` step needed.
- ❌ No separate `*.pfx` cert to procure from DigiCert / Sectigo.

The only "cert" we touch is the Marketplace publisher identity, and that
is provisioned for free as part of the Azure DevOps org.

---

## Common failures & fixes

| Symptom | Cause | Fix |
|---|---|---|
| `Personal Access Token is missing or invalid` | PAT expired or revoked | Re-issue in Azure DevOps, update GitHub secret |
| `Forbidden: Publisher 'uppu' does not exist` | PAT was issued by a user who isn't a member of the publisher | Add the user as a Marketplace publisher member, or use the publisher owner's PAT |
| `Extension signature verification failed` | The VSIX was re-built after `vsce package` before `vsce publish` | Always publish the file `vsce package` just produced; don't touch the zip |
| `Extension package.json is using a publisher not known to the Marketplace` | `package.json#publisher` doesn't match an Azure DevOps publisher you own | Update `package.json#publisher` or create the matching publisher |
| Users see "Unknown Publisher" on install | Same as above, OR they have `"extensions.supportUntrustedWorkspaces": false` set | Document the publisher ID in README so users can opt in |

---

## Future: EV-cert signing for native modules

When we eventually ship a native component (e.g. a `keytar` rebuild or
a `jito` binary bundled in the VSIX), we will need:

- Windows: an EV cert from DigiCert/Sectigo for Authenticode + an
  Azure Trusted Signing account (cheaper, since 2024).
- macOS: a Developer ID Application cert from Apple + `codesign --deep`.
- Linux: a GPG key for the Debian source package (if we ship a `.deb`).

None of that is in scope for v0.1.0. This document will get a sibling
section (`docs/code-signing.md`) when it becomes relevant.

---

**Owner:** `jito-rel` (release engineer) — rotate PAT quarterly.
**Card:** Workboard `jito-ide v0.1.0 — Package VSIX + cross-platform builds`
**Workflow:** `.github/workflows/release.yml`
