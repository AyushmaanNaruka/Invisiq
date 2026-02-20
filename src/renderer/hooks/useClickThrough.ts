import { useState, useCallback, useEffect, useRef } from 'react';

interface UseClickThroughReturn {
  isPassthrough: boolean;
  togglePassthrough: () => Promise<void>;
  setPassthroughEnabled: (enabled: boolean) => Promise<void>;
}

/**
 * Manages overlay click-through (passthrough) mode.
 *
 * When passthrough is enabled, mouse events pass through the overlay window
 * to the application beneath. The overlay remains visible but non-interactive.
 *
 * Because setIgnoreMouseEvents(true, { forward: true }) still delivers
 * mousemove events to the renderer, we can detect when the cursor re-enters
 * the visible window bounds and could restore interactivity (future enhancement).
 */
export function useClickThrough(): UseClickThroughReturn {
  const [isPassthrough, setIsPassthrough] = useState(false);
  const activeRef = useRef(false);

  const setPassthroughEnabled = useCallback(async (enabled: boolean): Promise<void> => {
    try {
      await window.ghostAPI.overlay.setPassthrough(enabled, true);
      setIsPassthrough(enabled);
      activeRef.current = enabled;
    } catch (err) {
      console.error('[useClickThrough] Failed to set passthrough:', err);
    }
  }, []);

  const togglePassthrough = useCallback(async (): Promise<void> => {
    await setPassthroughEnabled(!activeRef.current);
  }, [setPassthroughEnabled]);

  // Listen for toggle-passthrough hotkey from main process
  useEffect(() => {
    const unsub = window.ghostAPI.on('hotkeys:triggered', (...args: unknown[]) => {
      const data = args[0] as { action: string } | undefined;
      if (data?.action === 'toggle-passthrough') {
        setPassthroughEnabled(!activeRef.current);
      }
    });
    return unsub;
  }, [setPassthroughEnabled]);

  // Cleanup: ensure passthrough is disabled when the component unmounts
  useEffect(() => {
    return () => {
      if (activeRef.current) {
        window.ghostAPI.overlay.setPassthrough(false, true).catch(() => {});
      }
    };
  }, []);

  return { isPassthrough, togglePassthrough, setPassthroughEnabled };
}
