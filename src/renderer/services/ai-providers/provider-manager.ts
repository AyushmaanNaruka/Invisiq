import type { AIProvider, ModelConfig, ProviderID } from './types';

class ProviderManager {
  private providers: Map<ProviderID, AIProvider> = new Map();

  register(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
  }

  getProvider(id: ProviderID): AIProvider | undefined {
    return this.providers.get(id);
  }

  getAllProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  getAllModels(): ModelConfig[] {
    const models: ModelConfig[] = [];
    for (const provider of this.providers.values()) {
      models.push(...provider.models);
    }
    return models;
  }

  async getAvailableModels(): Promise<ModelConfig[]> {
    const models: ModelConfig[] = [];
    for (const provider of this.providers.values()) {
      const { key } = await window.ghostAPI.store.getApiKey(provider.id);
      if (key) {
        models.push(...provider.models);
      }
    }
    return models;
  }

  getModelById(modelId: string): { model: ModelConfig; provider: AIProvider } | undefined {
    for (const provider of this.providers.values()) {
      const model = provider.models.find((m) => m.id === modelId);
      if (model) {
        return { model, provider };
      }
    }
    return undefined;
  }
}

export const providerManager = new ProviderManager();
