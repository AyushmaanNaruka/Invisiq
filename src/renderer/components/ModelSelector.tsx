import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Eye, Lock } from 'lucide-react';
import { GhostTooltip } from './ui/GhostTooltip';
import { ALL_MODELS, PROVIDER_IDS } from '@shared/constants';
import type { ModelConfig, ProviderID } from '@shared/types';

interface ModelSelectorProps {
  activeModel: string;
  onModelChange: (modelId: string) => void;
  availableProviders: Set<ProviderID>;
  onOpenSettings: () => void;
  compact?: boolean;
}

// Cloud-only (Beta Launch Plan §6.3) — Ollama removed permanently.
const PROVIDER_LABELS: Record<ProviderID, string> = {
  openai: 'OPENAI',
  anthropic: 'ANTHROPIC',
  gemini: 'GOOGLE',
  groq: 'GROQ',
  openrouter: 'OPENROUTER',
};
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
  const ref = useRef<HTMLDivElement>(null);

  const currentModel = ALL_MODELS.find((m) => m.id === activeModel) || ALL_MODELS[0];

  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Group models by provider
  const grouped = ALL_MODELS.reduce<Partial<Record<ProviderID, ModelConfig[]>>>((acc, model) => {
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
        </div>
      )}
    </div>
  );
}

export default React.memo(ModelSelector);
