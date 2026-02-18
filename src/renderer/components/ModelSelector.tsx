import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Eye, Lock } from 'lucide-react';
import { ALL_MODELS } from '@shared/constants';
import type { ModelConfig, ProviderID } from '@shared/types';

interface ModelSelectorProps {
  activeModel: string;
  onModelChange: (modelId: string) => void;
  availableProviders: Set<ProviderID>;
  onOpenSettings: () => void;
}

const PROVIDER_LABELS: Record<ProviderID, string> = {
  openai: 'OPENAI',
  anthropic: 'ANTHROPIC',
  gemini: 'GOOGLE',
};

export default function ModelSelector({
  activeModel,
  onModelChange,
  availableProviders,
  onOpenSettings,
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
  const grouped = ALL_MODELS.reduce<Record<ProviderID, ModelConfig[]>>((acc, model) => {
    if (!acc[model.provider]) acc[model.provider] = [];
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<ProviderID, ModelConfig[]>);

  return (
    <div ref={ref} className="relative no-drag">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-bg-hover text-text-primary text-xs transition-colors"
      >
        <span>{currentModel.name}</span>
        <ChevronDown size={12} className="text-text-secondary" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-52 bg-bg-overlay border border-border-subtle rounded-md shadow-dropdown z-50 max-h-[300px] overflow-y-auto">
          {(Object.entries(grouped) as [ProviderID, ModelConfig[]][]).map(([provider, models]) => {
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
                    <div className="flex items-center gap-1">
                      {model.supportsVision && (
                        <Eye size={10} className="text-text-secondary" />
                      )}
                    </div>
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
