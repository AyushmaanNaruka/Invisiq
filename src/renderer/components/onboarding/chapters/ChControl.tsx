import { Eye, EyeOff, SlidersHorizontal } from 'lucide-react';
import LessonScaffold, { type LessonStep } from '../shared/LessonScaffold';
import ControlDemo from '../shared/ControlDemo';

const STEPS: LessonStep[] = [
  {
    icon: Eye,
    title: 'Summon or dismiss instantly',
    desc: 'Toggle the overlay from anywhere. Hidden, it leaves no trace on screen.',
    keys: 'Ctrl+Shift+G',
  },
  {
    icon: EyeOff,
    title: 'Panic — vanish in one key',
    desc: 'Instantly hide the overlay and release stealth typing. For when someone walks over.',
    keys: 'Ctrl+Shift+Q',
  },
  {
    icon: SlidersHorizontal,
    title: 'Dial in opacity',
    desc: 'Make the overlay as faint or solid as you like — your eyes only.',
  },
];

/** Core chapter — staying invisible and in control. */
export default function ChControl(): JSX.Element {
  return (
    <LessonScaffold
      eyebrow="The core loop"
      headingIcon={EyeOff}
      title="Stay invisible, stay in control"
      subtitle="You decide when InvisiQ is on screen and how it behaves. Everything is one keystroke away — even when the overlay is hidden, the shortcuts still work."
      demo={<ControlDemo />}
      steps={STEPS}
    />
  );
}
