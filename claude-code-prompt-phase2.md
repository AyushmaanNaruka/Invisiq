# GhostAI — Phase 2 Claude Code Plan Mode Prompt

> Copy-paste this entire prompt into Claude Code with `--plan` flag to begin Phase 2 development.
> Run from the project root directory (d:\Projects\ghostai) where the Phase 1 codebase exists.

---

## The Prompt

```
I'm continuing development on GhostAI — an invisible AI desktop overlay assistant using Electron. Phase 1 (MVP) is COMPLETE and working. Before doing anything, read the following files to understand the full project context:

1. CLAUDE.md (root) — Master development context, architecture rules, coding standards
2. docs/GhostAI-PRD.md — Full product requirements (especially Section 4.6-4.8, Section 9.2 Phase 2, Section 12)
3. docs/GhostAI-API-Contract.md — IPC channels, types, preload API surface (Sections 2, 7, 9)
4. docs/GhostAI-Wireframes.md — UI specs for settings tabs (Sections 6.2-6.4), mode editor (Section 7.3), design system

Then read the EXISTING codebase to understand what's already built. Key files to examine:

- src/shared/types.ts — All TypeScript interfaces (Conversation, ChatMessage, Mode, AppSettings, etc.)
- src/shared/constants.ts — BUILT_IN_MODES, DEFAULT_SETTINGS, DEFAULT_HOTKEYS, model configs
- src/main/ipc-handlers.ts — All registered IPC channels
- src/main/store.ts — electron-store wrapper with encryption
- src/preload/index.ts — contextBridge API surface exposed to renderer
- src/renderer/App.tsx — Main app layout and state management
- src/renderer/hooks/ — useAI, useConversation, useScreenshot, useSettings, useHotkeys
- src/renderer/components/ — All UI components (HeaderBar, ChatPanel, InputArea, Settings, etc.)
- src/renderer/types/global.d.ts — Window.ghostAPI type declarations

Phase 1 delivered: invisible overlay, global hotkeys, screen capture (full + region), 3 AI providers (OpenAI/Anthropic/Gemini) with streaming, chat UI with markdown/code blocks, Settings API Keys tab, mode selector, model selector, opacity control, status bar.

Now plan the COMPLETE Phase 2 implementation across 4 sprints (Sprints 5-8). The codebase is fully functional — you're EXTENDING it, not rebuilding.

---

## SPRINT 5 (Days 15-18): Chat Persistence + Conversation History UI

### Step 1: Conversation Storage Layer (src/main/conversations.ts)
Create a new module for conversation CRUD operations using the filesystem (NOT electron-store — conversations can get large):
- Storage location: `app.getPath('userData')/conversations/` directory
- Each conversation saved as individual JSON file: `{uuid}.json`
- File format: `{ id, title, messages[], mode, model, createdAt, updatedAt, tokenCount }`

Functions to implement:
- `saveConversation(conversation: Conversation): Promise<void>` — write/overwrite JSON file
- `loadConversation(id: string): Promise<Conversation | null>` — read single conversation
- `listConversations(): Promise<ConversationMeta[]>` — scan directory, return metadata (id, title, preview, updatedAt, messageCount, tokenCount) WITHOUT loading full message arrays. Sort by updatedAt descending.
- `deleteConversation(id: string): Promise<void>` — delete JSON file
- `searchConversations(query: string): Promise<ConversationMeta[]>` — full-text search across all conversation files (search title + message content). Case-insensitive. Return matching conversations with highlighted snippets.
- `exportConversation(id: string, format: 'markdown'): Promise<string>` — convert conversation to markdown string with proper formatting (headers, code blocks preserved, user/ai labels, timestamps)
- `deleteAllConversations(): Promise<void>` — rm -rf conversations directory

ConversationMeta type (add to src/shared/types.ts):
```typescript
interface ConversationMeta {
  id: string;
  title: string;
  preview: string;       // First 100 chars of first AI response
  mode: string;
  model: string;
  messageCount: number;
  tokenCount: number;
  createdAt: number;
  updatedAt: number;
}
```

Auto-title generation: When saving a conversation for the first time (no title set), generate a title from the first user message — take first 50 characters, trim to last word boundary, add "..." if truncated.

### Step 2: New IPC Channels (src/main/ipc-handlers.ts)
Register these new IPC handlers:

- `conversation:save` — Args: { conversation: Conversation } → Returns: { success: boolean }
- `conversation:load` — Args: { id: string } → Returns: { conversation: Conversation | null }
- `conversation:list` — Args: none → Returns: { conversations: ConversationMeta[] }
- `conversation:delete` — Args: { id: string } → Returns: { success: boolean }
- `conversation:search` — Args: { query: string } → Returns: { conversations: ConversationMeta[] }
- `conversation:export` — Args: { id: string, format: 'markdown' } → Returns: { content: string, filename: string }
- `conversation:delete-all` — Args: none → Returns: { success: boolean }

VALIDATE all arguments in every handler (type check id is string, query is string, etc.)

### Step 3: Update Preload API Surface (src/preload/index.ts)
Add conversation group to the contextBridge:

```typescript
conversation: {
  save: (conversation) => ipcRenderer.invoke('conversation:save', { conversation }),
  load: (id) => ipcRenderer.invoke('conversation:load', { id }),
  list: () => ipcRenderer.invoke('conversation:list'),
  delete: (id) => ipcRenderer.invoke('conversation:delete', { id }),
  search: (query) => ipcRenderer.invoke('conversation:search', { query }),
  export: (id, format) => ipcRenderer.invoke('conversation:export', { id, format }),
  deleteAll: () => ipcRenderer.invoke('conversation:delete-all'),
},
```

Add 'conversation:save', 'conversation:load', 'conversation:list', 'conversation:delete', 'conversation:search', 'conversation:export', 'conversation:delete-all' to the valid channels.

Update src/renderer/types/global.d.ts with the new conversation API types.

### Step 4: Conversation History Hook (src/renderer/hooks/useConversationHistory.ts)
New hook for managing the conversation list (separate from useConversation which manages the ACTIVE conversation):

- State: `conversations: ConversationMeta[]`, `isLoading: boolean`, `searchQuery: string`, `searchResults: ConversationMeta[] | null`
- `loadConversationList()` — calls window.ghostAPI.conversation.list(), updates state
- `openConversation(id: string)` — calls window.ghostAPI.conversation.load(id), returns full Conversation
- `deleteConversation(id: string)` — calls delete, refreshes list
- `searchConversations(query: string)` — calls search, stores results separately
- `clearSearch()` — resets searchResults to null (shows full list again)
- `exportConversation(id: string)` — calls export, triggers download via Blob + anchor trick
- `deleteAllConversations()` — calls deleteAll, refreshes list
- Load conversation list on mount

### Step 5: Update useConversation Hook (src/renderer/hooks/useConversation.ts)
Extend the existing hook to support persistence:

- Add `conversationId: string | null` state — tracks current conversation's ID
- Add `conversationTitle: string` state
- `startNewConversation()` — generates new UUID, resets messages, sets conversationId
- `loadExistingConversation(conversation: Conversation)` — loads messages, sets id/title/mode
- `autoSave()` — debounced (500ms) save that calls window.ghostAPI.conversation.save() with current state. Triggered after every message add/update.
- When first user message is added to a new conversation → auto-generate title
- When `clearConversation()` is called → actually starts a new conversation (new ID)
- Return new fields: `conversationId, conversationTitle, startNewConversation, loadExistingConversation`

### Step 6: Conversation History Panel (src/renderer/components/ConversationHistory.tsx)
A slide-in panel from the LEFT side (opposite to Settings which slides from right):

Layout (reference Wireframes style):
```
╭────────────────────────────╮
│  Chat History         ✕    │
├────────────────────────────┤
│  🔍 Search conversations   │  ← Search input
├────────────────────────────┤
│  ┌──────────────────────┐  │
│  │ How to implement...  │  │  ← Conversation item
│  │ Claude Sonnet • 2m   │  │     Title + model + relative time
│  │ 12 messages          │  │     Message count
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │ Python decorator...  │  │
│  │ GPT-4o • 1h          │  │
│  │ 8 messages           │  │
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │ Meeting notes from.. │  │
│  │ Gemini Flash • 3h    │  │
│  │ 24 messages          │  │
│  └──────────────────────┘  │
│          ...                │
├────────────────────────────┤
│  🗑️ Clear All History       │  ← Destructive action, needs confirm
╰────────────────────────────╯
```

Features:
- 280px width, slide-in from left with 250ms ease-out transition
- Each conversation item shows: title (truncated), model name, relative time (using a simple helper: "2m ago", "1h ago", "Yesterday", "Feb 15"), message count
- Click conversation → loads it into the main chat (replaces current conversation)
- Right-click or long-press on item shows context menu: Open, Export as Markdown, Delete
- Hover on item shows subtle delete (🗑️) and export (📥) icons on the right
- Search input at top: debounced (300ms) search, shows filtered results with matched text highlighted in yellow
- "Clear All History" at bottom — shows confirmation dialog before deleting
- Empty state when no conversations: "No conversations yet. Start chatting!"
- The currently active conversation should be highlighted with a left border accent color

### Step 7: Header Bar Update (src/renderer/components/HeaderBar.tsx)
- Add a history button (📋 or clock icon) to the LEFT of the drag handle
- Click opens/closes the ConversationHistory panel
- Add a "New Chat" button (➕) next to the history button — starts a new conversation
- When ConversationHistory is open, the button should appear "active" (highlighted background)

### Step 8: Wire Up in App.tsx
- Import and initialize useConversationHistory hook
- Add ConversationHistory panel to layout (positioned left, behind main content with overlay)
- Wire "New Chat" button → saves current conversation if it has messages, then startNewConversation()
- Wire conversation item click → autoSave current conversation first, then loadExistingConversation()
- Wire hotkey 'new-conversation' → same as "New Chat" button
- Auto-save triggers after every sendMessage completes and after every stopGeneration

IMPORTANT: When the app first launches, it should start with a fresh empty conversation (not load the last one). The user can access history to return to old conversations.

### Sprint 5 Verification Checklist:
- Start app → empty chat → type message → AI responds → conversation auto-saves ✅
- Click history (📋) → see saved conversation in list ✅
- Click on a past conversation → loads it with all messages ✅
- Start new chat → previous conversation is saved, fresh empty chat appears ✅
- Search conversations → finds by content match ✅
- Right-click → Export → downloads .md file ✅
- Right-click → Delete → removes conversation from list ✅
- "Clear All History" → confirms then deletes everything ✅
- App restart → history persists, can reload old conversations ✅
- Conversations show relative timestamps ("2m ago", "Yesterday") ✅

---

## SPRINT 6 (Days 19-22): Smart Modes + Custom Modes + Settings Tabs

### Step 9: Enhanced Built-in Mode Prompts (src/shared/constants.ts)
Upgrade the 4 BUILT_IN_MODES with much better system prompts:

**General Mode:**
```
You are GhostAI, a helpful personal AI assistant running as an invisible desktop overlay. Be concise but thorough. Format responses with markdown when helpful. If you see a screenshot, analyze its content carefully and respond in the context of what's visible on screen.
```

**Coding Mode:**
```
You are GhostAI in Coding Mode — an expert programming assistant specializing in algorithms, data structures, and software engineering. When shown code or programming problems:
1. Analyze the problem carefully before writing code
2. Provide clean, optimized solutions with clear variable names
3. Always include time and space complexity analysis (Big-O)
4. If the problem is from a coding challenge, provide multiple approaches (brute force → optimal)
5. Include edge cases and test examples
6. Use the same programming language as the question unless asked otherwise
7. For debugging: identify the exact issue, explain WHY it fails, provide the fix
Keep responses focused on code. Skip pleasantries. Be direct.
```

**Meeting Mode:**
```
You are GhostAI in Meeting Mode — a real-time meeting assistant. When shown screen content from a meeting or conversation:
1. Identify key discussion points and decisions being made
2. Suggest relevant talking points or responses the user could give
3. Summarize what's being discussed in 2-3 bullet points
4. Flag any action items or deadlines mentioned
5. If asked for a response suggestion, provide 2-3 options ranging from brief to detailed
6. Keep all suggestions professional and contextually appropriate
Be concise — the user is in a live meeting and needs quick answers.
```

**Exam Mode:**
```
You are GhostAI in Exam Mode — optimized for answering exam and assessment questions quickly and accurately. Rules:
1. Give the ANSWER FIRST, then the explanation
2. For multiple choice: state the correct option immediately, then explain why
3. For calculations: show the final answer, then the step-by-step work
4. For essays/short answer: provide a complete, structured response ready to be used
5. For code: provide a working solution immediately, optimized for correctness
6. Be extremely concise — no introductions, no "Great question!", just answers
7. If a screenshot shows an exam question, treat it with urgency
Speed and accuracy over everything.
```

### Step 10: Custom Mode System (src/shared/types.ts + src/main/store.ts)
Add CustomMode type (if not already in types.ts):
```typescript
interface CustomMode {
  id: string;           // UUID
  name: string;         // User-given name
  color: string;        // Hex color for the dot indicator
  systemPrompt: string; // The custom system prompt
  createdAt: number;
  updatedAt: number;
}
```

Add to store.ts:
- `getCustomModes(): CustomMode[]` — reads from electron-store key 'customModes'
- `saveCustomMode(mode: CustomMode): void` — adds/updates in array
- `deleteCustomMode(id: string): void` — removes from array
- `getCustomMode(id: string): CustomMode | null`

Add IPC channels in ipc-handlers.ts:
- `modes:get-custom` — Returns: { modes: CustomMode[] }
- `modes:save-custom` — Args: { mode: CustomMode } → Returns: { success: boolean }
- `modes:delete-custom` — Args: { id: string } → Returns: { success: boolean }

Add to preload + global.d.ts:
```typescript
modes: {
  getCustom: () => ipcRenderer.invoke('modes:get-custom'),
  saveCustom: (mode) => ipcRenderer.invoke('modes:save-custom', { mode }),
  deleteCustom: (id) => ipcRenderer.invoke('modes:delete-custom', { id }),
},
```

### Step 11: Custom Mode Editor (src/renderer/components/CustomModeEditor.tsx)
Modal dialog (centered overlay with backdrop blur) matching Wireframes Section 7.3:

```
╭─────────────────────────────────────────╮
│  Create Custom Mode                  ✕  │
├─────────────────────────────────────────┤
│                                         │
│  Mode Name                              │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Color                                  │
│  🔴 🟠 🟡 🟢 🔵 🟣 ⚪ ⚫               │
│                                         │
│  System Prompt                          │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │                                 │    │
│  │                                 │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌────────────┐  ┌──────────────────┐   │
│  │   Cancel    │  │   Save Mode  ▶  │   │
│  └────────────┘  └──────────────────┘   │
╰─────────────────────────────────────────╯
```

Features:
- Mode name: text input, max 30 characters, required
- Color: 8 color option circles (red #E74C3C, orange #E67E22, yellow #F1C40F, green #2ECC71, blue #3498DB, purple #9B59B6, white #ECF0F1, gray #95A5A6) — click to select, shows ring around selected
- System prompt: textarea, min 10 characters, max 2000 characters, shows character count
- Validation: name required, prompt required (min 10 chars)
- Save → calls window.ghostAPI.modes.saveCustom() → closes modal → refreshes mode list
- Cancel → closes modal without saving
- When editing existing mode: pre-fills all fields, shows "Edit Custom Mode" title, includes Delete button (red, with confirmation)

### Step 12: Update ModeSelector (src/renderer/components/ModeSelector.tsx)
- Load custom modes on mount via window.ghostAPI.modes.getCustom()
- Show built-in modes first (General, Coding, Meeting, Exam) then a separator line, then custom modes with their custom colors
- At the bottom: "+ Custom Mode..." option that opens CustomModeEditor
- Custom modes show in the dropdown with their assigned color dots
- Right-click on a custom mode → Edit / Delete options
- When a custom mode is selected, use its systemPrompt for AI requests

### Step 13: Settings — Hotkeys Tab (src/renderer/components/SettingsHotkeys.tsx)
Implement the Hotkeys tab matching Wireframes Section 6.2:

- List all hotkeys with current binding and [Edit] button:
  - Toggle Overlay: Ctrl+Shift+G
  - Capture Screen: Ctrl+Shift+S
  - Capture Region: Ctrl+Shift+R
  - Copy Last Response: Ctrl+Shift+C
  - New Conversation: Ctrl+Shift+N
  - Hide Overlay: Escape
- Edit mode (click [Edit]):
  - Input field changes to recording state with pulsing blue border
  - "Press new shortcut..." placeholder
  - Captures the next key combination (use keydown event, build combo string from modifier keys + key)
  - Validates: must have at least one modifier (Ctrl/Alt/Shift) + one key (except Escape which is allowed standalone)
  - Conflict detection: if another action already uses that combo, show warning "Already used by [action name]"
  - [Cancel] button to abort editing
  - On valid combo → calls window.ghostAPI.hotkeys.update(action, newShortcut)
- [Reset to Defaults] button at bottom → restores DEFAULT_HOTKEYS from constants

### Step 14: Settings — Display Tab (src/renderer/components/SettingsDisplay.tsx)
Implement matching Wireframes Section 6.3:

- **Theme toggle**: Dark / Light buttons (for now, only Dark works — Light is "Coming soon")
- **Default Opacity**: Slider from 10% to 100%, shows current value. Changes are applied live (calls setOpacity) AND saved to settings
- **Font Size**: Number input with up/down buttons, range 11-18px. Saved to settings, applied via CSS variable `--font-size-base`
- **Default Window Size**: Width and Height number inputs. Applied on next launch.
- **Start Position**: Dropdown with options: Bottom-right, Bottom-left, Top-right, Top-left, Center, Remember last position
- **Checkboxes**: Show status bar, Auto-scroll on new messages, Always show timestamps on messages

All settings saved via window.ghostAPI.store.set() and loaded on mount. Changes take effect immediately where possible.

Add these settings fields to AppSettings in src/shared/types.ts if not already present:
```typescript
// Add to AppSettings
fontSize: number;           // default: 13
startPosition: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center' | 'remember';
showStatusBar: boolean;     // default: true
autoScroll: boolean;        // default: true
showTimestamps: boolean;    // default: false
defaultWidth: number;       // default: 420
defaultHeight: number;      // default: 600
```

### Step 15: Settings — Privacy Tab (src/renderer/components/SettingsPrivacy.tsx)
Implement matching Wireframes Section 6.4:

- **Checkboxes**:
  - ☑ Encrypt API keys at rest (always on, disabled — informational)
  - ☑ Clear screenshots from memory after sending to AI (toggle, saved to settings)
  - ☐ Persist chat history to disk (toggle — when OFF, conversations are not auto-saved)
  - ☐ Log API requests for debugging (toggle — when ON, logs request/response metadata to console)
- **Process Name**: Text input showing current process name (default: "SystemHelper"). Info text: "The app process will appear with this name in Task Manager". Note: This is informational for now — actual process rename requires electron-builder rebuild.
- **Clear All Data** button (RED): Destructive action that:
  1. Shows confirmation dialog: "Delete all API keys, chat history, and preferences? Cannot be undone."
  2. On confirm: calls window.ghostAPI.store.clearAll() + window.ghostAPI.conversation.deleteAll()
  3. Resets app to fresh state
- **Open Data Folder** button: calls shell.openPath(app.getPath('userData')) via a new IPC channel `app:open-data-folder`

Add IPC channel `app:open-data-folder`:
- Handler in main: `shell.openPath(app.getPath('userData'))` (import shell from electron)
- Add to preload: `app.openDataFolder: () => ipcRenderer.invoke('app:open-data-folder')`

### Step 16: Settings Component Refactor (src/renderer/components/Settings.tsx)
- Replace the "Coming soon" stubs with the real tab components
- 4 working tabs: API Keys (existing), Hotkeys (new), Display (new), Privacy (new)
- Tab bar at top of settings panel with active tab indicator
- Each tab is a separate component imported into Settings
- Settings panel width: 320px (slightly wider than before to accommodate the new tabs)

### Sprint 6 Verification Checklist:
- All 4 built-in modes have improved, detailed system prompts ✅
- Can create a custom mode (name, color, prompt) ✅
- Custom mode appears in ModeSelector dropdown ✅
- Selecting custom mode uses its system prompt for AI ✅
- Can edit and delete custom modes ✅
- Custom modes persist after restart ✅
- Hotkeys tab: can see all current bindings ✅
- Hotkeys tab: can record new shortcut, saves, works immediately ✅
- Hotkeys tab: conflict detection works ✅
- Display tab: opacity slider works live ✅
- Display tab: font size change applies immediately ✅
- Display tab: settings persist after restart ✅
- Privacy tab: "Clear All Data" works (wipes everything) ✅
- Privacy tab: "Open Data Folder" opens file explorer ✅
- Privacy tab: "Persist chat history" toggle actually controls auto-save ✅

---

## SPRINT 7 (Days 23-26): Clipboard Integration + Smart Paste

### Step 17: Clipboard Smart Paste Backend (src/main/clipboard.ts)
Create a new module for advanced clipboard operations:

- `smartPaste(text: string, wpm: number = 80): Promise<void>`:
  - Uses `@nut-tree-fork/nut-js` (or `robotjs` if available, but nut-js is more maintained) for keyboard simulation
  - Alternatively, if external deps are problematic, use Electron's built-in approach:
    1. Focus the target window (the window behind the overlay)
    2. Use `keyboard` from `@nut-tree-fork/nut-js` to type characters one by one
    3. Calculate delay between characters based on WPM (average word = 5 chars + space)
    4. Add slight random variance (±20%) to delay for natural feel
    5. Handle special characters (newlines, tabs) properly
  - FALLBACK approach if robotjs/nut-js aren't available: use Electron's `webContents.sendInputEvent()` or simply copy to clipboard and let user paste manually with a notification
  
- `readClipboard(): { text: string | null, hasImage: boolean }`:
  - Read text via clipboard.readText()
  - Check for image via clipboard.readImage().isEmpty()
  - Return both

- `copyToClipboard(text: string): void`:
  - clipboard.writeText(text)

IMPORTANT DECISION: For smart paste, the simplest reliable approach is:
1. Copy text to clipboard
2. Hide the overlay
3. Wait 100ms
4. Simulate Ctrl+V keystroke using Electron's `globalShortcut` or PowerShell's `[System.Windows.Forms.SendKeys]`
5. Show the overlay again

This avoids the complexity of character-by-character typing while still providing a "smart paste" that works with the overlay hidden. For character-by-character natural typing, install `@nut-tree-fork/nut-js` and implement the typing simulation.

Add dependency to package.json if using nut-js:
```json
"@nut-tree-fork/nut-js": "^4.2.0"
```

### Step 18: Clipboard IPC Handlers (src/main/ipc-handlers.ts)
Wire up the clipboard IPC channels that were stubbed in Phase 1:

- `clipboard:copy` — Args: { text: string } → copies to system clipboard → Returns: { success: boolean }
- `clipboard:read` — Args: none → Returns: { text: string | null, hasImage: boolean }
- `clipboard:smart-paste` — Args: { text: string, wpm?: number } → simulates paste → Returns: { success: boolean }

### Step 19: Smart Paste UI Integration
Add a "Paste to App" button on AI response messages:

- In MessageBubble.tsx: Add a new button next to "Copy All" for assistant messages:
  - Icon: ⌨️ or clipboard-paste icon
  - Label: "Paste to App" (shown on hover)
  - Click → calls window.ghostAPI.clipboard.smartPaste(messageText)
  - Shows brief "Pasting..." state, then "Pasted ✓"
  
- In CodeBlock.tsx: Add a "Paste Code" button next to the existing "Copy" button:
  - Pastes just the code block content (without markdown fences)

- Add a keyboard shortcut: Ctrl+Shift+V → smart-paste the last AI response to the focused app
  - Add to DEFAULT_HOTKEYS in constants.ts
  - Register in hotkeys.ts
  - Handle in App.tsx: get last assistant message → smartPaste

### Step 20: Clipboard Monitoring (Optional Feature)
Add opt-in clipboard monitoring that detects when the user copies something:

- In src/main/clipboard-monitor.ts:
  - Uses a polling approach: check clipboard content every 2 seconds
  - Compare current clipboard text with last known text
  - When change detected → send IPC event 'clipboard:changed' to renderer with { text, hasImage }
  - Start/stop monitoring via IPC: `clipboard:start-monitor`, `clipboard:stop-monitor`
  - Controlled by privacy setting "Monitor clipboard changes"

- In renderer: when clipboard change detected, show a subtle toast notification:
  "📋 New clipboard content detected. [Analyze with AI]"
  - Clicking "Analyze with AI" adds the clipboard text as a user message
  - Toast auto-dismisses after 5 seconds
  - Only shows when clipboard monitoring is enabled in Privacy settings

Add to Privacy settings:
- ☐ Monitor clipboard changes (opt-in, default off)

### Step 21: Toast Notification System (src/renderer/components/Toast.tsx)
Create a reusable toast notification component:
- Positioned at top-center of overlay, below header
- Supports types: info (blue), success (green), warning (yellow), error (red)
- Auto-dismiss after configurable timeout (default 3s)
- Slide-down animation on appear, slide-up on dismiss
- Can have action buttons (like "Analyze with AI")
- Queue system: multiple toasts stack vertically
- Used for: clipboard monitoring notifications, smart paste confirmations, export success, error notifications

Create a toast hook: `useToast.ts`:
- `showToast(message, type, options?)` — shows a toast
- `dismissToast(id)` — manually dismiss
- `toasts` state array for rendering

### Sprint 7 Verification Checklist:
- Can copy AI response to clipboard (existing Copy All button) ✅
- "Paste to App" button on AI messages works — pastes text into the app behind overlay ✅
- "Paste Code" button on code blocks pastes just the code ✅
- Ctrl+Shift+V hotkey pastes last AI response ✅
- Smart paste hides overlay, pastes, shows overlay again ✅
- Clipboard monitoring (when enabled): detects copied text, shows toast ✅
- Clicking "Analyze with AI" in clipboard toast adds text to chat ✅
- Toast notifications appear and auto-dismiss correctly ✅
- Privacy setting controls clipboard monitoring on/off ✅

---

## SPRINT 8 (Days 27-30): Audio Transcription + Process Stealth + Polish

### Step 22: Audio Transcription — Web Speech API (src/renderer/services/speech.ts)
Implement real-time speech-to-text using the browser's built-in Web Speech API (SpeechRecognition):

```typescript
class SpeechService {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private transcript: string = '';
  private onTranscript: ((text: string, isFinal: boolean) => void) | null = null;
  private onError: ((error: string) => void) | null = null;

  start(options: { continuous: boolean, language: string }): void
  stop(): void
  isSupported(): boolean
  getTranscript(): string
  clearTranscript(): void
  setCallbacks(onTranscript, onError): void
}
```

Features:
- Uses `webkitSpeechRecognition` (Chromium-based, works in Electron)
- continuous: true for ongoing transcription (meeting mode)
- interimResults: true for real-time partial results
- Language: 'en-US' default, configurable
- Handles errors: no-speech, audio-capture, not-allowed, network
- Auto-restart on end (for continuous mode) with backoff

IMPORTANT: Web Speech API requires an internet connection (sends audio to Google servers for processing). This is a privacy trade-off. Add a note in Privacy settings about this.

ALTERNATIVE (better privacy, offline): OpenAI Whisper API via the OpenAI SDK:
- In src/renderer/services/whisper.ts:
  - Use the MediaRecorder API to capture audio chunks
  - Every 10-15 seconds, send the audio chunk to OpenAI's audio/transcriptions endpoint
  - Requires OpenAI API key (already available if user has one configured)
  - Better accuracy than Web Speech API
  - Works offline if using local Whisper model (future enhancement)

Implement BOTH options, let user choose in settings:
- Web Speech API (free, requires internet, sends to Google)
- Whisper API (costs tokens, better accuracy, uses existing OpenAI key)

### Step 23: Audio Transcription Hook (src/renderer/hooks/useAudioTranscription.ts)
```typescript
interface UseAudioTranscription {
  isListening: boolean;
  transcript: string;
  interimText: string;        // Partial recognition in progress
  error: string | null;
  backend: 'webspeech' | 'whisper';
  startListening(): void;
  stopListening(): void;
  clearTranscript(): void;
  setBackend(backend: 'webspeech' | 'whisper'): void;
}
```

- When listening in Meeting Mode: transcript accumulates and is shown in a collapsible "Live Transcript" section above the input area
- The transcript is automatically included as context in AI requests when in Meeting Mode:
  - Prepend to user messages: "[Meeting transcript so far: ...last 500 words of transcript...]\n\nUser question: ..."
- When stopping: save transcript as part of the conversation metadata

### Step 24: Audio Transcription UI
Add to InputArea.tsx:
- Microphone button (🎙️) next to the screenshot button (📷)
- When NOT listening: gray microphone icon
- When listening: red pulsing microphone icon with recording indicator
- Click to toggle listening on/off

Add TranscriptPanel.tsx (src/renderer/components/TranscriptPanel.tsx):
- Collapsible panel above InputArea (when audio is active)
- Shows live transcript with interim text in lighter color
- "Clear" button to reset transcript
- "Copy" button to copy transcript to clipboard
- Character/word count display
- Auto-scrolls as new text appears
- Max height: 150px, scrollable

Add to Settings → Display tab or new "Audio" section:
- Transcription backend: Web Speech API / Whisper API (dropdown)
- Language: dropdown (en-US, en-GB, hi-IN, etc.)
- Auto-include transcript in AI context (toggle, default: true for Meeting mode only)

### Step 25: Process Stealth Improvements (src/main/stealth.ts)
Enhance the existing stealth module:

- **Window title management**:
  - Set `title: ''` (empty string) on all BrowserWindows
  - Override any Electron auto-title updates with: `win.on('page-title-updated', (e) => e.preventDefault())`

- **Memory optimization**:
  - Force garbage collection after screenshot disposal: `if (global.gc) global.gc()` (requires --expose-gc flag)
  - Track and log memory usage periodically (in dev mode only)
  - Clear AI provider SDK caches when switching models

- **Process description**:
  - In electron-builder.yml, ensure `productName: "SystemHelper"` is set (already done)
  - Add `executableName: "SystemHelper"` to electron-builder.yml
  - Set `app.setName('SystemHelper')` in main process startup

- **Low-profile tray** (optional):
  - NO system tray icon by default (completely invisible)
  - Add setting in Privacy tab: "Show system tray icon" (default: off)
  - When enabled: minimal tray with generic icon, right-click menu: Show/Hide, Quit

### Step 26: UI Polish + Animations
Apply finishing touches across the app:

- **Transition animations**:
  - Settings panel: slide-in 250ms cubic-bezier(0.4, 0, 0.2, 1)
  - ConversationHistory panel: slide-in 250ms from left
  - Custom Mode Editor modal: fade-in + scale from 0.95 to 1.0
  - Toast notifications: slide-down from top
  - Dropdown menus (mode/model): scale-in from top with 150ms

- **Loading states**:
  - Skeleton loaders when loading conversation history
  - Spinner when loading a conversation from disk
  - Subtle pulse animation on the model selector while AI is streaming

- **Hover effects**:
  - All clickable elements: cursor: pointer + subtle background shift
  - Conversation history items: bg lightens on hover
  - Buttons: slight scale(1.02) on hover

- **Empty states**:
  - Conversation history empty: ghost emoji + "No conversations yet"
  - Search no results: "No matches found for '[query]'"

- **Keyboard navigation**:
  - Tab through settings fields
  - Arrow keys navigate dropdowns
  - Escape closes any open panel/modal

### Step 27: Final Testing + CLAUDE.md Update

Test the complete flow end-to-end:
1. Fresh launch → empty chat → type message → response streams → auto-saves
2. Open history → see conversation → click to load → continue chatting
3. Search history → find by content → open result
4. Export conversation → valid markdown file downloads
5. Create custom mode → use it → AI follows custom prompt
6. Change hotkeys → new shortcuts work
7. Adjust display settings → changes apply live
8. Smart paste → text appears in external app
9. Enable audio → speak → transcript appears → AI uses it as context
10. All operations invisible to screenshot tools

Update CLAUDE.md:
- Mark Phase 2 features as complete
- Add new files to the project structure
- Update dependency list
- Document new IPC channels
- Add Phase 3 remaining items

### Sprint 8 Verification Checklist:
- Audio transcription starts/stops with microphone button ✅
- Live transcript shows in collapsible panel ✅
- Meeting mode automatically includes transcript in AI context ✅
- Both Web Speech API and Whisper backends work ✅
- Process name shows as "SystemHelper" everywhere ✅
- No system tray icon by default ✅
- Window has empty title ✅
- All animations smooth (no janky transitions) ✅
- Toast notifications work for all events ✅
- Complete app feels polished and responsive ✅
- CLAUDE.md is updated with Phase 2 info ✅

---

## CRITICAL RULES — CARRY OVER FROM PHASE 1 + NEW

1. **EVERY BrowserWindow MUST call setContentProtection(true)** — overlay, region selector, ANY new window. This is the #1 requirement.

2. **contextIsolation: true and nodeIntegration: false** — ALWAYS. All new IPC channels go through preload contextBridge.

3. **AI calls happen in the RENDERER process** — HTTP requests from renderer. Main process handles system operations only.

4. **Validate ALL IPC arguments in main process handlers** — Type check, range check. Never trust renderer input. This applies to ALL new conversation:* and modes:* and clipboard:* channels.

5. **Encrypt API keys** — Never stored in plain text. Never logged. Never sent anywhere except provider APIs.

6. **TypeScript strict mode** — No `any` without a comment. Explicit return types on exports.

7. **Follow existing file structure** — New files go in the established directories. Don't reorganize.

8. **Backward compatible** — Don't break anything from Phase 1. All existing functionality must continue working.

9. **Debounce auto-save** — Conversation auto-save MUST be debounced (500ms minimum). Never save on every keystroke, only after message add/update completes.

10. **Lazy load expensive modules** — Audio transcription (SpeechRecognition, Whisper), clipboard monitoring, and nut-js should only be loaded when first used.

11. **Privacy first** — Clipboard monitoring is OFF by default. Audio transcription clearly warns about data going to Google/OpenAI. "Persist chat history" is a user choice.

12. **No breaking changes to the preload API** — Only ADD new methods. Don't rename or remove existing ones. Existing global.d.ts types must be extended, not replaced.

---

## NEW DEPENDENCIES TO INSTALL

```bash
# Smart paste (keyboard simulation) — pick ONE:
npm install @nut-tree-fork/nut-js    # More maintained, cross-platform

# No new deps needed for:
# - Conversation persistence (uses fs, already available in main)
# - Web Speech API (built into Chromium)
# - Whisper API (uses existing openai SDK)
# - Custom modes (uses existing electron-store)
```

If @nut-tree-fork/nut-js causes build issues (native module compilation), fall back to the simpler approach: clipboard.writeText() + simulate Ctrl+V via PowerShell/xdotool.

---

## OUTPUT FORMAT

For each sprint, provide:
1. The implementation plan (files to create/modify, in order)
2. Any changes to existing Phase 1 files (be specific about what changes)
3. Key decisions and trade-offs
4. Estimated LOC per new/modified file
5. Any concerns about the specs

Then after I approve the plan, implement each sprint fully before moving to the next.
```

---

## How to Use This Prompt

### Option A: Full Plan Mode
```bash
cd D:\Projects\ghostai
cat docs/claude-code-prompt-phase2.md | claude --plan
```

### Option B: Sprint-by-Sprint
Copy just Sprint 5 section first. After verified, feed Sprint 6, etc.

### Option C: Interactive
Open Claude Code in the project directory and paste the full prompt. Review the plan, then approve implementation sprint by sprint.

### Recommended Approach
Start with the full prompt in plan mode. Review the plan carefully — especially the decisions around smart paste implementation and audio transcription backends. Then implement Sprint 5 first (persistence is the highest-impact feature). Test manually. Proceed to Sprint 6, and so on.

---

## File Change Summary

### New Files (Phase 2):
```
src/main/conversations.ts          — Conversation CRUD + search + export
src/main/clipboard.ts              — Smart paste + clipboard operations
src/main/clipboard-monitor.ts      — Optional clipboard change detection
src/renderer/services/speech.ts    — Web Speech API wrapper
src/renderer/services/whisper.ts   — Whisper API integration
src/renderer/hooks/useConversationHistory.ts  — Conversation list management
src/renderer/hooks/useAudioTranscription.ts   — Audio transcription state
src/renderer/hooks/useToast.ts               — Toast notification state
src/renderer/components/ConversationHistory.tsx — History sidebar panel
src/renderer/components/CustomModeEditor.tsx    — Mode creation modal
src/renderer/components/SettingsHotkeys.tsx     — Hotkeys settings tab
src/renderer/components/SettingsDisplay.tsx     — Display settings tab
src/renderer/components/SettingsPrivacy.tsx     — Privacy settings tab
src/renderer/components/TranscriptPanel.tsx     — Live audio transcript
src/renderer/components/Toast.tsx              — Toast notification component
```

### Modified Files (Phase 2):
```
src/shared/types.ts         — ConversationMeta, CustomMode, AppSettings extensions
src/shared/constants.ts     — Upgraded mode prompts, new DEFAULT_HOTKEYS entry
src/main/ipc-handlers.ts   — New conversation:*, modes:*, clipboard:*, app:* channels
src/main/store.ts           — Custom modes CRUD
src/main/stealth.ts         — Enhanced process stealth
src/main/hotkeys.ts         — New smart-paste hotkey
src/preload/index.ts        — New API surface (conversation, modes, clipboard extensions)
src/renderer/types/global.d.ts  — New type declarations
src/renderer/App.tsx        — ConversationHistory panel, toast system, audio integration
src/renderer/components/HeaderBar.tsx    — History button, New Chat button
src/renderer/components/Settings.tsx     — Real tabs instead of stubs
src/renderer/components/ModeSelector.tsx — Custom modes support
src/renderer/components/MessageBubble.tsx — Smart paste button
src/renderer/components/CodeBlock.tsx     — Paste code button
src/renderer/components/InputArea.tsx     — Microphone button
electron-builder.yml        — executableName addition
CLAUDE.md                   — Phase 2 completion update
```

### Estimated Total: ~3,800 LOC new + ~600 LOC modifications = ~4,400 LOC

---

*This prompt was generated on February 18, 2026 for GhostAI Phase 2 development.*
