import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { RotateCcw, Image } from 'lucide-react';
import SimOverlay from './SimOverlay';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

type Phase = 'idle' | 'selecting' | 'flash' | 'attached' | 'done';

/**
 * Demonstrates region capture: a marching-ants selection box draws over a mock
 * screen, a capture flash fires, then the cropped shot appears as an attachment in
 * the overlay's input — exactly the Ctrl+Shift+R flow. Reduced-motion shows the
 * attached end-state.
 */
export default function CaptureDemo(): JSX.Element {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('idle');
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    if (reduce) {
      setPhase('attached');
      return;
    }
    let cancelled = false;
    void (async () => {
      setPhase('idle');
      await sleep(600);
      if (cancelled) return;
      setPhase('selecting');
      await sleep(900);
      if (cancelled) return;
      setPhase('flash');
      await sleep(220);
      if (cancelled) return;
      setPhase('attached');
      await sleep(900);
      if (!cancelled) setPhase('done');
    })();
    return () => {
      cancelled = true;
    };
  }, [runId, reduce]);

  const selecting = phase === 'selecting' || phase === 'flash';
  const attached = phase === 'attached' || phase === 'done';

  return (
    <div className="relative mx-auto max-w-[440px]">
      {/* Mock screen */}
      <div className="relative overflow-hidden rounded-xl border border-border-subtle bg-bg-input/50 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-text-placeholder">Your screen</div>
        <div className="mt-2 space-y-1.5">
          <div className="h-2 w-3/4 rounded bg-text-placeholder/20" />
          <div className="h-2 w-full rounded bg-text-placeholder/15" />
          <div className="h-2 w-5/6 rounded bg-text-placeholder/15" />
          <div className="h-2 w-2/3 rounded bg-text-placeholder/20" />
        </div>

        {/* selection rectangle */}
        <AnimatePresence>
          {selecting && (
            <motion.div
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-[18%] top-[42%] h-[42%] w-[55%] rounded border-2 border-dashed border-accent-primary bg-accent-primary/10"
            />
          )}
        </AnimatePresence>

        {/* capture flash */}
        <AnimatePresence>
          {phase === 'flash' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="pointer-events-none absolute inset-0 bg-white"
            />
          )}
        </AnimatePresence>
      </div>

      {/* Overlay with attached screenshot */}
      <div className="mt-3">
        <SimOverlay placeholder="Ask about this capture…">
          <AnimatePresence>
            {attached && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-input px-2 py-1.5"
              >
                <span className="flex h-9 w-12 items-center justify-center rounded border border-accent-primary/30 bg-accent-primary/10 text-accent-primary">
                  <Image size={14} />
                </span>
                <span className="text-[11px] text-text-secondary">Screenshot attached · ready to ask</span>
              </motion.div>
            )}
          </AnimatePresence>
          {!attached && (
            <div className="flex items-center justify-center py-3 text-[11px] text-text-placeholder">
              Press the shortcut to snip a region…
            </div>
          )}
        </SimOverlay>
      </div>

      {phase === 'done' && !reduce && (
        <button
          type="button"
          onClick={() => setRunId((n) => n + 1)}
          className="mx-auto mt-2 flex items-center gap-1 text-[11px] font-medium text-text-secondary transition-colors hover:text-accent-primary"
        >
          <RotateCcw size={12} /> Replay
        </button>
      )}
    </div>
  );
}
