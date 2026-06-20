import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Radio, Brain, History, Cpu, ClipboardPaste, Smartphone, FileDown, ArrowUpRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { staggerContainer, staggerItem } from '../../ui/animations';
import ChapterHeading from '../shared/ChapterHeading';
import TiltCard from '../shared/TiltCard';

interface Feature {
  icon: LucideIcon;
  title: string;
  desc: string;
}

const FEATURES: Feature[] = [
  { icon: Mic, title: 'Voice input', desc: 'Dictate your question hands-free — speech to text, in the input box.' },
  { icon: Radio, title: 'Live meeting assistant', desc: 'Transcribes system audio and surfaces answers to questions as they’re asked.' },
  { icon: Brain, title: 'Memory', desc: 'Remembers facts you teach it and weaves them into future answers.' },
  { icon: History, title: 'Conversation history', desc: 'Every chat is saved, searchable, and exportable.' },
  { icon: Cpu, title: 'Switch models', desc: 'Jump between OpenAI, Anthropic, and Gemini models on the fly.' },
  { icon: ClipboardPaste, title: 'Smart paste', desc: 'Drop an AI answer straight into the app you’re working in.' },
  { icon: Smartphone, title: 'Companion mode', desc: 'Pair your phone with a QR code to read answers on a second screen.' },
  { icon: FileDown, title: 'Export', desc: 'Save any conversation as Markdown, text, JSON, or PDF.' },
];

/**
 * Advanced chapter — the showcase gallery. A 3D-tilt grid of everything beyond the
 * core loop. Each card has a consistent hover micro-interaction (icon spring, a
 * hairline sweep across the top, and a "try after launch" reveal) so the section
 * feels alive without 8 bespoke animations.
 */
export default function ChGallery(): JSX.Element {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col">
      <ChapterHeading
        eyebrow="Beyond the basics"
        title="Power features"
        subtitle="You don’t need these on day one — but they’re here when you do. Hover any card, then explore them after launch from the input bar and Settings."
      />

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="mt-5 grid grid-cols-2 gap-3"
      >
        {FEATURES.map((f) => {
          const Icon = f.icon;
          const isHover = hovered === f.title;
          return (
            <motion.div key={f.title} variants={staggerItem}>
              <TiltCard
                intensity={6}
                className="group relative h-full overflow-hidden rounded-xl border border-border-subtle bg-surface-glass/[0.03] p-3.5 transition-colors hover:border-accent-primary/40"
              >
                <div
                  onMouseEnter={() => setHovered(f.title)}
                  onMouseLeave={() => setHovered((h) => (h === f.title ? null : h))}
                >
                  {/* hairline sweep on hover */}
                  {isHover && <div className="onb-hairline pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden" />}

                  <motion.span
                    animate={isHover ? { scale: 1.12, rotate: -4 } : { scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary"
                  >
                    <Icon size={15} strokeWidth={1.9} />
                  </motion.span>
                  <div className="mt-2.5 text-xs font-semibold text-text-primary">{f.title}</div>
                  <div className="mt-0.5 text-[10.5px] leading-snug text-text-secondary">{f.desc}</div>

                  <motion.div
                    animate={{ opacity: isHover ? 1 : 0, y: isHover ? 0 : 4 }}
                    transition={{ duration: 0.2 }}
                    className="mt-2 flex items-center gap-1 text-[10px] font-medium text-accent-primary"
                  >
                    Try it after launch <ArrowUpRight size={11} />
                  </motion.div>
                </div>
              </TiltCard>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
