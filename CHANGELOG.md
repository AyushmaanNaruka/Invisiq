# Changelog

All notable changes to GhostAI are documented here.

---

## [1.2.0] — Phase 5: Resilience & Camouflage

### Resilience Mode (Native C++ Helper)
- Native `ghostai_helper.exe` process managed via Electron child process spawning
- Bidirectional communication over Windows named pipes (`\\.\pipe\GhostAI`, NDJSON protocol)
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
- Enhanced built-in mode prompts (General, Coding, Meeting, Exam)
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
