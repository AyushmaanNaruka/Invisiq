import { useState, useCallback, useRef } from 'react';
import { providerManager } from '../services/ai-providers/provider-manager';
import type { AIProvider } from '../services/ai-providers/types';
import type { ChatMessage, ImageAttachment, ChatRequest, TokenUsage, ProviderID } from '@shared/types';

interface UseAIReturn {
  isStreaming: boolean;
  error: string | null;
  lastUsage: TokenUsage | null;
  sendMessage: (
    text: string,
    contextMessages: ChatMessage[],
    options: {
      model: string;
      systemPrompt?: string;
      images?: ImageAttachment[];
      onToken: (text: string) => void;
      onDone: (usage: TokenUsage, latency: number) => void;
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

    const { provider } = result;

    if (!initializedProviders.current.has(provider.id)) {
      const { key: apiKey } = await window.ghostAPI.store.getApiKey(provider.id);
      if (!apiKey) throw new Error(`No API key for ${provider.name}. Open Settings to add one.`);
      provider.initialize(apiKey);
      initializedProviders.current.add(provider.id);
    }

    return provider;
  }, []);

  const sendMessage = useCallback(async (
    text: string,
    contextMessages: ChatMessage[],
    options: {
      model: string;
      systemPrompt?: string;
      images?: ImageAttachment[];
      onToken: (text: string) => void;
      onDone: (usage: TokenUsage, latency: number) => void;
      onError: (error: string) => void;
    }
  ) => {
    setIsStreaming(true);
    setError(null);

    try {
      const provider = await initializeProvider(options.model);
      activeProviderRef.current = provider;

      const request: ChatRequest = {
        messages: contextMessages,
        model: options.model,
        systemPrompt: options.systemPrompt,
        images: options.images,
        stream: true,
      };

      const generator = provider.chat(request);
      let result = await generator.next();

      while (!result.done) {
        const chunk = result.value;
        if (chunk.type === 'text' && chunk.text) {
          options.onToken(chunk.text);
        } else if (chunk.type === 'error' && chunk.error) {
          options.onError(chunk.error);
          setError(chunk.error);
        }
        result = await generator.next();
      }

      // Final result
      const response = result.value;
      if (response) {
        setLastUsage(response.usage);
        options.onDone(response.usage, response.latency);
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
