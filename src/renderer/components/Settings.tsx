import { useState, useEffect, useCallback } from 'react';
import {
  X, Eye, EyeOff, Check, CircleAlert, LoaderCircle, Trash2,
  Key, Keyboard, Monitor, Shield, Mic, Brain, Smartphone, Cpu,
  UserCircle, LogOut, GraduationCap, ShieldCheck,
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
  accountEmail?: string | null;
  onLogout?: () => Promise<void>;
  /** Re-launch the interactive walkthrough (InvisiQ Academy) in replay mode. */
  onReplayTutorial?: () => void;
}

interface KeyState {
  value: string;
  masked: boolean;
  status: 'idle' | 'testing' | 'valid' | 'invalid';
  error?: string;
}

// Cloud-only (Beta Launch Plan §6.3) — Ollama removed permanently.
const PROVIDERS: { id: ProviderID; name: string; placeholder: string }[] = [
  { id: 'openai', name: 'OpenAI', placeholder: 'sk-proj-...' },
  { id: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-...' },
  { id: 'gemini', name: 'Google Gemini', placeholder: 'AIza...' },
  { id: 'groq', name: 'Groq', placeholder: 'gsk_...' },
  { id: 'openrouter', name: 'OpenRouter', placeholder: 'sk-or-v1-...' },
];

type TabId = 'account' | 'api-keys' | 'hotkeys' | 'display' | 'privacy' | 'audio' | 'memory' | 'companion' | 'resilience';

export default function Settings({ isOpen, onClose, settings, onUpdateSetting, compact = false, isStealthFocus = false, onToggleStealthFocus, accountEmail, onLogout, onReplayTutorial }: SettingsProps): JSX.Element | null {
  const [activeTab, setActiveTab] = useState<TabId>('api-keys');
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    if (!onLogout) return;
    setLoggingOut(true);
    try {
      await onLogout();
      // On success, App's auth gate drops back to the login screen and this
      // panel unmounts — no need to close it explicitly.
    } finally {
      setLoggingOut(false);
    }
  }, [onLogout]);
  const [keys, setKeys] = useState<Record<ProviderID, KeyState>>({
    openai: { value: '', masked: true, status: 'idle' },
    anthropic: { value: '', masked: true, status: 'idle' },
    gemini: { value: '', masked: true, status: 'idle' },
    groq: { value: '', masked: true, status: 'idle' },
    openrouter: { value: '', masked: true, status: 'idle' },
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
        // Auto-switch the active model to this provider's default so the user is
        // immediately on a model they have a working key for.
        const defaultModel = p.models?.[0]?.id;
        if (defaultModel) await onUpdateSetting('activeModel', defaultModel);
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
    { id: 'account', icon: <UserCircle size={16} strokeWidth={1.75} />, label: 'Account' },
    { id: 'api-keys', icon: <Key size={16} strokeWidth={1.75} />, label: 'API Keys' },
    { id: 'hotkeys', icon: <Keyboard size={16} strokeWidth={1.75} />, label: 'Hotkeys' },
    { id: 'display', icon: <Monitor size={16} strokeWidth={1.75} />, label: 'Display' },
    { id: 'privacy', icon: <Shield size={16} strokeWidth={1.75} />, label: 'Privacy' },
    { id: 'audio', icon: <Mic size={16} strokeWidth={1.75} />, label: 'Audio' },
    { id: 'memory', icon: <Brain size={16} strokeWidth={1.75} />, label: 'Memory' },
    { id: 'companion', icon: <Smartphone size={16} strokeWidth={1.75} />, label: 'Companion' },
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
          {activeTab === 'account' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-text-primary text-sm font-medium">Signed in as</label>
                <div className="flex items-center gap-3 bg-bg-input border border-border-subtle rounded-md px-3 py-2.5">
                  <UserCircle size={20} className="text-text-secondary shrink-0" />
                  <span className="text-sm text-text-primary truncate">
                    {accountEmail || 'Google account'}
                  </span>
                </div>
                <p className="text-text-secondary text-[10px]">
                  You're signed in with Google. Signing out returns you to the login screen; your
                  API keys and conversations stay on this device.
                </p>
              </div>

              {onReplayTutorial && (
                <div className="space-y-2 border-t border-border-subtle pt-4">
                  <label className="text-text-primary text-sm font-medium">Learn InvisiQ</label>
                  <p className="text-text-secondary text-[10px]">
                    Replay the interactive walkthrough — every feature, step by step.
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      onReplayTutorial();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors"
                  >
                    <GraduationCap size={15} /> Replay tutorial
                  </button>
                </div>
              )}

              <button
                onClick={handleLogout}
                disabled={loggingOut || !onLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-status-error/10 text-status-error hover:bg-status-error/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loggingOut ? (
                  <>
                    <LoaderCircle size={14} className="animate-spin" /> Signing out...
                  </>
                ) : (
                  <>
                    <LogOut size={14} /> Sign Out
                  </>
                )}
              </button>
            </div>
          )}
          {activeTab === 'api-keys' && (
            <div className="space-y-5">
              <div className="flex items-start gap-2 rounded-md border border-accent-primary/25 bg-accent-primary/[0.06] px-3 py-2.5">
                <ShieldCheck size={15} className="mt-0.5 shrink-0 text-accent-primary" />
                <p className="text-[11px] leading-relaxed text-text-secondary">
                  <span className="font-medium text-text-primary">Your API keys never leave this device.</span>{' '}
                  They’re encrypted and stored locally — never sent to our servers, logged, or shared.
                  Requests go straight from your machine to the AI provider.
                </p>
              </div>
              {PROVIDERS.map(({ id, name, placeholder }) => {
                const keyState = keys[id];
                return (
                  <div key={id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-text-primary text-sm font-medium flex items-center gap-1.5">
                        {name}
                      </label>
                      {keyState.status === 'valid' && (
                        <span className="flex items-center gap-1 text-status-success text-xs">
                          <Check size={12} /> Valid
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
                          'Test Key'
                        )}
                      </button>
                      {keyState.value.trim() && (
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
