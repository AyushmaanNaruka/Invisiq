import { autoUpdater, type UpdateInfo, type ProgressInfo } from 'electron-updater';
import { BrowserWindow, app, shell } from 'electron';
import { SUPABASE_URL, SUPABASE_ANON_KEY, RELEASES_LATEST_URL } from '@shared/constants';
import type { VersionGateStatus } from '@shared/types';

let overlayRef: BrowserWindow | null = null;

function sendToRenderer(channel: string, data?: unknown): void {
  if (overlayRef && !overlayRef.isDestroyed()) {
    overlayRef.webContents.send(channel, data);
  }
}

// ══════════════════════════════════════
//  REMOTE KILL-SWITCH + VERSION FLOOR (§10.4)
// ══════════════════════════════════════
// Reads public app_config at launch. If the running build is killed or below
// the floor, the renderer shows a blocking forced-update screen. FAIL-OPEN:
// any fetch/parse error must never brick the fleet.

let versionGate: VersionGateStatus = {
  required: false,
  reason: null,
  message: null,
  minVersion: null,
  latestVersion: null,
  currentVersion: '',
};
let gatePromise: Promise<VersionGateStatus> | null = null;

/** Numeric semver compare ignoring pre-release tags. -1 if a<b, 0 if equal, 1 if a>b. */
function compareSemver(a: string, b: string): number {
  const pa = a.split('-')[0].split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('-')[0].split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

async function checkVersionGate(): Promise<VersionGateStatus> {
  const current = app.getVersion();
  const result: VersionGateStatus = {
    required: false,
    reason: null,
    message: null,
    minVersion: null,
    latestVersion: null,
    currentVersion: current,
  };
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/app_config?id=eq.1&select=min_version,killed_versions,message,latest_version`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    if (!res.ok) throw new Error(`http_${res.status}`);
    const rows = (await res.json()) as Array<{
      min_version: string | null;
      killed_versions: string[] | null;
      message: string | null;
      latest_version: string | null;
    }>;
    const cfg = Array.isArray(rows) ? rows[0] : null;
    if (!cfg) return result; // no config row → allow

    result.minVersion = cfg.min_version ?? null;
    result.latestVersion = cfg.latest_version ?? null;
    const killed = Array.isArray(cfg.killed_versions) ? cfg.killed_versions : [];

    if (killed.includes(current)) {
      result.required = true;
      result.reason = 'killed';
      result.message = cfg.message ?? 'This version has been disabled. Please update to continue.';
    } else if (cfg.min_version && compareSemver(current, cfg.min_version) < 0) {
      result.required = true;
      result.reason = 'below-floor';
      result.message = cfg.message ?? 'A required update is available. Please update to continue.';
    }
  } catch {
    // FAIL-OPEN — never block on a network/parse error.
    return result;
  }

  versionGate = result;
  if (result.required) {
    sendToRenderer('update:required', result);
    // Below floor / killed → start pulling the update immediately.
    autoUpdater.checkForUpdates().catch(() => {});
  }
  return result;
}

/** Run the launch-time version-gate check once. */
export function initVersionGate(): Promise<VersionGateStatus> {
  if (!gatePromise) gatePromise = checkVersionGate();
  return gatePromise;
}

/** Version-gate status after the launch check settles (used by IPC). */
export async function getVersionGateStatus(): Promise<VersionGateStatus> {
  if (gatePromise) await gatePromise;
  return versionGate;
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

/**
 * Manual-download fallback. Opens the public releases page in the default
 * browser. This is the safety net for the forced-update screen so a killed /
 * below-floor build is never a dead end when the in-app feed is unreachable
 * (offline, GitHub rate-limit, or pre-publish).
 */
export function openReleasesPage(): void {
  shell.openExternal(RELEASES_LATEST_URL).catch((error) => {
    console.error('[Updater] Failed to open releases page:', (error as Error).message);
  });
}
