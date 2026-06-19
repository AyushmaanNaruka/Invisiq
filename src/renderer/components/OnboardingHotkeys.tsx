import { motion } from 'framer-motion';
import { Eye, Camera, Crop, Keyboard, EyeOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { staggerContainer, staggerItem } from './ui/animations';

const SHORTCUTS: { keys: string; label: string; description: string; icon: LucideIcon }[] = [
  { keys: 'Ctrl+Shift+G', label: 'Toggle overlay', description: 'Summon or dismiss InvisiQ instantly', icon: Eye },
  { keys: 'Ctrl+Shift+S', label: 'Capture screen', description: 'Screenshot everything and ask the AI', icon: Camera },
  { keys: 'Ctrl+Shift+R', label: 'Capture region', description: 'Snip just the part that matters', icon: Crop },
  { keys: 'Ctrl+Shift+I', label: 'Stealth typing', description: 'Type from any app — keystrokes stay off-screen', icon: Keyboard },
  { keys: 'Escape', label: 'Panic hide', description: 'Vanish the overlay the instant you need to', icon: EyeOff },
];

function KeyCombo({ keys }: { keys: string }): JSX.Element {
  const parts = keys.split('+');
  return (
    <div className="flex items-center gap-1">
      {parts.map((key, i) => (
        <span key={i} className="flex items-center">
          <kbd className="inline-block rounded-md border border-border-subtle bg-bg-code px-2 py-1 font-mono text-[11px] font-semibold text-text-primary shadow-ghost-sm">
            {key}
          </kbd>
          {i < parts.length - 1 && <span className="mx-0.5 text-xs text-text-placeholder">+</span>}
        </span>
      ))}
    </div>
  );
}

export default function OnboardingHotkeys(): JSX.Element {
  return (
    <div className="flex h-full flex-col">
      <div>
        <h2 className="text-2xl font-semibold text-text-primary">Drive it from anywhere</h2>
        <p className="mt-1.5 text-sm text-text-secondary">
          Global shortcuts work from inside any app — even while the overlay is hidden. Fully
          remappable later in Settings → Hotkeys.
        </p>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="mt-5 space-y-2.5"
      >
        {SHORTCUTS.map(({ keys, label, description, icon: Icon }) => (
          <motion.div
            key={keys}
            variants={staggerItem}
            className="flex items-center gap-3.5 rounded-xl border border-border-subtle bg-surface-glass/[0.03] px-3.5 py-2.5 transition-colors hover:border-accent-primary/30"
          >
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary">
              <Icon size={16} strokeWidth={1.9} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-text-primary">{label}</div>
              <div className="truncate text-[11px] text-text-secondary">{description}</div>
            </div>
            <div className="flex-shrink-0">
              <KeyCombo keys={keys} />
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
