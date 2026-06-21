import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Check, CircleAlert, LoaderCircle, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { providerManager } from '../services/ai-providers/provider-manager';
import { staggerContainer, staggerItem } from './ui/animations';
import type { ProviderID } from '@shared/types';

interface OnboardingApiKeyProps {
  /** Notifies the shell whenever at least one provider is connected (for the rail badge). */
  onConnectedChange?: (connected: boolean) => void;
}

interface KeyState {
  value: string;
  masked: boolean;
  status: 'idle' | 'testing' | 'valid' | 'invalid';
  error?: string;
}

const PROVIDERS: {
  id: ProviderID;
  name: string;
  placeholder: string;
  color: string;
  keyUrl: string;
}[] = [
  { id: 'openai', name: 'OpenAI', placeholder: 'sk-proj-…', color: '#10A37F', keyUrl: 'platform.openai.com' },
  { id: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-…', color: '#D4A574', keyUrl: 'console.anthropic.com' },
  { id: 'gemini', name: 'Google Gemini', placeholder: 'AIza…', color: '#4285F4', keyUrl: 'aistudio.google.com' },
  { id: 'groq', name: 'Groq', placeholder: 'gsk_…', color: '#F55036', keyUrl: 'console.groq.com/keys' },
  { id: 'openrouter', name: 'OpenRouter', placeholder: 'sk-or-v1-…', color: '#6566F1', keyUrl: 'openrouter.ai/keys' },
];

export default function OnboardingApiKey({ onConnectedChange }: OnboardingApiKeyProps): JSX.Element {
  const [keys, setKeys] = useState<Record<ProviderID, KeyState>>({
    openai: { value: '', masked: true, status: 'idle' },
    anthropic: { value: '', masked: true, status: 'idle' },
    gemini: { value: '', masked: true, status: 'idle' },
    groq: { value: '', masked: true, status: 'idle' },
    openrouter: { value: '', masked: true, status: 'idle' },
  });

  const handleKeyChange = useCallback((provider: ProviderID, value: string) => {
    setKeys((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], value, status: 'idle', error: undefined },
    }));
  }, []);

  const handleTestKey = useCallback(async (provider: ProviderID) => {
    const key = keys[provider].value.trim();
    if (!key) return;

    setKeys((prev) => ({ ...prev, [provider]: { ...prev[provider], status: 'testing' } }));

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
        // Auto-switch the active model to this provider's default so the user can
        // start chatting immediately on a model they actually have a key for.
        const defaultModel = p.models?.[0]?.id;
        if (defaultModel) {
          try {
            await window.ghostAPI.store.set('activeModel', defaultModel);
          } catch {
            /* non-fatal */
          }
        }
        setKeys((prev) => {
          const next = { ...prev, [provider]: { ...prev[provider], status: 'valid' as const, error: undefined } };
          onConnectedChange?.(Object.values(next).some((k) => k.status === 'valid'));
          return next;
        });
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
  }, [keys, onConnectedChange]);

  const toggleMask = useCallback((provider: ProviderID) => {
    setKeys((prev) => ({ ...prev, [provider]: { ...prev[provider], masked: !prev[provider].masked } }));
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div>
        <h2 className="text-2xl font-semibold text-text-primary">Connect your intelligence</h2>
        <p className="mt-1.5 text-sm text-text-secondary">
          InvisiQ runs on your own API key — your keys are encrypted on-device and never leave it.
          Add one to start; you can add the rest later in Settings.
        </p>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="mt-5 space-y-3"
      >
        {PROVIDERS.map(({ id, name, placeholder, color, keyUrl }) => {
          const keyState = keys[id];
          const connected = keyState.status === 'valid';
          return (
            <motion.div
              key={id}
              variants={staggerItem}
              className="group relative overflow-hidden rounded-xl border border-border-subtle bg-surface-glass/[0.03] p-3.5 transition-colors hover:border-border-subtle/80"
            >
              {/* provider color spine */}
              <span
                className="absolute inset-y-0 left-0 w-[3px] rounded-full"
                style={{ background: color, opacity: connected ? 1 : 0.45 }}
              />
              <div className="flex items-center justify-between pl-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: color, boxShadow: connected ? `0 0 8px ${color}` : 'none' }}
                  />
                  <span className="text-sm font-medium text-text-primary">{name}</span>
                  <span className="hidden items-center gap-0.5 text-[10px] text-text-placeholder sm:inline-flex">
                    {keyUrl}
                    <ArrowUpRight size={10} />
                  </span>
                </div>
                {connected && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1 rounded-full bg-status-success/10 px-2 py-0.5 text-[11px] font-medium text-status-success"
                  >
                    <Check size={11} /> Connected
                  </motion.span>
                )}
                {keyState.status === 'invalid' && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-status-error">
                    <CircleAlert size={11} /> Invalid
                  </span>
                )}
              </div>

              <div className="mt-2.5 flex items-center gap-2 pl-1.5">
                <div className="relative flex-1">
                  <input
                    type={keyState.masked ? 'password' : 'text'}
                    value={keyState.value}
                    onChange={(e) => handleKeyChange(id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleTestKey(id);
                    }}
                    placeholder={placeholder}
                    spellCheck={false}
                    className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2 pr-9 text-sm text-text-primary placeholder:text-text-placeholder focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-accent-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => toggleMask(id)}
                    className="no-drag absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                    tabIndex={-1}
                  >
                    {keyState.masked ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleTestKey(id)}
                  disabled={!keyState.value.trim() || keyState.status === 'testing'}
                  className="no-drag flex h-[38px] min-w-[84px] items-center justify-center gap-1.5 rounded-lg border border-border-subtle bg-bg-hover px-3 text-xs font-medium text-text-primary transition-colors hover:border-accent-primary/50 hover:text-accent-primary disabled:opacity-40"
                >
                  {keyState.status === 'testing' ? (
                    <LoaderCircle size={13} className="animate-spin" />
                  ) : connected ? (
                    'Re-test'
                  ) : (
                    'Connect'
                  )}
                </button>
              </div>

              {keyState.error && (
                <p className="mt-1.5 pl-1.5 text-[11px] text-status-error">{keyState.error}</p>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-accent-primary/25 bg-accent-primary/[0.06] px-3 py-2.5">
        <ShieldCheck size={15} className="mt-0.5 flex-shrink-0 text-accent-primary" />
        <p className="text-[11px] leading-relaxed text-text-secondary">
          <span className="font-semibold text-text-primary">Your API keys never leave this device.</span>{' '}
          They’re encrypted and stored locally — we never send them to our servers, log them, or share
          them with anyone. Every AI request goes straight from your machine to the provider you chose.
        </p>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-text-placeholder">
        During the beta, the <span className="text-text-secondary">text</span> of prompts you send is
        stored to improve InvisiQ — never your screenshots or screen contents. You can wipe it
        anytime in Settings → Privacy.
      </p>
    </div>
  );
}
