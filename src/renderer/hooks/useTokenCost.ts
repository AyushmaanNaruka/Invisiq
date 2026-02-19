import { useState, useCallback } from 'react';
import type { TokenUsage } from '@shared/types';

interface CostBreakdown {
  tokens: number;
  cost: number;
}

interface UseTokenCostReturn {
  lastRequest: CostBreakdown;
  conversation: CostBreakdown;
  session: CostBreakdown;
  recordUsage: (usage: TokenUsage) => void;
  resetConversation: () => void;
  resetSession: () => void;
}

export function useTokenCost(): UseTokenCostReturn {
  const [lastRequest, setLastRequest] = useState<CostBreakdown>({ tokens: 0, cost: 0 });
  const [conversation, setConversation] = useState<CostBreakdown>({ tokens: 0, cost: 0 });
  const [session, setSession] = useState<CostBreakdown>({ tokens: 0, cost: 0 });

  const recordUsage = useCallback((usage: TokenUsage) => {
    const tokens = usage.totalTokens;
    const cost = usage.estimatedCostUSD;

    setLastRequest({ tokens, cost });
    setConversation((prev) => ({
      tokens: prev.tokens + tokens,
      cost: prev.cost + cost,
    }));
    setSession((prev) => ({
      tokens: prev.tokens + tokens,
      cost: prev.cost + cost,
    }));
  }, []);

  const resetConversation = useCallback(() => {
    setConversation({ tokens: 0, cost: 0 });
    setLastRequest({ tokens: 0, cost: 0 });
  }, []);

  const resetSession = useCallback(() => {
    setSession({ tokens: 0, cost: 0 });
    setConversation({ tokens: 0, cost: 0 });
    setLastRequest({ tokens: 0, cost: 0 });
  }, []);

  return { lastRequest, conversation, session, recordUsage, resetConversation, resetSession };
}
