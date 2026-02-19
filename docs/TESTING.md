# GhostAI Testing Guide

## Stealth Matrix

The core feature of GhostAI is invisibility to screen capture. After ANY change to window management, overlay, or BrowserWindow code, verify against this matrix:

| Tool | Expected Result | Priority |
|------|----------------|----------|
| Windows Snipping Tool | Overlay not visible in screenshot | Critical |
| Windows Game Bar (Win+G) | Overlay not visible in recording | Critical |
| OBS Studio (Display Capture) | Overlay not visible in preview/recording | Critical |
| Zoom Screen Share | Overlay not visible to participants | Critical |
| Google Meet Screen Share | Overlay not visible to participants | High |
| Microsoft Teams Screen Share | Overlay not visible to participants | High |
| Discord Screen Share | Overlay not visible to viewers | High |
| ShareX | Overlay not visible in captures | Medium |
| Proctoring software (generic) | Overlay not visible | Critical |

### How to Verify

1. Launch GhostAI (`npm run dev`)
2. Ensure overlay is visible with content (send a test message)
3. Open each capture tool and attempt to capture the screen area where the overlay is displayed
4. The overlay must NOT appear in any captured output

### Common Failure Modes

- `setContentProtection(true)` missing on a BrowserWindow
- Region selector window created without content protection
- Content protection disabled conditionally (e.g. dev mode bypass)
- New BrowserWindow created without protection in future features

---

## Performance Benchmarks

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Cold start (to first paint) | < 3 seconds | Stopwatch from app launch to overlay visible |
| Idle memory (RSS) | < 150 MB | Task Manager after 60s idle |
| Idle CPU | < 1% | Task Manager after 60s idle |
| Time to first AI response | < 2s (excludes API latency) | From send to first token rendered |
| Screenshot capture cycle | < 500ms | Hide → capture → show → return |

### Measuring Memory

1. Launch app, wait 60 seconds
2. Open Task Manager → Details → find process (default: `SystemHelper.exe`)
3. Check "Memory (private working set)" column
4. Should be < 150 MB at idle

### Measuring CPU

1. Same as above, check CPU column
2. Should be 0-1% at idle (may spike briefly for stealth watchdog)

---

## Functional Checklist

### Phase 1 — Core MVP

- [ ] Overlay toggles with Ctrl+Shift+G
- [ ] Overlay is always on top
- [ ] Overlay is invisible to screen capture (see Stealth Matrix)
- [ ] Full screen capture with Ctrl+Shift+S
- [ ] Region capture with Ctrl+Shift+R
- [ ] Screenshot appears as thumbnail in input area
- [ ] AI responds with streaming text
- [ ] Markdown and code blocks render correctly
- [ ] Copy code button works
- [ ] Escape hides overlay
- [ ] Window is draggable via header grip
- [ ] Window is resizable
- [ ] Opacity slider works

### Phase 2 — Enhanced

- [ ] Conversations save to disk (check `appData/ghostai/conversations/`)
- [ ] Conversation history panel opens (Ctrl+K or clock icon)
- [ ] Search works in conversation history
- [ ] Conversations can be deleted and exported
- [ ] Custom modes: create, edit, delete
- [ ] Hotkey customization: record new shortcut, conflict detection, reset
- [ ] Display settings: font size, window size, position (all persist after restart)
- [ ] Privacy settings: clear data, open data folder, process name
- [ ] Smart paste (Ctrl+Shift+V) pastes last AI response into active app
- [ ] Clipboard monitor shows toast with "Analyze with AI" action
- [ ] Audio transcription: mic button records, transcript panel shows text
- [ ] Meeting mode: transcript auto-included in AI prompts
- [ ] Toast notifications display and auto-dismiss

### Phase 3 — Production

- [ ] Multi-monitor: screenshots capture correct display
- [ ] Multi-monitor: region selector opens at cursor display
- [ ] Onboarding wizard: 3-step flow on first launch
- [ ] Onboarding: API key testing works
- [ ] Onboarding: stealth test step works
- [ ] Ollama provider: local models discovered from /api/tags
- [ ] Ollama provider: chat streaming works
- [ ] Ollama: shows "Free" in model selector
- [ ] Light theme: toggle in Display settings
- [ ] Light theme: all components render correctly (no invisible text, etc.)
- [ ] Cost tracking: tokens and cost show in status bar
- [ ] Cost tracking: hover tooltip shows last/conversation/session breakdown
- [ ] Auto-updater: "Check for Updates" button in Privacy settings
- [ ] Auto-updater: toast shown when update available
- [ ] Responsive layout: compact mode (< 350px) shows abbreviated controls
- [ ] Keyboard shortcuts: Ctrl+, opens settings, Ctrl+L×2 clears conversation
- [ ] System tray: optional toggle, show/hide from tray, quit from tray

---

## Regression Testing Guidelines

1. **Before any PR merge**, run through the Phase 1 checklist at minimum
2. **After modifying window management code**, run full Stealth Matrix
3. **After modifying AI providers**, test at least one streaming conversation per provider
4. **After CSS/theme changes**, check both dark and light themes
5. **After IPC changes**, verify the preload bridge exposes the correct API

---

## Build Verification

Run the build verification script before packaging:

```bash
npm run verify
```

This checks:
- `setContentProtection(true)` exists in overlay.ts
- `contextIsolation: true` exists in overlay.ts
- `nodeIntegration: false` exists in overlay.ts
- `productName` is "SystemHelper" in electron-builder.yml
- No hardcoded development paths in production code
