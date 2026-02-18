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
