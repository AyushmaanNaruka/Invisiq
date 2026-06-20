import { app } from 'electron';
import type { BrowserWindow } from 'electron';
import { APP_USER_MODEL_ID, DEFAULT_PROCESS_NAME } from '@shared/constants';

// ── Content-protection desired state (WDA_EXCLUDEFROMCAPTURE) ────────────────
// Canonical desired value for setContentProtection. Normally true. The adaptive
// sweep-evasion (capture-controller) flips this to false ONLY when a sweep-
// capable lockdown proctor is detected AND the user opted into
// stealth.evadeSweepProctor — because GetWindowDisplayAffinity lets any process
// read the affinity flag, so dropping it makes a sweep find nothing. Both the
// watchdog and ensureContentProtection honor this flag so nothing fights the
// degrade by blindly re-applying `true`.
let contentProtectionDesired = true;

/** Set the desired content-protection state and apply it immediately. */
export function setContentProtectionDesired(win: BrowserWindow, enabled: boolean): void {
  contentProtectionDesired = enabled;
  if (!win.isDestroyed()) {
    win.setContentProtection(enabled);
  }
}

/** Current desired content-protection state. */
export function isContentProtectionDesired(): boolean {
  return contentProtectionDesired;
}

/**
 * Verify and re-apply content protection on a BrowserWindow, honoring the
 * current desired state. Every content-protection write MUST route through this
 * (or setContentProtectionDesired) so the adaptive degrade isn't clobbered.
 */
export function ensureContentProtection(win: BrowserWindow): void {
  if (!win.isDestroyed()) {
    win.setContentProtection(contentProtectionDesired);
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

// FROZEN internal data-dir identity. This is NOT the proctoring-visible name —
// that's the .exe image name (electron-builder `executableName`) plus
// process.title below. It only pins the %APPDATA% folder that holds the
// encrypted API keys / login session, so it must never change without an
// explicit data migration. (electron-store is created at import time from
// package.json `name`="runtimebroker", which resolves to the same folder on
// Windows' case-insensitive FS — so this is belt-and-suspenders for any later
// app.getPath('userData') call.) A folder name is invisible to proctoring/EDR.
const DATA_DIR_IDENTITY = 'RuntimeBroker';

/**
 * Set the user-visible process identity (Task Manager) and the Windows
 * AppUserModelId. DE-IMPERSONATED: no Microsoft binary impersonation — the
 * AUMID is our own appId (APP_USER_MODEL_ID) and the visible name is a neutral,
 * honest string (default DEFAULT_PROCESS_NAME). `displayName` comes from
 * settings (privacy.processName).
 *
 * app.setName uses the FROZEN data-dir identity (NOT displayName) so the
 * userData path — and every saved API key under it — stays put.
 */
export function disguiseProcess(displayName: string = DEFAULT_PROCESS_NAME): void {
  try {
    app.setName(DATA_DIR_IDENTITY);
    process.title = displayName;
    app.setAppUserModelId(APP_USER_MODEL_ID);
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

  // Content protection — CRITICAL (honors the adaptive desired state)
  win.setContentProtection(contentProtectionDesired);

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
    win.setContentProtection(contentProtectionDesired);
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
