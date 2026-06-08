import { providerManager } from './provider-manager';

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

// Ollama removed permanently for the beta (Beta Launch Plan §6.3) — cloud-only.

export { providerManager };
export type { AIProvider } from './types';
