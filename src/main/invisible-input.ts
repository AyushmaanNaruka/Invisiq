import type { BrowserWindow } from 'electron';

/**
 * InvisibleInput — global keyboard capture for stealth mode.
 *
 * Why this exists:
 *   In Stealth Focus mode the overlay HWND has WS_EX_NOACTIVATE (via
 *   setFocusable(false)). That stops monitoring tools from detecting InvisiQ
 *   via foreground-window changes, but it also means the textarea can never
 *   receive WM_KEYDOWN. This module installs a global keyboard hook
 *   (uiohook-napi → libuiohook) and forwards keystrokes to the renderer over
 *   IPC, so the user can "type" into InvisiQ while another app stays foreground.
 *
 * Trade-off (documented in Settings → Privacy):
 *   - uiohook-napi 1.5.5 does NOT support per-event suppression on Windows,
 *     so captured keys also reach the foreground app. The user must click an
 *     inert region of the foreground app (not an input box) before arming,
 *     otherwise their typing will leak into that app's currently-focused input.
 *   - Some AV / proctor tools may flag global keyboard hooks. This module
 *     loads lazily and stays inert until the user explicitly arms it.
 */

let armed = false;
let hookStarted = false;
let overlayRef: BrowserWindow | null = null;

// Lazy reference to uiohook-napi — only required when the user actually arms.
type UiohookModule = typeof import('uiohook-napi');
let uio: UiohookModule | null = null;

function loadUiohook(): UiohookModule | null {
  if (uio) return uio;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    uio = require('uiohook-napi') as UiohookModule;
    return uio;
  } catch (err) {
    console.error('[InvisibleInput] uiohook-napi not available:', err);
    return null;
  }
}

export function initInvisibleInput(overlay: BrowserWindow): void {
  overlayRef = overlay;
}

export function isInvisibleInputArmed(): boolean {
  return armed;
}

export function armInvisibleInput(): { armed: boolean; error?: string } {
  if (armed) return { armed: true };

  const mod = loadUiohook();
  if (!mod) {
    return { armed: false, error: 'uiohook-napi unavailable — run npm install' };
  }

  if (!hookStarted) {
    try {
      mod.uIOhook.on('keydown', onKeyDown);
      mod.uIOhook.start();
      hookStarted = true;
      console.log('[InvisibleInput] Global keyboard hook started');
    } catch (err) {
      console.error('[InvisibleInput] Failed to start hook:', err);
      return { armed: false, error: String(err) };
    }
  }

  armed = true;
  emitStatus();
  console.log('[InvisibleInput] ARMED');
  return { armed: true };
}

export function disarmInvisibleInput(): { armed: boolean } {
  if (!armed) return { armed: false };
  armed = false;
  emitStatus();
  console.log('[InvisibleInput] DISARMED');
  return { armed: false };
}

export function cleanupInvisibleInput(): void {
  if (hookStarted && uio) {
    try {
      uio.uIOhook.stop();
    } catch (err) {
      console.error('[InvisibleInput] stop failed:', err);
    }
    hookStarted = false;
  }
  armed = false;
  overlayRef = null;
}

function emitStatus(): void {
  if (overlayRef && !overlayRef.isDestroyed()) {
    overlayRef.webContents.send('invisible-input:status', { armed });
  }
}

function send(channel: string, payload?: unknown): void {
  if (overlayRef && !overlayRef.isDestroyed()) {
    overlayRef.webContents.send(channel, payload);
  }
}

// ── Keycode → character translation ─────────────────────────────

const ALPHA: Record<number, string> = {
  30: 'a', 48: 'b', 46: 'c', 32: 'd', 18: 'e', 33: 'f', 34: 'g',
  35: 'h', 23: 'i', 36: 'j', 37: 'k', 38: 'l', 50: 'm', 49: 'n',
  24: 'o', 25: 'p', 16: 'q', 19: 'r', 31: 's', 20: 't', 22: 'u',
  47: 'v', 17: 'w', 45: 'x', 21: 'y', 44: 'z',
};

// Unshifted / shifted top-row digits and punctuation
const DIGIT_LOWER: Record<number, string> = {
  2: '1', 3: '2', 4: '3', 5: '4', 6: '5', 7: '6', 8: '7', 9: '8', 10: '9', 11: '0',
};
const DIGIT_UPPER: Record<number, string> = {
  2: '!', 3: '@', 4: '#', 5: '$', 6: '%', 7: '^', 8: '&', 9: '*', 10: '(', 11: ')',
};

const PUNCT_LOWER: Record<number, string> = {
  12: '-', 13: '=', 26: '[', 27: ']', 43: '\\', 39: ';', 40: "'",
  41: '`', 51: ',', 52: '.', 53: '/', 57: ' ',
};
const PUNCT_UPPER: Record<number, string> = {
  12: '_', 13: '+', 26: '{', 27: '}', 43: '|', 39: ':', 40: '"',
  41: '~', 51: '<', 52: '>', 53: '?', 57: ' ',
};

const NUMPAD: Record<number, string> = {
  82: '0', 79: '1', 80: '2', 81: '3', 75: '4', 76: '5', 77: '6',
  71: '7', 72: '8', 73: '9', 55: '*', 78: '+', 74: '-', 83: '.', 3637: '/',
};

function keycodeToChar(keycode: number, shift: boolean): string | null {
  if (ALPHA[keycode]) return shift ? ALPHA[keycode].toUpperCase() : ALPHA[keycode];
  if (shift && DIGIT_UPPER[keycode]) return DIGIT_UPPER[keycode];
  if (!shift && DIGIT_LOWER[keycode]) return DIGIT_LOWER[keycode];
  if (shift && PUNCT_UPPER[keycode]) return PUNCT_UPPER[keycode];
  if (!shift && PUNCT_LOWER[keycode]) return PUNCT_LOWER[keycode];
  if (NUMPAD[keycode]) return NUMPAD[keycode];
  return null;
}

function onKeyDown(e: import('uiohook-napi').UiohookKeyboardEvent): void {
  if (!armed) return;

  // Modifier-only keys: ignore
  if (e.keycode === 29 || e.keycode === 3613) return; // Ctrl
  if (e.keycode === 56 || e.keycode === 3640) return; // Alt
  if (e.keycode === 42 || e.keycode === 54) return; // Shift
  if (e.keycode === 3675 || e.keycode === 3676) return; // Meta/Win

  // If Ctrl or Alt or Meta is held, let the shortcut go through unchanged
  // (e.g. Ctrl+C for copy in another app, our own globalShortcuts, etc.)
  if (e.ctrlKey || e.altKey || e.metaKey) return;

  // Special control keys
  switch (e.keycode) {
    case 28: // Enter
      send('invisible-input:enter');
      return;
    case 1: // Escape — disarm
      disarmInvisibleInput();
      return;
    case 14: // Backspace
      send('invisible-input:backspace');
      return;
    case 15: // Tab — ignore (don't want to insert tab characters)
      return;
    case 57419: case 57416: case 57421: case 57424: // Arrow keys — ignore
      return;
    case 3667: // Delete
      send('invisible-input:delete');
      return;
  }

  const ch = keycodeToChar(e.keycode, e.shiftKey);
  if (ch !== null) {
    send('invisible-input:char', { char: ch });
  }
}
