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
        setSettings(loaded as AppSettings);
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
