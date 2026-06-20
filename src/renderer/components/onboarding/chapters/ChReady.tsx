import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { expoOut } from '../../ui/animations';
import KeyChip from '../shared/KeyChip';

const RECAP: { keys: string; label: string }[] = [
  { keys: 'Ctrl+Shift+G', label: 'Show / hide overlay' },
  { keys: 'Ctrl+Shift+S', label: 'Capture screen → ask AI' },
  { keys: 'Ctrl+Shift+R', label: 'Capture a region' },
  { keys: 'Ctrl+Shift+I', label: 'Stealth typing on / off' },
  { keys: 'Ctrl+Shift+Q', label: 'Panic — vanish instantly' },
  { keys: 'Escape', label: 'Hide overlay (and release typing)' },
];

/** Final chapter — celebrate + leave a cheat-sheet on screen. */
export default function ChReady(): JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 22 }}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-primary/15 shadow-glow-teal"
      >
        <Check size={30} className="text-accent-primary" strokeWidth={2.4} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...expoOut, delay: 0.1 }}
        className="mt-5 text-[26px] font-bold tracking-tight"
      >
        You're <span className="ghost-gradient-text">invisible</span>.
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...expoOut, delay: 0.16 }}
        className="mt-2 max-w-sm text-sm text-text-secondary"
      >
        InvisiQ docks to the bottom-right of your screen. Summon it anytime with{' '}
        <KeyChip keys="Ctrl+Shift+G" size="sm" />. Here are the shortcuts worth remembering — you can
        remap them all in Settings → Hotkeys.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...expoOut, delay: 0.24 }}
        className="mt-7 grid w-full max-w-lg grid-cols-2 gap-2.5"
      >
        {RECAP.map((r) => (
          <div
            key={r.keys}
            className="flex items-center justify-between gap-2 rounded-xl border border-border-subtle bg-surface-glass/[0.03] px-3 py-2.5 text-left"
          >
            <span className="text-[11px] text-text-secondary">{r.label}</span>
            <KeyChip keys={r.keys} size="sm" />
          </div>
        ))}
      </motion.div>
    </div>
  );
}
