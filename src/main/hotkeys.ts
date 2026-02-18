import { globalShortcut, type BrowserWindow } from 'electron';
import { DEFAULT_HOTKEYS } from '@shared/constants';
import type { HotkeyAction } from '@shared/types';
import { toggleOverlay, hideOverlay, showOverlay, getOverlayWindow } from './overlay';
import { getSettings } from './store';

type HotkeyMap = Record<HotkeyAction, string>;

let registeredShortcuts: string[] = [];

/**
 * Register all global hotkeys from settings (or defaults).
 * Returns the list of successfully registered shortcuts.
 */
export function registerAllHotkeys(): string[] {
  // Unregister any existing shortcuts first
  unregisterAllHotkeys();

  const settings = getSettings();
  const hotkeys: HotkeyMap = settings.hotkeys || DEFAULT_HOTKEYS;
  const registered: string[] = [];

  for (const [action, shortcut] of Object.entries(hotkeys)) {
    const hotkeyAction = action as HotkeyAction;

    try {
      const success = globalShortcut.register(shortcut, () => {
        handleHotkeyAction(hotkeyAction);
      });

      if (success) {
        registered.push(shortcut);
      } else {
        console.warn(`Failed to register hotkey: ${shortcut} for ${action}`);
      }
    } catch (error) {
      console.error(`Error registering hotkey ${shortcut}:`, error);
    }
  }

  registeredShortcuts = registered;
  return registered;
}

/**
 * Handle a hotkey action. Some actions are handled directly in main,
 * others are forwarded to the renderer via IPC.
 */
function handleHotkeyAction(action: HotkeyAction): void {
  const win = getOverlayWindow();

  switch (action) {
    case 'toggle-overlay':
      toggleOverlay();
      break;

    case 'hide-overlay':
      hideOverlay();
      break;

    case 'capture-screen':
    case 'capture-region':
      // Ensure overlay is visible before sending event to renderer
      if (win && !win.isDestroyed()) {
        if (!win.isVisible()) {
          showOverlay();
        }
        sendHotkeyEvent(win, action);
      }
      break;

    case 'focus-input':
      if (win && !win.isDestroyed()) {
        if (!win.isVisible()) {
          showOverlay();
        }
        win.focus();
        sendHotkeyEvent(win, action);
      }
      break;

    case 'copy-response':
    case 'new-conversation':
      if (win && !win.isDestroyed()) {
        sendHotkeyEvent(win, action);
      }
      break;
  }
}

/**
 * Send a hotkey event to the renderer process.
 */
function sendHotkeyEvent(win: BrowserWindow, action: HotkeyAction): void {
  if (!win.isDestroyed()) {
    win.webContents.send('hotkeys:triggered', {
      action,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Update a specific hotkey binding.
 * Returns success/error result.
 */
export function updateHotkey(
  action: HotkeyAction,
  shortcut: string
): { success: boolean; error?: string } {
  const settings = getSettings();
  const hotkeys = settings.hotkeys || DEFAULT_HOTKEYS;

  // Check for conflicts
  for (const [existingAction, existingShortcut] of Object.entries(hotkeys)) {
    if (existingAction !== action && existingShortcut === shortcut) {
      return {
        success: false,
        error: `Shortcut already used by: ${existingAction}`,
      };
    }
  }

  // Test if the shortcut can be registered
  const oldShortcut = hotkeys[action];
  if (oldShortcut && globalShortcut.isRegistered(oldShortcut)) {
    globalShortcut.unregister(oldShortcut);
  }

  try {
    const success = globalShortcut.register(shortcut, () => {
      handleHotkeyAction(action);
    });

    if (!success) {
      // Re-register old shortcut
      if (oldShortcut) {
        globalShortcut.register(oldShortcut, () => handleHotkeyAction(action));
      }
      return { success: false, error: 'Failed to register shortcut' };
    }

    return { success: true };
  } catch (error) {
    // Re-register old shortcut
    if (oldShortcut) {
      try {
        globalShortcut.register(oldShortcut, () => handleHotkeyAction(action));
      } catch {
        // Best effort
      }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Unregister all global shortcuts.
 */
export function unregisterAllHotkeys(): void {
  globalShortcut.unregisterAll();
  registeredShortcuts = [];
}

/**
 * Get list of currently registered shortcuts.
 */
export function getRegisteredShortcuts(): string[] {
  return [...registeredShortcuts];
}
