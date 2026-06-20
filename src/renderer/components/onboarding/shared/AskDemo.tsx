import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import SimOverlay from './SimOverlay';

const QUESTION = 'Explain binary search like I have 30 seconds.';
const ANSWER =
  'Binary search finds a target in a sorted list by halving the search range each step: check the middle, then keep the half that could contain it. O(log n) — a million items in ~20 checks.';

interface Bubble {
  role: 'user' | 'ai';
  text: string;
}

const sleep = (ms: number): Promise<void> => new Promise((res) => setTimeout(res, ms));

/**
 * Self-driving demo of the everyday ask→answer loop, rendered inside a mock
 * overlay: the question types into the input, becomes a bubble, then the adaptive
 * answer streams in token-by-token. Replayable; reduced-motion shows the final
 * state instantly with no looping.
 */
export default function AskDemo(): JSX.Element {
  const reduce = useReducedMotion();
  const [input, setInput] = useState('');
  const [caret, setCaret] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [running, setRunning] = useState(true);
  const [runId, setRunId] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduce) {
      setBubbles([{ role: 'user', text: QUESTION }, { role: 'ai', text: ANSWER }]);
      setRunning(false);
      return;
    }
    const signal = { cancelled: false };
    setRunning(true);
    setInput('');
    setBubbles([]);
    setCaret(true);

    void (async () => {
      // 1 · type the question into the input
      for (let i = 1; i <= QUESTION.length && !signal.cancelled; i++) {
        setInput(QUESTION.slice(0, i));
        await sleep(26);
      }
      if (signal.cancelled) return;
      await sleep(360);
      // 2 · send → becomes a user bubble
      setInput('');
      setCaret(false);
      setBubbles([{ role: 'user', text: QUESTION }]);
      await sleep(420);
      // 3 · AI bubble streams in
      setBubbles((b) => [...b, { role: 'ai', text: '' }]);
      for (let i = 1; i <= ANSWER.length && !signal.cancelled; i++) {
        setBubbles((b) => {
          const next = [...b];
          next[next.length - 1] = { role: 'ai', text: ANSWER.slice(0, i) };
          return next;
        });
        await sleep(14);
      }
      if (!signal.cancelled) setRunning(false);
    })();

    return () => {
      signal.cancelled = true;
    };
  }, [runId, reduce]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [bubbles]);

  return (
    <div className="relative mx-auto max-w-[420px]">
      <SimOverlay inputValue={input} caret={caret} placeholder="Ask anything…">
        <AnimatePresence initial={false}>
          {bubbles.map((b, i) => (
            <motion.div
              key={`${runId}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${b.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-2.5 py-1.5 text-[11px] leading-relaxed ${
                  b.role === 'user'
                    ? 'bg-bubble-user text-white'
                    : 'bg-bubble-ai text-text-primary'
                }`}
              >
                {b.text}
                {b.role === 'ai' && running && b.text.length > 0 && <span className="onb-caret" />}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={endRef} />
      </SimOverlay>

      {!running && !reduce && (
        <button
          type="button"
          onClick={() => setRunId((n) => n + 1)}
          className="absolute -bottom-7 right-0 flex items-center gap-1 text-[11px] font-medium text-text-secondary transition-colors hover:text-accent-primary"
        >
          <RotateCcw size={12} /> Replay
        </button>
      )}
    </div>
  );
}
