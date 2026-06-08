import { useState, useEffect, useCallback } from 'react';
import {
  X, Eye, EyeOff, Check, CircleAlert, LoaderCircle, Trash2, Server,
  Key, Keyboard, Monitor, Shield, Mic, Brain, Smartphone, FileText, Cpu,
} from 'lucide-react';
import { providerManager } from '../services/ai-providers/provider-manager';
import SettingsHotkeys from './SettingsHotkeys';
import SettingsDisplay from './SettingsDisplay';
import SettingsPrivacy from './SettingsPrivacy';
import SettingsAudio from './SettingsAudio';
import SettingsMemory from './SettingsMemory';
import SettingsCompanion from './SettingsCompanion';
import SettingsResilience from './SettingsResilience';
import { GhostTooltip } from './ui/GhostTooltip';
import { DEFAULT_HOTKEYS } from '@shared/constants';
import type { ProviderID, AppSettings, HotkeyAction } from '@shared/types';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSetting: (key: string, value: unknown) => Promise<void>;
  compact?: boolean;
  isStealthFocus?: boolean;
  onToggleStealthFocus?: () => void;
}

interface KeyState {
  value: string;
  masked: boolean;
  status: 'idle' | 'testing' | 'valid' | 'invalid';
  error?: string;
}

// Cloud-only (Beta Launch Plan §6.3) — Ollama removed permanently.
const PROVIDERS: { id: ProviderID; name: string; placeholder: string; isServerUrl?: boolean }[] = [
  { id: 'openai', name: 'OpenAI', placeholder: 'sk-proj-...' },
  { id: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-...' },
  { id: 'gemini', name: 'Google Gemini', placeholder: 'AIza...' },
];

type TabId = 'api-keys' | 'hotkeys' | 'display' | 'privacy' | 'audio' | 'memory' | 'companion' | 'templates' | 'resilience';

export default function Settings({ isOpen, onClose, settings, onUpdateSetting, compact = false, isStealthFocus = false, onToggleStealthFocus }: SettingsProps): JSX.Element | null {
  const [activeTab, setActiveTab] = useState<TabId>('api-keys');
  const [keys, setKeys] = useState<Record<ProviderID, KeyState>>({
    openai: { value: '', masked: true, status: 'idle' },
    anthropic: { value: '', masked: true, status: 'idle' },
    gemini: { value: '', masked: true, status: 'idle' },
    ollama: { value: 'http://localhost:11434', masked: false, status: 'idle' },
  });

  // Load existing keys on open
  useEffect(() => {
    if (!isOpen) return;
    PROVIDERS.forEach(async ({ id, isServerUrl }) => {
      const { key } = await window.ghostAPI.store.getApiKey(id);
      if (key) {
        setKeys((prev) => ({
          ...prev,
          [id]: { ...prev[id], value: key, masked: isServerUrl ? false : prev[id].masked, status: 'idle' },
        }));
      } else if (isServerUrl) {
        // Ollama defaults to localhost — no stored value means use default
        setKeys((prev) => ({
          ...prev,
          [id]: { ...prev[id], value: 'http://localhost:11434', masked: false, status: 'idle' },
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
      const p = await providerManager.resolveProvider(provider);
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
        // Save key/URL on successful validation
        await window.ghostAPI.store.setApiKey(provider, key);
        const validMsg = result.models && result.models.length > 0
          ? `${result.models.length} model${result.models.length === 1 ? '' : 's'} found`
          : undefined;
        setKeys((prev) => ({
          ...prev,
          [provider]: { ...prev[provider], status: 'valid', error: validMsg },
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

  const NAV_ITEMS: { id: TabId; icon: JSX.Element; label: string }[] = [
    { id: 'api-keys', icon: <Key size={16} strokeWidth={1.75} />, label: 'API Keys' },
    { id: 'hotkeys', icon: <Keyboard size={16} strokeWidth={1.75} />, label: 'Hotkeys' },
    { id: 'display', icon: <Monitor size={16} strokeWidth={1.75} />, label: 'Display' },
    { id: 'privacy', icon: <Shield size={16} strokeWidth={1.75} />, label: 'Privacy' },
    { id: 'audio', icon: <Mic size={16} strokeWidth={1.75} />, label: 'Audio' },
    { id: 'memory', icon: <Brain size={16} strokeWidth={1.75} />, label: 'Memory' },
    { id: 'companion', icon: <Smartphone size={16} strokeWidth={1.75} />, label: 'Companion' },
    { id: 'templates', icon: <FileText size={16} strokeWidth={1.75} />, label: 'Templates' },
    { id: 'resilience', icon: <Cpu size={16} strokeWidth={1.75} />, label: 'Resilience' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1" onClick={onClose} />

      {/* Settings panel */}
      <div
        className={`${compact ? 'w-full' : 'w-[360px]'} h-full bg-bg-overlay border-l border-border-subtle flex flex-col`}
        style={{ animation: 'slideInRight 250ms ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle shrink-0">
          <span className="text-text-primary text-sm font-semibold">Settings</span>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          >
            <X size={15} strokeWidth={1.75} />
          </button>
        </div>

        {/* Body: icon sidebar + content */}
        <div className="flex flex-1 min-h-0">
          {/* Left icon sidebar */}
          <div className="w-12 border-r border-border-subtle flex flex-col py-2 gap-1 shrink-0">
            {NAV_ITEMS.map((item) => (
              <GhostTooltip key={item.id} content={item.label} placement="bottom">
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`mx-1 p-2 rounded-md flex items-center justify-center transition-colors ${
                    activeTab === item.id
                      ? 'bg-accent-primary/10 text-accent-primary'
                      : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                  }`}
                >
                  {item.icon}
                </button>
              </GhostTooltip>
            ))}
          </div>

          {/* Right content area */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Section label */}
            <div className="px-4 py-2 border-b border-border-subtle shrink-0">
              <span className="text-xs font-medium text-text-primary">
                {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'api-keys' && (
            <div className="space-y-5">
              {PROVIDERS.map(({ id, name, placeholder, isServerUrl }) => {
                const keyState = keys[id];
                return (
                  <div key={id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-text-primary text-sm font-medium flex items-center gap-1.5">
                        {isServerUrl && <Server size={12} className="text-text-secondary" />}
                        {name}
                      </label>
                      {keyState.status === 'valid' && (
                        <span className="flex items-center gap-1 text-status-success text-xs">
                          <Check size={12} /> {isServerUrl ? 'Connected' : 'Valid'}
                        </span>
                      )}
                      {keyState.status === 'invalid' && (
                        <span className="flex items-center gap-1 text-status-error text-xs">
                          <CircleAlert size={12} /> {isServerUrl ? 'Unreachable' : 'Invalid'}
                        </span>
                      )}
                    </div>

                    {isServerUrl && (
                      <p className="text-text-secondary text-[10px]">Server URL (no API key needed)</p>
                    )}

                    <div className="relative">
                      <input
                        type={keyState.masked ? 'password' : 'text'}
                        value={keyState.value}
                        onChange={(e) => handleKeyChange(id, e.target.value)}
                        onBlur={() => handleSaveKey(id)}
                        placeholder={placeholder}
                        className="w-full bg-bg-input border border-border-subtle rounded-md px-3 py-2 pr-10 text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-border-focus transition-colors"
                      />
                      {!isServerUrl && (
                        <button
                          onClick={() => toggleMask(id)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                        >
                          {keyState.masked ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      )}
                    </div>

                    {keyState.error && (
                      <p className={`text-xs ${keyState.status === 'valid' ? 'text-status-success' : 'text-status-error'}`}>
                        {keyState.error}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
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
                          isServerUrl ? 'Test Connection' : 'Test Key'
                        )}
                      </button>
                      {keyState.value.trim() && !isServerUrl && (
                        <GhostTooltip content="Remove API key" placement="top">
                          <button
                            onClick={() => handleRemoveKey(id)}
                            className="p-1 rounded text-text-secondary hover:text-status-error hover:bg-bg-hover transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </GhostTooltip>
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
              stealth={settings.stealth}
              isStealthFocus={isStealthFocus}
              onToggleStealthFocus={onToggleStealthFocus}
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
              meetingSettings={settings.meeting}
              onUpdate={onUpdateSetting}
            />
          )}

          {activeTab === 'memory' && (
            <SettingsMemory
              settings={settings.memory}
              onUpdate={onUpdateSetting}
            />
          )}

          {activeTab === 'companion' && (
            <SettingsCompanion
              enabled={settings.companion?.enabled ?? false}
              port={settings.companion?.port ?? 3847}
              onUpdate={onUpdateSetting}
            />
          )}

          {activeTab === 'templates' && (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
              <FileText size={28} strokeWidth={1.25} className="text-text-placeholder" />
              <div>
                <p className="text-xs font-medium text-text-primary">Template Library</p>
                <p className="text-[10px] text-text-placeholder mt-1">
                  Open with Ctrl+T or from the chat input menu
                </p>
              </div>
            </div>
          )}

          {activeTab === 'resilience' && (
            <SettingsResilience
              settings={settings.resilience ?? { enabled: false, autoStart: false, helperPath: '', pipeName: 'InvisiQ' }}
              onUpdate={onUpdateSetting}
            />
          )}
        </div>
          </div>
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
