import { useState, useEffect, useCallback } from 'react';
import type { AppSettings } from '@shared/types';
import { DEFAULT_SETTINGS } from '@shared/constants';

interface UseSettingsReturn {
  settings: AppSettings;
  isLoading: boolean;
  updateSetting: (key: string, value: unknown) => Promise<void>;
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    window.ghostAPI.store.getAll()
      .then((loaded) => {
        // Deep-merge with defaults so newly added keys are always present
        const merged = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
        const src = loaded as unknown as Record<string, unknown>;
        for (const key of Object.keys(src)) {
          if (
            src[key] !== null &&
            typeof src[key] === 'object' &&
            !Array.isArray(src[key]) &&
            typeof merged[key] === 'object' &&
            merged[key] !== null &&
            !Array.isArray(merged[key])
          ) {
            merged[key] = { ...(merged[key] as Record<string, unknown>), ...(src[key] as Record<string, unknown>) };
          } else {
            merged[key] = src[key];
          }
        }
        setSettings(merged as unknown as AppSettings);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const updateSetting = useCallback(async (key: string, value: unknown) => {
    await window.ghostAPI.store.set(key, value);
    setSettings((prev) => {
      const updated = { ...prev };
      const keys = key.split('.');
      let obj: Record<string, unknown> = updated as unknown as Record<string, unknown>;
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...(obj[keys[i]] as Record<string, unknown>) };
        obj = obj[keys[i]] as Record<string, unknown>;
      }
      obj[keys[keys.length - 1]] = value;
      return updated;
    });
  }, []);

  return { settings, isLoading, updateSetting };
}
