import { BrowserWindow, screen } from 'electron';
import path from 'path';
import { getWindowState, setWindowState } from './store';
import { ensureContentProtection } from './stealth';

let overlayWindow: BrowserWindow | null = null;

export function createOverlayWindow(): BrowserWindow {
  const windowState = getWindowState();

  overlayWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    focusable: true,
    show: false,
    title: '',
    minWidth: 300,
    minHeight: 200,
    maxWidth: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // CRITICAL — Makes window invisible to screen capture
  overlayWindow.setContentProtection(true);

  // Position bottom-right of primary display
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
  const posX = windowState.x || screenW - windowState.width - 20;
  const posY = windowState.y || screenH - windowState.height - 20;
  overlayWindow.setPosition(posX, posY);

  // Set initial opacity
  overlayWindow.setOpacity(windowState.opacity);

  // Show window only after content is ready to paint
  overlayWindow.once('ready-to-show', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.show();
    }
  });

  // Save window state on move/resize
  overlayWindow.on('moved', () => {
    if (!overlayWindow) return;
    const [x, y] = overlayWindow.getPosition();
    setWindowState({ x, y });
  });

  overlayWindow.on('resized', () => {
    if (!overlayWindow) return;
    const [width, height] = overlayWindow.getSize();
    setWindowState({ width, height });
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  return overlayWindow;
}

export function getOverlayWindow(): BrowserWindow | null {
  return overlayWindow;
}

export function showOverlay(): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.show();
    ensureContentProtection(overlayWindow);
    overlayWindow.webContents.send('overlay:visibility-changed', { visible: true });
  }
}

export function hideOverlay(): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.hide();
    overlayWindow.webContents.send('overlay:visibility-changed', { visible: false });
  }
}

export function toggleOverlay(): boolean {
  if (!overlayWindow || overlayWindow.isDestroyed()) return false;

  if (overlayWindow.isVisible()) {
    hideOverlay();
    return false;
  } else {
    showOverlay();
    return true;
  }
}

export function setOverlayOpacity(opacity: number): void {
  const clamped = Math.max(0.1, Math.min(1.0, opacity));
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setOpacity(clamped);
    setWindowState({ opacity: clamped });
  }
}

export function getOverlayBounds(): { x: number; y: number; width: number; height: number } {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    return { x: 0, y: 0, width: 420, height: 600 };
  }
  return overlayWindow.getBounds();
}

export function setOverlayPosition(x: number, y: number): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setPosition(Math.round(x), Math.round(y));
  }
}

export function setOverlaySize(width: number, height: number): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    const w = Math.max(300, Math.min(800, Math.round(width)));
    const h = Math.max(200, Math.round(height));
    overlayWindow.setSize(w, h);
  }
}
