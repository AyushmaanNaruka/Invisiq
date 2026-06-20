import { Keyboard, ShieldCheck, CornerDownLeft, EyeOff } from 'lucide-react';
import LessonScaffold, { type LessonStep } from '../shared/LessonScaffold';
import KeyChip from '../shared/KeyChip';
import StealthTypingDemo from '../shared/StealthTypingDemo';

const STEPS: LessonStep[] = [
  {
    icon: Keyboard,
    title: '1 · Arm stealth typing',
    desc: 'Turn it on. A glowing banner appears: “Stealth typing is ON.” Now your keystrokes flow into InvisiQ.',
    keys: 'Ctrl+Shift+I',
  },
  {
    icon: ShieldCheck,
    title: '2 · Type while another app stays focused',
    desc: 'Because the overlay never takes focus, you can type into InvisiQ even while your exam or meeting app is in front.',
  },
  {
    icon: CornerDownLeft,
    title: '3 · Release when you’re done',
    desc: 'Press the same shortcut, hit Escape, or hide the overlay. Your keys instantly return to whatever app you’re in.',
    keys: 'Escape',
  },
];

/**
 * Core chapter — stealth typing. This is the headline lesson and the one users get
 * confused by: the whole point is that keystrokes go to InvisiQ while it's armed.
 * We make the ARM → TYPE → RELEASE cycle unmistakable, and hammer the release step
 * (the exact thing the beta reviewer missed). Phase B adds an interactive
 * mock-exam-app + SimOverlay that choreographs the three steps live.
 */
export default function ChStealthTyping(): JSX.Element {
  return (
    <LessonScaffold
      eyebrow="The core loop"
      headingIcon={Keyboard}
      title="Type without being seen"
      subtitle="Stealth typing lets you write into InvisiQ from inside any app — no window switching, no clicking. The trade-off: while it’s ON, your keystrokes belong to InvisiQ, not the app behind it."
      demo={<StealthTypingDemo />}
      steps={STEPS}
      note={
        <span className="flex items-start gap-2 rounded-lg border border-accent-primary/25 bg-accent-primary/[0.06] px-3 py-2">
          <EyeOff size={14} className="mt-0.5 flex-shrink-0 text-accent-primary" />
          <span>
            <span className="font-semibold text-text-primary">The golden rule:</span> if your typing
            “disappears,” stealth typing is still armed. Hide the overlay (
            <KeyChip keys="Ctrl+Shift+G" size="sm" />) or press <KeyChip keys="Escape" size="sm" /> and
            your keys go right back to your app. The overlay must be visible for stealth typing to be
            active.
          </span>
        </span>
      }
    />
  );
}
