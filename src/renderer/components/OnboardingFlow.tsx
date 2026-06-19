import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  KeyRound,
  Keyboard,
  Shield,
  Rocket,
  Check,
  ArrowRight,
  ArrowLeft,
  EyeOff,
  Zap,
  Lock,
} from 'lucide-react';
import OnboardingApiKey from './OnboardingApiKey';
import OnboardingHotkeys from './OnboardingHotkeys';
import OnboardingStealthTest from './OnboardingStealthTest';
import { InvisiQMark } from './ui/InvisiQLogo';
import { expoOut } from './ui/animations';

interface OnboardingFlowProps {
  onComplete: () => void;
}

type StepKey = 'welcome' | 'api' | 'hotkeys' | 'stealth' | 'done';

const STEPS: { key: StepKey; label: string; icon: typeof Sparkles }[] = [
  { key: 'welcome', label: 'Welcome', icon: Sparkles },
  { key: 'api', label: 'Connect AI', icon: KeyRound },
  { key: 'hotkeys', label: 'Shortcuts', icon: Keyboard },
  { key: 'stealth', label: 'Stealth', icon: Shield },
  { key: 'done', label: 'Ready', icon: Rocket },
];

// Onboarding canvas size (kept ≤ overlay maxWidth of 800)
const CANVAS_W = 760;
const CANVAS_H = 640;
const RESTORE_W = 420;
const RESTORE_H = 600;

const stepVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 28 : -28 }),
  center: { opacity: 1, x: 0, transition: expoOut },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? -28 : 28,
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] as const },
  }),
};

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps): JSX.Element {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [connected, setConnected] = useState(false);
  const finishedRef = useRef(false);

  const step = STEPS[index].key;

  // ── Take over the window: grow to a full canvas + make it focusable so the
  // API-key inputs accept keystrokes. Content protection stays ON the whole time,
  // so setup is still invisible to capture. Restored on finish. ──
  useEffect(() => {
    const api = window.ghostAPI;
    if (!api?.overlay) return;
    (async () => {
      try {
        await api.overlay.setStealthFocus(false);
      } catch {
        /* non-fatal */
      }
      try {
        await api.overlay.setSize(CANVAS_W, CANVAS_H);
        const sw = window.screen.availWidth || CANVAS_W;
        const sh = window.screen.availHeight || CANVAS_H;
        await api.overlay.setPosition(
          Math.max(0, Math.round((sw - CANVAS_W) / 2)),
          Math.max(0, Math.round((sh - CANVAS_H) / 2)),
        );
        await api.overlay.requestFocus();
      } catch {
        /* non-fatal */
      }
    })();
  }, []);

  const finish = async (): Promise<void> => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const api = window.ghostAPI;
    try {
      await api.store.set('onboardingComplete', true);
      await api.store.set('isFirstLaunch', false);
    } catch {
      /* continue even if store fails */
    }
    // Snap the window back to the compact overlay, bottom-right.
    try {
      await api.overlay.setSize(RESTORE_W, RESTORE_H);
      const sw = window.screen.availWidth || RESTORE_W;
      const sh = window.screen.availHeight || RESTORE_H;
      await api.overlay.setPosition(Math.max(0, sw - RESTORE_W - 20), Math.max(0, sh - RESTORE_H - 20));
    } catch {
      /* non-fatal */
    }
    // Re-arm default-on stealth focus unless the user explicitly disabled it.
    try {
      const stealth = (await api.store.get('stealth')) as { defaultOn?: boolean } | undefined;
      if (!stealth || stealth.defaultOn !== false) {
        await api.overlay.setStealthFocus(true);
      }
    } catch {
      try {
        await api.overlay.setStealthFocus(true);
      } catch {
        /* non-fatal */
      }
    }
    onComplete();
  };

  const go = (next: number): void => {
    if (next < 0 || next >= STEPS.length) return;
    setDir(next > index ? 1 : -1);
    setIndex(next);
  };

  const primaryLabel =
    step === 'welcome' ? 'Get started' : step === 'done' ? 'Launch InvisiQ' : 'Continue';

  const onPrimary = (): void => {
    if (step === 'done') {
      void finish();
    } else {
      go(index + 1);
    }
  };

  return (
    <div className="relative flex h-screen w-screen select-none overflow-hidden rounded-lg bg-bg-overlay text-text-primary">
      {/* ── Ambient backdrop ── */}
      <div className="pointer-events-none absolute inset-0 onb-aurora" />
      <div className="pointer-events-none absolute inset-0 onb-grid opacity-60" />
      <div
        className="onb-orb pointer-events-none absolute -left-16 top-24 h-56 w-56"
        style={{ background: 'rgba(20,184,166,0.18)' }}
      />
      <div
        className="onb-orb pointer-events-none absolute -right-10 bottom-0 h-64 w-64"
        style={{ background: 'rgba(139,92,246,0.14)', animationDelay: '1.5s' }}
      />

      {/* drag strip across the very top so the resized window can be repositioned */}
      <div className="drag-handle absolute inset-x-0 top-0 z-20 h-8" />

      {/* ── Left rail ── */}
      <aside className="relative z-10 flex w-[232px] flex-shrink-0 flex-col justify-between border-r border-border-subtle bg-surface-glass/[0.03] px-5 py-6 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <InvisiQMark size={32} className="rounded-lg shadow-glow-teal" />
            <span className="text-base font-semibold tracking-tight">InvisiQ</span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-text-secondary">
            Your AI copilot that sees everything, but is seen by no one.
          </p>

          <nav className="mt-7 space-y-1">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const state = i < index ? 'done' : i === index ? 'active' : 'todo';
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => i < index && go(i)}
                  className={[
                    'no-drag flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
                    state === 'active' ? 'bg-accent-primary/10' : 'hover:bg-bg-hover/40',
                    i < index ? '' : 'pointer-events-none',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border transition-colors',
                      state === 'done'
                        ? 'border-accent-primary/40 bg-accent-primary/15 text-accent-primary'
                        : state === 'active'
                          ? 'border-accent-primary bg-accent-primary text-bg-overlay'
                          : 'border-border-subtle bg-bg-input text-text-placeholder',
                    ].join(' ')}
                  >
                    {state === 'done' ? <Check size={14} /> : <Icon size={14} strokeWidth={1.9} />}
                  </span>
                  <span
                    className={[
                      'text-xs font-medium',
                      state === 'active'
                        ? 'text-text-primary'
                        : state === 'done'
                          ? 'text-text-secondary'
                          : 'text-text-placeholder',
                    ].join(' ')}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-text-placeholder">
          <Shield size={11} className="text-accent-primary/70" />
          Encrypted on-device · BYOK · Beta
        </div>
      </aside>

      {/* ── Right content ── */}
      <main className="relative z-10 flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-8 pb-4 pt-10">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="h-full"
            >
              {step === 'welcome' && <WelcomeStep />}
              {step === 'api' && <OnboardingApiKey onConnectedChange={setConnected} />}
              {step === 'hotkeys' && <OnboardingHotkeys />}
              {step === 'stealth' && <OnboardingStealthTest />}
              {step === 'done' && <DoneStep />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Footer nav ── */}
        <div className="flex items-center justify-between border-t border-border-subtle bg-surface-glass/[0.02] px-8 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            {index > 0 && step !== 'done' && (
              <button
                type="button"
                onClick={() => go(index - 1)}
                className="no-drag flex items-center gap-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}
            {step === 'api' && (
              <button
                type="button"
                onClick={() => go(index + 1)}
                className="no-drag text-xs text-text-placeholder transition-colors hover:text-text-secondary"
              >
                Skip for now
              </button>
            )}
            {step === 'done' && (
              <button
                type="button"
                onClick={() => go(index - 1)}
                className="no-drag flex items-center gap-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onPrimary}
            className="no-drag group flex items-center gap-2 rounded-xl bg-accent-primary px-5 py-2.5 text-sm font-semibold text-bg-overlay shadow-glow-teal transition-all hover:brightness-110 active:scale-[0.98]"
          >
            {primaryLabel}
            {step === 'done' ? (
              <Rocket size={15} />
            ) : (
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            )}
          </button>
        </div>
      </main>

      {/* hidden: keeps `connected` referenced for future rail badge use */}
      <span className="hidden">{connected ? '1' : '0'}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function WelcomeStep(): JSX.Element {
  const features = [
    { icon: EyeOff, title: 'Truly invisible', desc: 'Hidden from Zoom, Teams, Meet, OBS & proctors.' },
    { icon: Zap, title: 'Instant answers', desc: 'Screenshot or ask — streamed back in place.' },
    { icon: Lock, title: 'Yours alone', desc: 'Your API keys, encrypted, never leave your device.' },
  ];
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...expoOut, delay: 0.05 }}
        className="relative"
      >
        <div className="absolute inset-0 -z-10 animate-pulse-glow rounded-3xl" />
        <InvisiQMark size={72} className="rounded-2xl shadow-glow-teal" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...expoOut, delay: 0.12 }}
        className="mt-5 text-[28px] font-bold tracking-tight"
      >
        Welcome to <span className="ghost-gradient-text">InvisiQ</span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...expoOut, delay: 0.18 }}
        className="mt-2 max-w-md text-sm leading-relaxed text-text-secondary"
      >
        An AI overlay that lives on top of everything you do — and disappears from every screen but
        yours. Let's get you set up in under a minute.
      </motion.p>

      <div className="mt-8 grid w-full max-w-lg grid-cols-3 gap-3">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...expoOut, delay: 0.24 + i * 0.07 }}
              className="rounded-xl border border-border-subtle bg-surface-glass/[0.03] p-3.5 text-left"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary">
                <Icon size={15} strokeWidth={1.9} />
              </span>
              <div className="mt-2.5 text-xs font-semibold text-text-primary">{f.title}</div>
              <div className="mt-0.5 text-[10.5px] leading-snug text-text-secondary">{f.desc}</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function DoneStep(): JSX.Element {
  const recap = [
    { keys: 'Ctrl+Shift+G', label: 'Show / hide' },
    { keys: 'Ctrl+Shift+S', label: 'Capture screen' },
    { keys: 'Ctrl+Shift+I', label: 'Stealth typing' },
  ];
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
        InvisiQ will dock to the bottom-right of your screen. Summon it anytime with
        <kbd className="mx-1 rounded bg-bg-code px-1.5 py-0.5 font-mono text-[11px] text-text-primary">Ctrl+Shift+G</kbd>.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...expoOut, delay: 0.24 }}
        className="mt-7 flex gap-2.5"
      >
        {recap.map((r) => (
          <div
            key={r.keys}
            className="rounded-xl border border-border-subtle bg-surface-glass/[0.03] px-3.5 py-2.5 text-left"
          >
            <kbd className="font-mono text-[11px] font-semibold text-accent-primary">{r.keys}</kbd>
            <div className="mt-1 text-[10.5px] text-text-secondary">{r.label}</div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
