import { motion, useReducedMotion } from 'framer-motion';

interface KeyChipProps {
  /** A combo like "Ctrl+Shift+I" or a single key like "Escape". */
  keys: string;
  /** Pulse the chip as if pressed (used to choreograph a lesson). */
  pressed?: boolean;
  size?: 'sm' | 'md';
}

/**
 * A keyboard-combo chip with an optional "pressed" pulse. Supersedes the inline
 * KeyCombo in OnboardingHotkeys so every chapter renders shortcuts identically and
 * can choreograph key presses during a simulated lesson. Reduced-motion safe.
 */
export default function KeyChip({ keys, pressed = false, size = 'md' }: KeyChipProps): JSX.Element {
  const reduce = useReducedMotion();
  const parts = keys.split('+');
  const pad = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-[11px]';

  return (
    <span className="inline-flex items-center gap-0.5 align-middle">
      {parts.map((key, i) => (
        <span key={i} className="inline-flex items-center">
          <motion.kbd
            animate={
              pressed && !reduce
                ? { scale: [1, 0.88, 1], backgroundColor: 'rgba(20,184,166,0.28)' }
                : { scale: 1 }
            }
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className={`inline-block rounded-md border border-border-subtle bg-bg-code font-mono font-semibold text-text-primary shadow-ghost-sm ${pad} ${
              pressed ? 'border-accent-primary/60 text-accent-primary' : ''
            }`}
          >
            {key}
          </motion.kbd>
          {i < parts.length - 1 && <span className="mx-0.5 text-xs text-text-placeholder">+</span>}
        </span>
      ))}
    </span>
  );
}
