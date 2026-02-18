import { clipboard } from 'electron';
import { execFile } from 'child_process';
import { hideOverlay, showOverlay, getOverlayWindow } from './overlay';

/**
 * Smart paste: writes text to clipboard, releases overlay focus,
 * hides overlay, activates the previous foreground window via Win32 API,
 * simulates Ctrl+V, then restores the overlay and original clipboard content.
 */
export async function smartPaste(text: string): Promise<{ success: boolean; error?: string }> {
  console.log('[Clipboard] smartPaste called, text length:', text.length);

  // Save current clipboard content
  const savedClipboard = clipboard.readText();
  let restored = false;

  const restore = (): void => {
    if (restored) return;
    restored = true;
    try {
      clipboard.writeText(savedClipboard);
    } catch {
      // Best effort restore
    }
    showOverlay();
    console.log('[Clipboard] Overlay restored');
  };

  try {
    // Write the target text to clipboard
    clipboard.writeText(text);
    console.log('[Clipboard] Text written to clipboard');

    // Release focus before hiding so OS gives focus back to previous window
    const win = getOverlayWindow();
    if (win && !win.isDestroyed()) {
      win.setAlwaysOnTop(false); // Drop from always-on-top Z-order band
      win.blur();                // Release focus → OS activates previous window
      console.log('[Clipboard] Overlay: alwaysOnTop=false, blurred');
    }

    // Hide overlay
    hideOverlay();
    console.log('[Clipboard] Overlay hidden, waiting for DWM recomposition...');

    // Wait for DWM recomposition and focus transition
    await sleep(250);

    // Use PowerShell Win32 API to ensure the foreground window is active, then paste
    console.log('[Clipboard] Executing PowerShell SendKeys...');
    await execPowerShell(`
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -Name NativeMethods -Namespace Win32 -MemberDefinition '
        [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
        [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
      '
      $hwnd = [Win32.NativeMethods]::GetForegroundWindow()
      [Win32.NativeMethods]::SetForegroundWindow($hwnd)
      Start-Sleep -Milliseconds 100
      [System.Windows.Forms.SendKeys]::SendWait('^v')
    `);
    console.log('[Clipboard] SendKeys completed');

    // Wait for paste completion
    await sleep(200);

    // Restore overlay
    restore();
    return { success: true };
  } catch (err) {
    console.error('[Clipboard] smartPaste error:', err);
    restore();
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Smart paste failed',
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function execPowerShell(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Use execFile to bypass cmd.exe — avoids ^ escaping issues
    // (cmd.exe treats ^ as escape char, breaking SendKeys '^v' for Ctrl+V)
    const child = execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', command],
      { timeout: 5000 },
      (error, stdout, stderr) => {
        if (error) {
          console.error('[Clipboard] PowerShell error:', stderr || error.message);
          reject(new Error(stderr || error.message));
        } else {
          if (stdout.trim()) console.log('[Clipboard] PowerShell stdout:', stdout.trim());
          resolve(stdout);
        }
      }
    );
    // Safety: kill child if it takes too long
    setTimeout(() => {
      try { child.kill(); } catch { /* ignore */ }
    }, 5500);
  });
}
