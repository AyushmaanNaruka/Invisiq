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

providerManager.registerLazy('groq', async () => {
  const { GroqProvider } = await import('./groq');
  return new GroqProvider();
});

providerManager.registerLazy('openrouter', async () => {
  const { OpenRouterProvider } = await import('./openrouter');
  return new OpenRouterProvider();
});

// Ollama has no SDK to lazy-load, but registerLazy's factory pattern works
// fine for a plain construction too — resolveProvider awaits it once.
providerManager.registerLazy('ollama', async () => {
  const { OllamaProvider } = await import('./ollama');
  return new OllamaProvider();
});

export { providerManager };
export type { AIProvider } from './types';
