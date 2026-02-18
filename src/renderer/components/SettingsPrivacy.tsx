import { useState, useCallback } from 'react';
import { Trash2, FolderOpen, Shield } from 'lucide-react';
import type { AppSettings } from '@shared/types';

interface SettingsPrivacyProps {
  settings: AppSettings['privacy'];
  onUpdate: (key: string, value: unknown) => Promise<void>;
  onClearAll: () => Promise<void>;
  onOpenDataFolder: () => Promise<void>;
}

export default function SettingsPrivacy({
  settings,
  onUpdate,
  onClearAll,
  onOpenDataFolder,
}: SettingsPrivacyProps): JSX.Element {
  const [confirmClear, setConfirmClear] = useState(false);

  const handleClearAll = useCallback(async () => {
    if (confirmClear) {
      await onClearAll();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
    }
  }, [confirmClear, onClearAll]);

  return (
    <div className="space-y-5">
      {/* Security Info */}
      <div className="flex items-start gap-2 p-2.5 rounded-md bg-accent-primary/10 border border-accent-primary/20">
        <Shield size={14} className="text-accent-primary shrink-0 mt-0.5" />
        <p className="text-text-secondary text-[10px] leading-relaxed">
          API keys are encrypted with AES-256-GCM using a machine-derived key. Data is stored locally only.
        </p>
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        <label className="flex items-center justify-between cursor-not-allowed opacity-70">
          <div>
            <span className="text-text-primary text-xs block">Encrypt API Keys</span>
            <span className="text-text-placeholder text-[10px]">Always enabled</span>
          </div>
          <input
            type="checkbox"
            checked={true}
            disabled
            className="rounded accent-accent-primary"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-text-primary text-xs block">Clear Screenshots After Send</span>
            <span className="text-text-placeholder text-[10px]">Remove screenshot data after AI processes it</span>
          </div>
          <input
            type="checkbox"
            checked={settings.clearScreenshotsAfterSend}
            onChange={(e) => onUpdate('privacy.clearScreenshotsAfterSend', e.target.checked)}
            className="rounded accent-accent-primary"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-text-primary text-xs block">Persist Chat History</span>
            <span className="text-text-placeholder text-[10px]">Save conversations to disk</span>
          </div>
          <input
            type="checkbox"
            checked={settings.persistChatHistory}
            onChange={(e) => onUpdate('privacy.persistChatHistory', e.target.checked)}
            className="rounded accent-accent-primary"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-text-primary text-xs block">Log API Requests</span>
            <span className="text-text-placeholder text-[10px]">Store request/response metadata for debugging</span>
          </div>
          <input
            type="checkbox"
            checked={settings.logApiRequests}
            onChange={(e) => onUpdate('privacy.logApiRequests', e.target.checked)}
            className="rounded accent-accent-primary"
          />
        </label>
      </div>

      {/* Process Name */}
      <div>
        <label className="block text-text-secondary text-xs mb-1">Process Name</label>
        <input
          type="text"
          value={settings.processName}
          onChange={(e) => onUpdate('privacy.processName', e.target.value)}
          maxLength={30}
          className="w-full bg-bg-input border border-border-subtle rounded-md px-3 py-1.5 text-xs text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-border-focus transition-colors"
        />
        <p className="text-text-placeholder text-[10px] mt-1">
          The process name shown in Task Manager. Requires restart.
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-2 border-t border-border-subtle">
        <button
          onClick={onOpenDataFolder}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
        >
          <FolderOpen size={12} />
          Open Data Folder
        </button>

        <button
          onClick={handleClearAll}
          className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
            confirmClear
              ? 'bg-status-error/20 text-status-error border border-status-error/40'
              : 'text-text-secondary hover:text-status-error hover:bg-bg-hover'
          }`}
        >
          <Trash2 size={12} />
          {confirmClear ? 'Click again to confirm — this cannot be undone' : 'Clear All Data'}
        </button>
      </div>
    </div>
  );
}
