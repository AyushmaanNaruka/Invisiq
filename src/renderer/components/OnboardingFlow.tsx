import { useState } from 'react';
import OnboardingApiKey from './OnboardingApiKey';
import OnboardingHotkeys from './OnboardingHotkeys';
import OnboardingStealthTest from './OnboardingStealthTest';

interface OnboardingFlowProps {
  onComplete: () => void;
}

const STEPS = ['API Key', 'Shortcuts', 'Stealth'];

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps): JSX.Element {
  const [step, setStep] = useState(0);

  const handleFinish = async (): Promise<void> => {
    try {
      await window.ghostAPI.store.set('onboardingComplete', true);
      await window.ghostAPI.store.set('isFirstLaunch', false);
    } catch {
      // Continue even if store fails
    }
    onComplete();
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-bg-overlay rounded-lg overflow-hidden select-none">
      {/* Header with progress */}
      <div className="px-6 pt-5 pb-3 drag-handle">
        <div className="no-drag">
          <h1 className="text-text-primary text-sm font-semibold mb-3 text-center">
            Welcome to GhostAI
          </h1>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-1">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      i < step
                        ? 'bg-accent-primary'
                        : i === step
                          ? 'bg-accent-primary ring-2 ring-accent-primary/30'
                          : 'bg-border-subtle'
                    }`}
                  />
                  <span
                    className={`text-[9px] mt-1 ${
                      i === step ? 'text-accent-primary' : 'text-text-secondary'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`w-10 h-px mb-3 ${
                      i < step ? 'bg-accent-primary' : 'bg-border-subtle'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-hidden">
        {step === 0 && (
          <OnboardingApiKey onContinue={() => setStep(1)} />
        )}
        {step === 1 && (
          <OnboardingHotkeys
            onContinue={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <OnboardingStealthTest
            onFinish={handleFinish}
            onBack={() => setStep(1)}
          />
        )}
      </div>
    </div>
  );
}
