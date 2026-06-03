import { GoogleGenerativeAI, type GenerativeModel, type Content, type Part } from '@google/generative-ai';
import { GEMINI_MODELS } from '@shared/constants';
import type { AIProvider, ChatRequest, ChatResponse, StreamChunk, ModelConfig, ValidationResult } from './types';

export class GeminiProvider implements AIProvider {
  readonly name = 'Google Gemini';
  readonly id = 'gemini' as const;
  readonly models: ModelConfig[] = GEMINI_MODELS;

  private genAI: GoogleGenerativeAI | null = null;
  private abortController: AbortController | null = null;

  initialize(apiKey: string): void {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async validateKey(): Promise<ValidationResult> {
    if (!this.genAI) return { valid: false, error: 'Not initialized' };

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      await model.generateContent('test');
      return { valid: true };
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; name?: string };
      console.error('[Gemini] validateKey error:', { status: err.status, message: err.message, name: err.name });
      if (err.message?.includes('API_KEY_INVALID') || err.status === 400) {
        return { valid: false, error: 'Invalid API key' };
      }
      if (err.status === 429 || err.status === 403 || err.status === 404) {
        return { valid: true }; // Key is valid, issue is rate limit/permissions/model
      }
      return { valid: false, error: `Could not validate: ${err.message || 'Network error'}` };
    }
  }

  async *chat(request: ChatRequest): AsyncGenerator<StreamChunk, ChatResponse> {
    if (!this.genAI) throw new Error('Gemini not initialized');

    this.abortController = new AbortController();
    const startTime = Date.now();
    let fullContent = '';
    let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCostUSD: 0 };
    let finishReason: 'stop' | 'max_tokens' | 'error' = 'stop';

    try {
      const modelConfig: { model: string; systemInstruction?: string } = {
        model: request.model,
      };
      if (request.systemPrompt) {
        modelConfig.systemInstruction = request.systemPrompt;
      }

      const model: GenerativeModel = this.genAI.getGenerativeModel(modelConfig);

      const { history, lastUserParts } = this.buildContents(request);

      const chat = model.startChat({
        history,
        generationConfig: {
          maxOutputTokens: request.maxTokens || 4096,
          temperature: request.temperature ?? 0.7,
        },
      });

      const result = await chat.sendMessageStream(lastUserParts);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          fullContent += text;
          yield { type: 'text', text };
        }

        if (chunk.usageMetadata) {
          usage.inputTokens = chunk.usageMetadata.promptTokenCount || 0;
          usage.outputTokens = chunk.usageMetadata.candidatesTokenCount || 0;
          usage.totalTokens = chunk.usageMetadata.totalTokenCount || 0;
        }
      }

      const modelDef = this.models.find((m) => m.id === request.model) || this.models[0];
      usage.estimatedCostUSD =
        (usage.inputTokens / 1_000_000) * modelDef.costPer1MInput +
        (usage.outputTokens / 1_000_000) * modelDef.costPer1MOutput;

      yield { type: 'done' };

      return {
        content: fullContent,
        model: request.model,
        usage,
        finishReason,
        latency: Date.now() - startTime,
      };
    } catch (error: unknown) {
      if ((error as Error).name === 'AbortError') {
        yield { type: 'done' };
        return {
          content: fullContent,
          model: request.model,
          usage,
          finishReason: 'stop',
          latency: Date.now() - startTime,
        };
      }
      const errMsg = (error as Error).message || 'Unknown error';
      yield { type: 'error', error: errMsg };
      return {
        content: fullContent,
        model: request.model,
        usage,
        finishReason: 'error',
        latency: Date.now() - startTime,
      };
    } finally {
      this.abortController = null;
    }
  }

  abort(): void {
    this.abortController?.abort();
  }

  private buildContents(request: ChatRequest): {
    history: Content[];
    lastUserParts: Part[];
  } {
    const history: Content[] = [];
    const msgs = request.messages.filter((m) => m.role !== 'system' && m.role !== 'error');

    // All messages except the last one go into history
    for (let i = 0; i < msgs.length - 1; i++) {
      const msg = msgs[i];
      const parts: Part[] = [];

      if (msg.images && msg.images.length > 0) {
        for (const img of msg.images) {
          if (!img.data || typeof img.data !== 'string') {
            console.error('[Gemini] Invalid image data in history:', { dataType: typeof img.data });
            continue;
          }
          parts.push({
            inlineData: {
              mimeType: img.mimeType,
              data: img.data,
            },
          });
        }
      }
      if (msg.content) {
        parts.push({ text: msg.content });
      }

      history.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts,
      });
    }

    // Last message becomes the current user input
    const lastMsg = msgs[msgs.length - 1];
    const lastUserParts: Part[] = [];

    // Attach message-level images (preferred source)
    const hasMessageImages = lastMsg?.images && lastMsg.images.length > 0;
    if (hasMessageImages) {
      for (const img of lastMsg?.images ?? []) {
        if (!img.data || typeof img.data !== 'string') {
          console.error('[Gemini] Invalid image data in last message:', { dataType: typeof img.data });
          continue;
        }
        lastUserParts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.data,
          },
        });
      }
    }

    // Attach request-level images only if message doesn't already have images
    if (!hasMessageImages && request.images && request.images.length > 0) {
      for (const img of request.images) {
        if (!img.data || typeof img.data !== 'string') {
          console.error('[Gemini] Invalid request-level image data:', { dataType: typeof img.data });
          continue;
        }
        lastUserParts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.data,
          },
        });
      }
    }

    if (lastMsg?.content) {
      lastUserParts.push({ text: lastMsg.content });
    }

    return { history, lastUserParts };
  }
}
