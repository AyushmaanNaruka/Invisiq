import { app, session, BrowserWindow } from 'electron';
import { join } from 'path';
import { createOverlayWindow } from './overlay';
import { registerAllHotkeys, unregisterAllHotkeys } from './hotkeys';
import { registerIPCHandlers } from './ipc-handlers';
import { ensureConversationsDir } from './conversations';
import { disguiseProcess, applyFullStealth, startStealthWatchdog } from './stealth';
import { getNestedSetting } from './store';
import { stopClipboardMonitor } from './clipboard-monitor';
import { initMonitorManager } from './monitors';
import { initializeAutoUpdater } from './updater';
import { createTray } from './tray';
import { initMemoryStore } from './memory';
import { cleanupResilience, startAgent as startResilienceAgent } from './resilience-controller';
import { initInvisibleInput, cleanupInvisibleInput } from './invisible-input';
import { AI_API_DOMAINS } from '@shared/constants';

// ══════════════════════════════════════
//  SINGLE INSTANCE LOCK
// ══════════════════════════════════════

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // If a second instance is launched, focus our existing window
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const win = windows[0];
      if (!win.isVisible()) win.show();
      win.focus();
    }
  });
}

// ══════════════════════════════════════
//  CORS BYPASS FOR AI API DOMAINS
// ══════════════════════════════════════

function setupCORSBypass(): void {
  console.log('[CORS] Setting up bypass for:', AI_API_DOMAINS);

  // Inject CORS headers into AI API responses
  session.defaultSession.webRequest.onHeadersReceived(
    { urls: AI_API_DOMAINS },
    (details, callback) => {
      console.log('[CORS] Intercepting response:', details.method, details.url.substring(0, 80));
      const responseHeaders = { ...details.responseHeaders };

      // Delete existing CORS headers (case-insensitive) to prevent duplicates
      // API servers may already include these, causing "multiple values" CORS errors
      const corsHeaders = [
        'access-control-allow-origin',
        'access-control-allow-methods',
        'access-control-allow-headers',
      ];
      for (const key of Object.keys(responseHeaders)) {
        if (corsHeaders.includes(key.toLowerCase())) {
          delete responseHeaders[key];
        }
      }

      responseHeaders['Access-Control-Allow-Origin'] = ['*'];
      responseHeaders['Access-Control-Allow-Methods'] = ['GET, POST, PUT, DELETE, OPTIONS'];
      responseHeaders['Access-Control-Allow-Headers'] = ['*'];
      responseHeaders['Access-Control-Max-Age'] = ['86400'];

      callback({ responseHeaders });
    }
  );

  // Strip Sec-Fetch-* headers from outgoing requests to AI APIs
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: AI_API_DOMAINS },
    (details, callback) => {
      const requestHeaders = { ...details.requestHeaders };

      delete requestHeaders['Sec-Fetch-Mode'];
      delete requestHeaders['Sec-Fetch-Site'];
      delete requestHeaders['Sec-Fetch-Dest'];

      callback({ requestHeaders });
    }
  );
}

// ══════════════════════════════════════
//  APP LIFECYCLE
// ══════════════════════════════════════

app.whenReady().then(async () => {
  // Disguise process name (critical — do first)
  const processName = getNestedSetting('privacy.processName') as string || 'RuntimeBroker';
  disguiseProcess(processName);

  // Setup CORS bypass before loading any renderer content
  setupCORSBypass();

  // Register IPC handlers (needed before renderer loads)
  registerIPCHandlers();

  // Create the overlay window
  const overlayWindow = createOverlayWindow();

  // Initialize multi-monitor manager (must be before stealth so events are wired)
  initMonitorManager(overlayWindow);

  // Apply full stealth measures (critical — before window shows)
  applyFullStealth(overlayWindow);

  // Start stealth watchdog IMMEDIATELY (not deferred). The first 10s use a
  // 200ms tight burst to defend the show-time race where DWM can flash the
  // overlay into screen-share captures before honoring WDA_EXCLUDEFROMCAPTURE.
  // If this is deferred to did-finish-load, the leak window is exactly when
  // protection is needed most (during ready-to-show → show()).
  startStealthWatchdog(overlayWindow);

  // Initialize invisible-input module (hook stays inert until armed)
  initInvisibleInput(overlayWindow);

  // Load the renderer
  if (process.env['ELECTRON_RENDERER_URL']) {
    overlayWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    // Open DevTools in dev mode (detached so it doesn't affect overlay size)
    overlayWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    overlayWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Register global hotkeys
  registerAllHotkeys();

  // Defer non-critical startup tasks to after first paint
  overlayWindow.webContents.once('did-finish-load', () => {
    // Ensure conversations directory exists (async, non-blocking)
    ensureConversationsDir().catch(() => {});

    // Initialize auto-updater (already defers check by 10s internally)
    initializeAutoUpdater(overlayWindow);

    // Create system tray (if enabled in settings)
    createTray();

    // Initialize memory store (async, non-blocking)
    initMemoryStore().catch((err) => console.error('[Memory] Init failed:', err));

    // Auto-start resilience agent if enabled
    const resilienceSettings = getNestedSetting('resilience') as
      | { autoStart?: boolean; helperPath?: string; pipeName?: string }
      | undefined;
    if (resilienceSettings?.autoStart) {
      startResilienceAgent(
        resilienceSettings.helperPath || '',
        resilienceSettings.pipeName || 'GhostAI',
      ).catch((err) => console.error('[Resilience] Auto-start failed:', err));
    }
  });
});

app.on('window-all-closed', () => {
  // On Windows and Linux, quit when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  // Unregister all global shortcuts before quitting
  unregisterAllHotkeys();
  // Stop clipboard monitor
  stopClipboardMonitor();
  // Clean up resilience helper
  cleanupResilience();
  // Stop invisible-input keyboard hook
  cleanupInvisibleInput();
});

app.on('activate', () => {
  // On macOS, re-create a window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    const overlayWindow = createOverlayWindow();
    if (process.env['ELECTRON_RENDERER_URL']) {
      overlayWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    } else {
      overlayWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }
  }
});
