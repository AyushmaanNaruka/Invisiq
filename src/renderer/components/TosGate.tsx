import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Loader2, Lock, Trash2, FileText } from 'lucide-react';
import { InvisiQMark } from './ui/InvisiQLogo';

interface TosGateProps {
  onAccept: () => Promise<void> | void;
}

/**
 * Versioned T&C / beta-data notice (Beta Launch Plan §8). Blocks app use until
 * accepted; acceptance is logged to tos_acceptances as proof of disclosure.
 * Prominent (not buried) — explicitly discloses that prompt TEXT is stored.
 *
 * The full beta terms also ship as the installer license page (build/license.txt).
 */
const POINTS = [
  {
    icon: FileText,
    title: 'Prompt text is stored',
    body: 'During the beta, the text of the prompts you send is stored so we can understand what to build and improve InvisiQ.',
  },
  {
    icon: Lock,
    title: 'Never your screen',
    body: 'We store text only — never your screenshots or screen contents. API keys and obvious personal info are stripped before storage.',
  },
  {
    icon: Trash2,
    title: 'Yours to delete',
    body: 'Prompt data is deleted after 30 days, and you can wipe yours anytime in Settings → Privacy.',
  },
];

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
    <div className="relative flex h-screen w-screen select-none items-center justify-center overflow-hidden rounded-lg bg-bg-overlay px-7">
      <div className="pointer-events-none absolute inset-0 onb-aurora opacity-80" />
      <div className="drag-handle absolute inset-x-0 top-0 z-20 h-8" />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex w-full max-w-sm flex-col items-center text-center"
      >
        <InvisiQMark size={40} className="rounded-xl shadow-glow-teal" />
        <h1 className="mt-4 text-lg font-semibold text-text-primary">Before you start</h1>
        <p className="mt-1 text-xs text-text-secondary">A quick, honest note about the beta.</p>

        <div className="mt-5 w-full space-y-2.5 text-left">
          {POINTS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="flex gap-3 rounded-xl border border-border-subtle bg-surface-glass/[0.03] p-3"
            >
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary">
                <Icon size={14} strokeWidth={1.9} />
              </span>
              <div>
                <div className="text-xs font-semibold text-text-primary">{title}</div>
                <div className="mt-0.5 text-[11px] leading-relaxed text-text-secondary">{body}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleAccept}
          disabled={busy}
          className="no-drag mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-primary px-4 py-2.5 text-sm font-semibold text-bg-overlay shadow-glow-teal transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {busy ? 'Saving…' : 'I understand — continue'}
        </button>

        <p className="mt-3 text-[10px] text-text-placeholder">
          By continuing you accept the beta terms and prompt-logging disclosure.
        </p>
      </motion.div>
    </div>
  );
}
