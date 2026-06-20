import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import SimOverlay from './SimOverlay';
import KeyChip from './KeyChip';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

type Phase = 'visible' | 'hidden' | 'reshown' | 'panic' | 'done';

/**
 * Shows that visibility is one keystroke away: toggle hide/show with Ctrl+Shift+G,
 * then a panic (Ctrl+Shift+Q) makes the overlay vanish instantly. Reinforces that
 * hiding also releases stealth typing. Reduced-motion shows the visible state.
 */
export default function ControlDemo(): JSX.Element {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('visible');
  const [pressed, setPressed] = useState<'toggle' | 'panic' | null>(null);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    if (reduce) {
      setPhase('visible');
      return;
    }
    let cancelled = false;
    void (async () => {
      setPressed(null);
      setPhase('visible');
      await sleep(900);
      if (cancelled) return;
      setPressed('toggle');
      setPhase('hidden');
      await sleep(800);
      if (cancelled) return;
      setPressed('toggle');
      setPhase('reshown');
      await sleep(900);
      if (cancelled) return;
      setPressed('panic');
      setPhase('panic');
      await sleep(700);
      if (!cancelled) {
        setPressed(null);
        setPhase('done');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [runId, reduce]);

  const isHidden = phase === 'hidden' || phase === 'panic' || phase === 'done';
  const caption =
    phase === 'hidden'
      ? 'Hidden — and stealth typing is released with it.'
      : phase === 'panic' || phase === 'done'
        ? 'Panic — gone in an instant.'
        : 'On screen, for your eyes only.';

  return (
    <div className="relative mx-auto max-w-[400px]">
      <div className="mb-3 flex items-center gap-3 text-[11px] text-text-secondary">
        <span className="flex items-center gap-1.5">
          Show / hide <KeyChip keys="Ctrl+Shift+G" size="sm" pressed={pressed === 'toggle'} />
        </span>
        <span className="flex items-center gap-1.5">
          Panic <KeyChip keys="Ctrl+Shift+Q" size="sm" pressed={pressed === 'panic'} />
        </span>
      </div>

      <div className="min-h-[180px]">
        <SimOverlay hidden={isHidden} placeholder="Ask anything…">
          <div className="flex items-center justify-center py-5 text-[11px] text-text-placeholder">
            Your overlay
          </div>
        </SimOverlay>
      </div>

      <div className="mt-2 min-h-[18px] text-center text-[11px] font-medium text-accent-primary">{caption}</div>

      {phase === 'done' && !reduce && (
        <button
          type="button"
          onClick={() => setRunId((n) => n + 1)}
          className="mx-auto mt-1 flex items-center gap-1 text-[11px] font-medium text-text-secondary transition-colors hover:text-accent-primary"
        >
          <RotateCcw size={12} /> Replay
        </button>
      )}
    </div>
  );
}
