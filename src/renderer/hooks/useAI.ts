import { useState, useCallback, useRef } from 'react';
import { providerManager } from '../services/ai-providers/provider-manager';
import type { AIProvider } from '../services/ai-providers/types';
import type { ChatMessage, ChatRequest, ImageAttachment, TokenUsage } from '@shared/types';
import { logger } from '@shared/logger';

// Char-based proxy for token budget. ~4 chars/token.
// Reserve headroom for system prompt + assistant output → ~10k input budget.
const MAX_CONTEXT_CHARS = 10000;

/**
 * Smart truncation that preserves the FIRST user message (problem statement)
 * and the last few turns. Naive FIFO truncation drops the front, which is
 * precisely the problem statement on multi-turn debug sessions.
 */
function smartTruncate(messages: ChatMessage[], maxChars: number): ChatMessage[] {
  const totalChars = messages.reduce((s, m) => s + (m.content?.length || 0), 0);
  if (totalChars <= maxChars || messages.length <= 4) return messages;

  const firstUserIdx = messages.findIndex((m) => m.role === 'user');
  if (firstUserIdx === -1) return messages;

  const first = messages[firstUserIdx];
  const tail = messages.slice(-4);
  if (tail.some((m) => m === first)) return messages;

  const notice: ChatMessage = {
    id: 'truncation-notice',
    role: 'user',
    content: '[... earlier turns omitted to fit context window — the original problem above and the most recent turns below are intact ...]',
    timestamp: '',
  };
  return [first, notice, ...tail];
}

interface UseAIReturn {
  isStreaming: boolean;
  error: string | null;
  lastUsage: TokenUsage | null;
  sendMessage: (
    contextMessages: ChatMessage[],
    options: {
      model: string;
      systemPrompt?: string;
      images?: ImageAttachment[];
      onToken: (text: string) => void;
      onDone: (usage: TokenUsage, latency: number, finalContent: string) => void;
      onError: (error: string) => void;
    }
  ) => Promise<void>;
  stopGeneration: () => void;
}

export function useAI(): UseAIReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUsage, setLastUsage] = useState<TokenUsage | null>(null);
  const activeProviderRef = useRef<AIProvider | null>(null);
  const initializedProviders = useRef<Set<string>>(new Set());

  const initializeProvider = useCallback(async (modelId: string): Promise<AIProvider> => {
    const result = providerManager.getModelById(modelId);
    if (!result) throw new Error(`Model ${modelId} not found`);

    const { providerId } = result;

    // Resolve provider lazily (loads SDK on first use)
    const provider = await providerManager.resolveProvider(providerId);
    if (!provider) throw new Error(`Provider ${providerId} not available`);

    if (!initializedProviders.current.has(providerId)) {
      const { key: apiKey } = await window.ghostAPI.store.getApiKey(providerId);
      // No key → either not entered, or the trial has expired (getApiKey gates
      // on entitlement). Either way, prompt rather than silently failing.
      if (!apiKey) throw new Error(`No API key for ${provider.name}. Open Settings to add one.`);
      provider.initialize(apiKey);
      initializedProviders.current.add(providerId);
    }

    return provider;
  }, []);

  const sendMessage = useCallback(async (
    contextMessages: ChatMessage[],
    options: {
      model: string;
      systemPrompt?: string;
      images?: ImageAttachment[];
      onToken: (text: string) => void;
      onDone: (usage: TokenUsage, latency: number, finalContent: string) => void;
      onError: (error: string) => void;
    }
  ) => {
    setIsStreaming(true);
    setError(null);

    try {
      const provider = await initializeProvider(options.model);
      activeProviderRef.current = provider;

      // Keep first user message + recent turns when over the context budget.
      const enrichedMessages = smartTruncate(contextMessages, MAX_CONTEXT_CHARS);

      const request: ChatRequest = {
        messages: enrichedMessages,
        model: options.model,
        systemPrompt: options.systemPrompt,
        images: options.images,
        stream: true,
      };

      const tStreamStart = Date.now();
      const generator = provider.chat(request);
      let result = await generator.next();
      let firstTokenAt = 0;

      // Pass everything (including <think>…</think> reasoning) straight through so
      // the user sees the model thinking live. MessageBubble renders <think> as a
      // dimmed reasoning section. On completion we replace the stored content with
      // the answer-only text (response.content) so history stays clean.
      while (!result.done) {
        const chunk = result.value;
        if (chunk.type === 'text' && chunk.text) {
          if (!firstTokenAt) {
            firstTokenAt = Date.now();
            logger.log('[useAI] Stream: first token after', firstTokenAt - tStreamStart, 'ms');
          }
          options.onToken(chunk.text);
        } else if (chunk.type === 'error' && chunk.error) {
          options.onError(chunk.error);
          setError(chunk.error);
        }
        result = await generator.next();
      }

      // Final result
      const response = result.value;
      const answerOnly = (response?.content ?? '').trim();
      if (response) {
        setLastUsage(response.usage);
        // If the model produced reasoning but no answer (budget exhausted mid-think),
        // answerOnly is empty — pass a notice instead of blanking the bubble.
        const finalContent = answerOnly
          || '_The model exhausted its output budget while reasoning and never produced a final answer. Try a simpler/narrower question._';
        options.onDone(response.usage, response.latency, finalContent);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      options.onError(errorMsg);
    } finally {
      setIsStreaming(false);
      activeProviderRef.current = null;
    }
  }, [initializeProvider]);

  const stopGeneration = useCallback(() => {
    activeProviderRef.current?.abort();
  }, []);

  return {
    isStreaming,
    error,
    lastUsage,
    sendMessage,
    stopGeneration,
  };
}
