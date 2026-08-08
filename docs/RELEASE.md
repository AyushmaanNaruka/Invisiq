# InvisiQ — Release & Auto-Update Runbook

How a code change (e.g. "remove all modes, ship one mode") reaches users already
running the app. The auto-update stack is `electron-updater` → GitHub Releases feed.

> **Prerequisite that is NOT optional:** the releases must be **public**. The client
> ships no GitHub token, so `electron-updater` can only read `latest.yml` from a
> public repo. If `Ghost-AI-Interview/ghostai` stays private, either make it public
> or create a dedicated public releases repo and point `publish.owner/repo` at it.

---

## One-time setup

1. **Publish target & feed** — already configured in [electron-builder.yml](../electron-builder.yml):
   - `win.target: nsis` (NOT portable — portable cannot self-update).
   - `publish: github → owner: Ghost-AI-Interview, repo: ghostai`.
2. **Releases visibility** — make the repo (or a dedicated releases repo) **public**.
3. **GitHub token** — create a classic PAT with `repo` scope. Used only at publish
   time, never shipped:
   ```powershell
   $env:GH_TOKEN = "ghp_xxx"
   ```

---

## Cut a release

1. **Bump the version** in [package.json](../package.json) (`version`). This is the
   single source of truth `electron-updater` compares. Semver, e.g. `1.2.0 → 1.2.1`.
2. **Build + publish:**
   ```powershell
   $env:GH_TOKEN = "ghp_xxx"
   npm run publish      # build:helper → electron-vite build → electron-builder --win --publish always
   ```
   This produces and uploads to a GitHub Release tagged `v<version>`:
   - `Runtime Broker Setup <version>.exe` (the NSIS installer)
   - `latest.yml` (the update manifest the client polls)
   - `*.blockmap` (differential download)
3. **Keep the release a draft** until ready — `electron-updater` ignores drafts and
   pre-releases. Publish (un-draft) it when you want the fleet to pick it up.

---

## How users receive it

- **Normal path:** 10s after launch the app checks the feed ([updater.ts](../src/main/updater.ts)).
  If newer → toast "Update vX available" → Download → "Install & Restart"
  (`quitAndInstall`). `autoInstallOnAppQuit = true` also applies it on next quit.
  **Fail-open:** a network/parse error never blocks a healthy build.

---

## Verify the full loop (do this BEFORE relying on it)

This is the only real proof the updater works — do it once on a clean machine:

1. `npm run publish` at version **N** (e.g. 1.2.0). Un-draft the release.
2. Install the `Runtime Broker Setup` from that release. Launch it.
3. Bump to **N+1** (1.2.1), `npm run publish`, un-draft.
4. Relaunch the installed N build. Within ~10s it should detect N+1, download, and
   on Install & Restart relaunch as **N+1**. Confirm `app.getVersion()` shows N+1.

---

## Stealth & signing notes

- **Footprint change vs. portable:** NSIS adds a per-user uninstall entry (HKCU) that
  shows in "Apps & features" as *Runtime Broker / Microsoft Corporation*, plus one
  Start Menu shortcut (the only launcher; desktop shortcut disabled). Process/window
  stealth is unchanged. This is the accepted trade for auto-update.
- **Unsigned beta:** downloads are still integrity-checked (sha512 from `latest.yml`),
  so tamper-in-transit is caught. SmartScreen will warn "unknown publisher" on first
  install. Resolve signing (D10) before public launch — a real cert shows the real
  legal entity, so the "Microsoft Corporation" publisher metadata must become a
  neutral name at that point (see Beta Launch Plan §14).
