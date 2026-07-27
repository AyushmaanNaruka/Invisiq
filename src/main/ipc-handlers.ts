import { ipcMain, app, clipboard, shell, nativeImage, dialog } from 'electron';
import {
  toggleOverlay,
  hideOverlay,
  showOverlay,
  setOverlayOpacity,
  setOverlayPosition,
  setOverlaySize,
  getOverlayBounds,
  setStealthFocusMode,
  isStealthFocusEnabled,
  requestStealthFocus,
  releaseFocus,
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
import { captureFullScreen, captureForSnip, captureSilent } from './screenshot';
import { openRegionSelector } from './region-selector';
import { getMonitors, moveOverlayToMonitor } from './monitors';
import { smartPaste } from './clipboard';
import {
  checkForUpdates,
  downloadUpdate,
  installUpdate,
  getVersionGateStatus,
  openReleasesPage,
} from './updater';
import { startClipboardMonitor, stopClipboardMonitor, isClipboardMonitorRunning } from './clipboard-monitor';
import {
  saveConversation,
  loadConversation,
  listConversations,
  deleteConversation,
  searchConversations,
  exportConversation,
  deleteAllConversations,
} from './conversations';
import type { HotkeyAction, ProviderID, Conversation, RegionCropRequest, AudioCaptureSource, ExportFormat, ResilienceCommand } from '@shared/types';
import { getOverlayWindow } from './overlay';
import { startSystemCapture, stopSystemCapture, getCaptureStatus } from './audio-capture';
import { startAgent, stopAgent, sendCommand, getStatus as getResilienceStatus } from './resilience-controller';
import { armInvisibleInput, disarmInvisibleInput, isInvisibleInputArmed } from './invisible-input';
import {
  enterCapture,
  exitCapture,
  getCaptureStatus as getCaptureSessionStatus,
  getProctorStatus,
  panic as panicCapture,
} from './capture-controller';
import { PROVIDER_IDS } from '@shared/constants';

// PROVIDER_IDS is the 5 cloud BYOK providers; ollama is a local server (no
// API key) added separately so store:set-api-key etc. accept it.
const VALID_PROVIDERS: ProviderID[] = [...PROVIDER_IDS, 'ollama'];

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

  ipcMain.handle('screenshot:capture-full', async (_event, args?: unknown) => {
    try {
      const monitorId = (args && typeof args === 'object' && 'monitorId' in args)
        ? (args as { monitorId: string }).monitorId
        : undefined;
      const result = await captureFullScreen(monitorId);
      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Screenshot capture failed');
    }
  });

  ipcMain.handle('screenshot:capture-silent', async (_event, args?: unknown) => {
    try {
      const monitorId = (args && typeof args === 'object' && 'monitorId' in args)
        ? (args as { monitorId: string }).monitorId
        : undefined;
      const result = await captureSilent(monitorId);
      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Silent capture failed');
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
    return { monitors: getMonitors() };
  });

  // ══════════════════════════════════════
  //  MONITORS
  // ══════════════════════════════════════

  ipcMain.handle('monitors:get-all', () => {
    return { monitors: getMonitors() };
  });

  ipcMain.handle('monitors:move-overlay', (_event, args: unknown) => {
    if (!args || typeof args !== 'object') throw new Error('Invalid args');
    const { monitorId } = args as { monitorId: string };
    if (typeof monitorId !== 'string' || monitorId.length === 0) {
      throw new Error('monitorId must be a non-empty string');
    }
    const success = moveOverlayToMonitor(monitorId);
    return { success };
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

  ipcMain.handle('clipboard:smart-paste', async (_event, args: unknown) => {
    if (!args || typeof args !== 'object') throw new Error('Invalid args');
    const { text } = args as { text: string };
    if (typeof text !== 'string' || !text.trim()) {
      return { success: false, error: 'Text must be a non-empty string' };
    }
    if (text.length > 50000) {
      return { success: false, error: 'Text exceeds maximum length (50,000 chars)' };
    }
    return smartPaste(text);
  });

  ipcMain.handle('clipboard:start-monitor', (_event, args: unknown) => {
    const interval = (args && typeof args === 'object' && 'interval' in args)
      ? (args as { interval: number }).interval
      : 3000;
    const safeInterval = Math.max(1000, Math.min(10000, interval || 3000));
    startClipboardMonitor(safeInterval);
    return { success: true };
  });

  ipcMain.handle('clipboard:stop-monitor', () => {
    stopClipboardMonitor();
    return { success: true };
  });

  ipcMain.handle('clipboard:monitor-status', () => {
    return { running: isClipboardMonitorRunning() };
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

  ipcMain.handle('app:open-data-folder', async () => {
    await shell.openPath(app.getPath('userData'));
  });

  // ══════════════════════════════════════
  //  CONVERSATIONS
  // ══════════════════════════════════════

  ipcMain.handle('conversation:save', async (_event, args: unknown) => {
    if (!args || typeof args !== 'object') throw new Error('Invalid args');
    const { conversation } = args as { conversation: Conversation };
    if (!conversation || typeof conversation !== 'object') {
      throw new Error('Invalid conversation object');
    }
    if (typeof conversation.id !== 'string' || conversation.id.length === 0) {
      throw new Error('Conversation must have a valid id');
    }
    if (!Array.isArray(conversation.messages)) {
      throw new Error('Conversation must have a messages array');
    }

    try {
      await saveConversation(conversation);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save conversation',
      };
    }
  });

  ipcMain.handle('conversation:load', async (_event, args: unknown) => {
    if (!args || typeof args !== 'object') throw new Error('Invalid args');
    const { id } = args as { id: string };
    if (typeof id !== 'string' || id.length === 0) {
      throw new Error('ID must be a non-empty string');
    }

    return await loadConversation(id);
  });

  ipcMain.handle('conversation:list', async () => {
    return await listConversations();
  });

  ipcMain.handle('conversation:delete', async (_event, args: unknown) => {
    if (!args || typeof args !== 'object') throw new Error('Invalid args');
    const { id } = args as { id: string };
    if (typeof id !== 'string' || id.length === 0) {
      throw new Error('ID must be a non-empty string');
    }

    try {
      const deleted = await deleteConversation(id);
      return { success: deleted };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete conversation',
      };
    }
  });

  ipcMain.handle('conversation:search', async (_event, args: unknown) => {
    if (!args || typeof args !== 'object') throw new Error('Invalid args');
    const { query } = args as { query: string };
    if (typeof query !== 'string') {
      throw new Error('Query must be a string');
    }

    return await searchConversations(query);
  });

  ipcMain.handle('conversation:export', async (_event, args: unknown) => {
    if (!args || typeof args !== 'object') throw new Error('Invalid args');
    const { id, format } = args as { id: string; format?: string };
    if (typeof id !== 'string' || id.length === 0) {
      throw new Error('ID must be a non-empty string');
    }

    const validFormats = ['markdown'];
    const exportFormat = (format || 'markdown') as 'markdown';
    if (!validFormats.includes(exportFormat)) {
      throw new Error(`Invalid format. Valid formats: ${validFormats.join(', ')}`);
    }

    return await exportConversation(id, exportFormat);
  });

  ipcMain.handle('conversation:delete-all', async () => {
    try {
      const count = await deleteAllConversations();
      return { success: true, count };
    } catch (error) {
      return {
        success: false,
        count: 0,
        error: error instanceof Error ? error.message : 'Failed to delete conversations',
      };
    }
  });

  // ══════════════════════════════════════
  //  AUTO-UPDATER
  // ══════════════════════════════════════

  ipcMain.handle('update:check', async () => {
    await checkForUpdates();
  });

  ipcMain.handle('update:download', () => {
    downloadUpdate();
  });

  ipcMain.handle('update:install', () => {
    installUpdate();
  });

  ipcMain.handle('update:version-status', async () => {
    return getVersionGateStatus();
  });

  ipcMain.handle('update:open-releases', () => {
    openReleasesPage();
  });

  // ══════════════════════════════════════
  //  PHASE 4: INVISIBLE SNIPPING
  // ══════════════════════════════════════

  // ── Stealth Focus (Anti-Detection) ──────────────────────────

  ipcMain.handle('overlay:set-stealth-focus', (_event, args: unknown) => {
    const { enabled } = (args as { enabled: boolean }) || {};
    setStealthFocusMode(Boolean(enabled));
    return { enabled: isStealthFocusEnabled() };
  });

  ipcMain.handle('overlay:stealth-focus-status', () => {
    return { enabled: isStealthFocusEnabled() };
  });

  ipcMain.handle('overlay:request-focus', (_event, args?: unknown) => {
    const { timeoutMs } = (args as { timeoutMs?: number }) || {};
    requestStealthFocus(timeoutMs);
  });

  ipcMain.handle('overlay:release-focus', () => {
    releaseFocus();
  });

  // ── Invisible Input (Global Keyboard Capture) ────────────────

  ipcMain.handle('invisible-input:arm', () => {
    return armInvisibleInput();
  });

  ipcMain.handle('invisible-input:disarm', () => {
    return disarmInvisibleInput();
  });

  ipcMain.handle('invisible-input:status', () => {
    return { armed: isInvisibleInputArmed() };
  });

  ipcMain.handle('invisible-input:toggle', () => {
    return isInvisibleInputArmed() ? disarmInvisibleInput() : armInvisibleInput();
  });

  // ── Model B: Stealth Capture (logical-focus typing) ──────────

  ipcMain.handle('capture:enter', () => {
    return enterCapture();
  });

  ipcMain.handle('capture:exit', async () => {
    return exitCapture();
  });

  ipcMain.handle('capture:status', () => {
    return getCaptureSessionStatus();
  });

  ipcMain.handle('capture:panic', async () => {
    return panicCapture();
  });

  ipcMain.handle('capture:proctor-status', () => {
    return getProctorStatus();
  });

  ipcMain.handle('screenshot:capture-for-snip', async () => {
    return captureForSnip();
  });

  ipcMain.handle('screenshot:crop-region', async (_event, args: unknown) => {
    try {
      if (!args || typeof args !== 'object') throw new Error('Invalid args');
      const { screenshotBase64, x, y, width, height, devicePixelRatio } = args as RegionCropRequest;
      if (typeof screenshotBase64 !== 'string' || screenshotBase64.length === 0) {
        throw new Error('screenshotBase64 must be a non-empty string');
      }

      // Clamp to positive values
      const scale = devicePixelRatio || 1;
      const sx = Math.max(0, Math.round(x * scale));
      const sy = Math.max(0, Math.round(y * scale));
      const sw = Math.max(1, Math.round(width * scale));
      const sh = Math.max(1, Math.round(height * scale));

      const img = nativeImage.createFromBuffer(Buffer.from(screenshotBase64, 'base64'));
      const { width: imgW, height: imgH } = img.getSize();
      if (imgW === 0 || imgH === 0) {
        throw new Error('Decoded screenshot is empty or not a valid image');
      }

      // Clamp crop to image bounds
      const clampedX = Math.min(sx, imgW - 1);
      const clampedY = Math.min(sy, imgH - 1);
      const clampedW = Math.min(sw, imgW - clampedX);
      const clampedH = Math.min(sh, imgH - clampedY);

      const cropped = img.crop({ x: clampedX, y: clampedY, width: clampedW, height: clampedH });
      return {
        base64: cropped.toPNG().toString('base64'),
        width: clampedW,
        height: clampedH,
        timestamp: Date.now(),
      };
    } catch (err) {
      // Log on the main side, then re-throw so the renderer's catch surfaces it
      // (the screenshot domain returns data shapes, not success envelopes).
      console.error('[ipc] screenshot:crop-region failed:', err);
      throw err instanceof Error ? err : new Error('Crop failed');
    }
  });

  // ══════════════════════════════════════
  //  PHASE 4: AUDIO CAPTURE
  // ══════════════════════════════════════

  ipcMain.handle('audio:start-system-capture', async (_event, args: unknown) => {
    if (!args || typeof args !== 'object') throw new Error('Invalid args');
    const { source, chunkIntervalMs } = args as { source: AudioCaptureSource; chunkIntervalMs: number };

    const overlayWin = getOverlayWindow();
    if (!overlayWin) {
      return { success: false, method: 'unavailable' };
    }

    return startSystemCapture(overlayWin, source || 'microphone', chunkIntervalMs || 5000);
  });

  ipcMain.handle('audio:stop-system-capture', () => {
    stopSystemCapture();
  });

  ipcMain.handle('audio:capture-status', () => {
    return getCaptureStatus();
  });

  // ══════════════════════════════════════
  //  PHASE 4: COMPANION (stub — Sprint 16)
  // ══════════════════════════════════════

  ipcMain.handle('companion:start', async (_event, args: unknown) => {
    // Full implementation in Sprint 16 companion-server.ts
    const { port } = (args as { port?: number }) || {};
    try {
      const { startCompanionServer } = await import('./companion-server');
      return startCompanionServer(port || 3847);
    } catch {
      return { success: false, url: '', qrDataUrl: '' };
    }
  });

  ipcMain.handle('companion:stop', async () => {
    try {
      const { stopCompanionServer } = await import('./companion-server');
      stopCompanionServer();
    } catch { /* not yet implemented */ }
  });

  ipcMain.handle('companion:status', async () => {
    try {
      const { getCompanionStatus } = await import('./companion-server');
      return getCompanionStatus();
    } catch {
      return { running: false, connectedDevices: [], port: 3847 };
    }
  });

  ipcMain.handle('companion:devices', async () => {
    try {
      const { getConnectedDevices } = await import('./companion-server');
      return getConnectedDevices();
    } catch {
      return [];
    }
  });

  // ══════════════════════════════════════
  //  PHASE 4: EXPORT (Sprint 16)
  // ══════════════════════════════════════

  ipcMain.handle('export:conversation', async (_event, args: unknown) => {
    if (!args || typeof args !== 'object') throw new Error('Invalid args');
    const { id, format } = args as { id: string; format: ExportFormat };
    try {
      const { exportConversationFile } = await import('./export-service');
      return exportConversationFile(id, format);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Export failed' };
    }
  });

  ipcMain.handle('export:save-dialog', async (_event, args: unknown) => {
    if (!args || typeof args !== 'object') throw new Error('Invalid args');
    const { defaultName, format } = args as { defaultName: string; format: ExportFormat };

    const ext = format === 'json' ? 'json' : format === 'markdown' ? 'md' : format === 'pdf' ? 'pdf' : 'txt';
    const filters = [{ name: format.toUpperCase(), extensions: [ext] }];

    const result = await dialog.showSaveDialog({
      defaultPath: `${defaultName}.${ext}`,
      filters,
    });

    return { path: result.canceled ? null : (result.filePath ?? null) };
  });

  // ══════════════════════════════════════
  //  PHASE 4: MEMORY (Sprint 17)
  // ══════════════════════════════════════

  ipcMain.handle('memory:search', async (_event, args: unknown) => {
    const { query, limit } = (args as { query: string; limit?: number }) || {};
    try {
      const { getMemoryStore } = await import('./memory');
      const store = getMemoryStore();
      return store ? store.search(query || '', limit || 5) : [];
    } catch { return []; }
  });

  ipcMain.handle('memory:add', async (_event, args: unknown) => {
    const { content, tags } = (args as { content: string; tags?: string[] }) || {};
    try {
      const { getMemoryStore } = await import('./memory');
      const store = getMemoryStore();
      if (!store) return { id: '' };
      const id = await store.add(content, 'user', tags);
      return { id };
    } catch { return { id: '' }; }
  });

  ipcMain.handle('memory:delete', async (_event, args: unknown) => {
    const { id } = (args as { id: string }) || {};
    try {
      const { getMemoryStore } = await import('./memory');
      const store = getMemoryStore();
      if (!store) return { success: false };
      const success = await store.delete(id);
      return { success };
    } catch { return { success: false }; }
  });

  ipcMain.handle('memory:list', async (_event, args: unknown) => {
    const { page, limit } = (args as { page: number; limit?: number }) || {};
    try {
      const { getMemoryStore } = await import('./memory');
      const store = getMemoryStore();
      if (!store) return { facts: [], total: 0 };
      return store.list(page || 1, limit || 20);
    } catch { return { facts: [], total: 0 }; }
  });

  ipcMain.handle('memory:clear-all', async () => {
    try {
      const { getMemoryStore } = await import('./memory');
      const store = getMemoryStore();
      if (!store) return { count: 0 };
      const count = await store.clearAll();
      return { count };
    } catch { return { count: 0 }; }
  });

  ipcMain.handle('memory:stats', async () => {
    try {
      const { getMemoryStore } = await import('./memory');
      const store = getMemoryStore();
      if (!store) return { totalFacts: 0, totalSize: 0, oldestFact: '', newestFact: '' };
      return store.stats();
    } catch { return { totalFacts: 0, totalSize: 0, oldestFact: '', newestFact: '' }; }
  });

  ipcMain.handle('memory:extract', async (_event, args: unknown) => {
    const { conversationId } = (args as { conversationId: string }) || {};
    try {
      const { getMemoryStore } = await import('./memory');
      const store = getMemoryStore();
      if (!store) return { extracted: 0 };
      const extracted = await store.extractFromConversation(conversationId);
      return { extracted };
    } catch { return { extracted: 0 }; }
  });

  // ══════════════════════════════════════
  //  PHASE 5: RESILIENCE
  // ══════════════════════════════════════

  ipcMain.handle('resilience:start-agent', async (_event, args: unknown) => {
    const { helperPath, pipeName } = (args as { helperPath?: string; pipeName?: string }) || {};
    return startAgent(helperPath || '', pipeName || 'InvisiQ');
  });

  ipcMain.handle('resilience:stop-agent', async () => {
    await stopAgent();
    return { success: true };
  });

  ipcMain.handle('resilience:send-command', (_event, args: unknown) => {
    const { command } = (args as { command: ResilienceCommand }) || {};
    if (!command || typeof command.type !== 'string') {
      return { success: false, error: 'Command must have a type string' };
    }
    return sendCommand(command);
  });

  ipcMain.handle('resilience:status', () => {
    return getResilienceStatus();
  });
}
