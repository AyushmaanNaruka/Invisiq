import OnboardingApiKey from '../../OnboardingApiKey';

/**
 * Chapter — Connect AI. Functional setup step (BYOK). Marked firstRunOnly in the
 * manifest, so it's hidden when the academy is replayed from Settings (keys are
 * managed in Settings → API Keys by then). Reuses the existing, battle-tested
 * OnboardingApiKey which already renders its own heading + per-provider validation.
 */
export default function ChConnectAI(): JSX.Element {
  return <OnboardingApiKey />;
}
