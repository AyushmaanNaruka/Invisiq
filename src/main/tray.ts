import { Tray, Menu, app, nativeImage, BrowserWindow } from 'electron';
import path from 'path';
import { getNestedSetting } from './store';

let tray: Tray | null = null;

export function createTray(): void {
  const showTrayIcon = getNestedSetting('privacy.showTrayIcon') as boolean;
  if (!showTrayIcon) return;

  // Create a simple 16x16 icon (generic, not ghost-themed for stealth)
  let icon: Electron.NativeImage;
  try {
    icon = nativeImage.createFromPath(
      path.join(__dirname, '../../assets/icons/tray-icon.png')
    );
  } catch {
    // Fallback: create a tiny transparent icon
    icon = nativeImage.createEmpty();
  }

  // Resize to 16x16 for tray
  if (!icon.isEmpty()) {
    icon = icon.resize({ width: 16, height: 16 });
  }

  tray = new Tray(icon);
  tray.setToolTip(''); // Empty tooltip for stealth

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show/Hide',
      click: () => {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
          const win = windows[0];
          if (win.isVisible()) {
            win.hide();
          } else {
            win.show();
          }
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ]);

  tray.setContextMenu(contextMenu);
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
