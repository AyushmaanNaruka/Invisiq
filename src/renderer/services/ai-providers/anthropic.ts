import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_MODELS } from '@shared/constants';
import type { AIProvider, ChatRequest, ChatResponse, StreamChunk, ModelConfig, ValidationResult } from './types';

export class AnthropicProvider implements AIProvider {
  readonly name = 'Anthropic';
  readonly id = 'anthropic' as const;
  readonly models: ModelConfig[] = ANTHROPIC_MODELS;

  private client: Anthropic | null = null;
  private abortController: AbortController | null = null;

  initialize(apiKey: string): void {
    this.client = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  async validateKey(): Promise<ValidationResult> {
    if (!this.client) return { valid: false, error: 'Not initialized' };

    try {
      await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }],
      });
      return { valid: true };
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; name?: string };
      console.error('[Anthropic] validateKey error:', { status: err.status, message: err.message, name: err.name });
      if (err.status === 401) return { valid: false, error: 'Invalid API key' };
      if (err.status === 429 || err.status === 403 || err.status === 404) {
        return { valid: true }; // Key is valid, issue is rate limit/permissions/model
      }
      return { valid: false, error: `Could not validate: ${err.message || 'Network error'}` };
    }
  }

  async *chat(request: ChatRequest): AsyncGenerator<StreamChunk, ChatResponse> {
    if (!this.client) throw new Error('Anthropic not initialized');

    this.abortController = new AbortController();
    const startTime = Date.now();
    let fullContent = '';
    const usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCostUSD: 0 };
    let finishReason: 'stop' | 'max_tokens' | 'error' = 'stop';

    try {
      const messages = this.buildMessages(request);

      const stream = this.client.messages.stream(
        {
          model: request.model,
          messages,
          max_tokens: request.maxTokens || 4096,
          ...(request.systemPrompt ? { system: request.systemPrompt } : {}),
        },
        { signal: this.abortController.signal }
      );

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          const delta = event.delta;
          if ('text' in delta) {
            fullContent += delta.text;
            yield { type: 'text', text: delta.text };
          }
        } else if (event.type === 'message_delta') {
          if ('stop_reason' in event.delta) {
            if (event.delta.stop_reason === 'max_tokens') {
              finishReason = 'max_tokens';
            }
          }
          if ('usage' in event && event.usage) {
            const u = event.usage as { output_tokens: number };
            usage.outputTokens = u.output_tokens;
          }
        } else if (event.type === 'message_start') {
          const msg = event.message;
          if (msg.usage) {
            usage.inputTokens = msg.usage.input_tokens;
          }
        }
      }

      usage.totalTokens = usage.inputTokens + usage.outputTokens;
      const model = this.models.find((m) => m.id === request.model) || this.models[0];
      usage.estimatedCostUSD =
        (usage.inputTokens / 1_000_000) * model.costPer1MInput +
        (usage.outputTokens / 1_000_000) * model.costPer1MOutput;

      yield { type: 'done' };

      return {
        content: fullContent,
        model: request.model,
        usage,
        finishReason,
        latency: Date.now() - startTime,
      };
    } catch (error: unknown) {
      const err = error as { name?: string; status?: number; message?: string; error?: { message?: string; type?: string } };
      console.error('[Anthropic] Chat error:', {
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

  private buildMessages(request: ChatRequest): Anthropic.MessageParam[] {
    const messages: Anthropic.MessageParam[] = [];

    for (const msg of request.messages) {
      if (msg.role === 'system' || msg.role === 'error') continue;

      if (msg.role === 'user' && msg.images && msg.images.length > 0) {
        const content: Anthropic.ContentBlockParam[] = [];
        for (const img of msg.images) {
          if (!img.data || typeof img.data !== 'string') {
            console.error('[Anthropic] Invalid image data in message:', {
              mimeType: img.mimeType,
              dataType: typeof img.data,
              dataIsNull: img.data === null,
            });
            continue; // Skip broken images instead of sending null
          }
          content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: img.mimeType,
              data: img.data,
            },
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

    // Attach request-level images to last user message (only if it doesn't already have images)
    if (request.images && request.images.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.role === 'user') {
        const alreadyHasImages = Array.isArray(lastMsg.content) &&
          (lastMsg.content as Anthropic.ContentBlockParam[]).some(
            (p) => p.type === 'image'
          );
        if (!alreadyHasImages) {
          const content: Anthropic.ContentBlockParam[] = [];
          for (const img of request.images) {
            if (!img.data || typeof img.data !== 'string') {
              console.error('[Anthropic] Invalid request-level image data:', {
                mimeType: img.mimeType,
                dataType: typeof img.data,
                dataIsNull: img.data === null,
              });
              continue;
            }
            content.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: img.mimeType,
                data: img.data,
              },
            });
          }
          if (typeof lastMsg.content === 'string') {
            content.push({ type: 'text', text: lastMsg.content });
          }
          lastMsg.content = content;
        }
      }
    }

    return messages;
  }
}
