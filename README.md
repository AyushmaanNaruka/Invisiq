<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:0a0f1a,50:111d3a,100:00B894&height=220&section=header&text=InvisiQ&fontSize=72&fontColor=E8E8E8&animation=fadeIn&fontAlignY=38&desc=Your%20AI%20copilot%20that%20sees%20everything%2C%20but%20is%20seen%20by%20no%20one.&descSize=16&descColor=8B8B9E&descAlignY=58" width="100%" />
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/version-1.2.0-00B894?style=for-the-badge&labelColor=0a0f1a" alt="Version" /></a>
  <a href="#"><img src="https://img.shields.io/badge/platform-Windows%2010%2F11-0078D4?style=for-the-badge&logo=windows&logoColor=white&labelColor=0a0f1a" alt="Platform" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-FDCB6E?style=for-the-badge&labelColor=0a0f1a" alt="License" /></a>
  <a href="#"><img src="https://img.shields.io/badge/electron-33+-47848F?style=for-the-badge&logo=electron&logoColor=white&labelColor=0a0f1a" alt="Electron" /></a>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/OpenAI-supported-412991?style=flat-square&logo=openai&logoColor=white" alt="OpenAI" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Anthropic-supported-D97757?style=flat-square&logo=anthropic&logoColor=white" alt="Anthropic" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Google%20Gemini-supported-4285F4?style=flat-square&logo=googlegemini&logoColor=white" alt="Gemini" /></a>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> &nbsp;·&nbsp;
  <a href="#-features">Features</a> &nbsp;·&nbsp;
  <a href="#-architecture">Architecture</a> &nbsp;·&nbsp;
  <a href="#-user-guide">User Guide</a> &nbsp;·&nbsp;
  <a href="#-keyboard-shortcuts">Shortcuts</a> &nbsp;·&nbsp;
  <a href="#-roadmap">Roadmap</a>
</p>

---

<br/>

## What is InvisiQ?

InvisiQ is a desktop overlay that sits on top of every application on your screen — **completely invisible to all screen capture, screen sharing, recording software, and proctoring tools**. It uses Windows' native `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` API to make the overlay window undetectable.

Capture your screen, ask questions, get real-time AI responses with streaming — all through a sleek interface controlled entirely by keyboard shortcuts. Bring your own API key for **OpenAI, Anthropic, or Google Gemini** (cloud-only). Conversations, settings, and API keys stay encrypted on your machine.

> **No sign-in, no trial, no telemetry.** InvisiQ is fully open-source and runs entirely on your machine — no account, no gate, no expiration. BYOK cloud provider keys (OpenAI, Anthropic, Google Gemini) are optional and added in Settings → API Keys, or skip cloud providers entirely and run fully free/offline against a local Ollama server (install Ollama, `ollama pull <model>`, then point InvisiQ at it in Settings).

<br/>

## ✨ Features

<table>
<tr>
<td width="50%" valign="top">

### 👻 Invisible Overlay
The window is **excluded from all capture APIs** at the OS level. Snipping Tool, OBS, Zoom, Teams, Meet, proctoring software — none of them can see it. This is a native Windows compositing feature, not a hack.

</td>
<td width="50%" valign="top">

### 🤖 Multi-Provider AI (BYOK)
Connect to **OpenAI**, **Anthropic Claude**, or **Google Gemini** with your own API keys. Switch models mid-conversation (`Ctrl+Shift+]` / `[`). Stream responses token-by-token. Cloud-only — the local-LLM/Ollama path was removed.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 📸 Screen Capture + Vision
Full-screen, per-monitor, or in-overlay region capture. Screenshots are sent to the provider's vision model. The overlay hides itself during capture so it never appears in the shot.

</td>
<td width="50%" valign="top">

### 🔐 AES-256-GCM Encryption
API keys are encrypted with a machine-specific key derived via **PBKDF2** (100k iterations, SHA-512). Keys are tied to your hardware. No plaintext secrets ever touch disk.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🕵️ Process Camouflage
The app disguises itself as **Runtime Broker** — a legitimate Windows system process. Custom `AppUserModelId`, matching copyright metadata, and configurable process names make it undetectable in Task Manager.

</td>
<td width="50%" valign="top">

### 🛡️ Resilience Mode
Optional native C++ helper process communicates via **Windows named pipes**. Detours-based API hooking forces `WDA_EXCLUDEFROMCAPTURE` on target windows. Auto-start, status monitoring, and graceful shutdown.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🖥️ Multi-Monitor Support
Monitor detection with hot-plug events. Screenshots capture the correct display. Region selector opens on the cursor's monitor. Overlay position validated against connected displays.

</td>
<td width="50%" valign="top">

### 🎨 Dark & Light Themes
Full dark and light color palettes via CSS custom properties. Toggle in Display settings. Syntax highlighting adapts to the active theme. All Tailwind opacity modifiers work with both themes.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🧠 Single Universal Mode
No mode picker, no templates, no friction. One intent-adaptive prompt reads your message + screenshot and responds in the right shape — answer-first for questions, algorithm-first for code, talking points for meetings — like ChatGPT/Claude.

</td>
<td width="50%" valign="top">

### 💾 Chat History & Memory
Conversations auto-save with debounced persistence. TF-IDF memory system (RAG) auto-extracts facts and injects relevant context into AI prompts. Browse, search, and export your full history.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 📋 Smart Paste & Clipboard
Copy AI responses or code blocks directly into any application with **Smart Paste** — the overlay hides, activates the target window, and simulates Ctrl+V. Clipboard monitoring detects external changes.

</td>
<td width="50%" valign="top">

### 🎤 Voice Input + Meeting Assistant
Dual engine speech recognition: **Web Speech API** + **Whisper**. Live meeting assistant with system audio capture, auto-question detection, and AI-powered suggestions. Code detection via periodic OCR.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 💰 Cost Tracking
Per-request, per-conversation, and per-session token and cost tracking in the status bar. No trial, no sign-in — free to use for as long as you want.

</td>
<td width="50%" valign="top">

### 📦 Portable Distribution
Single portable `.exe` — no installer needed. Just download, double-click, and run. No registry entries. No Start Menu shortcuts. Clean and untraceable.

</td>
</tr>
</table>

<br/>

## Supported Models

| Provider | Model | Vision | Context | Speed |
|:---------|:------|:------:|--------:|:-----:|
| **OpenAI** | GPT-4o | Yes | 128K | Medium |
| **OpenAI** | GPT-4o Mini | Yes | 128K | Fast |
| **OpenAI** | o3-mini (Reasoning) | No | 200K | Slow |
| **Anthropic** | Claude Sonnet 4 | Yes | 200K | Medium |
| **Anthropic** | Claude Haiku 4.5 | Yes | 200K | Fast |
| **Google** | Gemini 2.5 Flash | Yes | 1M | Fast |
| **Google** | Gemini 2.5 Pro | Yes | 1M | Medium |

> Cloud-only, bring-your-own-key. The Ollama / local-LLM path was removed permanently. Model list lives in `src/shared/constants.ts`.

<br/>

## 🏗️ Architecture

### High-Level System Diagram

```
╔══════════════════════════════════════════════════════════════════════════╗
║                         InvisiQ Architecture                           ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                        ║
║  ┌─────────────────────────────────────────────────────────────────┐   ║
║  │                    ELECTRON MAIN PROCESS                        │   ║
║  │                    (Node.js Runtime)                             │   ║
║  │                                                                 │   ║
║  │  ┌───────────┐ ┌───────────┐ ┌────────────┐ ┌───────────────┐  │   ║
║  │  │  Overlay   │ │  Hotkey   │ │ Screenshot │ │  Encrypted    │  │   ║
║  │  │  Window    │ │  Manager  │ │  Capture   │ │  Store        │  │   ║
║  │  │           │ │           │ │            │ │  (AES-256)    │  │   ║
║  │  │ setContent │ │ global    │ │ hide→wait  │ │  PBKDF2 key   │  │   ║
║  │  │ Protection │ │ Shortcut  │ │ →capture   │ │  derivation   │  │   ║
║  │  │ (true)    │ │ register  │ │ →restore   │ │               │  │   ║
║  │  └───────────┘ └───────────┘ └────────────┘ └───────────────┘  │   ║
║  │                                                                 │   ║
║  │  ┌───────────┐ ┌───────────┐ ┌────────────┐ ┌───────────────┐  │   ║
║  │  │  Monitor  │ │  Stealth  │ │  Companion │ │  Memory       │  │   ║
║  │  │  Manager  │ │  Watchdog │ │  Server    │ │  Store        │  │   ║
║  │  │           │ │           │ │  (WS+HTTP) │ │  (TF-IDF RAG) │  │   ║
║  │  │ hot-plug  │ │ 2s re-    │ │  QR pair   │ │  500 facts    │  │   ║
║  │  │ detection │ │ enforce   │ │  port 3847 │ │  auto-extract │  │   ║
║  │  └───────────┘ └───────────┘ └────────────┘ └───────────────┘  │   ║
║  │                                                                 │   ║
║  │  ┌───────────────────────┐  ┌──────────────────────────────┐   │   ║
║  │  │  Resilience Controller│  │  Auto-Updater                │   │   ║
║  │  │  (Named Pipe Client)  │  │  (GitHub Releases)           │   ║
║  │  │                       │  │                              │   │   ║
║  │  │  Spawns helper.exe    │  │  Check → Download → Notify   │   │   ║
║  │  │  \\.\pipe\InvisiQ     │  │  Install on restart          │   │   ║
║  │  └───────────┬───────────┘  └──────────────────────────────┘   │   ║
║  │              │                                                  │   ║
║  └──────────────┼────────────────────────┬─────────────────────────┘   ║
║                 │                        │                             ║
║                 │ Named Pipe             │ IPC Bridge                  ║
║                 │ (NDJSON)               │ (contextBridge)             ║
║                 │                        │                             ║
║  ┌──────────────▼───────┐  ┌─────────────▼─────────────────────────┐  ║
║  │  NATIVE HELPER       │  │          RENDERER PROCESS              │  ║
║  │  (ghostai_helper.exe)│  │          (Chromium Sandbox)            │  ║
║  │                      │  │                                        │  ║
║  │  Named Pipe Server   │  │  ┌──────────┐ ┌────────┐ ┌─────────┐ │  ║
║  │  JSON command/resp   │  │  │ Chat UI  │ │Settings│ │Onboard- │ │  ║
║  │  Detours DLL inject  │  │  │ Panel    │ │ Panel  │ │ing Flow │ │  ║
║  │                      │  │  └──────────┘ └────────┘ └─────────┘ │  ║
║  │  ghostai_core.dll    │  │                                        │  ║
║  │  ├ Hook SetWindow    │  │  ┌──────────────────────────────────┐ │  ║
║  │  │ DisplayAffinity   │  │  │         AI Provider Layer         │ │  ║
║  │  └ Force WDA_EXCLUDE │  │  │                                  │ │  ║
║  │                      │  │  │  ┌────────┐ ┌──────────┐         │ │  ║
║  └──────────────────────┘  │  │  │ OpenAI │ │Anthropic │         │ │  ║
║                            │  │  │ GPT-4o │ │ Claude   │         │ │  ║
║                            │  │  └───┬────┘ └────┬─────┘         │ │  ║
║                            │  │      │           │               │ │  ║
║                            │  │  ┌───┴────┐                     │ │  ║
║                            │  │  │ Google │   (cloud-only, BYOK) │ │  ║
║                            │  │  │ Gemini │                     │ │  ║
║                            │  │  └───┬────┘                     │ │  ║
║                            │  │      │                          │ │  ║
║                            │  └──────┼──────────────────────────┘ │  ║
║                            │         │                            │  ║
║                            └─────────┼────────────────────────────┘  ║
║                                      │                               ║
╚══════════════════════════════════════╪═══════════════════════════════╝
                                       │
                              Cloud APIs (HTTPS)
                       OpenAI · Anthropic · Google Gemini
```

### Screenshot Capture Flow

```
User presses Ctrl+Shift+S
        │
        ▼
┌─────────────────┐
│  overlay.hide() │─── Window disappears from screen
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  await 100ms    │─── DWM recomposes desktop without overlay
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  desktopCapturer│─── Captures clean screen (no ghost artifacts)
│  .getSources()  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  overlay.show() │─── Window reappears (still invisible to capture)
└────────┬────────┘
         │
         ▼
┌──────────────────────┐
│  Resize ≤1920px wide │
│  → base64            │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Send image to the   │
│  provider vision API │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  AI streams response │
│  → rendered in chat  │
└──────────────────────┘
```

### Stealth Layer Architecture

```
                    ┌──────────────────────────────────────┐
                    │          STEALTH LAYERS               │
                    ├──────────────────────────────────────┤
                    │                                      │
  Layer 1:          │  setContentProtection(true)          │
  OS-Level          │  ├─ Excluded from PrintWindow        │
  Invisibility      │  ├─ Excluded from BitBlt capture     │
                    │  ├─ Excluded from DXGI duplication   │
                    │  └─ Invisible to ALL capture APIs    │
                    │                                      │
  Layer 2:          │  Stealth Watchdog (every 2s)         │
  Self-Healing      │  └─ Re-applies content protection    │
                    │     in case of state drops           │
                    │                                      │
  Layer 3:          │  Process Camouflage                  │
  Identity          │  ├─ EXE name: RuntimeBroker.exe      │
  Disguise          │  ├─ Product: Runtime Broker           │
                    │  ├─ Author: Microsoft Corporation    │
                    │  ├─ AppUserModelId: Microsoft.*      │
                    │  └─ Config dir: %APPDATA%\Runtime*   │
                    │                                      │
  Layer 4:          │  Window Hiding                       │
  UI Hiding         │  ├─ skipTaskbar: true                │
                    │  ├─ Alt-Tab: hidden                  │
                    │  └─ No desktop/start menu shortcuts  │
                    │                                      │
  Layer 5:          │  Resilience Agent (Optional)         │
  Native Helper     │  ├─ Named pipe communication         │
                    │  ├─ Detours API hooking              │
                    │  └─ Force WDA_EXCLUDEFROMCAPTURE     │
                    │                                      │
                    └──────────────────────────────────────┘
```

### IPC Communication Model

```
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│   RENDERER   │          │   PRELOAD    │          │     MAIN     │
│   (React)    │          │  (Bridge)    │          │   (Node.js)  │
│              │          │              │          │              │
│ window       │ invoke() │ contextBridge│ ipcMain  │ ipcMain      │
│ .ghostAPI    ├─────────►│ .exposeIn    ├─────────►│ .handle()    │
│ .screenshot  │          │ MainWorld()  │          │              │
│ .capture()   │          │              │          │ screenshot   │
│              │◄─────────┤              │◄─────────┤ .capture()   │
│              │  result  │              │  result  │              │
└──────────────┘          └──────────────┘          └──────────────┘

Channels: {domain}:{action}
  overlay:*   screenshot:*   store:*       hotkeys:*
  clipboard:* conversation:* app:*         monitors:*
  update:*    audio:*        companion:*   memory:*
  export:*    resilience:*   capture:*     invisible-input:*
```

<br/>

## Tech Stack

<p align="center">
  <img src="https://img.shields.io/badge/Electron-33-47848F?style=for-the-badge&logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/C++-Native-00599C?style=for-the-badge&logo=cplusplus&logoColor=white" alt="C++" />
</p>

| Layer | Technology | Purpose |
|:------|:-----------|:--------|
| Runtime | Electron 33+ | Desktop shell, system APIs, content protection |
| Frontend | React 18 | Component UI with hooks |
| Language | TypeScript 5 (strict) | Type safety across all processes |
| Native | C++ (Detours + Win32) | API hooking, named pipes, process hiding |
| Styling | TailwindCSS 3 + Framer Motion 11 | Utility-first theming + animations |
| Build | electron-vite 5 | Unified main/preload/renderer builds |
| AI (Cloud, BYOK) | openai, @anthropic-ai/sdk, @google/generative-ai | Provider SDKs with streaming (lazy-loaded) |
| OCR | Tesseract.js 5 | On-screen code/platform detection |
| Storage | electron-store + AES-256-GCM | Encrypted key/config storage (machine-bound) |
| Updates | electron-updater (NSIS feed) | Auto-update via GitHub Releases |
| Markdown | react-markdown + highlight.js | Rich response rendering |
| Icons | lucide-react | UI iconography |
| Packaging | electron-builder | Portable Windows executable |

<br/>

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and **npm** 9+
- **Windows 10** version 2004 or later (required for `WDA_EXCLUDEFROMCAPTURE`)
- (Optional) An API key from a cloud provider: [OpenAI](https://platform.openai.com/api-keys) / [Anthropic](https://console.anthropic.com/) / [Google AI Studio](https://aistudio.google.com/apikey) — or install [Ollama](https://ollama.com) and pull a model to run fully free/offline

### Install & Run

```bash
# Clone the repository
git clone https://github.com/Nezeon/InvisiQ.git
cd InvisiQ

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

# Package as portable Windows .exe
npm run package

# Package unpacked for testing
npm run package:dir
```

### First Launch

1. No sign-in, no trial — the app boots straight to the **onboarding wizard**, which guides you through API key setup (optional), hotkey reference, and a stealth self-test
2. Press **Ctrl+Shift+G** to toggle the overlay; the gear icon opens **Settings** to manage your API key or local Ollama server

<br/>

## 📖 User Guide

### Setting Up AI Providers (cloud-only, BYOK)

1. Open InvisiQ → **Settings** (gear icon or `Ctrl+,`)
2. Go to **API Keys** tab
3. Paste your API key for **OpenAI**, **Anthropic**, or **Google Gemini**
4. The key is validated automatically and stored with AES-256-GCM encryption, tied to a machine-specific key — no trial, no expiration
5. Select a model from the **model dropdown** in the header bar (or cycle with `Ctrl+Shift+]` / `[`)

> The local-LLM / Ollama path was removed permanently — InvisiQ is cloud-only.

### Taking Screenshots

| Action | Shortcut | What Happens |
|:-------|:---------|:-------------|
| **Full Screen** | `Ctrl+Shift+S` | Captures entire screen, attaches to chat |
| **Region** | `Ctrl+Shift+R` | Opens crosshair selector, capture selected area |
| **Inline Snip** | Click snip icon | In-overlay region selection without leaving the app |

Screenshots are automatically:
- Resized to max 1920px width (saves tokens)
- Sent to the provider's vision model (OpenAI, Anthropic, Gemini)
- Cleared from memory after sending

### One Universal Mode (no picker)

InvisiQ has a single intent-adaptive prompt — there is no mode dropdown and no templates. Just type or screenshot and send; the model infers what you need from the message + screen:

| What's on screen / asked | How InvisiQ responds |
|:-------------------------|:---------------------|
| A question / MCQ / assessment item | Answer first, then a tight explanation |
| Code or an algorithm problem / error | Approach + Big-O, then full runnable solution |
| A meeting / call / transcript | 2–3 concise talking points + action items |
| Anything else | Direct, well-structured general assistant |

> Behavior is tuned via `UNIVERSAL_SYSTEM_PROMPT` in `src/shared/constants.ts` — it's config, not a feature you configure in the UI.

### Smart Paste

1. Get an AI response with code or text you want to use
2. Click **"Paste to App"** on the message or code block — OR press `Ctrl+Shift+V`
3. InvisiQ will:
   - Copy the content to clipboard
   - Hide the overlay
   - Activate the target window
   - Simulate Ctrl+V
   - Restore the overlay

### Conversation History

- **Browse:** Click the history icon in the header (or `Ctrl+K`)
- **Search:** Type in the search bar to find past conversations
- **Export:** Export as JSON, Markdown, TXT, or PDF
- **Auto-Save:** Conversations save automatically every 500ms

### Memory System (RAG)

InvisiQ has a built-in TF-IDF memory system:
- **Auto-Extract:** Key facts are extracted from conversations automatically
- **Context Injection:** Relevant memories are injected into AI prompts
- **Manual Add:** Add facts manually via the Memory panel
- **Settings:** Configure in Settings → Memory tab (limit, auto-extract toggle)

### Resilience Mode (Advanced)

Resilience mode spawns a native C++ helper process for low-level operations:

1. Go to **Settings → Resilience** tab
2. Click **Start Agent** to launch the helper
3. The helper communicates via Windows named pipes (`\\.\pipe\InvisiQ`)
4. Enable **Auto-Start** to launch the helper automatically with the app
5. Monitor status, uptime, and PID in the settings panel

> **Note:** Resilience mode requires the compiled `ghostai_helper.exe`. This is optional — InvisiQ works fully without it.

### Tips & Best Practices

- **Stealth Check:** After first install, take a screenshot with Snipping Tool to verify the overlay is invisible
- **Opacity:** Use the opacity slider to make the overlay semi-transparent so you can see through it
- **Compact Mode:** Resize the window below 350px width for a minimal UI
- **Cost Awareness:** Check the status bar for running per-request / conversation / session token + cost totals
- **Multiple Monitors:** The overlay position is validated on startup; move it between monitors via Settings → Display

<br/>

## ⌨️ Keyboard Shortcuts

### Global Hotkeys (work from any app)

| Shortcut | Action |
|:---------|:-------|
| `Ctrl+Shift+G` | Toggle overlay visibility |
| `Ctrl+Shift+S` | Capture full screen |
| `Ctrl+Shift+R` | Capture region (crosshair selector) |
| `Ctrl+Shift+A` | Focus text input |
| `Ctrl+Shift+C` | Copy last AI response |
| `Ctrl+Shift+V` | Paste last AI response to active app |
| `Ctrl+Shift+N` | New conversation |
| `Ctrl+Shift+P` | Toggle click-through (passthrough) |
| `Ctrl+Shift+]` / `[` | Next / previous model |
| `Ctrl+Shift+I` | Toggle stealth typing / capture mode |
| `Ctrl+Shift+Q` | Panic — exit capture, uninstall hook, hide overlay |
| `Escape` | Hide overlay (also exits capture) |

### Internal Shortcuts (when overlay is focused)

| Shortcut | Action |
|:---------|:-------|
| `Ctrl+,` | Toggle Settings panel |
| `Ctrl+L` | Clear conversation (double-press) |
| `Ctrl+K` | Open conversation search |

> All global hotkeys are customizable in **Settings → Hotkeys**.

<br/>

## One Universal Mode

There are no built-in modes or templates to choose from anymore — a single intent-adaptive prompt covers every case (questions, code, meetings, general). The model decides the response shape from your message + screenshot. See **One Universal Mode (no picker)** above.

<br/>

## 🔒 Security & Privacy

| Aspect | Implementation |
|:-------|:---------------|
| **Window Invisibility** | `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` via Electron's `setContentProtection(true)` |
| **Stealth Watchdog** | Re-applies content protection every 2 seconds |
| **Key Encryption** | AES-256-GCM; machine-specific key (PBKDF2, 100K iters, SHA-512) |
| **Process Isolation** | `contextIsolation: true`, `nodeIntegration: false`, IPC-only communication |
| **Process Disguise** | Appears as "Runtime Broker" with Microsoft Corporation metadata |
| **Data Residency** | Conversations, settings, and API keys stay encrypted on your machine. No telemetry, no analytics, no sign-in — nothing is sent to a backend. |
| **API Architecture** | BYOK (Bring Your Own Key), cloud-only. AI calls go direct to OpenAI/Anthropic/Google. No auth, trial, or analytics backend. |
| **Screenshot Lifecycle** | Screenshots cleared from memory after sending. Not persisted to disk. |
| **Portable Build** | No installer, no registry entries, no Start Menu — just a standalone `.exe` |

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
│   │   ├── memory.ts            # TF-IDF memory store (RAG)
│   │   ├── resilience-controller.ts # Native helper lifecycle + named pipes
│   │   ├── capture-controller.ts # Model B capture session (epoch, heartbeat, ladder)
│   │   ├── companion-server.ts  # HTTP + WebSocket companion server
│   │   ├── export-service.ts    # JSON/MD/TXT/PDF export
│   │   └── tray.ts              # Optional system tray icon
│   │
│   ├── preload/
│   │   └── index.ts             # contextBridge API surface
│   │
│   ├── renderer/                # React Frontend
│   │   ├── App.tsx              # Root component
│   │   ├── components/          # UI components (30+ files)
│   │   ├── hooks/               # Custom hooks (12+ files)
│   │   ├── services/
│   │   │   ├── ai-providers/    # OpenAI, Anthropic, Gemini (cloud-only)
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
├── ghostai_core.cpp             # Detours DLL (API hooking)
├── ghostai_helper.cpp           # Named pipe server (native helper)
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

## 🗺️ Roadmap

### Phase 1 — Core MVP ✅
- [x] Invisible overlay with content protection
- [x] Full-screen and region screenshot capture
- [x] OpenAI, Anthropic, and Gemini streaming chat
- [x] Markdown rendering with syntax-highlighted code blocks
- [x] AES-256-GCM encrypted API key storage
- [x] Global keyboard shortcuts + ~~4 built-in modes~~ (later collapsed to one universal mode)

### Phase 2 — Enhanced Features ✅
- [x] Chat history persistence with auto-save and auto-titling
- [x] ~~Custom modes with color picker~~ (removed — single universal mode)
- [x] Smart paste — paste AI responses into any app
- [x] Clipboard monitoring with toast notifications
- [x] Voice input (Web Speech API + Whisper)
- [x] Live transcript panel + meeting mode auto-context
- [x] Enhanced stealth (process disguise, alt-tab hiding, watchdog)

### Phase 3 — Production Polish ✅
- [x] Multi-monitor support with hot-plug detection
- [x] 3-step onboarding wizard
- [x] ~~Ollama local AI provider~~ (removed — cloud-only)
- [x] Light theme + per-request cost tracking
- [x] Auto-updater via GitHub Releases
- [x] Responsive layout + internal keyboard shortcuts
- [x] Lazy-loaded AI SDKs (~4MB saved at startup)

### Phase 4 — Invisible Intelligence Platform ✅
- [x] Enterprise design system (Framer Motion, GhostButton, GhostCard)
- [x] Click-through overlay + inline region selector
- [x] Live meeting assistant (system audio + auto-question detection)
- [x] Companion mode (HTTP/WS server + QR pairing)
- [x] ~~20+ prompt templates across 8 categories~~ (removed — single universal mode)
- [x] TF-IDF memory system (RAG) with auto-extraction
- [x] JSON/MD/TXT/PDF export

### Phase 5 — Beta Launch + Stealth Hardening ✅
- [x] **Model B default-on stealth** — suppressing out-of-process capture helper, logical-focus typing, degradation ladder
- [x] Native C++ helper + named pipe; full process camouflage (Runtime Broker disguise)
- [x] **Google sign-in** + **server-clocked 14-day trial** (fail-closed) on a Supabase backend
- [x] **Analytics + prompt capture** behind a T&C gate; **remote kill-switch + minimum-version floor**
- [x] **Real auto-update** (NSIS feed) + forced-update path
- [x] **Cloud-only** (Ollama removed); hotkeys migrated Alt → Shift
- [x] **Single universal mode** — modes + templates removed; one intent-adaptive prompt
- [x] OCR repurposed to on-screen code/platform detection; portable distribution

### Phase 6 — Future / Act 2
- [ ] Own AI backend (managed inference; remove BYOK requirement)
- [ ] Admin / org-level standardized prompt pushed to a fleet
- [ ] Plugin system · voice-to-voice mode · multi-window · macOS

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
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:0a0f1a,50:111d3a,100:00B894&height=100&section=footer" width="100%" />
</p>
