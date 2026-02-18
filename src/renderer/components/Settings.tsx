import { useState, useEffect, useCallback } from 'react';
import { X, Eye, EyeOff, Check, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { providerManager } from '../services/ai-providers/provider-manager';
import SettingsHotkeys from './SettingsHotkeys';
import SettingsDisplay from './SettingsDisplay';
import SettingsPrivacy from './SettingsPrivacy';
import SettingsAudio from './SettingsAudio';
import { DEFAULT_HOTKEYS } from '@shared/constants';
import type { ProviderID, AppSettings, HotkeyAction } from '@shared/types';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSetting: (key: string, value: unknown) => Promise<void>;
}

interface KeyState {
  value: string;
  masked: boolean;
  status: 'idle' | 'testing' | 'valid' | 'invalid';
  error?: string;
}

const PROVIDERS: { id: ProviderID; name: string; placeholder: string }[] = [
  { id: 'openai', name: 'OpenAI', placeholder: 'sk-proj-...' },
  { id: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-...' },
  { id: 'gemini', name: 'Google Gemini', placeholder: 'AIza...' },
];

type TabId = 'api-keys' | 'hotkeys' | 'display' | 'privacy' | 'audio';

export default function Settings({ isOpen, onClose, settings, onUpdateSetting }: SettingsProps): JSX.Element | null {
  const [activeTab, setActiveTab] = useState<TabId>('api-keys');
  const [keys, setKeys] = useState<Record<ProviderID, KeyState>>({
    openai: { value: '', masked: true, status: 'idle' },
    anthropic: { value: '', masked: true, status: 'idle' },
    gemini: { value: '', masked: true, status: 'idle' },
  });

  // Load existing keys on open
  useEffect(() => {
    if (!isOpen) return;
    PROVIDERS.forEach(async ({ id }) => {
      const { key } = await window.ghostAPI.store.getApiKey(id);
      if (key) {
        setKeys((prev) => ({
          ...prev,
          [id]: { ...prev[id], value: key, status: 'idle' },
        }));
      }
    });
  }, [isOpen]);

  const handleKeyChange = useCallback((provider: ProviderID, value: string) => {
    setKeys((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], value, status: 'idle', error: undefined },
    }));
  }, []);

  const handleSaveKey = useCallback(async (provider: ProviderID) => {
    const key = keys[provider].value.trim();
    if (!key) return;

    await window.ghostAPI.store.setApiKey(provider, key);
    setKeys((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], status: 'idle' },
    }));
  }, [keys]);

  const handleRemoveKey = useCallback(async (provider: ProviderID) => {
    await window.ghostAPI.store.removeApiKey(provider);
    setKeys((prev) => ({
      ...prev,
      [provider]: { value: '', masked: true, status: 'idle', error: undefined },
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
      const p = providerManager.getProvider(provider);
      if (!p) {
        setKeys((prev) => ({
          ...prev,
          [provider]: { ...prev[provider], status: 'invalid', error: 'Provider not found' },
        }));
        return;
      }

      p.initialize(key);
      const result = await p.validateKey();

      if (result.valid) {
        // Save key on successful validation
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
        [provider]: { ...prev[provider], status: 'invalid', error: 'Test failed' },
      }));
    }
  }, [keys]);

  const toggleMask = useCallback((provider: ProviderID) => {
    setKeys((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], masked: !prev[provider].masked },
    }));
  }, []);

  if (!isOpen) return null;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'api-keys', label: 'API Keys' },
    { id: 'hotkeys', label: 'Hotkeys' },
    { id: 'display', label: 'Display' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'audio', label: 'Audio' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1" onClick={onClose} />

      {/* Settings panel */}
      <div
        className="w-[320px] h-full bg-bg-overlay border-l border-border-subtle flex flex-col"
        style={{ animation: 'slideInRight 250ms ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <span className="text-text-primary text-md font-semibold">Settings</span>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border-subtle">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-2 py-2 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-accent-primary border-b-2 border-accent-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'api-keys' && (
            <div className="space-y-5">
              {PROVIDERS.map(({ id, name, placeholder }) => {
                const keyState = keys[id];
                return (
                  <div key={id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-text-primary text-sm font-medium">{name}</label>
                      {keyState.status === 'valid' && (
                        <span className="flex items-center gap-1 text-status-success text-xs">
                          <Check size={12} /> Valid
                        </span>
                      )}
                      {keyState.status === 'invalid' && (
                        <span className="flex items-center gap-1 text-status-error text-xs">
                          <AlertCircle size={12} /> Invalid
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      <input
                        type={keyState.masked ? 'password' : 'text'}
                        value={keyState.value}
                        onChange={(e) => handleKeyChange(id, e.target.value)}
                        onBlur={() => handleSaveKey(id)}
                        placeholder={placeholder}
                        className="w-full bg-bg-input border border-border-subtle rounded-md px-3 py-2 pr-10 text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-border-focus transition-colors"
                      />
                      <button
                        onClick={() => toggleMask(id)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                      >
                        {keyState.masked ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>

                    {keyState.error && (
                      <p className="text-status-error text-xs">{keyState.error}</p>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTestKey(id)}
                        disabled={!keyState.value.trim() || keyState.status === 'testing'}
                        className="px-3 py-1 text-xs font-medium rounded bg-bg-hover text-text-primary hover:bg-border-subtle disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                      >
                        {keyState.status === 'testing' ? (
                          <>
                            <Loader2 size={12} className="animate-spin" /> Testing...
                          </>
                        ) : (
                          'Test Key'
                        )}
                      </button>
                      {keyState.value.trim() && (
                        <button
                          onClick={() => handleRemoveKey(id)}
                          className="p-1 rounded text-text-secondary hover:text-status-error hover:bg-bg-hover transition-colors"
                          title="Remove API key"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'hotkeys' && (
            <SettingsHotkeys
              hotkeys={settings.hotkeys}
              onUpdate={async (action: HotkeyAction, shortcut: string) => {
                const result = await window.ghostAPI.hotkeys.update(action, shortcut);
                if (result.success) {
                  await onUpdateSetting(`hotkeys.${action}`, shortcut);
                }
                return result;
              }}
              onResetAll={async () => {
                for (const [action, shortcut] of Object.entries(DEFAULT_HOTKEYS)) {
                  await window.ghostAPI.hotkeys.update(action, shortcut);
                  await onUpdateSetting(`hotkeys.${action}`, shortcut);
                }
              }}
            />
          )}

          {activeTab === 'display' && (
            <SettingsDisplay
              settings={settings.display}
              onUpdate={onUpdateSetting}
            />
          )}

          {activeTab === 'privacy' && (
            <SettingsPrivacy
              settings={settings.privacy}
              onUpdate={onUpdateSetting}
              onClearAll={async () => {
                await window.ghostAPI.store.clearAll();
                await window.ghostAPI.conversation.deleteAll();
              }}
              onOpenDataFolder={async () => {
                await window.ghostAPI.app.openDataFolder();
              }}
            />
          )}

          {activeTab === 'audio' && (
            <SettingsAudio
              settings={settings.audio}
              onUpdate={onUpdateSetting}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
