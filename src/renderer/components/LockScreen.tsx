import { motion } from 'framer-motion';
import { Loader2, Lock, WifiOff } from 'lucide-react';
import type { EntitlementStatus } from '@shared/types';

interface LockScreenProps {
  entitlement: EntitlementStatus;
  isRefreshing: boolean;
  onRefresh: () => void;
  onSignOut: () => void;
}

/**
 * Shown when the trial has expired or couldn't be verified (Beta Launch Plan
 * §6.4 fail-closed). Renders inside the content-protected overlay window. The
 * hard enforcement is in getApiKey() (no fragment → no key); this is the UX.
 */
export default function LockScreen({
  entitlement,
  isRefreshing,
  onRefresh,
  onSignOut,
}: LockScreenProps): JSX.Element {
  // 'unknown' (signed in but couldn't determine) gets the same "can't verify"
  // messaging as 'offline' — only a real 'expired' verdict says the trial ended.
  const offline = entitlement.status === 'offline' || entitlement.status === 'unknown';

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-bg-overlay rounded-lg select-none px-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex flex-col items-center text-center max-w-xs"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-error/15">
          {offline ? <WifiOff className="h-6 w-6 text-error" /> : <Lock className="h-6 w-6 text-error" />}
        </div>

        {offline ? (
          <>
            <h1 className="text-lg font-semibold text-text-primary">Can&apos;t verify your trial</h1>
            <p className="mt-1 text-sm text-text-secondary">
              InvisiQ needs an internet connection to confirm your trial. Reconnect and try again.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-text-primary">Your trial has ended</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Your 14-day InvisiQ trial is over. Paid plans are coming soon — thanks for trying the beta.
            </p>
          </>
        )}

        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isRefreshing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking…
            </>
          ) : (
            offline ? 'Retry' : 'Check again'
          )}
        </button>

        <button
          type="button"
          onClick={onSignOut}
          className="mt-3 text-xs text-text-secondary hover:text-text-primary transition-colors"
        >
          Sign out
        </button>
      </motion.div>
    </div>
  );
}
