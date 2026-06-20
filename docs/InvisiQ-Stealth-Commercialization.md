# InvisiQ — Stealth & Commercialization Decision Memo

> Status: current (June 2026). Captures the research + decision behind removing the
> "RuntimeBroker" Microsoft-impersonation disguise while keeping stealth, and the
> adaptive WDA-degrade hook. Companion to CLAUDE.md "Brand vs. disguise".

## The question

Can we remove the `RuntimeBroker` disguise (required for commercialization) and still
stay undetected by proctoring tools (Mercer Mettl, Examity, Respondus, SEB, Proctorio)?

## Core finding: disguise ≠ stealth

InvisiQ has **six** stealth layers. Only **one** depended on the "RuntimeBroker" name:

| # | Layer | Win32 mechanism | Defeats | Name-dependent? |
|---|---|---|---|---|
| 1 | Visual invisibility | `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` | screen capture / share / recording | No |
| 2 | Foreground-monitor evasion | `WS_EX_NOACTIVATE` (`setFocusable(false)`) | `EVENT_SYSTEM_FOREGROUND` hooks (Mettl `MsbWindowCef`) | No |
| 3 | Taskbar / Alt-Tab hiding | `setSkipTaskbar(true)` + watchdog | window/taskbar enumeration | No |
| 4 | **Process-name evasion** | `app.setName` / `executableName` | **process-list blacklist matching** | **YES** |
| 5 | Keystroke suppression | out-of-process `WH_KEYBOARD_LL` helper | keys leaking to foreground app | No |
| 6 | Watchdog | re-applies 1–3 | OS resetting flags | No |

Removing the disguise touches **only layer 4** — and only against proctors that can
enumerate processes at all.

## Who actually catches you by process name

- **Bucket A — browser-extension & live/human proctors** (Proctorio, Honorlock, Examity-live,
  every Zoom/Teams/Meet interview). **Cannot enumerate processes.** Process name is invisible
  to them. Removing the disguise costs nothing here. Layer 1 (WDA) is the whole game.
- **Bucket B — desktop lockdown browsers** (Mettl MSB, Respondus LDB, Safe Exam Browser).
  Scan running processes against block/allow lists. Name matters — but a blacklist only catches
  *known* names, so an honest/neutral name works exactly as well as `RuntimeBroker` **until
  InvisiQ is popular enough to be added to their lists**. Obscurity buys runway, not durability.

## The unguarded flank (name-independent)

`WDA_EXCLUDEFROMCAPTURE` (layer 1) is itself queryable: `GetWindowDisplayAffinity` reads the
affinity flag of **any** window from **any** process. The kill-chain — `EnumWindows`
(enumerates even hidden windows) → `GetWindowDisplayAffinity` → `GetWindowThreadProcessId` —
finds and flags the overlay **regardless of its process name**. The disguise never protected
this vector. This is the emerging frontier (a 2026 "SetWindowDisplayAffinity bypass" cottage
industry already exists).

## Why `RuntimeBroker` was actively toxic

Impersonating a System32 Microsoft binary is a textbook malware signal (process impersonation +
keyboard hook + capture-hiding). CrowdStrike Falcon terminated InvisiQ at runtime for exactly
this. It also blocks code-signing (no CA signs a Microsoft-binary impersonator) and is legal
exposure for a commercial product. `author: "Microsoft Corporation"` in package.json was the
same class of liability in file metadata.

## Decision (zero-budget posture)

Remove the impersonation — it is **all upside** for the realistic commercial market (Bucket A,
where the name is invisible) and reduces EDR surface. Against Bucket B, the name was never a
durable defense, so we lose nothing real. What we did NOT do (requires investment, deferred):
EV code-signing (trust on EDR-managed machines), GPU-pipeline overlay (a name-independent,
sweep-proof capture primitive — the Cluely approach), and the second-device/companion
architecture (the only durable moat vs hardened lockdown browsers).

## What shipped (this change)

1. **Neutral process identity** — `executableName: Helio` (was `RuntimeBroker`). Single source
   of truth: `DEFAULT_PROCESS_NAME` in `src/shared/constants.ts`.
2. **Honest AppUserModelId** — `com.ghostai.app` (was `Microsoft.Windows.RuntimeBroker`).
3. **Metadata de-impersonation** — package.json `author`/`description` → InvisiQ.
4. **Key-safe** — userData dir stays `RuntimeBroker` (frozen *internal* identity, invisible to
   proctoring; decoupled from the visible name) → **no data migration, keys stay decryptable**.
   One-time `migrateLegacyProcessName()` rewrites the legacy `RuntimeBroker` process-title default.
5. **Adaptive WDA-degrade (opt-in, `stealth.evadeSweepProctor`, default OFF)** — when a
   *sweep-capable* Bucket-B proctor is detected, drop WDA so a `GetWindowDisplayAffinity` sweep
   finds nothing. Watchdog-aware (honors a shared `contentProtectionDesired` flag so it isn't
   clobbered). **Default off because** dropping WDA exposes the overlay to screenshots/recording —
   the *more common* proctor vector today; enable only against a proctor you know sweeps.
   Bucket-A proctors (Proctorio/Honorlock) never trigger it — they see the shared screen, so WDA
   must stay on.

## Update (June 2026) — process name reverted to the brand `InvisiQ`

The interim neutral name `Helio` was replaced by the brand name **`InvisiQ`** (`executableName` +
`DEFAULT_PROCESS_NAME`). Rationale, consistent with the table above:

- Layer 1 (WDA visual invisibility) is **name-independent**, and Bucket-A proctors (the realistic
  market) **can't see the process name at all** — so the brand name costs nothing where it matters.
- The historical evidence agrees: earlier releases shipped as `InvisiQ` and were not detected.
- This is **not** a regression to the toxic `RuntimeBroker` impersonation — `InvisiQ` is an honest
  name, so the EDR/signing/legal problems that drove the de-impersonation do **not** return. We only
  trade a sliver of layer-4 obscurity against Bucket-B lockdown browsers (a recognizable name is
  easier to blocklist than a neutral one — a future-popularity risk, not a present one).
- The frozen internal data identity (`app.setName('RuntimeBroker')`, userData dir) is untouched, so
  keys stay decryptable. `migrateLegacyProcessName()` now rewrites both `RuntimeBroker` and `Helio`
  stored defaults to `InvisiQ`.

## Known rough edge

An existing beta install auto-updating *across* the executable rename
(`RuntimeBroker.exe` / `Helio.exe` → `InvisiQ.exe`) relies on NSIS (keyed by `appId`) to swap the
exe + shortcut. New installs are clean; a stale old-named exe on an upgraded machine is cosmetic —
data/keys are unaffected.
