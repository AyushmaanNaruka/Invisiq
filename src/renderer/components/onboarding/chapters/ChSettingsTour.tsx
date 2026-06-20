import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Key, Keyboard, Monitor, Shield, Mic, Brain, Smartphone, Cpu } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import LessonScaffold, { type LessonStep } from '../shared/LessonScaffold';
import KeyChip from '../shared/KeyChip';

const SECTIONS: (LessonStep & { icon: LucideIcon })[] = [
  { icon: Key, title: 'API Keys', desc: 'Add or swap your OpenAI / Anthropic / Gemini keys. Encrypted on-device.' },
  { icon: Keyboard, title: 'Hotkeys', desc: 'Remap every shortcut and resolve conflicts.' },
  { icon: Monitor, title: 'Display', desc: 'Theme, opacity, window size, and which monitor it lives on.' },
  { icon: Shield, title: 'Privacy', desc: 'Stealth controls, process name, and clearing your data.' },
  { icon: Mic, title: 'Audio', desc: 'Speech engine, language, and the live meeting assistant.' },
  { icon: Brain, title: 'Memory', desc: 'Toggle auto-extraction and browse the facts InvisiQ remembers.' },
  { icon: Smartphone, title: 'Companion', desc: 'Start the pairing server and manage connected devices.' },
  { icon: Cpu, title: 'Resilience', desc: 'The stealth capture helper that powers stealth typing.' },
];

/** A mock of the real Settings panel — icon rail + content header — that cycles
 *  through the eight sections so the user recognizes it when they open the app. */
function SettingsMapDemo(): JSX.Element {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setActive((a) => (a + 1) % SECTIONS.length), 1400);
    return () => clearInterval(t);
  }, [reduce]);

  const Section = SECTIONS[active];
  return (
    <div className="mx-auto max-w-[440px] overflow-hidden rounded-xl border border-border-subtle bg-bg-overlay shadow-ghost-lg">
      <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2 text-xs font-semibold text-text-primary">
        Settings
      </div>
      <div className="flex min-h-[150px]">
        {/* icon rail */}
        <div className="flex w-11 flex-col gap-1 border-r border-border-subtle py-2">
          {SECTIONS.map((s, i) => {
            const Icon = s.icon;
            return (
              <span
                key={s.title}
                className={`mx-1 flex items-center justify-center rounded-md p-2 transition-colors ${
                  i === active ? 'bg-accent-primary/15 text-accent-primary' : 'text-text-secondary'
                }`}
              >
                <Icon size={14} strokeWidth={1.8} />
              </span>
            );
          })}
        </div>
        {/* content */}
        <div className="flex-1 p-3.5">
          <div className="border-b border-border-subtle pb-2 text-xs font-medium text-text-primary">{Section.title}</div>
          <motion.p
            key={active}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2.5 text-[11px] leading-relaxed text-text-secondary"
          >
            {Section.desc}
          </motion.p>
        </div>
      </div>
    </div>
  );
}

/** Advanced chapter — where everything lives. Orients the user in Settings. */
export default function ChSettingsTour(): JSX.Element {
  return (
    <LessonScaffold
      eyebrow="Make it yours"
      headingIcon={Monitor}
      title="Everything’s in Settings"
      subtitle="Open Settings anytime to customize InvisiQ. Eight sections, one icon sidebar."
      demo={<SettingsMapDemo />}
      steps={SECTIONS}
      note={
        <>
          Open Settings with <KeyChip keys="Ctrl+," size="sm" /> or the gear icon in the header. You
          can replay this tour anytime from Settings → Account.
        </>
      }
    />
  );
}
