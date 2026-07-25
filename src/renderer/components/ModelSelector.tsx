import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Eye, Lock, Server } from 'lucide-react';
import { GhostTooltip } from './ui/GhostTooltip';
import { ALL_MODELS, PROVIDER_IDS } from '@shared/constants';
import { providerManager } from '../services/ai-providers/provider-manager';
import type { ModelConfig, ProviderID } from '@shared/types';

interface ModelSelectorProps {
  activeModel: string;
  onModelChange: (modelId: string) => void;
  availableProviders: Set<ProviderID>;
  onOpenSettings: () => void;
  compact?: boolean;
}

const PROVIDER_LABELS: Record<ProviderID, string> = {
  openai: 'OPENAI',
  anthropic: 'ANTHROPIC',
  gemini: 'GOOGLE',
  groq: 'GROQ',
  openrouter: 'OPENROUTER',
  ollama: 'OLLAMA (LOCAL)',
};
// Static, cost-tracked cloud providers in display order. Ollama is NOT in
// PROVIDER_IDS (it's a local server with a dynamic model list, not a static
// catalog) — it's appended separately below, after its models are fetched.
const PROVIDER_ORDER: ProviderID[] = PROVIDER_IDS;

function abbreviateModelName(name: string): string {
  // "GPT-4o Mini" → "4o Mini", "Claude 3.5 Sonnet" → "3.5 Son.", "Gemini 1.5 Pro" → "1.5 Pro"
  return name
    .replace(/^GPT-/, '')
    .replace(/^Claude\s*/, '')
    .replace(/^Gemini\s*/, '')
    .replace(/Sonnet$/, 'Son.')
    .replace(/Haiku$/, 'Hai.');
}

function ModelSelector({
  activeModel,
  onModelChange,
  availableProviders,
  onOpenSettings,
  compact = false,
}: ModelSelectorProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<ModelConfig[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const ollamaRefreshed = useRef(false);

  // Combine static (cloud) models with dynamically-fetched Ollama models
  const allModels = [...ALL_MODELS, ...ollamaModels];
  const currentModel = allModels.find((m) => m.id === activeModel) || ALL_MODELS[0];

  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Refresh Ollama's model list when the dropdown opens (once per open)
  const refreshOllama = useCallback(async () => {
    try {
      const ollamaProvider = await providerManager.resolveProvider('ollama');
      if (!ollamaProvider) return;
      const { key: serverUrl } = await window.ghostAPI.store.getApiKey('ollama');
      ollamaProvider.initialize(serverUrl || 'http://localhost:11434');
      const models = await providerManager.refreshModels('ollama');
      setOllamaModels(models);
    } catch {
      // Ollama not available — leave ollamaModels empty, section shows "Not detected"
    }
  }, []);

  useEffect(() => {
    if (isOpen && !ollamaRefreshed.current) {
      ollamaRefreshed.current = true;
      refreshOllama();
    }
    if (!isOpen) {
      ollamaRefreshed.current = false;
    }
  }, [isOpen, refreshOllama]);

  // Group models by provider
  const grouped = allModels.reduce<Partial<Record<ProviderID, ModelConfig[]>>>((acc, model) => {
    if (!acc[model.provider]) acc[model.provider] = [];
    acc[model.provider]!.push(model);
    return acc;
  }, {});

  return (
    <div ref={ref} className="relative no-drag">
      <GhostTooltip content={currentModel.name} placement="bottom" disabled={!compact}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-bg-hover text-text-primary text-xs transition-colors"
        >
          <span>{compact ? abbreviateModelName(currentModel.name) : currentModel.name}</span>
          <ChevronDown size={12} className="text-text-secondary" />
        </button>
      </GhostTooltip>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-52 bg-bg-overlay border border-border-subtle rounded-md shadow-dropdown z-50 max-h-[300px] overflow-y-auto">
          {PROVIDER_ORDER.map((provider) => {
            const models = grouped[provider];
            if (!models || models.length === 0) return null;

            const hasKey = availableProviders.has(provider);

            return (
              <div key={provider}>
                <div className="px-3 py-1.5 text-text-placeholder text-[10px] font-bold uppercase tracking-wider">
                  {PROVIDER_LABELS[provider]}
                </div>
                {models.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      if (hasKey) {
                        onModelChange(model.id);
                        setIsOpen(false);
                      } else {
                        onOpenSettings();
                        setIsOpen(false);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-bg-hover transition-colors ${
                      model.id === activeModel
                        ? 'text-accent-primary'
                        : hasKey
                        ? 'text-text-primary'
                        : 'text-text-placeholder'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {!hasKey && <Lock size={10} />}
                      <span>{model.name}</span>
                    </div>
                    {model.supportsVision && <Eye size={10} className="text-text-secondary" />}
                  </button>
                ))}
              </div>
            );
          })}

          {/* Ollama: dynamic local models, shown separately from the static cloud catalog */}
          {ollamaModels.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-text-placeholder text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Server size={9} />
                {PROVIDER_LABELS.ollama}
              </div>
              {ollamaModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    onModelChange(model.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-bg-hover transition-colors ${
                    model.id === activeModel ? 'text-accent-primary' : 'text-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{model.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {model.supportsVision && <Eye size={10} className="text-text-secondary" />}
                    <span className="text-[9px] text-status-success">Free</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Show the Ollama section even when nothing is detected, so users discover it */}
          {ollamaModels.length === 0 && (
            <div>
              <div className="px-3 py-1.5 text-text-placeholder text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Server size={9} />
                {PROVIDER_LABELS.ollama}
              </div>
              <div className="px-3 py-2 text-text-placeholder text-[10px]">
                Not detected. Install Ollama and pull a model to use local AI.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default React.memo(ModelSelector);
