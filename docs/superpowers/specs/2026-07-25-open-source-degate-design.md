# Open-Source De-Gate: Re-add Ollama, Remove Supabase Auth/Trial/Analytics

**Status:** Approved, ready for implementation plan
**Date:** 2026-07-25
**Author:** Ayushmaan Naruka (with Claude Code)

## Context

InvisiQ was built as a gated beta: Google sign-in, a server-clocked 14-day trial
(fail-closed), full prompt-capture analytics, a T&C gate, and a remote
kill-switch/version-floor (see `docs/InvisiQ-Beta-Launch-Plan.md`, CLAUDE.md
"Beta Launch" section). As part of that beta track, the local-LLM (Ollama)
provider was removed permanently in favor of cloud-only BYOK (five providers:
OpenAI, Anthropic, Gemini, Groq, OpenRouter).

The user now wants to open-source the project so anyone can clone and run it.
That requires two architectural reversals:

1. **Re-add the Ollama local-LLM provider** — a fully-working implementation
   already exists in a local, pre-beta copy of the repo at
   `D:\Projects\ghostai - Copy` and can be restored largely as-is.
2. **Remove the entire Supabase-backed gating stack** — auth, trial
   entitlement, analytics/prompt-capture, T&C gate, and the remote
   kill-switch/version-floor — so the app runs standalone with no backend
   dependency, matching an open-source distribution model.

**Explicitly out of scope for this work:** purging secrets from git history
(Supabase URL/anon key, `APP_SALT`, `FRAGMENT_SECRET`), rotating any secrets,
and actually flipping the GitHub repo to public. The user will handle those
separately once the code changes here have landed.

**Decisions locked in during brainstorming:**
- Full rip-out of the gating stack (not partial / not keep-analytics).
- Auto-update via `electron-updater` + GitHub Releases is kept, but with no
  kill-switch / version-floor gate — just ordinary "update available" UX.
- Crypto collapses to a single machine-only key scheme (drop the v2
  entitlement-bound key). No migration path is needed — existing users'
  v2-encrypted API keys become undecryptable and must be re-entered once;
  this is an accepted one-time cost, not a bug.

## Architecture: before → after

**Before:** `App.tsx` boot gate = Login (Google OAuth) → T&C gate →
entitlement check (server-clocked trial, fail-closed offline) →
forced-update/kill-switch check → main UI. AI = 5 cloud BYOK providers only.

**After:** `App.tsx` boots straight to onboarding/main UI. No network
dependency except the AI providers themselves and (optionally) GitHub for
update checks. AI = 5 cloud BYOK providers **+ Ollama** (local, free, no key).

## Part 1 — Ollama re-integration

Restore from `D:\Projects\ghostai - Copy`, adapted onto the current codebase
(which has since gained Groq/OpenRouter — additive, not a straight file
overwrite):

- `src/renderer/services/ai-providers/ollama.ts` — restore as-is. Bespoke
  provider (not `OpenAICompatibleProvider`-based, since Ollama's native API
  differs meaningfully): native `/api/chat` streaming, `<think>...</think>`
  tag handling for reasoning models (DeepSeek-R1, QwQ) so the renderer can
  show/strip chain-of-thought, vision-keyword-based model detection
  (llava/vision/bakllava/moondream/llama-vision/minicpm-v), `keep_alive: 30m`
  to avoid cold-load between turns, tuned `num_ctx`/`num_predict`/temperature
  defaults for small-VRAM hardware.
- Wiring points (all small):
  - `src/renderer/services/ai-providers/index.ts` — eager-register
    `OllamaProvider` (no SDK dependency, unlike the lazy-loaded cloud
    providers).
  - `src/renderer/services/ai-providers/provider-manager.ts` — dynamic
    provider lookup path (already has a comment stub for this).
  - `src/shared/types.ts` — add `'ollama'` back to the `ProviderID` union and
    `ProviderConfig` map.
  - `src/shared/constants.ts` — default `ProviderConfig` entry for ollama.
- UI:
  - `Settings.tsx` — restore the `isServerUrl` provider variant: Ollama's
    "key" field is actually a server URL (default
    `http://localhost:11434`), unmasked (not a secret), with "Test
    Connection" in place of key validation.
  - `ModelSelector.tsx` — restore the "LOCAL" model grouping/label.
  - Onboarding wizard (`OnboardingApiKey.tsx`) stays cloud-key-only, matching
    the old app's actual behavior — Ollama setup lives in Settings only, not
    the first-run wizard.
- `useAI.ts` — restore the local-model-aware context budget logic
  (`MAX_OCR_CHARS` cap, smaller-context-window-aware truncation instead of
  naive FIFO) so long OCR/meeting-transcript prefixes don't blow a 4k/8k
  local context window. This logic should only engage when the active model
  is an Ollama model — cloud providers keep their existing (larger) budget
  logic unchanged.

## Part 2 — Removing the Supabase gating stack

**Delete entirely:**
- `src/main/auth.ts`, `src/main/entitlement.ts`, `src/main/analytics.ts`
- `src/renderer/components/LoginScreen.tsx`, `LockScreen.tsx`, `TosGate.tsx`,
  `ForcedUpdate.tsx`, `TrialBanner.tsx`
- `src/renderer/hooks/useAuth.ts`, `useEntitlement.ts`

**Modify:**
- `src/renderer/App.tsx` — drop all four gate checks (login, T&C, entitlement,
  forced-update/kill-switch); boot directly to the main UI. Settings loses
  the `account` tab (email display / logout button).
- `src/main/ipc-handlers.ts` — remove the `auth:*`, `entitlement:*`,
  `analytics:*`, `tos:*` handler registrations and their imports from
  `auth.ts`/`entitlement.ts`/`analytics.ts`.
- `src/preload/index.ts` — remove `ghostAPI.auth`, `.entitlement`,
  `.analytics`, `.tos`, and the `auth:changed`/`entitlement:changed` renderer
  event channels.
- `src/main/updater.ts` — remove the kill-switch/version-floor fetch against
  `${SUPABASE_URL}/rest/v1/app_config` (the code path that sets
  `reason: 'killed'` / `'below-floor'`). Keep plain `electron-updater`
  GitHub-Releases checking. `src/renderer/hooks/useUpdateGate.ts` simplifies
  to a plain "update available yes/no" hook with no blocking gate.
- `src/main/store.ts` — remove the `auth` field from `StoreSchema` and its
  `getAuthSession`/`setAuthSession`/`clearAuthSession`-style accessors.
- `src/shared/constants.ts` — remove `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `CURRENT_TOS_VERSION`, and any analytics-event-name constants.
- `src/main/crypto.ts` — delete the entitled-key (v2) path entirely:
  `getEntitledKey`, `setServerFragment`, `hasServerFragment`,
  `ENTITLED_PAYLOAD_VERSION`. `encryptApiKey`/`decryptApiKey` collapse to
  always use `getMachineKey()`. A stored payload with `v: 2` will fail to
  decrypt post-change — this must surface through the existing
  invalid/missing-key UI path (prompt re-entry), not throw an unhandled
  error.
- `package.json` — remove the Supabase client dependency if one is present
  (e.g. `@supabase/supabase-js`), and any auth-related deps (Google OAuth
  helper libs) that have no other use.
- `src/shared/types.ts` — remove `AuthStatus`, `EntitlementStatus`,
  `VersionGateStatus` types (or whatever the exact names are) that no longer
  have a producer.

## Part 3 — Documentation

- `CLAUDE.md` — substantial rewrite, not just an addendum:
  - Remove the "Beta Launch — Auth, Trial, Analytics & Kill-Switch" section.
  - Remove/supersede the "cloud-only, BYOK; the local-LLM/Ollama path was
    removed permanently" claims in the Project Identity / What This Project
    Does / §4 AI Provider Abstraction sections — add a superseding note in
    the same style as the existing de-impersonation section (explain what
    changed and why, don't just silently delete history).
  - Add Ollama back to the tech stack table, provider table, IPC channel
    list, dependencies list.
  - Update "Development Phases" — note the beta-gating features (Phase 5)
    were removed for the open-source release; this is a historical record,
    not something to delete.
- `docs/InvisiQ-Beta-Launch-Plan.md` — add a superseded/historical status
  banner, same pattern as `InvisiQ-PRD.md`/`InvisiQ-Wireframes.md` already
  carry.
- `README.md` (or root docs) — open-source framing pass: install Ollama, pull
  a model, point InvisiQ at it; no sign-in required; BYOK cloud keys are
  optional, not mandatory.

## Verification

1. `npm run typecheck` — clean.
2. Manual: fresh app boot with no network reachable → app opens straight to
   UI (no login/lock/T&C screen anywhere).
3. Manual: add an Ollama server URL in Settings against a local
   `ollama serve` + at least one pulled model (one text model, one vision
   model e.g. `llava`) → model list populates, chat works, vision (screenshot
   attach) works, reasoning-model `<think>` blocks render/strip correctly.
4. Manual: existing cloud providers (OpenAI/Anthropic/Gemini/Groq/OpenRouter)
   still validate and chat correctly — unaffected by the crypto/entitlement
   changes except that a previously-saved key encrypted under the old v2
   scheme now correctly prompts for re-entry instead of crashing.
5. Manual: auto-update still checks GitHub Releases and shows the normal
   "update available" toast with no forced/blocking gate.
6. Grep sweep: no remaining references to `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
   `auth:`, `entitlement:`, `analytics:`, `tos:` IPC channels anywhere in
   `src/`.
