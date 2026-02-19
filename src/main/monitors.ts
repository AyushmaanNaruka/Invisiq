import { screen, BrowserWindow } from 'electron';
import type { MonitorInfo } from '@shared/types';

let cachedDisplays: Electron.Display[] = [];
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let overlayRef: BrowserWindow | null = null;

// ══════════════════════════════════════
//  MONITOR DETECTION & MANAGEMENT
// ══════════════════════════════════════

export function initMonitorManager(overlayWindow: BrowserWindow): void {
  overlayRef = overlayWindow;
  cachedDisplays = screen.getAllDisplays();

  const handleChange = (): void => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      cachedDisplays = screen.getAllDisplays();
      // If overlay is off all displays, snap to primary
      validateOverlayPosition();
      // Notify renderer
      if (overlayRef && !overlayRef.isDestroyed()) {
        overlayRef.webContents.send('monitors:changed', { monitors: getMonitors() });
      }
    }, 500);
  };

  screen.on('display-added', handleChange);
  screen.on('display-removed', handleChange);
  screen.on('display-metrics-changed', handleChange);
}

/**
 * Returns all connected monitors as MonitorInfo[].
 */
export function getMonitors(): MonitorInfo[] {
  if (cachedDisplays.length === 0) {
    cachedDisplays = screen.getAllDisplays();
  }
  const primaryId = screen.getPrimaryDisplay().id;
  return cachedDisplays.map((display) => ({
    id: display.id.toString(),
    name: `Display ${display.id}`,
    width: display.size.width,
    height: display.size.height,
    x: display.bounds.x,
    y: display.bounds.y,
    isPrimary: display.id === primaryId,
  }));
}

/**
 * Returns the Electron Display that the overlay is currently on.
 */
export function getMonitorForOverlay(): Electron.Display {
  if (overlayRef && !overlayRef.isDestroyed()) {
    return screen.getDisplayMatching(overlayRef.getBounds());
  }
  return screen.getPrimaryDisplay();
}

/**
 * Returns the Electron Display at the current mouse cursor position.
 */
export function getMonitorAtCursor(): Electron.Display {
  return screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
}

/**
 * Moves the overlay to the equivalent relative position on a target monitor.
 * Returns true on success, false if monitor not found.
 */
export function moveOverlayToMonitor(monitorId: string): boolean {
  if (!overlayRef || overlayRef.isDestroyed()) return false;

  const target = cachedDisplays.find((d) => d.id.toString() === monitorId);
  if (!target) return false;

  const currentDisplay = screen.getDisplayMatching(overlayRef.getBounds());
  const bounds = overlayRef.getBounds();

  // Calculate relative position on current monitor (0.0 to 1.0)
  const relX = (bounds.x - currentDisplay.bounds.x) / currentDisplay.workArea.width;
  const relY = (bounds.y - currentDisplay.bounds.y) / currentDisplay.workArea.height;

  // Apply same relative position on target monitor
  const newX = target.workArea.x + Math.round(relX * target.workArea.width);
  const newY = target.workArea.y + Math.round(relY * target.workArea.height);

  overlayRef.setPosition(
    Math.max(target.bounds.x, Math.min(newX, target.bounds.x + target.bounds.width - bounds.width)),
    Math.max(target.bounds.y, Math.min(newY, target.bounds.y + target.bounds.height - bounds.height)),
  );

  return true;
}

/**
 * Validates the overlay is on a connected display.
 * If off-screen (e.g., monitor disconnected), snaps to primary bottom-right.
 */
export function validateOverlayPosition(): void {
  if (!overlayRef || overlayRef.isDestroyed()) return;

  const bounds = overlayRef.getBounds();
  const displays = screen.getAllDisplays();

  // Check if any part of the overlay is within any display bounds
  const isOnAnyDisplay = displays.some((d) => {
    return (
      bounds.x < d.bounds.x + d.bounds.width &&
      bounds.x + bounds.width > d.bounds.x &&
      bounds.y < d.bounds.y + d.bounds.height &&
      bounds.y + bounds.height > d.bounds.y
    );
  });

  if (!isOnAnyDisplay) {
    // Snap to primary display bottom-right
    const primary = screen.getPrimaryDisplay();
    const fallbackX = primary.workArea.x + primary.workArea.width - bounds.width - 20;
    const fallbackY = primary.workArea.y + primary.workArea.height - bounds.height - 20;
    overlayRef.setPosition(fallbackX, fallbackY);
    console.log('[Monitors] Overlay was off-screen, snapped to primary display');
  }
}
