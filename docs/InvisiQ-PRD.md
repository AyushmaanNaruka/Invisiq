# InvisiQ — Product Requirements Document

> **Your AI copilot that sees everything, but is seen by no one.**

---

| Field | Value |
|---|---|
| **Document Version** | 1.0.0 |
| **Date** | February 18, 2026 |
| **Author** | Ayushmaan Singh Naruka |
| **Status** | Draft |
| **Classification** | Personal / Confidential |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [Use Cases](#3-use-cases)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Technical Architecture Deep Dive](#6-technical-architecture-deep-dive)
7. [UI/UX Design Specification](#7-uiux-design-specification)
8. [Project Structure & File Organization](#8-project-structure--file-organization)
9. [Development Roadmap](#9-development-roadmap)
10. [Risk Assessment & Mitigation](#10-risk-assessment--mitigation)
11. [Testing Strategy](#11-testing-strategy)
12. [Future Enhancements](#12-future-enhancements-post-mvp)
13. [Glossary](#13-glossary)
14. [Revision History](#14-revision-history)

---

## 1. Executive Summary

### 1.1 Product Vision

InvisiQ is a personal desktop application that provides real-time AI assistance through an **invisible overlay window**. The application captures screen content, understands context through AI vision models, and delivers answers — all while remaining **completely invisible** to screen sharing software, video call platforms, screen recording tools, and proctoring systems.

The tool is designed as a personal productivity and learning assistant, built by the developer for their own use, leveraging **bring-your-own-key (BYOK)** architecture to connect to leading AI providers including OpenAI, Anthropic Claude, and Google Gemini.

### 1.2 Problem Statement

In today's digital-first environment, professionals and students constantly face situations where they need quick access to information but are constrained by their current application context. Whether in a locked-down assessment, a high-pressure meeting, or a complex coding session, switching to another tool breaks focus and may not even be possible.

Existing commercial tools that address this are:
- **Expensive** — $20–100+/month subscription fees
- **Closed-source** — No transparency into what data is collected
- **Privacy-concerning** — Data routed through third-party servers
- **Unreliable** — Frequent crashes, 5–90 second response delays reported

### 1.3 Solution Overview

InvisiQ solves this by providing a lightweight, privacy-first, self-hosted desktop overlay that:

- Remains **invisible to ALL** screen capture, sharing, and recording software
- **Captures and understands** screen content using AI vision models
- Provides **real-time AI-powered answers** through a chat interface
- Supports **multiple AI providers** with user-supplied API keys
- Activates and hides via **global keyboard shortcuts**
- Stores all data **locally with encryption** — zero cloud dependency

### 1.4 Key Metrics & Success Criteria

| Metric | Target | Measurement Method |
|---|---|---|
| Invisibility Rate | 100% on Windows 10 v2004+ | Manual testing across Zoom, Teams, Meet, OBS, Snipping Tool |
| Screen Capture → AI Response | < 5 seconds (streaming start) | End-to-end timing from hotkey to first token |
| Application Memory Usage | < 150 MB idle, < 300 MB active | Windows Task Manager monitoring |
| Cold Start Time | < 3 seconds | From executable launch to overlay ready |
| Supported AI Providers | 3 (OpenAI, Anthropic, Google) | Provider integration count |
| Platform Support | Windows 10/11 (primary) | OS compatibility testing |

---

## 2. Product Overview

### 2.1 Product Name & Identity

| Field | Value |
|---|---|
| **Product Name** | InvisiQ |
| **Tagline** | Your AI copilot that sees everything, but is seen by no one. |
| **Type** | Desktop Application (Native Overlay) |
| **License** | Personal Use / Open Source (MIT) |

### 2.2 Target User

**Primary:** The developer themselves (Ayushmaan Singh Naruka) — a B.Tech Computer Science student specializing in AI & ML, working as an AI Intern in cybersecurity. The tool is designed for personal use across academic assessments, professional meetings, coding interviews, and self-directed learning.

### 2.3 Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Runtime** | Electron 33+ | Built-in `setContentProtection()`, `desktopCapturer`, mature ecosystem |
| **Frontend** | React 18 + TypeScript | Component-based UI, strong typing, Claude Code friendly |
| **Styling** | TailwindCSS 3 | Utility-first, rapid prototyping, dark mode built-in |
| **AI Providers** | OpenAI SDK, Anthropic SDK, Google GenAI SDK | Official SDKs for GPT-4o, Claude Sonnet, Gemini Flash/Pro |
| **OCR Fallback** | Tesseract.js 5 | Client-side text extraction when vision API unavailable |
| **Local Storage** | electron-store (encrypted) | Secure API key storage, settings, chat history |
| **Markdown Rendering** | react-markdown + rehype | Rich AI response display with code highlighting |
| **Code Highlighting** | highlight.js / Prism.js | Syntax highlighting in AI code responses |
| **Bundler** | Vite 5 | Fast HMR, optimized builds for Electron renderer |
| **Packaging** | electron-builder | Windows .exe/.msi generation, auto-update support |
| **Development Tool** | Claude Code | AI-assisted development for rapid iteration |

### 2.4 System Architecture

The application follows Electron's multi-process architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                         InvisiQ Desktop                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────┐     ┌──────────────────────────────┐ │
│  │   MAIN PROCESS       │     │   RENDERER PROCESS           │ │
│  │   (Node.js)          │     │   (React + TypeScript)       │ │
│  │                      │     │                              │ │
│  │  • Window management │◄───►│  • Chat UI                   │ │
│  │  • Content protection│ IPC │  • Settings panel             │ │
│  │  • Global hotkeys    │     │  • Message rendering          │ │
│  │  • Screenshot capture│     │  • AI provider management     │ │
│  │  • Local storage     │     │  • Streaming display          │ │
│  │  • Process stealth   │     │                              │ │
│  └──────────────────────┘     └──────────────────────────────┘ │
│              ▲                             ▲                    │
│              │                             │                    │
│              ▼                             ▼                    │
│  ┌──────────────────────┐     ┌──────────────────────────────┐ │
│  │   PRELOAD SCRIPT     │     │   AI PROVIDER APIs           │ │
│  │   (contextBridge)    │     │   • OpenAI (GPT-4o)          │ │
│  │                      │     │   • Anthropic (Claude)       │ │
│  │  Secure IPC bridge   │     │   • Google (Gemini)          │ │
│  └──────────────────────┘     └──────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────┐                                      │
│  │   NATIVE ADDON       │                                      │
│  │   (Optional C++)     │                                      │
│  │                      │                                      │
│  │  SetWindowDisplay    │                                      │
│  │  Affinity fallback   │                                      │
│  └──────────────────────┘                                      │
└─────────────────────────────────────────────────────────────────┘
```

**Data flow for a typical interaction:**

1. User presses global hotkey (e.g., `Ctrl+Shift+S`) to capture screen
2. Main process briefly hides overlay, captures screen via `desktopCapturer`, re-shows overlay
3. Screenshot (base64) is sent to renderer via IPC
4. Renderer attaches screenshot to message and sends to selected AI provider API
5. AI response streams back token-by-token to the chat UI
6. User reads answer in the invisible overlay, optionally copies code/text

---

## 3. Use Cases

### UC-1: Coding Assessment (Locked Browser Environment)

> **Scenario:** User is taking a timed coding assessment on a platform like Mercer Mettl, HackerRank, or CodeSignal. The browser is in lockdown mode — tab switching is blocked, copy-paste may be monitored, and proctoring may be active.

**Actors:** User (test-taker), Assessment Platform (locked browser), InvisiQ (invisible overlay)

**Preconditions:** InvisiQ is running with content protection enabled. User has a valid AI API key configured.

**Flow:**
1. User opens the coding assessment in the lockdown browser
2. User presses `Ctrl+Shift+G` — InvisiQ overlay appears (invisible to proctoring)
3. User presses `Ctrl+Shift+S` — captures the coding question (screenshot)
4. InvisiQ sends the screenshot to the configured AI vision model
5. AI analyzes the problem, provides solution code with explanation
6. User reads the solution in the overlay, clicks "Copy Code"
7. User types/pastes the solution into the assessment editor
8. User presses `Escape` to hide InvisiQ and continues the assessment

**Why It Works:** Browser-based lockdown environments run inside a sandboxed browser process. They **cannot** detect native desktop applications running outside the browser. The overlay window uses `WDA_EXCLUDEFROMCAPTURE`, making it invisible to any screen monitoring the browser might perform.

---

### UC-2: Video Call / Meeting Assistant

> **Scenario:** User is in a Zoom, Google Meet, or Microsoft Teams meeting. They need to quickly look up information, get talking points, or understand a document being shared — without other participants knowing.

**Actors:** User (meeting participant), Video Platform (Zoom/Meet/Teams), InvisiQ

**Preconditions:** InvisiQ overlay is running. Meeting is active with screen sharing potentially enabled.

**Flow:**
1. During the meeting, user presses `Ctrl+Shift+G` to reveal InvisiQ
2. User types a question or captures the current screen content
3. AI provides context-aware response (summary, talking points, data analysis)
4. User references the AI response to contribute meaningfully to the discussion
5. If the user is sharing their own screen, the overlay remains **completely invisible** to all other participants

**Why It Works:** `setContentProtection(true)` on Windows calls `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)`. The DWM compositor renders the overlay on the physical monitor output but strips it from all capture streams that Zoom/Meet/Teams consume for screen sharing.

---

### UC-3: Live Technical Interview (CoderPad / Replit)

> **Scenario:** User is in a live coding interview where an interviewer observes their screen in real-time via a collaborative coding platform. The interviewer may also be on a video call.

**Flow:**
1. Interviewer shares a coding problem on CoderPad/Replit
2. User uses `Ctrl+Shift+R` to region-select the problem statement
3. AI analyzes the problem and suggests approach + pseudocode
4. User **types the solution themselves** (to appear natural and avoid copy-paste detection)
5. For follow-up questions, user types into InvisiQ for instant guidance

> ⚠️ **Key Insight:** In live interviews, it is critical to TYPE the solution rather than paste it. Sudden large pastes look unnatural. InvisiQ provides the approach and logic; the user translates it into code at a natural pace.

---

### UC-4: Document Review & Quick Analysis

> **Scenario:** User needs to quickly analyze a shared document, spreadsheet, or presentation during a meeting without having read it beforehand.

**Flow:**
1. Someone shares a document/slide in the meeting
2. User captures the visible content with `Ctrl+Shift+S`
3. AI provides instant summary, key points, and potential questions
4. User contributes informed perspectives to the discussion

---

### UC-5: Learning & Study Companion

> **Scenario:** User is watching lecture videos, reading study material, or working through complex problems. They need explanations, clarifications, or worked solutions on demand.

**Flow:**
1. User encounters a complex concept in study material
2. Captures the relevant diagram, equation, or text with InvisiQ
3. Asks AI to explain step-by-step, provide examples, or solve the problem
4. Saves the conversation for later review (chat history)

---

### UC-6: Sales Call & Client Meeting Preparation

> **Scenario:** Real-time generation of talking points, objection handling, and data lookups during sales or client calls.

The overlay provides contextual suggestions without being visible to the client on a shared screen. User can capture the client's shared presentation and get instant AI analysis.

---

## 4. Functional Requirements

### 4.1 FR-1: Invisible Overlay Window System

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-1.1 | Application creates a frameless, transparent, always-on-top BrowserWindow | P0 | Window is visible on monitor but has no frame, title bar, or borders |
| FR-1.2 | Content protection enabled via `setContentProtection(true)` | P0 | Window is invisible in Zoom, Meet, Teams, OBS, Snipping Tool screen captures |
| FR-1.3 | Window excluded from taskbar via `skipTaskbar: true` | P0 | Window does not appear in Windows taskbar or Alt+Tab switcher |
| FR-1.4 | Adjustable window opacity (10%–100%) | P1 | User can slide opacity; window content remains readable at all levels |
| FR-1.5 | Drag-to-move overlay window | P1 | User can click and drag the overlay header to reposition anywhere on screen |
| FR-1.6 | Resizable overlay window | P2 | User can drag edges/corners to resize; minimum size 300×200px |
| FR-1.7 | Multi-monitor support | P2 | Overlay can be positioned on any connected monitor |
| FR-1.8 | Remember window position and size across sessions | P2 | Position persists in electron-store and restores on launch |

### 4.2 FR-2: Global Hotkey System

| ID | Requirement | Priority | Default Shortcut |
|---|---|---|---|
| FR-2.1 | Toggle overlay visibility | P0 | `Ctrl+Shift+G` |
| FR-2.2 | Capture full screen and send to AI | P0 | `Ctrl+Shift+S` |
| FR-2.3 | Capture selected region and send to AI | P0 | `Ctrl+Shift+R` |
| FR-2.4 | Focus text input field in overlay | P1 | `Ctrl+Shift+A` |
| FR-2.5 | Copy last AI response to clipboard | P1 | `Ctrl+Shift+C` |
| FR-2.6 | Start new conversation | P1 | `Ctrl+Shift+N` |
| FR-2.7 | Hide overlay immediately | P0 | `Escape` |
| FR-2.8 | All hotkeys customizable via settings | P2 | Settings panel |
| FR-2.9 | Hotkeys work when any application is focused | P0 | Electron `globalShortcut` API |

> 📝 **Technical Note:** Global hotkeys are registered via Electron's `globalShortcut.register()` API. These work across all applications regardless of which window is in focus. Care must be taken to avoid conflicts with existing system or application shortcuts.

### 4.3 FR-3: Screen Capture & Understanding

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-3.1 | Full-screen capture via `desktopCapturer` | P0 | Captures entire primary display as PNG/base64 |
| FR-3.2 | Region selection mode (rubber-band) | P0 | User drags to select rectangular region; only that region is captured |
| FR-3.3 | Overlay hidden during capture | P0 | InvisiQ window briefly hides before capture, restores after |
| FR-3.4 | Screenshot sent as base64 to AI vision API | P0 | Image properly encoded and included in API request |
| FR-3.5 | OCR text extraction fallback (Tesseract.js) | P1 | If no vision API key, extract text via OCR and send as text prompt |
| FR-3.6 | Screenshot preview in chat before sending | P1 | Thumbnail of captured image shown in chat input area |
| FR-3.7 | Automatic screenshot on hotkey (no manual confirm) | P0 | Single keypress captures and sends immediately |
| FR-3.8 | Multi-monitor capture support | P2 | Can capture from any connected display |

### 4.4 FR-4: AI Chat Interface

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-4.1 | Text input field with send button | P0 | User types message, presses Enter or clicks Send |
| FR-4.2 | Message history display (scrollable) | P0 | Chat shows user messages and AI responses in order |
| FR-4.3 | Markdown rendering in AI responses | P0 | Bold, italic, headers, links, lists render properly |
| FR-4.4 | Code block syntax highlighting | P0 | Code blocks have language-specific highlighting + copy button |
| FR-4.5 | One-click copy for code blocks | P0 | Each code block has a "Copy" button that copies to clipboard |
| FR-4.6 | Copy entire AI response | P1 | Button to copy full response text to clipboard |
| FR-4.7 | Streaming response display | P0 | Tokens appear progressively as they arrive from API |
| FR-4.8 | Stop generation button | P1 | User can cancel an in-progress AI response |
| FR-4.9 | Conversation context (multi-turn) | P0 | Previous messages in conversation are sent as context |
| FR-4.10 | New conversation / clear history | P1 | Button to start a fresh conversation thread |
| FR-4.11 | Auto-scroll to latest message | P0 | Chat auto-scrolls as new content arrives |
| FR-4.12 | Image attachment display in chat | P1 | Screenshots shown as inline thumbnails in user messages |

### 4.5 FR-5: AI Provider Management

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-5.1 | Support OpenAI API (GPT-4o, GPT-4o-mini) | P0 | Text + vision requests work with valid API key |
| FR-5.2 | Support Anthropic API (Claude Sonnet 4, Haiku) | P0 | Text + vision requests work with valid API key |
| FR-5.3 | Support Google Gemini API (Flash, Pro) | P0 | Text + vision requests work with valid API key |
| FR-5.4 | API key input fields in settings | P0 | Secure text fields, keys masked with dots |
| FR-5.5 | API key validation on entry | P1 | Test API call on save; show success/error indicator |
| FR-5.6 | Model selector dropdown in chat header | P0 | Quick switch between models without opening settings |
| FR-5.7 | Default model preference setting | P1 | User sets preferred model; used for all new conversations |
| FR-5.8 | API keys encrypted in local storage | P0 | electron-store with encryption; keys never sent to any server except the provider |
| FR-5.9 | Token usage display per message | P2 | Show input/output token count and estimated cost |
| FR-5.10 | Custom API endpoint URL (for proxies/local models) | P3 | Allow override of base URL for self-hosted models |

### 4.6 FR-6: Smart Modes & Prompt Templates

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-6.1 | Coding Interview Mode | P1 | System prompt optimized for DSA, algorithms, code solutions with complexity analysis |
| FR-6.2 | Meeting Assistant Mode | P1 | System prompt for summarization, talking points, response suggestions |
| FR-6.3 | Solve Mode | P1 | System prompt for concise, direct answers with step-by-step explanation |
| FR-6.4 | General Mode (default) | P0 | Standard helpful assistant prompt, no specialized context |
| FR-6.5 | Custom prompt template editor | P2 | User can create and save their own prompt templates |
| FR-6.6 | Mode selector in overlay header | P1 | Dropdown to switch mode; changes system prompt for next message |

### 4.7 FR-7: Clipboard & Integration

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-7.1 | Copy-to-clipboard for any AI response | P0 | One-click copy puts response text in system clipboard |
| FR-7.2 | Auto-detect clipboard changes | P2 | Optionally monitor clipboard; offer to analyze new content |
| FR-7.3 | Smart paste mode | P2 | Simulates natural typing speed when pasting (to avoid paste detection) |

### 4.8 FR-8: Data Persistence

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-8.1 | Chat history persisted in local SQLite/JSON | P1 | Conversations survive application restart |
| FR-8.2 | Conversation search | P2 | Full-text search across past conversations |
| FR-8.3 | Export conversation as Markdown | P2 | Download chat as .md file |
| FR-8.4 | Settings persistence | P0 | API keys, hotkeys, preferences survive restart |
| FR-8.5 | Clear all data option | P1 | One-click delete all stored data including API keys |

---

## 5. Non-Functional Requirements

### 5.1 NFR-1: Stealth & Undetectability

| ID | Requirement | Target |
|---|---|---|
| NFR-1.1 | Invisible in Zoom screen share | 100% on Windows 10 v2004+ |
| NFR-1.2 | Invisible in Google Meet screen share | 100% on Windows 10 v2004+ |
| NFR-1.3 | Invisible in Microsoft Teams screen share | 100% on Windows 10 v2004+ |
| NFR-1.4 | Invisible in OBS Studio recording | 100% |
| NFR-1.5 | Invisible in Windows Snipping Tool / Print Screen | 100% |
| NFR-1.6 | Invisible in Discord screen share | 100% |
| NFR-1.7 | Not visible in Windows taskbar | 100% |
| NFR-1.8 | Process name disguised in Task Manager | Renamed to generic name |
| NFR-1.9 | Works during Mercer Mettl lockdown browser sessions | Browser sandbox cannot detect native apps |
| NFR-1.10 | Works during HackerRank / CodeSignal assessments | Browser-based proctoring bypassed |

### 5.2 NFR-2: Performance

| ID | Requirement | Target |
|---|---|---|
| NFR-2.1 | Application cold start time | < 3 seconds |
| NFR-2.2 | Idle memory consumption | < 150 MB |
| NFR-2.3 | Active memory consumption (during AI chat) | < 300 MB |
| NFR-2.4 | Screenshot capture latency | < 500 ms |
| NFR-2.5 | AI response streaming start | < 3 seconds from request |
| NFR-2.6 | Overlay toggle latency (show/hide) | < 100 ms |
| NFR-2.7 | Hotkey response time | < 50 ms |
| NFR-2.8 | CPU usage during idle | < 1% |

### 5.3 NFR-3: Security & Privacy

| ID | Requirement | Target |
|---|---|---|
| NFR-3.1 | API keys encrypted at rest | AES-256 encryption via electron-store |
| NFR-3.2 | No telemetry or analytics | Zero data sent to any server except AI provider APIs |
| NFR-3.3 | No cloud storage of conversations | All data stored locally on user's machine |
| NFR-3.4 | Secure IPC (contextBridge) | Renderer has no direct access to Node.js APIs |
| NFR-3.5 | Screenshots not persisted to disk (by default) | Screenshots stored in memory only, cleared after use |
| NFR-3.6 | Clear all data capability | Complete wipe of all stored data in one action |

### 5.4 NFR-4: Compatibility

| ID | Requirement | Target |
|---|---|---|
| NFR-4.1 | Primary OS support | Windows 10 (version 2004+), Windows 11 |
| NFR-4.2 | macOS support (limited) | macOS 14 and below; macOS 15+ has known limitations |
| NFR-4.3 | Linux support | Best-effort; X11 may support, Wayland varies |
| NFR-4.4 | Minimum display resolution | 1280 × 720 |
| NFR-4.5 | Network requirement | Internet connection for AI API calls only |

---

## 6. Technical Architecture Deep Dive

### 6.1 The Invisibility Engine

The core technical innovation of InvisiQ is its invisible overlay, powered by the Windows Desktop Window Manager (DWM) compositor architecture.

#### 6.1.1 How Windows Screen Capture Works

When any application (Zoom, Teams, OBS) initiates screen capture, it uses one of the Windows capture APIs: `BitBlt`, `PrintWindow`, `DXGI Desktop Duplication`, or `Windows.Graphics.Capture`. All of these APIs receive their frames from the DWM compositor. The DWM composes all visible windows into a single frame and delivers it to the capture API consumer.

#### 6.1.2 The WDA_EXCLUDEFROMCAPTURE Flag

Windows 10 version 2004 introduced the `WDA_EXCLUDEFROMCAPTURE` flag for the `SetWindowDisplayAffinity` API. When a window is flagged with this value:

```
┌─────────────────────────────────────┐
│  DWM Compositing Pipeline           │
│                                     │
│  Window A ──┐                       │
│  Window B ──┤                       │
│  InvisiQ ───┤                       │
│             ▼                       │
│  ┌─────────────────────┐            │
│  │    Compositor        │            │
│  └──────┬──────┬───────┘            │
│         │      │                    │
│         ▼      ▼                    │
│   🖥 Monitor  🎥 Capture            │
│   Output      Output               │
│                                     │
│   Shows ALL   Excludes InvisiQ     │
│   windows     (WDA_EXCLUDEFROM     │
│               CAPTURE)              │
└─────────────────────────────────────┘
```

This is **not a hack** — it is a documented, supported Microsoft API designed for privacy-sensitive applications.

#### 6.1.3 Electron Integration

Electron exposes this capability through a single method call:

```javascript
win.setContentProtection(true)

// Internally, on Windows, this calls:
// SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)

// On macOS (14 and below), this sets:
// NSWindow.sharingType = NSWindowSharingNone
```

#### 6.1.4 Electron Window Configuration

The complete BrowserWindow configuration for the invisible overlay:

```javascript
const overlayWindow = new BrowserWindow({
  width: 420,
  height: 600,
  transparent: true,         // Background is fully transparent
  frame: false,              // No title bar or window chrome
  alwaysOnTop: true,         // Floats above all other windows
  skipTaskbar: true,         // Not visible in taskbar or Alt+Tab
  resizable: true,           // User can resize the overlay
  focusable: true,           // Can receive keyboard input
  title: '',                 // Empty title to avoid detection
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,  // Secure IPC
    nodeIntegration: false,  // No Node.js in renderer
  },
});

// THE MOST IMPORTANT LINE IN THE ENTIRE PROJECT
overlayWindow.setContentProtection(true);
```

#### 6.1.5 Known Limitations

| Platform | Limitation | Severity | Workaround |
|---|---|---|---|
| macOS 15+ (Sequoia) | ScreenCaptureKit ignores `sharingType` flag | High | Use extreme low opacity; focus on Windows |
| Some Windows 11 builds | `WDA_EXCLUDEFROMCAPTURE` may fail on certain apps | Medium | Native C++ addon as fallback; test per-build |
| Linux / Wayland | No standard capture exclusion API | Medium | X11 may work; Wayland is compositor-dependent |
| Physical cameras | Cannot prevent photography of screen | Low | Use small overlay; position near assessment content |
| Enterprise DLP agents | Kernel-level agents may enumerate processes | Low | Process name disguise; avoid managed devices |

---

### 6.2 Screenshot Capture Pipeline

Screen capture must handle a subtle challenge: our own overlay window is excluded from capture APIs (by design), but we want to capture everything else on screen.

```
User presses Ctrl+Shift+S
        │
        ▼
┌───────────────────┐
│ 1. Hide overlay   │  win.hide()
│    window         │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ 2. Wait 100ms     │  DWM re-composes without overlay
│                   │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ 3. Capture screen │  desktopCapturer.getSources()
│    via Electron   │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ 4. Convert to     │  NativeImage → base64 PNG
│    base64         │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ 5. Restore overlay│  win.show()
│    window         │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ 6. Send to        │  IPC → Renderer → AI API
│    renderer/AI    │
└───────────────────┘
```

For **region capture** (FR-3.2), an additional transparent full-screen window is created temporarily for the user to draw their selection rectangle. This selection window is also content-protected.

---

### 6.3 AI Provider Abstraction Layer

All AI providers implement a common interface to ensure seamless switching:

```typescript
interface AIProvider {
  name: string;
  models: Model[];
  
  validateKey(key: string): Promise<boolean>;
  
  chat(
    messages: Message[],
    options: ChatOptions
  ): AsyncGenerator<string>;
  
  chatWithImage(
    messages: Message[],
    image: string,        // base64 PNG
    options: ChatOptions
  ): AsyncGenerator<string>;
}

interface Model {
  id: string;             // e.g., "gpt-4o", "claude-sonnet-4-20250514"
  name: string;           // Display name
  supportsVision: boolean;
  maxTokens: number;
  costPer1kInput: number;
  costPer1kOutput: number;
}

interface ChatOptions {
  model: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}
```

Each provider adapter handles model-specific request formatting, streaming, error handling, and token counting. The streaming approach uses `AsyncGenerator` to yield tokens as they arrive, enabling real-time display in the UI.

---

### 6.4 Process Stealth Techniques

| Technique | Implementation | Purpose |
|---|---|---|
| Executable rename | `electron-builder` config: `productName` set to generic name | Avoid detection in process lists |
| Skip taskbar | `skipTaskbar: true` in BrowserWindow options | No taskbar icon visible |
| Empty window title | `title: ''` in BrowserWindow options | No identifiable window name |
| Low memory profile | Lazy-load AI SDKs, dispose screenshots after use | Avoid triggering resource monitoring |
| No tray icon (optional) | Tray icon can be disabled in settings | Zero visible indicators |

---

## 7. UI/UX Design Specification

### 7.1 Design Principles

1. **Minimal & Non-Intrusive** — The overlay should feel like a whisper, not a shout. Small footprint, clean layout, no visual clutter.
2. **Readable at Low Opacity** — All text must remain legible even at 30–40% window opacity. High contrast text, subtle backgrounds.
3. **Instant Access** — Every interaction should be achievable in 1–2 actions. No deep menus or nested navigation.
4. **Keyboard-First** — All primary actions accessible via keyboard shortcuts. Mouse is secondary.
5. **Dark by Default** — Dark theme reduces visual prominence of the overlay and is easier on the eyes during long sessions.

### 7.2 Overlay Layout

```
┌─────────────────────────────────────────────┐
│  ≡ [Coding Mode ▼] [Claude Sonnet ▼]  ◐ ⚙ ─│  ← HEADER BAR (32px)
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ 🤖 Here's the solution for the      │    │
│  │ two-sum problem:                     │    │
│  │                                      │    │
│  │ ```python                            │    │
│  │ def two_sum(nums, target):     📋    │    │  ← CHAT AREA
│  │     seen = {}                        │    │    (scrollable)
│  │     for i, n in enumerate(nums):     │    │
│  │         comp = target - n            │    │
│  │         if comp in seen:             │    │
│  │             return [seen[comp], i]   │    │
│  │         seen[n] = i                  │    │
│  │ ```                                  │    │
│  │                                      │    │
│  │ Time: O(n) | Space: O(n)            │    │
│  └─────────────────────────────────────┘    │
│                                             │
├─────────────────────────────────────────────┤
│  [📷] Type your question...          [Send] │  ← INPUT AREA
├─────────────────────────────────────────────┤
│  ● Connected  │  Tokens: 1,234  │  ■■■░░   │  ← STATUS BAR (20px)
└─────────────────────────────────────────────┘
```

### 7.3 Window Dimensions

| Property | Default | Minimum | Maximum |
|---|---|---|---|
| Width | 420px | 300px | 800px |
| Height | 600px | 200px | Screen height |
| Default Position | Bottom-right corner | — | — |
| Opacity | 85% | 10% | 100% |
| Corner Radius | 12px | — | — |

### 7.4 Color Scheme (Dark Theme — Default)

| Element | Color | Hex |
|---|---|---|
| Overlay background | Near-black with transparency | `#1a1a2e` at 85% opacity |
| Chat background | Dark charcoal | `#16213e` |
| User message bubble | Blue accent | `#2E75B6` |
| AI message bubble | Dark gray | `#2d2d44` |
| Text (primary) | Off-white | `#E8E8E8` |
| Text (secondary) | Muted gray | `#8B8B9E` |
| Code block background | Darker charcoal | `#0d1117` |
| Accent / Interactive | Teal green | `#00B894` |
| Error / Warning | Soft red | `#D63031` |
| Header bar | Slightly lighter dark | `#1e1e36` |

### 7.5 Interaction States

| State | Visual Indicator | Behavior |
|---|---|---|
| Idle (visible) | Overlay shown, input field active | Waiting for user input or hotkey |
| Hidden | Overlay completely invisible | All hotkeys still functional |
| Capturing screen | Brief flash/border pulse | Overlay hides → capture → overlay returns |
| Region selecting | Full-screen semi-transparent overlay with crosshair | User drags rectangle to select region |
| AI thinking | Pulsing dots animation in chat | Request sent, waiting for first token |
| AI streaming | Text appearing progressively | Tokens rendering as they arrive |
| Error | Red banner at top with error message | API error, network error, or invalid key |
| Settings open | Settings panel slides in from right | Covers chat area; dismissible |

---

## 8. Project Structure & File Organization

```
ghostai/
├── package.json
├── electron-builder.yml           # Build & packaging config
├── tsconfig.json
├── vite.config.ts                 # Vite bundler for renderer
│
├── src/
│   ├── main/                       # ══ Electron Main Process ══
│   │   ├── index.ts                # Entry point, app lifecycle
│   │   ├── overlay.ts              # Window creation & management
│   │   ├── hotkeys.ts              # Global shortcut registration
│   │   ├── screenshot.ts           # Screen capture logic
│   │   ├── region-selector.ts      # Region selection window
│   │   ├── stealth.ts              # Content protection, process hiding
│   │   ├── store.ts                # Encrypted local storage
│   │   └── ipc-handlers.ts         # IPC message routing
│   │
│   ├── renderer/                   # ══ React Frontend (Overlay UI) ══
│   │   ├── App.tsx                 # Root component
│   │   ├── components/
│   │   │   ├── ChatPanel.tsx       # Main chat interface
│   │   │   ├── MessageBubble.tsx   # Message display + markdown
│   │   │   ├── CodeBlock.tsx       # Syntax highlighted code + copy
│   │   │   ├── ScreenCapture.tsx   # Region selector UI
│   │   │   ├── Settings.tsx        # API keys & preferences
│   │   │   ├── ModeSelector.tsx    # Interview/Meeting/Solve modes
│   │   │   ├── ModelSelector.tsx   # AI model dropdown
│   │   │   ├── StatusBar.tsx       # Token count, connection status
│   │   │   └── Controls.tsx        # Opacity, minimize, close
│   │   ├── hooks/
│   │   │   ├── useAI.ts            # AI provider hook
│   │   │   ├── useScreenshot.ts    # Screenshot state management
│   │   │   └── useSettings.ts      # Settings state management
│   │   ├── services/
│   │   │   ├── ai-providers/
│   │   │   │   ├── types.ts        # AIProvider interface & types
│   │   │   │   ├── openai.ts       # OpenAI adapter
│   │   │   │   ├── anthropic.ts    # Anthropic adapter
│   │   │   │   └── gemini.ts       # Google Gemini adapter
│   │   │   └── ocr-service.ts      # Tesseract.js wrapper
│   │   └── styles/
│   │       └── globals.css         # Tailwind + custom CSS
│   │
│   └── preload/
│       └── index.ts                # contextBridge secure IPC
│
├── native/                         # ══ Optional C++ Addon ══
│   └── window-utils/
│       ├── binding.gyp
│       └── window-utils.cc         # SetWindowDisplayAffinity fallback
│
├── assets/
│   └── icons/                      # App icons (multiple sizes)
│
├── scripts/
│   └── build.js                    # Custom build scripts
│
└── README.md
```

---

## 9. Development Roadmap

### 9.1 Phase 1 — Core MVP (Weeks 1–2)

**Goal:** A working invisible overlay that can capture the screen, send it to an AI, and display the response.

| Sprint | Duration | Deliverables | Key Tasks |
|---|---|---|---|
| Sprint 1 | Days 1–3 | Invisible overlay window + hotkey system | Electron setup, BrowserWindow config, `setContentProtection`, `globalShortcut` registration, visibility toggle, stealth testing across Zoom/Meet/Teams |
| Sprint 2 | Days 4–7 | Screen capture + AI integration | `desktopCapturer` implementation, region selection, AI provider abstraction layer, OpenAI/Claude/Gemini adapters, settings panel for API keys |
| Sprint 3 | Days 8–11 | Chat UI + response rendering | React chat interface, markdown rendering, code highlighting, copy-to-clipboard, streaming display, conversation context |
| Sprint 4 | Days 12–14 | Integration testing + packaging | End-to-end flow testing, stealth verification, `electron-builder` packaging, bug fixes, performance optimization |

### 9.2 Phase 2 — Enhanced Features (Weeks 3–4)

**Goal:** Add audio transcription, smart modes, conversation persistence, and clipboard integration.

| Feature | Duration | Description |
|---|---|---|
| Audio Transcription | 3–4 days | System audio capture, mic input, Web Speech API or Whisper integration, real-time transcript as AI context |
| Smart Modes | 2–3 days | Coding Interview, Meeting, Solve, General modes with custom system prompts; mode selector in UI |
| Chat Persistence | 2–3 days | SQLite or JSON file storage for conversations; conversation list, search, export |
| Clipboard Integration | 1–2 days | Auto-detect clipboard changes; smart paste with natural typing simulation |

### 9.3 Phase 3 — Polish & Distribution (Weeks 5–6)

**Goal:** Production-quality UX, advanced stealth, and automated builds.

| Feature | Duration | Description |
|---|---|---|
| Process Stealth | 1–2 days | Executable rename, memory optimization, optional Task Manager hiding |
| UI Polish | 2–3 days | Animations, dark/light themes, responsive layout, font size controls, smooth streaming |
| Multi-Monitor | 1–2 days | Monitor detection, cross-monitor positioning, per-monitor capture |
| Auto-Update | 1 day | `electron-updater` integration for seamless updates |
| Final Testing | 2–3 days | Comprehensive testing across all target platforms and use cases |

### Development with Claude Code

Suggested Claude Code command sequence for Sprint 1:

```bash
# Step 1: Project scaffolding
claude "Create a new Electron + React + TypeScript project called ghostai 
with electron-builder, tailwindcss, and Vite. Set up the directory structure 
as specified in the PRD section 8."

# Step 2: Invisible overlay
claude "Create the overlay BrowserWindow with transparent, frameless, 
alwaysOnTop, skipTaskbar, and setContentProtection(true). 
Position at bottom-right, 420x600."

# Step 3: Global hotkeys
claude "Register global hotkeys: Ctrl+Shift+G toggle, Ctrl+Shift+S screenshot,
Ctrl+Shift+R region capture, Escape hide. Use Electron globalShortcut."

# Step 4: Screenshot system
claude "Implement full-screen capture using desktopCapturer. Hide overlay 
before capture, restore after. Convert to base64 PNG. Add region selection."

# Step 5: AI providers
claude "Build AI provider abstraction layer with adapters for OpenAI, 
Anthropic, and Google Gemini. Support text + vision + streaming."

# Step 6: Chat UI
claude "Build React chat interface with markdown rendering, code syntax 
highlighting, copy buttons, streaming display, and conversation context."
```

---

## 10. Risk Assessment & Mitigation

| Risk | Probability | Impact | Mitigation Strategy |
|---|---|---|---|
| `setContentProtection` fails on specific Windows 11 builds | Medium | Critical | Test on multiple Win11 builds; implement native C++ addon fallback; document compatible versions |
| macOS 15+ invisibility completely broken | High | High | Accept macOS limitation; focus on Windows; use extreme opacity fallback on macOS |
| Proctoring software detects running processes via kernel agent | Low | High | Process name disguise; avoid using on enterprise-managed devices; browser-based proctoring cannot detect |
| AI response latency too high (>10 seconds) | Medium | Medium | Default to fast models (Haiku, Flash, GPT-4o-mini); streaming to show partial results; pre-warm connections |
| OCR accuracy insufficient for code/math | Medium | Low | Use vision models as primary (they read screenshots directly); OCR is fallback only |
| API costs become significant | Low | Low | Token counter in UI; default to cheapest models; local model support in future |
| Electron app size too large (200MB+) | High | Low | Consider Tauri migration in v2; use portable build; compress resources |
| Security of stored API keys | Low | High | AES-256 encryption via electron-store; machine-specific key derivation |
| Clipboard monitoring triggers security alerts | Low | Medium | Make clipboard integration opt-in; clear documentation of what it monitors |

---

## 11. Testing Strategy

### 11.1 Stealth Testing Matrix

The most critical testing is verifying that the overlay remains invisible across all target platforms. **Each combination must be tested manually.**

| Platform | Screen Share | Screen Record | Screenshot | Expected Result |
|---|---|---|---|---|
| Zoom (Desktop) | ✅ Test | ✅ Test | ✅ Test | Invisible in all |
| Google Meet (Browser) | ✅ Test | N/A | ✅ Test | Invisible in all |
| Microsoft Teams | ✅ Test | ✅ Test | ✅ Test | Invisible in all |
| Discord | ✅ Test | N/A | ✅ Test | Invisible in all |
| OBS Studio | N/A | ✅ Test | ✅ Test | Invisible in all |
| Windows Snipping Tool | N/A | N/A | ✅ Test | Invisible |
| Mercer Mettl (Browser) | ✅ Test | ✅ Test | ✅ Test | Invisible + undetected process |
| HackerRank (Browser) | N/A | N/A | ✅ Test | Invisible + undetected |
| CodeSignal (Browser) | N/A | N/A | ✅ Test | Invisible + undetected |

### 11.2 Functional Testing

- Screenshot capture: Full-screen and region selection on single and multi-monitor setups
- AI integration: Text-only and image+text requests for all three providers
- Streaming: Verify tokens display progressively with no UI freezing
- Hotkeys: All shortcuts work when various applications are in the foreground
- Settings: API keys persist, encrypt correctly, and validate on entry
- Copy-paste: Code blocks and full responses copy correctly to system clipboard
- Conversation context: Multi-turn conversations maintain proper message history

### 11.3 Performance Testing

- Cold start time measurement across 10 launches
- Memory profiling during idle, active chat, and screenshot capture
- CPU usage monitoring during idle and streaming responses
- AI response latency benchmarks for each provider and model

---

## 12. Future Enhancements (Post-MVP)

| Enhancement | Description | Priority | Estimated Effort |
|---|---|---|---|
| Local LLM Support | Integration with Ollama for fully offline AI inference; zero API costs | P2 | 3–5 days |
| Voice Input/Output | Speech-to-text for hands-free questions; TTS for whispered answers | P2 | 3–4 days |
| RAG Memory System | Vector database for past conversations; ask about previous discussions | P3 | 5–7 days |
| Plugin System | Extensible architecture for custom integrations (Slack, Email, etc.) | P3 | 5–7 days |
| Tauri Migration | Rewrite in Tauri/Rust for ~10MB size and 50% less RAM | P3 | 2–3 weeks |
| Mobile Companion App | Phone-based interface to InvisiQ running on desktop | P3 | 2–3 weeks |
| Multi-Language UI | Interface localization for non-English users | P3 | 2–3 days |
| Automated Workflow Macros | Record and replay sequences of captures + AI queries | P3 | 3–5 days |
| AR / Smart Glasses Integration | Future integration with Meta Ray-Ban or similar AR devices | P4 | Research phase |

---

## 13. Glossary

| Term | Definition |
|---|---|
| **DWM** | Desktop Window Manager — the Windows compositor that combines all window surfaces into the final display output |
| **WDA_EXCLUDEFROMCAPTURE** | A Windows API flag that instructs DWM to exclude a window from all screen capture outputs |
| **setContentProtection** | Electron API method that enables capture exclusion on Windows and macOS |
| **desktopCapturer** | Electron API for capturing screen and window contents as images or video streams |
| **BYOK** | Bring Your Own Key — users provide their own API keys for AI providers |
| **OCR** | Optical Character Recognition — extracting text from images |
| **IPC** | Inter-Process Communication — message passing between Electron main and renderer processes |
| **SSE** | Server-Sent Events — a protocol for streaming responses from AI APIs |
| **Proctoring** | Monitoring technology used by assessment platforms to detect cheating |
| **Overlay** | A window that floats above all other windows and can be transparent |
| **contextBridge** | Electron's secure method for exposing main process APIs to the renderer |
| **DLP** | Data Loss Prevention — enterprise security tools that monitor data and processes |

---

## 14. Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | February 18, 2026 | Ayushmaan Singh Naruka | Initial PRD creation — complete product specification |

---

*End of Document*
