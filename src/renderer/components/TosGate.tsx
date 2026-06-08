import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Loader2 } from 'lucide-react';

interface TosGateProps {
  onAccept: () => Promise<void> | void;
}

/**
 * Versioned T&C / beta-data notice (Beta Launch Plan §8). Blocks app use until
 * accepted; acceptance is logged to tos_acceptances as proof of disclosure.
 * Prominent (not buried) — explicitly discloses that prompt TEXT is stored.
 *
 * NOTE: placeholder copy — replace with counsel-reviewed terms + a real privacy
 * policy link before any public release.
 */
export default function TosGate({ onAccept }: TosGateProps): JSX.Element {
  const [busy, setBusy] = useState(false);

  const handleAccept = async (): Promise<void> => {
    setBusy(true);
    try {
      await onAccept();
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
        className="flex flex-col items-center text-center max-w-sm"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15">
          <FileText className="h-6 w-6 text-accent" />
        </div>

        <h1 className="text-lg font-semibold text-text-primary">Before you start</h1>

        <div className="mt-3 space-y-2 text-left text-xs leading-relaxed text-text-secondary">
          <p>
            During the beta, InvisiQ stores the <strong className="text-text-primary">text of the prompts you send</strong>,
            so we can understand what to build and improve the product.
          </p>
          <p>
            We store <strong className="text-text-primary">text only</strong> — never your screenshots or screen
            contents. API keys and obvious personal info are stripped before storage. Prompt data is
            deleted after 30 days, and you can wipe yours anytime in Settings → Privacy.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAccept}
          disabled={busy}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy ? 'Saving…' : 'I understand — continue'}
        </button>

        <p className="mt-3 text-[10px] text-text-placeholder">
          By continuing you accept the beta terms and prompt-logging disclosure.
        </p>
      </motion.div>
    </div>
  );
}
