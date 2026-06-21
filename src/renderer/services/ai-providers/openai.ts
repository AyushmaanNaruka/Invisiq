import { OPENAI_MODELS } from '@shared/constants';
import { OpenAICompatibleProvider } from './openai-compatible';

/**
 * OpenAI provider — the canonical OpenAI-compatible endpoint (default base URL).
 * All chat/streaming/vision logic lives in OpenAICompatibleProvider; this class
 * only pins the OpenAI identity, model list, and the cheap key-validation model.
 */
export class OpenAIProvider extends OpenAICompatibleProvider {
  constructor() {
    super({
      id: 'openai',
      name: 'OpenAI',
      models: OPENAI_MODELS,
      validationModel: 'gpt-4o-mini',
    });
  }
}
