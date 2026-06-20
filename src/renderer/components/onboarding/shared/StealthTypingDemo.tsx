import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { RotateCcw, ArrowDown } from 'lucide-react';
import SimOverlay from './SimOverlay';
import KeyChip from './KeyChip';

const SIM_TEXT = 'The complexity is O(log n).';
const EXAM_BACK = 'now typing here again…';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

type Phase = 'idle' | 'arming' | 'typing-sim' | 'releasing' | 'typing-exam' | 'done';

/**
 * The headline lesson, made visual. A mock "exam portal" sits behind the InvisiQ
 * overlay. The demo choreographs the full cycle the beta reviewer was missing:
 *   arm (Ctrl+Shift+I) → type into InvisiQ while the exam field stays empty →
 *   release (Esc) → keystrokes return to the exam field.
 * Reduced-motion shows an annotated armed state instead of looping.
 */
export default function StealthTypingDemo(): JSX.Element {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('idle');
  const [simInput, setSimInput] = useState('');
  const [examInput, setExamInput] = useState('');
  const [pressed, setPressed] = useState<'arm' | 'release' | null>(null);
  const [runId, setRunId] = useState(0);

  const armed = phase === 'arming' || phase === 'typing-sim';
  const simCaret = phase === 'typing-sim';
  const examActive = phase === 'typing-exam';

  useEffect(() => {
    if (reduce) {
      setPhase('typing-sim');
      setSimInput(SIM_TEXT);
      setExamInput('');
      return;
    }
    let cancelled = false;
    setSimInput('');
    setExamInput('');
    setPressed(null);

    void (async () => {
      setPhase('idle');
      await sleep(900);
      if (cancelled) return;
      // arm
      setPressed('arm');
      setPhase('arming');
      await sleep(700);
      if (cancelled) return;
      setPressed(null);
      // type into InvisiQ — exam field stays empty
      setPhase('typing-sim');
      for (let i = 1; i <= SIM_TEXT.length && !cancelled; i++) {
        setSimInput(SIM_TEXT.slice(0, i));
        await sleep(40);
      }
      if (cancelled) return;
      await sleep(800);
      // release
      setPressed('release');
      setPhase('releasing');
      await sleep(700);
      if (cancelled) return;
      setPressed(null);
      // now keys land in the exam field
      setPhase('typing-exam');
      for (let i = 1; i <= EXAM_BACK.length && !cancelled; i++) {
        setExamInput(EXAM_BACK.slice(0, i));
        await sleep(38);
      }
      if (!cancelled) setPhase('done');
    })();

    return () => {
      cancelled = true;
    };
  }, [runId, reduce]);

  const caption =
    phase === 'idle'
      ? 'You’re working in another app. InvisiQ floats on top.'
      : armed
        ? 'Armed — your keystrokes now flow into InvisiQ, not the app behind it.'
        : phase === 'releasing'
          ? 'Releasing…'
          : examActive || phase === 'done'
            ? 'Released — keystrokes go right back to your app.'
            : '';

  return (
    <div className="relative">
      {/* control chips */}
      <div className="mb-3 flex items-center gap-3 text-[11px] text-text-secondary">
        <span className="flex items-center gap-1.5">
          Arm <KeyChip keys="Ctrl+Shift+I" size="sm" pressed={pressed === 'arm'} />
        </span>
        <span className="flex items-center gap-1.5">
          Release <KeyChip keys="Escape" size="sm" pressed={pressed === 'release'} />
        </span>
      </div>

      <div className="relative">
        {/* Mock exam app (behind) */}
        <div className="rounded-xl border border-border-subtle bg-bg-input/60 p-3.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-text-placeholder">Exam Portal</div>
          <div className="mt-1.5 text-[11px] text-text-secondary">Q3. What is the time complexity of binary search?</div>
          <div
            className={`mt-2 flex items-center rounded-md border bg-bg-overlay px-2 py-1.5 text-[11px] ${
              examActive ? 'border-accent-amber/60 ring-1 ring-accent-amber/30' : 'border-border-subtle'
            }`}
          >
            {examInput ? (
              <span className="text-text-primary">
                {examInput}
                {examActive && <span className="onb-caret" />}
              </span>
            ) : (
              <span className="text-text-placeholder">
                Your answer…
                {examActive && <span className="onb-caret" />}
              </span>
            )}
          </div>
          {/* "nothing lands here" marker while armed */}
          {armed && simInput.length > 0 && !reduce && (
            <motion.div
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-1 flex items-center gap-1 text-[10px] font-medium text-accent-amber"
            >
              <ArrowDown size={11} /> nothing lands here while stealth typing is on
            </motion.div>
          )}
        </div>

        {/* InvisiQ overlay (in front, offset) */}
        <div className="relative z-10 mx-auto mt-3 max-w-[400px]">
          <SimOverlay armed={armed} inputValue={simInput} caret={simCaret} placeholder="Stealth typing — type anywhere…">
            <div className="flex items-center justify-center py-4 text-[11px] text-text-placeholder">
              {simInput ? 'Capturing your keystrokes…' : 'Your draft appears here'}
            </div>
          </SimOverlay>
        </div>
      </div>

      {/* caption */}
      <div className="mt-3 min-h-[18px] text-center text-[11px] font-medium text-accent-primary">{caption}</div>

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
