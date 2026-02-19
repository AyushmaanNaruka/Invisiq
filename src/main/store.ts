import Store from 'electron-store';
import { encryptApiKey, decryptApiKey } from './crypto';
import { DEFAULT_SETTINGS, DEFAULT_WINDOW_STATE } from '@shared/constants';
import type { AppSettings, ProviderID, EncryptedPayload, WindowState } from '@shared/types';

interface StoreSchema {
  settings: AppSettings;
  keys: {
    openai?: EncryptedPayload;
    anthropic?: EncryptedPayload;
    gemini?: EncryptedPayload;
    ollama?: EncryptedPayload;
  };
  windowState: WindowState;
}

const store = new Store<StoreSchema>({
  projectName: 'ghostai',
  name: 'ghostai-config',
  defaults: {
    settings: DEFAULT_SETTINGS,
    keys: {},
    windowState: DEFAULT_WINDOW_STATE,
  },
});

// ══════════════════════════════════════
//  SETTINGS
// ══════════════════════════════════════

export function getSettings(): AppSettings {
  return store.get('settings');
}

export function setSettings(settings: AppSettings): void {
  store.set('settings', settings);
}

export function getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
  return store.get(`settings.${key}`) as AppSettings[K];
}

export function setSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): void {
  store.set(`settings.${key}`, value);
}

export function setNestedSetting(key: string, value: unknown): void {
  store.set(`settings.${key}`, value);
}

export function getNestedSetting(key: string): unknown {
  return store.get(`settings.${key}`);
}

// ══════════════════════════════════════
//  API KEYS (ENCRYPTED)
// ══════════════════════════════════════

const VALID_PROVIDERS: ProviderID[] = ['openai', 'anthropic', 'gemini', 'ollama'];

export function setApiKey(provider: ProviderID, key: string): void {
  if (!VALID_PROVIDERS.includes(provider)) {
    throw new Error(`Invalid provider: ${provider}`);
  }

  const encrypted = encryptApiKey(key);
  store.set(`keys.${provider}`, encrypted);
  store.set(`settings.providers.${provider}.hasKey`, true);
}

export function getApiKey(provider: ProviderID): string | null {
  if (!VALID_PROVIDERS.includes(provider)) {
    throw new Error(`Invalid provider: ${provider}`);
  }

  const encrypted = store.get(`keys.${provider}`) as EncryptedPayload | undefined;
  if (!encrypted || !encrypted.iv || !encrypted.data || !encrypted.tag) {
    return null;
  }

  try {
    return decryptApiKey(encrypted);
  } catch (error) {
    console.error(`Failed to decrypt ${provider} API key:`, error);
    // Clear corrupted entry
    store.delete(`keys.${provider}` as keyof StoreSchema);
    store.set(`settings.providers.${provider}.hasKey`, false);
    store.set(`settings.providers.${provider}.isValid`, false);
    return null;
  }
}

export function removeApiKey(provider: ProviderID): void {
  store.delete(`keys.${provider}` as keyof StoreSchema);
  store.set(`settings.providers.${provider}.hasKey`, false);
  store.set(`settings.providers.${provider}.isValid`, false);
}

// ══════════════════════════════════════
//  WINDOW STATE
// ══════════════════════════════════════

export function getWindowState(): WindowState {
  return store.get('windowState');
}

export function setWindowState(state: Partial<WindowState>): void {
  const current = getWindowState();
  store.set('windowState', { ...current, ...state });
}

// ══════════════════════════════════════
//  CLEAR ALL
// ══════════════════════════════════════

export function clearAll(): void {
  store.clear();
}
