import OpenAI from 'openai';
import { OPENAI_MODELS } from '@shared/constants';
import type { AIProvider, ChatRequest, ChatResponse, StreamChunk, ModelConfig, ValidationResult } from './types';

export class OpenAIProvider implements AIProvider {
  readonly name = 'OpenAI';
  readonly id = 'openai' as const;
  readonly models: ModelConfig[] = OPENAI_MODELS;

  private client: OpenAI | null = null;
  private abortController: AbortController | null = null;

  initialize(apiKey: string): void {
    this.client = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  async validateKey(): Promise<ValidationResult> {
    if (!this.client) return { valid: false, error: 'Not initialized' };

    try {
      await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      });
      return { valid: true };
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; name?: string };
      console.error('[OpenAI] validateKey error:', { status: err.status, message: err.message, name: err.name });
      if (err.status === 401) return { valid: false, error: 'Invalid API key' };
      if (err.status === 429 || err.status === 403 || err.status === 404) {
        return { valid: true }; // Key is valid, issue is rate limit/permissions/model
      }
      return { valid: false, error: `Could not validate: ${err.message || 'Network error'}` };
    }
  }

  async *chat(request: ChatRequest): AsyncGenerator<StreamChunk, ChatResponse> {
    if (!this.client) throw new Error('OpenAI not initialized');

    this.abortController = new AbortController();
    const startTime = Date.now();
    let fullContent = '';
    let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCostUSD: 0 };
    let finishReason: 'stop' | 'max_tokens' | 'error' = 'stop';

    try {
      const messages = this.buildMessages(request);

      const stream = await this.client.chat.completions.create(
        {
          model: request.model,
          messages,
          max_tokens: request.maxTokens || 4096,
          temperature: request.temperature ?? 0.7,
          stream: true,
          stream_options: { include_usage: true },
        },
        { signal: this.abortController.signal }
      );

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          fullContent += delta;
          yield { type: 'text', text: delta };
        }

        if (chunk.choices[0]?.finish_reason === 'length') {
          finishReason = 'max_tokens';
        }

        if (chunk.usage) {
          const model = this.models.find((m) => m.id === request.model) || this.models[0];
          usage = {
            inputTokens: chunk.usage.prompt_tokens || 0,
            outputTokens: chunk.usage.completion_tokens || 0,
            totalTokens: chunk.usage.total_tokens || 0,
            estimatedCostUSD:
              ((chunk.usage.prompt_tokens || 0) / 1_000_000) * model.costPer1MInput +
              ((chunk.usage.completion_tokens || 0) / 1_000_000) * model.costPer1MOutput,
          };
        }
      }

      yield { type: 'done' };

      return {
        content: fullContent,
        model: request.model,
        usage,
        finishReason,
        latency: Date.now() - startTime,
      };
    } catch (error: unknown) {
      const err = error as { name?: string; status?: number; message?: string; error?: { message?: string; type?: string; code?: string } };
      console.error('[OpenAI] Chat error:', {
        name: err.name,
        status: err.status,
        message: err.message,
        errorBody: err.error,
      });
      if (err.name === 'AbortError') {
        yield { type: 'done' };
        return {
          content: fullContent,
          model: request.model,
          usage,
          finishReason: 'stop',
          latency: Date.now() - startTime,
        };
      }
      yield { type: 'error', error: err.message || 'Unknown error' };
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

  private buildMessages(
    request: ChatRequest
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }

    for (const msg of request.messages) {
      if (msg.role === 'system' || msg.role === 'error') continue;

      if (msg.role === 'user' && msg.images && msg.images.length > 0) {
        const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
        for (const img of msg.images) {
          if (!img.data || typeof img.data !== 'string') {
            console.error('[OpenAI] Invalid image data in message:', {
              mimeType: img.mimeType,
              dataType: typeof img.data,
              dataIsNull: img.data === null,
            });
            continue;
          }
          content.push({
            type: 'image_url',
            image_url: { url: `data:${img.mimeType};base64,${img.data}` },
          });
        }
        if (msg.content) {
          content.push({ type: 'text', text: msg.content });
        }
        messages.push({ role: 'user', content });
      } else {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    // Attach images from request level (only if last message doesn't already have images)
    if (request.images && request.images.length > 0) {
      const lastUserMsg = messages[messages.length - 1];
      if (lastUserMsg && lastUserMsg.role === 'user') {
        const alreadyHasImages = Array.isArray(lastUserMsg.content) &&
          (lastUserMsg.content as OpenAI.Chat.Completions.ChatCompletionContentPart[]).some(
            (p) => p.type === 'image_url'
          );
        if (!alreadyHasImages) {
          const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
          for (const img of request.images) {
            if (!img.data || typeof img.data !== 'string') {
              console.error('[OpenAI] Invalid request-level image data:', {
                mimeType: img.mimeType,
                dataType: typeof img.data,
                dataIsNull: img.data === null,
              });
              continue;
            }
            content.push({
              type: 'image_url',
              image_url: { url: `data:${img.mimeType};base64,${img.data}` },
            });
          }
          if (typeof lastUserMsg.content === 'string') {
            content.push({ type: 'text', text: lastUserMsg.content });
          }
          lastUserMsg.content = content;
        }
      }
    }

    return messages;
  }
}
