import { useState, useCallback, useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { DEFAULT_HOTKEYS } from '@shared/constants';
import type { HotkeyAction } from '@shared/types';

interface SettingsHotkeysProps {
  hotkeys: Record<HotkeyAction, string>;
  onUpdate: (action: HotkeyAction, shortcut: string) => Promise<{ success: boolean; error?: string }>;
  onResetAll: () => void;
}

const HOTKEY_LABELS: Record<HotkeyAction, string> = {
  'toggle-overlay': 'Toggle Overlay',
  'capture-screen': 'Capture Screen',
  'capture-region': 'Capture Region',
  'focus-input': 'Focus Input',
  'copy-response': 'Copy Last Response',
  'new-conversation': 'New Conversation',
  'hide-overlay': 'Hide Overlay',
};

const ACTIONS = Object.keys(HOTKEY_LABELS) as HotkeyAction[];

export default function SettingsHotkeys({
  hotkeys,
  onUpdate,
  onResetAll,
}: SettingsHotkeysProps): JSX.Element {
  const [recordingAction, setRecordingAction] = useState<HotkeyAction | null>(null);
  const [pendingShortcut, setPendingShortcut] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<HotkeyAction | null>(null);

  // Keep ref in sync
  useEffect(() => {
    recordingRef.current = recordingAction;
  }, [recordingAction]);

  // Key capture listener
  useEffect(() => {
    if (!recordingAction) return;

    function handleKeyDown(e: KeyboardEvent): void {
      e.preventDefault();
      e.stopPropagation();

      // Ignore bare modifier keys
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

      const parts: string[] = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');

      // Special key handling
      if (e.key === 'Escape' && parts.length === 0) {
        // Allow bare Escape for hide-overlay
        if (recordingRef.current === 'hide-overlay') {
          setPendingShortcut('Escape');
          return;
        }
        // Cancel recording on bare Escape otherwise
        setRecordingAction(null);
        setPendingShortcut('');
        setError(null);
        return;
      }

      // Must have at least one modifier (except Escape)
      if (parts.length === 0) {
        setError('Shortcut must include Ctrl, Alt, or Shift');
        return;
      }

      // Add the key
      const keyName = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      parts.push(keyName);

      const shortcut = parts.join('+');
      setPendingShortcut(shortcut);
      setError(null);
    }

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [recordingAction]);

  const startRecording = useCallback((action: HotkeyAction) => {
    setRecordingAction(action);
    setPendingShortcut('');
    setError(null);
  }, []);

  const cancelRecording = useCallback(() => {
    setRecordingAction(null);
    setPendingShortcut('');
    setError(null);
  }, []);

  const saveShortcut = useCallback(async () => {
    if (!recordingAction || !pendingShortcut) return;

    // Check for conflicts
    for (const [action, shortcut] of Object.entries(hotkeys)) {
      if (action !== recordingAction && shortcut === pendingShortcut) {
        setError(`Already used by "${HOTKEY_LABELS[action as HotkeyAction]}"`);
        return;
      }
    }

    // Convert to Electron accelerator format
    const accelerator = pendingShortcut.replace('Ctrl', 'CommandOrControl');

    const result = await onUpdate(recordingAction, accelerator);
    if (result.success) {
      setRecordingAction(null);
      setPendingShortcut('');
      setError(null);
    } else {
      setError(result.error || 'Failed to register shortcut');
    }
  }, [recordingAction, pendingShortcut, hotkeys, onUpdate]);

  // Auto-save when pendingShortcut changes
  useEffect(() => {
    if (pendingShortcut && recordingAction) {
      saveShortcut();
    }
  }, [pendingShortcut, recordingAction, saveShortcut]);

  return (
    <div className="space-y-3">
      <p className="text-text-secondary text-[10px] mb-3">
        Click a shortcut to change it. Press your new key combination.
      </p>

      {ACTIONS.map((action) => {
        const isRecording = recordingAction === action;
        const displayShortcut = hotkeys[action]
          ?.replace('CommandOrControl', 'Ctrl')
          .replace('Command', 'Cmd');

        return (
          <div key={action} className="flex items-center justify-between">
            <span className="text-text-primary text-xs">{HOTKEY_LABELS[action]}</span>
            <button
              onClick={() => isRecording ? cancelRecording() : startRecording(action)}
              className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                isRecording
                  ? 'bg-accent-blue/20 border border-accent-blue text-accent-blue animate-pulse'
                  : 'bg-bg-input border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-focus'
              }`}
            >
              {isRecording ? 'Press shortcut...' : displayShortcut || '—'}
            </button>
          </div>
        );
      })}

      {error && (
        <p className="text-status-error text-[10px]">{error}</p>
      )}

      <div className="pt-3 border-t border-border-subtle">
        <button
          onClick={onResetAll}
          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
        >
          <RotateCcw size={12} />
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
