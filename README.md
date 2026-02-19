<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:1a1a2e,50:16213e,100:00B894&height=220&section=header&text=GhostAI&fontSize=72&fontColor=E8E8E8&animation=fadeIn&fontAlignY=38&desc=Your%20AI%20copilot%20that%20sees%20everything%2C%20but%20is%20seen%20by%20no%20one.&descSize=16&descColor=8B8B9E&descAlignY=58" width="100%" />
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/version-1.1.0-00B894?style=for-the-badge&labelColor=1a1a2e" alt="Version" /></a>
  <a href="#"><img src="https://img.shields.io/badge/platform-Windows%2010%2F11-0078D4?style=for-the-badge&logo=windows&logoColor=white&labelColor=1a1a2e" alt="Platform" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-FDCB6E?style=for-the-badge&labelColor=1a1a2e" alt="License" /></a>
  <a href="#"><img src="https://img.shields.io/badge/electron-33+-47848F?style=for-the-badge&logo=electron&logoColor=white&labelColor=1a1a2e" alt="Electron" /></a>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/OpenAI-supported-412991?style=flat-square&logo=openai&logoColor=white" alt="OpenAI" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Anthropic-supported-D97757?style=flat-square&logo=anthropic&logoColor=white" alt="Anthropic" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Google%20Gemini-supported-4285F4?style=flat-square&logo=googlegemini&logoColor=white" alt="Gemini" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Ollama-supported-ffffff?style=flat-square&logo=ollama&logoColor=black" alt="Ollama" /></a>
</p>

---

<br/>

## What is GhostAI?

GhostAI is a desktop overlay that sits on top of every application on your screen — completely invisible to all screen capture, screen sharing, recording software, and proctoring tools. It uses Windows' native `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` API to make the overlay window undetectable.

Capture your screen, ask questions, get real-time AI responses with streaming — all through a sleek interface (dark or light theme) controlled entirely by keyboard shortcuts. Connect cloud AI providers with your own API keys, or run fully local with Ollama. Zero cloud dependency. Everything stays on your machine.

<br/>

## Core Features

<table>
<tr>
<td width="50%" valign="top">

### Invisible Overlay
The window is **excluded from all capture APIs** at the OS level. Snipping Tool, OBS, Zoom, Teams, Meet, proctoring software — none of them can see it. This isn't a hack or a workaround. It's a native Windows compositing feature.

</td>
<td width="50%" valign="top">

### Multi-Provider AI
Connect to **OpenAI**, **Anthropic Claude**, **Google Gemini**, or run fully local with **Ollama**. Switch models mid-conversation. Stream responses token-by-token with real-time rendering. Ollama models are always free.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### Screen Capture + Vision
Full-screen or region capture with a crosshair selector. Screenshots are sent directly to AI vision models. Attach up to **3 screenshots per message**. Multi-monitor aware — captures the correct display.

</td>
<td width="50%" valign="top">

### AES-256-GCM Encryption
API keys are encrypted with a machine-specific key derived via **PBKDF2** (100k iterations, SHA-512). Keys are tied to your hardware. No plaintext secrets ever touch disk.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### Multi-Monitor Support
Monitor detection with hot-plug events. Screenshots capture the correct display. Region selector opens on the monitor where your cursor is. Overlay position validated against connected displays.

</td>
<td width="50%" valign="top">

### Dark & Light Themes
Full dark and light color palettes via CSS custom properties. Toggle in Display settings. Syntax highlighting adapts to the active theme. All Tailwind opacity modifiers work with both themes.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### Smart Modes
Four built-in modes with tuned system prompts: **General**, **Coding**, **Meeting**, and **Exam**. Create your own custom modes with personalized system prompts and colors.

</td>
<td width="50%" valign="top">

### Chat History & Persistence
Conversations auto-save with debounced persistence. Browse, search, and export your full conversation history. Restore mode and model when loading past sessions.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### Smart Paste & Clipboard
Copy AI responses or code blocks directly into any application with **Smart Paste** — the overlay hides, activates the target window, and simulates Ctrl+V. Clipboard monitoring detects external changes.

</td>
<td width="50%" valign="top">

### Voice Input (Speech-to-Text)
Dual engine speech recognition: **Web Speech API** (free, browser-native) with automatic fallback to **OpenAI Whisper** (paid, higher accuracy). Live transcript panel with recording timer. Meeting mode auto-context.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### Cost Tracking
Per-request, per-conversation, and per-session token and cost tracking. Status bar shows conversation tokens and estimated cost. Hover tooltip with full breakdown. Ollama models always show "Free".

</td>
<td width="50%" valign="top">

### Auto-Updater
Automatic update checks via GitHub Releases. Toast notifications for available and downloaded updates. Manual download and install-on-restart flow. "Check for Updates" button in settings.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### Enhanced Stealth
Process disguise randomizes the app's visible process name. Alt-Tab hiding removes the overlay from the task switcher. A stealth watchdog continuously re-enforces content protection.

</td>
<td width="50%" valign="top">

### Responsive Layout
Adapts to any window size. Compact mode (< 350px) abbreviates controls. Expanded mode (> 600px) shows full labels. Settings and history panels go full-width in compact mode.

</td>
</tr>
</table>

<br/>

## Supported Models

| Provider | Model | Vision | Context Window | Speed |
|:---------|:------|:------:|---------------:|:-----:|
| **OpenAI** | GPT-4o | Yes | 128K | Medium |
| **OpenAI** | GPT-4o Mini | Yes | 128K | Fast |
| **OpenAI** | o3-mini (Reasoning) | No | 200K | Slow |
| **Anthropic** | Claude Sonnet 4 | Yes | 200K | Medium |
| **Anthropic** | Claude Haiku 4.5 | Yes | 200K | Fast |
| **Google** | Gemini 2.0 Flash | Yes | 1M | Fast |
| **Google** | Gemini 2.5 Pro | Yes | 1M | Medium |
| **Ollama** | *Any local model* | Varies | Varies | Local |

> Ollama models are discovered dynamically via `/api/tags`. Vision support detected automatically for llava, bakllava, moondream, etc.

<br/>

## Tech Stack

<p align="center">
  <img src="https://img.shields.io/badge/Electron-33-47848F?style=for-the-badge&logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
</p>

| Layer | Technology | Purpose |
|:------|:-----------|:--------|
| Runtime | Electron 33+ | Desktop shell, system APIs, content protection |
| Frontend | React 18 | Component UI with hooks |
| Language | TypeScript 5 (strict) | Type safety across all processes |
| Styling | TailwindCSS 3 | Utility-first theming (dark + light) |
| Build | electron-vite 5 | Unified main/preload/renderer builds |
| AI (Cloud) | openai, @anthropic-ai/sdk, @google/generative-ai | Provider SDKs with streaming (lazy-loaded) |
| AI (Local) | Ollama (native fetch, NDJSON) | Local LLM inference |
| Storage | electron-store + AES-256-GCM | Encrypted key storage |
| Updates | electron-updater | Auto-update via GitHub Releases |
| Markdown | react-markdown + highlight.js | Rich response rendering |
| Icons | lucide-react | UI iconography |
| Packaging | electron-builder | Windows NSIS installer |

<br/>

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      MAIN PROCESS                           │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐  │
│  │ Overlay  │  │ Hotkeys  │  │Screenshot │  │  Store    │  │
│  │ Window   │  │ Manager  │  │ Capture   │  │ (AES-256) │  │
│  └──────────┘  └──────────┘  └───────────┘  └───────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐  │
│  │ Monitor  │  │ Updater  │  │  Stealth  │  │  System   │  │
│  │ Manager  │  │          │  │ Watchdog  │  │  Tray     │  │
│  └──────────┘  └──────────┘  └───────────┘  └───────────┘  │
│       │              │              │              │         │
│       └──────────────┴──────────────┴──────────────┘         │
│                          IPC Bridge                          │
├──────────────────────────┬──────────────────────────────────┤
│       PRELOAD            │        contextBridge             │
├──────────────────────────┴──────────────────────────────────┤
│                    RENDERER PROCESS                          │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐  │
│  │ Chat UI  │  │ AI       │  │ Settings  │  │ Onboarding│  │
│  │ Panel    │  │ Providers│  │ Panel     │  │ Wizard    │  │
│  └──────────┘  └──────────┘  └───────────┘  └───────────┘  │
│                                                             │
│  OpenAI ─── Anthropic ─── Gemini ─── Ollama (local)        │
│    ↕             ↕            ↕          ↕                  │
│  Cloud API    Cloud API   Cloud API  localhost:11434        │
└─────────────────────────────────────────────────────────────┘
```

> AI SDKs are lazy-loaded on first use (~4MB saved at startup).
> All cloud AI calls happen in the renderer. Ollama connects to localhost.

<br/>

## Quick Start

### Prerequisites

- **Node.js** 18+
- **npm** 9+
- **Windows 10** version 2004 or later (required for `WDA_EXCLUDEFROMCAPTURE`)
- API key from at least one provider: [OpenAI](https://platform.openai.com/api-keys) / [Anthropic](https://console.anthropic.com/) / [Google AI Studio](https://aistudio.google.com/apikey) — or install [Ollama](https://ollama.com/) for free local AI

### Install & Run

```bash
# Clone the repository
git clone https://github.com/Nezeon/GhostAI.git
cd GhostAI

# Install dependencies
npm install

# Start in development mode (hot reload)
npm run dev
```

### Build & Package

```bash
# Production build
npm run build

# Pre-build verification (stealth + security checks)
npm run verify

# Package as Windows installer (.exe)
npm run package

# Package unpacked for testing
npm run package:dir
```

### First Launch

1. The **onboarding wizard** guides you through API key setup, hotkey reference, and a stealth self-test
2. Or skip onboarding and press **Ctrl+Shift+G** to toggle the overlay
3. Click the gear icon to open **Settings** and enter your API key
4. Close settings — you're ready to go

<br/>

## Keyboard Shortcuts

### Global Hotkeys (work from any app)

| Shortcut | Action |
|:---------|:-------|
| `Ctrl+Shift+G` | Toggle overlay visibility |
| `Ctrl+Alt+S` | Capture full screen |
| `Ctrl+Alt+R` | Capture region (crosshair selector) |
| `Ctrl+Alt+A` | Focus text input |
| `Ctrl+Alt+C` | Copy last AI response |
| `Ctrl+Shift+V` | Paste last AI response to active app |
| `Ctrl+Alt+N` | New conversation |
| `Escape` | Hide overlay |

### Internal Shortcuts (when overlay is focused)

| Shortcut | Action |
|:---------|:-------|
| `Ctrl+,` | Toggle Settings panel |
| `Ctrl+L` | Clear conversation (double-press) |
| `Ctrl+K` | Open conversation search |

<br/>

## Built-in Modes

| Mode | Purpose | Optimized For |
|:-----|:--------|:--------------|
| **General** | All-purpose assistant | Clear, accurate answers to any question |
| **Coding** | Algorithm & engineering help | Clean solutions with Big-O analysis in your chosen language |
| **Meeting** | Meeting companion | Summaries, talking points, document analysis |
| **Exam** | Assessment helper | Direct answers first, step-by-step explanations after |

<br/>

## Security & Privacy

| Aspect | Implementation |
|:-------|:---------------|
| **Window Invisibility** | `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` via Electron's `setContentProtection(true)` |
| **Stealth Watchdog** | Re-applies content protection every 2 seconds to guard against state drops |
| **Key Encryption** | AES-256-GCM with PBKDF2-derived machine-specific key (100K iterations, SHA-512) |
| **Process Isolation** | `contextIsolation: true`, `nodeIntegration: false`, IPC-only communication |
| **Data Residency** | All data stored locally via `electron-store`. Zero cloud storage. Zero telemetry. |
| **API Architecture** | BYOK (Bring Your Own Key). Direct API calls to providers. No intermediary servers. |
| **Screenshot Lifecycle** | Screenshots cleared from memory after sending. Not persisted to disk. |
| **Process Disguise** | Configurable process name in Task Manager (default: `SystemHelper`) |

<br/>

<details>
<summary><strong>Project Structure</strong></summary>
<br/>

```
ghostai/
├── src/
│   ├── main/                    # Electron Main Process
│   │   ├── index.ts             # App entry, lifecycle, CORS bypass
│   │   ├── overlay.ts           # BrowserWindow + content protection
│   │   ├── hotkeys.ts           # Global shortcut registration
│   │   ├── screenshot.ts        # desktopCapturer integration
│   │   ├── region-selector.ts   # Crosshair region selection window
│   │   ├── stealth.ts           # Process disguise, alt-tab hiding, watchdog
│   │   ├── store.ts             # Encrypted electron-store wrapper
│   │   ├── crypto.ts            # AES-256-GCM + PBKDF2 key derivation
│   │   ├── ipc-handlers.ts      # All IPC channel handlers
│   │   ├── conversations.ts     # Filesystem-based conversation CRUD
│   │   ├── clipboard.ts         # Smart paste via PowerShell SendKeys
│   │   ├── clipboard-monitor.ts # Clipboard polling monitor
│   │   ├── monitors.ts          # Multi-monitor detection + management
│   │   ├── updater.ts           # electron-updater auto-update
│   │   └── tray.ts              # Optional system tray icon
│   │
│   ├── preload/
│   │   └── index.ts             # contextBridge API surface
│   │
│   ├── renderer/                # React Frontend
│   │   ├── App.tsx              # Root component
│   │   ├── components/          # HeaderBar, ChatPanel, MessageBubble,
│   │   │                        # CodeBlock, InputArea, Settings,
│   │   │                        # ConversationHistory, CustomModeEditor,
│   │   │                        # Toast, TranscriptPanel, OnboardingFlow,
│   │   │                        # UpdateNotification, Settings tabs
│   │   ├── hooks/               # useAI, useScreenshot, useSettings,
│   │   │                        # useHotkeys, useConversation,
│   │   │                        # useConversationHistory, useTokenCost,
│   │   │                        # useWindowSize, useInternalKeyboard,
│   │   │                        # useAudioTranscription
│   │   ├── services/
│   │   │   ├── ai-providers/    # OpenAI, Anthropic, Gemini, Ollama
│   │   │   └── speech.ts        # Web Speech + Whisper fallback
│   │   ├── styles/
│   │   │   └── globals.css      # Tailwind + dark/light themes
│   │   └── types/
│   │       └── global.d.ts      # Window.ghostAPI declarations
│   │
│   └── shared/                  # Cross-process types & constants
│       ├── types.ts
│       ├── constants.ts
│       ├── errors.ts
│       └── logger.ts
│
├── docs/                        # PRD, Wireframes, API Contract, Testing
├── scripts/
│   └── verify-build.ts          # Pre-build security/stealth checks
├── electron-builder.yml
├── tailwind.config.ts
├── CHANGELOG.md
└── package.json
```

</details>

<br/>

## Roadmap

### Phase 1 — Core MVP
- [x] Invisible overlay with content protection
- [x] Full-screen and region screenshot capture
- [x] OpenAI, Anthropic, and Gemini streaming chat
- [x] Multi-screenshot support (up to 3 per message)
- [x] Markdown rendering with syntax-highlighted code blocks
- [x] AES-256-GCM encrypted API key storage
- [x] Global keyboard shortcuts
- [x] 4 built-in modes with tuned system prompts

### Phase 2 — Enhanced
- [x] Chat history persistence with auto-save and auto-titling
- [x] Conversation history panel with search, delete, and JSON export
- [x] Custom modes (create, edit, delete with color picker)
- [x] Smart paste — paste AI responses into any app via clipboard + SendKeys
- [x] Ctrl+Shift+V hotkey to paste last AI response into active app
- [x] Clipboard monitoring with toast notifications + "Analyze with AI" action
- [x] Voice input — dual engine: Web Speech API + OpenAI Whisper fallback
- [x] Live transcript panel with recording timer and collapse/clear controls
- [x] Meeting mode auto-context — transcript injected into AI prompts automatically
- [x] Settings: Hotkeys, Display, Privacy, Audio tabs
- [x] Enhanced stealth (process disguise, alt-tab hiding, stealth watchdog)
- [x] Toast notification system (success, error, info with auto-dismiss)
- [x] Flicker-free streaming (memoized markdown components + virtual highlighting)

### Phase 3 — Production Polish
- [x] Multi-monitor support with hot-plug detection
- [x] 3-step onboarding wizard (API keys, hotkeys, stealth test)
- [x] Ollama local AI provider (NDJSON streaming, vision, free)
- [x] Light theme with full dark/light toggle
- [x] Per-request/conversation/session cost tracking
- [x] Auto-updater via GitHub Releases with toast UI
- [x] Responsive layout (compact / normal / expanded)
- [x] Internal keyboard shortcuts (Ctrl+, Ctrl+L, Ctrl+K)
- [x] Optional system tray icon
- [x] Lazy-loaded AI SDKs (~4MB saved at startup)
- [x] Build verification script + testing documentation
- [x] NSIS installer with stealth options

### Phase 4 — Future
- [ ] Plugin system
- [ ] Voice-to-voice conversation mode
- [ ] Multi-window support
- [ ] macOS support

<br/>

## Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

```bash
# Type check
npm run typecheck

# Lint
npm run lint

# Pre-build verification
npm run verify

# Build
npm run build
```

<br/>

## License

This project is licensed under the [MIT License](LICENSE).

<br/>

---

<p align="center">
  Built by <a href="https://github.com/Nezeon"><strong>Ayushmaan Singh Naruka</strong></a>
</p>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:1a1a2e,50:16213e,100:00B894&height=100&section=footer" width="100%" />
</p>
