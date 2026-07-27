import { useState, useCallback } from 'react';
import { Trash2, FolderOpen, Shield, RefreshCw, EyeOff, KeyRound, TriangleAlert } from 'lucide-react';
import type { AppSettings } from '@shared/types';

interface SettingsPrivacyProps {
  settings: AppSettings['privacy'];
  stealth: AppSettings['stealth'];
  isStealthFocus?: boolean;
  onToggleStealthFocus?: () => void;
  onUpdate: (key: string, value: unknown) => Promise<void>;
  onClearAll: () => Promise<void>;
  onOpenDataFolder: () => Promise<void>;
}

export default function SettingsPrivacy({
  settings,
  stealth,
  isStealthFocus = false,
  onToggleStealthFocus,
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

      {/* Stealth Mode */}
      <div className="space-y-3">
        <div className="flex items-start gap-2 p-2.5 rounded-md bg-accent-primary/10 border border-accent-primary/20">
          <EyeOff size={14} className="text-accent-primary shrink-0 mt-0.5" />
          <p className="text-text-secondary text-[10px] leading-relaxed">
            Stealth keeps InvisiQ invisible to screen capture and foreground-window monitoring.
            It is on by default (fail-safe): you're protected from launch, not after a monitored
            app is detected. Detection is only a confirmation indicator.
          </p>
        </div>

        {/* Live stealth toggle (relocated from the header bar) */}
        {onToggleStealthFocus && (
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-text-primary text-xs block">Stealth Mode</span>
              <span className="text-text-placeholder text-[10px]">
                {isStealthFocus
                  ? 'Active now — InvisiQ is hidden from screen capture and stays out of focus.'
                  : 'Off — InvisiQ may be visible to others. Turn on to hide it again.'}
              </span>
            </div>
            <input
              type="checkbox"
              checked={isStealthFocus}
              onChange={onToggleStealthFocus}
              className="rounded accent-accent-primary"
            />
          </label>
        )}

        {/* Warning shown only while stealth is OFF */}
        {onToggleStealthFocus && !isStealthFocus && (
          <div className="flex items-start gap-2 p-2.5 rounded-md bg-status-error/10 border border-status-error/30">
            <TriangleAlert size={14} className="text-status-error shrink-0 mt-0.5" />
            <p className="text-status-error text-[10px] leading-relaxed">
              Stealth is OFF. InvisiQ can now be seen in screen sharing, recordings,
              and screenshots, and it can take keyboard focus from other apps. Only turn
              this off when you don't need to stay hidden.
            </p>
          </div>
        )}

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-text-primary text-xs block">Default-On Stealth</span>
            <span className="text-text-placeholder text-[10px]">
              Start in non-activating stealth mode. Recommended. Requires restart.
            </span>
          </div>
          <input
            type="checkbox"
            checked={stealth?.defaultOn ?? true}
            onChange={(e) => onUpdate('stealth.defaultOn', e.target.checked)}
            className="rounded accent-accent-primary"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-text-primary text-xs block">Proctor Detection</span>
            <span className="text-text-placeholder text-[10px]">
              Show a "you're invisible" badge when a monitored app is detected
            </span>
          </div>
          <input
            type="checkbox"
            checked={stealth?.proctorDetection ?? true}
            onChange={(e) => onUpdate('stealth.proctorDetection', e.target.checked)}
            className="rounded accent-accent-primary"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-text-primary text-xs block">Evade Capture-Affinity Sweep</span>
            <span className="text-text-placeholder text-[10px]">
              When a lockdown proctor (Mettl/Respondus/SEB) is detected, drop screen-capture
              protection so an affinity sweep finds nothing. Trade-off: the overlay becomes
              visible to screenshots/recording while active. Leave off unless you know your
              proctor sweeps.
            </span>
          </div>
          <input
            type="checkbox"
            checked={stealth?.evadeSweepProctor ?? false}
            onChange={(e) => onUpdate('stealth.evadeSweepProctor', e.target.checked)}
            className="rounded accent-accent-primary"
          />
        </label>

        {/* Keyboard-hook disclosure (transparency for AV-aware users) */}
        <div className="flex items-start gap-2 p-2.5 rounded-md bg-bg-input border border-border-subtle">
          <KeyRound size={14} className="text-text-secondary shrink-0 mt-0.5" />
          <p className="text-text-secondary text-[10px] leading-relaxed">
            Stealth typing installs a keyboard hook <strong>only while capture is active</strong> —
            you start it by clicking the input box or pressing Ctrl+Shift+I, and it's removed the
            moment you stop capture (Esc, the panic key, or toggling it off). Keystrokes are never
            logged or written to disk, and the hook runs in an isolated local helper with no network
            access. Some antivirus tools may still flag keyboard hooks — this is expected.
          </p>
        </div>
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

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-text-primary text-xs block">Show System Tray Icon</span>
            <span className="text-text-placeholder text-[10px]">Adds a tray icon for quick access. Requires restart.</span>
          </div>
          <input
            type="checkbox"
            checked={settings.showTrayIcon ?? false}
            onChange={(e) => onUpdate('privacy.showTrayIcon', e.target.checked)}
            className="rounded accent-accent-primary"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-text-primary text-xs block">Auto Code Detection</span>
            <span className="text-text-placeholder text-[10px]">Periodically scan screen to detect coding platforms</span>
          </div>
          <input
            type="checkbox"
            checked={settings.codeDetectionEnabled ?? false}
            onChange={(e) => onUpdate('privacy.codeDetectionEnabled', e.target.checked)}
            className="rounded accent-accent-primary"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-text-primary text-xs block">Screen Awareness</span>
            <span className="text-text-placeholder text-[10px]">
              Auto-attach the current screen when you send a message — no screenshot button needed
            </span>
          </div>
          <input
            type="checkbox"
            checked={settings.screenAwarenessEnabled ?? true}
            onChange={(e) => onUpdate('privacy.screenAwarenessEnabled', e.target.checked)}
            className="rounded accent-accent-primary"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-text-primary text-xs block">Rolling Screen Text (OCR)</span>
            <span className="text-text-placeholder text-[10px]">
              Keep a lightweight text snapshot of the screen for faster context. Uses more CPU.
            </span>
          </div>
          <input
            type="checkbox"
            checked={settings.screenAwarenessRollingOcr ?? false}
            onChange={(e) => onUpdate('privacy.screenAwarenessRollingOcr', e.target.checked)}
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
          Neutral disguise name shown in Task Manager. Default: Helio. Requires restart.
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-2 border-t border-border-subtle">
        <button
          onClick={async () => {
            try {
              await window.ghostAPI.update.check();
            } catch {
              // silently fail
            }
          }}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
        >
          <RefreshCw size={12} />
          Check for Updates
        </button>

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
