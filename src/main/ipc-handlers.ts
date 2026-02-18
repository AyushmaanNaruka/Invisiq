import { ipcMain, app, clipboard } from 'electron';
import {
  toggleOverlay,
  hideOverlay,
  showOverlay,
  setOverlayOpacity,
  setOverlayPosition,
  setOverlaySize,
  getOverlayBounds,
} from './overlay';
import {
  getSettings,
  getNestedSetting,
  setNestedSetting,
  getApiKey,
  setApiKey,
  removeApiKey,
  clearAll,
} from './store';
import {
  registerAllHotkeys,
  updateHotkey,
} from './hotkeys';
import { captureFullScreen, getAvailableMonitors } from './screenshot';
import { openRegionSelector } from './region-selector';
import type { HotkeyAction, ProviderID } from '@shared/types';

const VALID_PROVIDERS: ProviderID[] = ['openai', 'anthropic', 'gemini'];

export function registerIPCHandlers(): void {
  // ══════════════════════════════════════
  //  OVERLAY MANAGEMENT
  // ══════════════════════════════════════

  ipcMain.handle('overlay:toggle', () => {
    const visible = toggleOverlay();
    return { visible };
  });

  ipcMain.handle('overlay:hide', () => {
    hideOverlay();
  });

  ipcMain.handle('overlay:show', () => {
    showOverlay();
  });

  ipcMain.handle('overlay:set-opacity', (_event, args: unknown) => {
    if (!args || typeof args !== 'object') throw new Error('Invalid args');
    const { opacity } = args as { opacity: number };
    if (typeof opacity !== 'number' || opacity < 0.1 || opacity > 1.0) {
      throw new Error('Opacity must be between 0.1 and 1.0');
    }
    setOverlayOpacity(opacity);
  });

  ipcMain.handle('overlay:set-position', (_event, args: unknown) => {
    if (!args || typeof args !== 'object') throw new Error('Invalid args');
    const { x, y } = args as { x: number; y: number };
    if (typeof x !== 'number' || typeof y !== 'number') {
      throw new Error('Position must be numbers');
    }
    setOverlayPosition(x, y);
  });

  ipcMain.handle('overlay:set-size', (_event, args: unknown) => {
    if (!args || typeof args !== 'object') throw new Error('Invalid args');
    const { width, height } = args as { width: number; height: number };
    if (typeof width !== 'number' || typeof height !== 'number') {
      throw new Error('Size must be numbers');
    }
    setOverlaySize(width, height);
  });

  ipcMain.handle('overlay:get-bounds', () => {
    return getOverlayBounds();
  });

  // ══════════════════════════════════════
  //  SCREENSHOT (stubs for Sprint 2)
  // ══════════════════════════════════════

  ipcMain.handle('screenshot:capture-full', async () => {
    try {
      const result = await captureFullScreen();
      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Screenshot capture failed');
    }
  });

  ipcMain.handle('screenshot:capture-region', async () => {
    try {
      const result = await openRegionSelector();
      if (!result) return null;
      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Region capture failed');
    }
  });

  ipcMain.handle('screenshot:capture-monitors', () => {
    return { monitors: getAvailableMonitors() };
  });

  // ══════════════════════════════════════
  //  STORE / SETTINGS
  // ══════════════════════════════════════

  ipcMain.handle('store:get', (_event, args: unknown) => {
    if (!args || typeof args !== 'object') throw new Error('Invalid args');
    const { key } = args as { key: string };
    if (typeof key !== 'string' || key.length === 0) {
      throw new Error('Key must be a non-empty string');
    }
    const value = getNestedSetting(key);
    return { value };
  });

  ipcMain.handle('store:set', (_event, args: unknown) => {
    if (!args || typeof args !== 'object') throw new Error('Invalid args');
    const { key, value } = args as { key: string; value: unknown };
    if (typeof key !== 'string' || key.length === 0) {
      throw new Error('Key must be a non-empty string');
    }
    try {
      setNestedSetting(key, value);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save setting',
      };
    }
  });

  ipcMain.handle('store:get-all', () => {
    return getSettings();
  });

  ipcMain.handle('store:set-api-key', (_event, args: unknown) => {
    if (!args || typeof args !== 'object') throw new Error('Invalid args');
    const { provider, key } = args as { provider: string; key: string };

    if (!VALID_PROVIDERS.includes(provider as ProviderID)) {
      throw new Error('Invalid provider');
    }
    if (typeof key !== 'string') throw new Error('Invalid key type');
    if (key.length > 500) throw new Error('Key too long');
    if (key.length === 0) throw new Error('Key cannot be empty');

    try {
      setApiKey(provider as ProviderID, key);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to encrypt and store API key',
      };
    }
  });

  ipcMain.handle('store:remove-api-key', (_event, args: unknown) => {
    if (!args || typeof args !== 'object') throw new Error('Invalid args');
    const { provider } = args as { provider: string };

    if (!VALID_PROVIDERS.includes(provider as ProviderID)) {
      throw new Error('Invalid provider');
    }

    try {
      removeApiKey(provider as ProviderID);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to remove API key',
      };
    }
  });

  ipcMain.handle('store:get-api-key', (_event, args: unknown) => {
    if (!args || typeof args !== 'object') throw new Error('Invalid args');
    const { provider } = args as { provider: string };

    if (!VALID_PROVIDERS.includes(provider as ProviderID)) {
      throw new Error('Invalid provider');
    }

    const key = getApiKey(provider as ProviderID);
    return { key };
  });

  ipcMain.handle('store:clear-all', () => {
    try {
      clearAll();
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to clear data' };
    }
  });

  // ══════════════════════════════════════
  //  HOTKEYS
  // ══════════════════════════════════════

  ipcMain.handle('hotkeys:register-all', () => {
    const registered = registerAllHotkeys();
    return { registered };
  });

  ipcMain.handle('hotkeys:update', (_event, args: unknown) => {
    if (!args || typeof args !== 'object') throw new Error('Invalid args');
    const { action, shortcut } = args as { action: string; shortcut: string };

    if (typeof action !== 'string' || typeof shortcut !== 'string') {
      throw new Error('Action and shortcut must be strings');
    }

    return updateHotkey(action as HotkeyAction, shortcut);
  });

  // ══════════════════════════════════════
  //  CLIPBOARD
  // ══════════════════════════════════════

  ipcMain.handle('clipboard:copy', (_event, args: unknown) => {
    if (!args || typeof args !== 'object') throw new Error('Invalid args');
    const { text } = args as { text: string };
    if (typeof text !== 'string') throw new Error('Text must be a string');

    try {
      clipboard.writeText(text);
      return { success: true };
    } catch {
      return { success: false };
    }
  });

  ipcMain.handle('clipboard:read', () => {
    const text = clipboard.readText() || null;
    const hasImage = !clipboard.readImage().isEmpty();
    return { text, hasImage };
  });

  ipcMain.handle('clipboard:smart-paste', () => {
    // TODO: Implement smart paste with typing simulation in Phase 2
    return { success: false, error: 'Not implemented yet' };
  });

  // ══════════════════════════════════════
  //  APP LIFECYCLE
  // ══════════════════════════════════════

  ipcMain.handle('app:get-info', () => {
    return {
      version: app.getVersion(),
      platform: process.platform,
      isFirstLaunch: getSettings().isFirstLaunch,
      isContentProtectionSupported: process.platform === 'win32' || process.platform === 'darwin',
    };
  });

  ipcMain.handle('app:quit', () => {
    app.quit();
  });
}
