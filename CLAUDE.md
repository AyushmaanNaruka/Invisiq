# CLAUDE.md — GhostAI Development Context

> This file is the single source of truth for Claude Code when working on GhostAI.
> Read this FIRST before making any changes to the codebase.

---

## Project Identity

- **Name:** GhostAI
- **Tagline:** Your AI copilot that sees everything, but is seen by no one.
- **Type:** Invisible AI desktop overlay assistant
- **Author:** Ayushmaan Singh Naruka
- **License:** Personal Use / MIT

---

## What This Project Does

GhostAI is an Electron desktop app that creates an **invisible overlay window** on top of all other applications. The overlay:

1. Is **completely invisible** to all screen capture, screen sharing, and recording software (Zoom, Teams, Meet, OBS, Snipping Tool, proctoring tools)
2. Captures the user's screen content via screenshots
3. Sends screenshots + questions to AI vision models (OpenAI, Anthropic, Google)
4. Displays AI responses in a chat interface with markdown + code highlighting
5. All controlled via global keyboard shortcuts that work from any application

The core mechanism is Windows' `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` API, exposed in Electron as `win.setContentProtection(true)`.

---

## Documentation Reference

All project documentation lives in the `/docs` directory. **Read the relevant doc before working on any feature:**

| Document | Purpose | Read When |
|---|---|---|
| `docs/GhostAI-PRD.md` | Full product requirements, use cases, functional specs, roadmap | Starting any new feature; understanding requirements |
| `docs/GhostAI-Wireframes.md` | UI mockups, design system, component hierarchy, animations | Working on any UI component |
| `docs/GhostAI-API-Contract.md` | IPC channels, AI provider interfaces, data models, types | Working on IPC, AI integration, or data layer |
| `docs/GhostAI-Planning.md` | Market research, architecture decisions, Claude Code commands | Understanding why decisions were made |

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
| Storage | electron-store | latest (with encryption) |
| Markdown | react-markdown + rehype-highlight | latest |
| Code Highlight | highlight.js | latest |
| Bundler | Vite | 5.x |
| Packaging | electron-builder | latest |

---

## Project Structure

```
ghostai/
├── CLAUDE.md                        ← YOU ARE HERE
├── package.json
├── electron-builder.yml
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
│
├── docs/                             # Project documentation
│   ├── GhostAI-PRD.md
│   ├── GhostAI-Wireframes.md
│   ├── GhostAI-API-Contract.md
│   └── GhostAI-Planning.md
│
├── src/
│   ├── main/                         # Electron Main Process (Node.js)
│   │   ├── index.ts                  # App entry, lifecycle, window creation
│   │   ├── overlay.ts                # BrowserWindow config, content protection
│   │   ├── hotkeys.ts                # globalShortcut registration
│   │   ├── screenshot.ts             # desktopCapturer, full + region capture
│   │   ├── region-selector.ts        # Temporary full-screen selection window
│   │   ├── stealth.ts                # Process disguise, stealth watchdog, alt-tab hiding
│   │   ├── store.ts                  # electron-store with AES-256 encryption
│   │   ├── ipc-handlers.ts           # All ipcMain.handle() registrations
│   │   ├── conversations.ts          # Filesystem-based conversation CRUD (Phase 2)
│   │   ├── clipboard.ts              # Smart paste via PowerShell SendKeys (Phase 2)
│   │   └── clipboard-monitor.ts      # Clipboard polling monitor (Phase 2)
│   │
│   ├── preload/
│   │   └── index.ts                  # contextBridge — exposes ghostAPI to renderer
│   │
│   ├── renderer/                     # React Frontend
│   │   ├── index.html
│   │   ├── main.tsx                  # React entry point
│   │   ├── App.tsx                   # Root component, routing
│   │   │
│   │   ├── components/
│   │   │   ├── HeaderBar.tsx         # Drag handle, mode/model selectors, settings
│   │   │   ├── ChatPanel.tsx         # Message list, scroll, keyboard nav, welcome screen
│   │   │   ├── MessageBubble.tsx     # Single message with markdown + copy/paste
│   │   │   ├── CodeBlock.tsx         # Syntax highlighted code + copy/paste buttons
│   │   │   ├── InputArea.tsx         # Text input, send/stop, screenshot, mic
│   │   │   ├── StatusBar.tsx         # Connection dot, token count, status
│   │   │   ├── Settings.tsx          # Slide-in panel with 4 tab components
│   │   │   ├── SettingsHotkeys.tsx   # Hotkey recording + conflict detection (Phase 2)
│   │   │   ├── SettingsDisplay.tsx   # Theme, opacity, font size, window size (Phase 2)
│   │   │   ├── SettingsPrivacy.tsx   # Toggles, process name, clear data (Phase 2)
│   │   │   ├── ModeSelector.tsx      # Dropdown: built-in + custom modes
│   │   │   ├── ModelSelector.tsx     # Dropdown: grouped by provider
│   │   │   ├── OpacityControl.tsx    # Slider for window opacity
│   │   │   ├── CustomModeEditor.tsx  # Modal for creating/editing custom modes (Phase 2)
│   │   │   ├── ConversationHistory.tsx # Slide-in history panel with search (Phase 2)
│   │   │   ├── Toast.tsx             # Toast notification system (Phase 2)
│   │   │   ├── RegionOverlay.tsx     # Full-screen region selection UI
│   │   │   └── Onboarding.tsx        # First-launch setup wizard
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAI.ts              # AI chat logic, streaming, abort
│   │   │   ├── useScreenshot.ts      # Screenshot state, auto-attach
│   │   │   ├── useSettings.ts        # Settings read/write via IPC
│   │   │   ├── useHotkeys.ts         # Listen for hotkey events from main
│   │   │   ├── useConversation.ts    # Message history, persistence, auto-save (Phase 2)
│   │   │   ├── useConversationHistory.ts # Conversation list, search, export (Phase 2)
│   │   │   └── useAudioTranscription.ts  # Speech-to-text hook (Phase 2)
│   │   │
│   │   ├── services/
│   │   │   ├── ai-providers/
│   │   │   │   ├── types.ts          # AIProvider interface, ChatMessage, etc.
│   │   │   │   ├── provider-manager.ts # Provider registry, model lookup
│   │   │   │   ├── openai.ts         # OpenAI adapter
│   │   │   │   ├── anthropic.ts      # Anthropic adapter
│   │   │   │   └── gemini.ts         # Google Gemini adapter
│   │   │   ├── speech.ts             # SpeechService: Web Speech + Whisper (Phase 2)
│   │   │   └── ocr-service.ts        # Tesseract.js wrapper
│   │   │
│   │   ├── styles/
│   │   │   └── globals.css           # Tailwind directives + custom CSS + animations
│   │   │
│   │   └── types/
│   │       └── global.d.ts           # Window.ghostAPI + SpeechRecognition types
│   │
│   └── shared/                       # Types shared between main + renderer
│       ├── types.ts                  # AppSettings, ChatMessage, SpeechEngine, etc.
│       ├── constants.ts              # Default hotkeys, modes, colors, audio defaults
│       └── errors.ts                 # GhostAIError enum + helpers
│
├── assets/
│   └── icons/                        # App icons (256x256, 128x128, etc.)
│
├── native/                           # Optional C++ addon (fallback)
│   └── window-utils/
│       ├── binding.gyp
│       └── window-utils.cc
│
└── scripts/
    └── build.js                      # Custom build scripts
```

---

## Critical Architecture Rules

### 1. The Most Important Line of Code

```typescript
// In src/main/overlay.ts — THIS MAKES THE APP INVISIBLE
overlayWindow.setContentProtection(true);
```

**Never remove or conditionally disable this.** Without it, the app is visible to screen capture. Every BrowserWindow we create (overlay, region selector, etc.) MUST have this set.

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

```
overlay:toggle        overlay:hide          overlay:show
screenshot:capture-full   screenshot:capture-region
store:get             store:set             store:set-api-key
hotkeys:register-all  hotkeys:update        hotkeys:triggered
clipboard:copy        clipboard:smart-paste
clipboard:start-monitor   clipboard:stop-monitor  clipboard:monitor-status
conversation:save     conversation:load     conversation:list
conversation:delete   conversation:search   conversation:export
conversation:delete-all
modes:list            modes:save            modes:delete
app:get-info          app:quit              app:open-data-folder
```

Renderer event channels (main → renderer):
```
hotkeys:triggered     overlay:visibility-changed
screenshot:captured   app:error             clipboard:changed
```

Full IPC contract is in `docs/GhostAI-API-Contract.md` Section 2.

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
import { GhostAIError } from '../../shared/errors';

// 4. Relative imports
import { CodeBlock } from './CodeBlock';
import './styles.css';
```

### Error Handling

- **Main process:** Try-catch in every IPC handler. Return `{ success: false, error: string }` on failure.
- **Renderer:** Try-catch around all `window.ghostAPI.*` calls. Show error in chat as error message bubble.
- **AI providers:** Map HTTP errors to `GhostAIError` codes (see `docs/GhostAI-API-Contract.md` Section 11).
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

Full design system in `docs/GhostAI-Wireframes.md` Section 1.

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

```
Ctrl+Shift+G  →  Toggle overlay visibility
Ctrl+Shift+S  →  Capture full screen → send to AI
Ctrl+Shift+R  →  Capture region → send to AI
Ctrl+Shift+A  →  Focus text input
Ctrl+Shift+C  →  Copy last AI response
Ctrl+Shift+N  →  New conversation
Escape        →  Hide overlay immediately
```

Registered via `globalShortcut.register()` in `src/main/hotkeys.ts`. All customizable via settings.

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
    ├── Attaches system prompt from active mode
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

Full API formats in `docs/GhostAI-API-Contract.md` Sections 4-6.

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

1. Open GhostAI
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
- [x] Enhanced built-in mode prompts (General, Coding, Meeting, Exam)
- [x] Custom mode CRUD (create, edit, delete with color picker)
- [x] CustomModeEditor modal component
- [x] SettingsHotkeys tab (shortcut recording, conflict detection, reset)
- [x] SettingsDisplay tab (theme, opacity, font size, window size, position)
- [x] SettingsPrivacy tab (toggles, process name, clear data, open data folder)

**Sprint 7:** Clipboard Integration + Smart Paste + Toast
- [x] Smart paste via PowerShell SendKeys (hide overlay, Ctrl+V, restore)
- [x] Clipboard polling monitor (3s interval, MD5 hash comparison)
- [x] Toast notification system (success/error/info, auto-dismiss, stacked)
- [x] "Paste to App" buttons on messages and code blocks

**Sprint 8:** Audio Transcription + Process Stealth + Polish
- [x] Dual speech engine: Web Speech API (free) + Whisper API (paid)
- [x] Mic button in InputArea with recording pulse animation
- [x] Audio transcription hook with interim results
- [x] Enhanced stealth: process disguise, alt-tab hiding, stealth watchdog
- [x] UI polish: keyboard navigation, focus-visible, reduced motion, selection styles

### Phase 3 — Future Enhancements
- Multi-monitor support
- Auto-updater
- Plugin system
- Custom themes

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
# → Read docs/GhostAI-API-Contract.md Section 4.
#   Implement AIProvider interface in src/renderer/services/ai-providers/openai.ts.
#   Support text + vision + streaming.

# "Build the chat UI"
# → Read docs/GhostAI-Wireframes.md Sections 2-3.
#   Use the design system colors from Section 1.
#   Components: ChatPanel, MessageBubble, CodeBlock, InputArea.

# "Add settings panel"
# → Read docs/GhostAI-Wireframes.md Section 6.
#   Four tabs: API Keys, Hotkeys, Display, Privacy.
#   Slide-in from right. Store via IPC → electron-store.
```

---

## Environment Variables

GhostAI does NOT use environment variables for API keys. All keys are stored locally via `electron-store` with encryption. This is intentional — BYOK architecture means no `.env` files with secrets.

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

*Last updated: February 18, 2026 (Phase 2 complete)*
*This file should be updated whenever major architecture decisions change.*
