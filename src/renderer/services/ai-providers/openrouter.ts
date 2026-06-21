import { OPENROUTER_MODELS } from '@shared/constants';
import { OpenAICompatibleProvider } from './openai-compatible';

/**
 * OpenRouter — OpenAI-compatible at https://openrouter.ai/api/v1.
 * One BYOK key (`sk-or-v1-…`) fans out to DeepSeek, Qwen, Mistral, etc.
 * HTTP-Referer / X-Title are the optional attribution headers OpenRouter
 * uses for app rankings; harmless if omitted but recommended.
 */
export class OpenRouterProvider extends OpenAICompatibleProvider {
  constructor() {
    super({
      id: 'openrouter',
      name: 'OpenRouter',
      models: OPENROUTER_MODELS,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://invisiq.app',
        'X-Title': 'InvisiQ',
      },
    });
  }
}
