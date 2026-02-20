import { useState, useCallback } from 'react';
import { Eye, EyeOff, Check, CircleAlert, LoaderCircle } from 'lucide-react';
import { providerManager } from '../services/ai-providers/provider-manager';
import type { ProviderID } from '@shared/types';

interface OnboardingApiKeyProps {
  onContinue: () => void;
}

interface KeyState {
  value: string;
  masked: boolean;
  status: 'idle' | 'testing' | 'valid' | 'invalid';
  error?: string;
}

const PROVIDERS: { id: ProviderID; name: string; placeholder: string; color: string }[] = [
  { id: 'openai', name: 'OpenAI', placeholder: 'sk-proj-...', color: '#10A37F' },
  { id: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-...', color: '#D4A574' },
  { id: 'gemini', name: 'Google Gemini', placeholder: 'AIza...', color: '#4285F4' },
];

export default function OnboardingApiKey({ onContinue }: OnboardingApiKeyProps): JSX.Element {
  const [keys, setKeys] = useState<Record<ProviderID, KeyState>>({
    openai: { value: '', masked: true, status: 'idle' },
    anthropic: { value: '', masked: true, status: 'idle' },
    gemini: { value: '', masked: true, status: 'idle' },
  });

  const hasAnyKey = Object.values(keys).some((k) => k.status === 'valid');

  const handleKeyChange = useCallback((provider: ProviderID, value: string) => {
    setKeys((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], value, status: 'idle', error: undefined },
    }));
  }, []);

  const handleTestKey = useCallback(async (provider: ProviderID) => {
    const key = keys[provider].value.trim();
    if (!key) return;

    setKeys((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], status: 'testing' },
    }));

    try {
      const p = await providerManager.resolveProvider(provider);
      if (!p) {
        setKeys((prev) => ({
          ...prev,
          [provider]: { ...prev[provider], status: 'invalid', error: 'Provider not available' },
        }));
        return;
      }

      p.initialize(key);
      const result = await p.validateKey();

      if (result.valid) {
        await window.ghostAPI.store.setApiKey(provider, key);
        setKeys((prev) => ({
          ...prev,
          [provider]: { ...prev[provider], status: 'valid', error: undefined },
        }));
      } else {
        setKeys((prev) => ({
          ...prev,
          [provider]: { ...prev[provider], status: 'invalid', error: result.error },
        }));
      }
    } catch {
      setKeys((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], status: 'invalid', error: 'Connection failed' },
      }));
    }
  }, [keys]);

  const toggleMask = useCallback((provider: ProviderID) => {
    setKeys((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], masked: !prev[provider].masked },
    }));
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <h2 className="text-text-primary text-lg font-semibold mb-1">Connect an AI Provider</h2>
        <p className="text-text-secondary text-xs mb-5">
          Add at least one API key to get started. You can add more later in Settings.
        </p>

        <div className="space-y-4">
          {PROVIDERS.map(({ id, name, placeholder, color }) => {
            const keyState = keys[id];
            return (
              <div
                key={id}
                className="rounded-lg border border-border-subtle p-3 space-y-2"
                style={{ borderLeftWidth: '3px', borderLeftColor: color }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-text-primary text-sm font-medium">{name}</span>
                  {keyState.status === 'valid' && (
                    <span className="flex items-center gap-1 text-status-success text-xs">
                      <Check size={12} /> Connected
                    </span>
                  )}
                  {keyState.status === 'invalid' && (
                    <span className="flex items-center gap-1 text-status-error text-xs">
                      <CircleAlert size={12} /> Invalid
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={keyState.masked ? 'password' : 'text'}
                    value={keyState.value}
                    onChange={(e) => handleKeyChange(id, e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-bg-input border border-border-subtle rounded-md px-3 py-2 pr-10 text-xs text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-border-focus transition-colors"
                  />
                  <button
                    onClick={() => toggleMask(id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                  >
                    {keyState.masked ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                {keyState.error && (
                  <p className="text-status-error text-[10px]">{keyState.error}</p>
                )}

                <button
                  onClick={() => handleTestKey(id)}
                  disabled={!keyState.value.trim() || keyState.status === 'testing'}
                  className="px-3 py-1 text-xs font-medium rounded bg-bg-hover text-text-primary hover:bg-border-subtle disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  {keyState.status === 'testing' ? (
                    <>
                      <LoaderCircle size={12} className="animate-spin" /> Testing...
                    </>
                  ) : (
                    'Test Key'
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-6 py-4 border-t border-border-subtle flex items-center justify-between">
        <button
          onClick={onContinue}
          className="text-text-secondary text-xs hover:text-text-primary transition-colors"
        >
          Skip for now
        </button>
        <button
          onClick={onContinue}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            hasAnyKey
              ? 'bg-accent-primary text-white hover:bg-accent-primary/80'
              : 'bg-bg-hover text-text-secondary'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
