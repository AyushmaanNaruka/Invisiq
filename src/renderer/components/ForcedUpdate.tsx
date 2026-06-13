import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Download, Loader2 } from 'lucide-react';
import type { VersionGateStatus } from '@shared/types';

interface ForcedUpdateProps {
  gate: VersionGateStatus;
}

/**
 * Blocking forced-update screen (Beta Launch Plan §10.4). Shown when the running
 * build is remotely killed or below the version floor — no "Later" option. This
 * is the lever that carries beta users onto the Act II backend cutover.
 *
 * NOTE: auto-install requires a signed build/feed (deferred until incorporation),
 * so for the unsigned beta this primarily BLOCKS the build and prompts an update.
 */
export default function ForcedUpdate({ gate }: ForcedUpdateProps): JSX.Element {
  const [busy, setBusy] = useState(false);

  const handleUpdate = async (): Promise<void> => {
    setBusy(true);
    try {
      await window.ghostAPI.update.check();
      await window.ghostAPI.update.download();
    } catch {
      /* best-effort — unsigned beta may require a manual download */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-bg-overlay rounded-lg select-none px-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex flex-col items-center text-center max-w-xs"
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

        <button
          type="button"
          onClick={handleUpdate}
          disabled={busy}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {busy ? 'Updating…' : 'Update now'}
        </button>

        <button
          type="button"
          onClick={() => window.ghostAPI.app.quit()}
          className="mt-3 text-xs text-text-secondary hover:text-text-primary transition-colors"
        >
          Quit InvisiQ
        </button>
      </motion.div>
    </div>
  );
}
