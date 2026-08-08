# InvisiQ — User Guide

**Your AI copilot that sees everything, but is seen by no one.**

InvisiQ is an invisible desktop overlay that puts an AI assistant on top of whatever you're doing — and stays completely hidden from screen sharing, recording, and capture tools. Ask a question, drop in a screenshot, and get an instant answer without anyone on a call or a recording ever seeing it.

This guide walks you through everything you need to use InvisiQ day to day.

---

## Contents

1. [Getting Started](#1-getting-started)
2. [Connecting an AI Provider](#2-connecting-an-ai-provider)
3. [Asking Your First Question](#3-asking-your-first-question)
4. [Working with Screenshots](#4-working-with-screenshots)
5. [How InvisiQ Answers](#5-how-invisiq-answers)
6. [Keyboard Shortcuts](#6-keyboard-shortcuts)
7. [Stealth Typing](#7-stealth-typing)
8. [Copy & Paste Anywhere](#8-copy--paste-anywhere)
9. [Voice & Meetings](#9-voice--meetings)
10. [History & Memory](#10-history--memory)
11. [Privacy](#11-privacy)
12. [Settings](#12-settings)
13. [Troubleshooting](#13-troubleshooting)
14. [FAQ](#14-faq)

---

## 1. Getting Started

### Install & launch

1. Download the latest InvisiQ release and run it — no installer wizardry, no admin rights needed.
2. On first launch, InvisiQ opens straight to onboarding — **no account, sign-in, or trial required**.

### First-run setup (3 quick steps)

| Step | What happens |
|:-----|:-------------|
| **1. Add an API key** | Paste a key from OpenAI, Anthropic, Google, Groq, or OpenRouter — or point InvisiQ at a local **Ollama** server (no key needed). It's validated instantly and encrypted on your machine. |
| **2. Learn the hotkeys** | A quick reference of the shortcuts you'll use most. Nothing to configure. |
| **3. Stealth self-test** | InvisiQ shows a test pattern, you take a screenshot, and confirm it's invisible. |

You can skip the wizard and reach everything later from the **gear icon** (Settings).

> **Press `Ctrl+Shift+G` any time to show or hide the overlay.** That's the one shortcut to remember on day one.

---

## 2. Connecting an AI Provider

InvisiQ is **bring-your-own-key (BYOK)** — you connect your own account with one of the major AI providers, and your usage is billed directly by them.

| Provider | Where to get a key | Cost |
|:---------|:-------------------|:-----|
| **OpenAI** | platform.openai.com/api-keys | Pay-per-use |
| **Anthropic (Claude)** | console.anthropic.com | Pay-per-use |
| **Google Gemini** | aistudio.google.com/apikey | Free tier available |
| **Groq** | console.groq.com/keys | Free tier available |
| **OpenRouter** | openrouter.ai/keys | Pay-per-use (one key routes to many models) |

**To add or change a key:**
1. Open **Settings** (`Ctrl+,` or the gear icon)
2. Go to the **API Keys** tab
3. Paste your key — it validates automatically
4. Pick a model from the dropdown in the header bar (or cycle with `Ctrl+Shift+]` / `Ctrl+Shift+[`)

You can store keys for all of them at once and switch models anytime. Your keys are encrypted and never leave your device except to call the provider you chose.

### Local provider — Ollama (no key needed)

InvisiQ can also talk directly to a local **Ollama** server — no API key, nothing leaves your machine:
1. Install Ollama and pull a model (e.g. `ollama pull llama3.2`)
2. Make sure the Ollama server is running
3. In **Settings → API Keys**, Ollama's field is a **server URL**, not a key — it defaults to `http://localhost:11434`
4. Once InvisiQ detects the server, its models appear in a separate **LOCAL** group in the model dropdown

> **New to AI keys?** Google Gemini and Groq both have free tiers and are the easiest places to start. Prefer nothing to leave your machine at all? Use Ollama.

---

## 3. Asking Your First Question

1. Make sure the overlay is visible (`Ctrl+Shift+G`).
2. Click the text box at the bottom (or press `Ctrl+Shift+A`).
3. Type your question and press **Enter**.
4. The answer streams in live.

**A few things you can do mid-conversation:**
- **Switch models** from the header dropdown — your conversation context carries over.
- **Adjust opacity** with the header slider so you can read what's behind the overlay.
- **Start fresh** with `Ctrl+Shift+N` for a new conversation.

---

## 4. Working with Screenshots

InvisiQ can *see* your screen. Capture something, ask about it, get an answer.

### Full screen
Press `Ctrl+Shift+S` from any app. InvisiQ briefly hides itself, captures the screen, and attaches it to the chat. Type your question and send.

### A specific region
Press `Ctrl+Shift+R`, then drag a box around the area you want. Only that region is captured.

### Inline snip
Click the **scissors icon** in the input area and drag to select — handy when InvisiQ is already open.

**Good to know:**
- Attach up to **3 screenshots** per message.
- Images are auto-resized to keep them fast and economical.
- Screenshots are **never saved to disk** — they're cleared from memory after you send.
- Click the **×** on a thumbnail to remove it before sending.

---

## 5. How InvisiQ Answers

There are **no modes to pick and no templates to fill in**. Just type (and optionally attach a screenshot) — InvisiQ reads the situation and answers in the right shape automatically:

| What you give it | How InvisiQ responds |
|:-----------------|:---------------------|
| A question, quiz, or multiple-choice item | The answer first, then a tight explanation |
| Code, an algorithm problem, or an error | The approach + complexity, then a full runnable solution |
| A meeting or call on screen | A few concise talking points and action items |
| Anything else | A direct, well-structured answer |

It works like ChatGPT or Claude — one box, every task.

---

## 6. Keyboard Shortcuts

### Global (work from *any* app)

| Shortcut | Action |
|:---------|:-------|
| `Ctrl+Shift+G` | Show / hide overlay |
| `Ctrl+Shift+S` | Capture full screen → attach to chat |
| `Ctrl+Shift+R` | Capture a region → attach to chat |
| `Ctrl+Shift+A` | Jump to the text box |
| `Ctrl+Shift+C` | Copy the last AI response |
| `Ctrl+Shift+V` | Paste the last AI response into the active app |
| `Ctrl+Shift+N` | New conversation |
| `Ctrl+Shift+P` | Toggle click-through (let clicks pass through the overlay) |
| `Ctrl+Shift+]` / `Ctrl+Shift+[` | Next / previous model |
| `Ctrl+Shift+I` | Toggle stealth typing |
| `Ctrl+Shift+Q` | **Panic** — instantly stop typing capture and hide the overlay |
| `Escape` | Hide the overlay immediately |

### When the overlay is focused

| Shortcut | Action |
|:---------|:-------|
| `Ctrl+,` | Open / close Settings |
| `Ctrl+K` | Search your conversations |
| `Ctrl+L` | Clear the current chat (press twice) |

> Every global shortcut is customizable in **Settings → Hotkeys**. Click a shortcut, press your new combination, and InvisiQ flags any conflicts for you.

---

## 7. Stealth Typing

Because InvisiQ stays hidden from screen monitoring, it doesn't grab keyboard focus the way a normal window does. To type into it discreetly:

1. Press `Ctrl+Shift+I` (or click the input box).
2. A glowing border and caret confirm capture is live — start typing.
3. Press `Ctrl+Shift+I` again, or `Escape`, to stop.

If anything ever feels off, **`Ctrl+Shift+Q` is your panic button** — it stops capture and hides the overlay instantly.

---

## 8. Copy & Paste Anywhere

**Send an answer straight into another app:**
- Press `Ctrl+Shift+V` while that app is active — InvisiQ pastes the last response for you, then disappears again.
- Or hover any response or code block and click **Paste to App**.

**Other clipboard helpers:**
- Hover a code block and click **Copy** to grab just the code.
- InvisiQ watches your clipboard and offers an **"Analyze with AI"** action when it notices new content you might want to ask about.

---

## 9. Voice & Meetings

### Voice input
Click the **microphone icon**, speak, and your words appear in the text box. Press Enter to send. You can use the free built-in speech engine or switch to OpenAI Whisper (more accurate, uses your OpenAI key) in **Settings → Audio**.

### Meeting help
InvisiQ can follow a live meeting and give you something to say:
1. In **Settings → Audio**, turn on **Auto-include transcript** so what's being said becomes context for your questions.
2. Optionally enable **system audio capture** to follow the other side of the call.
3. Ask things like *"Summarize what was just discussed"* or *"What's a good response to that?"* — InvisiQ answers with concise talking points.

---

## 10. History & Memory

### Conversation history
- Open it from the **history icon** or `Ctrl+K`.
- Search across everything by keyword.
- Export any conversation as **JSON, Markdown, TXT, or PDF**.
- Conversations auto-save and auto-title — nothing to manage.

### Memory
InvisiQ can remember useful facts across conversations so you don't repeat yourself. It pulls in relevant memories automatically when they help. You can add, browse, search, or clear them anytime in **Settings → Memory**.

---

## 11. Privacy

InvisiQ is fully open-source and runs entirely on your machine — there's no account, no sign-in, and no backend collecting your data.

- **No telemetry.** InvisiQ doesn't send usage events, prompts, or screenshots anywhere except the AI provider/model you choose — and nowhere at all if you use a local Ollama server.
- **Your API keys** are encrypted with AES-256 on your machine. They're never stored in plain text and only ever sent to the provider you chose.
- **Screenshots** are never saved to disk — they're cleared from memory after you send them.

---

## 12. Settings

Open with the gear icon or `Ctrl+,`.

| Tab | What you can do |
|:----|:----------------|
| **API Keys** | Add and validate provider keys |
| **Hotkeys** | Customize every shortcut |
| **Display** | Theme, opacity, font size, window size and position |
| **Privacy** | Stealth options, process name, clear data, open data folder |
| **Audio** | Speech engine, language, meeting transcript |
| **Memory** | Turn memory on/off, auto-capture, clear |
| **Companion** | Pair a phone via QR code |
| **Resilience** | Manage the background helper that powers stealth typing — start/stop it and check its status |

---

## 13. Troubleshooting

**The overlay shows up in a screenshot or screen share.**
Make sure you're on Windows 10 (version 2004 or newer) — stealth relies on a capture-exclusion feature that older versions don't have. If it persists, restart InvisiQ.

**A shortcut isn't working.**
Another app may be using the same combination. Go to **Settings → Hotkeys** and re-record it — conflicts are flagged automatically.

**My API key won't validate.**
Confirm the key is correct and your provider account has credits. For Google Gemini, use a key from **AI Studio**, not Google Cloud Console. For Ollama, make sure the server is running and the URL in Settings → API Keys matches it (default `http://localhost:11434`).

**Typing isn't going into InvisiQ.**
Press `Ctrl+Shift+I` (or click the input box) to start stealth typing. Look for the glowing border that confirms it's live.

**The app feels sluggish or memory-heavy after a long session.**
Clear an oversized conversation history, or restart the app to free up resources.

---

## 14. FAQ

**Is InvisiQ really invisible to screen capture?**
Yes — on Windows it uses the OS-level capture-exclusion feature, so it's hidden from Snipping Tool, OBS, Zoom, Teams, Meet, and proctoring tools alike.

**Does it work on Mac or Linux?**
Windows only for now. Other platforms are on the roadmap.

**Where do my prompts and screenshots go?**
To the AI provider/model you choose (OpenAI, Anthropic, Google, Groq, or OpenRouter) — or nowhere at all if you run a local Ollama server. InvisiQ has no backend of its own: there's no account, no analytics, and nothing typed or captured is ever sent to InvisiQ's developer.

**Are my API keys safe?**
Yes. They're encrypted on your device with AES-256 and never stored in plain text.

**Can I use it offline?**
Cloud providers (OpenAI, Anthropic, Google, Groq, OpenRouter) need an internet connection. If you run a local Ollama server, you can use InvisiQ fully offline with local models.

**Do I have to sign in?**
No — there's no account, sign-in, or trial. Add an API key (or point InvisiQ at your local Ollama server) and start using it immediately.

**Can I use more than one provider?**
You can store keys for all of them and switch models anytime, but one model is active per conversation.

---

*Need a hand? Open an issue on the project's GitHub repository.*
