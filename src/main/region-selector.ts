import { BrowserWindow } from 'electron';
import { captureRegion } from './screenshot';
import { getMonitorAtCursor } from './monitors';
import type { ScreenshotResult } from '@shared/types';

const REGION_SELECTOR_HTML = `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    /* STEALTH: keep the OS arrow cursor instead of a crosshair. The window is
       hidden from capture (content protection), but the cursor is composited
       by the OS on top — a crosshair sweeping an apparently-empty screen would
       reveal that a selection overlay is active. The dim + dashed selection
       rectangle still indicate select mode on the user's own display. */
    cursor: default;
    background: rgba(0, 0, 0, 0.3);
    user-select: none;
    -webkit-user-select: none;
  }
  #selection {
    position: fixed;
    border: 2px dashed #00B894;
    background: rgba(0, 184, 148, 0.1);
    display: none;
    pointer-events: none;
    z-index: 10;
  }
  #dimensions {
    position: fixed;
    background: rgba(0, 0, 0, 0.7);
    color: #00B894;
    font-family: monospace;
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 3px;
    display: none;
    pointer-events: none;
    z-index: 20;
  }
  #instructions {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #E8E8E8;
    font-family: system-ui, sans-serif;
    font-size: 16px;
    text-align: center;
    pointer-events: none;
    opacity: 0.8;
  }
  #instructions span {
    display: block;
    font-size: 12px;
    color: #8B8B9E;
    margin-top: 4px;
  }
</style>
</head>
<body>
  <div id="selection"></div>
  <div id="dimensions"></div>
  <div id="instructions">
    Click and drag to select a region
    <span>Press Escape to cancel</span>
  </div>
  <script>
    const sel = document.getElementById('selection');
    const dim = document.getElementById('dimensions');
    const instr = document.getElementById('instructions');
    let startX, startY, isDragging = false;

    function signal(data) {
      document.title = JSON.stringify(data);
    }

    document.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      sel.style.display = 'block';
      dim.style.display = 'block';
      instr.style.display = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const x = Math.min(startX, e.clientX);
      const y = Math.min(startY, e.clientY);
      const w = Math.abs(e.clientX - startX);
      const h = Math.abs(e.clientY - startY);
      sel.style.left = x + 'px';
      sel.style.top = y + 'px';
      sel.style.width = w + 'px';
      sel.style.height = h + 'px';
      dim.style.left = (x + w + 8) + 'px';
      dim.style.top = (y + h + 8) + 'px';
      dim.textContent = w + ' x ' + h;
    });

    document.addEventListener('mouseup', (e) => {
      if (!isDragging) return;
      isDragging = false;
      const x = Math.min(startX, e.clientX);
      const y = Math.min(startY, e.clientY);
      const w = Math.abs(e.clientX - startX);
      const h = Math.abs(e.clientY - startY);
      if (w > 5 && h > 5) {
        signal({ action: 'selected', x, y, width: w, height: h });
      } else {
        signal({ action: 'cancelled' });
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        signal({ action: 'cancelled' });
      }
    });
  </script>
</body>
</html>`;

let regionSelectorWindow: BrowserWindow | null = null;

export function openRegionSelector(): Promise<ScreenshotResult | null> {
  return new Promise((resolve) => {
    // Open region selector on the monitor where the cursor is
    const targetDisplay = getMonitorAtCursor();
    const { width, height } = targetDisplay.size;

    regionSelectorWindow = new BrowserWindow({
      x: targetDisplay.bounds.x,
      y: targetDisplay.bounds.y,
      width,
      height,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      fullscreenable: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    // CRITICAL — Region selector must also be invisible to screen capture
    regionSelectorWindow.setContentProtection(true);

    // Prevent the window from showing in Alt+Tab
    regionSelectorWindow.setSkipTaskbar(true);

    function cleanup(): void {
      if (regionSelectorWindow && !regionSelectorWindow.isDestroyed()) {
        regionSelectorWindow.close();
      }
      regionSelectorWindow = null;
    }

    // Store target display ID for passing to captureRegion
    const targetMonitorId = targetDisplay.id.toString();

    // Listen for signals from the region selector via document.title changes
    regionSelectorWindow.on('page-title-updated', async (_event, title) => {
      try {
        const data = JSON.parse(title);
        if (data.action === 'selected') {
          cleanup();
          try {
            const result = await captureRegion(data.x, data.y, data.width, data.height, targetMonitorId);
            resolve(result);
          } catch {
            resolve(null);
          }
        } else if (data.action === 'cancelled') {
          cleanup();
          resolve(null);
        }
      } catch {
        // Not JSON, ignore
      }
    });

    regionSelectorWindow.on('closed', () => {
      regionSelectorWindow = null;
    });

    // Load the inline HTML
    regionSelectorWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(REGION_SELECTOR_HTML)}`
    );
  });
}
