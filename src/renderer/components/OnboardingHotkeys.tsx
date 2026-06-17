import { Keyboard } from 'lucide-react';

interface OnboardingHotkeysProps {
  onContinue: () => void;
  onBack: () => void;
}

const SHORTCUTS = [
  {
    keys: 'Ctrl+Shift+G',
    label: 'Toggle Overlay',
    description: 'Show or hide InvisiQ instantly',
  },
  {
    keys: 'Ctrl+Shift+S',
    label: 'Capture Screen',
    description: 'Screenshot your screen and send to AI',
  },
  {
    keys: 'Ctrl+Shift+R',
    label: 'Capture Region',
    description: 'Select and capture a specific area',
  },
  {
    keys: 'Escape',
    label: 'Quick Hide',
    description: 'Instantly hide the overlay',
  },
];

function KeyCombo({ keys }: { keys: string }): JSX.Element {
  const parts = keys.split('+');
  return (
    <div className="flex items-center gap-1">
      {parts.map((key, i) => (
        <span key={i}>
          <kbd className="inline-block px-2 py-1 text-xs font-mono font-semibold text-text-primary bg-bg-code border border-border-subtle rounded shadow-sm">
            {key}
          </kbd>
          {i < parts.length - 1 && (
            <span className="text-text-secondary text-xs mx-0.5">+</span>
          )}
        </span>
      ))}
    </div>
  );
}

export default function OnboardingHotkeys({ onContinue, onBack }: OnboardingHotkeysProps): JSX.Element {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="flex items-center gap-2 mb-1">
          <Keyboard size={18} className="text-accent-primary" />
          <h2 className="text-text-primary text-lg font-semibold">Keyboard Shortcuts</h2>
        </div>
        <p className="text-text-secondary text-xs mb-5">
          Control InvisiQ from any application. These work even when the overlay is hidden.
        </p>

        <div className="space-y-3">
          {SHORTCUTS.map(({ keys, label, description }) => (
            <div
              key={keys}
              className="flex items-center gap-3 rounded-lg border border-border-subtle p-3"
            >
              <div className="shrink-0">
                <KeyCombo keys={keys} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-text-primary text-sm font-medium">{label}</div>
                <div className="text-text-secondary text-[10px]">{description}</div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-text-secondary text-[10px] mt-4 text-center">
          You can customize these in Settings &gt; Hotkeys
        </p>
      </div>

      <div className="px-6 py-4 border-t border-border-subtle flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-text-secondary text-xs hover:text-text-primary transition-colors"
        >
          Back
        </button>
        <button
          onClick={onContinue}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-accent-primary text-white hover:bg-accent-primary/80 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
