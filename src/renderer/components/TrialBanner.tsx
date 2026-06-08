import { Clock } from 'lucide-react';

interface TrialBannerProps {
  daysLeft: number;
}

/**
 * Thin reminder strip shown when the 14-day trial is running low (≤ 5 days).
 * Rendered above the header. No banner while there's plenty of time left.
 */
export default function TrialBanner({ daysLeft }: TrialBannerProps): JSX.Element | null {
  if (daysLeft > 5) return null;

  const label =
    daysLeft <= 0
      ? 'Trial ends today'
      : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left in your trial`;

  return (
    <div className="flex items-center justify-center gap-1.5 bg-accent/15 px-3 py-1 text-[11px] text-accent no-drag">
      <Clock size={11} />
      <span>{label}</span>
    </div>
  );
}
