import { app } from 'electron';
import type { BrowserWindow } from 'electron';

/**
 * Verify and re-apply content protection on a BrowserWindow.
 * Every window we create MUST have this enabled.
 */
export function ensureContentProtection(win: BrowserWindow): void {
  if (!win.isDestroyed()) {
    win.setContentProtection(true);
  }
}

/**
 * Ensure a window is hidden from the taskbar.
 */
export function hideFromTaskbar(win: BrowserWindow): void {
  if (!win.isDestroyed()) {
    win.setSkipTaskbar(true);
  }
}

/**
 * Disguise the process name and identity in Task Manager.
 * Uses the processName from settings if available.
 */
export function disguiseProcess(name: string = 'RuntimeBroker'): void {
  try {
    app.setName(name);
    process.title = name;
    app.setAppUserModelId('Microsoft.Windows.RuntimeBroker');
  } catch {
    // Best effort — some platforms may not support this
  }
}

/**
 * Hide the overlay from Alt+Tab (defense in depth).
 */
export function hideFromAltTab(win: BrowserWindow): void {
  if (!win.isDestroyed()) {
    win.setSkipTaskbar(true);
  }
}

/**
 * Apply full stealth measures to a window:
 * - Content protection (invisible to screen capture)
 * - Skip taskbar (not visible in taskbar)
 * - Prevent page title updates (no window title leaks)
 */
export function applyFullStealth(win: BrowserWindow): void {
  if (win.isDestroyed()) return;

  // Content protection — CRITICAL
  win.setContentProtection(true);

  // Taskbar hiding
  win.setSkipTaskbar(true);

  // Prevent title from being updated
  win.on('page-title-updated', (e) => {
    e.preventDefault();
  });
}

/**
 * Periodically re-apply content protection in case it was
 * dropped (e.g., after window state change).
 *
 * Runs a 200ms tight burst for the first 10 seconds — this defends the
 * first-show race where DWM can briefly composite the overlay into screen-
 * share captures before honoring WDA_EXCLUDEFROMCAPTURE. After the burst,
 * backs off to the steady-state interval (default 2s).
 */
let watchdogInterval: ReturnType<typeof setInterval> | null = null;

export function startStealthWatchdog(win: BrowserWindow, intervalMs: number = 2000): void {
  stopStealthWatchdog();

  const tick = (): void => {
    if (win.isDestroyed()) {
      stopStealthWatchdog();
      return;
    }
    win.setContentProtection(true);
    // Re-enforce skipTaskbar — Windows can re-add WS_EX_APPWINDOW after
    // setAlwaysOnTop / setFocusable / monitor changes, putting the icon
    // back in the taskbar even though we set skipTaskbar at creation.
    win.setSkipTaskbar(true);
  };

  const tightMs = 200;
  const burstDurationMs = 10000;
  let elapsed = 0;

  watchdogInterval = setInterval(() => {
    tick();
    elapsed += tightMs;
    if (elapsed >= burstDurationMs) {
      stopStealthWatchdog();
      watchdogInterval = setInterval(tick, intervalMs);
    }
  }, tightMs);
}

export function stopStealthWatchdog(): void {
  if (watchdogInterval) {
    clearInterval(watchdogInterval);
    watchdogInterval = null;
  }
}
