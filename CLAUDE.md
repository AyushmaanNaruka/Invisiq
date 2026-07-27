# CLAUDE.md — InvisiQ Development Context

> This file is the single source of truth for Claude Code when working on InvisiQ.
> Read this FIRST before making any changes to the codebase.

---

## Project Identity

- **Name:** InvisiQ
- **Tagline:** Your AI copilot that sees everything, but is seen by no one.
- **Type:** Invisible AI desktop overlay assistant
- **Author:** Ayushmaan Singh Naruka
- **License:** Personal Use / MIT

### Brand vs. disguise (the DE-IMPERSONATED split)

"InvisiQ" is the **user-facing brand** — use it in UI, docs, system prompts, and any text a user sees. The **process image name is now also `InvisiQ`** (June 2026 brand-trust decision, superseding the interim neutral `Helio`). This is SAFE: visual invisibility (`WDA_EXCLUDEFROMCAPTURE`) is **name-independent**, and the realistic market (Bucket A — Zoom/Teams/Meet/Proctorio/Honorlock) **cannot enumerate processes**, so the brand name costs nothing there; the only trade-off is that a recognizable name is easier for Bucket-B desktop lockdown browsers (Mettl/Respondus/SEB) to add to a process-name blocklist (a future-popularity risk, not a present one). Crucially, `InvisiQ` is **honest** — it does NOT reintroduce the toxic `RuntimeBroker` + `Microsoft.Windows.RuntimeBroker` + `author: "Microsoft Corporation"` impersonation that was removed (that impersonation was an EDR/AV red flag — CrowdStrike Falcon terminated it at runtime — and a code-signing / legal blocker). Rationale + the Bucket A vs B decision tree is in `docs/InvisiQ-Stealth-Commercialization.md`. The split:

- **User-facing (productName: InvisiQ):** installer heading ("InvisiQ Setup"), installer filename, Start Menu + search label, uninstaller / Installed Apps entry. `electron-builder.yml` → `productName: InvisiQ`, `copyright/legalTrademarks/author: InvisiQ`.
- **Process image name (the .exe proctoring enumerates) — the brand name `InvisiQ`, honest (no impersonation):**
  - `electron-builder.yml` → `executableName: InvisiQ`. **Single source of truth: `DEFAULT_PROCESS_NAME` in `src/shared/constants.ts`** (YAML can't import it — keep the two in sync; changing the string is a 1-line edit in both). The runtime `process.title` comes from the `privacy.processName` setting (default `InvisiQ`); a one-time migration in `store.ts` (`migrateLegacyProcessName`) rewrites the legacy `RuntimeBroker` and `Helio` defaults to it.
  - `src/main/stealth.ts` → `app.setAppUserModelId(APP_USER_MODEL_ID)` where `APP_USER_MODEL_ID = 'com.ghostai.app'` (honest — matches `appId`). NOT a Microsoft AUMID.
  - `electron-builder.yml` → `appId: com.ghostai.app` (stable updater/NSIS upgrade identity)
- **Frozen INTERNAL data identity (NOT user-visible, NOT proctoring-scanned — do NOT change):**
  - `src/main/stealth.ts` → `app.setName('RuntimeBroker')` (`DATA_DIR_IDENTITY`) + `package.json` `name: runtimebroker` + `src/main/store.ts` `RuntimeBroker` data dir / `runtime-broker-config.json` + the legacy `ghostai` migration path. This only pins the `%APPDATA%` folder holding the encrypted keys/login. **userData derives from `app.setName`/`package.json name`, NOT from `productName`/`executableName`** — so the de-impersonation rename needed NO data migration and existing users' keys stay decryptable. A folder name is invisible to proctoring/EDR.
  - **Known one-time rough edge:** an existing beta install auto-updating *across* the executable rename (`RuntimeBroker.exe` / `Helio.exe` → `InvisiQ.exe`) relies on NSIS (keyed by `appId`) to swap the exe + shortcut. New installs are clean; a stale old-named exe on an upgraded machine is cosmetic (data/keys unaffected).

Two more **stable identifiers** that look like the brand but must not be renamed:
- `src/main/crypto.ts` → `APP_SALT = 'ghostai-v1-...'` — renaming this makes every saved API key undecryptable.
- `electron-builder.yml` → `publish.repo: GhostAI` — the GitHub repo the auto-updater pulls releases from; only change it if the GitHub repo itself is renamed.

---

## What This Project Does

InvisiQ is an Electron desktop app that creates an **invisible overlay window** on top of all other applications. The overlay:

1. Is **completely invisible** to all screen capture, screen sharing, and recording software (Zoom, Teams, Meet, OBS, Snipping Tool, proctoring tools)
2. Captures the user's screen content via screenshots
3. Sends screenshots + questions to cloud AI vision models (OpenAI, Anthropic, Google, Groq, OpenRouter) **or a local Ollama server** — BYOK for cloud providers, no key needed for Ollama
4. Displays AI responses in a chat interface with markdown + code highlighting
5. All controlled via global keyboard shortcuts that work from any application

The core mechanism is Windows' `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` API, exposed in Electron as `win.setContentProtection(true)`.

**Single universal mode.** There is no user-facing mode picker or template library. InvisiQ uses ONE intent-adaptive system prompt (`UNIVERSAL_MODE` in `src/shared/constants.ts`); the model infers what's needed (answer-first for questions, algorithm-first for code, talking points for meetings) from the message + screenshot. See §1d.

**Beta is gated & monetized.** The shipping beta requires Google sign-in, enforces a server-clocked 14-day trial (fail-closed), captures analytics + prompts (disclosed via a T&C gate), and honors a remote kill-switch + minimum-version floor. See "Beta Launch — Auth, Trial, Analytics & Kill-Switch" below. This is Act 1 of a two-act plan (BYOK beta → own AI backend); see `docs/InvisiQ-Beta-Launch-Plan.md`.

---

## Documentation Reference

All project documentation lives in the `/docs` directory. **Read the relevant doc before working on any feature:**

| Document | Purpose | Read When |
|---|---|---|
| `docs/InvisiQ-PRD.md` | Full product requirements, use cases, functional specs, roadmap | Starting any new feature; understanding requirements |
| `docs/InvisiQ-Wireframes.md` | UI mockups, design system, component hierarchy, animations | Working on any UI component |
| `docs/InvisiQ-API-Contract.md` | IPC channels, AI provider interfaces, data models, types | Working on IPC, AI integration, or data layer |
| `docs/InvisiQ-Planning.md` | Market research, architecture decisions, Claude Code commands | Understanding why decisions were made |
| `docs/InvisiQ-Beta-Launch-Plan.md` | Two-act monetization plan, Supabase backend, trial/auth/analytics/kill-switch design | Working on backend, auth, entitlement, or telemetry |
| `docs/RELEASE.md` | Build, sign, and publish the auto-update (NSIS) release | Cutting a release |
| `docs/TESTING.md` | Stealth matrix, benchmarks, manual checklists | Verifying stealth or pre-release QA |

> **Note:** `InvisiQ-PRD.md`, `InvisiQ-Wireframes.md`, `InvisiQ-Planning.md`, and the root `documentation.md` are **historical design specs** (frozen ~June 3, 2026). They carry a status banner and predate the single-mode collapse, Ollama removal, and the beta-launch track. Trust this file (CLAUDE.md) and the API contract for current behavior.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Runtime | Electron | 33+ |
| Frontend | React | 18 |
| Language | TypeScript | 5.x (strict mode) |
| Styling | TailwindCSS | 3.x |
| AI (OpenAI) | openai | latest |
| AI (Anthropic) | @anthropic-ai/sdk | latest |
| AI (Google) | @google/generative-ai | latest |
| OCR | tesseract.js | 5.x |
| Backend (Beta) | Supabase (Postgres + Edge Functions) | — |
| Auth (Beta) | Google OAuth (via Supabase) | — |
| Storage | electron-store | latest (with encryption) |
| Auto-Update | electron-updater (NSIS feed) | latest |
| Markdown | react-markdown + rehype-highlight | latest |
| Code Highlight | highlight.js | latest |
| Bundler | Vite | 5.x |
| Packaging | electron-builder | latest |

---

## Project Structure

```
ghostai/
├── CLAUDE.md                        ← YOU ARE HERE (single source of truth)
├── package.json                     # name: runtimebroker (disguise — do not "fix")
├── electron-builder.yml
├── tsconfig.json / tsconfig.node.json / tsconfig.web.json
├── vite.config.ts / tailwind.config.ts / postcss.config.js
│
├── docs/                             # See "Documentation Reference" above
│   ├── InvisiQ-API-Contract.md       # IPC + provider contract (kept current)
│   ├── InvisiQ-Beta-Launch-Plan.md   # Two-act monetization + backend design
│   ├── RELEASE.md                    # Release/publish runbook
│   ├── TESTING.md                    # Stealth matrix + QA checklists
│   ├── TUTORIAL.md                   # End-user usage guide
│   ├── InvisiQ-PRD.md                # ⚠ historical design spec
│   ├── InvisiQ-Wireframes.md         # ⚠ historical design spec
│   └── InvisiQ-Planning.md           # ⚠ historical design spec
│
├── src/
│   ├── main/                         # Electron Main Process (Node.js)
│   │   ├── index.ts                  # App entry, lifecycle, window creation, stealth default-on
│   │   ├── overlay.ts                # BrowserWindow config, content protection, stealth-focus
│   │   ├── hotkeys.ts                # globalShortcut registration
│   │   ├── screenshot.ts             # desktopCapturer: full / silent / region / per-monitor / snip+crop
│   │   ├── region-selector.ts        # Temporary full-screen selection window
│   │   ├── stealth.ts                # Process disguise, stealth watchdog, alt-tab hiding
│   │   ├── invisible-input.ts        # Legacy WH_KEYBOARD_LL hook (uiohook-napi) — capture fallback tier
│   │   ├── capture-controller.ts     # Model B capture session: epoch, heartbeat, degradation ladder
│   │   ├── resilience-controller.ts  # Spawns + pipes to ghostai_helper.exe (named pipe, JSON)
│   │   ├── crypto.ts                 # AES-256-GCM; v1 machine key + v2 entitlement-bound key
│   │   ├── store.ts                  # electron-store with encryption + schema backfill
│   │   ├── ipc-handlers.ts           # All ipcMain.handle() registrations
│   │   ├── conversations.ts          # Filesystem-based conversation CRUD
│   │   ├── clipboard.ts              # Smart paste via PowerShell SendKeys
│   │   ├── clipboard-monitor.ts      # Clipboard polling monitor
│   │   ├── monitors.ts               # Multi-monitor detection + management
│   │   ├── audio-capture.ts          # System-audio loopback (electron-audio-loopback / WASAPI)
│   │   ├── companion-server.ts       # HTTP + WebSocket companion server (QR pairing)
│   │   ├── memory.ts                 # TF-IDF MemoryStore (local RAG)
│   │   ├── export-service.ts         # Conversation export: JSON / MD / TXT / PDF
│   │   ├── updater.ts                # electron-updater (NSIS feed) + version-gate
│   │   ├── tray.ts                   # Optional system tray icon (default off)
│   │   ├── auth.ts                   # Beta: Google OAuth via Supabase
│   │   ├── entitlement.ts            # Beta: server-clocked 14-day trial (fail-closed)
│   │   └── analytics.ts              # Beta: event + prompt capture (T&C-gated, server-redacted)
│   │
│   ├── preload/
│   │   └── index.ts                  # contextBridge — exposes ghostAPI to renderer
│   │
│   ├── renderer/                     # React Frontend
│   │   ├── index.html / main.tsx / App.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── HeaderBar.tsx         # Drag handle, MODEL selector, settings (NO mode picker, NO click-through)
│   │   │   ├── ChatPanel.tsx / MessageBubble.tsx / CodeBlock.tsx
│   │   │   ├── InputArea.tsx         # Text input, send/stop, screenshot, mic, capture-aware editor
│   │   │   ├── StatusBar.tsx / OpacityControl.tsx / ModelSelector.tsx / Toast.tsx
│   │   │   ├── ConversationHistory.tsx / TranscriptPanel.tsx
│   │   │   ├── InlineRegionSelector.tsx  # Canvas-based in-overlay snipping
│   │   │   ├── MeetingPanel.tsx / MemoryPanel.tsx / CodeDetectionCard.tsx
│   │   │   ├── Settings.tsx          # Slide-in panel, 8-section icon sidebar
│   │   │   ├── SettingsHotkeys / SettingsDisplay / SettingsPrivacy / SettingsAudio
│   │   │   ├── SettingsMemory / SettingsCompanion / SettingsResilience
│   │   │   ├── OnboardingFlow / OnboardingApiKey / OnboardingHotkeys / OnboardingStealthTest
│   │   │   ├── LoginScreen.tsx / LockScreen.tsx        # Beta: auth + trial-locked gates
│   │   │   ├── TosGate.tsx / TrialBanner.tsx           # Beta: T&C gate + trial countdown
│   │   │   ├── ForcedUpdate.tsx / UpdateNotification.tsx
│   │   │   └── ui/                   # GhostButton/Input/Card/Tooltip/Badge/Divider + animations
│   │   │           # REMOVED: ModeSelector, CustomModeEditor, TemplateLibrary (single-mode collapse)
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAI.ts / useScreenshot.ts / useSettings.ts / useHotkeys.ts
│   │   │   ├── useConversation.ts / useConversationHistory.ts
│   │   │   ├── useAudioTranscription.ts / useLiveTranscription.ts / useMeetingAssistant.ts
│   │   │   ├── useCodeDetection.ts / useMemory.ts
│   │   │   ├── useTokenCost.ts / useWindowSize.ts / useInternalKeyboard.ts (Ctrl+, / Ctrl+K / Ctrl+L)
│   │   │   ├── useCapture.ts         # Model B stealth typing: capture state + key events (seq/epoch)
│   │   │   └── useAuth.ts / useEntitlement.ts / useUpdateGate.ts   # Beta gates
│   │   │           # REMOVED: useTemplates (single-mode collapse)
│   │   │
│   │   ├── services/
│   │   │   ├── ai-providers/
│   │   │   │   ├── types.ts / provider-manager.ts / index.ts
│   │   │   │   ├── openai-compatible.ts  # shared base (chat/stream/vision) for OpenAI-wire providers
│   │   │   │   ├── openai.ts / groq.ts / openrouter.ts  # thin subclasses of openai-compatible (config only)
│   │   │   │   ├── anthropic.ts / gemini.ts / ollama.ts     # all lazy-loaded (ollama: bespoke, no SDK)
│   │   │   └── speech.ts             # SpeechService: Web Speech + Whisper (OCR is tesseract.js, used in hooks)
│   │   │
│   │   ├── styles/globals.css
│   │   └── types/global.d.ts         # Window.ghostAPI + SpeechRecognition types
│   │
│   └── shared/                       # Types shared between main + renderer
│       ├── types.ts                  # AppSettings, ChatMessage, Mode, Auth/Entitlement/VersionGate, capture types
│       ├── constants.ts              # Default hotkeys, UNIVERSAL_MODE, models, Supabase config, IPC whitelist
│       ├── errors.ts                 # InvisiQError enum + helpers
│       └── logger.ts                 # Production-safe logger
│
├── assets/icons/                     # App icons
│
├── native/ghostai-helper/            # Standalone Win32 C++ helper (Model B suppressing hook, out-of-process)
│   ├── CMakeLists.txt / src/main.cpp / res/app.manifest / res/version.rc.in
│   └── dist/ghostai_helper.exe       # Build output → electron-builder extraResources
│
├── scripts/                          # build.js, verify-build.ts, test helpers
└── CHANGELOG.md
```

---

## Critical Architecture Rules

### 1. The Most Important Line of Code

```typescript
// In src/main/overlay.ts — THIS MAKES THE APP INVISIBLE
overlayWindow.setContentProtection(true);
```

**Never remove or conditionally disable this.** Without it, the app is visible to screen capture. Every BrowserWindow we create (overlay, region selector, etc.) MUST have this set.

#### The Second Detection Vector — Foreground Window

`setContentProtection(true)` defeats *visual* capture (Snipping Tool, OBS, Zoom share). It does NOT defeat **foreground-window monitoring**. Proctoring tools like Mettl Secure Browser (`MsbWindowCef`) hook `SetWinEventHook(EVENT_SYSTEM_FOREGROUND)` and/or poll `GetForegroundWindow()`. Anything that activates the InvisiQ HWND — including a single mouse click on the overlay — fires `WM_ACTIVATE`/`EVENT_SYSTEM_FOREGROUND` and triggers their "Navigated Away" alert.

The fix is in `src/main/overlay.ts → setStealthFocusMode(true)`:

```typescript
overlayWindow.setFocusable(false); // → applies WS_EX_NOACTIVATE on the HWND
```

A `WS_EX_NOACTIVATE` window cannot become the foreground window — even when clicked. **Do not remove or revert this** while stealth mode is on. The trade-off is that the window can no longer receive `WM_KEYDOWN` (Windows routes keys to the foreground thread), so free-form typing is delivered through the **Model B capture pipeline** (§1c), with the legacy InvisibleInput hook (§1b) as a fallback tier.

### 1b. Invisible Input — legacy uiohook fallback tier

`src/main/invisible-input.ts` installs a `WH_KEYBOARD_LL` hook via `uiohook-napi` and forwards keystrokes to the renderer (`invisible-input:char|backspace|delete|enter`, `invisible-input:status`). **This is no longer the primary path** — it's tier 2 of the degradation ladder (§1c), used only when the native helper is unavailable.

**Known limitation:** `uiohook-napi` 1.5.5 has no per-event suppression on Windows → on this tier captured keys also reach the foreground app, so the renderer shows a "click an inert area first" warning when it degrades to uiohook. The primary helper tier (§1c) does NOT have this problem (it suppresses).

### 1c. Model B — default-on stealth + suppressing capture (the current design)

Stealth focus is **on by default** (fail-safe: protected from launch; proctor detection is only a confirmation indicator, never the trigger). Gated by `settings.stealth.defaultOn`, applied in `src/main/index.ts` via `setStealthFocusMode(true)`.

Typing flows through three pieces:

1. **`native/ghostai-helper/` → `ghostai_helper.exe`** — a standalone Win32 C++ helper (NOT a node addon — keeps `npmRebuild:false`) that hosts the SUPPRESSING `WH_KEYBOARD_LL` hook out-of-process. It is the named-pipe server; `resilience-controller.ts` is the client. Critical invariants baked into `src/main.cpp` (do not break):
   - **Non-blocking hook callback** (translate + enqueue + `return 1`); a separate pump thread does all pipe writes. Blocking the callback past `LowLevelHooksTimeout` makes Windows silently uninstall the hook → keys leak.
   - **`ToUnicodeEx` with `wFlags=0x4`** (non-destructive) + self-managed modifier/dead-key state → never corrupts the foreground app's dead-key composition.
   - **Selective suppression** — passes through Ctrl/Win chords + Escape so global hotkeys and the panic key still fire.
   - **Parent-death watchdog** (`WaitForSingleObject` on parent PID → self-exit) so a crashed main never leaves an orphaned hook freezing the keyboard.
   - **WTS session-lock** → force-exit capture (LL hooks get nothing on the secure desktop).
   - Pipe hardened with a **user-SID-only DACL** + `PIPE_REJECT_REMOTE_CLIENTS`; randomized pipe name per launch. **Zero disk writes, zero network, no captured chars in stdout.**
   - The hook is installed **only during active capture** — idle helper carries no keylogger signature.
2. **`src/main/capture-controller.ts`** — owns the capture session: `enterCapture()`/`exitCapture()` with a monotonic **epoch**, relays `key` events to the renderer over `capture:key`, runs a `ping`/`pong` heartbeat, and drives the **degradation ladder** on failure: helper → uiohook → clipboard (never a silently-dead textarea). Emits `capture:failed` so the renderer can react.
3. **`src/renderer/hooks/useCapture.ts` + `InputArea.tsx`** — a cursor-aware input model (`{value, caret}`) driven by `capture:key` (with seq/epoch ordering; stale events dropped). Click the textarea or `Ctrl+Shift+I` to enter capture; a glowing border + caret indicate it's live. Never calls window-level `.focus()`.

Build: `npm run build:helper` (MSVC via CMake, g++ fallback) → `native/ghostai-helper/dist/ghostai_helper.exe`, packed via electron-builder `extraResources`. Signing is wired but cert-deferred; version-info publisher is parametrized (see `native/ghostai-helper/README.md` for the disguise-vs-honest-cert decision).

When adding control keys, extend the helper's `LowLevelKeyboardProc` (`navEditKind`/translation), the `CaptureKeyKind` union in `src/shared/types.ts`, and the renderer's `applyCaptureKey` reducer in `InputArea.tsx`.

### 1d. Single Universal Mode (no mode picker, no templates)

InvisiQ has exactly **one** mode. There is no user-facing mode dropdown and no template library — that friction was removed in favor of the ChatGPT/Claude-style single input. The model infers intent from the message + screenshot.

- The one prompt lives in `UNIVERSAL_SYSTEM_PROMPT` / `UNIVERSAL_MODE` in `src/shared/constants.ts`. `BUILT_IN_MODES = [UNIVERSAL_MODE]` is kept so metadata/analytics call sites stay valid.
- **Tune behavior by editing that string — it is config, not architecture.** It is injected at a single point in `App.tsx` `handleSend` (`systemPrompt: UNIVERSAL_MODE.systemPrompt`).
- Meeting-transcript auto-context is gated on `settings.audio.autoIncludeTranscript` (NOT a "meeting" mode, which no longer exists); the meeting panel auto-opens on `settings.meeting.enableSystemAudio`.
- **Removed:** `ModeSelector`, `CustomModeEditor`, `TemplateLibrary`, `useTemplates`, `template-store.ts`, `built-in-templates.ts`, the `modes:*` and `template:*` IPC, the `Ctrl+T` shortcut, and the `CustomMode`/`PromptTemplate` types + `customModes`/`templates` settings fields. The `activeMode` field is retained (always `'universal'`) for conversation/analytics metadata.
- **Do NOT re-introduce a mode picker.** The intended next step for "specialization" is an admin/org-level standardized prompt pushed to a fleet — built on this same single injection point — not user-pickable modes.

### 2. Electron Security Model

```
MAIN PROCESS (Node.js)          RENDERER PROCESS (Browser)
├── Full system access           ├── No Node.js access
├── File system, OS APIs         ├── No require(), no fs
├── electron-store               ├── Only window.ghostAPI
├── desktopCapturer              ├── React + TypeScript
├── globalShortcut               └── Communicates via IPC only
└── Spawns BrowserWindow

         PRELOAD SCRIPT
         ├── contextBridge
         └── Exposes safe API subset
```

**Rules:**
- `contextIsolation: true` — ALWAYS
- `nodeIntegration: false` — ALWAYS
- All renderer ↔ main communication goes through `ipcRenderer.invoke()` / `ipcMain.handle()`
- The preload script (`src/preload/index.ts`) is the ONLY bridge
- Validate ALL arguments in ipcMain handlers

### 3. Screenshot Capture Sequence

The overlay must be hidden before capturing, otherwise we get a blank spot where our window is:

```
1. win.hide()           // Hide our overlay
2. await sleep(100)     // Wait for DWM to recompose
3. desktopCapturer.getSources()  // Capture
4. win.show()           // Restore overlay
5. Return base64 image via IPC
```

**Never skip the 100ms delay.** DWM needs time to recompose after hiding a window.

### 4. AI Provider Abstraction

**Six providers ship:** OpenAI, Anthropic, Google Gemini, **Groq**, **OpenRouter** (one key → DeepSeek/Qwen/Mistral), and **Ollama** (local server, re-added for the open-source release — see `src/renderer/services/ai-providers/ollama.ts`). Ollama has no API key; its "key" field (`Settings.tsx`, `isServerUrl: true`) is a server URL defaulting to `http://localhost:11434`, and its model list is fetched dynamically from the running server rather than a static catalog. `useAI.ts` applies Ollama-only context-budget and OCR-based vision-workaround logic (small-context-window truncation, screenshot OCR via `tesseract.js` since local vision models tend to describe images rather than read their text) — entirely gated on `provider.id === 'ollama'`, so cloud providers are unaffected. AI calls run in the **renderer** (HTTP), never the main process.

**OpenAI-compatible base (Groq/OpenRouter/OpenAI):** Groq (`https://api.groq.com/openai/v1`) and OpenRouter (`https://openrouter.ai/api/v1`) speak the same wire format as OpenAI, so all three extend `OpenAICompatibleProvider` (`openai-compatible.ts`) and only supply config (`baseURL`, `defaultHeaders`, `models`, `validationModel`). OpenRouter sends `HTTP-Referer`/`X-Title` attribution headers. **Two non-obvious invariants:** (1) every new provider's domain MUST be added to `AI_API_DOMAINS` in `constants.ts` or the main-process CORS bypass blocks it; (2) **`ModelConfig.id` must be globally unique across providers** — routing resolves provider purely via `providerManager.getModelById` (first match in `ALL_MODELS`), so the *same* model slug cannot be listed under two providers (that's why `qwen/qwen3.6-27b` lives only under Groq). To expose one model via multiple providers you'd need a separate `apiModel` field decoupling internal-id from wire-slug. Live key test: `node scripts/test-openai-compatible.js <groq|openrouter> <KEY>`.

All AI providers implement the same interface (see `src/renderer/services/ai-providers/types.ts`):

```typescript
interface AIProvider {
  readonly name: string;
  readonly id: ProviderID;
  readonly models: ModelConfig[];
  initialize(apiKey: string): void;
  validateKey(): Promise<ValidationResult>;
  chat(request: ChatRequest): AsyncGenerator<StreamChunk, ChatResponse>;
  abort(): void;
}
```

**When adding a new provider:**
1. Create `src/renderer/services/ai-providers/{provider}.ts`
2. Implement the `AIProvider` interface
3. Register in `provider-manager.ts`
4. Add model configs with pricing info
5. Handle streaming SSE parsing specific to that provider

### 5. IPC Channel Naming

All IPC channels follow this pattern: `{domain}:{action}`

Invoke channels (`ipcRenderer.invoke` → `ipcMain.handle`):
```
# Beta gating
auth:login            auth:logout           auth:status
entitlement:status    entitlement:refresh
analytics:track       analytics:capture-prompt   analytics:delete-my-data
tos:accept            tos:status
# Overlay / window
overlay:toggle  overlay:hide  overlay:show  overlay:set-opacity
overlay:set-position  overlay:set-size  overlay:get-bounds
overlay:set-stealth-focus  overlay:stealth-focus-status
overlay:request-focus  overlay:release-focus
# Screenshot / monitors
screenshot:capture-full  screenshot:capture-silent  screenshot:capture-region
screenshot:capture-monitors  screenshot:capture-for-snip  screenshot:crop-region
monitors:get-all  monitors:move-overlay
# Store / hotkeys / clipboard / app
store:get  store:set  store:get-all  store:set-api-key  store:remove-api-key
store:get-api-key  store:clear-all
hotkeys:register-all  hotkeys:update
clipboard:copy  clipboard:read  clipboard:smart-paste
clipboard:start-monitor  clipboard:stop-monitor  clipboard:monitor-status
app:get-info  app:quit  app:open-data-folder
# Conversation / export / memory
conversation:save  conversation:load  conversation:list  conversation:delete
conversation:search  conversation:export  conversation:delete-all
export:conversation  export:save-dialog
memory:search  memory:add  memory:delete  memory:list  memory:clear-all  memory:stats  memory:extract
# Update / audio / companion / resilience
update:check  update:download  update:install  update:version-status  update:open-releases
audio:start-system-capture  audio:stop-system-capture  audio:capture-status
companion:start  companion:stop  companion:status  companion:devices
resilience:start-agent  resilience:stop-agent  resilience:send-command  resilience:status
# Stealth capture
invisible-input:arm  invisible-input:disarm  invisible-input:toggle  invisible-input:status
capture:enter  capture:exit  capture:status  capture:panic  capture:proctor-status  capture:paste
```
> **Removed:** `modes:*` and `template:*` (single-mode collapse).

Renderer event channels (main → renderer):
```
hotkeys:triggered     overlay:visibility-changed
screenshot:captured   app:error             clipboard:changed
monitors:changed
update:checking  update:available  update:not-available  update:progress  update:downloaded  update:error
audio:chunk
companion:message  companion:device-connected  companion:device-disconnected
resilience:agent-status-changed  resilience:agent-response
overlay:stealth-focus-changed  overlay:clipboard-input-requested
invisible-input:status  invisible-input:char  invisible-input:enter
invisible-input:backspace  invisible-input:delete
capture:key  capture:state  capture:failed  proctor:detected
```

Full IPC contract is in `docs/InvisiQ-API-Contract.md`.

---

## Coding Standards

### TypeScript

- **Strict mode** — `"strict": true` in tsconfig
- **No `any`** unless absolutely necessary (and add a comment explaining why)
- **Explicit return types** on all exported functions
- **Interface over type** for object shapes (use `type` for unions/intersections)
- **Enum for error codes**, string literals for small unions
- **Async/await** over raw Promises
- **AsyncGenerator** for streaming responses

### React

- **Functional components only** — no class components
- **Custom hooks** for all logic — components should be thin UI shells
- **Props interfaces** defined above the component in the same file
- **No inline styles** — use Tailwind classes exclusively
- **Memoize expensive computations** with `useMemo` / `useCallback`
- **Error boundaries** around AI chat and settings panels

### File Naming

```
Components:   PascalCase.tsx     → ChatPanel.tsx, CodeBlock.tsx
Hooks:        camelCase.ts       → useAI.ts, useSettings.ts
Services:     kebab-case.ts      → provider-manager.ts, ocr-service.ts
Types:        camelCase.ts       → types.ts, global.d.ts
Main process: kebab-case.ts      → ipc-handlers.ts, region-selector.ts
Constants:    camelCase.ts       → constants.ts
```

### Import Order

```typescript
// 1. Node/Electron built-ins
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';

// 2. External packages
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

// 3. Internal modules (absolute paths)
import { AIProvider, ChatRequest } from '../services/ai-providers/types';
import { InvisiQError } from '../../shared/errors';

// 4. Relative imports
import { CodeBlock } from './CodeBlock';
import './styles.css';
```

### Error Handling

- **Main process:** Try-catch in every IPC handler. Return `{ success: false, error: string }` on failure.
- **Renderer:** Try-catch around all `window.ghostAPI.*` calls. Show error in chat as error message bubble.
- **AI providers:** Map HTTP errors to `InvisiQError` codes (see `docs/InvisiQ-API-Contract.md` Section 11).
- **Never swallow errors silently.** At minimum, `console.error()` in dev.

---

## Design System Quick Reference

### Colors (Dark Theme)

```
Overlay BG:     #1a1a2e  (85% opacity)
Chat BG:        #16213e
Header BG:      #1e1e36
Input BG:       #252547
Code BG:        #0d1117
User Bubble:    #2E75B6
AI Bubble:      #2d2d44
Text Primary:   #E8E8E8
Text Secondary: #8B8B9E
Accent:         #00B894  (teal)
Error:          #D63031
Streaming:      #74B9FF
```

### Window Defaults

```
Size:       420 × 600 px
Min:        300 × 200 px
Max:        800 × screen height
Position:   Bottom-right corner
Opacity:    85%
Radius:     12px
Font:       Inter (UI), JetBrains Mono (code)
Base Size:  13px
```

### Key Animations

```
Overlay show:    200ms ease-out (fade + scale 0.95→1.0)
Overlay hide:    150ms ease-in  (fade + scale 1.0→0.95)
Message appear:  200ms ease-out (fade + slide up 8px)
Settings slide:  250ms ease-out (from right)
Copy feedback:   Show "✅ Copied!" for 2000ms, then revert
```

Full design system in `docs/InvisiQ-Wireframes.md` Section 1.

---

## BrowserWindow Configuration

This is the exact configuration for the overlay window. **Do not deviate from these settings:**

```typescript
const overlayWindow = new BrowserWindow({
  width: 420,
  height: 600,
  transparent: true,
  frame: false,
  alwaysOnTop: true,
  skipTaskbar: true,
  resizable: true,
  focusable: true,
  title: '',
  hasShadow: false,
  webPreferences: {
    preload: path.join(__dirname, '../preload/index.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: false,
  },
});

// CRITICAL — Makes window invisible to screen capture
overlayWindow.setContentProtection(true);

// Position bottom-right
const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
overlayWindow.setPosition(screenW - 440, screenH - 620);
```

---

## Global Hotkey Defaults

Global shortcuts (default to **Shift** modifier — migrated off Alt; all customizable in Settings → Hotkeys):
```
Ctrl+Shift+G  →  Toggle overlay visibility
Ctrl+Shift+S  →  Capture full screen → send to AI
Ctrl+Shift+R  →  Capture region → send to AI
Ctrl+Shift+A  →  Focus text input
Ctrl+Shift+C  →  Copy last AI response
Ctrl+Shift+V  →  Paste last AI response to active app
Ctrl+Shift+N  →  New conversation
Ctrl+Shift+]  →  Next model        Ctrl+Shift+[  →  Previous model
Ctrl+Shift+I  →  Toggle stealth typing / capture mode (Model B)
Ctrl+Shift+Q  →  Panic — exit capture, uninstall hook, hide overlay
Escape        →  Hide overlay immediately (also exits capture)
```

Internal (renderer-only) shortcuts via `useInternalKeyboard`:
```
Ctrl+,  →  Toggle Settings    Ctrl+K  →  Conversation history search    Ctrl+L  →  Clear chat (double-press)
```

Defaults live in `DEFAULT_HOTKEYS` (`src/shared/constants.ts`), registered via `globalShortcut.register()` in `src/main/hotkeys.ts`. (`Ctrl+T` template shortcut was removed.)

---

## AI Provider Details

### Request Flow

```
User sends message
    │
    ▼
useAI hook builds ChatRequest
    │
    ├── Attaches conversation history (multi-turn context)
    ├── Attaches the single UNIVERSAL_MODE system prompt
    ├── Prepends memory (RAG) facts + meeting transcript when enabled
    ├── Attaches screenshot base64 if present
    │
    ▼
Provider adapter formats for specific API
    │
    ├── OpenAI:    POST /v1/chat/completions (stream: true)
    ├── Anthropic:  POST /v1/messages (stream: true)
    ├── Gemini:     POST /models/{model}:streamGenerateContent
    │
    ▼
SSE stream parsed → yield StreamChunk { type: 'text', text: '...' }
    │
    ▼
ChatPanel renders tokens progressively
    │
    ▼
Stream ends → yield final ChatResponse with usage stats
```

### Vision Request Format Differences

```
OpenAI:     content: [{ type: "image_url", image_url: { url: "data:image/png;base64,..." } }]
Anthropic:  content: [{ type: "image", source: { type: "base64", media_type: "image/png", data: "..." } }]
Gemini:     parts: [{ inline_data: { mime_type: "image/png", data: "..." } }]
```

Full API formats in `docs/InvisiQ-API-Contract.md` Sections 4-6.

---

## Development Workflow

### First-Time Setup

```bash
# Clone and install
git clone <repo>
cd ghostai
npm install

# Development mode (hot reload)
npm run dev

# Build for production
npm run build

# Package as .exe
npm run package
```

### Package.json Scripts

```json
{
  "dev": "vite & electron .",
  "build": "tsc && vite build",
  "package": "electron-builder --win",
  "lint": "eslint src/ --ext .ts,.tsx",
  "typecheck": "tsc --noEmit"
}
```

### Testing Stealth

After ANY change to window management or overlay code, manually verify:

1. Open InvisiQ
2. Open Windows Snipping Tool → take screenshot → **overlay must not appear**
3. Start a Zoom meeting → share screen → **overlay must not appear** in shared view
4. Open OBS → add Display Capture source → **overlay must not appear** in preview

If the overlay appears in ANY of these, something is broken. Check `setContentProtection(true)` is still being called.

---

## Common Pitfalls & Gotchas

### ❌ Don't: Skip the hide/show during screenshot
```typescript
// WRONG — will capture a blank area where our window is
const sources = await desktopCapturer.getSources({ types: ['screen'] });
```

### ✅ Do: Hide first, wait, capture, restore
```typescript
overlayWindow.hide();
await new Promise(r => setTimeout(r, 100));
const sources = await desktopCapturer.getSources({ types: ['screen'] });
overlayWindow.show();
```

### ❌ Don't: Use nodeIntegration in renderer
```typescript
// WRONG — security vulnerability
webPreferences: { nodeIntegration: true }
```

### ✅ Do: Use contextBridge preload
```typescript
// CORRECT
webPreferences: { contextIsolation: true, nodeIntegration: false, preload: '...' }
```

### ❌ Don't: Store API keys in plain text
```typescript
// WRONG
store.set('openai-key', 'sk-proj-...');
```

### ✅ Do: Encrypt before storing
```typescript
// CORRECT
const encrypted = encrypt(key, derivedMachineKey);
store.set('keys.openai', encrypted);
```

### ❌ Don't: Forget content protection on new windows
```typescript
// WRONG — region selector would be visible in screen capture!
const regionWindow = new BrowserWindow({ transparent: true, frame: false });
```

### ✅ Do: Always set content protection
```typescript
// CORRECT
const regionWindow = new BrowserWindow({ transparent: true, frame: false });
regionWindow.setContentProtection(true);
```

### ❌ Don't: Send full-resolution screenshots to AI
Large screenshots waste tokens and hit payload limits. Resize to max 1920px wide before sending.

### ✅ Do: Resize screenshots before API call
```typescript
// In screenshot.ts, resize to max 1920px width before base64 encoding
```

### ❌ Don't: Block the main process during AI calls
AI calls should happen in the renderer process (they're HTTP requests), not in the main process.

### ✅ Do: Keep main process for system operations only
Main process handles: window management, hotkeys, screenshots, storage. Renderer handles: AI API calls, UI rendering, streaming.

---

## Beta Launch — Auth, Trial, Analytics & Kill-Switch

The shipping beta is **gated and instrumented** (Act 1 of the two-act plan: BYOK beta → own AI backend). Full design: `docs/InvisiQ-Beta-Launch-Plan.md`. Backend: Supabase project `hlpxesuuqypxnubswbzh` (`SUPABASE_URL` / `SUPABASE_ANON_KEY` in `constants.ts`; the anon key is client-safe / RLS-protected — service-role & signing secrets NEVER ship).

**App-start gate flow (in `App.tsx`):** Login (Google OAuth) → T&C gate (if `tosAcceptedVersion !== CURRENT_TOS_VERSION`) → entitlement check → forced-update check → main UI. Locked/expired/offline → `LockScreen`; below version floor or killed → `ForcedUpdate`.

| Concern | Main module | Hook | Notes |
|---|---|---|---|
| Auth | `auth.ts` | `useAuth` | Google OAuth via Supabase; `AuthStatus` |
| Trial | `entitlement.ts` | `useEntitlement` | **Server-clocked** 14-day trial, **fail-closed** (offline ⇒ locked). `EntitlementStatus` |
| Analytics | `analytics.ts` | — | `analytics:track` events + `analytics:capture-prompt` (typed prompt text only — never screenshots/OCR); server redacts PII; beta prompt rows purged after 30 days; `analytics:delete-my-data` |
| T&C | (in `analytics.ts`/store) | — | `CURRENT_TOS_VERSION` in `constants.ts`; each prompt row stamped with accepted version |
| Kill-switch / version floor | `updater.ts` | `useUpdateGate` | `VersionGateStatus`: remote `killed` or `below-floor` ⇒ block use |

**Crypto coupling (do not break):** `crypto.ts` has two schemes — v1 machine-only key (legacy) and **v2 entitlement-bound key** (machineId + server fragment). `FRAGMENT_SECRET` must NEVER rotate or all v2-encrypted API keys become undecryptable. `APP_SALT` likewise must never change.

**Auto-update is real:** NSIS feed via `electron-updater`, pulling GitHub Releases from `publish.repo: GhostAI`. `RELEASES_LATEST_URL` is the manual-download fallback. See `docs/RELEASE.md`.

---

## Development Phases

### Phase 1 — Core MVP (COMPLETE)

**Sprint 1-4:** Invisible overlay + hotkeys, screen capture + AI integration, chat UI, integration + packaging. All done.

### Phase 2 — Enhanced (COMPLETE)

**Sprint 5:** Chat Persistence + Conversation History UI
- [x] Filesystem-based conversation storage (JSON per conversation)
- [x] 7 new IPC channels for conversation CRUD
- [x] Conversation history slide-in panel (search, delete, export)
- [x] Auto-save (debounced 500ms), auto-title generation
- [x] History + New Chat buttons in header

**Sprint 6:** Smart Modes + Custom Modes + Settings Tabs
- [x] Enhanced built-in mode prompts (General, Coding, Meeting, Solve)
- [x] Custom mode CRUD (create, edit, delete with color picker)
- [x] CustomModeEditor modal component
- [x] SettingsHotkeys tab (shortcut recording, conflict detection, reset)
- [x] SettingsDisplay tab (theme, opacity, font size, window size, position)
- [x] SettingsPrivacy tab (toggles, process name, clear data, open data folder)

**Sprint 7:** Clipboard Integration + Smart Paste + Toast
- [x] Smart paste via PowerShell SendKeys (hide overlay, Ctrl+V, restore)
- [x] Ctrl+Shift+V hotkey to paste last AI response into active app
- [x] Clipboard polling monitor (3s interval, MD5 hash comparison)
- [x] "Analyze with AI" action on clipboard toast notifications
- [x] Toast notification system (success/error/info, auto-dismiss, stacked)
- [x] "Paste to App" buttons on messages and code blocks

**Sprint 8:** Audio Transcription + Process Stealth + Polish
- [x] Dual speech engine: Web Speech API (free) + Whisper API (paid)
- [x] Mic button in InputArea with recording pulse animation
- [x] Audio transcription hook with interim results
- [x] TranscriptPanel: live transcript display with recording timer, collapse/clear
- [x] Meeting mode auto-context: transcript injected into AI prompts
- [x] SettingsAudio tab: engine selector, language, auto-include transcript
- [x] Skeleton loaders for conversation history panel
- [x] Flicker-free streaming: memoized ReactMarkdown components + virtual hljs highlighting
- [x] Enhanced stealth: process disguise, alt-tab hiding, stealth watchdog
- [x] UI polish: keyboard navigation, focus-visible, reduced motion, selection styles

### Phase 3 — Production Polish (COMPLETE)

**Sprint 9:** Multi-Monitor Support + Onboarding Wizard
- [x] Monitor detection with hot-plug events (display-added/removed/changed)
- [x] Screenshots capture correct display; region selector opens at cursor monitor
- [x] Overlay position validation against connected displays
- [x] 3-step onboarding wizard: API key setup, hotkey reference, stealth test

**Sprint 10:** ~~Ollama Local AI~~ + Light Theme + Cost Tracking
- [x] ~~Ollama AIProvider~~ — **removed permanently** in the beta track (cloud-only, BYOK)
- [x] Light theme via RGB triplet CSS variables + Tailwind opacity compatibility
- [x] Per-request, per-conversation, per-session token & cost tracking in StatusBar

**Sprint 11:** Auto-Updater + Responsive + Keyboard Nav + System Tray
- [x] electron-updater with GitHub Releases, toast UI, deferred auto-check
- [x] Responsive layout: compact/normal/expanded breakpoints
- [x] Internal keyboard shortcuts: Ctrl+, Ctrl+L, Ctrl+K
- [x] Optional system tray icon (default off for stealth)

**Sprint 12:** Performance + Testing + Packaging
- [x] Lazy-load AI SDKs via dynamic import (~4MB saved at startup)
- [x] Deferred non-critical startup tasks, screenshot memory cleanup
- [x] React.memo on ModeSelector/ModelSelector
- [x] Production logger, build verification script
- [x] Testing documentation (stealth matrix, benchmarks, checklists)
- [x] CHANGELOG.md, updated CLAUDE.md

### Phase 4 — Invisible Intelligence Platform (COMPLETE)

**Sprint 13:** Enterprise Design System Overhaul
- [x] New deep-navy command-center color palette (RGB triplet CSS vars, full Tailwind opacity compat)
- [x] framer-motion v11: `AnimatePresence`, `MotionConfig`, `fadeInUp`/`slideInRight`/`scaleIn` variants
- [x] UI primitives: `GhostButton`, `GhostInput`, `GhostCard`, `GhostTooltip`, `GhostBadge`, `GhostDivider`
- [x] All animations respect `prefers-reduced-motion`; `MotionConfig` wraps App root

**Sprint 14:** ~~Click-Through Overlay~~ + Invisible Snipping
- [x] ~~`useClickThrough` hook + passthrough toggle button~~ — **removed entirely** (June 2026). The user-facing click-through feature (hook, HeaderBar toggle, `Ctrl+Shift+P`, `overlay:set-passthrough` IPC, `setPassthrough`, `clickThroughEnabled` setting) was deleted. NOTE: the *internal* `setIgnoreMouseEvents(true)` on the hidden-stealth overlay is NOT this feature — it's a correctness mechanism (a 0-opacity overlay must not eat clicks) and remains.
- [x] `InlineRegionSelector` — canvas-based in-overlay snipping (no external window)
- [x] `screenshot:capture-for-snip` + `screenshot:crop-region` IPC via `NativeImage.crop()`
- [x] Old `screenshot:capture-region` IPC preserved for backward compatibility

**Sprint 15:** Live Meeting Assistant + Auto Code Detection
- [x] `audio-capture.ts` — tries `electron-audio-loopback`, falls back to PowerShell WASAPI loopback
- [x] `audio:start-system-capture` / `audio:stop-system-capture` / `audio:capture-status` IPC
- [x] `useLiveTranscription` hook — `audio:chunk` events → 5s Whisper chunk pipeline
- [x] `useMeetingAssistant` hook — interrogative heuristics + debounced AI auto-suggest
- [x] `useCodeDetection` hook — 30s periodic OCR via tesseract.js, 8-platform classifier
- [x] `MeetingPanel` — slide-in with live transcript + detected questions + suggestions
- [x] `CodeDetectionCard` — dismissible platform notification with "Switch to Coding mode" CTA
- [x] SettingsAudio expanded: system audio source, meeting mode controls

**Sprint 16:** Companion Mode + ~~Templates~~ + Export
- [x] `companion-server.ts` — HTTP + WebSocket (`ws`) server on `127.0.0.1:3847`, sequential port scan
- [x] One-time QR pairing token → persistent device ID; QR rendered via `qrcode` npm package
- [x] `SettingsCompanion` — start/stop server, QR display, connected devices list, auto-start toggle
- [x] ~~`template-store.ts` / `TemplateLibrary` / 20 built-in templates / Ctrl+T~~ — **removed entirely** (single-mode collapse, see §1d)
- [x] `export-service.ts` — JSON/MD/TXT/PDF export; PDF via hidden `BrowserWindow` + `printToPDF()`

**Sprint 17:** Memory (RAG) + Settings Reorganization + Polish
- [x] `memory.ts` — TF-IDF `MemoryStore` from scratch (~200 lines), max 500 facts, atomic JSON writes
- [x] `useMemory` hook + `buildContextPrefix()` — injects relevant facts into AI prompts
- [x] `SettingsMemory` — enable/auto-extract toggles, context/limit sliders, stats, clear-all
- [x] `MemoryPanel` — searchable slide-in browser with add/delete, pagination
- [x] Settings: 8-section left icon sidebar — now **api-keys, hotkeys, display, privacy, audio, memory, companion, resilience** (templates tab removed)

### Phase 5 — Beta Launch + Stealth Hardening (COMPLETE)
- [x] **Model B default-on stealth** — suppressing out-of-process capture helper, logical-focus capture, degradation ladder (§1c)
- [x] **Beta backend** — Supabase foundation, Google OAuth auth, server-clocked 14-day trial, analytics + full prompt capture, T&C gate, remote kill-switch + version floor (see Beta Launch section)
- [x] **Cloud-only** — local LLM / Ollama removed permanently
- [x] **Hotkeys** — migrated Alt → Shift modifier
- [x] **Real auto-update** — NSIS feed + forced-update path
- [x] **Single universal mode** — modes collapsed to one adaptive prompt; templates removed (§1d)

### Phase 6 — Future / Act 2
- Own AI backend (managed inference; remove BYOK requirement)
- Admin/org-level standardized prompt pushed to a fleet (the real "specialization" hook)
- Plugin system; voice-to-voice mode; multi-window support

---

## Quick Commands for Claude Code

```bash
# "Set up the project from scratch"
# → Read this CLAUDE.md, create package.json with all dependencies,
#   set up Vite + Electron + React + TypeScript + Tailwind config,
#   create the directory structure as specified above.

# "Build the invisible overlay window"
# → Create src/main/overlay.ts with the BrowserWindow config from this file.
#   MUST include setContentProtection(true). Test by taking a screenshot.

# "Add OpenAI provider"
# → Read docs/InvisiQ-API-Contract.md Section 4.
#   Implement AIProvider interface in src/renderer/services/ai-providers/openai.ts.
#   Support text + vision + streaming.

# "Build the chat UI"
# → Read docs/InvisiQ-Wireframes.md Sections 2-3.
#   Use the design system colors from Section 1.
#   Components: ChatPanel, MessageBubble, CodeBlock, InputArea.

# "Add settings panel"
# → Slide-in from right, 8-section icon sidebar:
#   api-keys, hotkeys, display, privacy, audio, memory, companion, resilience.
#   Store via IPC → electron-store. (Wireframes.md Section 6 is historical — 4 tabs.)
```

---

## Environment Variables

InvisiQ does NOT use environment variables for API keys. All keys are stored locally via `electron-store` with encryption. This is intentional — BYOK architecture means no `.env` files with secrets.

The only env var used:

```
NODE_ENV=development|production    # Set automatically by Vite/Electron
```

---

## Dependencies to Install

```bash
# Core
npm install electron electron-builder --save-dev
npm install react react-dom
npm install typescript @types/react @types/react-dom --save-dev

# Build
npm install vite @vitejs/plugin-react --save-dev
npm install tailwindcss postcss autoprefixer --save-dev

# AI Providers
npm install openai @anthropic-ai/sdk @google/generative-ai

# Electron Utilities
npm install electron-store
npm install electron-is-dev --save-dev

# UI
npm install react-markdown rehype-highlight highlight.js
npm install lucide-react

# OCR (optional fallback)
npm install tesseract.js

# Utilities
npm install uuid
npm install @types/uuid --save-dev
```

---

*Last updated: June 18, 2026 — Phase 5 complete: Beta Launch (Supabase auth/trial/analytics/T&C/kill-switch), cloud-only (Ollama removed), Alt→Shift hotkeys, real NSIS auto-update, and the single universal mode collapse (modes + templates removed, §1d). Model B default-on stealth (§1c) remains current.*
*This file should be updated whenever major architecture decisions change.*
