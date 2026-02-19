import { autoUpdater, type UpdateInfo, type ProgressInfo } from 'electron-updater';
import { BrowserWindow } from 'electron';

let overlayRef: BrowserWindow | null = null;

function sendToRenderer(channel: string, data?: unknown): void {
  if (overlayRef && !overlayRef.isDestroyed()) {
    overlayRef.webContents.send(channel, data);
  }
}

export function initializeAutoUpdater(overlayWindow: BrowserWindow): void {
  overlayRef = overlayWindow;

  // Configuration
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  // Events
  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for updates...');
    sendToRenderer('update:checking');
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    console.log('[Updater] Update available:', info.version);
    sendToRenderer('update:available', {
      version: info.version,
      releaseDate: info.releaseDate,
    });
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[Updater] No updates available');
    sendToRenderer('update:not-available');
  });

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    sendToRenderer('update:progress', {
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    console.log('[Updater] Update downloaded:', info.version);
    sendToRenderer('update:downloaded', {
      version: info.version,
    });
  });

  autoUpdater.on('error', (error: Error) => {
    console.error('[Updater] Error:', error.message);
    sendToRenderer('update:error', { message: error.message });
  });

  // Deferred auto-check (10 seconds after startup)
  setTimeout(() => {
    checkForUpdates().catch(() => {
      // Silently fail — don't interrupt app startup
    });
  }, 10000);
}

export async function checkForUpdates(): Promise<void> {
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    console.error('[Updater] Check failed:', (error as Error).message);
  }
}

export function downloadUpdate(): void {
  autoUpdater.downloadUpdate().catch((error) => {
    console.error('[Updater] Download failed:', (error as Error).message);
  });
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall(false, true);
}
