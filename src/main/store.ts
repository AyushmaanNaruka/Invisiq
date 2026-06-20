import Store from 'electron-store';
import { app } from 'electron';
import { existsSync, copyFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { encryptApiKey, decryptApiKey, hasServerFragment, isLegacyApiKeyPayload } from './crypto';
import { DEFAULT_SETTINGS, DEFAULT_WINDOW_STATE, DEFAULT_PROCESS_NAME } from '@shared/constants';
import type { AppSettings, ProviderID, EncryptedPayload, WindowState } from '@shared/types';

interface StoredAuthSession {
  refreshToken: EncryptedPayload; // encrypted with the machine-only key
  userId: string;
  email: string | null;
}

interface StoreSchema {
  settings: AppSettings;
  keys: {
    openai?: EncryptedPayload;
    anthropic?: EncryptedPayload;
    gemini?: EncryptedPayload;
  };
  windowState: WindowState;
  auth?: StoredAuthSession;
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
  // longer accepts `projectName`. The data dir is "RuntimeBroker" (frozen
  // INTERNAL identity — invisible to proctoring/EDR, kept stable so existing
  // users' encrypted keys stay decryptable; NOT the de-impersonated visible
  // process name). `name` below fixes the config filename.
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
//  LEGACY DISGUISE-NAME MIGRATION
// ══════════════════════════════════════

/**
 * The legacy default process name was 'RuntimeBroker' — a Microsoft-impersonation
 * disguise we've removed (EDR/AV/legal liability). Reset any install still on
 * that exact legacy default to the neutral DEFAULT_PROCESS_NAME so de-
 * impersonation is total. A user's CUSTOM alias is preserved (only the exact
 * legacy default is rewritten). The userData directory is intentionally NOT
 * touched — it's a frozen internal identity (see store init above), so keys are
 * never put at risk.
 */
function migrateLegacyProcessName(): void {
  try {
    const current = store.get('settings.privacy.processName') as string | undefined;
    if (current === 'RuntimeBroker') {
      store.set('settings.privacy.processName', DEFAULT_PROCESS_NAME);
    }
  } catch {
    // Best-effort — never block startup on a migration.
  }
}

migrateLegacyProcessName();

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

// Ollama removed permanently for the beta (Beta Launch Plan §6.3) — cloud-only.
const VALID_PROVIDERS: ProviderID[] = ['openai', 'anthropic', 'gemini'];

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

  // Entitlement gate (Beta Launch Plan §6.1): with no server fragment held
  // (trial expired or unverified), API keys cannot be decrypted — so no key is
  // returned and no provider can initialize. This is the core trial enforcement.
  if (!hasServerFragment()) {
    return null;
  }

  const encrypted = store.get(`keys.${provider}`) as EncryptedPayload | undefined;
  if (!encrypted || !encrypted.iv || !encrypted.data || !encrypted.tag) {
    return null;
  }

  try {
    const plain = decryptApiKey(encrypted);
    // Migrate legacy (machine-key, v1) payloads to the entitled (v2) scheme on
    // first read while active. Guarded so a re-encrypt failure never bricks the
    // key — we've already decrypted it successfully.
    if (isLegacyApiKeyPayload(encrypted)) {
      try {
        store.set(`keys.${provider}`, encryptApiKey(plain));
      } catch (migErr) {
        console.error(`Key migration failed for ${provider} (kept legacy):`, migErr);
      }
    }
    return plain;
  } catch (error) {
    console.error(`Failed to decrypt ${provider} API key:`, error);
    // Clear corrupted entry so the user is prompted to re-enter rather than
    // hitting a permanent silent failure.
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
//  AUTH SESSION (refresh token encrypted)
// ══════════════════════════════════════

export function getAuthSession(): StoredAuthSession | null {
  return (store.get('auth') as StoredAuthSession | undefined) ?? null;
}

export function setAuthSession(session: StoredAuthSession): void {
  store.set('auth', session);
}

export function clearAuthSession(): void {
  store.delete('auth' as keyof StoreSchema);
}

// ══════════════════════════════════════
//  CLEAR ALL
// ══════════════════════════════════════

export function clearAll(): void {
  store.clear();
}
