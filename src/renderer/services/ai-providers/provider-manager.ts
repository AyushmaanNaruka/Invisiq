import { ALL_MODELS } from '@shared/constants';
import type { AIProvider, ModelConfig, ProviderID } from './types';

type ProviderFactory = () => Promise<AIProvider>;

class ProviderManager {
  private providers: Map<ProviderID, AIProvider> = new Map();
  private factories: Map<ProviderID, ProviderFactory> = new Map();

  /** Lazily register a provider factory — SDK is loaded on first use */
  registerLazy(id: ProviderID, factory: ProviderFactory): void {
    this.factories.set(id, factory);
  }

  /** Get a provider synchronously (only returns if already resolved) */
  getProvider(id: ProviderID): AIProvider | undefined {
    return this.providers.get(id);
  }

  /** Resolve a provider — loads SDK lazily if needed */
  async resolveProvider(id: ProviderID): Promise<AIProvider | undefined> {
    const existing = this.providers.get(id);
    if (existing) return existing;

    const factory = this.factories.get(id);
    if (factory) {
      const provider = await factory();
      this.providers.set(id, provider);
      this.factories.delete(id);
      return provider;
    }

    return undefined;
  }

  getAllProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  /** Get all models from static config (no need to resolve providers) */
  getAllModels(): ModelConfig[] {
    return ALL_MODELS;
  }

  async getAvailableModels(): Promise<ModelConfig[]> {
    const models: ModelConfig[] = [];
    for (const model of ALL_MODELS) {
      const { key } = await window.ghostAPI.store.getApiKey(model.provider);
      if (key) {
        models.push(model);
      }
    }
    return models;
  }

  /** Look up model by ID using static config, then resolve provider lazily */
  getModelById(modelId: string): { model: ModelConfig; providerId: ProviderID } | undefined {
    // Check static models first
    const staticModel = ALL_MODELS.find((m) => m.id === modelId);
    if (staticModel) {
      return { model: staticModel, providerId: staticModel.provider };
    }

    // Check any already-resolved providers for the model
    for (const provider of this.providers.values()) {
      const model = provider.models.find((m) => m.id === modelId);
      if (model) {
        return { model, providerId: provider.id };
      }
    }

    return undefined;
  }

  async refreshModels(providerId: ProviderID): Promise<ModelConfig[]> {
    const provider = await this.resolveProvider(providerId);
    if (!provider) return [];
    if ('refreshModels' in provider && typeof (provider as Record<string, unknown>).refreshModels === 'function') {
      return await (provider as unknown as { refreshModels(): Promise<ModelConfig[]> }).refreshModels();
    }
    return provider.models;
  }
}

export const providerManager = new ProviderManager();
