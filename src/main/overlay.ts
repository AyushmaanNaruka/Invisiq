import { BrowserWindow, screen } from 'electron';
import path from 'path';
import { getWindowState, setWindowState } from './store';
import { ensureContentProtection } from './stealth';
import { validateOverlayPosition, moveOverlayToMonitor as moveToMonitorImpl } from './monitors';

let overlayWindow: BrowserWindow | null = null;
let stealthFocusEnabled = false; // Exam anti-detection mode
let focusReturnTimer: ReturnType<typeof setTimeout> | null = null;
let userOpacity = 0.85; // The user's chosen opacity (separate from stealth visibility)
let stealthVisible = true; // Whether the overlay is "visible" in stealth mode (controlled via opacity)

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

  // CRITICAL — Makes window invisible to screen capture
  overlayWindow.setContentProtection(true);

  // Position: use saved coordinates if valid, otherwise bottom-right of primary display
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
  const posX = windowState.x || screenW - windowState.width - 20;
  const posY = windowState.y || screenH - windowState.height - 20;
  overlayWindow.setPosition(posX, posY);

  // Validate position is on a connected display (handles saved position for disconnected monitor)
  // Deferred to after 'ready-to-show' so initMonitorManager has been called
  overlayWindow.once('show', () => {
    validateOverlayPosition();
  });

  // Set initial opacity
  userOpacity = windowState.opacity;
  overlayWindow.setOpacity(windowState.opacity);

  // Show window only after content is ready to paint
  overlayWindow.once('ready-to-show', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.show();
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

export function showOverlay(): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    if (stealthFocusEnabled) {
      // ANTI-DETECTION: Do NOT use show()/showInactive() — these trigger WM_SHOWWINDOW
      // which proctoring tools hook via SetWinEventHook / EnumWindows.
      // Instead, the window stays "shown" at all times; we toggle visibility via opacity.
      // Opacity changes don't trigger any window events that proctoring can detect.

      // 'screen-saver' is the highest z-order level — sits above fullscreen exam apps
      // This mirrors ChatGPT Mac's "floating panel" strategy on Windows.
      overlayWindow.setAlwaysOnTop(true, 'screen-saver');
      overlayWindow.setSkipTaskbar(true); // Re-enforce after setAlwaysOnTop

      // moveTop() raises the window in z-order WITHOUT triggering focus/foreground events.
      overlayWindow.moveTop();

      stealthVisible = true;
      overlayWindow.setOpacity(userOpacity);
      console.log('[Overlay] showOverlay — stealth: moveTop + opacity restored to', userOpacity);
    } else {
      overlayWindow.setAlwaysOnTop(true);
      overlayWindow.show();
      // Re-enforce skipTaskbar — setAlwaysOnTop / show() can drop WS_EX_TOOLWINDOW
      // and re-add WS_EX_APPWINDOW on Windows, putting the icon back in the taskbar.
      overlayWindow.setSkipTaskbar(true);
      console.log('[Overlay] showOverlay — visible, alwaysOnTop restored');
    }

    ensureContentProtection(overlayWindow);
    overlayWindow.webContents.send('overlay:visibility-changed', { visible: true });
  }
}

export function hideOverlay(): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    if (stealthFocusEnabled) {
      // ANTI-DETECTION: Don't actually hide — set opacity to 0 instead.
      // The window stays in the window stack (no WM_SHOWWINDOW event),
      // but becomes completely transparent / invisible.
      stealthVisible = false;
      overlayWindow.setOpacity(0);
      console.log('[Overlay] hideOverlay — stealth: opacity set to 0 (window still "shown")');
    } else {
      overlayWindow.hide();
      console.log('[Overlay] hideOverlay — hidden');
    }

    overlayWindow.webContents.send('overlay:visibility-changed', { visible: false });
  }
}

export function toggleOverlay(): boolean {
  if (!overlayWindow || overlayWindow.isDestroyed()) return false;

  if (stealthFocusEnabled) {
    // In stealth mode, toggle via opacity (not show/hide)
    if (stealthVisible) {
      hideOverlay();
      return false;
    } else {
      showOverlay();
      return true;
    }
  } else {
    if (overlayWindow.isVisible()) {
      hideOverlay();
      return false;
    } else {
      showOverlay();
      return true;
    }
  }
}

// ── Stealth Focus (Anti-Detection for Exams) ───────────────────

/**
 * Enable/disable stealth focus mode.
 *
 * When enabled:
 * - Window is NEVER hidden/shown (no WM_SHOWWINDOW events)
 * - Visibility is controlled via opacity (0 = hidden, userOpacity = visible)
 * - Window is non-focusable by default (no focus steal = no blur on test window)
 * - Focus is only granted temporarily via requestStealthFocus()
 * - Focus auto-returns after timeout or when message is sent
 *
 * This defeats proctoring tools that monitor:
 * - EnumWindows for new windows appearing
 * - SetWinEventHook for EVENT_SYSTEM_FOREGROUND / EVENT_OBJECT_SHOW
 * - Browser blur/visibilitychange events
 */
export function setStealthFocusMode(enabled: boolean): void {
  stealthFocusEnabled = enabled;

  if (!overlayWindow || overlayWindow.isDestroyed()) return;

  if (enabled) {
    // ANTI-DETECTION: Make the window non-focusable.
    // On Windows, Electron maps setFocusable(false) to WS_EX_NOACTIVATE on the HWND,
    // so clicks on the overlay no longer call SetForegroundWindow / fire
    // EVENT_SYSTEM_FOREGROUND. The exam window stays foreground, defeating
    // foreground-change detection used by Mettl Secure Browser and similar proctors.
    //
    // Trade-off: a non-activating window can't receive WM_KEYDOWN. Free-form typing
    // is handled via the InvisibleInput global keyboard hook (src/main/invisible-input.ts);
    // clicks for buttons / scrolling still work because they don't require focus.
    overlayWindow.setFocusable(false);

    // 'screen-saver' is the highest z-order — sits above fullscreen exam apps and proctoring overlays
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');

    // Re-enforce skipTaskbar — setAlwaysOnTop can reset it
    overlayWindow.setSkipTaskbar(true);

    // If the window is currently hidden, we need to show it (at opacity 0)
    // so that future show/hide only toggles opacity, never actual show/hide
    if (!overlayWindow.isVisible()) {
      overlayWindow.setOpacity(0);
      stealthVisible = false;
      overlayWindow.showInactive(); // One-time show at opacity 0 — invisible
    }

    console.log('[Overlay] Stealth focus ENABLED — non-focusable HWND (WS_EX_NOACTIVATE), opacity-driven visibility');
  } else {
    overlayWindow.setFocusable(true);
    // Re-enforce skipTaskbar — setFocusable(true) can re-add WS_EX_APPWINDOW
    // and bring the icon back to the taskbar. GhostAI is always meant to stay
    // hidden from the taskbar regardless of stealth mode.
    overlayWindow.setSkipTaskbar(true);
    if (focusReturnTimer) {
      clearTimeout(focusReturnTimer);
      focusReturnTimer = null;
    }

    // If it was "hidden" via opacity, actually hide it properly now
    if (!stealthVisible) {
      overlayWindow.setOpacity(0);
      overlayWindow.hide();
    }

    console.log('[Overlay] Stealth focus DISABLED — normal show/hide behavior');
  }

  overlayWindow.webContents.send('overlay:stealth-focus-changed', { enabled });
}

export function isStealthFocusEnabled(): boolean {
  return stealthFocusEnabled;
}

/**
 * Request focus for input.
 *
 * In stealth mode: NEVER calls focus(); the window is non-focusable
 * (WS_EX_NOACTIVATE) so clicks won't activate it either. Free-form typing
 * is delivered via the InvisibleInput global keyboard hook, not by giving
 * the window keyboard focus. We just bring it visually to front.
 *
 * In normal mode: focus the overlay so the user can type into the textarea.
 */
export function requestStealthFocus(_timeoutMs: number = 30000): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;

  if (stealthFocusEnabled) {
    if (!stealthVisible) {
      showOverlay();
    } else {
      overlayWindow.moveTop();
    }
    console.log('[Overlay] Stealth: moveTop only (no focus — InvisibleInput delivers keys)');
    return;
  }

  // Normal mode — focus the window for typing
  overlayWindow.focus();
}

/**
 * Release focus back (no-op in stealth mode since we never take focus).
 */
export function releaseFocus(): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  if (!stealthFocusEnabled) return;
  // No-op — we never took focus, so nothing to release
  console.log('[Overlay] Stealth focus: releaseFocus no-op (never had focus)');
}

export function setOverlayOpacity(opacity: number): void {
  const clamped = Math.max(0.1, Math.min(1.0, opacity));
  userOpacity = clamped; // Always track the user's intended opacity

  if (overlayWindow && !overlayWindow.isDestroyed()) {
    // Only apply if overlay is "visible" (in stealth mode, hidden = opacity 0)
    if (!stealthFocusEnabled || stealthVisible) {
      overlayWindow.setOpacity(clamped);
    }
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

// ── Phase 4: Click-through passthrough ──────────────────────────
export function setPassthrough(enabled: boolean, forward: boolean = true): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setIgnoreMouseEvents(enabled, { forward });
  }
}
