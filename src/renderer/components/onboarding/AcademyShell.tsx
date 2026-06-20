import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight, ArrowLeft, Rocket, Shield } from 'lucide-react';
import { InvisiQMark } from '../ui/InvisiQLogo';
import { chapterStep } from '../ui/animations';
import { chaptersForMode, type AcademyMode, type ChapterDef, type ChapterGroup } from './chapters';

interface AcademyShellProps {
  mode: AcademyMode;
  onComplete: () => void;
}

// Onboarding canvas size (width is the overlay's hard maxWidth of 800 — larger is
// silently clamped by setOverlaySize, so don't exceed it).
const CANVAS_W = 800;
const CANVAS_H = 660;
const RESTORE_W = 420;
const RESTORE_H = 600;

/**
 * The InvisiQ Academy shell — a chapter-driven, premium onboarding/walkthrough
 * surface. Generalizes the old fixed-step OnboardingFlow: it owns the ambient
 * backdrop, the grouped chapter rail with progress, the animated chapter stage,
 * the footer nav (Back / Skip / Continue / Launch), keyboard navigation, and the
 * window takeover (grow to a focusable canvas, restore the compact overlay + re-arm
 * stealth on finish).
 *
 * `mode='first-run'` runs the full flow and marks onboarding complete on finish.
 * `mode='replay'` (launched from Settings) hides functional setup steps and does
 * NOT touch onboarding/setup state.
 */
export default function AcademyShell({ mode, onComplete }: AcademyShellProps): JSX.Element {
  const chapters = useMemo(() => chaptersForMode(mode), [mode]);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const finishedRef = useRef(false);

  const current = chapters[index];
  const isLast = index === chapters.length - 1;

  // ── Window takeover: grow to a full canvas + make focusable so inputs accept
  // keystrokes. Content protection stays ON the whole time. Restored on finish. ──
  useEffect(() => {
    const api = window.ghostAPI;
    if (!api?.overlay) return;
    void (async () => {
      try {
        await api.overlay.setStealthFocus(false);
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

  const go = (next: number): void => {
    if (next < 0 || next >= chapters.length) return;
    setDir(next > index ? 1 : -1);
    setIndex(next);
  };

  const finish = async (): Promise<void> => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const api = window.ghostAPI;

    // Only the real first-run marks onboarding complete; a replay must not touch it.
    if (mode === 'first-run') {
      try {
        await api.store.set('onboardingComplete', true);
        await api.store.set('isFirstLaunch', false);
      } catch {
        /* continue even if store fails */
      }
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

  const onPrimary = (): void => {
    if (isLast) void finish();
    else go(index + 1);
  };

  // Keyboard navigation: ←/→ move, Enter advances. (Escape is intentionally NOT
  // bound — it's a global panic/hide hotkey; closing the tour is an explicit click.)
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (isLast) void finish();
        else go(index + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(index - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onPrimary();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, isLast]);

  // Group chapters for the rail (preserves manifest order).
  const groups = useMemo(() => {
    const out: { group: ChapterGroup; items: { ch: ChapterDef; i: number }[] }[] = [];
    chapters.forEach((ch, i) => {
      const last = out[out.length - 1];
      if (last && last.group === ch.group) last.items.push({ ch, i });
      else out.push({ group: ch.group, items: [{ ch, i }] });
    });
    return out;
  }, [chapters]);

  const Current = current.Component;
  const progressPct = Math.round((index / (chapters.length - 1)) * 100);

  return (
    <div className="relative flex h-screen w-screen select-none overflow-hidden rounded-lg bg-bg-overlay text-text-primary">
      {/* ── Ambient backdrop ── */}
      <div className="pointer-events-none absolute inset-0 onb-aurora" />
      <div className="pointer-events-none absolute inset-0 onb-grid opacity-60" />
      <div className="onb-orb pointer-events-none absolute -left-16 top-24 h-56 w-56" style={{ background: 'rgba(20,184,166,0.18)' }} />
      <div className="onb-orb pointer-events-none absolute -right-10 bottom-0 h-64 w-64" style={{ background: 'rgba(139,92,246,0.14)', animationDelay: '1.5s' }} />

      {/* drag strip so the resized window can be repositioned */}
      <div className="drag-handle absolute inset-x-0 top-0 z-20 h-8" />

      {/* ── Left rail ── */}
      <aside className="relative z-10 flex w-[244px] flex-shrink-0 flex-col justify-between border-r border-border-subtle bg-surface-glass/[0.03] px-5 py-6 backdrop-blur-xl">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex items-center gap-2.5">
            <InvisiQMark size={30} className="rounded-lg shadow-glow-teal" />
            <div>
              <div className="text-sm font-semibold leading-none tracking-tight">InvisiQ</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-accent-primary/80">Academy</div>
            </div>
          </div>

          {/* progress bar */}
          <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-bg-input">
            <motion.div
              className="h-full rounded-full bg-accent-primary"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>

          <nav className="mt-5 space-y-4">
            {groups.map((grp) => (
              <div key={grp.group}>
                <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-placeholder">
                  {grp.group}
                </div>
                <div className="mt-1.5 space-y-0.5">
                  {grp.items.map(({ ch, i }) => {
                    const state = i < index ? 'done' : i === index ? 'active' : 'todo';
                    const Icon = ch.icon;
                    return (
                      <button
                        key={ch.key}
                        type="button"
                        onClick={() => i <= index && go(i)}
                        className={[
                          'no-drag flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors',
                          state === 'active' ? 'bg-accent-primary/10' : 'hover:bg-bg-hover/40',
                          i <= index ? '' : 'pointer-events-none',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border transition-colors',
                            state === 'done'
                              ? 'border-accent-primary/40 bg-accent-primary/15 text-accent-primary'
                              : state === 'active'
                                ? 'border-accent-primary bg-accent-primary text-bg-overlay'
                                : 'border-border-subtle bg-bg-input text-text-placeholder',
                          ].join(' ')}
                        >
                          {state === 'done' ? <Check size={12} /> : <Icon size={12} strokeWidth={2} />}
                        </span>
                        <span
                          className={[
                            'text-[12px] font-medium',
                            state === 'active' ? 'text-text-primary' : state === 'done' ? 'text-text-secondary' : 'text-text-placeholder',
                          ].join(' ')}
                        >
                          {ch.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1.5 pt-4 text-[10px] text-text-placeholder">
          <Shield size={11} className="text-accent-primary/70" />
          Encrypted on-device · BYOK · Beta
        </div>
      </aside>

      {/* ── Right content ── */}
      <main className="relative z-10 flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-8 pb-4 pt-10">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={current.key}
              custom={dir}
              variants={chapterStep}
              initial="enter"
              animate="center"
              exit="exit"
              className="h-full"
            >
              <Current />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Footer nav ── */}
        <div className="flex items-center justify-between border-t border-border-subtle bg-surface-glass/[0.02] px-8 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            {index > 0 && (
              <button
                type="button"
                onClick={() => go(index - 1)}
                className="no-drag flex items-center gap-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}
            {!isLast && (
              <button
                type="button"
                onClick={() => void finish()}
                className="no-drag text-xs text-text-placeholder transition-colors hover:text-text-secondary"
              >
                Skip tour
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onPrimary}
            className="no-drag group flex items-center gap-2 rounded-xl bg-accent-primary px-5 py-2.5 text-sm font-semibold text-bg-overlay shadow-glow-teal transition-all hover:brightness-110 active:scale-[0.98]"
          >
            {isLast ? (mode === 'replay' ? 'Done' : 'Launch InvisiQ') : 'Continue'}
            {isLast ? <Rocket size={15} /> : <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />}
          </button>
        </div>
      </main>
    </div>
  );
}
