# GhostAI User Tutorial

> A complete guide to installing, configuring, and using GhostAI effectively.

---

## Table of Contents

1. [Installation](#1-installation)
2. [First Launch & Onboarding](#2-first-launch--onboarding)
3. [Setting Up AI Providers](#3-setting-up-ai-providers)
4. [Basic Usage](#4-basic-usage)
5. [Screenshot & Vision](#5-screenshot--vision)
6. [Smart Modes](#6-smart-modes)
7. [Keyboard Shortcuts](#7-keyboard-shortcuts)
8. [Smart Paste & Clipboard](#8-smart-paste--clipboard)
9. [Voice Input & Meeting Mode](#9-voice-input--meeting-mode)
10. [Conversation History & Memory](#10-conversation-history--memory)
11. [Templates](#11-templates)
12. [Settings Reference](#12-settings-reference)
13. [Resilience Mode](#13-resilience-mode)
14. [Troubleshooting](#14-troubleshooting)
15. [FAQ](#15-faq)

---

## 1. Installation

### Option A: From Source (Development)

```bash
# Prerequisites: Node.js 18+, npm 9+, Windows 10 v2004+
git clone https://github.com/Nezeon/GhostAI.git
cd GhostAI
npm install
npm run dev
```

### Option B: Portable Executable (Production)

1. Download the latest `Runtime Broker 1.2.0.exe` from [GitHub Releases](https://github.com/Nezeon/GhostAI/releases)
2. Place it anywhere on your system (Desktop, Documents, etc.)
3. Double-click to run — no installation needed

> **Note:** Windows SmartScreen may show a warning for unsigned executables. Click "More info" → "Run anyway".

### Option C: Build Your Own

```bash
git clone https://github.com/Nezeon/GhostAI.git
cd GhostAI
npm install
npm run package
```

The portable `.exe` will be in the `release/` folder.

---

## 2. First Launch & Onboarding

On first launch, GhostAI shows a **3-step onboarding wizard**:

### Step 1: API Key Setup
- Enter an API key for at least one provider (OpenAI, Anthropic, or Google)
- Or skip if you plan to use Ollama (free, local)
- Keys are validated in real-time and stored with AES-256-GCM encryption

### Step 2: Hotkey Reference
- Overview of all keyboard shortcuts
- Nothing to configure — just familiarize yourself

### Step 3: Stealth Self-Test
- GhostAI shows a test pattern on screen
- Open Windows Snipping Tool and take a screenshot
- If the test pattern does NOT appear in the screenshot → stealth is working
- Click "Test Passed" to finish onboarding

> You can skip the wizard entirely and access all settings later via the gear icon.

---

## 3. Setting Up AI Providers

### Cloud Providers

| Provider | Get API Key | Cost |
|:---------|:------------|:-----|
| **OpenAI** | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | Pay-per-use |
| **Anthropic** | [console.anthropic.com](https://console.anthropic.com/) | Pay-per-use |
| **Google Gemini** | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | Free tier available |

1. Open Settings (`Ctrl+,` or gear icon)
2. Go to **API Keys** tab
3. Paste your key → it's validated automatically
4. Select a model from the header dropdown

### Ollama (Free, Local)

Ollama runs AI models entirely on your machine — no API key, no cost, no internet needed.

1. **Install Ollama:** Download from [ollama.com](https://ollama.com)
2. **Pull a model:**
   ```bash
   # For coding problems + general questions (recommended)
   ollama pull qwen2.5-coder:7b

   # For aptitude, reasoning, math + coding
   ollama pull qwen2.5:7b
   ```
3. Ollama starts automatically on `localhost:11434`
4. In GhostAI, models appear in the dropdown under "Ollama" — select one

#### Recommended Ollama Models by Hardware

| VRAM | Best Model | Size | Strengths |
|:-----|:-----------|:-----|:----------|
| 4 GB | `moondream` | 1.7 GB | Fast, lightweight vision |
| 6 GB | `qwen2.5-coder:7b` | 4.4 GB | Best for coding |
| 6 GB | `qwen2.5:7b` | 4.4 GB | Best all-rounder |
| 8 GB+ | `qwen2.5-coder:14b` | 8 GB | Superior coding |

> **Important:** Don't use models larger than your VRAM. They'll fall back to CPU and run extremely slowly.

#### Ollama + Screenshots

When you send a screenshot to an Ollama model, GhostAI automatically:
1. Uses **Tesseract.js OCR** to extract all text from the image
2. Sends the **extracted text** (not the image) to the model
3. The model processes it as a coding/text problem and gives a proper solution

This is necessary because Ollama vision models tend to *describe* images ("I see a coding window...") instead of *reading the text* in them.

---

## 4. Basic Usage

### Toggle the Overlay
- Press `Ctrl+Shift+G` to show/hide the overlay
- Press `Escape` to hide immediately from anywhere

### Ask a Question
1. Make sure the overlay is visible (`Ctrl+Shift+G`)
2. Click the text input at the bottom (or press `Ctrl+Shift+A`)
3. Type your question
4. Press Enter to send
5. The AI streams its response in real-time

### Switch Models
- Click the model dropdown in the header bar
- Models are grouped by provider
- You can switch mid-conversation — context is preserved

### Adjust Opacity
- Use the opacity slider in the header to make the overlay semi-transparent
- This lets you read content behind the overlay while still seeing AI responses

---

## 5. Screenshot & Vision

### Full Screen Capture
1. Press `Ctrl+Shift+S` from any app
2. GhostAI hides → captures → restores (takes ~200ms)
3. The screenshot appears as a thumbnail in the chat
4. Type your question about it and press Enter

### Region Capture
1. Press `Ctrl+Shift+R`
2. A crosshair selector appears — drag to select an area
3. The selected region is captured and attached to chat

### Inline Snip
1. Click the scissors icon in the input area
2. A selection overlay appears within GhostAI
3. Drag to select — the region is captured from the screen behind

### Tips
- Screenshots are resized to max 1920px width to save tokens
- You can attach up to **3 screenshots** per message
- Click the `×` on a thumbnail to remove it before sending
- Screenshots are cleared from memory after sending (not saved to disk)

---

## 6. Smart Modes

Modes change the AI's system prompt to optimize responses for different tasks.

### Built-in Modes

| Mode | When to Use | What the AI Focuses On |
|:-----|:------------|:----------------------|
| **General** | Everyday questions | Clear, concise, accurate answers |
| **Coding** | Programming problems | Solution → Big-O analysis → edge cases → code |
| **Meeting** | During calls/meetings | Summaries, action items, talking points |
| **Exam** | Tests/assessments | Direct answer first, explanation second |

### Switching Modes
- Click the mode indicator in the header bar
- Select from built-in or custom modes

### Creating Custom Modes
1. Click the mode dropdown → **"Create Custom Mode"**
2. Enter a name, pick a color, and write a system prompt
3. The system prompt tells the AI how to behave
4. Example: "You are a data science expert. Always include Python code examples with pandas and matplotlib."

---

## 7. Keyboard Shortcuts

### Global Hotkeys (Work from ANY application)

| Shortcut | Action |
|:---------|:-------|
| `Ctrl+Shift+G` | Show/hide overlay |
| `Ctrl+Shift+S` | Capture full screen → attach to chat |
| `Ctrl+Shift+R` | Capture region → attach to chat |
| `Ctrl+Shift+A` | Focus the text input |
| `Ctrl+Shift+C` | Copy last AI response |
| `Ctrl+Shift+V` | Paste last AI response into active app |
| `Ctrl+Shift+N` | Start new conversation |
| `Ctrl+T` | Open template library |
| `Escape` | Hide overlay immediately |

### Internal Shortcuts (When overlay has focus)

| Shortcut | Action |
|:---------|:-------|
| `Ctrl+,` | Open/close Settings |
| `Ctrl+L` | Clear conversation (press twice) |
| `Ctrl+K` | Open conversation search |

### Customizing Shortcuts
1. Open Settings → **Hotkeys** tab
2. Click on any shortcut to re-record it
3. Press your desired key combination
4. Conflicts are detected and shown automatically
5. Click "Reset to Default" to restore originals

---

## 8. Smart Paste & Clipboard

### Paste AI Response into Another App

**Method 1: Hotkey**
1. Get an AI response
2. Switch to the target app (e.g., code editor, text field)
3. Press `Ctrl+Shift+V`
4. GhostAI copies the last response → hides → pastes → restores

**Method 2: Button**
1. Hover over an AI response or code block
2. Click the **"Paste to App"** button
3. Same flow: copy → hide → paste → restore

### Clipboard Monitor
- GhostAI monitors your clipboard every 3 seconds
- When it detects a change, a toast notification appears
- Click **"Analyze with AI"** to send clipboard content to the AI

### Copy Code Blocks
- Hover over any code block in a response
- Click **"Copy"** to copy the code to clipboard

---

## 9. Voice Input & Meeting Mode

### Voice Input
1. Click the **microphone icon** in the input area
2. Speak your question
3. The text appears in the input field (via Web Speech API)
4. Press Enter to send

### Speech Engine Options
- **Web Speech API** (default) — Free, browser-native, works offline
- **OpenAI Whisper** — Paid, higher accuracy, requires OpenAI key
- Configure in Settings → **Audio** tab

### Meeting Mode
1. Switch to **Meeting** mode from the header dropdown
2. Enable the transcript panel (click the transcript icon)
3. Start recording — your speech is transcribed in real-time
4. Meeting transcript is automatically injected into AI prompts for context
5. Ask questions like "Summarize what was discussed" and the AI has full context

### Live Meeting Assistant (Advanced)
- Detects questions in conversation using interrogative heuristics
- Auto-suggests AI responses when questions are detected
- Captures system audio (requires audio loopback setup)

---

## 10. Conversation History & Memory

### Conversation History
- Click the **history icon** in the header (or `Ctrl+K`)
- Browse all past conversations with timestamps
- **Search** by keyword across all conversations
- **Delete** individual conversations
- **Export** as JSON, Markdown, TXT, or PDF

### Auto-Save
- Conversations save automatically (debounced 500ms)
- Titles are generated from the first message
- Mode and model are restored when loading a past conversation

### Memory System (RAG)
GhostAI remembers key facts across conversations:

1. **Auto-Extract:** After each conversation, key facts are automatically extracted
2. **Context Injection:** When you ask a question, relevant memories are found via TF-IDF and injected into the prompt
3. **Manual Add:** Open Memory panel → type a fact → click Add
4. **Browse:** Memory panel shows all stored facts with search
5. **Settings:** Configure max facts (500), auto-extract toggle, context injection limit

Configure in Settings → **Memory** tab.

---

## 11. Templates

GhostAI includes 20+ built-in prompt templates across 8 categories.

### Using Templates
1. Press `Ctrl+T` or click the template icon
2. Browse by category: Coding, Writing, Analysis, Meeting, Exam, Research, Debugging, Custom
3. Click a template to use it
4. If the template has `{{variables}}`, a dialog asks you to fill them in
5. The filled template is inserted into the chat input

### Examples
- **"Explain Code"**: Paste code → get explanation with Big-O analysis
- **"Code Review"**: Paste code → get review with improvements
- **"Meeting Summary"**: Paste transcript → get structured summary
- **"Exam Answer"**: Paste question → get direct answer + explanation

### Custom Templates
1. Open Template Library → click **"Create Template"**
2. Enter name, category, and template text
3. Use `{{variable_name}}` for placeholders
4. Save → template appears in your library

---

## 12. Settings Reference

Access via gear icon or `Ctrl+,`. Settings are organized into tabs:

| Tab | What You Configure |
|:----|:-------------------|
| **API Keys** | Provider API keys (validated + encrypted) |
| **Hotkeys** | All keyboard shortcuts (record, detect conflicts) |
| **Display** | Theme (dark/light), opacity, font size, window size, position |
| **Privacy** | Process name, stealth toggles, clear data, open data folder |
| **Audio** | Speech engine, language, auto-transcript, meeting audio |
| **Memory** | Enable/disable, auto-extract, context limit, clear all |
| **Companion** | Start/stop companion server, QR pairing, connected devices |
| **Templates** | Browse, create, edit, delete prompt templates |
| **Resilience** | Start/stop native helper, auto-start, status monitoring |

---

## 13. Resilience Mode

Resilience mode is an **optional advanced feature** that spawns a native C++ helper process.

### What It Does
- Runs `ghostai_helper.exe` alongside GhostAI
- Communicates via Windows named pipes (`\\.\pipe\GhostAI`)
- The helper can inject a Detours DLL that forces `WDA_EXCLUDEFROMCAPTURE` on windows
- Provides an additional layer of stealth beyond Electron's built-in content protection

### Setup
1. Compile `ghostai_helper.cpp` and `ghostai_core.cpp` (requires MSVC + Detours)
2. Place `ghostai_helper.exe` and `ghostai_core.dll` in the `resources/` folder
3. Open Settings → **Resilience** tab
4. Click **Start Agent** → the helper launches and connects
5. Enable **Auto-Start** to launch automatically with GhostAI

### Status Monitoring
- **Green dot:** Agent running, pipe connected
- **Grey dot:** Agent stopped
- **Red dot:** Error (check last error message)
- **Uptime:** How long the agent has been running
- **PID:** The helper process ID
- **Ping:** Send a test command to verify connectivity

> **Note:** GhostAI works fully without resilience mode. This is for advanced users who want additional protection layers.

---

## 14. Troubleshooting

### Overlay is visible in screenshots
- Check that `setContentProtection(true)` is active (stealth watchdog runs every 2s)
- Make sure you're on Windows 10 v2004+ (the API doesn't exist on older versions)
- Some very old screen capture software may use deprecated APIs — use modern tools

### Ollama model describes images instead of reading them
- This is expected behavior — Ollama vision models are weak at OCR
- GhostAI automatically uses Tesseract.js to extract text from screenshots
- If OCR isn't working, check that `tesseract.js` is installed (`npm install tesseract.js`)

### Build fails with `spawn EPERM`
- Your antivirus (especially CrowdStrike) is blocking electron-builder
- Try running the build command as Administrator
- Or add your project folder to antivirus exclusions
- Or use `portable` target instead of `nsis` in `electron-builder.yml`

### App shows wrong name in Task Manager
- Update `package.json` description to "Runtime Broker"
- Verify `electron-builder.yml` has `executableName: RuntimeBroker`
- Rebuild with `npm run package`

### API key validation fails
- Check that you have a valid key with credits/balance
- For Ollama, ensure the server is running (`ollama list` to verify)
- For Google Gemini, use an API key from AI Studio (not Cloud Console)

### Shortcuts not working
- Some shortcuts may conflict with other apps
- Open Settings → Hotkeys and re-record conflicting shortcuts
- Try alternative combinations

### High memory usage
- Lazy loading saves ~4MB at startup, but AI SDKs load on first use
- Clear conversation history if it's very large
- Restart the app to free OCR worker memory

---

## 15. FAQ

**Q: Is GhostAI really invisible to all screen capture?**
A: Yes. It uses Windows' native `WDA_EXCLUDEFROMCAPTURE` flag, which excludes the window from all capture APIs at the DWM (Desktop Window Manager) level. This includes Snipping Tool, OBS, Zoom, Teams, Meet, and proctoring software.

**Q: Does it work on macOS or Linux?**
A: Currently Windows only. macOS support is on the roadmap.

**Q: Is my data sent anywhere?**
A: Your data goes only to the AI provider you choose (OpenAI, Anthropic, Google, or Ollama). There is zero telemetry, zero analytics, and no intermediary servers. With Ollama, everything stays on your machine.

**Q: Are my API keys safe?**
A: Yes. Keys are encrypted with AES-256-GCM using a PBKDF2-derived key tied to your machine's hardware ID. They're never stored in plaintext.

**Q: Can I use it completely offline?**
A: Yes, with Ollama. Pull a model while online, then GhostAI + Ollama work fully offline.

**Q: Why does it disguise as Runtime Broker?**
A: Runtime Broker is a legitimate Windows system process that always runs. Using this name makes GhostAI blend in with normal system processes in Task Manager.

**Q: How much VRAM do I need for Ollama?**
A: 4GB minimum (for `moondream`), 6GB recommended (for `qwen2.5-coder:7b`). Don't use models larger than your VRAM — they'll be very slow.

**Q: Can I use multiple providers at once?**
A: You can have keys for all providers entered simultaneously, but only one model is active per conversation. Switch between them anytime from the header dropdown.

---

*Last updated: March 13, 2026 — Phase 5*
