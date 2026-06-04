import Store from 'electron-store';
import { app } from 'electron';
import { existsSync, copyFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
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

// ══════════════════════════════════════
//  MIGRATE FROM OLD CONFIG PATH
// ══════════════════════════════════════

function migrateFromOldConfig(): void {
  try {
    const appData = app.getPath('appData');
    const oldDir = join(appData, 'ghostai');
    const oldFile = join(oldDir, 'ghostai-config.json');
    const newDir = join(appData, 'RuntimeBroker');
    const newFile = join(newDir, 'runtime-broker-config.json');

    // Only migrate if old config exists and new one does not
    if (existsSync(oldFile) && !existsSync(newFile)) {
      // Create new directory if needed
      if (!existsSync(newDir)) {
        mkdirSync(newDir, { recursive: true });
      }

      // Copy config to new location
      copyFileSync(oldFile, newFile);

      // Remove old directory
      rmSync(oldDir, { recursive: true, force: true });
    }
  } catch {
    // Migration is best-effort — don't block startup
  }
}

// Run migration before creating the store
migrateFromOldConfig();

const store = new Store<StoreSchema>({
  // electron-store v10 derives the path from app.getPath('userData') and no
  // longer accepts `projectName`. The data dir stays "RuntimeBroker" via the
  // app name; `name` below fixes the config filename (disguise preserved).
  name: 'runtime-broker-config',
  defaults: {
    settings: DEFAULT_SETTINGS,
    keys: {},
    windowState: DEFAULT_WINDOW_STATE,
  },
});

// ══════════════════════════════════════
//  SETTINGS SCHEMA BACKFILL
// ══════════════════════════════════════

/**
 * electron-store only applies `defaults` when a key is entirely absent — it does
 * NOT deep-merge new nested keys into an existing `settings` object. So when we
 * add a new settings block (e.g. Model B's `stealth`), existing users would have
 * it `undefined`. This backfills any missing top-level blocks and missing nested
 * keys from DEFAULT_SETTINGS without clobbering user-set values. Runs once at boot.
 */
function backfillSettingsSchema(): void {
  try {
    const current = store.get('settings') as unknown as Record<string, unknown> | undefined;
    if (!current || typeof current !== 'object') {
      store.set('settings', DEFAULT_SETTINGS);
      return;
    }

    let changed = false;
    const merged: Record<string, unknown> = { ...current };
    const defaults = DEFAULT_SETTINGS as unknown as Record<string, unknown>;

    for (const [key, defVal] of Object.entries(defaults)) {
      if (!(key in merged) || merged[key] === undefined) {
        merged[key] = defVal;
        changed = true;
      } else if (
        defVal !== null &&
        typeof defVal === 'object' &&
        !Array.isArray(defVal) &&
        typeof merged[key] === 'object' &&
        merged[key] !== null &&
        !Array.isArray(merged[key])
      ) {
        // Shallow-merge one level of nested defaults (e.g. stealth.relaxWhenSafe)
        const sub = { ...(merged[key] as Record<string, unknown>) };
        for (const [subKey, subDef] of Object.entries(defVal as Record<string, unknown>)) {
          if (!(subKey in sub) || sub[subKey] === undefined) {
            sub[subKey] = subDef;
            changed = true;
          }
        }
        merged[key] = sub;
      }
    }

    if (changed) {
      store.set('settings', merged);
    }
  } catch {
    // Best-effort — never block startup on a migration.
  }
}

backfillSettingsSchema();

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
