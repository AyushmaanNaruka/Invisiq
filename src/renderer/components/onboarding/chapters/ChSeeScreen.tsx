import { Camera, Crop, ScanLine, Image } from 'lucide-react';
import LessonScaffold, { type LessonStep } from '../shared/LessonScaffold';
import CaptureDemo from '../shared/CaptureDemo';

const STEPS: LessonStep[] = [
  {
    icon: Camera,
    title: 'Capture the whole screen',
    desc: 'Grab everything and send it straight to the AI in one keystroke.',
    keys: 'Ctrl+Shift+S',
  },
  {
    icon: Crop,
    title: 'Capture just a region',
    desc: 'Snip only the part that matters — a question, an error, a diagram.',
    keys: 'Ctrl+Shift+R',
  },
  {
    icon: ScanLine,
    title: 'Snip without leaving the overlay',
    desc: 'The in-overlay selector lets you draw a box right where you are.',
  },
  {
    icon: Image,
    title: 'Stack up to 3 shots',
    desc: 'Attach several captures to one question for richer context.',
  },
];

/** Core chapter — screen capture. (Phase B adds an animated capture demo on SimOverlay.) */
export default function ChSeeScreen(): JSX.Element {
  return (
    <LessonScaffold
      eyebrow="The core loop"
      headingIcon={Camera}
      title="Let it see your screen"
      subtitle="InvisiQ hides itself for a split second before every capture, so the overlay never shows up in your own screenshots."
      demo={<CaptureDemo />}
      steps={STEPS}
      note={
        <>
          The overlay vanishes during capture automatically — you never have to move it out of the
          way.
        </>
      }
    />
  );
}
