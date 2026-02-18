import type { TokenUsage } from '@shared/types';

interface StatusBarProps {
  isStreaming: boolean;
  error: string | null;
  lastUsage: TokenUsage | null;
}

export default function StatusBar({ isStreaming, error, lastUsage }: StatusBarProps): JSX.Element {
  let statusColor = 'bg-status-success';
  let statusText = 'Ready';

  if (error) {
    statusColor = 'bg-status-error';
    statusText = 'Error';
  } else if (isStreaming) {
    statusColor = 'bg-status-streaming';
    statusText = 'Streaming...';
  }

  return (
    <div className="h-6 bg-bg-overlay border-t border-border-subtle flex items-center px-3 shrink-0">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${statusColor}`} />
        <span className="text-text-secondary text-xs">{statusText}</span>
      </div>

      <div className="flex-1" />

      {lastUsage && (
        <span className="text-text-placeholder text-xs">
          {lastUsage.totalTokens} tokens &middot; ${lastUsage.estimatedCostUSD.toFixed(4)}
        </span>
      )}
    </div>
  );
}
