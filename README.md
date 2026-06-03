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
  <a href="#"><img src="https://img.shields.io/badge/Ollama-supported-ffffff?style=flat-square&logo=ollama&logoColor=black" alt="Ollama" /></a>
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

Capture your screen, ask questions, get real-time AI responses with streaming — all through a sleek interface controlled entirely by keyboard shortcuts. Connect cloud AI providers with your own API keys, or run fully local with Ollama. Zero cloud dependency. Everything stays on your machine.

<br/>

## ✨ Features

<table>
<tr>
<td width="50%" valign="top">

### 👻 Invisible Overlay
The window is **excluded from all capture APIs** at the OS level. Snipping Tool, OBS, Zoom, Teams, Meet, proctoring software — none of them can see it. This is a native Windows compositing feature, not a hack.

</td>
<td width="50%" valign="top">

### 🤖 Multi-Provider AI
Connect to **OpenAI**, **Anthropic Claude**, **Google Gemini**, or run fully local with **Ollama**. Switch models mid-conversation. Stream responses token-by-token. Ollama models are always free.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 📸 Screen Capture + Vision
Full-screen or region capture with a crosshair selector. Screenshots are sent to AI vision models. For Ollama, **OCR auto-extracts text** from screenshots so models read code instead of describing images.

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

### 🧠 Smart Modes
Four built-in modes: **General**, **Coding**, **Meeting**, and **Solve**. Create custom modes with personalized system prompts and colors. 20+ built-in prompt templates across 8 categories.

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
Per-request, per-conversation, and per-session token and cost tracking. Status bar shows real-time cost. Ollama models always show "Free".

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
| **Google** | Gemini 2.0 Flash | Yes | 1M | Fast |
| **Google** | Gemini 2.5 Pro | Yes | 1M | Medium |
| **Ollama** | qwen2.5-coder:7b | Via OCR | Varies | Local |
| **Ollama** | qwen2.5:7b | Via OCR | Varies | Local |
| **Ollama** | *Any local model* | Via OCR | Varies | Local |

> Ollama models are discovered dynamically via `/api/tags`. Screenshots are OCR-processed so text/code is extracted and sent as context — no vision API required.

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
║                            │  │  ┌───┴────┐ ┌────┴─────┐         │ │  ║
║                            │  │  │ Gemini │ │ Ollama   │         │ │  ║
║                            │  │  │ Flash  │ │ (Local)  │         │ │  ║
║                            │  │  └───┬────┘ └────┬─────┘         │ │  ║
║                            │  │      │           │               │ │  ║
║                            │  └──────┼───────────┼───────────────┘ │  ║
║                            │         │           │                  │  ║
║                            └─────────┼───────────┼──────────────────┘  ║
║                                      │           │                     ║
╚══════════════════════════════════════╪═══════════╪═════════════════════╝
                                       │           │
                              Cloud APIs     localhost:11434
                              (HTTPS)        (Ollama Server)
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
    Is provider Ollama?
     /          \
   Yes           No
    │             │
    ▼             ▼
┌──────────┐  ┌──────────────┐
│ OCR text │  │ Send image   │
│ extract  │  │ to vision    │
│ via      │  │ API directly │
│ Tesseract│  └──────┬───────┘
└────┬─────┘         │
     │               │
     ▼               │
┌──────────┐         │
│ Send OCR │         │
│ text as  │         │
│ context  │         │
│ (no img) │         │
└────┬─────┘         │
     │               │
     ▼               ▼
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
  overlay:*   screenshot:*   store:*   hotkeys:*
  clipboard:* conversation:* modes:*   app:*
  monitors:*  update:*       audio:*   companion:*
  template:*  memory:*       export:*  resilience:*
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
| AI (Cloud) | openai, @anthropic-ai/sdk, @google/generative-ai | Provider SDKs with streaming (lazy-loaded) |
| AI (Local) | Ollama (native fetch, NDJSON) | Local LLM inference |
| OCR | Tesseract.js 5 | Screenshot text extraction for Ollama |
| Storage | electron-store + AES-256-GCM | Encrypted key/config storage |
| Updates | electron-updater | Auto-update via GitHub Releases |
| Markdown | react-markdown + highlight.js | Rich response rendering |
| Icons | lucide-react | UI iconography |
| Packaging | electron-builder | Portable Windows executable |

<br/>

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and **npm** 9+
- **Windows 10** version 2004 or later (required for `WDA_EXCLUDEFROMCAPTURE`)
- API key from at least one provider: [OpenAI](https://platform.openai.com/api-keys) / [Anthropic](https://console.anthropic.com/) / [Google AI Studio](https://aistudio.google.com/apikey) — or install [Ollama](https://ollama.com/) for free local AI

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

1. The **onboarding wizard** guides you through API key setup, hotkey reference, and a stealth self-test
2. Or skip onboarding and press **Ctrl+Shift+G** to toggle the overlay
3. Click the gear icon to open **Settings** and enter your API key
4. Close settings — you're ready to go

<br/>

## 📖 User Guide

### Setting Up AI Providers

#### Cloud Providers (OpenAI / Anthropic / Gemini)

1. Open InvisiQ → **Settings** (gear icon or `Ctrl+,`)
2. Go to **API Keys** tab
3. Paste your API key for the provider you want to use
4. The key is validated automatically and stored with AES-256-GCM encryption
5. Select a model from the **model dropdown** in the header bar

#### Ollama (Free, Local AI)

1. Install Ollama from [ollama.com](https://ollama.com)
2. Pull a model:
   ```bash
   # Best all-rounder for coding + general questions (~4.4GB)
   ollama pull qwen2.5-coder:7b

   # For aptitude/reasoning + coding (~4.4GB)
   ollama pull qwen2.5:7b
   ```
3. Ollama runs automatically on `localhost:11434`
4. In InvisiQ, select any Ollama model from the model dropdown — no API key needed
5. Screenshots are **auto-OCR processed** so the model reads text instead of describing images

> **Tip:** For systems with 6GB VRAM, `qwen2.5-coder:7b` is the best fit. Don't use 13B+ models — they'll spill to CPU and run very slowly.

### Taking Screenshots

| Action | Shortcut | What Happens |
|:-------|:---------|:-------------|
| **Full Screen** | `Ctrl+Shift+S` | Captures entire screen, attaches to chat |
| **Region** | `Ctrl+Shift+R` | Opens crosshair selector, capture selected area |
| **Inline Snip** | Click snip icon | In-overlay region selection without leaving the app |

Screenshots are automatically:
- Resized to max 1920px width (saves tokens)
- Sent to vision models directly (OpenAI, Anthropic, Gemini)
- OCR-processed for Ollama (text extracted, image not sent)
- Cleared from memory after sending

### Using Modes

| Mode | Best For | System Prompt Focus |
|:-----|:---------|:-------------------|
| **General** | Any question | Clear, accurate, concise answers |
| **Coding** | LeetCode, algorithms, debugging | Clean solution → Big-O → edge cases |
| **Meeting** | During calls | Summaries, talking points, context |
| **Solve** | Assessments | Direct answer first, explanation after |

**Custom Modes:** Click the mode dropdown → "Create Custom Mode" to define your own system prompt, name, and color.

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
- **Cost Awareness:** Check the status bar for running token/cost totals — Ollama always shows "Free"
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
| `Ctrl+T` | Open template library |
| `Escape` | Hide overlay |

### Internal Shortcuts (when overlay is focused)

| Shortcut | Action |
|:---------|:-------|
| `Ctrl+,` | Toggle Settings panel |
| `Ctrl+L` | Clear conversation (double-press) |
| `Ctrl+K` | Open conversation search |

> All global hotkeys are customizable in **Settings → Hotkeys**.

<br/>

## Built-in Modes

| Mode | Purpose | Optimized For |
|:-----|:--------|:--------------|
| **General** | All-purpose assistant | Clear, accurate answers to any question |
| **Coding** | Algorithm & engineering help | Clean solutions with Big-O analysis |
| **Meeting** | Meeting companion | Summaries, talking points, document analysis |
| **Solve** | Assessment helper | Direct answers first, explanations after |

<br/>

## 🔒 Security & Privacy

| Aspect | Implementation |
|:-------|:---------------|
| **Window Invisibility** | `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` via Electron's `setContentProtection(true)` |
| **Stealth Watchdog** | Re-applies content protection every 2 seconds |
| **Key Encryption** | AES-256-GCM with PBKDF2-derived machine-specific key (100K iterations, SHA-512) |
| **Process Isolation** | `contextIsolation: true`, `nodeIntegration: false`, IPC-only communication |
| **Process Disguise** | Appears as "Runtime Broker" with Microsoft Corporation metadata |
| **Data Residency** | All data stored locally. Zero cloud storage. Zero telemetry. |
| **API Architecture** | BYOK (Bring Your Own Key). Direct API calls. No intermediary servers. |
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
│   │   ├── companion-server.ts  # HTTP + WebSocket companion server
│   │   ├── template-store.ts    # Prompt template CRUD
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
- [x] Global keyboard shortcuts + 4 built-in modes

### Phase 2 — Enhanced Features ✅
- [x] Chat history persistence with auto-save and auto-titling
- [x] Custom modes with color picker
- [x] Smart paste — paste AI responses into any app
- [x] Clipboard monitoring with toast notifications
- [x] Voice input (Web Speech API + Whisper)
- [x] Live transcript panel + meeting mode auto-context
- [x] Enhanced stealth (process disguise, alt-tab hiding, watchdog)

### Phase 3 — Production Polish ✅
- [x] Multi-monitor support with hot-plug detection
- [x] 3-step onboarding wizard
- [x] Ollama local AI provider (free)
- [x] Light theme + per-request cost tracking
- [x] Auto-updater via GitHub Releases
- [x] Responsive layout + internal keyboard shortcuts
- [x] Lazy-loaded AI SDKs (~4MB saved at startup)

### Phase 4 — Invisible Intelligence Platform ✅
- [x] Enterprise design system (Framer Motion, GhostButton, GhostCard)
- [x] Click-through overlay + inline region selector
- [x] Live meeting assistant (system audio + auto-question detection)
- [x] Companion mode (HTTP/WS server + QR pairing)
- [x] 20+ prompt templates across 8 categories
- [x] TF-IDF memory system (RAG) with auto-extraction
- [x] JSON/MD/TXT/PDF export

### Phase 5 — Resilience & Camouflage ✅
- [x] Native C++ helper process with named pipe communication
- [x] Detours-based API hooking (`WDA_EXCLUDEFROMCAPTURE` enforcement)
- [x] Full process camouflage (Runtime Broker disguise)
- [x] Config path migration (seamless upgrade)
- [x] Ollama OCR intelligence (screenshot text extraction)
- [x] Portable distribution (single `.exe`, no installer)
- [x] Settings UI for resilience agent management

### Phase 6 — Future
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
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:0a0f1a,50:111d3a,100:00B894&height=100&section=footer" width="100%" />
</p>
