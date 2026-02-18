# GhostAI — Claude Code Plan Mode Prompt

> Copy-paste this entire prompt into Claude Code with `--plan` flag to begin development.
> Run from the project root directory where CLAUDE.md and /docs exist.

---

## The Prompt

```
I'm building GhostAI — an invisible AI desktop overlay assistant using Electron. Before doing anything, read the following files in this exact order to understand the full project context:

1. CLAUDE.md (root) — Master development context, architecture rules, coding standards
2. docs/GhostAI-PRD.md — Full product requirements, use cases, functional specs
3. docs/GhostAI-API-Contract.md — IPC channels, AI provider interfaces, all TypeScript types
4. docs/GhostAI-Wireframes.md — UI mockups, design system, component specs

Now plan the COMPLETE Phase 1 MVP implementation across all 4 sprints. The project directory already exists with CLAUDE.md and /docs — but has NO code yet. No package.json, no config files, nothing. You're starting from zero.

---

## SPRINT 1 (Days 1-3): Project Scaffolding + Invisible Overlay + Hotkeys

### Step 1: Project Initialization
- Create package.json with ALL dependencies listed in CLAUDE.md "Dependencies to Install" section
- Create tsconfig.json with strict mode enabled and proper paths for main/renderer/preload
- Create a separate tsconfig.node.json for the main process (Node.js target)
- Create vite.config.ts configured for Electron renderer (React plugin, proper base path, build output to dist/renderer)
- Create tailwind.config.ts scanning src/renderer/**/*.{tsx,ts} with the dark theme colors from CLAUDE.md design system
- Create postcss.config.js with tailwindcss and autoprefixer
- Create electron-builder.yml targeting Windows with:
  - productName: "SystemHelper" (stealth name for Task Manager)
  - appId: "com.ghostai.app"
  - win target: nsis
  - directories: output to release/
  - files: include dist/** and package.json
- Create .gitignore (node_modules, dist, release, *.env)
- Set up package.json scripts:
  - "dev": runs Vite dev server + Electron concurrently (use concurrently or electron-vite pattern)
  - "build": TypeScript compile + Vite build
  - "package": electron-builder --win
  - "lint": eslint
  - "typecheck": tsc --noEmit

IMPORTANT: The dev script must properly handle Electron + Vite together. The renderer loads from Vite dev server (http://localhost:5173) in dev mode and from built files in production. The main process needs to be compiled separately from the renderer.

### Step 2: Shared Types (src/shared/)
Create these files with types EXACTLY matching docs/GhostAI-API-Contract.md Section 7:
- src/shared/types.ts — AppSettings, ProviderConfig, Conversation, ChatMessage, ImageAttachment, TokenUsage, StreamChunk, ChatResponse, ChatRequest, ModelConfig, Mode, CustomMode, HotkeyAction, ProviderID, ValidationResult
- src/shared/constants.ts — DEFAULT_HOTKEYS, BUILT_IN_MODES (with all 4 system prompts for General/Coding/Meeting/Exam), DEFAULT_SETTINGS
- src/shared/errors.ts — GhostAIError enum (all error codes from API Contract Section 11), GhostAIErrorResponse interface, mapProviderError helper

### Step 3: Main Process Entry (src/main/)
- src/main/index.ts:
  - app.whenReady() → create overlay window, register hotkeys, register IPC handlers
  - app.on('window-all-closed') → quit on Windows/Linux, stay on macOS
  - app.on('will-quit') → unregister all global shortcuts
  - Single instance lock (app.requestSingleInstanceLock)
  - Load renderer from Vite dev server URL in dev, from file path in production

- src/main/overlay.ts:
  - createOverlayWindow() function returning BrowserWindow
  - EXACT config from CLAUDE.md "BrowserWindow Configuration" section
  - transparent: true, frame: false, alwaysOnTop: true, skipTaskbar: true
  - setContentProtection(true) — THIS IS CRITICAL, NEVER SKIP
  - Position bottom-right of primary display
  - Export functions: showOverlay(), hideOverlay(), toggleOverlay(), setOpacity(), getWindowBounds()

- src/main/stealth.ts:
  - ensureContentProtection(win) — verify and re-apply if needed
  - hideFromTaskbar(win) — ensure skipTaskbar
  - No tray icon by default

- src/main/hotkeys.ts:
  - registerAllHotkeys(overlayWindow) — registers all shortcuts from DEFAULT_HOTKEYS
  - Uses globalShortcut.register() for each
  - Each hotkey sends IPC event 'hotkeys:triggered' to renderer with the action name
  - unregisterAll() for cleanup
  - Handle Escape separately — directly calls hideOverlay()
  - Ctrl+Shift+G — calls toggleOverlay()
  - Ctrl+Shift+S — triggers capture flow (sends event to renderer)
  - Ctrl+Shift+R — triggers region capture flow

- src/main/ipc-handlers.ts:
  - Register ALL ipcMain.handle() channels from API Contract Section 2
  - For Sprint 1, implement: overlay:toggle, overlay:hide, overlay:show, overlay:set-opacity, overlay:get-bounds, app:get-info, app:quit, store:get, store:set
  - Stub the rest (screenshot, clipboard) with TODO comments for Sprint 2
  - VALIDATE all arguments in every handler (type check, range check)

- src/main/store.ts:
  - Initialize electron-store with encryption enabled
  - encryptionKey derived from machine-specific data
  - getSettings() / setSettings() helpers
  - getApiKey(provider) / setApiKey(provider, key) with encryption
  - clearAll() to wipe everything

### Step 4: Preload Script (src/preload/)
- src/preload/index.ts:
  - Use contextBridge.exposeInMainWorld('ghostAPI', {...})
  - Expose EXACTLY the API surface from API Contract Section 9
  - Group into: overlay, screenshot, store, hotkeys, clipboard, app
  - Include on/off event listeners with channel whitelist
  - ONLY allow whitelisted channels — reject everything else

### Step 5: Renderer Skeleton (src/renderer/)
- src/renderer/index.html — minimal HTML with div#root, links Vite entry
- src/renderer/main.tsx — React 18 createRoot, render <App />
- src/renderer/styles/globals.css — Tailwind directives (@tailwind base/components/utilities) + custom CSS variables from Wireframes Section 1.1
- src/renderer/App.tsx — Basic skeleton that displays "GhostAI Ready" with dark background. For now just prove the window renders correctly.
- src/renderer/types/global.d.ts — Window.ghostAPI type declarations from API Contract Section 9.2

### Sprint 1 Verification Checklist:
After Sprint 1, I should be able to:
- Run `npm run dev` and see the overlay window appear (dark, frameless, bottom-right)
- The overlay is INVISIBLE when I take a screenshot with Snipping Tool
- Ctrl+Shift+G toggles the overlay visibility
- Escape hides the overlay
- The window doesn't appear in the taskbar
- Process shows as "SystemHelper" in Task Manager
- No errors in terminal or DevTools console

---

## SPRINT 2 (Days 4-7): Screen Capture + AI Provider Integration

### Step 6: Screenshot System (src/main/)
- src/main/screenshot.ts:
  - captureFullScreen():
    1. Get reference to overlay window
    2. overlayWindow.hide()
    3. await sleep(100) — NEVER skip the 100ms DWM delay
    4. desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } })
    5. Get primary display source
    6. Convert to base64 PNG (nativeImage.toPNG().toString('base64'))
    7. overlayWindow.show()
    8. Return { success: true, image: base64DataUrl, width, height, timestamp }
  - captureRegion(): delegates to region-selector.ts
  - getAvailableMonitors(): list all displays

- src/main/region-selector.ts:
  - Creates a temporary FULL-SCREEN BrowserWindow (transparent, frameless, alwaysOnTop)
  - MUST call setContentProtection(true) on this window too!
  - Loads a simple HTML/JS page that:
    - Shows a dark semi-transparent overlay (rgba(0,0,0,0.3))
    - Changes cursor to crosshair
    - On mousedown: start recording selection rectangle
    - On mousemove: draw dashed animated border, show clear area inside selection, show "WxH" dimensions
    - On mouseup: capture the selected region coordinates, close the window
    - On Escape: cancel, close the window
  - Returns the selection coordinates to main process
  - Main process then captures full screen and crops to the selected region

- Wire up IPC handlers in ipc-handlers.ts: screenshot:capture-full, screenshot:capture-region, screenshot:capture-monitors

### Step 7: AI Provider Abstraction Layer (src/renderer/services/ai-providers/)
- types.ts: AIProvider interface, all supporting types — copy EXACTLY from API Contract Section 3
- provider-manager.ts:
  - ProviderManager class
  - registerProvider(provider: AIProvider)
  - getProvider(id: ProviderID): AIProvider
  - getAllModels(): ModelConfig[] (aggregated from all providers)
  - getAvailableModels(): ModelConfig[] (only providers with valid keys)
  - Singleton export

### Step 8: OpenAI Adapter (src/renderer/services/ai-providers/openai.ts)
Follow API Contract Section 4 EXACTLY:
- Import openai SDK
- Implement AIProvider interface
- OPENAI_MODELS config array with gpt-4o and gpt-4o-mini
- validateKey(): call completions with max_tokens:1, check 200/401/429
- chat(): use AsyncGenerator pattern:
  - Build messages array (handle text + image content blocks)
  - For images: use { type: "image_url", image_url: { url: "data:image/png;base64,..." } } format
  - Call openai.chat.completions.create({ stream: true })
  - Iterate over stream, yield { type: 'text', text: chunk } for each delta
  - On completion, yield final ChatResponse with usage stats
  - On error, yield { type: 'error', error: message }
- abort(): use AbortController to cancel in-flight request

### Step 9: Anthropic Adapter (src/renderer/services/ai-providers/anthropic.ts)
Follow API Contract Section 5 EXACTLY:
- Import @anthropic-ai/sdk
- Implement AIProvider interface
- ANTHROPIC_MODELS with claude-sonnet-4-20250514 and claude-haiku-4-5-20251001
- validateKey(): minimal message call
- chat(): AsyncGenerator:
  - System prompt goes in top-level "system" field (NOT in messages array)
  - Images use: { type: "image", source: { type: "base64", media_type: "image/png", data: "..." } }
  - Use stream: true, parse content_block_delta events for text
  - Parse message_delta for stop_reason and usage
- abort(): AbortController

### Step 10: Gemini Adapter (src/renderer/services/ai-providers/gemini.ts)
Follow API Contract Section 6 EXACTLY:
- Import @google/generative-ai
- Implement AIProvider interface
- GEMINI_MODELS with gemini-2.0-flash and gemini-2.5-pro-preview
- validateKey(): list models endpoint
- chat(): AsyncGenerator:
  - System prompt goes in system_instruction.parts
  - Images use: { inline_data: { mime_type: "image/png", data: "..." } }
  - Use streamGenerateContent
  - Parse candidates[0].content.parts[0].text for each chunk
- abort(): AbortController

### Step 11: Settings Panel UI (src/renderer/components/Settings.tsx)
Reference Wireframes Section 6 for exact layout:
- Slide-in panel from right (250ms ease-out animation)
- 4 tabs: API Keys, Hotkeys, Display, Privacy
- API Keys tab:
  - Input fields for OpenAI, Anthropic, Gemini keys
  - Keys are masked (type="password") with show/hide toggle
  - [Test] button next to each → calls provider.validateKey()
  - Shows ✅ Valid / 🔴 Invalid / ⚪ Not set status
  - On save: calls window.ghostAPI.store.setApiKey()
- Keep other tabs as stubs for now (Hotkeys, Display, Privacy) with "Coming soon" placeholder
- Settings gear icon in HeaderBar opens/closes this panel

### Sprint 2 Verification Checklist:
- Ctrl+Shift+S captures the full screen (overlay hides, captures, overlay returns)
- Ctrl+Shift+R opens region selector (crosshair, drag to select, captures region)
- Region selector is ALSO invisible to screenshot tools
- Can enter API keys for all 3 providers in Settings
- [Test] button correctly validates keys (shows ✅ or 🔴)
- API keys persist after app restart (encrypted in electron-store)

---

## SPRINT 3 (Days 8-11): Chat UI + Streaming AI Responses

### Step 12: Chat Hook (src/renderer/hooks/)
- useAI.ts:
  - State: messages[], isStreaming, currentModel, error
  - sendMessage(text, images?): 
    - Adds user message to messages[]
    - Builds ChatRequest with conversation history + system prompt from active mode
    - Gets provider from ProviderManager
    - Calls provider.chat() async generator
    - For each StreamChunk: append text to growing assistant message (live update)
    - On completion: finalize message with usage stats
    - On error: add error message to chat
  - stopGeneration(): calls provider.abort()
  - clearConversation(): resets messages[]
  - Returns: { messages, isStreaming, error, sendMessage, stopGeneration, clearConversation }

- useScreenshot.ts:
  - State: pendingScreenshot (base64 | null), isCapturing
  - captureFull(): calls window.ghostAPI.screenshot.captureFull()
  - captureRegion(): calls window.ghostAPI.screenshot.captureRegion()
  - clearScreenshot(): nulls pendingScreenshot
  - Listens for 'hotkeys:triggered' events for capture-screen/capture-region actions
  - Returns: { pendingScreenshot, isCapturing, captureFull, captureRegion, clearScreenshot }

- useSettings.ts:
  - State: settings (AppSettings), isLoading
  - Loads settings on mount via window.ghostAPI.store.getAll()
  - updateSetting(key, value): calls window.ghostAPI.store.set()
  - Returns: { settings, isLoading, updateSetting }

- useHotkeys.ts:
  - Listens for 'hotkeys:triggered' IPC events
  - Dispatches actions to the appropriate hooks/callbacks
  - Returns: { registerCallback(action, fn) }

- useConversation.ts:
  - Manages the active conversation context
  - Keeps track of message history for multi-turn
  - Handles "new conversation" action (clears history)

### Step 13: Chat Panel Components
Reference Wireframes Sections 2-3 for exact layouts. Use design system colors.

- src/renderer/components/HeaderBar.tsx:
  - 32px height, bg-[#1e1e36]
  - Left: drag handle (6-dot grip icon) — make this region -webkit-app-region: drag
  - Center-left: ModeSelector dropdown
  - Center-right: ModelSelector dropdown
  - Right: OpacityControl (icon, hover reveals slider), Settings gear, Close (X) button
  - Close button calls window.ghostAPI.overlay.hide() (NOT app.quit)

- src/renderer/components/ChatPanel.tsx:
  - Scrollable container for messages
  - When empty: show WelcomeScreen (ghost emoji, "GhostAI" title, shortcut hints)
  - When messages exist: render MessageBubble for each
  - Auto-scroll to bottom on new messages (with smart scroll — don't auto-scroll if user scrolled up)
  - At the bottom during streaming: show StreamingIndicator (pulsing dots)

- src/renderer/components/MessageBubble.tsx:
  - User messages: right-aligned, bg-[#2E75B6], rounded-lg
  - AI messages: left-aligned, bg-[#2d2d44], rounded-lg
  - Error messages: full-width, bg-[#D63031]/15, red border
  - User messages can have screenshot thumbnail (clickable to expand?)
  - AI messages render markdown via ReactMarkdown:
    - Custom component overrides: code → CodeBlock, a → opens in external browser
    - Rehype-highlight for syntax highlighting
  - "Copy All" button at bottom-right of AI messages
  - Timestamp (optional, show on hover)

- src/renderer/components/CodeBlock.tsx:
  - Detects language from markdown fence (```python, ```javascript, etc.)
  - Language label top-left
  - Copy button top-right (📋 → ✅ Copied! for 2s → 📋)
  - Background: #0d1117
  - Syntax highlighting via highlight.js classes
  - Horizontal scroll for long lines, no word wrap in code

- src/renderer/components/InputArea.tsx:
  - Left: Screenshot attach button (📷) — opens capture options or uses last capture
  - Center: Auto-expanding textarea (min 1 line, max 4 lines, then scroll)
  - Right: Send button (▶) when not streaming, Stop button (■) when streaming
  - Above input: screenshot thumbnail preview with ✕ remove button (when screenshot is attached)
  - Enter sends, Shift+Enter inserts newline
  - Placeholder text: "Ask anything..." (or "Type follow-up..." when conversation exists)

- src/renderer/components/StatusBar.tsx:
  - 24px height, bg-[#1a1a2e], border-top
  - Left: connection dot (🟢 Connected / 🔴 Error / 🟡 No key)
  - Center: token count (input + output)
  - Right: status label (Ready / Streaming... / Error)

- src/renderer/components/ModeSelector.tsx:
  - Dropdown with color-coded dots: ⚪ General, 🟣 Coding, 🔵 Meeting, 🟡 Exam
  - Currently selected mode shown in header
  - Changing mode updates the system prompt for next message

- src/renderer/components/ModelSelector.tsx:
  - Dropdown grouped by provider (ANTHROPIC, OPENAI, GOOGLE headers)
  - Each model shows: name, vision icon (🖼️) if supported, checkmark if selected
  - Models without valid API key show lock icon (🔒) and "No API key"
  - Click on locked model → opens Settings to API Keys tab

- src/renderer/components/OpacityControl.tsx:
  - Circle icon (◐) in header
  - On hover/click: reveals a small slider (10% to 100%)
  - Calls window.ghostAPI.overlay.setOpacity()
  - Shows current percentage

### Step 14: Wire Up App.tsx
- App.tsx becomes the main layout:
  - <HeaderBar> (fixed top)
  - <ChatPanel> (flex-grow, scrollable)
  - <InputArea> (fixed bottom)
  - <StatusBar> (fixed bottom)
  - <Settings> (conditional slide-in overlay)
- Initialize all hooks (useAI, useScreenshot, useSettings, useHotkeys)
- Pass props/callbacks between components
- Handle the complete flow:
  1. User types message or captures screenshot → InputArea
  2. On send → useAI.sendMessage(text, images)
  3. Streaming tokens update ChatPanel in real-time
  4. Hotkey events from main process trigger appropriate actions

### Sprint 3 Verification Checklist:
- Can type a message and send it (Enter or Send button)
- AI response streams in real-time (tokens appear progressively)
- Markdown renders correctly (bold, italic, headers, lists, links)
- Code blocks have syntax highlighting and working copy button
- Can switch between AI models via dropdown
- Can switch between modes via dropdown
- Screenshot thumbnail shows in input area when captured
- Screenshot is sent to AI along with the question
- Multi-turn conversation works (AI remembers context)
- "New Conversation" clears the chat
- Stop button cancels in-progress generation
- Auto-scroll works during streaming

---

## SPRINT 4 (Days 12-14): Integration Testing + Packaging

### Step 15: End-to-End Flow Polish
- Test the COMPLETE flow: Ctrl+Shift+S → screenshot captured → auto-attached → user types question → Send → AI streams response → copy code
- Test region capture flow: Ctrl+Shift+R → drag region → captured → sent to AI
- Test all hotkeys work when another app (Chrome, VS Code) is in foreground
- Fix any race conditions in the hide/capture/show sequence
- Ensure no memory leaks from screenshots (base64 strings should be GC'd after sending)

### Step 16: Error Handling
- Implement proper error display for:
  - Invalid API key → error bubble with "Open Settings" link
  - Rate limit → error bubble with retry countdown timer
  - Network error → top banner "No connection"
  - Context too long → error bubble suggesting model switch
- All errors use the GhostAIError codes from shared/errors.ts
- No unhandled promise rejections — every async path has catch

### Step 17: Packaging
- Configure electron-builder.yml properly
- Test `npm run build` produces working dist/
- Test `npm run package` creates .exe installer in release/
- Verify packaged app:
  - Launches correctly
  - Content protection still works
  - Hotkeys work
  - AI streaming works
  - Process name shows as "SystemHelper"

### Step 18: Performance Tuning
- Measure cold start time (target: < 3s)
- Check idle memory (target: < 150MB)
- Lazy-load AI provider SDKs (only import when first used)
- Ensure screenshots are cleared from memory after being sent to AI
- Optimize React renders (memo, useCallback where appropriate)

### Sprint 4 Verification Checklist:
- Full end-to-end: capture screen → ask AI → get streaming response → copy code ✅
- All 3 AI providers work: OpenAI, Anthropic, Gemini ✅
- Vision works with all 3 providers (screenshot → AI understands content) ✅
- Error states display correctly ✅
- Packaged .exe installs and runs correctly ✅
- Content protection works in packaged build ✅
- Cold start < 3 seconds ✅
- Idle memory < 150MB ✅

---

## CRITICAL RULES — FOLLOW THESE AT ALL TIMES

1. **EVERY BrowserWindow MUST call setContentProtection(true)** — overlay, region selector, any other window. This is the #1 requirement of the entire app.

2. **contextIsolation: true and nodeIntegration: false** — ALWAYS. The renderer NEVER gets direct Node.js access. All communication goes through the preload contextBridge.

3. **Hide overlay BEFORE screenshot, wait 100ms, capture, then show** — Never skip the delay. DWM needs recomposition time.

4. **AI calls happen in the RENDERER process** — They're HTTP requests. The main process handles system operations only (window, hotkeys, screenshots, storage).

5. **Validate ALL IPC arguments in main process handlers** — Type check, range check, whitelist check. Never trust renderer input.

6. **Encrypt API keys** — Use electron-store with AES-256 encryption. Keys are never stored in plain text, never logged, never sent anywhere except the provider API.

7. **TypeScript strict mode** — No `any` without a comment explaining why. Explicit return types on exports. Interface over type for objects.

8. **Follow the file structure in CLAUDE.md exactly** — Don't create files in unexpected locations. Don't rename the structure.

---

## OUTPUT FORMAT

For each sprint, provide:
1. The implementation plan (files to create/modify, in order)
2. Key decisions and trade-offs you're making
3. Any concerns or questions about the specs
4. Estimated LOC per file

Then after I approve the plan, implement each sprint fully before moving to the next.
```

---

## How to Use This Prompt

### Option A: Full Plan Mode
```bash
cd /path/to/ghostai
cat claude-code-prompt.md | claude --plan
```

### Option B: Sprint-by-Sprint
Copy just Sprint 1 section and feed it to Claude Code. After Sprint 1 is verified, feed Sprint 2, etc.

### Option C: Interactive
Open Claude Code in the project directory and paste the full prompt. Review the plan, ask questions, then approve implementation sprint by sprint.

### Recommended Approach
Start with the full prompt in plan mode to get the complete plan. Review it. Then tell Claude Code to implement Sprint 1. Test manually. Then proceed to Sprint 2, and so on.

---

*This prompt was generated on February 18, 2026 from GhostAI project documentation.*
