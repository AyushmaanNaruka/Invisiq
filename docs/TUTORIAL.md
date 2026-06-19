# InvisiQ User Tutorial

> A complete guide to installing, configuring, and using InvisiQ effectively.

> **What's new (June 2026):** InvisiQ is now **cloud-only** (bring your own OpenAI / Anthropic / Google key — the local Ollama option was removed), uses a **single universal mode** (no mode picker, no templates), and the beta requires a **Google sign-in + 14-day trial** with a one-time **Terms & Conditions** acceptance. Global hotkeys now use the **Shift** modifier (e.g. `Ctrl+Shift+G`).

---

## Table of Contents

1. [Installation](#1-installation)
2. [First Launch & Onboarding](#2-first-launch--onboarding)
3. [Setting Up AI Providers](#3-setting-up-ai-providers)
4. [Basic Usage](#4-basic-usage)
5. [Screenshot & Vision](#5-screenshot--vision)
6. [How InvisiQ Answers (Single Universal Mode)](#6-how-invisiq-answers-single-universal-mode)
7. [Keyboard Shortcuts](#7-keyboard-shortcuts)
8. [Smart Paste & Clipboard](#8-smart-paste--clipboard)
9. [Voice Input & Meeting Assistant](#9-voice-input--meeting-assistant)
10. [Conversation History & Memory](#10-conversation-history--memory)
11. [Accounts, Trial & Privacy (Beta)](#11-accounts-trial--privacy-beta)
12. [Settings Reference](#12-settings-reference)
13. [Resilience Mode](#13-resilience-mode)
14. [Troubleshooting](#14-troubleshooting)
15. [FAQ](#15-faq)

---

## 1. Installation

### Option A: From Source (Development)

```bash
# Prerequisites: Node.js 18+, npm 9+, Windows 10 v2004+
git clone https://github.com/Nezeon/InvisiQ.git
cd InvisiQ
npm install
npm run dev
```

### Option B: Portable Executable (Production)

1. Download the latest `Runtime Broker 1.2.0.exe` from [GitHub Releases](https://github.com/Nezeon/InvisiQ/releases)
2. Place it anywhere on your system (Desktop, Documents, etc.)
3. Double-click to run — no installation needed

> **Note:** Windows SmartScreen may show a warning for unsigned executables. Click "More info" → "Run anyway".

### Option C: Build Your Own

```bash
git clone https://github.com/Nezeon/InvisiQ.git
cd InvisiQ
npm install
npm run package
```

The portable `.exe` will be in the `release/` folder.

---

## 2. First Launch & Onboarding

On first launch, InvisiQ asks you to **sign in with Google** and accept the **Terms & Conditions** (which disclose that typed prompts and usage analytics are logged during the beta). After that, your **14-day trial** starts and a **3-step onboarding wizard** appears:

### Step 1: API Key Setup
- Enter an API key for at least one provider (OpenAI, Anthropic, or Google)
- Keys are validated in real-time and stored with AES-256-GCM encryption (entitlement-bound — decryptable only while your trial is active)

### Step 2: Hotkey Reference
- Overview of all keyboard shortcuts
- Nothing to configure — just familiarize yourself

### Step 3: Stealth Self-Test
- InvisiQ shows a test pattern on screen
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
4. Select a model from the header dropdown (or cycle with `Ctrl+Shift+]` / `[`)

> **Cloud-only.** InvisiQ no longer supports local models (Ollama). All three providers are cloud APIs and require your own key (BYOK). Screenshots are sent to the provider's vision model directly.

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
2. InvisiQ hides → captures → restores (takes ~200ms)
3. The screenshot appears as a thumbnail in the chat
4. Type your question about it and press Enter

### Region Capture
1. Press `Ctrl+Shift+R`
2. A crosshair selector appears — drag to select an area
3. The selected region is captured and attached to chat

### Inline Snip
1. Click the scissors icon in the input area
2. A selection overlay appears within InvisiQ
3. Drag to select — the region is captured from the screen behind

### Tips
- Screenshots are resized to max 1920px width to save tokens
- You can attach up to **3 screenshots** per message
- Click the `×` on a thumbnail to remove it before sending
- Screenshots are cleared from memory after sending (not saved to disk)

---

## 6. How InvisiQ Answers (Single Universal Mode)

InvisiQ no longer has a mode picker or templates. There is **one universal, intent-adaptive prompt** — just type or attach a screenshot and send. The model reads what's on screen and in your message and responds in the right shape automatically:

| What you give it | How InvisiQ responds |
|:-----------------|:---------------------|
| A question / MCQ / assessment item | Answer first, then a tight explanation |
| Code or an algorithm problem / error | Approach + Big-O, then the full runnable solution |
| A meeting / call / transcript on screen | 2–3 concise talking points + action items |
| Anything else | A direct, well-structured general answer |

There is nothing to switch — the same input handles every task, like ChatGPT or Claude. (Behavior is defined by a single prompt in the app's source, `UNIVERSAL_SYSTEM_PROMPT`; there's no UI for it.)

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
| `Ctrl+Shift+P` | Toggle click-through (passthrough) |
| `Ctrl+Shift+]` / `[` | Next / previous model |
| `Ctrl+Shift+I` | Toggle stealth typing / capture mode |
| `Ctrl+Shift+Q` | Panic — exit capture, uninstall hook, hide overlay |
| `Escape` | Hide overlay immediately (also exits capture) |

> Global hotkeys use the **Shift** modifier (migrated from Alt). All are customizable in Settings → Hotkeys.

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
4. InvisiQ copies the last response → hides → pastes → restores

**Method 2: Button**
1. Hover over an AI response or code block
2. Click the **"Paste to App"** button
3. Same flow: copy → hide → paste → restore

### Clipboard Monitor
- InvisiQ monitors your clipboard every 3 seconds
- When it detects a change, a toast notification appears
- Click **"Analyze with AI"** to send clipboard content to the AI

### Copy Code Blocks
- Hover over any code block in a response
- Click **"Copy"** to copy the code to clipboard

---

## 9. Voice Input & Meeting Assistant

### Voice Input
1. Click the **microphone icon** in the input area
2. Speak your question
3. The text appears in the input field (via Web Speech API)
4. Press Enter to send

### Speech Engine Options
- **Web Speech API** (default) — Free, browser-native, works offline
- **OpenAI Whisper** — Paid, higher accuracy, requires OpenAI key
- Configure in Settings → **Audio** tab

### Meeting Assistant
There is no separate "meeting mode" — turn it on in **Settings → Audio**:
1. Enable **"Auto-include transcript"** so the live transcript is injected into your prompts for context
2. Enable **system audio capture** to open the Meeting panel automatically
3. Start recording — your speech (and optionally system audio) is transcribed in real-time
4. Ask questions like "Summarize what was discussed" — the universal prompt sees the transcript and responds with talking points/action items

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
- The model is restored when loading a past conversation

### Memory System (RAG)
InvisiQ remembers key facts across conversations:

1. **Auto-Extract:** After each conversation, key facts are automatically extracted
2. **Context Injection:** When you ask a question, relevant memories are found via TF-IDF and injected into the prompt
3. **Manual Add:** Open Memory panel → type a fact → click Add
4. **Browse:** Memory panel shows all stored facts with search
5. **Settings:** Configure max facts (500), auto-extract toggle, context injection limit

Configure in Settings → **Memory** tab.

---

## 11. Accounts, Trial & Privacy (Beta)

> Templates were removed — the single universal mode handles every task, so there's nothing to fill in or pick. Just type and send.

### Sign-in & trial
- The beta requires a **Google sign-in** and runs on a **server-clocked 14-day trial**. The remaining days show in the banner at the top of the overlay.
- The trial is **fail-closed**: if the app can't reach the server to verify your trial (e.g. you're offline), it locks until it can re-verify. Your API keys are tied to the trial and become readable again once it's active.
- When the trial ends, you'll see a lock screen.

### What's collected (and what isn't)
- **Collected:** usage events and the **text you type** as prompts — to improve the product. This is disclosed in the Terms & Conditions you accept on first run, and each prompt is stamped with the T&C version you accepted.
- **Never collected:** your screenshots or any OCR'd text from them; your API keys.
- Server-side, personal data is redacted and beta prompt rows are **purged after 30 days**.
- **Delete your data:** Settings includes a "delete my data" action (`analytics:delete-my-data`) that removes your captured prompt history from the backend.

### Forced updates / kill-switch
- InvisiQ auto-updates from GitHub Releases. If your version is below the minimum supported floor (or a build is remotely disabled), you'll be prompted to update before continuing.

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
| **Resilience** | Start/stop native helper, auto-start, status monitoring |

---

## 13. Resilience Mode

Resilience mode is an **optional advanced feature** that spawns a native C++ helper process.

### What It Does
- Runs `ghostai_helper.exe` alongside InvisiQ
- Communicates via Windows named pipes (`\\.\pipe\InvisiQ`)
- The helper can inject a Detours DLL that forces `WDA_EXCLUDEFROMCAPTURE` on windows
- Provides an additional layer of stealth beyond Electron's built-in content protection

### Setup
1. Compile `ghostai_helper.cpp` and `ghostai_core.cpp` (requires MSVC + Detours)
2. Place `ghostai_helper.exe` and `ghostai_core.dll` in the `resources/` folder
3. Open Settings → **Resilience** tab
4. Click **Start Agent** → the helper launches and connects
5. Enable **Auto-Start** to launch automatically with InvisiQ

### Status Monitoring
- **Green dot:** Agent running, pipe connected
- **Grey dot:** Agent stopped
- **Red dot:** Error (check last error message)
- **Uptime:** How long the agent has been running
- **PID:** The helper process ID
- **Ping:** Send a test command to verify connectivity

> **Note:** InvisiQ works fully without resilience mode. This is for advanced users who want additional protection layers.

---

## 14. Troubleshooting

### Overlay is visible in screenshots
- Check that `setContentProtection(true)` is active (stealth watchdog runs every 2s)
- Make sure you're on Windows 10 v2004+ (the API doesn't exist on older versions)
- Some very old screen capture software may use deprecated APIs — use modern tools

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
- Make sure your trial is active (keys are entitlement-bound and unreadable while locked)
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

**Q: Is InvisiQ really invisible to all screen capture?**
A: Yes. It uses Windows' native `WDA_EXCLUDEFROMCAPTURE` flag, which excludes the window from all capture APIs at the DWM (Desktop Window Manager) level. This includes Snipping Tool, OBS, Zoom, Teams, Meet, and proctoring software.

**Q: Does it work on macOS or Linux?**
A: Currently Windows only. macOS support is on the roadmap.

**Q: Is my data sent anywhere?**
A: Your prompts and screenshots go to the AI provider you choose (OpenAI, Anthropic, or Google) — InvisiQ is cloud-only (BYOK). **During the beta**, InvisiQ also sends usage analytics and the **text you type** to its own backend to improve the product; this is disclosed in the Terms & Conditions you accept on first run. Screenshots and OCR text are never uploaded to that backend, and beta prompt data is purged after 30 days. You can delete your captured prompt data from Settings.

**Q: Are my API keys safe?**
A: Yes. Keys are encrypted with AES-256-GCM. During the beta they're additionally **entitlement-bound** (tied to your machine + your active trial), so they're only decryptable while your trial is valid. They're never stored in plaintext.

**Q: Can I use it completely offline?**
A: No. InvisiQ is cloud-only and the beta also verifies your trial with the server at launch (fail-closed), so an internet connection is required.

**Q: Why does it disguise as Runtime Broker?**
A: Runtime Broker is a legitimate Windows system process that always runs. Using this name makes InvisiQ blend in with normal system processes in Task Manager.

**Q: Do I have to sign in?**
A: Yes — the beta requires a Google sign-in and runs on a 14-day trial. This is Act 1 of the plan; a managed backend (no BYOK) is the future direction.

**Q: Can I use multiple providers at once?**
A: You can have keys for all providers entered simultaneously, but only one model is active per conversation. Switch between them anytime from the header dropdown.

---

*Last updated: March 13, 2026 — Phase 5*
