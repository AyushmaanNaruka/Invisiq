# Changelog

All notable changes to InvisiQ are documented here.

---

## [Unreleased] — Single Universal Mode

### One mode, no templates (UX simplification)
- Removed the user-facing **mode picker** and the entire **template library**. InvisiQ now uses a single intent-adaptive system prompt (`UNIVERSAL_MODE` in `src/shared/constants.ts`) — the model infers intent (answer-first for questions, algorithm-first for code, talking points for meetings) from the message + screenshot, ChatGPT/Claude-style.
- Tune behavior by editing `UNIVERSAL_SYSTEM_PROMPT`; it is injected at a single point in `App.tsx`.
- Meeting-transcript auto-context is now gated on `settings.audio.autoIncludeTranscript` (the `meeting` mode no longer exists); the meeting panel auto-opens on `settings.meeting.enableSystemAudio`.
- **Removed:** `ModeSelector`, `CustomModeEditor`, `TemplateLibrary`, `useTemplates`, `template-store.ts`, `built-in-templates.ts`, the `modes:*` and `template:*` IPC, the `Ctrl+T` shortcut, the Templates settings tab, and the `CustomMode`/`PromptTemplate` types + `customModes`/`templates` settings fields.
- `activeMode` is retained (always `'universal'`) for conversation/analytics metadata. Typecheck + production build verified green.

---

## [2.0.0] — Beta Launch (Auth · Trial · Analytics · Kill-Switch)

> Act 1 of the two-act plan (BYOK beta → own AI backend). See `docs/InvisiQ-Beta-Launch-Plan.md`.

### Accounts & trial gating
- **Google sign-in** (OAuth via Supabase) — `auth.ts` / `useAuth`; `LoginScreen` gates the app.
- **Server-clocked 14-day trial**, **fail-closed** — `entitlement.ts` / `useEntitlement`. Offline or expired ⇒ `LockScreen`; API keys are entitlement-bound and become undecryptable when locked (crypto v2: machineId + server fragment).
- **T&C gate** — `TosGate` blocks use until the current `CURRENT_TOS_VERSION` is accepted; each captured prompt is stamped with the accepted version.

### Telemetry (disclosed)
- `analytics:track` events + `analytics:capture-prompt` (typed prompt text only — never screenshots/OCR). Server redacts PII; beta prompt rows purged after 30 days. `analytics:delete-my-data` honors deletion.

### Remote control & updates
- **Kill-switch + minimum-version floor** — `VersionGateStatus` via `updater.ts` / `useUpdateGate`; `ForcedUpdate` blocks killed or below-floor builds.
- **Real auto-update** — `electron-updater` NSIS feed from GitHub Releases (`update:check|download|install|version-status|open-releases`).

### Platform changes
- **Cloud-only / BYOK** — the **Ollama / local-LLM provider was removed permanently** (no `ollama.ts`, no local endpoint in `AI_API_DOMAINS`). Providers: OpenAI, Anthropic, Google Gemini (Gemini refreshed to 2.5 Flash + Pro).
- **Hotkeys migrated Alt → Shift** modifier (e.g. `Ctrl+Shift+G/S/R/...`); added click-through toggle (`Ctrl+Shift+P`) and model cycling (`Ctrl+Shift+]` / `Ctrl+Shift+[`).
- New backend module set: `auth.ts`, `entitlement.ts`, `analytics.ts`; new UI: `LoginScreen`, `LockScreen`, `TosGate`, `TrialBanner`, `ForcedUpdate`.

---

## [1.3.0] — Model B: Default-On Stealth

### Stealth is now the default (fail-safe)
- The overlay starts in `WS_EX_NOACTIVATE` stealth-focus mode (gated by `settings.stealth.defaultOn`) — invisible to screen capture **and** foreground-window monitoring (e.g. Mercer Mettl `MsbWindowCef`) from the first frame. Protection is no longer something you switch on after a proctor appears.
- Proctor detection is a **confirmation indicator only** ("Monitored app detected — you're invisible" badge), never the trigger for protection.

### Suppressing out-of-process capture helper
- New standalone Win32 helper `native/ghostai-helper/` (`ghostai_helper.exe`) hosts the `WH_KEYBOARD_LL` hook **out of the main process** and **suppresses** captured keys (`return 1`) so they no longer leak into the foreground app — fixing the core limitation of the old uiohook path.
- Layout-aware translation via `ToUnicodeEx` (wFlags `0x4`, non-destructive) + self-managed dead-key composition (`NormalizeString`) — covers EU layouts, AltGr, and accented/dead keys without corrupting the foreground app.
- Hardened: user-SID-only pipe DACL + `PIPE_REJECT_REMOTE_CLIENTS`, randomized pipe name, parent-death watchdog, WTS session-lock safety, zero disk/network, hook installed **only while capturing** (no idle keylogger signature).

### Logical-focus capture mode
- Click the textarea (or `Ctrl+Shift+I`) to enter capture — type into InvisiQ while the foreground app stays foreground. Cursor-aware editing (insert/backspace/delete/arrows/home/end) with seq+epoch ordering.
- Glowing-border + caret indicator; new **panic** hotkey (`Ctrl+Shift+Q`) instantly exits capture, uninstalls the hook, and hides the overlay.

### Degradation ladder (never a dead textarea)
- `capture-controller.ts` runs a ping/pong heartbeat and degrades helper → uiohook (legacy, leaky, warns) → clipboard if the helper is missing or the pipe drops mid-capture; surfaces `capture:failed` to the UI.

### Other
- Overlay visibility collapsed to a single opacity-only state machine (fixes opacity-slider / click-through edge cases; 0-opacity window no longer eats clicks).
- New IPC: `capture:enter|exit|status|panic|proctor-status` (invoke) and `capture:key|state|failed`, `proctor:detected` (events).
- `npm run build:helper` (MSVC via CMake, g++ dev fallback) → packed via electron-builder `extraResources`. Signing wired but cert-deferred (parametrized publisher).
- Settings → Privacy: stealth toggles + plain-language keyboard-hook disclosure. Store schema backfill so existing users gain the new `stealth` block.

---

## [1.2.0] — Phase 5: Resilience & Camouflage

### Resilience Mode (Native C++ Helper)
- Native `ghostai_helper.exe` process managed via Electron child process spawning
- Bidirectional communication over Windows named pipes (`\\.\pipe\InvisiQ`, NDJSON protocol)
- Exponential backoff reconnection (max 5 retries: 300ms → 4800ms)
- `ghostai_core.dll` — Detours-based API hooking that forces `WDA_EXCLUDEFROMCAPTURE` on target windows
- 4 new IPC channels: `resilience:start-agent`, `resilience:stop-agent`, `resilience:send-command`, `resilience:status`
- 2 new renderer events: `resilience:agent-status-changed`, `resilience:agent-response`
- SettingsResilience tab with start/stop, status monitoring, uptime, PID display, ping test, auto-start toggle

### Process Camouflage Overhaul
- App now disguises as **Runtime Broker** (a legitimate Windows system process)
- Executable renamed to `RuntimeBroker.exe` with Microsoft Corporation metadata
- `app.setAppUserModelId('Microsoft.Windows.RuntimeBroker')` for deeper OS-level disguise
- Config directory migrated: `%APPDATA%/ghostai/` → `%APPDATA%/RuntimeBroker/`
- Automatic config migration on first launch (best-effort, non-blocking)

### Ollama OCR Intelligence
- Screenshots sent to Ollama are now OCR-processed via Tesseract.js
- Extracted text replaces the image in the AI request — model reads code instead of describing the image
- Fixes issue where Ollama vision models (llava, etc.) would describe screenshots instead of solving problems
- Works transparently — no user action needed

### Portable Distribution
- Build target changed from NSIS installer to portable `.exe`
- No installer, no registry entries, no Start Menu shortcuts
- Single file distribution — download, double-click, run

### Other Changes
- Default process name: `SystemHelper` → `RuntimeBroker`
- Updated SettingsPrivacy help text for process name field
- Updated package.json metadata to match Runtime Broker identity

---

## [1.1.1] — QA Bugfixes

### Fixes
- Fixed `Invalid provider: ollama` error — added 'ollama' to `store.ts` VALID_PROVIDERS and StoreSchema
- Added update check feedback toasts (checking, up-to-date, error) in UpdateNotification
- Reduced stealth watchdog interval from 5s to 2s for faster content protection recovery

---

## [1.1.0] — Phase 3: Production Polish

### Multi-Monitor Support
- Monitor detection via Electron `screen.getAllDisplays()` with hot-plug events
- Screenshots capture the correct display (or cursor display by default)
- Region selector opens on the monitor where the cursor is
- Overlay position validated against connected displays on startup
- Move overlay between monitors via IPC

### Onboarding Wizard
- 3-step first-launch wizard: API key setup, hotkey reference, stealth test
- Per-provider API key validation during onboarding
- Stealth self-test with visual test pattern and Snipping Tool instructions
- Skip option for all steps

### Ollama Local AI Provider
- Full `AIProvider` implementation for Ollama (local LLM server)
- Dynamic model discovery via `/api/tags` endpoint
- NDJSON streaming (not SSE) for chat responses
- Vision support (llava, bakllava, moondream models)
- Always shows as "Free" in model selector — no API key required
- Server URL configuration in Settings (default: `http://localhost:11434`)

### Light Theme
- Full light color palette via CSS custom properties (RGB triplet format)
- Tailwind opacity modifiers (`/20`, `/40`) work with both themes
- Toggle in Display settings (dark/light)
- Syntax highlighting adapts to theme

### Cost Tracking
- Per-request, per-conversation, and per-session token and cost tracking
- Status bar shows conversation tokens and estimated cost
- Hover tooltip with full breakdown (last request / conversation / session)
- Ollama models always show "Free"

### Auto-Updater
- `electron-updater` integration with GitHub Releases
- Auto-check 10 seconds after startup (non-blocking)
- Toast notifications for available and downloaded updates
- "Check for Updates" button in Privacy settings
- Manual download and install-on-restart flow

### Responsive Layout
- `useWindowSize` hook with compact (<350px) / normal / expanded (>600px) breakpoints
- Compact mode: abbreviated model names, dot-only mode selector, hidden opacity control
- Settings and conversation history panels go full-width in compact mode

### Internal Keyboard Navigation
- `Ctrl+,` — toggle Settings panel
- `Ctrl+L` (double-press) — clear conversation
- `Ctrl+K` — open conversation search

### System Tray
- Optional system tray icon (default off for stealth)
- Context menu: Show/Hide, Quit
- Toggle in Privacy settings (requires restart)

### Performance Optimization
- Lazy-load AI SDKs via dynamic `import()` — saves ~4MB at startup
- Deferred non-critical startup tasks (conversations dir, stealth watchdog, tray, updater)
- Screenshot memory cleanup (null base64 data on clear)
- `React.memo` on ModeSelector and ModelSelector components

### Production Packaging
- Build verification script (`npm run verify`)
- NSIS installer: user-choosable install directory, no desktop/start menu shortcuts
- GitHub Releases publish config
- `package:dir` script for unpacked testing

---

## [1.0.0] — Phase 2: Enhanced Features

### Chat Persistence (Sprint 5)
- Filesystem-based conversation storage (JSON per conversation)
- 7 IPC channels for conversation CRUD
- Conversation history slide-in panel with search, delete, export
- Auto-save with debounced 500ms, auto-title generation

### Smart Modes + Custom Modes (Sprint 6)
- Enhanced built-in mode prompts (General, Coding, Meeting, Solve)
- Custom mode CRUD with color picker
- CustomModeEditor modal component
- SettingsHotkeys tab with shortcut recording and conflict detection
- SettingsDisplay tab (theme, opacity, font size, window size, position)
- SettingsPrivacy tab (toggles, process name, clear data)

### Clipboard Integration (Sprint 7)
- Smart paste via PowerShell SendKeys
- Ctrl+Shift+V hotkey to paste last AI response into active app
- Clipboard polling monitor with "Analyze with AI" toast action
- Toast notification system (success/error/info, stacked, auto-dismiss)

### Audio Transcription + Stealth (Sprint 8)
- Dual speech engine: Web Speech API (free) + Whisper API (paid)
- Mic button with recording pulse animation
- TranscriptPanel with live transcript and timer
- Meeting mode auto-context
- Enhanced stealth: process disguise, alt-tab hiding, stealth watchdog

---

## [0.1.0] — Phase 1: MVP

- Invisible overlay window with `setContentProtection(true)`
- Global hotkeys (toggle, screenshot, focus, copy, hide)
- Full screen and region capture via desktopCapturer
- AI chat with OpenAI, Anthropic, and Google Gemini
- Streaming responses with markdown and syntax highlighting
- Copy code and paste-to-app buttons
- Opacity slider
- Settings panel with API key management
- Encrypted key storage (AES-256-GCM)
