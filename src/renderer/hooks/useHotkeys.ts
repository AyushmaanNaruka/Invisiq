import { useEffect, useCallback, useRef } from 'react';
import type { HotkeyAction } from '@shared/types';

type HotkeyCallback = () => void;

interface UseHotkeysReturn {
  registerCallback: (action: HotkeyAction, callback: HotkeyCallback) => void;
}

export function useHotkeys(): UseHotkeysReturn {
  const callbacksRef = useRef<Map<HotkeyAction, HotkeyCallback>>(new Map());

  useEffect(() => {
    const handler = (data: { action: HotkeyAction }) => {
      const callback = callbacksRef.current.get(data.action);
      if (callback) callback();
    };

    const cleanup = window.ghostAPI.on('hotkeys:triggered', handler);
    return () => {
      cleanup();
    };
  }, []);

  const registerCallback = useCallback((action: HotkeyAction, callback: HotkeyCallback) => {
    callbacksRef.current.set(action, callback);
  }, []);

  return { registerCallback };
}
