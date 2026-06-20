import { motion } from 'framer-motion';
import { EyeOff, Zap, Lock, Keyboard } from 'lucide-react';
import { InvisiQMark } from '../../ui/InvisiQLogo';
import { expoOut } from '../../ui/animations';
import TiltCard from '../shared/TiltCard';

const FEATURES = [
  { icon: EyeOff, title: 'Truly invisible', desc: 'Hidden from Zoom, Teams, Meet, OBS & proctors.' },
  { icon: Zap, title: 'Instant answers', desc: 'Screenshot or ask — streamed back in place.' },
  { icon: Keyboard, title: 'Type from anywhere', desc: 'Stealth typing keeps your keystrokes off-screen.' },
  { icon: Lock, title: 'Yours alone', desc: 'Your API keys, encrypted, never leave your device.' },
];

/** Chapter 0 — the hero. Sets the tone: premium, calm, confident. */
export default function ChWelcome(): JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <TiltCard intensity={14} className="relative">
        <div className="absolute inset-0 -z-10 animate-pulse-glow rounded-3xl" />
        <InvisiQMark size={80} className="rounded-2xl shadow-glow-teal" />
      </TiltCard>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...expoOut, delay: 0.1 }}
        className="mt-6 text-[30px] font-bold tracking-tight"
      >
        Welcome to <span className="ghost-gradient-text">InvisiQ</span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...expoOut, delay: 0.16 }}
        className="mt-2 max-w-md text-sm leading-relaxed text-text-secondary"
      >
        An AI copilot that lives on top of everything you do — and disappears from every screen but
        yours. This quick tour shows you how to use it. It takes about two minutes.
      </motion.p>

      <div className="mt-8 grid w-full max-w-xl grid-cols-2 gap-3">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...expoOut, delay: 0.24 + i * 0.07 }}
              className="flex items-start gap-3 rounded-xl border border-border-subtle bg-surface-glass/[0.03] p-3.5 text-left"
            >
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary">
                <Icon size={15} strokeWidth={1.9} />
              </span>
              <div>
                <div className="text-xs font-semibold text-text-primary">{f.title}</div>
                <div className="mt-0.5 text-[10.5px] leading-snug text-text-secondary">{f.desc}</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
