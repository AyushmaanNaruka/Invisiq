import { useCallback, useEffect, useState } from 'react';

/**
 * useInvisibleInput — receives keystrokes from the main-process global hook.
 *
 * When the user arms invisible-input mode, every key they press is captured
 * by the WH_KEYBOARD_LL hook (via uiohook-napi) and forwarded over IPC.
 * This hook listens for those events and gives the consumer:
 *   - `armed`         current armed state
 *   - `arm` / `disarm` / `toggle`  imperative controls
 *   - a callback that fires with each received character / control event,
 *     letting the consumer drive textarea state without ever calling .focus()
 *
 * Used by InputArea so the user can "type" into GhostAI while Stealth Focus
 * keeps the window non-focusable (WS_EX_NOACTIVATE) — preventing proctoring
 * tools from seeing a foreground-window change.
 */

export interface InvisibleInputHandlers {
  onChar(char: string): void;
  onBackspace(): void;
  onDelete(): void;
  onEnter(): void;
}

export interface UseInvisibleInput {
  armed: boolean;
  arm(): Promise<{ armed: boolean; error?: string }>;
  disarm(): Promise<{ armed: boolean }>;
  toggle(): Promise<{ armed: boolean; error?: string }>;
}

export function useInvisibleInput(handlers: InvisibleInputHandlers): UseInvisibleInput {
  const [armed, setArmed] = useState(false);

  // Initial status sync (in case the main process armed via hotkey before this hook mounted)
  useEffect(() => {
    let cancelled = false;
    window.ghostAPI.invisibleInput.status().then((s) => {
      if (!cancelled) setArmed(s.armed);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Listen for IPC events
  useEffect(() => {
    const offStatus = window.ghostAPI.on('invisible-input:status', (payload) => {
      const p = payload as { armed: boolean };
      setArmed(p.armed);
    });

    const offChar = window.ghostAPI.on('invisible-input:char', (payload) => {
      const p = payload as { char: string };
      if (p && typeof p.char === 'string') handlers.onChar(p.char);
    });

    const offBackspace = window.ghostAPI.on('invisible-input:backspace', () => {
      handlers.onBackspace();
    });

    const offDelete = window.ghostAPI.on('invisible-input:delete', () => {
      handlers.onDelete();
    });

    const offEnter = window.ghostAPI.on('invisible-input:enter', () => {
      handlers.onEnter();
    });

    return () => {
      offStatus();
      offChar();
      offBackspace();
      offDelete();
      offEnter();
    };
  }, [handlers]);

  const arm = useCallback(() => window.ghostAPI.invisibleInput.arm(), []);
  const disarm = useCallback(() => window.ghostAPI.invisibleInput.disarm(), []);
  const toggle = useCallback(() => window.ghostAPI.invisibleInput.toggle(), []);

  return { armed, arm, disarm, toggle };
}
