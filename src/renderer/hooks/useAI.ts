import { useState, useCallback, useRef } from 'react';
import { providerManager } from '../services/ai-providers/provider-manager';
import type { AIProvider } from '../services/ai-providers/types';
import type { ChatMessage, ImageAttachment, ChatRequest, TokenUsage } from '@shared/types';

// Char-based proxy for token budget. ~4 chars/token, num_ctx=4k → ~16k chars.
// Reserve ~6k for system prompt + assistant output → ~10k input budget.
const MAX_CONTEXT_CHARS = 10000;

// Cap concatenated OCR text. Three screenshots of a problem statement easily
// hit 6-10k chars, half of it redundant. With num_ctx=4096, OCR alone must
// not eat the whole budget.
const MAX_OCR_CHARS = 4000;

/**
 * Stateful filter that strips <think>...</think> blocks from a token stream.
 * Reasoning models (DeepSeek-R1, QwQ) emit these. ReactMarkdown drops them
 * silently as raw HTML, so the user sees a blank bubble while the model thinks.
 * We strip them upstream so:
 *  - The chat bubble stays empty (→ "thinking..." dots stay on, which is accurate)
 *  - Storage and follow-up turns don't carry the reasoning forward
 */
/**
 * Extract the LAST fenced code block from an assistant message.
 * Returns null if no code block found.
 */
function extractLastCodeBlock(content: string): { code: string; lang: string } | null {
  const matches = [...content.matchAll(/```(\w+)?\n?([\s\S]*?)```/g)];
  if (matches.length === 0) return null;
  const last = matches[matches.length - 1];
  return { lang: last[1] || '', code: last[2].trim() };
}

/**
 * Detect a "fix this bug" turn: prior assistant message contains code AND
 * the new user turn has a screenshot (presumably of the error/wrong output).
 */
function detectDebugTurn(
  messages: ChatMessage[],
  hasNewImages: boolean
): { isDebug: boolean; priorCode: { code: string; lang: string } | null } {
  if (!hasNewImages) return { isDebug: false, priorCode: null };
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant' && m.content);
  if (!lastAssistant) return { isDebug: false, priorCode: null };
  const priorCode = extractLastCodeBlock(lastAssistant.content);
  if (!priorCode || priorCode.code.length < 20) return { isDebug: false, priorCode: null };
  return { isDebug: true, priorCode };
}

/**
 * Smart truncation that preserves the FIRST user message (problem statement)
 * and the last few turns. Ollama's native FIFO truncation drops the front,
 * which is precisely the problem statement on multi-turn debug sessions.
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

/**
 * OCR-extract text from images using Tesseract.js.
 * Used for Ollama models whose vision capabilities are too weak to read text from screenshots.
 *
 * STRATEGY: Each Tesseract worker runs in a separate Web Worker thread. Running
 * images in parallel across N workers converts O(N×25s) into ~max(25s).
 *
 * IMPORTANT: tesseract.js downloads ~12MB of training data on first use; subsequent
 * runs are cached. The whole call is wrapped in a hard timeout so the pipeline can
 * fall back to image-less prompting if OCR stalls.
 */
const OCR_TIMEOUT_MS = 60000;
const OCR_MAX_PARALLEL = 3;
const OCR_MAX_IMAGES = 3; // Cap defensively — 4+ screenshots are almost always redundant for a single query

async function ocrExtractText(images: ImageAttachment[]): Promise<string> {
  const t0 = Date.now();
  const targets = images.slice(0, OCR_MAX_IMAGES);
  if (targets.length < images.length) {
    console.warn(`[useAI] OCR: capped to first ${OCR_MAX_IMAGES} of ${images.length} images`);
  }

  try {
    const result = await Promise.race([
      (async (): Promise<string> => {
        const { createWorker } = await import('tesseract.js');
        const workerCount = Math.min(targets.length, OCR_MAX_PARALLEL);
        console.log(`[useAI] OCR: creating ${workerCount} parallel worker(s)...`);

        const workers = await Promise.all(
          Array.from({ length: workerCount }, () => createWorker('eng'))
        );
        console.log('[useAI] OCR: workers ready after', Date.now() - t0, 'ms');

        // Distribute images across workers; each runs recognize() concurrently on its own thread.
        const results = await Promise.all(
          targets.map(async (img, idx) => {
            const worker = workers[idx % workerCount];
            const ti = Date.now();
            const dataUri = `data:${img.mimeType};base64,${img.data}`;
            const { data: { text } } = await worker.recognize(dataUri);
            console.log(`[useAI] OCR: image ${idx + 1}/${targets.length} done in ${Date.now() - ti}ms, ${text.length} chars`);
            return text.trim();
          })
        );

        await Promise.all(workers.map((w) => w.terminate().catch(() => undefined)));
        return results.filter(Boolean).join('\n\n');
      })(),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error(`OCR timeout after ${OCR_TIMEOUT_MS}ms`)), OCR_TIMEOUT_MS)
      ),
    ]);
    console.log('[useAI] OCR: total elapsed', Date.now() - t0, 'ms');
    return result;
  } catch (err) {
    console.error('[useAI] OCR failed:', err);
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
      onDone: (usage: TokenUsage, latency: number, finalContent: string) => void;
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
      let isDebugTurn = false;

      // Collect images from options.images OR from the last user message
      const ocrImages = options.images && options.images.length > 0
        ? options.images
        : contextMessages.filter((m) => m.role === 'user' && m.images?.length)
            .pop()?.images ?? [];

      if (provider.id === 'ollama' && ocrImages.length > 0) {
        let ocrText = await ocrExtractText(ocrImages);
        // Cap OCR text — 3 screenshots can easily produce 10k+ chars of mostly redundant text
        if (ocrText.length > MAX_OCR_CHARS) {
          ocrText = ocrText.slice(0, MAX_OCR_CHARS) + '\n\n[... OCR truncated to fit context budget ...]';
        }
        if (!ocrText) {
          // OCR failed (timeout, CDN issue, etc). DeepSeek-R1 and Qwen-Coder are NOT
          // vision models — sending the raw image would be silently ignored by Ollama
          // and the model would respond to an effectively empty prompt. Strip the image
          // and tell the user what to do.
          console.warn('[useAI] OCR returned empty — stripping image and notifying user');
          ollamaOcrApplied = true; // prevents images being attached to the request
          enrichedMessages = contextMessages.map((msg, idx) => {
            if (idx === contextMessages.length - 1 && msg.role === 'user') {
              return {
                ...msg,
                images: undefined,
                content: `[A screenshot was attached but could not be read (OCR failed — likely first-run download of tesseract.js training data was blocked or timed out). Please paste the problem statement / code as text and resend.]\n\n${msg.content || ''}`,
              };
            }
            return msg;
          });
        }
        if (ocrText) {
          ollamaOcrApplied = true;

          // Detect "fix this code" follow-ups: prior assistant turn had code,
          // user now shows an error/wrong-output screenshot. Build a structured
          // debug prompt that explicitly pins the prior code as ground truth.
          const debug = detectDebugTurn(contextMessages, true);
          isDebugTurn = debug.isDebug;

          enrichedMessages = contextMessages.map((msg, idx) => {
            if (idx === contextMessages.length - 1 && msg.role === 'user') {
              const userQ = msg.content?.trim() || 'Fix the bug.';
              const enrichedContent = debug.isDebug && debug.priorCode
                ? [
                    'You previously gave this exact solution:',
                    '',
                    '```' + (debug.priorCode.lang || ''),
                    debug.priorCode.code,
                    '```',
                    '',
                    'The user ran it and shared the following output / error (OCR\'d from a screenshot — there may be minor character errors):',
                    '',
                    '---',
                    ocrText,
                    '---',
                    '',
                    `User says: ${userQ}`,
                    '',
                    'INSTRUCTIONS:',
                    '1. Trace through the PREVIOUS code above with the failing input. Identify the EXACT bug — not a generic issue.',
                    '2. State in 1-2 sentences WHY it fails (specific line, specific value).',
                    '3. Output the corrected FULL solution as a code block.',
                    '4. The corrected code MUST differ from the previous code in at least one substantive way. Do NOT re-emit the same code with cosmetic changes.',
                  ].join('\n')
                : `The following text was extracted from a screenshot. Answer the user's question based on this content.\n\n---\n${ocrText}\n---\n\n${userQ}`;

              return {
                ...msg,
                images: undefined, // Strip image — it confuses Ollama into describing instead of solving
                content: enrichedContent,
              };
            }
            return msg;
          });
          console.log('[useAI] Ollama enrichment: OCR=%d chars, debugTurn=%s', ocrText.length, isDebugTurn);
        }
      }

      // Smart truncation: keep first user message + recent turns when over budget.
      // Ollama's FIFO truncation would otherwise drop the problem statement first.
      enrichedMessages = smartTruncate(enrichedMessages, MAX_CONTEXT_CHARS);

      const request: ChatRequest = {
        messages: enrichedMessages,
        model: options.model,
        systemPrompt: options.systemPrompt,
        // Don't send images to Ollama when OCR succeeded — they cause image-description behavior
        images: ollamaOcrApplied ? undefined : options.images,
        // Force deterministic sampling on debug turns so the model can't drift back to its prior wrong answer.
        temperature: isDebugTurn ? 0 : undefined,
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

      const tStreamStart = Date.now();
      console.log('[useAI] Stream: sending request to', provider.id);
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
            console.log('[useAI] Stream: first token after', firstTokenAt - tStreamStart, 'ms');
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
      console.log('[useAI] Stream: ended after', Date.now() - tStreamStart, 'ms — answerChars:', answerOnly.length);
      if (response) {
        setLastUsage(response.usage);
        // If the model produced reasoning but no answer (budget exhausted mid-think),
        // answerOnly is empty — pass a notice instead of blanking the bubble.
        const finalContent = answerOnly
          || '_The model exhausted its output budget while reasoning and never produced a final answer. Try a simpler/narrower question, or increase `num_predict`._';
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
