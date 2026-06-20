import { MessageSquare, Camera, Sparkles, Layers } from 'lucide-react';
import LessonScaffold, { type LessonStep } from '../shared/LessonScaffold';
import AskDemo from '../shared/AskDemo';

const STEPS: LessonStep[] = [
  {
    icon: MessageSquare,
    title: 'Just ask, in plain language',
    desc: 'Type a question and hit Enter. No modes to pick — InvisiQ reads your intent.',
    keys: 'Ctrl+Shift+A',
  },
  {
    icon: Sparkles,
    title: 'It adapts to what you need',
    desc: 'Answer-first for questions, algorithm-first for code, talking points for meetings.',
  },
  {
    icon: Camera,
    title: 'Add a screenshot for context',
    desc: 'Attach what’s on your screen and ask about it — the AI sees what you see.',
    keys: 'Ctrl+Shift+S',
  },
  {
    icon: Layers,
    title: 'It remembers the thread',
    desc: 'Follow-ups keep the full conversation as context, so you can drill in.',
  },
];

/** Core chapter — the everyday loop: ask anything. (Phase B adds a live SimChat demo.) */
export default function ChAskAnything(): JSX.Element {
  return (
    <LessonScaffold
      eyebrow="The core loop"
      headingIcon={MessageSquare}
      title="Ask anything"
      subtitle="InvisiQ is one adaptive assistant — there are no modes or templates to manage. Ask in your own words and it figures out the rest."
      demo={<AskDemo />}
      steps={STEPS}
    />
  );
}
