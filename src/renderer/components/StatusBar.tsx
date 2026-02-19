import { useState } from 'react';
import type { TokenUsage } from '@shared/types';

interface CostBreakdown {
  tokens: number;
  cost: number;
}

interface StatusBarProps {
  isStreaming: boolean;
  error: string | null;
  lastUsage: TokenUsage | null;
  compact?: boolean;
  costs?: {
    lastRequest: CostBreakdown;
    conversation: CostBreakdown;
    session: CostBreakdown;
  };
}

function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return `${count}`;
}

function formatCost(cost: number): string {
  if (cost === 0) return 'Free';
  if (cost < 0.001) return `$${cost.toFixed(5)}`;
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(3)}`;
}

export default function StatusBar({ isStreaming, error, lastUsage, compact = false, costs }: StatusBarProps): JSX.Element {
  const [showTooltip, setShowTooltip] = useState(false);

  let statusColor = 'bg-status-success';
  let statusText = 'Ready';

  if (error) {
    statusColor = 'bg-status-error';
    statusText = 'Error';
  } else if (isStreaming) {
    statusColor = 'bg-status-streaming';
    statusText = 'Streaming...';
  }

  const displayTokens = costs?.conversation.tokens || lastUsage?.totalTokens || 0;
  const displayCost = costs?.conversation.cost ?? lastUsage?.estimatedCostUSD ?? 0;

  return (
    <div className="h-6 bg-bg-overlay border-t border-border-subtle flex items-center px-3 shrink-0">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${statusColor}`} />
        {!compact && <span className="text-text-secondary text-xs">{statusText}</span>}
      </div>

      <div className="flex-1" />

      {displayTokens > 0 && (
        <div
          className="relative"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <span className="text-text-placeholder text-xs cursor-default">
            {compact
              ? formatTokens(displayTokens)
              : <>{formatTokens(displayTokens)} tokens &middot; {formatCost(displayCost)}</>
            }
          </span>

          {showTooltip && costs && (
            <div className="absolute bottom-full right-0 mb-1 w-44 bg-bg-header border border-border-subtle rounded-md shadow-tooltip p-2 z-50">
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between text-text-secondary">
                  <span>Last request</span>
                  <span className="text-text-primary">
                    {formatTokens(costs.lastRequest.tokens)} &middot; {formatCost(costs.lastRequest.cost)}
                  </span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Conversation</span>
                  <span className="text-text-primary">
                    {formatTokens(costs.conversation.tokens)} &middot; {formatCost(costs.conversation.cost)}
                  </span>
                </div>
                <div className="flex justify-between text-text-secondary border-t border-border-subtle pt-1">
                  <span>Session total</span>
                  <span className="text-accent-primary font-medium">
                    {formatTokens(costs.session.tokens)} &middot; {formatCost(costs.session.cost)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
