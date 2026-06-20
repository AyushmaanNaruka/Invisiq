import OnboardingStealthTest from '../../OnboardingStealthTest';

/**
 * Chapter — Invisible by design. Reuses the real Snipping-Tool proof so the user
 * confirms content-protection works on their own machine (not just a claim). The
 * test card is rendered with content protection ON, so it's genuinely absent from
 * any capture.
 */
export default function ChInvisible(): JSX.Element {
  return <OnboardingStealthTest />;
}
