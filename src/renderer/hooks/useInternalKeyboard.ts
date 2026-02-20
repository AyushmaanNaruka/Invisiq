import { useEffect, useRef } from 'react';

interface KeyboardActions {
  toggleSettings: () => void;
  clearConversation: () => void;
  focusSearch: () => void;
  openTemplateLibrary?: () => void;
}

export function useInternalKeyboard(actions: KeyboardActions): void {
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  // Track double-press for Ctrl+L clear confirmation
  const lastClearPress = useRef(0);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      // Ctrl+, → toggle Settings
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        actionsRef.current.toggleSettings();
        return;
      }

      // Ctrl+L → clear conversation (double-press within 500ms to confirm)
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        const now = Date.now();
        if (now - lastClearPress.current < 500) {
          actionsRef.current.clearConversation();
          lastClearPress.current = 0;
        } else {
          lastClearPress.current = now;
        }
        return;
      }

      // Ctrl+K → focus search in ConversationHistory
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        actionsRef.current.focusSearch();
        return;
      }

      // Ctrl+T → open Template Library
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        actionsRef.current.openTemplateLibrary?.();
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
