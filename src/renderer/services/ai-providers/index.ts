import { providerManager } from './provider-manager';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GeminiProvider } from './gemini';

// Register all providers
providerManager.register(new OpenAIProvider());
providerManager.register(new AnthropicProvider());
providerManager.register(new GeminiProvider());

export { providerManager };
export type { AIProvider } from './types';
