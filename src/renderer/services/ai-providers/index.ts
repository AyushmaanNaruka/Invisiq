import { providerManager } from './provider-manager';
import { OllamaProvider } from './ollama';

// Lazy-load heavy SDK providers — saves ~4MB at startup
providerManager.registerLazy('openai', async () => {
  const { OpenAIProvider } = await import('./openai');
  return new OpenAIProvider();
});

providerManager.registerLazy('anthropic', async () => {
  const { AnthropicProvider } = await import('./anthropic');
  return new AnthropicProvider();
});

providerManager.registerLazy('gemini', async () => {
  const { GeminiProvider } = await import('./gemini');
  return new GeminiProvider();
});

// Ollama is lightweight (no SDK dependency), register eagerly
providerManager.register(new OllamaProvider());

export { providerManager };
export type { AIProvider } from './types';
