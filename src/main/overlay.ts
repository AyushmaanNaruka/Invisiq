import { BrowserWindow, screen } from 'electron';
import path from 'path';
import { getWindowState, setWindowState } from './store';
import { ensureContentProtection } from './stealth';
import { validateOverlayPosition, moveOverlayToMonitor as moveToMonitorImpl } from './monitors';

let overlayWindow: BrowserWindow | null = null;
let stealthFocusEnabled = false; // Anti-detection focus mode (WS_EX_NOACTIVATE)
// Fired whenever the overlay transitions to logically-hidden. Enforces the
// invariant "stealth capture never outlives overlay visibility" — registered by
// the capture-controller so a hidden overlay can't keep eating keystrokes. Kept as
// a callback (not a direct import) to avoid a circular dependency: capture-controller
// already imports from this module.
let onHiddenCallback: (() => void) | null = null;
let userOpacity = 0.85;          // The user's chosen opacity (separate from visibility)
let logicalVisible = true;       // Whether the overlay should be visible to the user
let everShown = false;           // Has the HWND been shown at least once (for showInactive)
let userPassthrough = false;     // The user's click-through preference (restored on show)
let readyToShowDone = false;     // Gate the first present to 'ready-to-show' (avoids white flash)

export function createOverlayWindow(): BrowserWindow {
  const windowState = getWindowState();

  overlayWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    focusable: true,
    show: false,
    title: '',
    minWidth: 300,
    minHeight: 200,
    maxWidth: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // CRITICAL — Makes window invisible to screen capture (honors adaptive state)
  ensureContentProtection(overlayWindow);

  // Position: use saved coordinates if valid, otherwise bottom-right of primary display
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
  const posX = windowState.x || screenW - windowState.width - 20;
  const posY = windowState.y || screenH - windowState.height - 20;
  overlayWindow.setPosition(posX, posY);

  // Validate position is on a connected display (handles saved position for disconnected monitor)
  overlayWindow.once('show', () => {
    validateOverlayPosition();
  });

  // Set initial opacity
  userOpacity = windowState.opacity;
  overlayWindow.setOpacity(windowState.opacity);

  // Show window only after content is ready to paint. Route through the unified
  // visibility model so default-on stealth presents correctly on first launch.
  overlayWindow.once('ready-to-show', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      // CRITICAL — re-apply WDA_EXCLUDEFROMCAPTURE both before and after the
      // first show. Windows DWM doesn't always commit the affinity for the first
      // composition cycle if it was only set on a hidden HWND, causing the
      // overlay to flash briefly in screen-share captures until the watchdog
      // re-applies it. Setting it around the first present eliminates that leak.
      ensureContentProtection(overlayWindow);
      readyToShowDone = true;
      logicalVisible = true;
      applyVisibility();
      ensureContentProtection(overlayWindow);
    }
  });

  // Save window state on move/resize
  overlayWindow.on('moved', () => {
    if (!overlayWindow) return;
    const [x, y] = overlayWindow.getPosition();
    setWindowState({ x, y });
  });

  overlayWindow.on('resized', () => {
    if (!overlayWindow) return;
    const [width, height] = overlayWindow.getSize();
    setWindowState({ width, height });
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  return overlayWindow;
}

export function getOverlayWindow(): BrowserWindow | null {
  return overlayWindow;
}

// ── Unified visibility model ────────────────────────────────────────────────
//
// A single function enforces the current logical state on the HWND. In stealth
// mode visibility is opacity-driven (no show()/hide() → no WM_SHOWWINDOW events
// that proctoring tools hook); in normal mode it uses real show()/hide().
function applyVisibility(): void {
  const win = overlayWindow;
  if (!win || win.isDestroyed()) return;
  // Defer the first present to 'ready-to-show' so default-on stealth (set during
  // app startup) doesn't show an unpainted window.
  if (!readyToShowDone) return;

  if (stealthFocusEnabled) {
    // Keep the HWND "shown" in the window stack; toggle visibility via opacity.
    if (!everShown) {
      win.showInactive(); // one-time, never activates (WS_EX_NOACTIVATE)
      everShown = true;
    }
    // 'screen-saver' is the highest z-order — sits above fullscreen apps.
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setSkipTaskbar(true);
    if (logicalVisible) {
      win.setOpacity(userOpacity);
      win.moveTop(); // raise without focus/foreground events
      win.setIgnoreMouseEvents(userPassthrough, { forward: true });
    } else {
      // 0-opacity window must not eat clicks meant for the app underneath.
      win.setOpacity(0);
      win.setIgnoreMouseEvents(true, { forward: true });
    }
  } else {
    if (logicalVisible) {
      ensureContentProtection(win);
      win.setAlwaysOnTop(true);
      if (!win.isVisible()) win.show();
      everShown = true;
      // Re-enforce skipTaskbar — setAlwaysOnTop / show() can re-add WS_EX_APPWINDOW.
      win.setSkipTaskbar(true);
      win.setOpacity(userOpacity);
      win.setIgnoreMouseEvents(userPassthrough, { forward: true });
    } else {
      win.hide();
    }
  }

  ensureContentProtection(win);
}

function notifyVisibility(): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('overlay:visibility-changed', { visible: logicalVisible });
  }
}

export function showOverlay(): void {
  logicalVisible = true;
  applyVisibility();
  notifyVisibility();
}

/**
 * Hide the overlay.
 *
 * `transient` distinguishes a genuine user-intent hide (default) from an internal
 * hide/show cycle (screenshot, smart-paste) that restores visibility immediately.
 * Only a real hide tears down stealth capture — a transient hide must NOT, or
 * taking a screenshot while stealth-typing would silently drop the session.
 */
export function hideOverlay(transient = false): void {
  logicalVisible = false;
  applyVisibility();
  notifyVisibility();
  if (!transient) onHiddenCallback?.(); // stealth capture must not outlive overlay visibility
}

export function toggleOverlay(): boolean {
  if (!overlayWindow || overlayWindow.isDestroyed()) return false;
  logicalVisible = !logicalVisible;
  applyVisibility();
  notifyVisibility();
  // Hiding via toggle must also tear down capture — otherwise the suppressing
  // keyboard hook keeps eating keystrokes into an invisible window (the keys
  // never reach the app the user is now looking at).
  if (!logicalVisible) onHiddenCallback?.();
  return logicalVisible;
}

/**
 * Register a callback fired whenever the overlay transitions to hidden. The
 * capture-controller uses this to guarantee stealth typing can't survive a hidden
 * overlay, regardless of which code path hid it.
 */
export function setOnOverlayHidden(cb: () => void): void {
  onHiddenCallback = cb;
}

/** Logical visibility (NOT win.isVisible() — in stealth the HWND is always "shown"). */
export function isOverlayVisible(): boolean {
  return logicalVisible;
}

// ── Stealth Focus (Anti-Detection for Monitored Apps) ───────────────────────

/**
 * Enable/disable stealth focus mode.
 *
 * When enabled the overlay HWND gets WS_EX_NOACTIVATE (via setFocusable(false))
 * so clicking it never calls SetForegroundWindow / fires EVENT_SYSTEM_FOREGROUND
 * — defeating the foreground-window monitoring used by proctoring tools. The
 * trade-off (a non-activating window can't receive WM_KEYDOWN) is handled by the
 * capture-controller + helper hook, not by giving the window focus.
 */
export function setStealthFocusMode(enabled: boolean): void {
  stealthFocusEnabled = enabled;
  if (!overlayWindow || overlayWindow.isDestroyed()) return;

  if (enabled) {
    // WS_EX_NOACTIVATE — clicks no longer activate the overlay.
    overlayWindow.setFocusable(false);
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    overlayWindow.setSkipTaskbar(true);
  } else {
    overlayWindow.setFocusable(true);
    overlayWindow.setSkipTaskbar(true); // setFocusable(true) can re-add WS_EX_APPWINDOW
  }

  applyVisibility();
  overlayWindow.webContents.send('overlay:stealth-focus-changed', { enabled });
}

export function isStealthFocusEnabled(): boolean {
  return stealthFocusEnabled;
}

/**
 * Bring the overlay forward for input.
 *
 * In stealth mode: NEVER calls focus() — the window is WS_EX_NOACTIVATE so clicks
 * won't activate it either. Typing is delivered via the capture-controller. We
 * only bring it visually to front.
 * In normal mode: focus the overlay so the user can type into the textarea.
 */
export function requestStealthFocus(_timeoutMs: number = 30000): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;

  if (stealthFocusEnabled) {
    if (!logicalVisible) {
      showOverlay();
    } else {
      overlayWindow.moveTop();
    }
    return;
  }
  overlayWindow.focus();
}

/** Release focus back (no-op in stealth mode since we never take focus). */
export function releaseFocus(): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  if (!stealthFocusEnabled) return;
  // No-op — we never took focus, so nothing to release.
}

export function setOverlayOpacity(opacity: number): void {
  const clamped = Math.max(0.1, Math.min(1.0, opacity));
  userOpacity = clamped; // Always track the user's intended opacity
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    applyVisibility(); // re-applies userOpacity only when logically visible
    setWindowState({ opacity: clamped });
  }
}

export function getOverlayBounds(): { x: number; y: number; width: number; height: number } {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    return { x: 0, y: 0, width: 420, height: 600 };
  }
  return overlayWindow.getBounds();
}

export function setOverlayPosition(x: number, y: number): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setPosition(Math.round(x), Math.round(y));
  }
}

export function setOverlaySize(width: number, height: number): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    const w = Math.max(300, Math.min(800, Math.round(width)));
    const h = Math.max(200, Math.round(height));
    overlayWindow.setSize(w, h);
  }
}

export function moveToMonitor(monitorId: string): boolean {
  return moveToMonitorImpl(monitorId);
}

// ── Click-through passthrough ───────────────────────────────────────────────
export function setPassthrough(enabled: boolean, forward: boolean = true): void {
  userPassthrough = enabled; // remember the user's preference
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    // When hidden in stealth, applyVisibility forces ignore=true regardless.
    if (logicalVisible) {
      overlayWindow.setIgnoreMouseEvents(enabled, { forward });
    }
  }
}
