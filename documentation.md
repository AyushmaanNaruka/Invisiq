# InvisiQ — Complete Project Documentation

> **Version:** 2.0.0 (Phase 4 Complete)
> **Author:** Ayushmaan Singh Naruka
> **License:** MIT
> **Last Updated:** February 20, 2026

> ⚠️ **HISTORICAL SNAPSHOT — frozen ~June 3, 2026 (Phase 4).** This is a large point-in-time export and is **superseded** by `CLAUDE.md` (the single source of truth) and the per-topic docs in `/docs`. It predates Phase 5 — the **beta launch** (Google auth, server-clocked 14-day trial, analytics + prompt capture, T&C gate, remote kill-switch / version floor), **Model B default-on stealth**, **cloud-only** (Ollama removed), the **Alt→Shift hotkey** migration, real **NSIS auto-update**, and the **single universal mode** collapse (modes + templates removed). Treat anything here that conflicts with CLAUDE.md as out of date.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement & Vision](#2-problem-statement--vision)
3. [Market Research & Competitive Analysis](#3-market-research--competitive-analysis)
4. [Core Innovation: Invisibility Engine](#4-core-innovation-invisibility-engine)
5. [Tech Stack](#5-tech-stack)
6. [Project Structure](#6-project-structure)
7. [Architecture](#7-architecture)
8. [Main Process Modules](#8-main-process-modules)
9. [Preload Script](#9-preload-script)
10. [Renderer: Components](#10-renderer-components)
11. [Renderer: Hooks](#11-renderer-hooks)
12. [Renderer: Services](#12-renderer-services)
13. [Shared Types & Constants](#13-shared-types--constants)
14. [Design System](#14-design-system)
15. [IPC Contract](#15-ipc-contract)
16. [AI Provider Integration](#16-ai-provider-integration)
17. [Storage & Encryption](#17-storage--encryption)
18. [Security & Privacy](#18-security--privacy)
19. [Global Hotkeys](#19-global-hotkeys)
20. [Development Phases](#20-development-phases)
21. [Error Handling](#21-error-handling)
22. [Testing Strategy](#22-testing-strategy)
23. [Development Workflow](#23-development-workflow)
24. [Coding Standards](#24-coding-standards)
25. [Configuration Files](#25-configuration-files)
26. [Future Roadmap](#26-future-roadmap)

---

## 1. Project Overview

**InvisiQ** is an invisible AI desktop overlay assistant for Windows. It creates a transparent, always-on-top window that is completely invisible to all screen capture, screen sharing, and recording software — while remaining fully visible on the user's physical monitor.

- **Name:** InvisiQ
- **Tagline:** "Your AI copilot that sees everything, but is seen by no one."
- **Type:** Invisible AI desktop overlay assistant
- **Platform:** Windows 10 v2004+ (primary), macOS 14 and below (partial)
- **Architecture:** Electron + React + TypeScript
- **AI Providers:** OpenAI, Anthropic, Google Gemini, Ollama (local)

### What It Does

1. Creates an **invisible overlay window** on top of all other applications
2. Captures the user's screen content via screenshots
3. Sends screenshots + questions to AI vision models
4. Displays AI responses in a chat interface with markdown + code highlighting
5. All controlled via global keyboard shortcuts that work from any application
6. Persists conversations, supports multiple AI modes, audio transcription, memory (RAG), templates, companion device control, and export

### Key Differentiators

- **BYOK (Bring Your Own Key):** No subscription — use your own API keys
- **Local-first / Privacy-first:** All data stored locally. Zero cloud storage. Zero telemetry
- **Free + Open Source:** MIT license, fully self-hostable
- **Multi-provider:** OpenAI, Anthropic, Gemini, and Ollama local models
- **Production-grade:** Stealth testing, responsive layout, auto-updater, encrypted storage

---

## 2. Problem Statement & Vision

### The Problem

Knowledge workers, developers, students, and professionals frequently need AI assistance while working in applications where AI tools are either:

1. **Not available** (proprietary software, legacy tools, specialized platforms)
2. **Blocked** (proctored environments, corporate restrictions)
3. **Disruptive** (switching between windows breaks flow and context)
4. **Visible** (screen sharing in meetings exposes AI tool usage)

Existing AI assistants (ChatGPT, Claude, Copilot) require a visible browser window or sidebar. This creates friction and visibility concerns.

### The Vision

An AI assistant that:

- **Lives on top of everything** — always accessible, never in the way
- **Is completely invisible** to anyone viewing your screen remotely
- **Understands visual context** — sees what you see via screenshots
- **Works everywhere** — from any application, via global hotkeys
- **Respects privacy** — all data local, encrypted, no telemetry

### Target Users

| User | Use Case |
|------|----------|
| **Software Developers** | Code assistance while working in IDEs, debugging, algorithm help |
| **Students** | Study aid, test preparation, research assistance |
| **Professionals** | Meeting preparation, real-time talking points, document analysis |
| **Researchers** | Paper analysis, data interpretation, quick lookups |
| **Anyone** | General AI assistance without disrupting workflow |

### Primary Use Cases

1. **Coding Assistance:** User is on LeetCode/HackerRank, captures the problem, gets solution approach and code
2. **Meeting Support:** User is in a Zoom meeting, captures slides/discussion, gets talking points and summaries
3. **Document Analysis:** User captures a complex document or spreadsheet, asks AI for analysis
4. **Quick Lookups:** User asks a question without leaving their current app
5. **Study Aid:** User captures questions, gets explanations and answers

---

## 3. Market Research & Competitive Analysis

### Commercial Alternatives

| Product | Price | Model | Invisible? | BYOK? |
|---------|-------|-------|-----------|-------|
| Cluely | $60/mo | Subscription | Yes | No |
| Interview Coder | $20/mo | Subscription | Yes | No |
| ShadeCoder | $30/mo | Subscription | Yes | No |
| LockedIn AI | $40/mo | Subscription | Yes | No |
| Interview Browser | $25/mo | Subscription | Yes | No |
| Hiding AI | $20/mo | Subscription | Yes | No |
| Parakeet AI | $30/mo | Subscription | Yes | No |

### Open Source Alternatives

| Project | Stars | Notes |
|---------|-------|-------|
| Pluely | ~500 | Basic, limited features |
| OpenCluely | ~300 | Early stage |
| Natively | ~200 | macOS focused |
| free-cluely | ~150 | Minimal |
| Invisiwind | ~100 | C++ based |
| ScreenPrompt | ~50 | Python based |

### InvisiQ's Unique Position

- Only BYOK invisible overlay (no subscription lock-in)
- Multi-provider support (OpenAI + Anthropic + Gemini + Ollama)
- Local-first architecture (all data stays on machine)
- Production-grade features (auto-updater, encrypted storage, responsive layout)
- Comprehensive feature set (memory, templates, companion mode, export)

---

## 4. Core Innovation: Invisibility Engine

### The SetWindowDisplayAffinity Mechanism

InvisiQ's core innovation uses a Windows API that has existed since Windows 10 version 2004:

```
SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)
```

This tells the Desktop Window Manager (DWM) to:
- **Render** the window normally on the physical monitor
- **Exclude** the window from ALL capture API outputs

In Electron, this is exposed as a single method call:

```typescript
overlayWindow.setContentProtection(true);
```

This is the most critical line of code in the entire project. Without it, the app is visible to screen capture. Every BrowserWindow created MUST have this set.

### How It Works

```
Physical Monitor Output           Capture API Output
┌─────────────────────┐           ┌─────────────────────┐
│ User's application  │           │ User's application  │
│ ┌─────────────────┐ │           │                     │
│ │   InvisiQ       │ │           │  (InvisiQ is NOT    │
│ │   Overlay       │ │    →      │   visible here)     │
│ │   Window        │ │           │                     │
│ └─────────────────┘ │           │                     │
│ Desktop             │           │ Desktop             │
└─────────────────────┘           └─────────────────────┘
```

### Verified Invisible Against

| Tool | Status | Priority |
|------|--------|----------|
| Windows Snipping Tool | Invisible | Critical |
| Windows Print Screen | Invisible | Critical |
| Windows Game Bar (Win+G) | Invisible | Critical |
| OBS Studio (Display Capture) | Invisible | Critical |
| Zoom Screen Share | Invisible | Critical |
| Google Meet Screen Share | Invisible | High |
| Microsoft Teams Screen Share | Invisible | High |
| Discord Screen Share | Invisible | High |
| ShareX | Invisible | High |
| All browser-based proctoring | Invisible | Critical |

### Known Limitations

- **macOS 15+ (Sequoia):** Apple's ScreenCaptureKit ignores the `sharingType` flag — invisibility is NOT guaranteed
- **macOS 14 and below:** Works via `NSWindow.sharingType = NSWindowSharingNone`
- **Physical cameras:** Cannot prevent photography of the physical screen
- **Enterprise DLP agents:** Kernel-level process enumeration may detect the running process
- **Remote Desktop:** RDP sessions may not honor the affinity flag

### Stealth Reinforcement

Beyond content protection, InvisiQ implements multiple stealth layers:

1. **Stealth Watchdog:** Re-applies `setContentProtection(true)` every 2 seconds (in case it was dropped by OS updates or window state changes)
2. **Process Disguise:** Process name shown as "SystemHelper" in Task Manager (configurable)
3. **Skip Taskbar:** Window does not appear in taskbar or Alt+Tab
4. **No Title:** Empty window title prevents identification
5. **No Desktop Shortcut:** Installer creates no desktop/start menu shortcuts by default
6. **Product Name:** `electron-builder.yml` sets `productName: SystemHelper` (not "InvisiQ")

---

## 5. Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Electron | 33.2+ | Desktop shell, system APIs, content protection |
| **Frontend** | React | 18.3 | Component-based UI with custom hooks |
| **Language** | TypeScript | 5.7 | Strict mode, full type safety |
| **Styling** | TailwindCSS | 3.4 | Utility-first CSS with dark/light themes |
| **Build Tool** | electron-vite | 5.0 | Unified main/preload/renderer Vite build |
| **Animations** | framer-motion | 11.18 | AnimatePresence, spring physics, reduced-motion |
| **AI (OpenAI)** | openai | 4.75 | Official SDK with streaming SSE |
| **AI (Anthropic)** | @anthropic-ai/sdk | 0.35 | Official SDK with streaming SSE |
| **AI (Google)** | @google/generative-ai | 0.21 | Official SDK with streaming |
| **AI (Ollama)** | Native fetch | — | NDJSON streaming, /api/tags discovery |
| **OCR** | tesseract.js | 5.1 | Client-side text extraction for code detection |
| **Storage** | electron-store | 10.0 | Encrypted local data persistence |
| **Encryption** | Node.js crypto | — | AES-256-GCM + PBKDF2 key derivation |
| **Machine ID** | node-machine-id | 1.1 | Hardware-specific encryption key seed |
| **Auto-Update** | electron-updater | 6.8 | GitHub Releases auto-update |
| **Markdown** | react-markdown | 9.0 | Rich response rendering |
| **Syntax** | highlight.js | 11.10 | Code syntax highlighting |
| **Rehype** | rehype-highlight | 7.0 | Markdown → highlighted code bridge |
| **Icons** | lucide-react | 0.460 | UI iconography (200+ icons) |
| **QR Codes** | qrcode | 1.5 | Companion mode pairing QR generation |
| **WebSocket** | ws | 8.19 | Companion device real-time communication |
| **UUID** | uuid | 10.0 | Unique ID generation for messages, facts, devices |
| **Packaging** | electron-builder | 25.1 | Windows NSIS installer generation |
| **Plugin (React)** | @vitejs/plugin-react | 4.3 | Vite React fast refresh |
| **PostCSS** | postcss + autoprefixer | 8.4 | CSS processing pipeline |

### Dependencies (package.json)

**Production Dependencies (17):**
```
@anthropic-ai/sdk, @google/generative-ai, electron-store, electron-updater,
framer-motion, highlight.js, lucide-react, node-machine-id, openai, qrcode,
react, react-dom, react-markdown, rehype-highlight, tesseract.js, uuid, ws
```

**Dev Dependencies (12):**
```
@types/node, @types/qrcode, @types/react, @types/react-dom, @types/uuid,
@types/ws, @vitejs/plugin-react, autoprefixer, electron, electron-builder,
electron-vite, postcss, tailwindcss, typescript
```

---

## 6. Project Structure

```
ghostai/
├── CLAUDE.md                           # Development context for Claude Code
├── CHANGELOG.md                        # Version history
├── README.md                           # User-facing product documentation
├── documentation.md                    # THIS FILE — comprehensive docs
├── package.json                        # npm dependencies & scripts
├── package-lock.json                   # Dependency lock file
├── electron-builder.yml                # Windows packaging configuration
├── electron.vite.config.ts             # Build configuration (main/preload/renderer)
├── tsconfig.json                       # TypeScript project references
├── tsconfig.node.json                  # TypeScript config for main process
├── tsconfig.web.json                   # TypeScript config for renderer
├── tailwind.config.ts                  # TailwindCSS theming & design tokens
├── postcss.config.js                   # PostCSS plugins
│
├── docs/                               # Detailed project documentation
│   ├── InvisiQ-PRD.md                 # Full product requirements document
│   ├── InvisiQ-Wireframes.md          # UI mockups & design specifications
│   ├── InvisiQ-API-Contract.md        # IPC channels & AI provider interfaces
│   ├── InvisiQ-Planning.md            # Market research & architecture decisions
│   └── TESTING.md                     # Testing strategies & checklists
│
├── src/
│   ├── main/                          # ═══ Electron Main Process (Node.js) ═══
│   │   ├── index.ts                   # App entry, lifecycle, window creation
│   │   ├── overlay.ts                 # BrowserWindow config, content protection
│   │   ├── hotkeys.ts                 # globalShortcut registration & routing
│   │   ├── screenshot.ts             # desktopCapturer, hide/capture/show flow
│   │   ├── region-selector.ts        # Temporary full-screen selection window
│   │   ├── stealth.ts                # Process disguise, watchdog, alt-tab hiding
│   │   ├── store.ts                  # electron-store with encryption wrapper
│   │   ├── crypto.ts                 # AES-256-GCM + PBKDF2 key derivation
│   │   ├── ipc-handlers.ts           # All ipcMain.handle() registrations (~80 channels)
│   │   ├── conversations.ts          # Filesystem-based conversation CRUD
│   │   ├── clipboard.ts              # Smart paste via PowerShell SendKeys
│   │   ├── clipboard-monitor.ts      # Clipboard polling monitor (3s interval)
│   │   ├── monitors.ts              # Multi-monitor detection + management
│   │   ├── updater.ts               # electron-updater auto-update
│   │   ├── tray.ts                  # Optional system tray icon
│   │   ├── audio-capture.ts         # System audio loopback capture (WASAPI)
│   │   ├── companion-server.ts      # HTTP + WebSocket server for mobile companion
│   │   ├── export-service.ts        # JSON/MD/TXT/PDF conversation export
│   │   ├── template-store.ts        # Prompt template CRUD in electron-store
│   │   └── memory.ts               # TF-IDF RAG memory store (500 facts max)
│   │
│   ├── preload/
│   │   └── index.ts                  # contextBridge — exposes ghostAPI to renderer
│   │
│   ├── renderer/                     # ═══ React Frontend ═══
│   │   ├── index.html                # HTML entry point
│   │   ├── main.tsx                  # React entry point
│   │   ├── App.tsx                   # Root component (~650 lines)
│   │   │
│   │   ├── components/               # 30+ UI components
│   │   │   ├── HeaderBar.tsx         # Drag handle, mode/model selectors, settings
│   │   │   ├── ChatPanel.tsx         # Message list, scroll, keyboard nav, welcome
│   │   │   ├── MessageBubble.tsx     # Single message with markdown + copy/paste
│   │   │   ├── CodeBlock.tsx         # Syntax highlighted code + copy/paste buttons
│   │   │   ├── InputArea.tsx         # Text input, send/stop, screenshot, mic
│   │   │   ├── StatusBar.tsx         # Connection dot, token count, cost breakdown
│   │   │   ├── Settings.tsx          # Slide-in panel with 8-tab sidebar
│   │   │   ├── SettingsHotkeys.tsx   # Hotkey recording + conflict detection
│   │   │   ├── SettingsDisplay.tsx   # Theme, opacity, font size, window size
│   │   │   ├── SettingsPrivacy.tsx   # Toggles, process name, clear data
│   │   │   ├── SettingsAudio.tsx     # Speech engine, language, meeting controls
│   │   │   ├── SettingsMemory.tsx    # Memory enable/auto-extract, sliders, stats
│   │   │   ├── SettingsCompanion.tsx # Server control, QR, devices, auto-start
│   │   │   ├── TranscriptPanel.tsx   # Live speech transcript with timer
│   │   │   ├── ModeSelector.tsx      # Dropdown: built-in + custom modes
│   │   │   ├── ModelSelector.tsx     # Dropdown: grouped by provider
│   │   │   ├── OpacityControl.tsx    # Hover-reveal opacity slider
│   │   │   ├── CustomModeEditor.tsx  # Modal for creating/editing custom modes
│   │   │   ├── ConversationHistory.tsx # Slide-in history with search
│   │   │   ├── MemoryPanel.tsx       # Slide-in memory browser with search
│   │   │   ├── TemplateLibrary.tsx   # Template grid + variable substitution
│   │   │   ├── MeetingPanel.tsx      # Live transcript + detected questions
│   │   │   ├── Toast.tsx             # Toast notification system
│   │   │   ├── RegionOverlay.tsx     # Full-screen region selection UI
│   │   │   ├── InlineRegionSelector.tsx # Canvas-based in-overlay snipping
│   │   │   ├── CodeDetectionCard.tsx # Platform detection notification
│   │   │   ├── OnboardingFlow.tsx    # First-launch 3-step wizard
│   │   │   ├── OnboardingApiKey.tsx  # Onboarding step 1: API key setup
│   │   │   ├── OnboardingHotkeys.tsx # Onboarding step 2: shortcut reference
│   │   │   ├── OnboardingStealthTest.tsx # Onboarding step 3: stealth test
│   │   │   ├── UpdateNotification.tsx # Auto-update toast notifications
│   │   │   └── ui/                   # Shared UI primitives (GhostButton, etc.)
│   │   │
│   │   ├── hooks/                    # 16+ custom React hooks
│   │   │   ├── useAI.ts             # AI chat logic, streaming, abort
│   │   │   ├── useScreenshot.ts     # Screenshot state, auto-attach
│   │   │   ├── useSettings.ts       # Settings read/write via IPC
│   │   │   ├── useHotkeys.ts        # Listen for hotkey events from main
│   │   │   ├── useConversation.ts   # Message history, persistence, auto-save
│   │   │   ├── useConversationHistory.ts # Conversation list, search, export
│   │   │   ├── useAudioTranscription.ts  # Speech-to-text streaming
│   │   │   ├── useTokenCost.ts      # Token/cost tracking per request/convo/session
│   │   │   ├── useWindowSize.ts     # Responsive breakpoints
│   │   │   ├── useInternalKeyboard.ts # Ctrl+, Ctrl+L, Ctrl+K, Ctrl+T
│   │   │   ├── useClickThrough.ts   # Mouse passthrough toggle
│   │   │   ├── useCodeDetection.ts  # Periodic OCR + platform/language classifier
│   │   │   ├── useLiveTranscription.ts # System audio chunk pipeline
│   │   │   ├── useMeetingAssistant.ts  # Interrogative heuristics
│   │   │   ├── useMemory.ts         # RAG context injection + auto-extract
│   │   │   └── useTemplates.ts      # Template CRUD
│   │   │
│   │   ├── services/
│   │   │   ├── ai-providers/
│   │   │   │   ├── types.ts         # AIProvider interface, ChatRequest, etc.
│   │   │   │   ├── provider-manager.ts # Provider registry, lazy-loading
│   │   │   │   ├── openai.ts        # OpenAI adapter (SSE streaming)
│   │   │   │   ├── anthropic.ts     # Anthropic adapter (SSE streaming)
│   │   │   │   ├── gemini.ts        # Google Gemini adapter (SSE streaming)
│   │   │   │   └── ollama.ts        # Ollama adapter (NDJSON streaming)
│   │   │   ├── speech.ts           # Web Speech API + Whisper fallback
│   │   │   └── ocr-service.ts      # Tesseract.js wrapper
│   │   │
│   │   ├── styles/
│   │   │   └── globals.css          # Tailwind directives + custom CSS + animations
│   │   │
│   │   ├── constants/               # Built-in template definitions
│   │   │
│   │   └── types/
│   │       └── global.d.ts          # Window.ghostAPI + SpeechRecognition types
│   │
│   └── shared/                      # ═══ Cross-Process Types & Constants ═══
│       ├── types.ts                 # All TypeScript type definitions
│       ├── constants.ts             # Default hotkeys, modes, model configs, settings
│       ├── errors.ts                # InvisiQError enum + HTTP error mapper
│       └── logger.ts               # Production-safe logger
│
├── assets/
│   └── icons/                       # App icons (256x256, 128x128, etc.)
│
├── native/                          # Optional C++ addon (fallback)
│   └── window-utils/
│       ├── binding.gyp
│       └── window-utils.cc
│
└── scripts/
    └── verify-build.ts             # Pre-build security/stealth verification
```

---

## 7. Architecture

### Process Model

InvisiQ follows Electron's multi-process architecture with strict security boundaries:

```
┌─────────────────────────────────────────────────────────────────┐
│                        MAIN PROCESS (Node.js)                   │
│                                                                 │
│  ┌────────────┐  ┌────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │  Overlay    │  │  Hotkeys   │  │ Screenshot  │  │  Store   │ │
│  │  Window     │  │  Manager   │  │ Capture     │  │ (AES256) │ │
│  └────────────┘  └────────────┘  └─────────────┘  └──────────┘ │
│  ┌────────────┐  ┌────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │  Monitor   │  │  Updater   │  │   Stealth   │  │  System  │ │
│  │  Manager   │  │            │  │  Watchdog   │  │  Tray    │ │
│  └────────────┘  └────────────┘  └─────────────┘  └──────────┘ │
│  ┌────────────┐  ┌────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │ Companion  │  │  Export    │  │   Memory    │  │ Template │ │
│  │  Server    │  │  Service   │  │   Store     │  │  Store   │ │
│  └────────────┘  └────────────┘  └─────────────┘  └──────────┘ │
│                                                                 │
│                      IPC Bridge (ipcMain.handle)                │
├────────────────────────┬────────────────────────────────────────┤
│     PRELOAD SCRIPT     │     contextBridge.exposeInMainWorld    │
├────────────────────────┴────────────────────────────────────────┤
│                     RENDERER PROCESS (Browser)                  │
│                                                                 │
│  ┌──────────┐  ┌───────────┐  ┌───────────┐  ┌──────────────┐  │
│  │ Chat UI  │  │    AI     │  │ Settings  │  │  Onboarding  │  │
│  │ Panel    │  │ Providers │  │  Panel    │  │   Wizard     │  │
│  └──────────┘  └───────────┘  └───────────┘  └──────────────┘  │
│                                                                 │
│  OpenAI ─── Anthropic ─── Gemini ─── Ollama (local)            │
│    ↕             ↕            ↕          ↕                      │
│  Cloud API    Cloud API   Cloud API  localhost:11434            │
└─────────────────────────────────────────────────────────────────┘
```

### Security Model

| Rule | Enforcement |
|------|-------------|
| **contextIsolation** | Always `true` — renderer cannot access Node.js |
| **nodeIntegration** | Always `false` — no `require()` in renderer |
| **sandbox** | `false` (needed for preload IPC) |
| **Communication** | All via `ipcRenderer.invoke()` / `ipcMain.handle()` |
| **API Surface** | Only `window.ghostAPI` exposed via contextBridge |
| **Argument Validation** | All IPC arguments validated in main process handlers |
| **No Secrets in Logs** | API keys never logged anywhere |

### Data Flow: User Message → AI Response

```
1. User types message in InputArea
       │
2. App.tsx handleSend() fires
       │
3. Memory context injected (if enabled)
       │  └── useMemory.buildContextPrefix(query) → search facts → prepend
       │
4. Meeting transcript injected (if meeting mode + auto-include)
       │  └── Prepend transcript text to user message
       │
5. useAI.sendMessage() called
       │
6. Provider resolved via providerManager.resolveProvider(modelId)
       │  └── Lazy-loads SDK if first use (~4MB saved at startup)
       │
7. API key retrieved via IPC: store:get-api-key
       │
8. ChatRequest built with: messages[], systemPrompt, images[], model
       │
9. provider.chat(request) returns AsyncGenerator<StreamChunk>
       │
10. Tokens streamed: onToken(text) → appendToMessage(id, text)
       │
11. ChatPanel renders progressively via memoized ReactMarkdown
       │
12. Stream ends → onDone(usage) → record token costs
       │
13. Conversation auto-saved via debounced IPC (500ms)
       │
14. Auto-extract facts from user message (if memory.autoExtract)
```

### Screenshot Capture Sequence

The overlay must be hidden before capturing, otherwise the content protection creates a blank spot:

```
1. overlayWindow.hide()              // Hide our overlay
2. await sleep(100)                  // Wait 100ms for DWM to recompose
3. desktopCapturer.getSources()      // Capture screen content
4. overlayWindow.show()              // Restore overlay
5. Resize image to max 1920px        // Save tokens on API calls
6. Return base64 PNG via IPC         // To renderer for display/sending
```

**Silent capture** (`captureSilent()`) skips the hide/show cycle — used for background OCR tasks where the overlay appears as a blank spot (acceptable for code detection).

### BrowserWindow Configuration

```typescript
const overlayWindow = new BrowserWindow({
  width: 420,
  height: 600,
  transparent: true,          // Window chrome is transparent
  frame: false,               // No OS title bar
  alwaysOnTop: true,          // Stays above all other windows
  skipTaskbar: true,          // Hidden from taskbar
  resizable: true,
  focusable: true,
  title: '',                  // Empty title for stealth
  hasShadow: false,           // No OS shadow
  webPreferences: {
    preload: path.join(__dirname, '../preload/index.js'),
    contextIsolation: true,   // CRITICAL — security boundary
    nodeIntegration: false,   // CRITICAL — no Node in renderer
    sandbox: false,           // Required for preload IPC
  },
});

// CRITICAL — Makes window invisible to screen capture
overlayWindow.setContentProtection(true);

// Position bottom-right corner
const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
overlayWindow.setPosition(screenW - 440, screenH - 620);
```

---

## 8. Main Process Modules

### 8.1 index.ts — App Entry & Lifecycle

**Location:** `src/main/index.ts`

The application entry point managing Electron lifecycle, startup sequence, and process initialization.

**Startup Sequence:**
1. Request single instance lock (prevent duplicate instances)
2. `app.whenReady()`:
   - Disguise process name (from settings, default: "SystemHelper")
   - Setup CORS bypass for AI API domains
   - Register all IPC handlers
   - Create overlay window
   - Initialize multi-monitor manager
   - Apply full stealth measures
   - Load renderer (dev URL or production file)
   - Register global hotkeys
3. Deferred tasks (after `did-finish-load`):
   - Ensure conversations directory exists
   - Start stealth watchdog
   - Initialize auto-updater
   - Create system tray (if enabled)
   - Initialize memory store

**CORS Bypass:**
Injects `Access-Control-Allow-Origin: *` headers into AI API responses and strips `Sec-Fetch-*` headers from outgoing requests. This is necessary because the renderer makes direct HTTPS requests to AI providers from a `file://` origin.

### 8.2 overlay.ts — Window Creation & Content Protection

**Location:** `src/main/overlay.ts`

Creates and manages the invisible overlay BrowserWindow.

**Key Exports:**
- `createOverlayWindow()` — Creates BrowserWindow with all stealth settings
- `showOverlay()` / `hideOverlay()` / `toggleOverlay()` — Visibility control
- `setOverlayOpacity(opacity)` — Clamps 0.1-1.0
- `setOverlayPosition(x, y)` / `setOverlaySize(width, height)` — Saves state
- `setPassthrough(enabled, forward)` — Click-through mode via `setIgnoreMouseEvents()`
- `getOverlayWindow()` / `getOverlayBounds()` — Accessors

**Position Validation:** On `show` event, validates overlay position against connected displays. Snaps to primary display bottom-right if off-screen (handles monitor disconnect).

### 8.3 hotkeys.ts — Global Keyboard Shortcuts

**Location:** `src/main/hotkeys.ts`

Registers and manages global hotkeys via Electron's `globalShortcut` API.

**Key Exports:**
- `registerAllHotkeys()` — Reads from settings, registers all shortcuts
- `handleHotkeyAction(action)` — Routes to overlay controls or sends IPC event
- `updateHotkey(action, shortcut)` — Validates, tests registration, saves
- `unregisterAllHotkeys()` — Cleanup on quit

**Action Routing:**
- `toggle-overlay` → `toggleOverlay()`
- `hide-overlay` → `hideOverlay()`
- `capture-screen` → Hides overlay, captures, sends IPC
- `capture-region` → Opens region selector window
- All others → Sends `hotkeys:triggered` IPC to renderer

### 8.4 screenshot.ts — Screen Capture

**Location:** `src/main/screenshot.ts`

Handles all screen capture operations via Electron's `desktopCapturer`.

**Key Exports:**
- `captureFullScreen(monitorId?)` — Full hide→capture→show cycle with resize
- `captureRegion(x, y, w, h, monitorId?)` — Capture + crop to coordinates
- `captureForSnip()` — Full-res capture for inline region selector (shows overlay after capture)
- `captureSilent(monitorId?)` — Background capture without hide/show (for OCR)

**Image Processing:**
- Matches desktopCapturer source to display by `display_id`
- Respects HiDPI `scaleFactor` for thumbnail sizing
- Resizes to max 1920px width before base64 encoding
- Returns `ScreenshotResult { base64, width, height, timestamp }`

### 8.5 stealth.ts — Process Disguise & Watchdog

**Location:** `src/main/stealth.ts`

Implements multiple stealth layers beyond content protection.

**Key Exports:**
- `ensureContentProtection(win)` — Sets `setContentProtection(true)`
- `disguiseProcess(name)` — Sets `app.setName()` and `process.title`
- `hideFromTaskbar(win)` — `setSkipTaskbar(true)`
- `hideFromAltTab(win)` — Same as above
- `applyFullStealth(win)` — All of the above + prevent title updates
- `startStealthWatchdog(win, intervalMs)` — Re-applies content protection every 2s

### 8.6 store.ts — Encrypted Settings Storage

**Location:** `src/main/store.ts`

Persistent storage via electron-store with AES-256-GCM encryption for API keys.

**Key Exports:**
- `getSettings()` / `setSettings(settings)` — Full AppSettings
- `getSetting(key)` / `setSetting(key, value)` — Single key
- `getNestedSetting(key)` / `setNestedSetting(key, value)` — Dot notation paths
- `setApiKey(provider, key)` / `getApiKey(provider)` — Encrypt/decrypt
- `removeApiKey(provider)` — Delete + mark `hasKey: false`
- `clearAll()` — Nuke entire store

### 8.7 ipc-handlers.ts — IPC Channel Registry

**Location:** `src/main/ipc-handlers.ts`

Central dispatcher registering ~80 IPC channels organized by domain.

**Channel Groups:**
| Domain | Count | Examples |
|--------|-------|---------|
| Overlay | 8 | toggle, hide, show, set-opacity, set-passthrough |
| Screenshot | 6 | capture-full, capture-region, capture-silent, crop-region |
| Monitors | 2 | get-all, move-overlay |
| Store | 8 | get, set, set-api-key, get-api-key, clear-all |
| Hotkeys | 2 | register-all, update |
| Clipboard | 6 | copy, read, smart-paste, start-monitor, stop-monitor |
| Conversation | 7 | save, load, list, delete, search, export, delete-all |
| Modes | 3 | list, save, delete |
| App | 3 | get-info, quit, open-data-folder |
| Update | 3 | check, download, install |
| Audio | 3 | start-system-capture, stop-system-capture, capture-status |
| Companion | 4 | start, stop, status, devices |
| Templates | 3 | list, save, delete |
| Export | 2 | conversation, save-dialog |
| Memory | 7 | search, add, delete, list, clear-all, stats, extract |

### 8.8 conversations.ts — Chat Persistence

**Location:** `src/main/conversations.ts`

Filesystem-based conversation CRUD. Each conversation is stored as a separate JSON file in `%APPDATA%/ghostai/conversations/`.

**Key Exports:**
- `ensureConversationsDir()` — Creates directory on startup
- `saveConversation(conv)` — Auto-generates title from first user message
- `loadConversation(id)` — Returns `Conversation | null`
- `listConversations()` — Returns `ConversationMeta[]` sorted by `updatedAt`
- `deleteConversation(id)` — Unlinks file
- `searchConversations(query)` — Case-insensitive search on title + content
- `exportConversation(id, format)` — Formats as markdown/text
- `deleteAllConversations()` — Purges all files

### 8.9 clipboard.ts — Smart Paste

**Location:** `src/main/clipboard.ts`

Pastes text into the active application using PowerShell to simulate keyboard input.

**`smartPaste(text)` Flow:**
1. Save current clipboard contents
2. Write new text to clipboard
3. Drop overlay from always-on-top
4. Blur overlay window
5. Hide overlay
6. Wait 250ms for target app to gain focus
7. PowerShell executes `SetForegroundWindow` + `SendKeys(^v)`
8. Restore overlay + original clipboard contents

### 8.10 clipboard-monitor.ts — Clipboard Polling

**Location:** `src/main/clipboard-monitor.ts`

Polls system clipboard every 3 seconds using MD5 hash comparison.

**Key Exports:**
- `startClipboardMonitor(intervalMs)` — Starts polling, sends `clipboard:changed` on new content
- `stopClipboardMonitor()` — Clears interval
- `isClipboardMonitorRunning()` — Status check

### 8.11 monitors.ts — Multi-Monitor Support

**Location:** `src/main/monitors.ts`

Detects connected displays, handles hot-plug events, manages overlay positioning.

**Key Exports:**
- `initMonitorManager(overlayWindow)` — Listens to display-added/removed/metrics-changed
- `getMonitors()` — Returns `MonitorInfo[]`
- `getMonitorForOverlay()` — Returns display containing overlay
- `getMonitorAtCursor()` — Returns display at cursor position
- `moveOverlayToMonitor(monitorId)` — Maintains relative position
- `validateOverlayPosition()` — Snaps to primary if off-screen

### 8.12 updater.ts — Auto-Update

**Location:** `src/main/updater.ts`

GitHub Releases-based auto-update via electron-updater.

**Key Exports:**
- `initializeAutoUpdater(overlayWindow)` — Configures events, defers first check 10s
- `checkForUpdates()` — Manual check
- `downloadUpdate()` — Downloads update package
- `installUpdate()` — `quitAndInstall()`

**Renderer Events:** `update:checking`, `update:available`, `update:not-available`, `update:progress`, `update:downloaded`, `update:error`

### 8.13 tray.ts — System Tray

**Location:** `src/main/tray.ts`

Optional system tray icon (disabled by default for stealth).

**Features:**
- Context menu: Show/Hide overlay, Quit
- Empty tooltip (stealth)
- 16x16 icon
- Created only if `privacy.showTrayIcon` is `true`

### 8.14 audio-capture.ts — System Audio Capture

**Location:** `src/main/audio-capture.ts`

Captures system audio (loopback) or microphone for live transcription.

**Capture Strategy:**
1. Try native `electron-audio-loopback` module
2. Fall back to PowerShell WASAPI via C# P/Invoke
3. Emit base64 PCM chunks to renderer via `audio:chunk` IPC

**Key Exports:**
- `startSystemCapture(overlayWin, source, chunkIntervalMs)` — Returns `{ success, method }`
- `stopSystemCapture()` — Stops active session
- `getCaptureStatus()` — Returns `{ active, method }`

### 8.15 companion-server.ts — Companion Device Server

**Location:** `src/main/companion-server.ts`

HTTP + WebSocket server for mobile/web companion app control.

**Server Details:**
- Binds to `0.0.0.0` (LAN accessible) on port 3847 (configurable, sequential port scan)
- HTTP endpoints: `GET /status`, `POST /pair`
- WebSocket: Authenticated via paired device ID in URL params

**Pairing Flow:**
1. Server generates one-time UUID pairing token
2. QR code contains `http://{LAN_IP}:{PORT}/pair?token={TOKEN}`
3. Device scans QR, POSTs to `/pair` with token + device info
4. Server returns persistent `deviceId`
5. Device connects to WebSocket with `deviceId`
6. Token is consumed (one-time use)

**Key Exports:**
- `startCompanionServer(port)` — Returns `{ success, url, qrDataUrl }`
- `stopCompanionServer()` — Closes all connections
- `getCompanionStatus()` — Returns running state + connected devices
- `broadcastToCompanions(data)` / `sendToCompanion(deviceId, data)`

### 8.16 export-service.ts — Conversation Export

**Location:** `src/main/export-service.ts`

Exports conversations to multiple formats.

**Supported Formats:**
| Format | Method | Output |
|--------|--------|--------|
| JSON | Direct serialization | Full conversation object |
| Markdown | Custom formatter | Headers, timestamps, code blocks |
| Plain Text | Custom formatter | Simple text with underlines |
| PDF | Hidden BrowserWindow + `printToPDF()` | Styled HTML rendered to PDF |

**Output:** Saved to `app.getPath('downloads')` with sanitized filename + timestamp.

### 8.17 template-store.ts — Prompt Templates

**Location:** `src/main/template-store.ts`

CRUD for prompt templates stored in electron-store.

**Key Exports:**
- `listTemplates()` — Returns `{ builtIn, custom }`
- `saveTemplate(template)` — Creates/updates custom template
- `deleteTemplate(id)` — Removes custom template
- `recordTemplateUsage(id)` — Increments usage count, updates recent IDs

**Built-in Templates:** 20 templates across 8 categories (coding, writing, analysis, meeting, solve, research, debugging, custom).

### 8.18 memory.ts — TF-IDF Memory Store (RAG)

**Location:** `src/main/memory.ts`

Local in-memory fact storage with TF-IDF search. Persists to `%APPDATA%/ghostai/memory.json`.

**MemoryStore Class:**
- `load()` — Reads JSON, rebuilds TF-IDF index
- `search(query, limit)` — Tokenize → TF-IDF vectors → cosine similarity → ranked results
- `add(content, source, tags)` — UUID generation, FIFO eviction at max 500, corpus update
- `delete(id)` — Remove + update corpus
- `list(page, limit)` — Paginated, newest first
- `clearAll()` — Nuke all facts
- `stats()` — Total facts, size, oldest/newest timestamps
- `extractFromConversation(convId)` — Heuristic extraction using regex patterns

**TF-IDF Implementation:**
- 40+ stop words excluded
- Tokenization: lowercase, split on `\W+`, filter words < 3 chars
- TF = term frequency within document
- IDF = log(totalDocs / (1 + docFreq))
- Ranking: cosine similarity between query and fact TF-IDF vectors
- Index rebuild takes < 5ms for 500 facts

**Heuristic Extraction Patterns:**
```
/\bi\s+(am|prefer|like|love|hate|always|never|use|work|live)\b/i
/\bmy\s+(name|job|role|company|language|framework|favorite|preferred)\b/i
/\bremember\s+that\b/i
/\bi\s+(want|need|don'?t\s+want)\b/i
/\balways\s+(use|do|prefer|avoid)\b/i
```

### 8.19 region-selector.ts — Region Selection Window

**Location:** `src/main/region-selector.ts`

Creates a temporary full-screen transparent window for rubber-band region selection.

**Flow:**
1. Creates full-screen BrowserWindow on cursor's monitor
2. Sets `setContentProtection(true)` (invisible even while selecting)
3. Loads inline HTML with crosshair cursor and drag handlers
4. User drags to select region → coordinates sent via `document.title` JSON
5. Calls `captureRegion()` with selected coordinates
6. Returns `ScreenshotResult` or `null` on cancel (Escape)

---

## 9. Preload Script

**Location:** `src/preload/index.ts`

The preload script uses Electron's `contextBridge.exposeInMainWorld()` to create a safe API surface accessible from the renderer as `window.ghostAPI`.

### Full API Surface

```typescript
window.ghostAPI = {
  // ── Overlay Management ──
  overlay: {
    toggle(): Promise<void>,
    hide(): Promise<void>,
    show(): Promise<void>,
    setOpacity(opacity: number): Promise<void>,
    setPosition(x: number, y: number): Promise<void>,
    setSize(width: number, height: number): Promise<void>,
    getBounds(): Promise<{ x, y, width, height }>,
    setPassthrough(enabled: boolean, options?: { forward: boolean }): Promise<void>,
  },

  // ── Screenshot Operations ──
  screenshot: {
    captureFull(monitorId?: string): Promise<ScreenshotResult>,
    captureRegion(): Promise<ScreenshotResult | null>,
    getMonitors(): Promise<MonitorInfo[]>,
    captureSilent(monitorId?: string): Promise<ScreenshotResult>,
    captureForSnip(): Promise<ScreenshotResult>,
    cropRegion(request: RegionCropRequest): Promise<ScreenshotResult>,
  },

  // ── Multi-Monitor ──
  monitors: {
    getAll(): Promise<MonitorInfo[]>,
    moveOverlay(monitorId: string): Promise<void>,
  },

  // ── Settings & Storage ──
  store: {
    get(key: string): Promise<unknown>,
    set(key: string, value: unknown): Promise<void>,
    getAll(): Promise<AppSettings>,
    setApiKey(provider: string, key: string): Promise<{ success, error? }>,
    getApiKey(provider: string): Promise<string | null>,
    removeApiKey(provider: string): Promise<void>,
    clearAll(): Promise<void>,
  },

  // ── Hotkeys ──
  hotkeys: {
    registerAll(): Promise<{ registered: string[] }>,
    update(action: string, shortcut: string): Promise<{ success, error? }>,
  },

  // ── Clipboard ──
  clipboard: {
    copy(text: string): Promise<void>,
    read(): Promise<string>,
    smartPaste(text: string): Promise<void>,
    startMonitor(): Promise<void>,
    stopMonitor(): Promise<void>,
    monitorStatus(): Promise<{ running: boolean }>,
  },

  // ── Modes ──
  modes: {
    list(): Promise<Mode[]>,
    save(mode: CustomMode): Promise<void>,
    delete(id: string): Promise<void>,
  },

  // ── Conversations ──
  conversation: {
    save(conv: Conversation): Promise<void>,
    load(id: string): Promise<Conversation | null>,
    list(): Promise<ConversationMeta[]>,
    delete(id: string): Promise<boolean>,
    search(query: string): Promise<ConversationMeta[]>,
    export(id: string, format: string): Promise<string>,
    deleteAll(): Promise<number>,
  },

  // ── App Lifecycle ──
  app: {
    getInfo(): Promise<AppInfo>,
    quit(): Promise<void>,
    openDataFolder(): Promise<void>,
  },

  // ── Auto-Update ──
  update: {
    check(): Promise<void>,
    download(): Promise<void>,
    install(): Promise<void>,
  },

  // ── Audio Capture ──
  audio: {
    startSystemCapture(source?: string, chunkMs?: number): Promise<{ success, method }>,
    stopSystemCapture(): Promise<void>,
    captureStatus(): Promise<{ active, method }>,
  },

  // ── Companion Server ──
  companion: {
    start(port?: number): Promise<{ success, qrDataUrl? }>,
    stop(): Promise<void>,
    status(): Promise<{ running, connectedDevices[], port }>,
    devices(): Promise<CompanionDevice[]>,
  },

  // ── Templates ──
  template: {
    list(): Promise<{ builtIn, custom }>,
    save(template: PromptTemplate): Promise<void>,
    delete(id: string): Promise<void>,
  },

  // ── Export ──
  export: {
    conversation(id: string, format: string): Promise<{ success, path? }>,
    saveDialog(defaultPath: string): Promise<string | null>,
  },

  // ── Memory (RAG) ──
  memory: {
    search(query: string, limit?: number): Promise<MemorySearchResult[]>,
    add(content: string, tags?: string[]): Promise<{ id: string }>,
    delete(id: string): Promise<{ success: boolean }>,
    list(page?: number): Promise<{ facts: MemoryFact[], total: number }>,
    clearAll(): Promise<{ count: number }>,
    stats(): Promise<MemoryStats>,
    extract(conversationId: string): Promise<{ extracted: number }>,
  },

  // ── Event System ──
  on(channel: string, callback: (...args: unknown[]) => void): () => void,
  off(channel: string, callback: (...args: unknown[]) => void): void,
};
```

### Whitelisted Renderer Event Channels

Only these channels can be received by the renderer (security whitelist):

```
hotkeys:triggered, overlay:visibility-changed, screenshot:captured,
app:error, clipboard:changed, monitors:changed,
update:checking, update:available, update:not-available,
update:progress, update:downloaded, update:error,
audio:chunk,
companion:message, companion:device-connected, companion:device-disconnected
```

---

## 10. Renderer: Components

### 10.1 App.tsx — Root Component (~650 lines)

The root component orchestrating all application state and sub-components.

**Key State:**
- Chat: messages, conversationId, streaming status
- Settings: full AppSettings object, active mode/model
- UI panels: settings, history, custom mode editor, meeting panel, memory panel, template library
- Screenshots: pending attachments, inline snip state
- Audio: transcription state (lifted for sharing between TranscriptPanel + InputArea)

**Hooks Consumed:**
- `useConversation()` — message CRUD, auto-save, persistence
- `useSettings()` — load/save settings via IPC
- `useAI()` — AI provider streaming
- `useScreenshot()` — capture + region selection
- `useClickThrough()` — overlay passthrough toggle
- `useHotkeys()` — register global hotkey callbacks
- `useAudioTranscription()` — microphone transcription
- `useLiveTranscription()` — system audio capture
- `useMeetingAssistant()` — question detection
- `useCodeDetection()` — periodic OCR platform/language detection
- `useMemory()` — RAG context injection
- `useTokenCost()` — token/cost tracking
- `useInternalKeyboard()` — Ctrl+K, Ctrl+L, Ctrl+T
- `useWindowSize()` — responsive breakpoints

**Component Tree:**
```
App
├── MotionConfig (reduced motion)
├── OnboardingFlow (if first launch)
├── ToastProvider
│   ├── ClipboardListener
│   ├── UpdateNotification
│   └── Main UI (flex column):
│       ├── HeaderBar
│       ├── ChatPanel
│       ├── TranscriptPanel
│       ├── InputArea
│       ├── CodeDetectionCard (AnimatePresence)
│       ├── StatusBar
│       ├── MeetingPanel (absolute overlay)
│       ├── MemoryPanel (absolute overlay)
│       ├── TemplateLibrary (AnimatePresence)
│       ├── Settings (slide-right)
│       ├── ConversationHistory (slide-left)
│       ├── CustomModeEditor (modal)
│       └── InlineRegionSelector (full-screen)
```

### 10.2 HeaderBar.tsx

Top bar with drag handle, selectors, and action buttons.

**Layout (left to right):**
- Drag grip handle (`-webkit-app-region: drag`)
- History button → opens ConversationHistory
- New Chat button → starts new conversation
- ModeSelector dropdown (built-in + custom modes)
- ModelSelector dropdown (grouped by provider)
- Flex spacer
- OpacityControl (hover-reveal slider)
- Click-through toggle button (Phase 4)
- Settings gear button
- Close (X) button

### 10.3 ChatPanel.tsx

Scrollable message list with keyboard navigation and welcome screen.

**Features:**
- Arrow Up/Down to focus messages, Escape to unfocus
- Auto-scroll to bottom (unless user scrolled up)
- Memoized `MessageBubble` components prevent re-renders during streaming
- Thinking dots animation while waiting for first token
- Welcome screen when empty (shows logo + hotkey reference)

### 10.4 MessageBubble.tsx

Individual message rendering with markdown support.

**Message Types:**
- **User:** Right-aligned blue bubble, shows attached screenshot thumbnails
- **Assistant:** Left-aligned dark bubble, ReactMarkdown rendering, streaming cursor
- **Error:** Red alert box with error icon

**Actions:** Copy button (2s "Copied!" feedback), Paste button (calls smartPaste), token count display

**ReactMarkdown Custom Renderers:** `code` → CodeBlock, `a` → external links, themed `p`, `ul`, `ol`, `h1-h3`, `blockquote`

### 10.5 CodeBlock.tsx

Syntax-highlighted code with copy/paste actions.

**Features:**
- `hljs.highlight()` for syntax coloring
- Language label in header bar
- Copy + Paste buttons
- Falls back to plain text if language unknown
- Uses `dangerouslySetInnerHTML` with memoized highlight result (avoids React reconciliation issues during streaming)

### 10.6 InputArea.tsx

Text input with screenshot previews, mic button, and send/stop.

**Features:**
- Auto-expanding textarea (max 100px height)
- Screenshot preview grid with remove buttons (max 3)
- Mic button with pulse animation when listening
- Enter to send, Shift+Enter for newline
- Send/Stop button toggle based on streaming state
- Template injection via `injectedText` prop
- Interim transcript shown as placeholder

### 10.7 StatusBar.tsx

Connection status, token count, and cost breakdown.

**Display:** Status dot (green/red/blue) + text + token count + estimated cost
**Hover Tooltip:** Breakdown of last request, conversation total, session total

### 10.8 Settings.tsx

Slide-in settings panel with 8-tab left sidebar.

**Tabs:**
1. **API Keys** — Provider setup (OpenAI, Anthropic, Gemini, Ollama), masked input, test/validate, status indicators
2. **Hotkeys** — SettingsHotkeys component
3. **Display** — SettingsDisplay component
4. **Privacy** — SettingsPrivacy component
5. **Audio** — SettingsAudio component
6. **Memory** — SettingsMemory component
7. **Companion** — SettingsCompanion component
8. **Templates** — Template management

### 10.9 SettingsHotkeys.tsx

Hotkey recording and conflict detection.

**Features:**
- Click any shortcut to enter recording mode (animated pulse)
- Captures key combinations (requires Ctrl/Alt/Shift modifier)
- Conflict detection (warns if shortcut already in use)
- Auto-saves on valid shortcut capture
- Reset to Defaults button
- Read-only Internal Shortcuts section (Ctrl+,, Ctrl+K, Ctrl+L, Ctrl+T)

### 10.10 ConversationHistory.tsx

Slide-in panel with conversation browser.

**Features:**
- Search input for filtering
- Conversation cards: mode color dot, title, preview, model, relative time, message count
- Hover reveals Export + Delete buttons
- Active conversation highlighted with left border
- Skeleton loaders while loading
- Clear All with 3-second confirmation double-tap

### 10.11 MeetingPanel.tsx

Live meeting assistant with transcript and detected questions.

**Features:**
- System audio start/stop control
- Capture method indicator (native/powershell/unavailable)
- Detected questions section (max 5): each card has "Use as prompt" + dismiss
- Live transcript display with clear button
- Scrollable transcript area

### 10.12 MemoryPanel.tsx

Slide-in memory browser.

**Features:**
- Brain icon with fact count badge
- Search input (debounced 300ms)
- Add new fact form
- Paginated fact list (20 per page)
- Each fact: content, source label, date, delete button
- Pagination controls

### 10.13 TemplateLibrary.tsx

Modal template browser with variable substitution.

**Features:**
- Search input + category filter tabs (8 categories)
- Template cards: name, description, category badge
- Click → opens VariableDialog if template has `{{variables}}`
- Variable form with required field markers
- Submit → injects final prompt into InputArea
- Template editor for creating custom templates
- Ctrl+T shortcut to open

### 10.14 CodeDetectionCard.tsx

Dismissible notification when coding platform detected via OCR.

**Shows:** Platform name + detected language + "Switch to Coding mode" CTA
**Colors:** Platform-specific (LeetCode=amber, HackerRank=green, Codeforces=blue)

### 10.15 InlineRegionSelector.tsx

Full-screen canvas overlay for in-overlay region selection.

**Features:**
- Drag to select region with dashed border + glow
- Dimension label (width × height)
- Escape to cancel, minimum 10px to prevent accidental clicks
- Device pixel ratio aware for correct coordinates

### 10.16 OnboardingFlow.tsx

First-launch 3-step wizard.

**Steps:**
1. **OnboardingApiKey** — API key entry for at least one provider
2. **OnboardingHotkeys** — Shortcut reference card
3. **OnboardingStealthTest** — Guide to verify invisibility

### 10.17 Toast.tsx

Context-based toast notification system.

**Features:** Auto-dismiss (3.5s), max 3 stacked, success/error/info types, optional action button, slide-in animation

### 10.18 UI Primitives (Phase 4)

Shared styled components: `GhostButton`, `GhostInput`, `GhostCard`, `GhostBadge`, `GhostDivider`, `GhostTooltip`

---

## 11. Renderer: Hooks

### 11.1 useAI.ts — AI Chat Logic

**Returns:** `{ isStreaming, error, lastUsage, sendMessage, stopGeneration }`

**Flow:**
1. Resolve provider via `providerManager.resolveProvider(modelId)`
2. Get API key via IPC
3. Build ChatRequest with messages, system prompt, images
4. Call `provider.chat(request)` → iterate AsyncGenerator
5. Yield text chunks via `onToken` callback
6. On completion, `onDone` with TokenUsage
7. `stopGeneration()` calls `provider.abort()`

### 11.2 useScreenshot.ts — Screenshot State

**Returns:** `{ pendingScreenshots, isCapturing, snipScreenshot, captureFull, captureRegion, confirmRegion, cancelSnip, clearScreenshot, clearAllScreenshots }`

**Max screenshots:** 3 per message. Supports both full-screen and inline region selection.

### 11.3 useConversation.ts — Message Persistence

**Returns:** `{ messages, conversationId, conversationTitle, addUserMessage, addAssistantMessage, addErrorMessage, updateMessage, appendToMessage, startNewConversation, loadConversation, clearConversation, getContextMessages }`

**Auto-features:** Debounced save (500ms), auto-title from first user message, timestamp on every message.

### 11.4 useSettings.ts — Settings Management

**Returns:** `{ settings, isLoading, updateSetting }`

Deep-merges defaults with loaded settings so new keys from updates are always present.

### 11.5 useHotkeys.ts — Hotkey Event Listener

**Returns:** `{ registerCallback }`

Listens for `hotkeys:triggered` events from main process and routes to registered callbacks.

### 11.6 useInternalKeyboard.ts — In-App Shortcuts

Listens for keyboard shortcuts when overlay is focused:
- `Ctrl+,` → Toggle settings
- `Ctrl+K` → Open conversation history
- `Ctrl+L` (double-press) → Clear conversation
- `Ctrl+T` → Open template library

### 11.7 useClickThrough.ts — Mouse Passthrough

**Returns:** `{ isPassthrough, togglePassthrough, setPassthroughEnabled }`

Calls `window.ghostAPI.overlay.setPassthrough(enabled, { forward: true })` which maps to Electron's `setIgnoreMouseEvents()`. Also listens for `toggle-passthrough` hotkey event.

### 11.8 useAudioTranscription.ts — Speech-to-Text

**Returns:** `{ isListening, transcript, interimTranscript, isAvailable, error, startListening, stopListening, clearTranscript }`

Supports dual engines: Web Speech API (free) and Whisper API (paid, higher accuracy). Accumulates final transcripts, tracks interim results separately.

### 11.9 useLiveTranscription.ts — System Audio Pipeline

**Returns:** `{ isActive, liveTranscript, captureMethod, start, stop, clear }`

Starts system audio capture via IPC, receives `audio:chunk` events (base64 PCM), processes 5-second windows.

### 11.10 useMeetingAssistant.ts — Question Detection

**Returns:** `{ detectedQuestions, activeQuestion, dismissQuestion, clearAll }`

Watches `liveTranscript` changes, debounces 3s, extracts last 2-3 sentences, matches interrogative patterns (ends with `?` or contains question keywords like what/how/why/where/when/who/could you/can you/explain/tell me). Deduplicates via Set. Max 10 questions.

### 11.11 useCodeDetection.ts — OCR Platform Detection

**Returns:** `{ lastDetection, isScanning, dismiss }`

**Process:** Periodic screenshots (30s) → tesseract.js OCR → platform keyword matching → regex-based language detection → notification if platform changed.

**Supported Platforms:** LeetCode, HackerRank, Codeforces, CodeSignal, AlgoExpert, Pramp, Coderbyte, generic-ide

**Language Detection:** Regex patterns ordered by specificity: Java → C++ → TypeScript → JavaScript → Python → Go → Rust. Returns language with most pattern matches.

### 11.12 useMemory.ts — RAG Context Injection

**Returns:** `{ isEnabled, buildContextPrefix, addFact, deleteFact, listFacts, searchFacts, clearAll, getStats, extractFromConversation, autoExtractFromMessage }`

**Context Injection:** `buildContextPrefix(query)` searches memory for top 5 facts, formats as `[Relevant context from memory:\n- fact1\n- fact2]\n\n` and prepends to AI prompt.

**Auto-Extract Patterns:**
```
"remember that X" → stores X as fact
"my [name/language/favorite X] is Y" → "User's X is Y"
"I prefer X" → "User prefers X"
"I work at/for X" → "User works at X"
"I am a X" → "User is a X"
"I use X for Y" → "User uses X for Y"
"I always X" → "User always X"
```

Deduplication: checks similarity score > 0.8 before adding.

### 11.13 useTokenCost.ts — Cost Tracking

**Returns:** `{ lastRequest, conversation, session, recordUsage, resetConversation }`

Tracks input/output tokens and estimated USD cost at three levels: per-request, per-conversation, per-session.

### 11.14 useWindowSize.ts — Responsive Breakpoints

**Returns:** `{ mode }` where mode is `'compact' | 'normal' | 'expanded'`

Breakpoints adjust UI density (hides labels in compact, expands panels in expanded).

### 11.15 useConversationHistory.ts — Conversation Browser

**Returns:** `{ conversations, isLoading, searchQuery, setSearchQuery, refresh, deleteConversation, exportConversation, deleteAllConversations }`

### 11.16 useTemplates.ts — Template CRUD

**Returns:** `{ templates, isLoading, saveTemplate, deleteTemplate, refresh }`

---

## 12. Renderer: Services

### 12.1 AI Provider Interface

All providers implement:

```typescript
interface AIProvider {
  readonly name: string;               // "OpenAI", "Anthropic", "Google", "Ollama"
  readonly id: ProviderID;             // "openai", "anthropic", "gemini", "ollama"
  readonly models: ModelConfig[];

  initialize(apiKey: string): void;
  validateKey(): Promise<ValidationResult>;
  chat(request: ChatRequest): AsyncGenerator<StreamChunk, ChatResponse>;
  abort(): void;
}
```

### 12.2 Provider Manager (provider-manager.ts)

Singleton registry with lazy-loading support.

**Methods:**
- `registerLazy(id, factory)` — SDK loaded on first use (~4MB startup savings)
- `resolveProvider(id)` — Returns cached or loads via factory
- `getModelById(modelId)` — Looks up model config + provider
- `refreshModels(providerId)` — Dynamic discovery (Ollama `/api/tags`)
- `getAllModels()` / `getAvailableModels()` — Static + filtered lists

### 12.3 OpenAI Provider (openai.ts)

- **Endpoint:** `https://api.openai.com/v1/chat/completions`
- **SDK:** `new OpenAI({ apiKey, dangerouslyAllowBrowser: true })`
- **Streaming:** SSE via `client.chat.completions.create(..., { stream: true })`
- **Vision:** `{ type: "image_url", image_url: { url: "data:image/png;base64,..." } }`
- **Models:** GPT-4o, GPT-4o Mini, o3-mini (Reasoning)

### 12.4 Anthropic Provider (anthropic.ts)

- **Endpoint:** `https://api.anthropic.com/v1/messages`
- **Streaming:** SSE with event types (message_start, content_block_delta, message_delta, message_stop)
- **Vision:** `{ type: "image", source: { type: "base64", media_type: "image/png", data: "..." } }`
- **Models:** Claude Sonnet 4, Claude Haiku 4.5

### 12.5 Google Gemini Provider (gemini.ts)

- **Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent`
- **Streaming:** SSE via Google SDK
- **Vision:** `{ inline_data: { mime_type: "image/png", data: "base64..." } }`
- **Models:** Gemini 2.0 Flash, Gemini 2.5 Pro

### 12.6 Ollama Provider (ollama.ts)

- **Endpoint:** `http://localhost:11434/api/chat` (configurable)
- **Discovery:** `GET /api/tags` to list available models
- **Streaming:** NDJSON (one JSON object per line, NOT SSE)
- **Vision:** Auto-detect via model name (llava, bakllava, moondream) → `images: ["base64string"]`
- **Cost:** Always "Free" (local inference)

### 12.7 Speech Service (speech.ts)

Dual-engine speech-to-text:

1. **Browser Engine:** Web Speech API (free, in-browser)
   - `SpeechRecognition` with continuous mode
   - Handles `onresult` events with interim/final distinction
   - Auto-restarts on network errors (max 5 retries)

2. **Whisper Engine:** OpenAI Whisper API (paid, higher accuracy)
   - Records audio via `MediaRecorder`
   - Sends 5-second chunks to Whisper endpoint
   - Accumulates transcript

### 12.8 OCR Service (ocr-service.ts)

Tesseract.js wrapper for client-side text extraction. Used by code detection hook for periodic screen OCR.

---

## 13. Shared Types & Constants

### 13.1 Type Definitions (src/shared/types.ts)

**Provider & Model Types:**
```typescript
type ProviderID = 'openai' | 'anthropic' | 'gemini' | 'ollama';

type HotkeyAction =
  | 'toggle-overlay' | 'capture-screen' | 'capture-region'
  | 'focus-input' | 'copy-response' | 'new-conversation'
  | 'hide-overlay' | 'paste-response' | 'toggle-passthrough';

interface ModelConfig {
  id: string;                    // e.g., "gpt-4o", "claude-sonnet-4-20250514"
  name: string;                  // e.g., "GPT-4o", "Claude Sonnet 4"
  provider: ProviderID;
  supportsVision: boolean;
  maxContextTokens: number;      // e.g., 128000, 200000, 1048576
  maxOutputTokens: number;
  costPer1MInput: number;        // USD per 1M input tokens
  costPer1MOutput: number;       // USD per 1M output tokens
  speed: 'fast' | 'medium' | 'slow';
}
```

**Chat Types:**
```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'error';
  content: string;
  images?: ImageAttachment[];
  timestamp: string;
  usage?: TokenUsage;
  model?: string;
  latencyMs?: number;
}

interface ImageAttachment {
  data: string;                  // Base64 encoded
  mimeType: 'image/png' | 'image/jpeg';
  width?: number;
  height?: number;
}

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUSD: number;
}

interface ChatRequest {
  messages: ChatMessage[];
  model: string;
  systemPrompt?: string;
  images?: ImageAttachment[];
  maxTokens?: number;
  temperature?: number;          // 0.0 - 1.0
  stream?: boolean;              // Default true
}

interface StreamChunk {
  type: 'text' | 'done' | 'error';
  text?: string;
  error?: string;
}

interface ChatResponse {
  content: string;
  model: string;
  usage: TokenUsage;
  finishReason: 'stop' | 'max_tokens' | 'error';
  latency: number;               // ms from request to first token
}
```

**Conversation Types:**
```typescript
interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  mode: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  totalTokens: number;
  estimatedCost: number;
}

interface ConversationMeta {
  id: string;
  title: string;
  preview: string;               // First 100 chars of first AI response
  mode: string;
  model: string;
  messageCount: number;
  tokenCount: number;
  createdAt: string;
  updatedAt: string;
}
```

**Mode Types:**
```typescript
interface Mode {
  id: string;
  name: string;
  color: string;                 // Hex color for UI indicator
  systemPrompt: string;
  isBuiltIn: boolean;
}

interface CustomMode extends Mode {
  isBuiltIn: false;
  createdAt: string;
  updatedAt: string;
}
```

**Phase 4 Types:**
```typescript
type AudioCaptureSource = 'system' | 'microphone' | 'both';

interface MeetingQuestion {
  id: string;
  text: string;
  suggestedAnswer: string | null;
  timestamp: string;
  confidence: number;            // 0.0 - 1.0
}

type CodePlatform = 'leetcode' | 'hackerrank' | 'codeforces' | 'codesignal'
  | 'algoexpert' | 'pramp' | 'coderbyte' | 'generic-ide' | 'unknown';

interface CodeDetectionResult {
  platform: CodePlatform;
  confidence: number;
  language?: string;
  timestamp: string;
}

type TemplateCategory = 'coding' | 'writing' | 'analysis' | 'meeting'
  | 'solve' | 'research' | 'debugging' | 'custom';

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  prompt: string;                // Supports {{variable}} placeholders
  variables: TemplateVariable[];
  isBuiltIn: boolean;
  usageCount: number;
  tags: string[];
}

interface CompanionDevice {
  id: string;
  name: string;
  connectedAt: string;
  lastSeen: string;
  platform: 'ios' | 'android' | 'web';
}

type ExportFormat = 'json' | 'markdown' | 'pdf' | 'text';

interface MemoryFact {
  id: string;
  content: string;
  source: 'user' | 'conversation' | 'manual';
  extractedAt: string;
  tags: string[];
  accessCount: number;
  lastAccessed: string;
}

interface MemorySearchResult {
  fact: MemoryFact;
  score: number;                 // Cosine similarity (0.0 - 1.0)
  relevantSnippet: string;
}
```

**Application Settings:**
```typescript
interface AppSettings {
  providers: Record<ProviderID, ProviderConfig>;
  activeProvider: ProviderID;
  activeModel: string;
  activeMode: string;

  display: {
    theme: 'dark' | 'light';
    opacity: number;             // 0.1 - 1.0
    fontSize: number;            // 11 - 18
    windowWidth: number;         // 300 - 800
    windowHeight: number;        // 200 - 1200
    startPosition: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center' | 'last';
    showStatusBar: boolean;
    autoScroll: boolean;
    showTimestamps: boolean;
    animationsEnabled: boolean;
    glassEffect: boolean;
  };

  hotkeys: Record<HotkeyAction, string>;

  privacy: {
    encryptKeys: boolean;
    clearScreenshotsAfterSend: boolean;
    persistChatHistory: boolean;
    logApiRequests: boolean;
    processName: string;         // Default: "SystemHelper"
    showTrayIcon: boolean;
    clickThroughEnabled: boolean;
    codeDetectionEnabled: boolean;
    codeDetectionIntervalMs: number;  // Default: 30000
  };

  customModes: CustomMode[];

  audio: {
    engine: 'browser' | 'whisper';
    language: string;            // e.g., "en-US"
    autoIncludeTranscript: boolean;
  };

  meeting: {
    enableSystemAudio: boolean;
    audioSource: AudioCaptureSource;
    autoSuggestEnabled: boolean;
    silenceThresholdMs: number;
    liveTranscriptionEnabled: boolean;
  };

  companion: {
    enabled: boolean;
    port: number;                // Default: 3847
    requirePairing: boolean;
    pairedDevices: CompanionDevice[];
    autoStart: boolean;
  };

  templates: {
    customTemplates: PromptTemplate[];
    recentIds: string[];
  };

  memory: {
    enabled: boolean;            // Default: true
    autoExtract: boolean;        // Default: true
    maxFactsPerConversation: number;
    maxContextFacts: number;     // Default: 5
    factRetentionDays: number;
    totalFactsLimit: number;     // Default: 500
  };

  isFirstLaunch: boolean;
  onboardingComplete: boolean;
  version: string;
}
```

### 13.2 Constants (src/shared/constants.ts)

**Default Hotkeys:**
```
toggle-overlay:    Ctrl+Shift+G
capture-screen:    CommandOrControl+Alt+S
capture-region:    CommandOrControl+Alt+R
focus-input:       CommandOrControl+Alt+A
copy-response:     CommandOrControl+Alt+C
new-conversation:  CommandOrControl+Alt+N
hide-overlay:      Escape
paste-response:    CommandOrControl+Shift+V
toggle-passthrough: CommandOrControl+Shift+P
```

**Built-in Modes (4):**
| Mode | Color | System Prompt Focus |
|------|-------|-------------------|
| General | #8B8B9E (gray) | Concise, markdown, screenshot analysis |
| Coding | #6C5CE7 (purple) | Algorithms, Big-O, multiple approaches, debugging |
| Meeting | #2E75B6 (blue) | Talking points, summaries, action items |
| Solve | #FDCB6E (yellow) | Answer first, then explain, speed priority |

**Model Configurations:**

| Model | Provider | Vision | Context | Input $/1M | Output $/1M | Speed |
|-------|----------|--------|---------|-----------|------------|-------|
| GPT-4o | OpenAI | Yes | 128K | $2.50 | $10.00 | Medium |
| GPT-4o Mini | OpenAI | Yes | 128K | $0.15 | $0.60 | Fast |
| o3-mini | OpenAI | No | 200K | $1.10 | $4.40 | Slow |
| Claude Sonnet 4 | Anthropic | Yes | 200K | $3.00 | $15.00 | Medium |
| Claude Haiku 4.5 | Anthropic | Yes | 200K | $0.80 | $4.00 | Fast |
| Gemini 2.0 Flash | Google | Yes | 1M | $0.075 | $0.30 | Fast |
| Gemini 2.5 Pro | Google | Yes | 1M | $1.25 | $10.00 | Medium |
| Ollama (any) | Local | Varies | Varies | Free | Free | Varies |

**AI API Domains (for CORS bypass):**
```
https://api.openai.com/*
https://api.anthropic.com/*
https://generativelanguage.googleapis.com/*
http://localhost:11434/*
http://127.0.0.1:11434/*
```

### 13.3 Error Codes (src/shared/errors.ts)

```
E1001  PROVIDER_AUTH_FAILED         Invalid API key
E1002  PROVIDER_RATE_LIMITED        Rate limit exceeded (retryable)
E1003  PROVIDER_QUOTA_EXCEEDED      Quota exceeded / access denied
E1004  PROVIDER_MODEL_NOT_FOUND     Model deprecated or unavailable
E1005  PROVIDER_CONTEXT_TOO_LONG    Input exceeds model context window
E1006  PROVIDER_SERVER_ERROR        AI provider server error (retryable)
E1007  PROVIDER_TIMEOUT             Request timed out (retryable)
E1008  PROVIDER_STREAM_ERROR        Streaming connection failed
E1009  PROVIDER_CONTENT_FILTERED    Content filtered by safety system

E2001  SCREENSHOT_CAPTURE_FAILED    desktopCapturer failed
E2002  SCREENSHOT_REGION_CANCEL     User cancelled region selection
E2003  SCREENSHOT_NO_DISPLAY        No matching display found
E2004  SCREENSHOT_PERMISSION        Screen capture permission denied

E3001  STORE_READ_FAILED            electron-store read error
E3002  STORE_WRITE_FAILED           electron-store write error
E3003  STORE_ENCRYPTION_FAILED      AES encryption/decryption failed
E3004  STORE_CORRUPTED              Store data corrupted

E4001  HOTKEY_REGISTER_FAILED       globalShortcut.register() failed
E4002  HOTKEY_CONFLICT              Shortcut already in use
E4003  HOTKEY_INVALID_FORMAT        Invalid accelerator format

E5001  SYSTEM_NO_INTERNET           No network connectivity
E5002  SYSTEM_PROTECTION_FAILED     setContentProtection() failed
E5003  SYSTEM_UNSUPPORTED_OS        OS version doesn't support WDA_EXCLUDEFROMCAPTURE
```

**Error Response Format:**
```typescript
interface InvisiQErrorResponse {
  code: InvisiQError;
  message: string;
  details?: string;
  retryable: boolean;
  retryAfterMs?: number;
  action?: 'switch-model' | 'add-key' | 'check-settings' | 'retry';
}
```

---

## 14. Design System

### 14.1 Color Palette — Dark Theme (Default)

All colors use CSS custom properties with RGB triplets for Tailwind opacity support:

```css
/* Background layers */
--bg-overlay:       11, 14, 20;      /* Deep navy */
--bg-chat:          15, 18, 25;
--bg-header:        18, 22, 30;
--bg-input:         22, 27, 36;
--bg-code:          9, 12, 18;
--bg-hover:         30, 37, 48;

/* Surfaces */
--surface-elevated: 24, 30, 40;
--surface-glass:    255, 255, 255;   /* For glassmorphism at low opacity */

/* Message bubbles */
--bubble-user:      37, 99, 235;     /* Blue */
--bubble-ai:        22, 27, 36;      /* Dark gray */
--bubble-system:    15, 42, 30;      /* Dark green */

/* Text hierarchy */
--text-primary:     226, 232, 240;   /* Off-white */
--text-secondary:   100, 116, 139;   /* Muted gray */
--text-placeholder: 71, 85, 105;     /* Dim */
--text-code:        203, 213, 225;   /* Code text */

/* Accents */
--accent-primary:   20, 184, 166;    /* Teal */
--accent-cyan:      6, 182, 212;
--accent-blue:      59, 130, 246;
--accent-purple:    139, 92, 246;
--accent-amber:     251, 191, 36;

/* Status */
--status-success:   34, 197, 94;     /* Green */
--status-warning:   234, 179, 8;     /* Yellow */
--status-error:     239, 68, 68;     /* Red */
--status-streaming: 99, 102, 241;    /* Indigo */

/* Borders */
--border-subtle:    30, 41, 59;
--border-active:    51, 65, 85;
--border-focus:     59, 130, 246;
```

### 14.2 Color Palette — Light Theme

Applied via `.light-theme` CSS class:
```css
--bg-overlay:       248, 250, 252;
--bg-chat:          255, 255, 255;
--bg-header:        241, 245, 249;
--text-primary:     15, 23, 42;      /* Dark slate */
--text-secondary:   71, 85, 105;
--accent-primary:   13, 148, 136;    /* Darker teal */
```

### 14.3 Typography

```
UI Font:     Inter, SF Pro Display, system-ui, sans-serif
Code Font:   JetBrains Mono, Fira Code, Consolas, monospace

Font Sizes:
  xs:   11px
  sm:   12px
  base: 13px (default)
  md:   14px
  lg:   16px
  xl:   18px
  2xl:  22px
```

### 14.4 Spacing Scale

```
1:  4px       5:  20px
2:  8px       6:  24px
3:  12px      8:  32px
4:  16px      10: 40px
              12: 48px
```

### 14.5 Border Radius

```
xs:   4px      lg:  12px
sm:   6px      xl:  16px
md:   8px      2xl: 20px
               full: 9999px
```

### 14.6 Shadows

```
overlay:    0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)
dropdown:   0 4px 16px rgba(0,0,0,0.5)
tooltip:    0 2px 8px rgba(0,0,0,0.4)
ghost-sm:   0 1px 3px rgba(0,0,0,0.3)
ghost-md:   0 4px 12px rgba(0,0,0,0.35)
ghost-lg:   0 8px 24px rgba(0,0,0,0.45)
glow-teal:  0 0 20px rgba(20,184,166,0.2), 0 0 40px rgba(20,184,166,0.08)
glow-blue:  0 0 20px rgba(59,130,246,0.2)
focus-ring: 0 0 0 2px rgb(var(--bg-overlay)), 0 0 0 4px rgb(var(--border-focus))
```

### 14.7 Animations

**CSS Animations:**
| Name | Duration | Purpose |
|------|----------|---------|
| fadeIn | 200ms ease-out | General fade entrance |
| pulsingDots | 1s infinite | Thinking indicator |
| blinkCursor | 500ms steps(2) | Streaming cursor blink |
| streamingPulse | 1.5s ease-in-out | Active streaming indicator |
| shimmer | 1.5s linear | Skeleton loader |
| pulseGlow | 2s ease-in-out | Ambient glow effect |
| slideInLeft | 250ms ease-out | Panel slide from left |
| slideInRight | 250ms ease-out | Panel slide from right |
| toastSlideIn | 300ms ease-out | Toast entrance |
| micPulse | 1.5s ease-in-out | Recording button pulse |
| scanPulse | 2s ease-in-out | Code detection scanning |

**Framer Motion Variants (Phase 4):**
| Variant | Effect |
|---------|--------|
| fadeInUp | Opacity 0→1, translateY 8px→0 |
| slideInLeft | translateX -100%→0 |
| slideInRight | translateX 100%→0 |
| scaleIn | Scale 0.8→1.0, opacity 0→1 |
| iconSwap | Scale bounce for icon replacement |
| toastSlide | translateX 100%→0 with spring |

All animations respect `prefers-reduced-motion` via `MotionConfig` wrapper.

### 14.8 Window Defaults

```
Size:       420 × 600 px
Min:        300 × 200 px
Max:        800 × screen height
Position:   Bottom-right corner
Opacity:    85% (user adjustable 10-100%)
Radius:     12px
```

---

## 15. IPC Contract

### 15.1 Renderer → Main (invoke/handle)

**Overlay Management:**
| Channel | Args | Returns |
|---------|------|---------|
| `overlay:toggle` | — | void |
| `overlay:hide` | — | void |
| `overlay:show` | — | void |
| `overlay:set-opacity` | `{ opacity: number }` | void |
| `overlay:set-position` | `{ x: number, y: number }` | void |
| `overlay:set-size` | `{ width: number, height: number }` | void |
| `overlay:get-bounds` | — | `{ x, y, width, height }` |
| `overlay:set-passthrough` | `{ enabled: boolean, forward?: boolean }` | void |

**Screenshot Operations:**
| Channel | Args | Returns |
|---------|------|---------|
| `screenshot:capture-full` | `{ monitorId?: string }` | `ScreenshotResult` |
| `screenshot:capture-region` | — | `ScreenshotResult \| null` |
| `screenshot:capture-monitors` | — | `MonitorInfo[]` |
| `screenshot:capture-silent` | `{ monitorId?: string }` | `ScreenshotResult` |
| `screenshot:capture-for-snip` | — | `ScreenshotResult` |
| `screenshot:crop-region` | `RegionCropRequest` | `ScreenshotResult` |

**Store Operations:**
| Channel | Args | Returns |
|---------|------|---------|
| `store:get` | `{ key: string }` | `unknown` |
| `store:set` | `{ key: string, value: unknown }` | void |
| `store:get-all` | — | `AppSettings` |
| `store:set-api-key` | `{ provider: string, key: string }` | `{ success, error? }` |
| `store:get-api-key` | `{ provider: string }` | `string \| null` |
| `store:remove-api-key` | `{ provider: string }` | void |
| `store:clear-all` | — | void |

**Conversation CRUD:**
| Channel | Args | Returns |
|---------|------|---------|
| `conversation:save` | `Conversation` | void |
| `conversation:load` | `{ id: string }` | `Conversation \| null` |
| `conversation:list` | — | `ConversationMeta[]` |
| `conversation:delete` | `{ id: string }` | `boolean` |
| `conversation:search` | `{ query: string }` | `ConversationMeta[]` |
| `conversation:export` | `{ id, format }` | `string` |
| `conversation:delete-all` | — | `number` |

**Memory (RAG):**
| Channel | Args | Returns |
|---------|------|---------|
| `memory:search` | `{ query, limit? }` | `MemorySearchResult[]` |
| `memory:add` | `{ content, tags? }` | `{ id: string }` |
| `memory:delete` | `{ id: string }` | `{ success: boolean }` |
| `memory:list` | `{ page? }` | `{ facts[], total }` |
| `memory:clear-all` | — | `{ count: number }` |
| `memory:stats` | — | `MemoryStats` |
| `memory:extract` | `{ conversationId }` | `{ extracted: number }` |

### 15.2 Main → Renderer (send/on)

**Event Channels:**
| Channel | Payload | Trigger |
|---------|---------|---------|
| `hotkeys:triggered` | `{ action: HotkeyAction }` | Global shortcut pressed |
| `overlay:visibility-changed` | `{ visible: boolean }` | Overlay show/hide |
| `screenshot:captured` | `ScreenshotResult` | Screenshot taken |
| `app:error` | `{ message: string }` | System error |
| `clipboard:changed` | `{ text: string }` | Clipboard content changed |
| `monitors:changed` | `MonitorInfo[]` | Display connect/disconnect |
| `update:available` | `{ version: string }` | Update found |
| `update:downloaded` | `{ version: string }` | Download complete |
| `update:progress` | `{ percent: number }` | Download progress |
| `audio:chunk` | `{ data: string, timestamp }` | Audio PCM chunk (base64) |
| `companion:message` | `CompanionMessage` | Message from paired device |
| `companion:device-connected` | `CompanionDevice` | New device connected |
| `companion:device-disconnected` | `{ deviceId }` | Device disconnected |

---

## 16. AI Provider Integration

### 16.1 Request Flow

```
User Input → useAI.sendMessage()
  │
  ├── 1. Resolve provider: providerManager.resolveProvider(modelId)
  │      └── Lazy-loads SDK on first use (dynamic import)
  │
  ├── 2. Get API key: IPC store:get-api-key
  │
  ├── 3. Build ChatRequest:
  │      ├── messages[] (conversation history)
  │      ├── systemPrompt (from active mode)
  │      ├── images[] (base64 screenshots)
  │      ├── model (selected model ID)
  │      └── stream: true
  │
  ├── 4. Call provider.chat(request) → AsyncGenerator<StreamChunk>
  │
  ├── 5. Stream loop:
  │      ├── StreamChunk { type: 'text', text: '...' } → onToken(text)
  │      ├── StreamChunk { type: 'error', error: '...' } → onError(error)
  │      └── Generator return: ChatResponse → onDone(usage)
  │
  └── 6. Abort: provider.abort() cancels in-flight request
```

### 16.2 Vision Format Differences

```
OpenAI:
  content: [{ type: "image_url", image_url: { url: "data:image/png;base64,..." } }]

Anthropic:
  content: [{ type: "image", source: { type: "base64", media_type: "image/png", data: "..." } }]

Gemini:
  parts: [{ inline_data: { mime_type: "image/png", data: "base64..." } }]

Ollama:
  images: ["base64string"]    // No data URI prefix, plain base64
```

### 16.3 Streaming Protocol Differences

| Provider | Protocol | Format |
|----------|----------|--------|
| OpenAI | Server-Sent Events (SSE) | `data: {"choices":[{"delta":{"content":"..."}}]}` |
| Anthropic | SSE with typed events | `event: content_block_delta` / `data: {"delta":{"text":"..."}}` |
| Gemini | SSE | `data: {"candidates":[{"content":{"parts":[{"text":"..."}]}}]}` |
| Ollama | NDJSON | `{"message":{"content":"..."}}` (one JSON per line) |

---

## 17. Storage & Encryption

### 17.1 Storage Schema

```
%APPDATA%/ghostai/
├── config.json           # electron-store (settings + encrypted keys)
├── conversations/        # One JSON file per conversation
│   ├── {uuid1}.json
│   ├── {uuid2}.json
│   └── ...
└── memory.json           # TF-IDF fact store (max 500 facts)
```

**config.json Structure:**
```json
{
  "settings": { /* Full AppSettings object */ },
  "keys": {
    "openai": { "iv": "base64", "data": "base64", "tag": "base64" },
    "anthropic": { "iv": "...", "data": "...", "tag": "..." },
    "gemini": { "iv": "...", "data": "...", "tag": "..." },
    "ollama": "http://localhost:11434"
  },
  "windowState": { "x": 1480, "y": 380, "width": 420, "height": 600, "opacity": 0.85 }
}
```

### 17.2 Encryption Details

**Algorithm:** AES-256-GCM (Authenticated Encryption with Associated Data)

**Key Derivation:**
```
PBKDF2(
  password:   machineId (from node-machine-id)
  salt:       "ghostai-salt" (static app salt)
  iterations: 100,000
  keyLen:     32 bytes (256 bits)
  digest:     SHA-512
)
```

**Encryption Process:**
```
1. Generate random 12-byte IV
2. Create AES-256-GCM cipher with derived key + IV
3. Encrypt plaintext API key
4. Extract 16-byte auth tag
5. Store: { iv: base64(IV), data: base64(ciphertext), tag: base64(authTag) }
```

**Machine-Specific:** Encryption key is derived from hardware machine ID (MAC address + motherboard serial), so encrypted keys cannot be transferred between machines.

---

## 18. Security & Privacy

### 18.1 Security Measures

| Layer | Implementation |
|-------|---------------|
| **Window Invisibility** | `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` via `setContentProtection(true)` |
| **Stealth Watchdog** | Re-applies content protection every 2 seconds |
| **Process Isolation** | `contextIsolation: true`, `nodeIntegration: false`, IPC-only communication |
| **Key Encryption** | AES-256-GCM with PBKDF2-derived machine-specific key |
| **IPC Validation** | All arguments validated in main process handlers |
| **Channel Whitelist** | Only whitelisted channels accepted in preload |
| **Process Disguise** | Configurable process name (default: "SystemHelper") |
| **No Desktop Shortcuts** | Installer creates no shortcuts by default |
| **Product Name** | Packaged as "SystemHelper", not "InvisiQ" |

### 18.2 Privacy Architecture

| Aspect | Design |
|--------|--------|
| **Data Residency** | All data stored locally in `%APPDATA%/ghostai/`. Zero cloud storage. |
| **Telemetry** | Zero telemetry. No analytics. No crash reporting. |
| **API Architecture** | BYOK — direct API calls to providers. No intermediary servers. |
| **Screenshot Lifecycle** | Cleared from memory after sending to AI. Not persisted to disk. |
| **API Keys** | Encrypted at rest. Never logged. Never transmitted except to provider. |
| **Conversation History** | Stored locally. User can disable persistence. Clear-all available. |
| **Memory Facts** | Stored locally in `memory.json`. User can clear all facts. |

### 18.3 Content Security Policy

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
connect-src 'self' https://api.openai.com https://api.anthropic.com
            https://generativelanguage.googleapis.com http://localhost:11434;
```

---

## 19. Global Hotkeys

### 19.1 Configurable Hotkeys (9 actions)

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl+Shift+G` | toggle-overlay | Show/hide the overlay window |
| `Ctrl+Alt+S` | capture-screen | Full screen capture → send to AI |
| `Ctrl+Alt+R` | capture-region | Region selection → capture → send to AI |
| `Ctrl+Alt+A` | focus-input | Focus the text input field |
| `Ctrl+Alt+C` | copy-response | Copy last AI response to clipboard |
| `Ctrl+Shift+V` | paste-response | Paste last AI response into active app |
| `Ctrl+Alt+N` | new-conversation | Start a new conversation |
| `Escape` | hide-overlay | Hide overlay immediately |
| `Ctrl+Shift+P` | toggle-passthrough | Toggle click-through mode |

All hotkeys are customizable via Settings > Hotkeys with conflict detection and recording mode.

### 19.2 Internal Shortcuts (when overlay focused)

| Shortcut | Action |
|----------|--------|
| `Ctrl+,` | Toggle Settings panel |
| `Ctrl+K` | Open Conversation History |
| `Ctrl+L` (double-press) | Clear current conversation |
| `Ctrl+T` | Open Template Library |
| `Arrow Up/Down` | Navigate messages in ChatPanel |
| `Escape` | Close focused panel / unfocus message |
| `Enter` | Send message |
| `Shift+Enter` | New line in input |

---

## 20. Development Phases

### Phase 1 — Core MVP (Complete)

**Goal:** Invisible overlay with AI chat.

**Sprint 1-2: Invisible Overlay + Hotkeys**
- Electron BrowserWindow with `transparent: true`, `frame: false`, `alwaysOnTop: true`
- `setContentProtection(true)` — core invisibility mechanism
- Global hotkey registration via `globalShortcut`
- Process disguise and skip-taskbar

**Sprint 3: Screen Capture + AI Integration**
- `desktopCapturer.getSources()` with hide/capture/show sequence
- OpenAI, Anthropic, Gemini provider adapters
- AIProvider interface with AsyncGenerator streaming
- Vision support (screenshots sent as base64)
- CORS bypass via session headers

**Sprint 4: Chat UI + Integration**
- React chat interface with HeaderBar, ChatPanel, MessageBubble, CodeBlock, InputArea
- ReactMarkdown rendering with syntax highlighting
- Copy/paste buttons on messages and code blocks
- Settings panel with API key management
- AES-256-GCM encrypted key storage
- 4 built-in modes (General, Coding, Meeting, Solve)
- StatusBar with connection indicator

### Phase 2 — Enhanced (Complete)

**Sprint 5: Chat Persistence + Conversation History**
- Filesystem-based conversation storage (JSON per conversation in `%APPDATA%/ghostai/conversations/`)
- 7 IPC channels for conversation CRUD (save, load, list, delete, search, export, delete-all)
- ConversationHistory slide-in panel with search, delete, export
- Auto-save with 500ms debounce
- Auto-title generation from first user message
- History + New Chat buttons in HeaderBar

**Sprint 6: Smart Modes + Custom Modes + Settings Tabs**
- Enhanced built-in mode system prompts (detailed instructions per mode)
- Custom mode CRUD with color picker (8 preset colors)
- CustomModeEditor modal (name, color, system prompt)
- SettingsHotkeys tab: shortcut recording, conflict detection, reset to defaults
- SettingsDisplay tab: theme toggle, opacity slider, font size, window dimensions, start position
- SettingsPrivacy tab: encryption toggle, screenshot cleanup, history persistence, process name, tray icon, clear data, open data folder

**Sprint 7: Clipboard Integration + Smart Paste + Toast**
- Smart paste via PowerShell `SendKeys`: hide overlay → write clipboard → focus target → Ctrl+V → restore
- `Ctrl+Shift+V` hotkey to paste last AI response into any active application
- Clipboard polling monitor (3s interval, MD5 hash comparison)
- `clipboard:changed` IPC event to renderer
- "Analyze with AI" action on clipboard change toast notifications
- Toast notification system: success/error/info types, auto-dismiss 3.5s, max 3 stacked
- "Paste to App" buttons on MessageBubble and CodeBlock

**Sprint 8: Audio Transcription + Process Stealth + Polish**
- Dual speech engine: Web Speech API (free, browser) + Whisper API (paid, OpenAI)
- Mic button in InputArea with recording pulse animation
- useAudioTranscription hook with interim results
- TranscriptPanel: live transcript, recording timer, collapse/expand, clear
- Meeting mode auto-context: transcript injected into AI system prompt
- SettingsAudio tab: engine selector, language (12 languages), auto-include transcript
- Skeleton loaders for conversation history panel
- Flicker-free streaming: memoized ReactMarkdown components
- Enhanced stealth: process name disguise, alt-tab hiding, stealth watchdog (2s interval)
- UI polish: keyboard navigation (arrow keys), focus-visible outlines, reduced-motion support, selection styles

### Phase 3 — Production Polish (Complete)

**Sprint 9: Multi-Monitor Support + Onboarding Wizard**
- Monitor detection with hot-plug events (`display-added`, `display-removed`, `display-metrics-changed`)
- Screenshots capture correct display based on overlay position
- Region selector opens on cursor's monitor
- Overlay position validation against connected displays (snaps to primary if off-screen)
- 3-step onboarding wizard:
  1. OnboardingApiKey — API key entry with provider selector and validation
  2. OnboardingHotkeys — Visual shortcut reference card
  3. OnboardingStealthTest — Guide to verify invisibility with screenshot tools

**Sprint 10: Ollama Local AI + Light Theme + Cost Tracking**
- Ollama AIProvider: NDJSON streaming, `/api/tags` auto-discovery, vision model detection
- Light theme via CSS custom properties (RGB triplets for Tailwind opacity compatibility)
- `.light-theme` class toggle in settings
- Per-request, per-conversation, per-session token and cost tracking
- StatusBar hover tooltip with full cost breakdown

**Sprint 11: Auto-Updater + Responsive + Keyboard Nav + System Tray**
- electron-updater integration with GitHub Releases
- Auto-check deferred 10s after startup
- Update toast notifications (available, downloading, ready to install)
- Responsive layout: compact (< 350px), normal (350-600px), expanded (> 600px) breakpoints
- useWindowSize hook with mode detection
- Internal keyboard shortcuts: Ctrl+, Ctrl+L, Ctrl+K
- Optional system tray icon (disabled by default for stealth)

**Sprint 12: Performance + Testing + Packaging**
- Lazy-load AI SDKs via dynamic import (~4MB saved at startup)
- Deferred non-critical startup tasks (conversations, watchdog, updater, tray)
- Screenshot memory cleanup after send
- React.memo on ModeSelector/ModelSelector
- Production logger (warn/error only in production, verbose in dev)
- Build verification script: checks contentProtection, contextIsolation, nodeIntegration, productName
- Testing documentation: stealth matrix, performance benchmarks, functional checklists
- CHANGELOG.md, updated CLAUDE.md

### Phase 4 — Invisible Intelligence Platform (Complete)

**Sprint 13: Enterprise Design System Overhaul**
- New deep-navy command-center color palette
- CSS custom properties using RGB triplets for full Tailwind opacity compatibility
- framer-motion v11 integration: `AnimatePresence`, `MotionConfig`, spring physics
- Animation variants: fadeInUp, slideInRight, scaleIn, iconSwap, toastSlide
- UI primitives: GhostButton, GhostInput, GhostCard, GhostTooltip, GhostBadge, GhostDivider
- All animations respect `prefers-reduced-motion` via MotionConfig wrapper

**Sprint 14: Click-Through Overlay + Invisible Snipping**
- useClickThrough hook: `setIgnoreMouseEvents(true, { forward: true })` passthrough toggle
- Click-through toggle button in HeaderBar (MousePointer/MousePointerOff icons)
- `Ctrl+Shift+P` global hotkey for toggle
- InlineRegionSelector: canvas-based in-overlay snipping (no external window needed)
- `screenshot:capture-for-snip` + `screenshot:crop-region` IPC via `NativeImage.crop()`
- Old `screenshot:capture-region` IPC preserved for backward compatibility

**Sprint 15: Live Meeting Assistant + Auto Code Detection**
- audio-capture.ts: tries `electron-audio-loopback` native module, falls back to PowerShell WASAPI loopback
- `audio:start-system-capture` / `audio:stop-system-capture` / `audio:capture-status` IPC
- useLiveTranscription hook: `audio:chunk` events → 5-second Whisper processing pipeline
- useMeetingAssistant hook: interrogative heuristics (question detection) + debounced AI auto-suggest
- useCodeDetection hook: 30s periodic OCR via tesseract.js, 8-platform keyword classifier, regex-based language detection (Java, C++, TypeScript, JavaScript, Python, Go, Rust)
- MeetingPanel: slide-in with live transcript, detected questions, suggestion cards
- CodeDetectionCard: dismissible platform notification with "Switch to Coding mode" CTA
- SettingsAudio expanded: system audio source selector, meeting mode controls

**Sprint 16: Companion Mode + Templates + Export**
- companion-server.ts: HTTP + WebSocket server on `0.0.0.0:3847` with sequential port scan (10 attempts)
- One-time UUID pairing token → persistent device ID; QR rendered via `qrcode` npm package
- SettingsCompanion: start/stop server, QR display, connected devices list, port config, auto-start toggle
- template-store.ts: CRUD for `PromptTemplate` in electron-store
- 20 built-in templates across 8 categories (coding, writing, analysis, meeting, solve, research, debugging, custom)
- TemplateLibrary modal: searchable/filterable grid, VariableDialog for `{{variable}}` substitution, template editor
- `Ctrl+T` internal shortcut to open template library
- export-service.ts: JSON/Markdown/Plain Text/PDF export
- PDF generation via hidden BrowserWindow + `printToPDF()`

**Sprint 17: Memory (RAG) + Settings Reorganization + Polish**
- memory.ts: TF-IDF MemoryStore from scratch (~280 lines), max 500 facts, atomic JSON writes (tmp + rename)
- useMemory hook: `buildContextPrefix()` injects top-5 relevant facts into AI prompts
- Auto-extraction patterns: "remember that", "my X is Y", "I prefer X", "I work at X", etc.
- Duplicate detection via cosine similarity (threshold 0.8)
- SettingsMemory: enable/auto-extract toggles, context facts slider, total limit, stats display, clear-all
- MemoryPanel: slide-in browser with search, add, delete, pagination (20 per page)
- Settings restructured to 8-section left icon sidebar (API Keys, Hotkeys, Display, Privacy, Audio, Memory, Companion, Templates)
- initMemoryStore() called at app startup (deferred, non-blocking)

---

## 21. Error Handling

### 21.1 Error Strategy by Layer

**Main Process:**
- Try-catch in every IPC handler
- Return `{ success: false, error: string }` on failure
- `console.error()` in development, production logger in production

**Renderer:**
- Try-catch around all `window.ghostAPI.*` calls
- Errors shown in chat as error message bubbles (red alert)
- Toast notifications for non-critical errors

**AI Providers:**
- HTTP status codes mapped to `InvisiQError` codes via `mapProviderError()`
- User-friendly messages with suggested actions
- Retryable errors indicated

### 21.2 HTTP Error Mapping

| HTTP Status | Error Code | Message | Retryable | Action |
|-------------|-----------|---------|-----------|--------|
| 401 | E1001 | Invalid API key | No | add-key |
| 429 | E1002 | Rate limit exceeded | Yes (60s) | retry |
| 400 | E1005 | Input too long | No | switch-model |
| 403 | E1003 | Quota exceeded | No | check-settings |
| 404 | E1004 | Model not found | No | switch-model |
| 5xx | E1006 | Server error | Yes (5s) | retry |

### 21.3 Retry Strategy

```
Max retries:         3
Base delay:          1000ms
Max delay:           30000ms
Backoff multiplier:  2.0 (exponential)
Jitter:              ±25% randomness
```

---

## 22. Testing Strategy

### 22.1 Stealth Matrix (Critical)

Test after ANY change to window management or overlay code:

| Tool | Expected Result | Priority |
|------|----------------|----------|
| Windows Snipping Tool | InvisiQ NOT visible in screenshot | Critical |
| Windows Print Screen | InvisiQ NOT visible | Critical |
| Windows Game Bar (Win+G) | InvisiQ NOT visible | Critical |
| OBS Studio (Display Capture) | InvisiQ NOT visible in preview | Critical |
| Zoom Screen Share | InvisiQ NOT visible to remote viewers | Critical |
| Google Meet Screen Share | InvisiQ NOT visible | High |
| Microsoft Teams Screen Share | InvisiQ NOT visible | High |
| Discord Screen Share | InvisiQ NOT visible | High |
| Browser-based proctoring | InvisiQ NOT visible | Critical |

### 22.2 Performance Benchmarks

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Cold start time | < 3 seconds | Stopwatch: launch → overlay visible |
| Idle memory (RSS) | < 150 MB | Task Manager after 60s idle |
| Idle CPU | < 1% | Task Manager after 60s idle |
| Screenshot capture cycle | < 500ms | Hide → capture → show → return |
| Time to first AI token | < 2s (excl. API) | Send button → first token rendered |
| AI SDK lazy-load | < 500ms | First chat after cold start |

### 22.3 Functional Testing Checklist

**Overlay:**
- [ ] Window appears/disappears with Ctrl+Shift+G
- [ ] Escape hides overlay
- [ ] Window stays on top of all applications
- [ ] Drag handle moves window
- [ ] Resize works within min/max bounds
- [ ] Position persists across restarts
- [ ] Click-through mode works (Ctrl+Shift+P)

**Screenshots:**
- [ ] Full screen capture works (Ctrl+Alt+S)
- [ ] Region selection works (Ctrl+Alt+R)
- [ ] Inline snipping works (Phase 4)
- [ ] Multi-monitor: captures correct display
- [ ] Screenshot appears in chat as thumbnail

**AI Chat:**
- [ ] Messages stream progressively
- [ ] Code blocks have syntax highlighting
- [ ] Copy/Paste buttons work on code blocks
- [ ] Stop generation works mid-stream
- [ ] Vision: screenshots analyzed correctly
- [ ] All 4 providers work (OpenAI, Anthropic, Gemini, Ollama)

**Conversations:**
- [ ] Auto-save works (check file after sending message)
- [ ] Load conversation restores messages
- [ ] Search finds conversations by title/content
- [ ] Delete removes file
- [ ] Export generates correct format

**Memory:**
- [ ] "remember that my name is X" → fact stored
- [ ] New conversation → ask "what's my name?" → AI responds with X
- [ ] Memory panel shows stored facts
- [ ] Delete fact works
- [ ] Clear all removes all facts

---

## 23. Development Workflow

### 23.1 Setup

```bash
git clone <repo>
cd ghostai
npm install
```

### 23.2 Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Dev | `npm run dev` | electron-vite dev with hot reload |
| Build | `npm run build` | electron-vite production build |
| Start | `npm run start` | Preview production build |
| Typecheck | `npm run typecheck` | TypeScript compilation check |
| Lint | `npm run lint` | ESLint on src/ |
| Verify | `npm run verify` | Pre-build security checks |
| Package | `npm run package` | Build + package as Windows .exe |
| Package Dir | `npm run package:dir` | Unpacked output for testing |
| Publish | `npm run publish` | Build + publish to GitHub Releases |

### 23.3 Development Mode Features

- Hot module replacement for renderer (Vite)
- DevTools auto-open (detached mode)
- All global hotkeys still work
- Verbose logging enabled
- CORS bypass active for AI APIs

### 23.4 Build Pipeline

```
1. npm run typecheck        # Verify types compile
2. npm run lint             # Check code quality
3. npm run verify           # Security checks
4. npm run build            # Production Vite build
5. npm run package          # electron-builder → .exe
```

**Build Verification (`verify-build.ts`) Checks:**
- `setContentProtection(true)` present in overlay.ts
- `contextIsolation: true` in overlay.ts
- `nodeIntegration: false` in overlay.ts
- `productName` is "SystemHelper" in electron-builder.yml
- No hardcoded development paths

---

## 24. Coding Standards

### 24.1 TypeScript

- **Strict mode:** `"strict": true` in all tsconfig files
- **No `any`:** Unless absolutely necessary (with explaining comment)
- **Explicit return types:** On all exported functions
- **Interface over type:** For object shapes; `type` for unions/intersections
- **Enum for error codes:** String literals for small unions
- **Async/await:** Over raw Promises
- **AsyncGenerator:** For streaming responses

### 24.2 React

- **Functional components only** — no class components
- **Custom hooks** for all logic — components are thin UI shells
- **Props interfaces** defined above the component in the same file
- **No inline styles** — Tailwind classes exclusively
- **Memoize expensive computations** with `useMemo` / `useCallback`
- **Error boundaries** around AI chat and settings panels

### 24.3 File Naming

```
Components:   PascalCase.tsx       ChatPanel.tsx, CodeBlock.tsx
Hooks:        camelCase.ts         useAI.ts, useSettings.ts
Services:     kebab-case.ts        provider-manager.ts, ocr-service.ts
Types:        camelCase.ts         types.ts, global.d.ts
Main process: kebab-case.ts        ipc-handlers.ts, region-selector.ts
Constants:    camelCase.ts         constants.ts
```

### 24.4 Import Order

```typescript
// 1. Node/Electron built-ins
import { app, BrowserWindow } from 'electron';
import path from 'path';

// 2. External packages
import React, { useState, useEffect } from 'react';

// 3. Internal modules (path aliases)
import { InvisiQError } from '@shared/errors';

// 4. Relative imports
import { CodeBlock } from './CodeBlock';
```

### 24.5 Error Handling Rules

- Main process: try-catch in every IPC handler
- Renderer: try-catch around all `window.ghostAPI.*` calls
- Never swallow errors silently — at minimum `console.error()` in dev
- Return structured error objects with user-friendly messages

---

## 25. Configuration Files

### 25.1 electron-builder.yml

```yaml
appId: com.ghostai.app
productName: SystemHelper          # Stealth: not "InvisiQ"
directories:
  buildResources: assets
  output: release
files:
  - out/**/*
  - package.json
  - node_modules/**/*
win:
  target:
    - target: nsis
      arch: [x64]
nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: false     # Stealth: no shortcuts
  createStartMenuShortcut: false
  deleteAppDataOnUninstall: true
publish:
  provider: github
  owner: Nezeon
  repo: InvisiQ
```

### 25.2 electron.vite.config.ts

Three build targets:
- **Main:** Node.js/Electron, externalizes native modules, `@shared` alias
- **Preload:** contextBridge script, `@shared` alias
- **Renderer:** React + Vite, `@renderer` and `@shared` aliases

External modules: `electron-audio-loopback` (optional native)
Bundled modules: `node-machine-id`, `electron-store`

### 25.3 tsconfig.json

Project references pattern:
- `tsconfig.node.json` — Main process + preload
- `tsconfig.web.json` — Renderer process

Both use strict mode.

### 25.4 tailwind.config.ts

- Content: `./src/renderer/**/*.{tsx,ts}`
- Dark mode: `class` strategy
- Custom theme: RGB-based colors, Inter/JetBrains Mono fonts, custom spacing/radius/shadows
- Custom animations: pulse-glow, shimmer, scan-pulse, mic-pulse
- Custom timing functions: out-expo, in-out-expo, spring, smooth

---

## 26. Future Roadmap

### Phase 5 — Planned Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Plugin System** | Extensible architecture for third-party plugins | Planned |
| **Voice-to-Voice** | Audio input → AI → text-to-speech output conversation mode | Planned |
| **Multi-Window** | Multiple overlay windows for different contexts | Planned |
| **macOS Support** | Full support with caveats for Sequoia (macOS 15+) | Planned |
| **Linux Support** | Wayland/X11 considerations for content protection | Planned |
| **Tauri Migration** | Smaller app size (~10MB vs ~200MB Electron) | Considered |
| **Mobile Companion App** | Native iOS/Android app for remote control | Planned |
| **Vector Embeddings** | Replace TF-IDF memory with vector DB for better RAG | Planned |
| **Integrations** | Slack, Email, Note-taking app integrations | Planned |
| **AR/Smart Glasses** | Meta Ray-Ban and similar device integration | Explored |

---

## Appendix: Quick Reference

### Environment Variables

InvisiQ does **not** use environment variables for API keys. All keys are stored locally via electron-store with encryption. The only env var:

```
NODE_ENV=development|production    # Set automatically by Vite/Electron
ELECTRON_RENDERER_URL              # Set by electron-vite in dev mode
```

### Key File Locations

| What | Path |
|------|------|
| Settings | `%APPDATA%/ghostai/config.json` |
| Conversations | `%APPDATA%/ghostai/conversations/*.json` |
| Memory | `%APPDATA%/ghostai/memory.json` |
| Logs | `%APPDATA%/ghostai/logs/` |
| Build Output | `./out/main/`, `./out/preload/`, `./out/renderer/` |
| Release Package | `./release/*.exe` |

### Critical Code Lines

```typescript
// THE most important line — makes the app invisible:
overlayWindow.setContentProtection(true);   // src/main/overlay.ts

// Security boundary:
contextIsolation: true                      // src/main/overlay.ts
nodeIntegration: false                      // src/main/overlay.ts

// Screenshot sequence:
overlayWindow.hide();                       // src/main/screenshot.ts
await sleep(100);                           // DWM needs 100ms to recompose
desktopCapturer.getSources(...)             // Capture while hidden
overlayWindow.show();                       // Restore
```

---

*This documentation covers the complete InvisiQ project from conception through Phase 4 completion. It is the single source of truth for understanding the project's architecture, features, and implementation details.*

*Generated: February 20, 2026*
