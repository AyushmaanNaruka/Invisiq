import { app, session, BrowserWindow } from 'electron';
import { join } from 'path';
import { createOverlayWindow, setStealthFocusMode, showOverlay, forcePresent } from './overlay';
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
import { cleanupResilience } from './resilience-controller';
import { initCaptureController, cleanupCaptureController } from './capture-controller';
import { initInvisibleInput, cleanupInvisibleInput } from './invisible-input';
import { AI_API_DOMAINS, DEFAULT_PROCESS_NAME } from '@shared/constants';
import { logger } from '@shared/logger';

// ══════════════════════════════════════
//  SINGLE INSTANCE LOCK
// ══════════════════════════════════════

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // A second launch (Start Menu click, etc.) lands here because the first
    // instance holds the lock. This is ALSO our recovery path: if the first
    // instance is stuck invisible (e.g. its first present never happened), the
    // user's instinct is to relaunch — so surface the overlay through the unified
    // visibility model. Raw win.show()/focus() is WRONG under default-on stealth:
    // the HWND is WS_EX_NOACTIVATE (focus() is a no-op) and opacity-driven
    // (show() alone won't restore opacity). showOverlay()/forcePresent() do both.
    forcePresent();
    showOverlay();
  });
}

// ══════════════════════════════════════
//  CORS BYPASS FOR AI API DOMAINS
// ══════════════════════════════════════

function setupCORSBypass(): void {
  logger.log('[CORS] Setting up bypass for:', AI_API_DOMAINS);

  // Inject CORS headers into AI API responses
  session.defaultSession.webRequest.onHeadersReceived(
    { urls: AI_API_DOMAINS },
    (details, callback) => {
      logger.log('[CORS] Intercepting response:', details.method, details.url.substring(0, 80));
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
  // Set the (de-impersonated) process identity — do first. Neutral name, honest
  // AppUserModelId; no Microsoft impersonation.
  const processName = (getNestedSetting('privacy.processName') as string) || DEFAULT_PROCESS_NAME;
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

  // Initialize invisible-input module (legacy uiohook fallback tier — stays inert)
  initInvisibleInput(overlayWindow);

  // Model B — default-on stealth. Enable WS_EX_NOACTIVATE stealth focus before
  // the renderer presents (the actual present is gated to 'ready-to-show', so
  // this sets the mode without flashing an unpainted window). Fail-safe: the
  // overlay is protected from the first frame, not after a proctor is detected.
  const stealthDefaultOn = (getNestedSetting('stealth.defaultOn') as boolean | undefined) !== false;
  if (stealthDefaultOn) {
    setStealthFocusMode(true);
  }

  // Load the renderer
  if (process.env['ELECTRON_RENDERER_URL']) {
    overlayWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    // Open DevTools in dev mode (detached so it doesn't affect overlay size)
    overlayWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    overlayWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // ── Renderer-failure backstops ────────────────────────────────────────────
  // The overlay's visibility model depends on the renderer painting. If the load
  // fails or the renderer process dies, default-on stealth would otherwise leave
  // the user with a silent, invisible, un-relaunchable window (single-instance
  // lock). Recover instead of failing dark.
  let reloadAttempts = 0;
  overlayWindow.webContents.on('did-fail-load', (_e, errorCode, errorDesc, validatedURL, isMainFrame) => {
    if (!isMainFrame) return; // sub-resource failures are not fatal
    logger.error(`[overlay] renderer load failed (${errorCode} ${errorDesc}) for ${validatedURL}`);
    if (reloadAttempts < 2 && !overlayWindow.isDestroyed()) {
      reloadAttempts += 1;
      overlayWindow.webContents.reload();
    } else {
      // Out of retries — present anyway so the user isn't staring at nothing.
      forcePresent();
    }
  });

  overlayWindow.webContents.on('render-process-gone', (_e, details) => {
    logger.error('[overlay] render process gone:', details.reason);
    if (details.reason !== 'clean-exit' && !overlayWindow.isDestroyed() && reloadAttempts < 2) {
      reloadAttempts += 1;
      overlayWindow.webContents.reload();
    }
  });

  // Register global hotkeys
  registerAllHotkeys();

  // Defer non-critical startup tasks to after first paint
  overlayWindow.webContents.once('did-finish-load', () => {
    // Backstop: if the page finished loading but 'ready-to-show' never presented
    // (it can be delayed/missed on some GPU/compositing paths), present now so the
    // overlay can never be stuck invisible after a successful load. Idempotent.
    forcePresent();

    // Ensure conversations directory exists (async, non-blocking)
    ensureConversationsDir().catch(() => {});

    // Initialize auto-updater (already defers check by 10s internally)
    initializeAutoUpdater(overlayWindow);

    // Create system tray (if enabled in settings)
    createTray();

    // Initialize memory store (async, non-blocking)
    initMemoryStore().catch((err) => console.error('[Memory] Init failed:', err));

    // Model B — spawn the resident stealth-capture helper (best-effort). The
    // keyboard HOOK is installed only during active capture, so an idle helper
    // carries no keylogger signature. Capture degrades gracefully if it fails.
    // The capture-controller now owns the helper lifecycle (supersedes the old
    // resilience auto-start).
    initCaptureController().catch((err) => console.error('[Capture] Init failed:', err));
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
  // Tear down the capture controller (heartbeat timer + helper response listener)
  cleanupCaptureController();
  // Clean up resilience helper (kills ghostai_helper.exe; its watchdog is the backstop)
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
