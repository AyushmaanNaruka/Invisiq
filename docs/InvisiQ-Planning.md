# 👻 InvisiQ — Invisible AI Desktop Assistant
## Research & Development Plan

> ⚠️ **HISTORICAL DESIGN SPEC — frozen ~June 3, 2026.** This is the original market-research and architecture-rationale document, kept for context on *why* early decisions were made. Several of those decisions have since changed. For current architecture and direction, trust **CLAUDE.md** and **docs/InvisiQ-Beta-Launch-Plan.md**. Notably: the local-LLM (Ollama) path was **removed** (cloud-only, BYOK); the multi-mode + template model collapsed to a **single universal mode**; and the product now ships as a **gated, monetized beta** (auth + trial + analytics + kill-switch) — Act 1 of a two-act plan toward a managed AI backend.

---

## 1. Market Research: What Exists Today

### 1.1 Commercial Players

| Tool | Price | Tech Stack | Key Features |
|------|-------|-----------|--------------|
| **Cluely** | $20+/mo | Electron (Desktop) | Screen + audio monitoring, invisible overlay, multi-LLM, meeting notes, custom prompts |
| **Interview Coder** | Paid | Native Desktop App | Coding-focused, invisible to task manager, audio support, screen analysis |
| **ShadeCoder** | Paid | Desktop | Multimodal reasoning, hotkey-driven, screenshare-proof |
| **LockedIn AI** | Paid | Desktop | Screen analysis, system audio capture, coding copilot, system design templates |
| **Interview Browser** | Paid | Desktop | Full invisible workspace — terminal, file explorer, notepad, AI tools |
| **Hiding AI** | Paid (perpetual license) | Desktop | OCR screenshot, audio recorder, invisible overlay, multi-AI models |
| **Parakeet AI** | Paid | Desktop | Audio + visual analysis, high stealth |

### 1.2 Open Source Alternatives

| Project | Stack | Stars | Key Features |
|---------|-------|-------|--------------|
| **Pluely** | Tauri + Rust + React | 5k+ | ~10MB, BYOK (any AI provider), screenshot, voice input, invisible overlay |
| **OpenCluely** | Electron + Gemini | 2k+ | DSA-focused, invisible overlay, image processing, multi-language |
| **Natively** | Electron | 1k+ | Local RAG, multi-LLM, STT providers, meeting history, rolling context |
| **free-cluely** | Electron | Growing | Community fork, working on true invisible mode |
| **Invisiwind** | C++ (DLL Injection) | 1k+ | Pure window-hiding tool using SetWindowDisplayAffinity |
| **ScreenPrompt** | Desktop | Growing | Transparent overlay, invisible to screen capture, note-reading |

### 1.3 Feature Matrix of What We Can Replicate

| Feature | Cluely | Interview Coder | Our Tool (Target) |
|---------|--------|----------------|-------------------|
| Invisible overlay (screen share safe) | ✅ | ✅ | ✅ |
| Screen capture & OCR | ✅ | ✅ | ✅ |
| Multi-LLM support (GPT, Claude, Gemini) | ✅ | Partial | ✅ |
| BYOK (Bring Your Own Key) | ❌ (subscription) | ❌ | ✅ |
| Audio transcription | ✅ | ✅ | ✅ (Phase 2) |
| Global hotkey activation | ✅ | ✅ | ✅ |
| Hidden from task manager | ❌ | ✅ | ✅ |
| Custom prompts/modes | ✅ | Limited | ✅ |
| Copy-paste from overlay | ✅ | ✅ | ✅ |
| Chat history / context | ✅ | Limited | ✅ |
| Local-first / privacy | ❌ | ❌ | ✅ |
| Free / self-hosted | ❌ | ❌ | ✅ |

---

## 2. Technical Deep Dive: How Invisibility Works

### 2.1 The Core Trick — `SetWindowDisplayAffinity` (Windows)

The Windows API provides a function called `SetWindowDisplayAffinity` with a flag `WDA_EXCLUDEFROMCAPTURE` (available since Windows 10 version 2004). When applied to a window handle, the Desktop Window Manager (DWM) will:

- **Render the window normally** on the physical monitor
- **Exclude it completely** from all screen capture APIs (Zoom, Teams, Meet, OBS, Snipping Tool, etc.)

```
┌──────────────────────────────────┐
│  Your Screen (Physical Monitor)  │
│                                  │
│  [InvisiQ Overlay]  ← You see   │
│  • AI answer here                │
│  • Copy button                   │
│                                  │
│  Your Assessment / Meeting       │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│  What Others See (Screen Share)  │
│                                  │
│                   ← Invisible!   │
│                                  │
│                                  │
│  Your Assessment / Meeting       │
└──────────────────────────────────┘
```

**How it works in the DWM pipeline:**
1. Each window renders into its own off-screen buffer
2. DWM receives all these surfaces
3. DWM composes them into the final frame
4. Windows with `WDA_EXCLUDEFROMCAPTURE` are **included in monitor output** but **excluded from capture output**
5. Screen sharing tools capture the composed frame without the flagged window

### 2.2 Electron Implementation

Electron has **built-in support** via `win.setContentProtection(true)`:

```javascript
// This is the simple way — Electron handles it internally
const win = new BrowserWindow({
  alwaysOnTop: true,
  transparent: true,
  frame: false,
  skipTaskbar: true,  // Don't show in taskbar
});
win.setContentProtection(true);
// On Windows: calls SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)
// On macOS: sets NSWindow.sharingType = NSWindowSharingNone
```

For more control, use a native C++ addon:
```javascript
const native = require('./build/Release/window-utils.node');
const handle = win.getNativeWindowHandle().readUInt32LE(0);
native.setWindowDisplayAffinity(handle, 0x00000011); // WDA_EXCLUDEFROMCAPTURE
```

### 2.3 macOS Considerations

⚠️ **IMPORTANT**: On macOS 15+ (Sequoia), Apple changed the ScreenCaptureKit framework:
- `NSWindow.sharingType = .none` is **ignored** by the new ScreenCaptureKit
- All window contents are composited into a single framebuffer before capture
- **This means macOS 15+ invisibility is NOT guaranteed**

**Workaround options for macOS:**
- Use extreme transparency (very low opacity) — hard to see in captures
- Use a separate physical display
- Focus on Windows as primary platform (where it works reliably)

### 2.4 Additional Stealth Techniques

| Technique | Purpose | Implementation |
|-----------|---------|---------------|
| `skipTaskbar: true` | Don't show in taskbar | Electron BrowserWindow option |
| Process name disguise | Hide from task manager | Rename executable to something benign like `SystemHelper.exe` |
| No window title | Avoid detection in window lists | `title: ''` in BrowserWindow |
| `focusable: false` (optional) | Don't steal focus from the foreground app | BrowserWindow option |
| Global hotkeys | Toggle without alt-tabbing | `globalShortcut.register()` in Electron |
| Low memory footprint | Don't trigger resource monitors | Optimize, lazy-load |

### 2.5 What Can Detect It (Limitations)

| Detection Method | Can It Catch InvisiQ? | Notes |
|-----------------|----------------------|-------|
| Screen sharing (Zoom/Meet/Teams) | ❌ No | WDA_EXCLUDEFROMCAPTURE blocks this |
| Browser tab switching detection | ❌ No | InvisiQ is a separate desktop app, not a browser tab |
| Browser sandboxing | ❌ No | Runs outside the browser entirely |
| Print Screen / Snipping Tool | ❌ No | Also uses capture APIs that respect the flag |
| OBS / screen recording | ❌ No | Same capture APIs |
| Physical camera / phone recording | ✅ Yes | Nothing can prevent a camera pointed at your screen |
| Enterprise DLP / endpoint agents | ⚠️ Maybe | Some enterprise tools enumerate processes at kernel level |
| Proctoring with webcam + eye tracking | ⚠️ Maybe | If your eyes frequently look away from the assessment area |
| Mercer Mettl lockdown browser | ❌ No* | Browser-based lockdown can't see native desktop apps |

*Note: Some proctoring tools may detect running processes. Process disguise helps mitigate this.

---

## 3. Architecture & Tech Stack Decision

### 3.1 Electron vs Tauri

| Factor | Electron | Tauri |
|--------|----------|-------|
| **App Size** | ~150-200MB | ~10MB |
| **RAM Usage** | ~150-300MB | ~50MB |
| **Startup Speed** | 1-3 seconds | <100ms |
| **Screen Capture Protection** | ✅ Built-in `setContentProtection` | ⚠️ Requires custom Rust plugin |
| **Native API Access** | Via `node-ffi` or native addons | Native Rust — excellent |
| **Screenshot/OCR** | Via `desktopCapturer` or native | Via Rust libs |
| **Ecosystem** | Massive, mature | Growing, Rust-based |
| **Claude Code friendly** | ✅ JS/TS everywhere | ✅ Rust + JS/TS |
| **Process hiding** | Moderate | Better (smaller footprint) |

### 3.2 Recommended Stack

```
┌─────────────────────────────────────────────────────┐
│                    InvisiQ Desktop                   │
├─────────────────────────────────────────────────────┤
│  Frontend:  React + TailwindCSS (in Electron)       │
│  Backend:   Electron Main Process (Node.js)         │
│  AI Layer:  Direct API calls (OpenAI/Claude/Gemini) │
│  OCR:       Tesseract.js or native Tesseract        │
│  Screenshot: Electron desktopCapturer + sharp       │
│  Audio:     Web Speech API or Whisper (Phase 2)     │
│  Stealth:   setContentProtection + native addon     │
│  Hotkeys:   Electron globalShortcut                 │
│  Storage:   SQLite (electron-store or better-sqlite3)│
└─────────────────────────────────────────────────────┘
```

**Why Electron over Tauri for this project:**
1. `setContentProtection(true)` works out of the box — critical for our core feature
2. `desktopCapturer` for easy screenshot/screen reading
3. Larger ecosystem of packages for OCR, audio, etc.
4. Claude Code is excellent with JavaScript/TypeScript
5. More community examples and open-source references to learn from

**Why not a Python app:**
- Python desktop GUIs (PyQt/PySide) don't have built-in capture exclusion
- Would need ctypes/cffi to call Win32 APIs manually
- Packaging is messier
- UI/UX is harder to make polished

---

## 4. Feature Specification

### 4.1 Phase 1: Core MVP (Week 1-2)

#### P1.1 — Invisible Overlay Window
- Transparent, frameless, always-on-top window
- `setContentProtection(true)` enabled
- `skipTaskbar: true`, no window title
- Draggable, resizable
- Adjustable opacity (slider)
- Toggle visibility: `Ctrl+Shift+G` (customizable)

#### P1.2 — Screen Capture & Understanding
- Full-screen screenshot capture via hotkey (`Ctrl+Shift+S`)
- Region selection mode (drag to select area)
- Send screenshot to AI for analysis (vision API)
- OCR fallback for text extraction (Tesseract.js)

#### P1.3 — AI Chat Interface
- Minimal chat UI inside the overlay
- Text input + send button
- Markdown rendering for AI responses
- Code blocks with syntax highlighting + copy button
- Context: automatically attach current screenshot

#### P1.4 — Multi-Provider API Key Management
- Settings panel to enter API keys:
  - OpenAI (GPT-4o, GPT-4o-mini)
  - Anthropic (Claude Sonnet 4, Claude Haiku)
  - Google (Gemini 2.0 Flash, Gemini Pro)
- Model selector dropdown
- Keys stored locally (encrypted with electron-store)
- API key validation on entry

#### P1.5 — Global Hotkey System
| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+G` | Toggle overlay visibility |
| `Ctrl+Shift+S` | Capture screen & send to AI |
| `Ctrl+Shift+R` | Capture selected region |
| `Ctrl+Shift+A` | Focus text input |
| `Ctrl+Shift+C` | Copy last AI response |
| `Ctrl+Shift+N` | New conversation |
| `Escape` | Hide overlay |

### 4.2 Phase 2: Enhanced (Week 3-4)

#### P2.1 — Audio Transcription
- System audio capture (what others say in meetings)
- Microphone input (your voice → text)
- Real-time transcription using:
  - Web Speech API (free, decent)
  - OR Whisper API (better accuracy)
  - OR Deepgram/Groq (fastest)
- Auto-feed transcript as context to AI

#### P2.2 — Smart Modes / Presets
- **Coding Interview Mode**: Auto-detect coding problems, provide solutions with explanations
- **Meeting Assistant Mode**: Summarize discussions, suggest responses
- **Solve Mode**: OCR the question, provide answer
- **General Mode**: Open-ended Q&A
- Custom prompt templates per mode

#### P2.3 — Conversation Memory
- SQLite database for chat history
- Conversation threading
- Search through past conversations
- Context window management (auto-summarize old messages)

#### P2.4 — Clipboard Integration
- Auto-detect copied text
- Option to auto-send clipboard to AI
- Smart paste: AI response → clipboard → paste into the assessment

### 4.3 Phase 3: Polish (Week 5-6)

#### P3.1 — Process Stealth
- Rename process/executable to something innocuous
- Minimize memory footprint
- Option to hide from Task Manager (advanced)

#### P3.2 — Auto-Update & Packaging
- Electron Builder for Windows .exe / .msi
- Auto-updater
- Single-file portable mode

#### P3.3 — Multiple Monitor Support
- Detect monitor setup
- Option to show overlay on specific monitor
- Drag between monitors

#### P3.4 — UI Polish
- Dark/light theme
- Smooth animations (slide in/out)
- Resizable panels
- Font size adjustment
- Response streaming (typewriter effect)

---

## 5. Project Structure

```
ghostai/
├── package.json
├── electron-builder.yml
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts             # App entry, window creation
│   │   ├── overlay.ts           # Overlay window management
│   │   ├── hotkeys.ts           # Global shortcut registration
│   │   ├── screenshot.ts        # Screen capture logic
│   │   ├── ocr.ts               # Tesseract OCR integration
│   │   ├── stealth.ts           # Content protection, process hiding
│   │   ├── store.ts             # Encrypted local storage
│   │   └── ipc-handlers.ts      # IPC bridge (main ↔ renderer)
│   │
│   ├── renderer/                # React frontend (overlay UI)
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ChatPanel.tsx     # Main chat interface
│   │   │   ├── MessageBubble.tsx # Individual message display
│   │   │   ├── CodeBlock.tsx     # Syntax highlighted code + copy
│   │   │   ├── ScreenCapture.tsx # Region selector overlay
│   │   │   ├── Settings.tsx      # API keys, preferences
│   │   │   ├── ModeSelector.tsx  # Interview/Meeting/Solve modes
│   │   │   ├── StatusBar.tsx     # Model, tokens, connection status
│   │   │   └── Controls.tsx      # Opacity slider, pin, minimize
│   │   ├── hooks/
│   │   │   ├── useAI.ts          # AI API abstraction
│   │   │   ├── useScreenshot.ts  # Screenshot hook
│   │   │   └── useHotkeys.ts     # Hotkey state management
│   │   ├── services/
│   │   │   ├── ai-providers/
│   │   │   │   ├── openai.ts
│   │   │   │   ├── anthropic.ts
│   │   │   │   └── gemini.ts
│   │   │   ├── ocr-service.ts
│   │   │   └── audio-service.ts
│   │   └── styles/
│   │       └── globals.css       # Tailwind + custom styles
│   │
│   ├── preload/
│   │   └── index.ts              # Secure IPC bridge
│   │
│   └── native/                   # Optional C++ addons
│       └── window-utils/         # SetWindowDisplayAffinity addon
│           ├── binding.gyp
│           └── window-utils.cc
│
├── assets/
│   └── icons/
├── scripts/
│   └── build.js
└── README.md
```

---

## 6. Development Roadmap with Claude Code

### Sprint 1 (Days 1-3): Foundation
```
Tasks:
1. Initialize Electron + React + TypeScript project
2. Set up electron-builder configuration
3. Create frameless, transparent, always-on-top BrowserWindow
4. Enable setContentProtection(true)
5. Implement global hotkey system (toggle, screenshot, etc.)
6. Test: Verify overlay is invisible in Zoom/Teams screen share
```

### Sprint 2 (Days 4-7): Screen Capture + AI
```
Tasks:
1. Implement full-screen screenshot capture
2. Add region selection mode
3. Integrate Tesseract.js for OCR
4. Build AI provider abstraction layer
5. Implement OpenAI, Claude, Gemini API clients
6. Build settings panel for API key management
7. Test: Screenshot → OCR → AI response pipeline
```

### Sprint 3 (Days 8-11): Chat UI
```
Tasks:
1. Build React chat interface (messages, input, send)
2. Add markdown rendering (react-markdown)
3. Add code block syntax highlighting (prism/highlight.js)
4. Add copy-to-clipboard for code blocks and full responses
5. Implement response streaming (SSE/chunks)
6. Add conversation history (in-memory first)
7. Test: Full flow — capture question → AI answers → copy answer
```

### Sprint 4 (Days 12-14): Polish & Package
```
Tasks:
1. Add opacity control and drag-to-move
2. Add dark/light theme
3. Process stealth (rename, skipTaskbar, no title)
4. Package as .exe/.msi with electron-builder
5. Test on: Mercer Mettl, HackerRank, Google Meet, Zoom, Teams
6. Bug fixes and performance optimization
```

---

## 7. Key Technical Challenges & Solutions

### Challenge 1: Overlay visible during screen share
**Solution**: `win.setContentProtection(true)` — this is the #1 most important line of code in the entire project. On Windows 10 2004+, it uses `WDA_EXCLUDEFROMCAPTURE`. Test on every platform.

### Challenge 2: Screen capture while content-protected
**Problem**: If our window is excluded from capture, won't `desktopCapturer` also miss the assessment content?
**Solution**: `desktopCapturer` captures what's on screen. Our overlay is excluded from *other apps'* capture, but Electron's own `desktopCapturer` captures the full desktop composited output. Alternatively, use a native screenshot library that captures at a different level.

**Better approach**: Take screenshot → hide overlay momentarily → capture → show overlay. Or use `win.setContentProtection(false)` temporarily just for our own capture, then re-enable.

### Challenge 3: Proctoring software detecting the process
**Solution**: 
- Rename the executable to something generic (`WindowsHelper.exe`, `svchost_ui.exe`)
- Use `skipTaskbar: true`
- Keep memory footprint low
- Browser-based proctoring (Mercer Mettl, HackerRank) runs in a browser sandbox and **cannot** enumerate desktop processes

### Challenge 4: macOS compatibility
**Solution**: Focus on Windows first. macOS 15+ broke `sharingType = .none`. For macOS 14 and below, `setContentProtection(true)` works. Consider extreme transparency as a fallback on newer macOS.

### Challenge 5: AI response latency
**Solution**: 
- Use streaming responses (SSE) — show tokens as they arrive
- Use fast models by default (GPT-4o-mini, Gemini Flash, Claude Haiku)
- Pre-warm connections
- Cache repeated questions locally

### Challenge 6: OCR accuracy on code/math
**Solution**:
- Use vision models (GPT-4o, Claude Sonnet, Gemini Pro) which can directly read screenshots
- Much better than traditional OCR for code and formatted content
- Send full screenshot as base64 to the vision API
- Fall back to Tesseract only if no vision API key is available

---

## 8. Use Cases Expanded

### UC1: Coding Assessment (Locked Browser)
1. Open assessment in Mercer Mettl / HackerRank / CodeSignal
2. Press `Ctrl+Shift+G` — InvisiQ overlay appears (invisible to proctoring)
3. Press `Ctrl+Shift+S` — captures the coding question
4. AI analyzes the screenshot, understands the problem
5. AI provides solution with explanation
6. Click "Copy Code" → paste into the assessment editor
7. Press `Escape` to hide overlay

### UC2: Video Meeting (Zoom/Teams/Meet)
1. Join meeting normally
2. Press `Ctrl+Shift+G` to open InvisiQ
3. Type questions or capture screen content
4. AI provides answers, talking points, summaries
5. Overlay is invisible to all other participants during screen share

### UC3: Sales Call Preparation
1. Before/during a sales call, activate InvisiQ
2. Paste prospect's LinkedIn/company info
3. AI generates talking points, objection handling
4. Real-time suggestions during the call

### UC4: Live Coding Interview (CoderPad/Replit)
1. Interviewer shares a problem on CoderPad
2. Capture the problem with `Ctrl+Shift+R` (region select)
3. AI provides approach + code
4. Type the solution yourself (don't copy-paste to appear natural)
5. Ask follow-up questions as the interviewer adds constraints

### UC5: Learning & Study Aid
1. Open lecture video or study material
2. Capture complex diagrams or equations
3. AI explains concepts in detail
4. Keep notes in the chat history

### UC6: Document Review in Meetings
1. Someone shares a document in a meeting
2. Capture specific sections
3. Ask AI to summarize, find issues, suggest responses
4. Respond intelligently without having read the full document

---

## 9. Commands for Claude Code Development

Here's a suggested sequence of Claude Code commands to build this:

```bash
# Step 1: Project Setup
claude "Create a new Electron + React + TypeScript project called ghostai with electron-builder, 
tailwindcss, and the following structure: src/main, src/renderer, src/preload. 
Use Vite for the React bundler. Add dependencies: 
electron, electron-builder, react, react-dom, tailwindcss, 
react-markdown, @anthropic-ai/sdk, openai, @google/generative-ai, 
tesseract.js, electron-store, highlight.js"

# Step 2: Invisible Overlay Window
claude "In src/main/index.ts, create the main Electron window with these properties:
transparent, frameless, alwaysOnTop, skipTaskbar, no title, 
setContentProtection(true). Make it 400x600, positioned at bottom-right.
Add IPC handlers for toggle visibility, set opacity, move window."

# Step 3: Global Hotkeys
claude "Add global hotkey registration in src/main/hotkeys.ts:
Ctrl+Shift+G to toggle overlay, Ctrl+Shift+S for screenshot,
Ctrl+Shift+R for region capture, Ctrl+Shift+C to copy last response,
Escape to hide. Wire these to IPC events."

# Step 4: Screenshot System  
claude "Implement screenshot capture in src/main/screenshot.ts using 
Electron desktopCapturer. Support full-screen and region selection.
Convert to base64 for AI vision APIs. Handle the case where our 
overlay is content-protected by briefly hiding it during capture."

# Step 5: AI Provider Layer
claude "Create AI service layer in src/renderer/services/ai-providers/ 
with adapters for OpenAI (GPT-4o vision), Anthropic (Claude Sonnet vision),
and Google Gemini (vision). Each adapter should support: text chat, 
image+text chat, streaming responses. Use a common interface."

# Step 6: Chat UI
claude "Build the React chat interface in src/renderer with:
ChatPanel, MessageBubble (with markdown + code highlighting), 
text input with send button, screenshot attachment preview,
model selector dropdown, streaming response display."

# Step 7: Settings & API Keys
claude "Create a Settings panel with tabs for API keys (OpenAI, Anthropic, Google),
hotkey customization, appearance (opacity, theme), and mode selection.
Store settings encrypted using electron-store."

# Step 8: Package & Test
claude "Configure electron-builder to package as a Windows .exe.
Rename the output executable to 'SystemHelper.exe'.
Test the build process and verify setContentProtection works."
```

---

## 10. Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| `setContentProtection` doesn't work on some Windows 11 builds | Test across versions; fallback to extreme transparency |
| Enterprise endpoint agents detect the process | Process disguise; keep as personal tool, not for work laptops with MDM |
| AI API costs accumulate | Use cheaper models (Haiku, Flash, GPT-4o-mini) by default; show token count |
| Proctoring detects unusual behavior (eye movement) | Place overlay near the assessment content area; use small, unobtrusive overlay |
| Electron app too large (~200MB) | Consider Tauri migration later; or use portable build |
| API keys stored insecurely | Encrypt with electron-store using machine-specific key |

---

## 11. Testing Checklist

- [ ] Overlay invisible in Zoom screen share
- [ ] Overlay invisible in Google Meet screen share  
- [ ] Overlay invisible in Microsoft Teams screen share
- [ ] Overlay invisible in OBS recording
- [ ] Overlay invisible in Windows Snipping Tool
- [ ] Overlay invisible in Discord screen share
- [ ] Works during Mercer Mettl assessment (browser-based)
- [ ] Works during HackerRank assessment
- [ ] Works during CodeSignal test
- [ ] Screenshot captures assessment content correctly
- [ ] AI responds to captured screenshot within 3-5 seconds
- [ ] Copy-paste works from overlay to assessment editor
- [ ] Global hotkeys work even when the assessment is focused
- [ ] App doesn't appear in taskbar
- [ ] App has low memory footprint (<100MB)
- [ ] API keys persist across restarts (encrypted)

---

## 12. Estimated Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| **Phase 1: MVP** | 2 weeks | Working invisible overlay + screenshot + AI chat |
| **Phase 2: Enhanced** | 2 weeks | Audio, modes, history, clipboard |
| **Phase 3: Polish** | 1-2 weeks | Process stealth, packaging, multi-monitor, UI polish |
| **Total** | ~5-6 weeks | Full-featured personal tool |

With Claude Code, Phase 1 could realistically be done in **3-5 days** of focused work.

---

## 13. Next Steps

1. **Set up development environment**: Install Node.js 20+, Electron, Claude Code
2. **Start with Sprint 1**: Get the invisible overlay working and verified
3. **Get API keys ready**: At least one of OpenAI/Claude/Gemini
4. **Test on target platforms**: Zoom, Meet, Teams, Mercer Mettl
5. **Iterate based on testing**: Fix any detection issues

---

*This is a personal educational project. The tool is built for personal productivity and learning purposes.*
