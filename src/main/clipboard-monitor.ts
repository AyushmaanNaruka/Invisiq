import { clipboard } from 'electron';
import crypto from 'crypto';
import { getOverlayWindow } from './overlay';

let monitorInterval: ReturnType<typeof setInterval> | null = null;
let lastHash: string = '';

function hashText(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}

export function startClipboardMonitor(intervalMs: number = 3000): void {
  stopClipboardMonitor();

  // Initialize with current clipboard content
  const current = clipboard.readText();
  lastHash = current ? hashText(current) : '';

  monitorInterval = setInterval(() => {
    try {
      const text = clipboard.readText();
      if (!text) return;

      const currentHash = hashText(text);
      if (currentHash !== lastHash) {
        lastHash = currentHash;

        const win = getOverlayWindow();
        if (win && !win.isDestroyed()) {
          win.webContents.send('clipboard:changed', {
            text: text.substring(0, 500),
            timestamp: Date.now(),
          });
        }
      }
    } catch {
      // Ignore clipboard read errors
    }
  }, intervalMs);
}

export function stopClipboardMonitor(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}

export function isClipboardMonitorRunning(): boolean {
  return monitorInterval !== null;
}
