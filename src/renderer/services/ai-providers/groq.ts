import { GROQ_MODELS } from '@shared/constants';
import { OpenAICompatibleProvider } from './openai-compatible';

/**
 * Groq — OpenAI-compatible at https://api.groq.com/openai/v1.
 * Keys look like `gsk_…`. Ultra-fast inference; qwen3.6-27b is the vision model.
 */
export class GroqProvider extends OpenAICompatibleProvider {
  constructor() {
    super({
      id: 'groq',
      name: 'Groq',
      models: GROQ_MODELS,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }
}
