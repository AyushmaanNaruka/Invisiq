import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, CircleCheck, TriangleAlert, ScanLine } from 'lucide-react';
import { scaleIn } from './ui/animations';

export default function OnboardingStealthTest(): JSX.Element {
  const [testResult, setTestResult] = useState<'untested' | 'passed' | 'failed'>('untested');

  return (
    <div className="flex h-full flex-col">
      <div>
        <h2 className="text-2xl font-semibold text-text-primary">Prove the invisibility</h2>
        <p className="mt-1.5 text-sm text-text-secondary">
          InvisiQ is already shielded from screen capture. Let's confirm it on your machine — it
          takes ten seconds.
        </p>
      </div>

      {/* The probe target */}
      <div className="relative mt-5 overflow-hidden rounded-2xl border border-border-subtle bg-surface-glass/[0.03] p-5">
        <div className="onb-hairline pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden" />
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary">
            <ScanLine size={16} />
          </span>
          <ol className="space-y-1.5 text-xs leading-relaxed text-text-secondary">
            <li>
              1. Press <kbd className="rounded bg-bg-code px-1.5 py-0.5 font-mono text-[10px] text-text-primary">Win + Shift + S</kbd> to open Snipping Tool.
            </li>
            <li>2. Drag a box over the glowing card below.</li>
            <li>3. The card should be <span className="text-text-primary">absent</span> from your capture.</li>
          </ol>
        </div>

        {/* Test pattern — visible to the user, must NOT appear in any screen capture */}
        <div className="mt-4 rounded-xl border-2 border-dashed border-accent-primary/40 p-3.5 text-center">
          <div
            className="animate-pulse-glow rounded-lg p-4"
            style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 45%, #8b5cf6 100%)' }}
          >
            <span className="text-sm font-bold tracking-wide text-white drop-shadow">
              IF YOU SEE THIS IN A SCREENSHOT, STEALTH IS OFF
            </span>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {testResult === 'untested' && (
          <motion.div key="ask" variants={scaleIn} initial="hidden" animate="visible" exit="exit" className="mt-4">
            <p className="mb-2 text-center text-xs text-text-secondary">Did the card show up in your screenshot?</p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setTestResult('passed')}
                className="no-drag flex flex-1 items-center justify-center gap-2 rounded-xl border border-status-success/40 bg-status-success/10 px-3 py-2.5 text-sm font-medium text-status-success transition-colors hover:bg-status-success/20"
              >
                <CircleCheck size={16} /> No — it's invisible
              </button>
              <button
                type="button"
                onClick={() => setTestResult('failed')}
                className="no-drag flex flex-1 items-center justify-center gap-2 rounded-xl border border-status-error/40 bg-status-error/10 px-3 py-2.5 text-sm font-medium text-status-error transition-colors hover:bg-status-error/20"
              >
                <TriangleAlert size={16} /> Yes — I can see it
              </button>
            </div>
          </motion.div>
        )}

        {testResult === 'passed' && (
          <motion.div
            key="pass"
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="mt-4 flex items-center gap-3 rounded-xl border border-status-success/40 bg-status-success/10 p-4"
          >
            <Shield size={18} className="flex-shrink-0 text-status-success" />
            <p className="text-xs text-text-secondary">
              <span className="font-semibold text-status-success">Stealth confirmed.</span> InvisiQ is
              invisible to screen capture, recording, and proctoring tools. You're set.
            </p>
          </motion.div>
        )}

        {testResult === 'failed' && (
          <motion.div
            key="fail"
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="mt-4 rounded-xl border border-status-warning/40 bg-status-warning/10 p-4"
          >
            <div className="mb-2 flex items-center gap-2">
              <TriangleAlert size={16} className="text-status-warning" />
              <span className="text-sm font-semibold text-status-warning">Let's fix that</span>
            </div>
            <ul className="list-inside list-disc space-y-1 text-xs text-text-secondary">
              <li>Confirm you're on <span className="text-text-primary">Windows 10 2004+</span> or <span className="text-text-primary">Windows 11</span>.</li>
              <li><span className="text-text-primary">Restart the app</span> and re-test.</li>
              <li>Enable <span className="text-text-primary">hardware acceleration</span> in your system settings.</li>
              <li>Some virtual machines don't support content protection.</li>
            </ul>
            <button
              type="button"
              onClick={() => setTestResult('untested')}
              className="no-drag mt-3 text-xs font-medium text-accent-primary hover:underline"
            >
              Try again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
