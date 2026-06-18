import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Download, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import type { VersionGateStatus } from '@shared/types';

interface ForcedUpdateProps {
  gate: VersionGateStatus;
}

type Phase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'unavailable'
  | 'error';

/**
 * Blocking forced-update screen (Beta Launch Plan §10.4). Shown when the running
 * build is remotely killed or below the version floor — no "Later" option.
 *
 * This screen owns the ENTIRE update lifecycle (check → download → install)
 * itself: it renders BEFORE the main app, so the Toast layer / UpdateNotification
 * that normally surface "download" / "install & restart" are NOT mounted. If this
 * component only fired a check, a killed build would be a dead end. So it:
 *   1. auto-checks on mount, auto-downloads when an update is found,
 *   2. shows real download progress and an explicit Install & Restart button, and
 *   3. ALWAYS offers a manual-download link as the fallback when the in-app feed
 *      is unreachable (offline, GitHub rate-limit, or pre-publish / unsigned beta).
 */
export default function ForcedUpdate({ gate }: ForcedUpdateProps): JSX.Element {
  const [phase, setPhase] = useState<Phase>('idle');
  const [percent, setPercent] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const downloadStarted = useRef(false);

  const startCheck = async (): Promise<void> => {
    downloadStarted.current = false;
    setErrorMsg(null);
    setPercent(0);
    setPhase('checking');
    try {
      await window.ghostAPI.update.check();
    } catch {
      setPhase('error');
    }
  };

  // Drive the lifecycle from main-process update events.
  useEffect(() => {
    const offChecking = window.ghostAPI.on('update:checking', () => setPhase('checking'));

    const offAvailable = window.ghostAPI.on('update:available', () => {
      setPhase('available');
      // Auto-download — a forced update should require no extra click.
      if (!downloadStarted.current) {
        downloadStarted.current = true;
        setPhase('downloading');
        window.ghostAPI.update.download();
      }
    });

    const offProgress = window.ghostAPI.on('update:progress', (data: unknown) => {
      const { percent: p } = (data as { percent: number }) ?? { percent: 0 };
      setPhase('downloading');
      setPercent(typeof p === 'number' ? p : 0);
    });

    const offDownloaded = window.ghostAPI.on('update:downloaded', () => {
      setPercent(100);
      setPhase('downloaded');
    });

    const offNotAvailable = window.ghostAPI.on('update:not-available', () => {
      // Gate says we must update, but the feed reports nothing newer — likely the
      // release isn't published / reachable yet. Push the user to manual download.
      setPhase('unavailable');
    });

    const offError = window.ghostAPI.on('update:error', (data: unknown) => {
      const { message } = (data as { message: string }) ?? { message: '' };
      setErrorMsg(message || null);
      setPhase('error');
    });

    // Kick off the check immediately (main also triggers one when the gate trips,
    // but a click on "Try again" routes back through here too).
    void startCheck();

    return () => {
      offChecking();
      offAvailable();
      offProgress();
      offDownloaded();
      offNotAvailable();
      offError();
    };
  }, []);

  const busy = phase === 'checking' || phase === 'available' || phase === 'downloading';
  const canRetry = phase === 'error' || phase === 'unavailable';

  const primaryLabel = (): string => {
    switch (phase) {
      case 'checking':
        return 'Checking for update…';
      case 'available':
      case 'downloading':
        return percent > 0 ? `Downloading… ${Math.round(percent)}%` : 'Downloading…';
      case 'downloaded':
        return 'Install & Restart';
      default:
        return 'Check again';
    }
  };

  const handlePrimary = (): void => {
    if (phase === 'downloaded') {
      window.ghostAPI.update.install();
    } else {
      void startCheck();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-bg-overlay rounded-lg select-none px-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex flex-col items-center text-center max-w-xs w-full"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-error/15">
          <AlertTriangle className="h-6 w-6 text-error" />
        </div>

        <h1 className="text-lg font-semibold text-text-primary">Update required</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {gate.message ?? 'A required update is available. Please update to continue using InvisiQ.'}
        </p>
        {gate.latestVersion && (
          <p className="mt-2 text-[11px] text-text-placeholder">
            You have {gate.currentVersion || 'an older version'} · latest is {gate.latestVersion}
          </p>
        )}

        {/* Progress bar while downloading */}
        {phase === 'downloading' && (
          <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-200"
              style={{ width: `${Math.max(4, Math.round(percent))}%` }}
            />
          </div>
        )}

        {/* Feed unreachable / nothing published yet */}
        {phase === 'unavailable' && (
          <p className="mt-4 text-xs text-text-secondary">
            Couldn&apos;t reach the update server. Download the latest version manually below.
          </p>
        )}
        {phase === 'error' && (
          <p className="mt-4 text-xs text-error/90">
            Update failed{errorMsg ? `: ${errorMsg}` : ''}. Download manually below.
          </p>
        )}

        <button
          type="button"
          onClick={handlePrimary}
          disabled={busy}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : canRetry ? (
            <RefreshCw className="h-4 w-4" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {primaryLabel()}
        </button>

        {/* Manual-download fallback — always available so the gate is never a dead end. */}
        <button
          type="button"
          onClick={() => window.ghostAPI.update.openReleases()}
          className="mt-3 flex items-center justify-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Download manually
        </button>

        <button
          type="button"
          onClick={() => window.ghostAPI.app.quit()}
          className="mt-2 text-xs text-text-placeholder hover:text-text-secondary transition-colors"
        >
          Quit InvisiQ
        </button>
      </motion.div>
    </div>
  );
}
