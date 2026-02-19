import type { AIProvider, ChatRequest, ChatResponse, StreamChunk, ModelConfig, ValidationResult } from './types';

const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

interface OllamaTagsResponse {
  models: Array<{
    name: string;
    model: string;
    size: number;
    details?: {
      family?: string;
      parameter_size?: string;
    };
  }>;
}

interface OllamaChatChunk {
  model: string;
  message: { role: string; content: string };
  done: boolean;
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

const VISION_KEYWORDS = ['llava', 'vision', 'bakllava', 'moondream', 'llama-vision', 'minicpm-v'];

function isVisionModel(name: string): boolean {
  const lower = name.toLowerCase();
  return VISION_KEYWORDS.some((kw) => lower.includes(kw));
}

export class OllamaProvider implements AIProvider {
  readonly name = 'Ollama';
  readonly id = 'ollama' as const;

  private _models: ModelConfig[] = [];
  private serverUrl: string = DEFAULT_OLLAMA_URL;
  private abortController: AbortController | null = null;

  get models(): ModelConfig[] {
    return this._models;
  }

  initialize(serverUrl: string): void {
    // The "API key" field stores the server URL for Ollama
    this.serverUrl = (serverUrl || DEFAULT_OLLAMA_URL).replace(/\/+$/, '');
  }

  async validateKey(): Promise<ValidationResult> {
    try {
      const res = await fetch(`${this.serverUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) {
        return { valid: false, error: `Ollama returned ${res.status}` };
      }
      const data = (await res.json()) as OllamaTagsResponse;
      const modelNames = data.models?.map((m) => m.name) || [];
      // Refresh model list on successful validation
      this._models = this.buildModelConfigs(data);
      return { valid: true, models: modelNames };
    } catch (error: unknown) {
      const msg = (error as Error).message || 'Connection failed';
      if (msg.includes('fetch') || msg.includes('ECONNREFUSED') || msg.includes('Failed')) {
        return { valid: false, error: 'Cannot connect to Ollama. Is it running?' };
      }
      return { valid: false, error: msg };
    }
  }

  async refreshModels(): Promise<ModelConfig[]> {
    try {
      const res = await fetch(`${this.serverUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return this._models;
      const data = (await res.json()) as OllamaTagsResponse;
      this._models = this.buildModelConfigs(data);
      return this._models;
    } catch {
      return this._models;
    }
  }

  async *chat(request: ChatRequest): AsyncGenerator<StreamChunk, ChatResponse> {
    this.abortController = new AbortController();
    const startTime = Date.now();
    let fullContent = '';
    let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCostUSD: 0 };
    let finishReason: 'stop' | 'max_tokens' | 'error' = 'stop';

    try {
      const messages = this.buildMessages(request);

      const res = await fetch(`${this.serverUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: request.model,
          messages,
          stream: true,
          options: {
            num_predict: request.maxTokens || 4096,
            temperature: request.temperature ?? 0.7,
          },
        }),
        signal: this.abortController.signal,
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => `HTTP ${res.status}`);
        yield { type: 'error', error: `Ollama error: ${errorText}` };
        return {
          content: fullContent,
          model: request.model,
          usage,
          finishReason: 'error',
          latency: Date.now() - startTime,
        };
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk = JSON.parse(line) as OllamaChatChunk;
            if (chunk.message?.content) {
              fullContent += chunk.message.content;
              yield { type: 'text', text: chunk.message.content };
            }
            if (chunk.done) {
              usage = {
                inputTokens: chunk.prompt_eval_count || 0,
                outputTokens: chunk.eval_count || 0,
                totalTokens: (chunk.prompt_eval_count || 0) + (chunk.eval_count || 0),
                estimatedCostUSD: 0, // Local — always free
              };
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        try {
          const chunk = JSON.parse(buffer) as OllamaChatChunk;
          if (chunk.message?.content) {
            fullContent += chunk.message.content;
            yield { type: 'text', text: chunk.message.content };
          }
          if (chunk.done) {
            usage = {
              inputTokens: chunk.prompt_eval_count || 0,
              outputTokens: chunk.eval_count || 0,
              totalTokens: (chunk.prompt_eval_count || 0) + (chunk.eval_count || 0),
              estimatedCostUSD: 0,
            };
          }
        } catch {
          // ignore
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
      yield { type: 'error', error: (error as Error).message };
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
  ): Array<{ role: string; content: string; images?: string[] }> {
    const messages: Array<{ role: string; content: string; images?: string[] }> = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }

    for (const msg of request.messages) {
      if (msg.role === 'system' || msg.role === 'error') continue;

      const entry: { role: string; content: string; images?: string[] } = {
        role: msg.role,
        content: msg.content,
      };

      // Ollama vision: images as raw base64 strings (no data URI prefix)
      if (msg.role === 'user' && msg.images && msg.images.length > 0) {
        entry.images = msg.images.map((img) => img.data);
      }

      messages.push(entry);
    }

    // Attach request-level images to last user message
    if (request.images && request.images.length > 0) {
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      if (lastUser && !lastUser.images) {
        lastUser.images = request.images.map((img) => img.data);
      }
    }

    return messages;
  }

  private buildModelConfigs(data: OllamaTagsResponse): ModelConfig[] {
    if (!data.models) return [];
    return data.models.map((m) => ({
      id: m.name,
      name: m.name,
      provider: 'ollama' as const,
      supportsVision: isVisionModel(m.name),
      maxContextTokens: 128000, // Reasonable default; Ollama doesn't expose this
      maxOutputTokens: 4096,
      costPer1MInput: 0,
      costPer1MOutput: 0,
      speed: 'medium' as const,
    }));
  }
}
