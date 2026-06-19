# InvisiQ — Wireframes & UI Mockups

> Visual specification for every screen, state, and interaction in the application.

> ⚠️ **HISTORICAL DESIGN SPEC — frozen ~June 3, 2026.** These mockups predate major UI changes and are kept for reference only. The design-system colors/animations still broadly apply, but several screens shown here **no longer exist or have moved**. For current UI, trust **CLAUDE.md** and the actual components in `src/renderer/components/`. Key deltas:
> - **No mode picker, no template library** — the header has a model selector only; `ModeSelector`, `CustomModeEditor`, and `TemplateLibrary` were removed (single universal mode).
> - **Settings is an 8-section icon sidebar** — api-keys, hotkeys, display, privacy, audio, memory, companion, resilience (the old "4 tabs" and the Templates tab are gone).
> - **New beta screens** — `LoginScreen`, `TosGate`, `TrialBanner`, `LockScreen`, `ForcedUpdate` gate the app at startup.
> - **New panels** — `MeetingPanel`, `MemoryPanel`, `CodeDetectionCard`, `InlineRegionSelector`, plus the Model B capture-aware input (glowing border + caret).

---

| Field | Value |
|---|---|
| **Version** | 1.0.0 |
| **Date** | February 18, 2026 |
| **Author** | Ayushmaan Singh Naruka |
| **Related Document** | InvisiQ-PRD.md |

---

## Table of Contents

1. [Design System](#1-design-system)
2. [Main Overlay — Default State](#2-main-overlay--default-state)
3. [Main Overlay — With Conversation](#3-main-overlay--with-conversation)
4. [Screen Capture Flow](#4-screen-capture-flow)
5. [Region Selection Mode](#5-region-selection-mode)
6. [Settings Panel](#6-settings-panel)
7. [Mode Selector](#7-mode-selector)
8. [Model Selector](#8-model-selector)
9. [Error States](#9-error-states)
10. [First-Time Setup / Onboarding](#10-first-time-setup--onboarding)
11. [Interaction State Machine](#11-interaction-state-machine)
12. [Responsive Behavior](#12-responsive-behavior)
13. [Animation Specifications](#13-animation-specifications)
14. [Keyboard Navigation Map](#14-keyboard-navigation-map)
15. [Component Specifications](#15-component-specifications)

---

## 1. Design System

### 1.1 Color Tokens

```
── Dark Theme (Default) ────────────────────────────────────

Background Layers:
  --bg-overlay:        #1a1a2e  (main overlay background)
  --bg-chat:           #16213e  (chat area background)
  --bg-header:         #1e1e36  (header bar)
  --bg-input:          #252547  (input field background)
  --bg-code:           #0d1117  (code block background)
  --bg-hover:          #2a2a4a  (hover state)

Message Bubbles:
  --bubble-user:       #2E75B6  (user messages)
  --bubble-ai:         #2d2d44  (AI responses)
  --bubble-system:     #1a3a2a  (system/info messages)

Text:
  --text-primary:      #E8E8E8  (main text)
  --text-secondary:    #8B8B9E  (muted/label text)
  --text-placeholder:  #5a5a7a  (placeholder text)
  --text-code:         #E6EDF3  (code text)

Accents:
  --accent-primary:    #00B894  (teal — interactive elements)
  --accent-blue:       #2E75B6  (links, user actions)
  --accent-purple:     #6C5CE7  (mode indicator)

Status:
  --status-success:    #00B894  (connected, success)
  --status-warning:    #FDCB6E  (warning)
  --status-error:      #D63031  (error, disconnect)
  --status-streaming:  #74B9FF  (AI generating)

Borders:
  --border-subtle:     #2a2a4a  (subtle dividers)
  --border-focus:      #00B894  (focus ring)
```

### 1.2 Typography

```
Font Family:       'Inter', 'SF Pro Display', system-ui, sans-serif
Font Family Code:  'JetBrains Mono', 'Fira Code', 'Consolas', monospace

Sizes:
  --text-xs:     11px    (status bar, token count)
  --text-sm:     12px    (labels, timestamps)
  --text-base:   13px    (body text, messages)
  --text-md:     14px    (input field, buttons)
  --text-lg:     16px    (section headers in chat)
  --text-xl:     18px    (mode/model selector labels)

Line Heights:
  --leading-tight:   1.3   (compact areas)
  --leading-normal:  1.5   (body text)
  --leading-code:    1.6   (code blocks)
```

### 1.3 Spacing Scale

```
--space-1:    4px
--space-2:    8px
--space-3:    12px
--space-4:    16px
--space-5:    20px
--space-6:    24px
--space-8:    32px
```

### 1.4 Border Radius

```
--radius-sm:    4px    (buttons, inputs)
--radius-md:    8px    (message bubbles, cards)
--radius-lg:    12px   (overlay window corners)
--radius-full:  9999px (pills, badges)
```

### 1.5 Shadows

```
--shadow-overlay:  0 8px 32px rgba(0, 0, 0, 0.5),
                   0 2px 8px rgba(0, 0, 0, 0.3)

--shadow-dropdown: 0 4px 16px rgba(0, 0, 0, 0.4)

--shadow-tooltip:  0 2px 8px rgba(0, 0, 0, 0.3)
```

---

## 2. Main Overlay — Default State

### 2.1 Empty State (No Conversation)

```
╭─────────────────────────────────────────╮
│ ⠿  ▾ General       ▾ Claude Sonnet  ◐ ⚙│  ← Header (32px)
├─────────────────────────────────────────┤
│                                         │
│                                         │
│                                         │
│            ┌───────────────┐            │
│            │    👻         │            │
│            │               │            │
│            │   InvisiQ     │            │
│            │               │            │
│            │  Capture your │            │
│            │  screen or    │            │
│            │  ask a        │            │
│            │  question     │            │
│            └───────────────┘            │
│                                         │
│         ┌─────────────────────┐         │
│         │ Ctrl+Shift+S        │         │
│         │ Capture Screen      │         │
│         └─────────────────────┘         │
│         ┌─────────────────────┐         │
│         │ Ctrl+Shift+R        │         │
│         │ Capture Region      │         │
│         └─────────────────────┘         │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│ 📷 │ Ask anything...             ▶ Send │  ← Input (48px)
├─────────────────────────────────────────┤
│ ● Connected  │  Tokens: 0   │  Ready    │  ← Status (24px)
╰─────────────────────────────────────────╯
```

### 2.2 Header Bar Detail

```
╭─────────────────────────────────────────╮
│ ⠿  ▾ General       ▾ Claude Sonnet  ◐ ⚙│
╰─────────────────────────────────────────╯
 │   │              │               │  │
 │   │              │               │  └── Settings gear icon
 │   │              │               └───── Opacity slider (hover to reveal)
 │   │              └───────────────────── Model selector dropdown
 │   └──────────────────────────────────── Mode selector dropdown
 └──────────────────────────────────────── Drag handle (6-dot grip)

Drag handle:   Click + drag to move the entire overlay
Mode selector: Dropdown with General, Coding, Meeting, Solve
Model selector: Dropdown with all configured models
Opacity:       Circular icon, hover reveals slider (10%-100%)
Settings:      Opens settings panel (slide from right)
```

### 2.3 Input Area Detail

```
┌─────────────────────────────────────────┐
│                                         │
│  ┌───┐ ┌─────────────────────────┐ ┌──┐│
│  │ 📷│ │ Ask anything...         │ │ ▶ ││
│  └───┘ └─────────────────────────┘ └──┘│
│                                         │
└─────────────────────────────────────────┘
  │      │                            │
  │      │                            └── Send button (accent color)
  │      └─────────────────────────────── Text input (auto-expand, max 4 lines)
  └────────────────────────────────────── Screenshot attach button

When screenshot is attached:
┌─────────────────────────────────────────┐
│  ┌─────────┐                            │
│  │ 🖼️ thumb│ ✕                          │  ← Thumbnail preview (40x30)
│  └─────────┘                            │
│  ┌───┐ ┌─────────────────────────┐ ┌──┐│
│  │ 📷│ │ What is this code doing?│ │ ▶ ││
│  └───┘ └─────────────────────────┘ └──┘│
└─────────────────────────────────────────┘
```

---

## 3. Main Overlay — With Conversation

### 3.1 Active Chat

```
╭─────────────────────────────────────────╮
│ ⠿  ▾ Coding       ▾ Claude Sonnet   ◐ ⚙│
├─────────────────────────────────────────┤
│                                         │
│                    ┌────────────────────┐│
│                    │ 🖼️ [screenshot]    ││
│                    │ What's the optimal ││
│                    │ solution for this? ││  ← User message
│                    └────────────────────┘│      (right-aligned, blue)
│                                         │
│  ┌──────────────────────────────────┐   │
│  │ 🤖 This is a classic Two Sum     │   │
│  │ problem. Here's an O(n) solution:│   │
│  │                                  │   │
│  │ ┌─────────────────────────── 📋┐ │   │
│  │ │ python                       │ │   │  ← AI message
│  │ │ def two_sum(nums, target):   │ │   │     (left-aligned, dark)
│  │ │     seen = {}                │ │   │
│  │ │     for i, n in enumerate(   │ │   │
│  │ │         nums):               │ │   │
│  │ │         comp = target - n    │ │   │
│  │ │         if comp in seen:     │ │   │
│  │ │             return [seen[    │ │   │
│  │ │                 comp], i]    │ │   │
│  │ │         seen[n] = i          │ │   │
│  │ │     return []                │ │   │
│  │ └─────────────────────────────┘ │   │
│  │                                  │   │
│  │ **Complexity:**                  │   │
│  │ • Time: O(n)                     │   │
│  │ • Space: O(n)                    │   │
│  │                                  │   │
│  │                      📋 Copy All │   │
│  └──────────────────────────────────┘   │
│                                         │
│                    ┌────────────────────┐│
│                    │ Can you add error  ││  ← Follow-up
│                    │ handling?          ││
│                    └────────────────────┘│
│                                         │
│  ┌──────────────────────────────────┐   │
│  │ 🤖 Sure! Here's the improved    │   │
│  │ version with error handling...   │   │
│  │ █                                │   │  ← Streaming cursor
│  └──────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│ 📷 │ Type follow-up...           ■ Stop │  ← Stop button during streaming
├─────────────────────────────────────────┤
│ ● Streaming │ Tokens: 1,247 │ ■■■░░░   │
╰─────────────────────────────────────────╯
```

### 3.2 Code Block Component

```
┌─────────────────────────────────────────┐
│  python                            📋   │  ← Language tag + Copy button
├─────────────────────────────────────────┤
│                                         │
│  def two_sum(nums: list[int],           │
│              target: int) -> list[int]: │
│      """Find two indices that sum to    │
│      target. O(n) time, O(n) space."""  │
│      seen = {}                          │
│      for i, num in enumerate(nums):     │
│          complement = target - num      │
│          if complement in seen:         │
│              return [seen[complement],  │
│                      i]                 │
│          seen[num] = i                  │
│      return []                          │
│                                         │
└─────────────────────────────────────────┘

Copy button states:
  📋  →  (click)  →  ✅ Copied!  →  (2s)  →  📋

Syntax highlighting colors:
  Keywords (def, return, for, if, in):  #FF79C6 (pink)
  Strings:                               #F1FA8C (yellow)
  Comments:                              #6272A4 (gray-blue)
  Functions:                             #50FA7B (green)
  Numbers:                               #BD93F9 (purple)
  Variables:                             #E6EDF3 (white)
```

### 3.3 Message Bubble Variants

```
── User Message (text only) ──────────────────
                         ┌───────────────────┐
                         │ How do I reverse a │
                         │ linked list?       │
                         └───────────────────┘
                                    12:34 PM ──

── User Message (with screenshot) ────────────
                         ┌───────────────────┐
                         │ ┌───────────────┐ │
                         │ │ 🖼️            │ │  ← Click to zoom
                         │ │  [thumbnail]  │ │
                         │ └───────────────┘ │
                         │ What does this    │
                         │ code do?          │
                         └───────────────────┘

── AI Message (with markdown) ────────────────
┌────────────────────────────────────────────┐
│ 🤖 Here's how to reverse a linked list:    │
│                                            │
│ **Approach 1: Iterative**                  │
│                                            │
│ ┌────────────────────────────────── 📋 ┐   │
│ │ python                               │   │
│ │ def reverse(head):                   │   │
│ │     prev = None                      │   │
│ │     curr = head                      │   │
│ │     while curr:                      │   │
│ │         next_node = curr.next        │   │
│ │         curr.next = prev             │   │
│ │         prev = curr                  │   │
│ │         curr = next_node             │   │
│ │     return prev                      │   │
│ └──────────────────────────────────────┘   │
│                                            │
│ **Time:** O(n) | **Space:** O(1)           │
│                                            │
│                                📋 Copy All │
└────────────────────────────────────────────┘

── System Message ────────────────────────────
         ┌────────────────────────┐
         │ 🔄 New conversation     │
         │    started              │
         └────────────────────────┘

── Error Message ─────────────────────────────
┌────────────────────────────────────────────┐
│ ⚠️ API Error: Rate limit exceeded.         │
│    Please wait a moment and try again.     │
│                             [Retry]        │
└────────────────────────────────────────────┘
```

---

## 4. Screen Capture Flow

### 4.1 Full Screen Capture (`Ctrl+Shift+S`)

```
State 1: User presses Ctrl+Shift+S
┌─────────────────────────────────────────────────────┐
│                                                     │
│   [Assessment/Meeting content visible on screen]    │
│                                                     │
│                                    ╭──── InvisiQ ──╮│
│                                    │ (overlay)     ││
│                                    ╰───────────────╯│
└─────────────────────────────────────────────────────┘

State 2: Overlay hides, screen flashes briefly (50ms border pulse)
┌─────────────────────────────────────────────────────┐
│ ┌───────────────────────────────────────────────┐   │
│ │                                               │   │
│ │   [Assessment/Meeting content]                │   │  ← Green border
│ │                                               │   │     flash (50ms)
│ │                                               │   │
│ └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘

State 3: Capture complete, overlay returns with screenshot attached
╭─────────────────────────────────────────╮
│ ⠿  ▾ Coding       ▾ Claude Sonnet   ◐ ⚙│
├─────────────────────────────────────────┤
│  ...existing chat...                    │
├─────────────────────────────────────────┤
│  ┌─────────┐                            │
│  │ 🖼️ thumb│ ✕  Screen captured         │  ← Auto-attached
│  └─────────┘                            │
│  📷 │ (optional question)        ▶ Send │
├─────────────────────────────────────────┤
│ ● Connected  │  📸 Captured             │
╰─────────────────────────────────────────╯

State 4: Auto-send (if no text added within 500ms) or user types + sends
```

### 4.2 Capture Feedback Animation

```
Timeline:

  0ms        50ms       100ms      200ms      300ms
   │          │          │          │          │
   ▼          ▼          ▼          ▼          ▼
  Hide     Green      Capture    Show      Screenshot
  overlay  border     screen     overlay   in chat
           flash                            input
```

---

## 5. Region Selection Mode

### 5.1 Region Selector Overlay (`Ctrl+Shift+R`)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Full screen becomes semi-transparent dark overlay          │
│  Background: rgba(0, 0, 0, 0.3)                            │
│                                                             │
│         ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐                  │
│         │                                │                  │
│         │    Selected Region             │ ← Dashed border  │
│         │    (clear/bright)              │   while dragging  │
│         │                                │                  │
│         │    Crosshair cursor +          │                  │
│         └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘                  │
│                                                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Drag to select region  •  ESC to cancel            │    │
│  └─────────────────────────────────────────────────────┘    │
│                      ↑ Bottom-center tooltip                │
└─────────────────────────────────────────────────────────────┘

During drag:
  - Selected area is clear (shows original content underneath)
  - Outside selection is dimmed (rgba overlay)
  - Dashed animated border around selection
  - Size indicator: "640 × 480" near bottom-right of selection

After release:
  - Region captured as image
  - Selection overlay disappears
  - InvisiQ overlay reappears with screenshot attached
```

### 5.2 Region Selector — Active Drag

```
┌───────────────────────────────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐░░░░░░░░░░░░│
│░░░░░┊                                   ┊░░░░░░░░░░░░│
│░░░░░┊   def solve(n):                   ┊░░░░░░░░░░░░│
│░░░░░┊       if n <= 1:                  ┊░░░░░░░░░░░░│
│░░░░░┊           return n                ┊░░░░░░░░░░░░│
│░░░░░┊       return solve(n-1)           ┊░░░░░░░░░░░░│
│░░░░░┊              + solve(n-2)         ┊░░░░░░░░░░░░│
│░░░░░┊                          420 × 280┊░░░░░░░░░░░░│
│░░░░░└╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└───────────────────────────────────────────────────────┘
 ░ = dimmed area (dark overlay)
 clear area = selected region (original screen visible)
 ╌ = animated dashed border (marching ants)
```

---

## 6. Settings Panel

### 6.1 Settings — Slide-in Panel

```
╭─────────────────────────────────────────╮
│ ⠿  ▾ General       ▾ Claude Sonnet  ◐ ⚙│
├───────────────────┬─────────────────────┤
│                   │                     │
│  (chat content    │  ⚙ Settings    ✕    │
│   dimmed behind)  │                     │
│                   │  ┌─────────────┐    │
│                   │  │ 🔑 API Keys │    │  ← Tab navigation
│                   │  │ ⌨️  Hotkeys  │    │
│                   │  │ 🎨 Display  │    │
│                   │  │ 🛡️  Privacy  │    │
│                   │  └─────────────┘    │
│                   │                     │
│                   │  ── API Keys ────── │
│                   │                     │
│                   │  OpenAI             │
│                   │  ┌────────────────┐ │
│                   │  │ sk-proj-•••••• │ │  ← Masked input
│                   │  └────────────────┘ │
│                   │  ✅ Valid   [Test]   │
│                   │                     │
│                   │  Anthropic          │
│                   │  ┌────────────────┐ │
│                   │  │ sk-ant-••••••• │ │
│                   │  └────────────────┘ │
│                   │  ✅ Valid   [Test]   │
│                   │                     │
│                   │  Google Gemini      │
│                   │  ┌────────────────┐ │
│                   │  │ Not configured │ │
│                   │  └────────────────┘ │
│                   │  ⚪ Not set  [Test]  │
│                   │                     │
├───────────────────┴─────────────────────┤
│ 📷 │ Ask anything...             ▶ Send │
├─────────────────────────────────────────┤
│ ● Connected  │  Tokens: 0   │  Ready    │
╰─────────────────────────────────────────╯
```

### 6.2 Settings — Hotkeys Tab

```
│  ── Hotkeys ────────────────            │
│                                         │
│  Toggle Overlay                         │
│  ┌─────────────────────────────────┐    │
│  │ Ctrl + Shift + G          [Edit]│    │
│  └─────────────────────────────────┘    │
│                                         │
│  Capture Screen                         │
│  ┌─────────────────────────────────┐    │
│  │ Ctrl + Shift + S          [Edit]│    │
│  └─────────────────────────────────┘    │
│                                         │
│  Capture Region                         │
│  ┌─────────────────────────────────┐    │
│  │ Ctrl + Shift + R          [Edit]│    │
│  └─────────────────────────────────┘    │
│                                         │
│  Copy Last Response                     │
│  ┌─────────────────────────────────┐    │
│  │ Ctrl + Shift + C          [Edit]│    │
│  └─────────────────────────────────┘    │
│                                         │
│  New Conversation                       │
│  ┌─────────────────────────────────┐    │
│  │ Ctrl + Shift + N          [Edit]│    │
│  └─────────────────────────────────┘    │
│                                         │
│  Hide Overlay                           │
│  ┌─────────────────────────────────┐    │
│  │ Escape                    [Edit]│    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Reset to Defaults]                    │

Edit mode (recording):
┌─────────────────────────────────────┐
│ ⌨️  Press new shortcut...     [Cancel]│  ← Pulsing border
└─────────────────────────────────────┘
```

### 6.3 Settings — Display Tab

```
│  ── Display ────────────────            │
│                                         │
│  Theme                                  │
│  ┌──────┐ ┌──────┐                      │
│  │ Dark │ │ Light│                      │  ← Toggle buttons
│  │  ●   │ │  ○   │                      │
│  └──────┘ └──────┘                      │
│                                         │
│  Default Opacity                        │
│  10% ├───────────●──────┤ 100%          │  ← Slider
│                    85%                  │
│                                         │
│  Font Size                              │
│  ┌──┐                                   │
│  │13│ px                ▲ ▼             │  ← Number input
│  └──┘                                   │
│                                         │
│  Default Window Size                    │
│  Width:  ┌─────┐  Height: ┌─────┐      │
│          │ 420 │          │ 600 │      │
│          └─────┘          └─────┘      │
│                                         │
│  Start Position                         │
│  ┌──────────────────┐                   │
│  │ Bottom-right   ▾ │                   │
│  └──────────────────┘                   │
│  Options: Bottom-right, Bottom-left,    │
│           Top-right, Top-left, Center,  │
│           Remember last position        │
│                                         │
│  ☑ Show status bar                      │
│  ☑ Auto-scroll on new messages          │
│  ☐ Always show timestamp on messages    │
```

### 6.4 Settings — Privacy Tab

```
│  ── Privacy ────────────────            │
│                                         │
│  ☑ Encrypt API keys at rest             │
│  ☑ Clear screenshots from memory after  │
│    sending to AI                        │
│  ☐ Persist chat history to disk         │
│  ☐ Log API requests (for debugging)     │
│                                         │
│  Process Name                           │
│  ┌──────────────────────────┐           │
│  │ SystemHelper             │           │  ← Executable name
│  └──────────────────────────┘           │
│  ⓘ The app process will appear with     │
│    this name in Task Manager            │
│                                         │
│  ──────────────────────────             │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  🗑️  Clear All Data              │    │  ← Red destructive button
│  └─────────────────────────────────┘    │
│  Deletes all API keys, chat history,    │
│  and preferences. Cannot be undone.     │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  📁 Open Data Folder             │    │
│  └─────────────────────────────────┘    │
```

---

## 7. Mode Selector

### 7.1 Mode Dropdown

```
Click on mode selector in header:

╭─────────────────────────────────────────╮
│ ⠿  ▾ Coding ▼     ▾ Claude Sonnet   ◐ ⚙│
├──────┤            │────────────────────┤
│      │            │                    │
│      │ ┌──────────┴──────────┐         │
│      │ │  ○  General         │         │
│      │ │  ●  Coding       ✓  │         │  ← Currently selected
│      │ │  ○  Meeting         │         │
│      │ │  ○  Solve           │         │
│      │ ├─────────────────────┤         │
│      │ │  + Custom Mode...   │         │  ← Opens custom editor
│      │ └─────────────────────┘         │
│      │                                 │
```

### 7.2 Mode Indicators

```
Each mode has a color-coded dot and label:

  ⚪ General     — Default, no special prompt
  🟣 Coding      — DSA, algorithms, code solutions
  🔵 Meeting     — Summarization, talking points
  🟡 Solve       — Concise, direct, step-by-step
  🟢 Custom      — User-defined modes
```

### 7.3 Custom Mode Editor

```
╭─────────────────────────────────────────╮
│  Create Custom Mode                  ✕  │
├─────────────────────────────────────────┤
│                                         │
│  Mode Name                              │
│  ┌─────────────────────────────────┐    │
│  │ System Design Interview         │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Color                                  │
│  🔴 🟠 🟡 🟢 🔵 🟣 ⚪ ⚫               │
│                                         │
│  System Prompt                          │
│  ┌─────────────────────────────────┐    │
│  │ You are a system design expert. │    │
│  │ Help me design scalable systems │    │
│  │ with clear architecture         │    │
│  │ diagrams, trade-off analysis,   │    │
│  │ and capacity estimation...      │    │
│  │                                 │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌────────────┐  ┌──────────────────┐   │
│  │   Cancel    │  │   Save Mode  ▶  │   │
│  └────────────┘  └──────────────────┘   │
╰─────────────────────────────────────────╯
```

---

## 8. Model Selector

### 8.1 Model Dropdown (Grouped by Provider)

```
Click on model selector in header:

╭─────────────────────────────────────────╮
│ ⠿  ▾ Coding       ▾ Claude Sonnet ▼ ◐ ⚙│
├────────────────────┤                  │─┤
│                    │                  │  │
│                    │ ┌────────────────┴┐ │
│                    │ │ ANTHROPIC       │ │
│                    │ │ ● Claude Sonnet✓│ │  ← Selected
│                    │ │ ○ Claude Haiku  │ │
│                    │ │                 │ │
│                    │ │ OPENAI          │ │
│                    │ │ ○ GPT-4o       │ │
│                    │ │ ○ GPT-4o-mini  │ │
│                    │ │                 │ │
│                    │ │ GOOGLE          │ │
│                    │ │ ○ Gemini Flash  │ │
│                    │ │ ○ Gemini Pro    │ │
│                    │ │                 │ │
│                    │ │ ⚙ Manage Keys..│ │
│                    │ └────────────────┘ │

Each model entry shows:
┌──────────────────────────────────────┐
│ ● Claude Sonnet 4             🖼️ ✓ │
│   Fast + Vision • ~$3/1M tokens     │
└──────────────────────────────────────┘
  │                      │   │
  │                      │   └── Currently selected
  │                      └────── Vision capable icon
  └───────────────────────────── Speed & cost hint

Models without a valid API key:
┌──────────────────────────────────────┐
│ ○ GPT-4o                    🔒      │  ← Locked icon
│   No API key configured             │
└──────────────────────────────────────┘
```

---

## 9. Error States

### 9.1 No API Key Configured

```
╭─────────────────────────────────────────╮
│ ⠿  ▾ General       ▾ No Model     ◐ ⚙ │
├─────────────────────────────────────────┤
│                                         │
│         ┌──────────────────────┐        │
│         │                      │        │
│         │    🔑                 │        │
│         │                      │        │
│         │   No API Keys        │        │
│         │   Configured         │        │
│         │                      │        │
│         │   Add at least one   │        │
│         │   API key to get     │        │
│         │   started.           │        │
│         │                      │        │
│         │  ┌────────────────┐  │        │
│         │  │  Open Settings │  │        │
│         │  └────────────────┘  │        │
│         └──────────────────────┘        │
│                                         │
├─────────────────────────────────────────┤
│ 📷 │ Ask anything...             ▶ Send │  ← Disabled
├─────────────────────────────────────────┤
│ ⚠ No API key  │  Tokens: 0  │  Setup   │
╰─────────────────────────────────────────╯
```

### 9.2 API Error (Rate Limit, Network, etc.)

```
╭─────────────────────────────────────────╮
│ ⠿  ▾ Coding       ▾ Claude Sonnet   ◐ ⚙│
├─────────────────────────────────────────┤
│  ┌──────────────────────────────────┐   │
│  │ ⚠️ Error: Rate limit exceeded     │   │  ← Red background
│  │                                  │   │     (#D63031 at 15%)
│  │ You've exceeded the API rate     │   │
│  │ limit. Please wait 60 seconds    │   │
│  │ or switch to a different model.  │   │
│  │                                  │   │
│  │ [Switch Model]      [Retry in 45s]│   │
│  └──────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│ 📷 │ Ask anything...             ▶ Send │
├─────────────────────────────────────────┤
│ 🔴 Error │ Tokens: 892  │  Rate limit   │
╰─────────────────────────────────────────╯
```

### 9.3 Network Disconnected

```
┌─────────────────────────────────────────┐
│ 🔴 No internet connection               │  ← Top banner (amber)
│    AI features unavailable    [Dismiss] │
└─────────────────────────────────────────┘
```

### 9.4 Invalid API Key

```
│  OpenAI                                 │
│  ┌────────────────────────────────┐     │
│  │ sk-proj-invalid-key-here       │     │
│  └────────────────────────────────┘     │
│  🔴 Invalid key — authentication failed │  ← Red text
│                            [Test Again] │
```

---

## 10. First-Time Setup / Onboarding

### 10.1 Welcome Screen (First Launch)

```
╭─────────────────────────────────────────╮
│                                         │
│              👻                          │
│                                         │
│         Welcome to InvisiQ              │
│                                         │
│   Your invisible AI assistant.          │
│   Let's get you set up.                 │
│                                         │
│                                         │
│   Step 1 of 3: Add an API Key          │
│   ─────────────────────────             │
│                                         │
│   Choose a provider:                    │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │  🟢 OpenAI (GPT-4o)             │   │
│   └─────────────────────────────────┘   │
│   ┌─────────────────────────────────┐   │
│   │  🟠 Anthropic (Claude)           │   │
│   └─────────────────────────────────┘   │
│   ┌─────────────────────────────────┐   │
│   │  🔵 Google (Gemini)              │   │
│   └─────────────────────────────────┘   │
│                                         │
│                          [Skip for now] │
╰─────────────────────────────────────────╯
```

### 10.2 Onboarding — Step 2: Hotkeys

```
╭─────────────────────────────────────────╮
│                                         │
│   Step 2 of 3: Learn Your Shortcuts     │
│   ─────────────────────────────────     │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │                                 │   │
│   │  Ctrl+Shift+G                   │   │
│   │  Toggle overlay on/off          │   │
│   │                                 │   │
│   │  Ctrl+Shift+S                   │   │
│   │  Capture screen → Ask AI        │   │
│   │                                 │   │
│   │  Ctrl+Shift+R                   │   │
│   │  Capture region → Ask AI        │   │
│   │                                 │   │
│   │  Escape                         │   │
│   │  Hide overlay quickly           │   │
│   │                                 │   │
│   └─────────────────────────────────┘   │
│                                         │
│   You can customize these in Settings.  │
│                                         │
│   ┌──────────┐  ┌───────────────────┐   │
│   │   Back   │  │    Next →         │   │
│   └──────────┘  └───────────────────┘   │
╰─────────────────────────────────────────╯
```

### 10.3 Onboarding — Step 3: Stealth Test

```
╭─────────────────────────────────────────╮
│                                         │
│   Step 3 of 3: Verify Invisibility      │
│   ─────────────────────────────────     │
│                                         │
│   Open Zoom or Snipping Tool and try    │
│   to capture this window.               │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │                                 │   │
│   │  If you can see this text in    │   │
│   │  the capture → something is     │   │
│   │  wrong.                         │   │
│   │                                 │   │
│   │  If the capture shows blank     │   │
│   │  space where this window is     │   │
│   │  → ✅ you're good to go!        │   │
│   │                                 │   │
│   └─────────────────────────────────┘   │
│                                         │
│   ┌──────────┐  ┌───────────────────┐   │
│   │   Back   │  │   Start Using →   │   │
│   └──────────┘  └───────────────────┘   │
╰─────────────────────────────────────────╯
```

---

## 11. Interaction State Machine

```
                          ┌──────────┐
                          │  HIDDEN  │◄──────── Escape / Ctrl+Shift+G
                          └────┬─────┘
                               │
                         Ctrl+Shift+G
                               │
                               ▼
                      ┌────────────────┐
           ┌─────────│     IDLE       │──────────┐
           │         │ (overlay shown) │          │
           │         └───────┬────────┘          │
           │                 │                    │
    Ctrl+Shift+S      Type message         Ctrl+Shift+R
           │                 │                    │
           ▼                 ▼                    ▼
   ┌───────────────┐  ┌───────────┐    ┌──────────────┐
   │  CAPTURING    │  │  TYPING   │    │  REGION      │
   │  SCREEN       │  │           │    │  SELECTING   │
   └───────┬───────┘  └─────┬─────┘    └──────┬───────┘
           │                │                  │
           │           Send / Enter            │
           │                │                  │
           ▼                ▼                  ▼
   ┌───────────────────────────────────────────────┐
   │              AI PROCESSING                     │
   │  (request sent, waiting for response)          │
   └──────────────────────┬────────────────────────┘
                          │
                    First token arrives
                          │
                          ▼
                 ┌──────────────────┐
                 │   AI STREAMING   │
                 │  (tokens flowing)│──── Stop button ────┐
                 └────────┬─────────┘                     │
                          │                               │
                    Stream complete                        │
                          │                               │
                          ▼                               ▼
                 ┌──────────────────┐           ┌───────────────┐
                 │    RESPONSE      │           │   CANCELLED   │
                 │    COMPLETE      │           │               │
                 └────────┬─────────┘           └───────┬───────┘
                          │                             │
                          └──────────┬──────────────────┘
                                     │
                                     ▼
                               Back to IDLE
```

---

## 12. Responsive Behavior

### 12.1 Compact Mode (Width < 350px)

```
╭───────────────────────╮
│ ⠿  ▾ Code  ▾ Sonnet ⚙│  ← Abbreviated labels
├───────────────────────┤
│                       │
│  ┌───────────────┐    │
│  │ 🤖 Use a hash  │    │  ← Narrower bubbles
│  │ map for O(n)  │    │
│  │ lookup...     │    │
│  └───────────────┘    │
│                       │
├───────────────────────┤
│ 📷│ Message...   │ ▶  │  ← Compact input
├───────────────────────┤
│ ● │ 1.2k │ Ready     │  ← Abbreviated status
╰───────────────────────╯
```

### 12.2 Expanded Mode (Width > 600px)

```
╭──────────────────────────────────────────────────────────╮
│ ⠿  ▾ Coding Interview  ▾ Claude Sonnet 4  ◐ 85%  ⚙  ─  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│                             ┌────────────────────────┐   │
│                             │ 🖼️ [screenshot]         │   │
│                             │ Solve this problem      │   │
│                             └────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │ 🤖 This is a dynamic programming problem.         │    │
│  │ Here's the approach with full explanation:        │    │
│  │                                                   │    │
│  │ ┌──────────────────────────────────────────── 📋┐ │    │
│  │ │ python                                        │ │    │
│  │ │ class Solution:                               │ │    │
│  │ │     def maxProfit(self, prices):              │ │    │
│  │ │         # Full solution with comments...      │ │    │
│  │ └──────────────────────────────────────────────┘ │    │
│  │                                                   │    │
│  │                                       📋 Copy All │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ 📷 │ Ask a follow-up question...                  ▶ Send │
├──────────────────────────────────────────────────────────┤
│ ● Connected  │  Tokens: 2,481 / $0.007  │  Streaming... │
╰──────────────────────────────────────────────────────────╯
```

---

## 13. Animation Specifications

| Animation | Duration | Easing | Description |
|---|---|---|---|
| Overlay show | 200ms | `ease-out` | Fade in + scale from 0.95 to 1.0 |
| Overlay hide | 150ms | `ease-in` | Fade out + scale from 1.0 to 0.95 |
| Settings slide-in | 250ms | `ease-out` | Slide from right edge |
| Settings slide-out | 200ms | `ease-in` | Slide to right edge |
| Dropdown open | 150ms | `ease-out` | Fade in + slide down 4px |
| Dropdown close | 100ms | `ease-in` | Fade out |
| Message appear | 200ms | `ease-out` | Fade in + slide up 8px |
| Streaming cursor | 500ms | `steps(2)` | Blinking block cursor `█` |
| Capture flash | 50ms | `linear` | Green border flash on screen capture |
| Copy confirmation | 2000ms | — | "📋" → "✅ Copied!" → fade back to "📋" |
| AI thinking dots | 1200ms | `ease-in-out` | Three dots pulsing in sequence |
| Error banner | 300ms | `ease-out` | Slide down from top |
| Status indicator | 300ms | `ease` | Color fade transition |

### Thinking Animation Detail

```
Frame 1 (0ms):     ●  ○  ○
Frame 2 (400ms):   ○  ●  ○
Frame 3 (800ms):   ○  ○  ●
Frame 4 (1200ms):  ●  ○  ○   (loop)
```

---

## 14. Keyboard Navigation Map

```
Global (works from ANY application):
├── Ctrl+Shift+G ─────── Toggle overlay visibility
├── Ctrl+Shift+S ─────── Capture screen → AI
├── Ctrl+Shift+R ─────── Capture region → AI
├── Ctrl+Shift+C ─────── Copy last AI response
├── Ctrl+Shift+N ─────── New conversation
└── Escape ────────────── Hide overlay

Within Overlay (when overlay is focused):
├── Tab ───────────────── Cycle through interactive elements
├── Enter ─────────────── Send message / Confirm action
├── Shift+Enter ───────── New line in input (don't send)
├── Ctrl+A ────────────── Select all text in input
├── Ctrl+C ────────────── Copy selected text
├── Ctrl+V ────────────── Paste into input
├── Up Arrow ──────────── Scroll chat up
├── Down Arrow ────────── Scroll chat down
├── Ctrl+, ─────────────── Open settings
└── Ctrl+L ────────────── Clear current conversation
```

---

## 15. Component Specifications

### 15.1 Component Hierarchy

```
<App>
├── <OverlayWindow>
│   ├── <HeaderBar>
│   │   ├── <DragHandle />
│   │   ├── <ModeSelector />
│   │   ├── <ModelSelector />
│   │   ├── <OpacityControl />
│   │   └── <SettingsButton />
│   │
│   ├── <ChatPanel>
│   │   ├── <WelcomeScreen />          (shown when no messages)
│   │   ├── <MessageList>
│   │   │   ├── <MessageBubble>        (repeated)
│   │   │   │   ├── <ScreenshotPreview />
│   │   │   │   ├── <MarkdownRenderer />
│   │   │   │   │   └── <CodeBlock />
│   │   │   │   ├── <CopyButton />
│   │   │   │   └── <Timestamp />
│   │   │   └── <StreamingIndicator />
│   │   └── <ScrollAnchor />
│   │
│   ├── <InputArea>
│   │   ├── <ScreenshotAttachment />
│   │   ├── <TextInput />
│   │   └── <SendButton /> | <StopButton />
│   │
│   ├── <StatusBar>
│   │   ├── <ConnectionDot />
│   │   ├── <TokenCounter />
│   │   └── <StatusLabel />
│   │
│   └── <SettingsPanel>               (slide-in overlay)
│       ├── <TabNav />
│       ├── <ApiKeysTab />
│       ├── <HotkeysTab />
│       ├── <DisplayTab />
│       └── <PrivacyTab />
│
├── <RegionSelector />                 (full-screen, temporary)
│   ├── <DimOverlay />
│   ├── <SelectionRectangle />
│   └── <InstructionTooltip />
│
└── <OnboardingFlow />                 (first-launch only)
    ├── <WelcomeStep />
    ├── <ApiKeyStep />
    ├── <HotkeysStep />
    └── <StealthTestStep />
```

### 15.2 Key Component Props

```typescript
// MessageBubble
interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system' | 'error';
  content: string;             // Markdown string
  screenshot?: string;         // base64 image
  timestamp: Date;
  isStreaming?: boolean;
  tokenCount?: { input: number; output: number };
  onCopy: () => void;
  onRetry?: () => void;        // For error messages
}

// CodeBlock
interface CodeBlockProps {
  code: string;
  language: string;
  onCopy: (code: string) => void;
}

// ModelSelector
interface ModelSelectorProps {
  providers: AIProvider[];
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

// ModeSelector
interface ModeSelectorProps {
  modes: Mode[];
  activeMode: string;
  onModeChange: (modeId: string) => void;
  onCreateCustom: () => void;
}

// SettingsPanel
interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}
```

---

*End of Wireframes Document*
