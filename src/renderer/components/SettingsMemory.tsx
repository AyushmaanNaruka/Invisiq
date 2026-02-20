/**
 * SettingsMemory — Phase 4 / Sprint 17
 *
 * Memory settings tab: toggle, auto-extract, retention, limits.
 */

import { useState, useCallback, useEffect } from 'react';
import { Brain, Trash2, ChartNoAxesColumn } from 'lucide-react';
import type { AppSettings } from '@shared/types';
import type { MemoryStats } from '@shared/types';

interface SettingsMemoryProps {
  settings: AppSettings['memory'];
  onUpdate: (key: string, value: unknown) => Promise<void>;
}

export default function SettingsMemory({ settings, onUpdate }: SettingsMemoryProps): JSX.Element {
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const s = await window.ghostAPI.memory.stats();
      setStats(s);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (settings.enabled) {
      loadStats();
    }
  }, [settings.enabled, loadStats]);

  const handleClearAll = useCallback(async () => {
    if (!window.confirm('Clear ALL memory facts? This cannot be undone.')) return;
    setIsClearing(true);
    try {
      await window.ghostAPI.memory.clearAll();
      await loadStats();
    } finally {
      setIsClearing(false);
    }
  }, [loadStats]);

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="flex items-start gap-2 p-2.5 rounded-md bg-accent-primary/10 border border-accent-primary/20">
        <Brain size={14} className="text-accent-primary shrink-0 mt-0.5" />
        <p className="text-text-secondary text-[10px] leading-relaxed">
          Memory stores facts from conversations and injects relevant context into AI queries automatically.
          All data is stored locally — nothing leaves your device.
        </p>
      </div>

      {/* Enable toggle */}
      <label className="flex items-center justify-between cursor-pointer">
        <div>
          <span className="text-text-primary text-xs block font-medium">Enable Memory</span>
          <span className="text-text-placeholder text-[10px]">
            Inject relevant facts from past conversations into AI queries
          </span>
        </div>
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => onUpdate('memory.enabled', e.target.checked)}
          className="rounded accent-[#14B8A6]"
        />
      </label>

      {settings.enabled && (
        <>
          {/* Auto-extract */}
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-text-primary text-xs block">Auto-extract Facts</span>
              <span className="text-text-placeholder text-[10px]">
                Automatically identify and save memorable facts from conversations
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.autoExtract}
              onChange={(e) => onUpdate('memory.autoExtract', e.target.checked)}
              className="rounded accent-[#14B8A6]"
            />
          </label>

          {/* Max context facts */}
          <div>
            <label className="flex items-center justify-between text-xs text-text-secondary mb-1">
              <span>Max facts per query</span>
              <span className="text-text-primary font-medium">{settings.maxContextFacts}</span>
            </label>
            <input
              type="range"
              min={1}
              max={20}
              value={settings.maxContextFacts}
              onChange={(e) => onUpdate('memory.maxContextFacts', Number(e.target.value))}
              className="w-full h-1 rounded-full accent-[#14B8A6]"
            />
          </div>

          {/* Total facts limit */}
          <div>
            <label className="flex items-center justify-between text-xs text-text-secondary mb-1">
              <span>Total facts limit</span>
              <span className="text-text-primary font-medium">{settings.totalFactsLimit}</span>
            </label>
            <input
              type="range"
              min={50}
              max={500}
              step={50}
              value={settings.totalFactsLimit}
              onChange={(e) => onUpdate('memory.totalFactsLimit', Number(e.target.value))}
              className="w-full h-1 rounded-full accent-[#14B8A6]"
            />
          </div>

          {/* Stats */}
          {stats && (
            <div className="p-3 bg-surface-elevated rounded-lg border border-border-subtle">
              <div className="flex items-center gap-1.5 mb-2">
                <ChartNoAxesColumn size={12} strokeWidth={1.75} className="text-text-placeholder" />
                <span className="text-[10px] uppercase tracking-wider text-text-placeholder">Memory Stats</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs font-medium text-text-primary">{stats.totalFacts}</p>
                  <p className="text-[10px] text-text-placeholder">Total facts</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-primary">
                    {(stats.totalSize / 1024).toFixed(1)} KB
                  </p>
                  <p className="text-[10px] text-text-placeholder">Storage used</p>
                </div>
              </div>
            </div>
          )}

          {/* Clear all */}
          <button
            onClick={handleClearAll}
            disabled={isClearing || stats?.totalFacts === 0}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs text-status-error border border-status-error/20 hover:bg-status-error/10 transition-colors disabled:opacity-50"
          >
            <Trash2 size={12} strokeWidth={1.75} />
            {isClearing ? 'Clearing...' : 'Clear All Memory'}
          </button>
        </>
      )}
    </div>
  );
}
