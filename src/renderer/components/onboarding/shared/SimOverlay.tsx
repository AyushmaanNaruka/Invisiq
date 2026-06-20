import { motion } from 'framer-motion';
import { Camera, Mic, Keyboard, Send } from 'lucide-react';
import type { ReactNode } from 'react';
import { InvisiQGhost } from '../../ui/InvisiQLogo';

interface SimOverlayProps {
  /** Body content — chat bubbles, a streamed answer, etc. */
  children?: ReactNode;
  /** Reflect stealth-typing armed state (glowing input + banner). */
  armed?: boolean;
  /** Dim/scale the whole overlay to demonstrate hide. */
  hidden?: boolean;
  /** Text shown in the input box (the caret/typing demos drive this). */
  inputValue?: string;
  /** Show a blinking caret at the end of the input value. */
  caret?: boolean;
  /** Placeholder when input is empty. */
  placeholder?: string;
  /** Optional model pill label in the header. */
  model?: string;
  className?: string;
}

/**
 * A faithful, non-functional mock of the real InvisiQ overlay used to *show* how
 * features work inside the academy. Mirrors the real chrome (header with mascot +
 * model pill, chat body, input row with the same action buttons) and the real
 * stealth-typing affordances (armed banner + glowing input border) so what the
 * user learns here matches what they'll see in the product.
 */
export default function SimOverlay({
  children,
  armed = false,
  hidden = false,
  inputValue = '',
  caret = false,
  placeholder = 'Ask anything…',
  model = 'GPT-4o',
  className = '',
}: SimOverlayProps): JSX.Element {
  return (
    <motion.div
      animate={{ opacity: hidden ? 0.12 : 1, scale: hidden ? 0.97 : 1, filter: hidden ? 'blur(2px)' : 'blur(0px)' }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`overflow-hidden rounded-xl border border-border-subtle bg-bg-overlay shadow-ghost-lg ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle bg-bg-header px-3 py-2">
        <div className="flex items-center gap-2">
          <InvisiQGhost size={16} />
          <span className="text-xs font-semibold text-text-primary">InvisiQ</span>
        </div>
        <span className="rounded-md border border-border-subtle bg-bg-input px-2 py-0.5 text-[10px] font-medium text-text-secondary">
          {model}
        </span>
      </div>

      {/* Body */}
      <div className="min-h-[120px] space-y-2 bg-bg-chat px-3 py-3">{children}</div>

      {/* Input row */}
      <div className="border-t border-border-subtle bg-bg-overlay px-2.5 py-2">
        {armed && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-1.5 flex items-center gap-1.5 rounded-md bg-accent-primary/15 px-2 py-1 text-[10px] font-medium text-accent-primary"
          >
            <Keyboard size={11} />
            Stealth typing is ON — keystrokes go to InvisiQ
          </motion.div>
        )}
        <div className="flex items-end gap-1.5">
          <Camera size={14} className="mb-1 shrink-0 text-text-secondary" />
          <Mic size={14} className="mb-1 shrink-0 text-text-secondary" />
          <Keyboard size={14} className={`mb-1 shrink-0 ${armed ? 'text-accent-primary' : 'text-text-secondary'}`} />
          <div
            className={`flex-1 rounded-lg border bg-bg-input px-2.5 py-1.5 text-xs ${
              armed ? 'border-accent-primary ring-1 ring-accent-primary/40' : 'border-border-subtle'
            }`}
          >
            {inputValue ? (
              <span className="text-text-primary">
                {inputValue}
                {caret && <span className="onb-caret" />}
              </span>
            ) : (
              <span className="text-text-placeholder">
                {placeholder}
                {caret && <span className="onb-caret" />}
              </span>
            )}
          </div>
          <span className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-primary text-bg-overlay">
            <Send size={12} />
          </span>
        </div>
      </div>
    </motion.div>
  );
}
