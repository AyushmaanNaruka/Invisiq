import { useCallback } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { AppSettings } from '@shared/types';

interface SettingsDisplayProps {
  settings: AppSettings['display'];
  onUpdate: (key: string, value: unknown) => Promise<void>;
}

const POSITION_OPTIONS: { value: AppSettings['display']['startPosition']; label: string }[] = [
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'top-left', label: 'Top Left' },
  { value: 'center', label: 'Center' },
  { value: 'last', label: 'Remember Last' },
];

export default function SettingsDisplay({
  settings,
  onUpdate,
}: SettingsDisplayProps): JSX.Element {
  const handleOpacityChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const opacity = parseFloat(e.target.value);
      await onUpdate('display.opacity', opacity);
      await window.ghostAPI.overlay.setOpacity(opacity);
    },
    [onUpdate]
  );

  const handleFontSize = useCallback(
    async (delta: number) => {
      const newSize = Math.min(18, Math.max(11, settings.fontSize + delta));
      await onUpdate('display.fontSize', newSize);
      document.documentElement.style.fontSize = `${newSize}px`;
    },
    [settings.fontSize, onUpdate]
  );

  return (
    <div className="space-y-5">
      {/* Theme */}
      <div>
        <label className="block text-text-secondary text-xs mb-1.5">Theme</label>
        <div className="flex gap-2">
          <button className="flex-1 px-3 py-1.5 rounded text-xs font-medium bg-accent-primary/20 text-accent-primary border border-accent-primary/40">
            Dark
          </button>
          <button
            className="flex-1 px-3 py-1.5 rounded text-xs font-medium bg-bg-input text-text-placeholder border border-border-subtle cursor-not-allowed"
            disabled
          >
            Light (Soon)
          </button>
        </div>
      </div>

      {/* Opacity */}
      <div>
        <label className="block text-text-secondary text-xs mb-1.5">
          Default Opacity: {Math.round(settings.opacity * 100)}%
        </label>
        <input
          type="range"
          min="0.1"
          max="1.0"
          step="0.05"
          value={settings.opacity}
          onChange={handleOpacityChange}
          className="w-full h-1.5 bg-bg-input rounded-lg appearance-none cursor-pointer accent-accent-primary"
        />
        <div className="flex justify-between text-[10px] text-text-placeholder mt-0.5">
          <span>10%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Font Size */}
      <div>
        <label className="block text-text-secondary text-xs mb-1.5">Font Size</label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleFontSize(-1)}
            disabled={settings.fontSize <= 11}
            className="p-1 rounded bg-bg-input border border-border-subtle text-text-secondary hover:text-text-primary disabled:opacity-50 transition-colors"
          >
            <Minus size={12} />
          </button>
          <span className="text-text-primary text-sm font-mono w-10 text-center">
            {settings.fontSize}px
          </span>
          <button
            onClick={() => handleFontSize(1)}
            disabled={settings.fontSize >= 18}
            className="p-1 rounded bg-bg-input border border-border-subtle text-text-secondary hover:text-text-primary disabled:opacity-50 transition-colors"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

      {/* Window Size */}
      <div>
        <label className="block text-text-secondary text-xs mb-1.5">Default Window Size</label>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <span className="text-text-placeholder text-[10px]">Width</span>
            <input
              type="number"
              min={300}
              max={800}
              value={settings.windowWidth}
              onChange={async (e) => {
                const width = parseInt(e.target.value) || 420;
                await onUpdate('display.windowWidth', width);
                await window.ghostAPI.overlay.setSize(width, settings.windowHeight);
              }}
              className="w-full bg-bg-input border border-border-subtle rounded-md px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-border-focus"
            />
          </div>
          <span className="text-text-placeholder text-xs mt-3">x</span>
          <div className="flex-1">
            <span className="text-text-placeholder text-[10px]">Height</span>
            <input
              type="number"
              min={200}
              max={1200}
              value={settings.windowHeight}
              onChange={async (e) => {
                const height = parseInt(e.target.value) || 600;
                await onUpdate('display.windowHeight', height);
                await window.ghostAPI.overlay.setSize(settings.windowWidth, height);
              }}
              className="w-full bg-bg-input border border-border-subtle rounded-md px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-border-focus"
            />
          </div>
        </div>
      </div>

      {/* Start Position */}
      <div>
        <label className="block text-text-secondary text-xs mb-1.5">Start Position</label>
        <select
          value={settings.startPosition}
          onChange={(e) => onUpdate('display.startPosition', e.target.value)}
          className="w-full bg-bg-input border border-border-subtle rounded-md px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-border-focus"
        >
          {POSITION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Checkboxes */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.showStatusBar}
            onChange={(e) => onUpdate('display.showStatusBar', e.target.checked)}
            className="rounded accent-accent-primary"
          />
          <span className="text-text-primary text-xs">Show status bar</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.autoScroll}
            onChange={(e) => onUpdate('display.autoScroll', e.target.checked)}
            className="rounded accent-accent-primary"
          />
          <span className="text-text-primary text-xs">Auto-scroll on new messages</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.showTimestamps}
            onChange={(e) => onUpdate('display.showTimestamps', e.target.checked)}
            className="rounded accent-accent-primary"
          />
          <span className="text-text-primary text-xs">Show timestamps on messages</span>
        </label>
      </div>
    </div>
  );
}
