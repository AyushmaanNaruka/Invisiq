import { useState } from 'react';
import { Shield, CircleCheck, TriangleAlert } from 'lucide-react';

interface OnboardingStealthTestProps {
  onFinish: () => void;
  onBack: () => void;
}

export default function OnboardingStealthTest({ onFinish, onBack }: OnboardingStealthTestProps): JSX.Element {
  const [testResult, setTestResult] = useState<'untested' | 'passed' | 'failed'>('untested');

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={18} className="text-accent-primary" />
          <h2 className="text-text-primary text-lg font-semibold">Stealth Verification</h2>
        </div>
        <p className="text-text-secondary text-xs mb-5">
          Let's verify the overlay is invisible to screen capture software.
        </p>

        {/* Stealth test area */}
        <div className="rounded-lg border border-border-subtle p-4 mb-4">
          <h3 className="text-text-primary text-sm font-medium mb-3">Test Instructions</h3>
          <ol className="space-y-2 text-text-secondary text-xs list-decimal list-inside">
            <li>Open <span className="text-text-primary font-medium">Snipping Tool</span> (Win+Shift+S)</li>
            <li>Take a screenshot of this area</li>
            <li>Check if the colored box below appears in the screenshot</li>
          </ol>

          {/* Test pattern - visible on screen but should NOT appear in screenshot */}
          <div className="mt-4 rounded-lg p-4 text-center border-2 border-dashed border-accent-primary/50">
            <div
              className="rounded-md p-3 mb-2"
              style={{
                background: 'linear-gradient(135deg, #00B894 0%, #6C5CE7 50%, #D63031 100%)',
              }}
            >
              <span className="text-white text-sm font-bold drop-shadow-md">
                GHOST TEST PATTERN
              </span>
            </div>
            <p className="text-text-secondary text-[10px]">
              This should NOT appear in your screenshot
            </p>
          </div>
        </div>

        {/* Result buttons */}
        {testResult === 'untested' && (
          <div className="space-y-2">
            <p className="text-text-secondary text-xs text-center mb-2">
              Did the test pattern appear in your screenshot?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setTestResult('passed')}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-status-success/40 bg-status-success/10 text-status-success text-sm font-medium hover:bg-status-success/20 transition-colors"
              >
                <CircleCheck size={16} />
                No, it's invisible
              </button>
              <button
                onClick={() => setTestResult('failed')}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-status-error/40 bg-status-error/10 text-status-error text-sm font-medium hover:bg-status-error/20 transition-colors"
              >
                <TriangleAlert size={16} />
                Yes, I can see it
              </button>
            </div>
          </div>
        )}

        {testResult === 'passed' && (
          <div className="rounded-lg border border-status-success/40 bg-status-success/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CircleCheck size={16} className="text-status-success" />
              <span className="text-status-success text-sm font-semibold">Stealth Active</span>
            </div>
            <p className="text-text-secondary text-xs">
              GhostAI is completely invisible to screen capture. You're all set!
            </p>
          </div>
        )}

        {testResult === 'failed' && (
          <div className="rounded-lg border border-status-warning/40 bg-status-warning/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TriangleAlert size={16} className="text-status-warning" />
              <span className="text-status-warning text-sm font-semibold">Troubleshooting</span>
            </div>
            <ul className="space-y-1.5 text-text-secondary text-xs list-disc list-inside">
              <li>Make sure you're on <span className="text-text-primary">Windows 10 2004+</span> or <span className="text-text-primary">Windows 11</span></li>
              <li>Try <span className="text-text-primary">restarting the app</span></li>
              <li>Ensure <span className="text-text-primary">hardware acceleration</span> is enabled in your system settings</li>
              <li>Some virtualized environments may not support content protection</li>
            </ul>
            <button
              onClick={() => setTestResult('untested')}
              className="mt-3 text-accent-primary text-xs hover:underline"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-border-subtle flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-text-secondary text-xs hover:text-text-primary transition-colors"
        >
          Back
        </button>
        <button
          onClick={onFinish}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-accent-primary text-white hover:bg-accent-primary/80 transition-colors"
        >
          Finish Setup
        </button>
      </div>
    </div>
  );
}
