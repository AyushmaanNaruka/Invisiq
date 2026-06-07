import { motion } from 'framer-motion';
import { Loader2, ShieldCheck } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => void;
  isBusy: boolean;
  error: string | null;
}

/**
 * Pre-app sign-in gate (Beta Launch Plan §7). Renders inside the overlay
 * window (already content-protected, so invisible to capture). The actual
 * Google flow happens in the system browser via shell.openExternal.
 */
export default function LoginScreen({ onLogin, isBusy, error }: LoginScreenProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-bg-overlay rounded-lg select-none px-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex flex-col items-center text-center max-w-xs"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15">
          <ShieldCheck className="h-6 w-6 text-accent" />
        </div>

        <h1 className="text-lg font-semibold text-text-primary">Welcome to InvisiQ</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Sign in to start your 14-day trial. Your browser will open to continue with Google.
        </p>

        <button
          type="button"
          onClick={onLogin}
          disabled={isBusy}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isBusy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Waiting for sign-in…
            </>
          ) : (
            'Continue with Google'
          )}
        </button>

        {isBusy && (
          <p className="mt-3 text-xs text-text-secondary">
            Complete sign-in in your browser, then return here.
          </p>
        )}

        {error && (
          <p className="mt-3 text-xs text-error">
            Sign-in failed: {error}
          </p>
        )}
      </motion.div>
    </div>
  );
}
