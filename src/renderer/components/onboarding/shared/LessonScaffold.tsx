import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { staggerContainer, staggerItem } from '../../ui/animations';
import ChapterHeading from './ChapterHeading';
import KeyChip from './KeyChip';
import type { ReactNode } from 'react';

export interface LessonStep {
  icon: LucideIcon;
  title: string;
  desc: string;
  keys?: string;
}

interface LessonScaffoldProps {
  eyebrow?: string;
  headingIcon?: LucideIcon;
  title: string;
  subtitle?: string;
  steps: LessonStep[];
  /** Optional interactive demo rendered above the step list (Phase B fills these in). */
  demo?: ReactNode;
  /** Optional footnote (e.g. a "try it live after launch" nudge). */
  note?: ReactNode;
}

/**
 * Shared lesson layout: heading → optional interactive demo → animated step list →
 * optional note. Every teaching chapter is built on this so the academy reads as a
 * single, coherent product. Phase B passes a `demo` (SimOverlay/SimChat) into the
 * core chapters; the step list still teaches even without it.
 */
export default function LessonScaffold({
  eyebrow,
  headingIcon,
  title,
  subtitle,
  steps,
  demo,
  note,
}: LessonScaffoldProps): JSX.Element {
  return (
    <div className="flex h-full flex-col">
      <ChapterHeading icon={headingIcon} eyebrow={eyebrow} title={title} subtitle={subtitle} />

      {demo && <div className="mt-5">{demo}</div>}

      <motion.ol
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="mt-5 space-y-2.5"
      >
        {steps.map((s) => {
          const Icon = s.icon;
          return (
            <motion.li
              key={s.title}
              variants={staggerItem}
              className="flex items-center gap-3.5 rounded-xl border border-border-subtle bg-surface-glass/[0.03] px-3.5 py-2.5 transition-colors hover:border-accent-primary/30"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary">
                <Icon size={16} strokeWidth={1.9} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-text-primary">{s.title}</div>
                <div className="text-[11px] leading-snug text-text-secondary">{s.desc}</div>
              </div>
              {s.keys && (
                <div className="flex-shrink-0">
                  <KeyChip keys={s.keys} size="sm" />
                </div>
              )}
            </motion.li>
          );
        })}
      </motion.ol>

      {note && <div className="mt-4 text-[11px] leading-relaxed text-text-secondary">{note}</div>}
    </div>
  );
}
