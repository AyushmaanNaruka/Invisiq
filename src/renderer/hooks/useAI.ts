import { useState, useCallback, useRef } from 'react';
import { providerManager } from '../services/ai-providers/provider-manager';
import type { AIProvider } from '../services/ai-providers/types';
import type { ChatMessage, ImageAttachment, ChatRequest, TokenUsage } from '@shared/types';

/**
 * OCR-extract text from images using Tesseract.js.
 * Used for Ollama models whose vision capabilities are too weak to read text from screenshots.
 */
async function ocrExtractText(images: ImageAttachment[]): Promise<string> {
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    const texts: string[] = [];

    for (const img of images) {
      const dataUri = `data:${img.mimeType};base64,${img.data}`;
      const { data: { text } } = await worker.recognize(dataUri);
      if (text.trim()) {
        texts.push(text.trim());
      }
    }

    await worker.terminate();
    return texts.join('\n\n');
  } catch (err) {
    console.error('[useAI] OCR extraction failed:', err);
    return '';
  }
}

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

    const { providerId } = result;

    // Resolve provider lazily (loads SDK on first use)
    const provider = await providerManager.resolveProvider(providerId);
    if (!provider) throw new Error(`Provider ${providerId} not available`);

    if (!initializedProviders.current.has(providerId)) {
      const { key: apiKey } = await window.ghostAPI.store.getApiKey(providerId);
      // Ollama uses server URL (default localhost:11434) instead of an API key
      if (providerId === 'ollama') {
        provider.initialize(apiKey || 'http://localhost:11434');
        // Refresh dynamic model list on first use if empty
        if (provider.models.length === 0) {
          await providerManager.refreshModels('ollama');
        }
      } else {
        if (!apiKey) throw new Error(`No API key for ${provider.name}. Open Settings to add one.`);
        provider.initialize(apiKey);
      }
      initializedProviders.current.add(providerId);
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

      // For Ollama models: OCR-extract text from screenshots and send as text only.
      // Ollama vision models (llava, etc.) tend to *describe* images instead of reading
      // the text/code in them. By OCR-ing first and stripping the image, we force the
      // model to work with the actual content, producing far better coding answers.
      let enrichedMessages = contextMessages;
      let ollamaOcrApplied = false;

      // Collect images from options.images OR from the last user message
      const ocrImages = options.images && options.images.length > 0
        ? options.images
        : contextMessages.filter((m) => m.role === 'user' && m.images?.length)
            .pop()?.images ?? [];

      if (provider.id === 'ollama' && ocrImages.length > 0) {
        const ocrText = await ocrExtractText(ocrImages);
        if (ocrText) {
          ollamaOcrApplied = true;
          // Replace the last user message: inject OCR text and REMOVE images
          // so the model focuses on the text content instead of describing the image.
          enrichedMessages = contextMessages.map((msg, idx) => {
            if (idx === contextMessages.length - 1 && msg.role === 'user') {
              return {
                ...msg,
                images: undefined, // Strip image — it confuses Ollama into describing instead of solving
                content: `The following text was extracted from a screenshot. Answer the user's question based on this content.\n\n---\n${ocrText}\n---\n\n${msg.content}`,
              };
            }
            return msg;
          });
          console.log('[useAI] Ollama OCR enrichment applied, extracted', ocrText.length, 'chars — images stripped');
        }
      }

      const request: ChatRequest = {
        messages: enrichedMessages,
        model: options.model,
        systemPrompt: options.systemPrompt,
        // Don't send images to Ollama when OCR succeeded — they cause image-description behavior
        images: ollamaOcrApplied ? undefined : options.images,
        stream: true,
      };

      console.log('[useAI] Request:', {
        model: request.model,
        messageCount: request.messages.length,
        messages: request.messages.map((m) => ({
          role: m.role,
          contentLength: m.content?.length ?? 0,
          contentPreview: m.content?.slice(0, 100),
          hasImages: !!(m.images && m.images.length > 0),
        })),
        hasSystemPrompt: !!request.systemPrompt,
        systemPromptPreview: request.systemPrompt?.slice(0, 80),
        hasRequestImages: !!(request.images && request.images.length > 0),
      });

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
