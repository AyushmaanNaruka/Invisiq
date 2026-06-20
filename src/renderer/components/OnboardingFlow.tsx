import AcademyShell from './onboarding/AcademyShell';
import type { AcademyMode } from './onboarding/chapters';

interface OnboardingFlowProps {
  onComplete: () => void;
  /** 'first-run' (default) marks onboarding complete on finish; 'replay' does not. */
  mode?: AcademyMode;
}

/**
 * Public entry for the InvisiQ Academy. Kept as a thin wrapper so existing call
 * sites (App.tsx first-run gate) stay unchanged; the chapter-driven implementation
 * lives in ./onboarding/AcademyShell.
 */
export default function OnboardingFlow({ onComplete, mode = 'first-run' }: OnboardingFlowProps): JSX.Element {
  return <AcademyShell mode={mode} onComplete={onComplete} />;
}
