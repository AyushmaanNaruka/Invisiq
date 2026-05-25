/**
 * SettingsResilience — Phase 5 Resilience Mode
 *
 * Settings tab for the native helper agent: start/stop, status, path configuration.
 */

import { useState, useCallback, useEffect } from 'react';
import { Shield, Play, Square, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import { GhostTooltip } from './ui/GhostTooltip';
import type { ResilienceStatus, AppSettings } from '@shared/types';

interface SettingsResilienceProps {
  settings: AppSettings['resilience'];
  onUpdate: (key: string, value: unknown) => Promise<void>;
}

function formatUptime(ms: number): string {
  if (ms <= 0) return '--';
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  if (mins > 0) return `${mins}m ${secs % 60}s`;
  return `${secs}s`;
}

export default function SettingsResilience({
  settings,
  onUpdate,
}: SettingsResilienceProps): JSX.Element {
  const [status, setStatus] = useState<ResilienceStatus | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [localHelperPath, setLocalHelperPath] = useState(settings.helperPath);

  const refreshStatus = useCallback(async () => {
    try {
      const s = await window.ghostAPI.resilience.status();
      setStatus(s);
    } catch {
      // ignore
    }
  }, []);

  // Poll status every 3s
  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 3000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  // Listen for status changes from main process
  useEffect(() => {
    const unsub = window.ghostAPI.on('resilience:agent-status-changed', (data: unknown) => {
      setStatus(data as ResilienceStatus);
    });
    return unsub;
  }, []);

  const handleStart = useCallback(async () => {
    setIsStarting(true);
    try {
      const result = await window.ghostAPI.resilience.startAgent(
        localHelperPath || undefined,
        settings.pipeName || undefined,
      );
      if (result.success) {
        await onUpdate('resilience.enabled', true);
      }
      await refreshStatus();
    } catch (err) {
      console.error('[SettingsResilience] Start failed:', err);
    } finally {
      setIsStarting(false);
    }
  }, [localHelperPath, settings.pipeName, refreshStatus, onUpdate]);

  const handleStop = useCallback(async () => {
    setIsStopping(true);
    try {
      await window.ghostAPI.resilience.stopAgent();
      await onUpdate('resilience.enabled', false);
      await refreshStatus();
    } catch (err) {
      console.error('[SettingsResilience] Stop failed:', err);
    } finally {
      setIsStopping(false);
    }
  }, [refreshStatus, onUpdate]);

  const handlePing = useCallback(async () => {
    await window.ghostAPI.resilience.sendCommand({ type: 'ping' });
  }, []);

  const isRunning = status?.agentState === 'running';
  const isError = status?.agentState === 'error';

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="flex items-start gap-2 p-2.5 rounded-md bg-accent-primary/10 border border-accent-primary/20">
        <Shield size={14} className="text-accent-primary shrink-0 mt-0.5" />
        <p className="text-text-secondary text-[10px] leading-relaxed">
          Resilience Mode launches a native helper process that communicates
          with GhostAI via a named pipe. The helper runs alongside the app
          and handles low-level system tasks.
        </p>
      </div>

      {/* Status indicator */}
      <div className="p-3 bg-surface-elevated rounded-lg border border-border-subtle">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-text-primary">Agent Status</span>
          <GhostTooltip content="Refresh status" placement="top">
            <button
              onClick={refreshStatus}
              className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              <RefreshCw size={11} strokeWidth={1.75} />
            </button>
          </GhostTooltip>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isRunning
                ? 'bg-status-success'
                : isError
                  ? 'bg-status-error'
                  : 'bg-text-placeholder'
            }`}
          />
          <span
            className={`text-xs ${
              isRunning
                ? 'text-status-success'
                : isError
                  ? 'text-status-error'
                  : 'text-text-secondary'
            }`}
          >
            {status?.agentState === 'running'
              ? 'Running'
              : status?.agentState === 'starting'
                ? 'Starting...'
                : status?.agentState === 'error'
                  ? 'Error'
                  : 'Stopped'}
          </span>
          {isRunning && status && (
            <span className="text-[10px] text-text-placeholder ml-auto">
              Uptime: {formatUptime(status.uptime)}
              {status.helperPid ? ` · PID ${status.helperPid}` : ''}
            </span>
          )}
        </div>
        {isError && status?.lastError && (
          <div className="flex items-start gap-1.5 mt-2 text-[10px] text-status-error">
            <AlertTriangle size={11} className="shrink-0 mt-0.5" />
            <span>{status.lastError}</span>
          </div>
        )}
        {isRunning && status?.pipeConnected && (
          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-status-success">
            <Check size={10} />
            <span>Pipe connected</span>
          </div>
        )}
      </div>

      {/* Start/Stop button */}
      <button
        onClick={isRunning ? handleStop : handleStart}
        disabled={isStarting || isStopping}
        className={`w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-colors ${
          isRunning
            ? 'bg-status-error/10 text-status-error hover:bg-status-error/20 border border-status-error/20'
            : 'bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 border border-accent-primary/20'
        } disabled:opacity-50`}
      >
        {isRunning ? (
          <>
            <Square size={13} strokeWidth={1.75} /> {isStopping ? 'Stopping...' : 'Stop Agent'}
          </>
        ) : isStarting ? (
          <>
            <Play size={13} strokeWidth={1.75} className="animate-pulse" /> Starting...
          </>
        ) : (
          <>
            <Play size={13} strokeWidth={1.75} /> Start Agent
          </>
        )}
      </button>

      {/* Ping test (only when running) */}
      {isRunning && (
        <button
          onClick={handlePing}
          className="w-full flex items-center justify-center gap-2 py-1.5 rounded-md text-[10px] text-text-secondary border border-border-subtle hover:bg-bg-hover transition-colors"
        >
          Send Ping
        </button>
      )}

      {/* Helper path (advanced) */}
      <div>
        <label className="block text-text-secondary text-xs mb-1">
          Helper Path <span className="text-text-placeholder">(optional)</span>
        </label>
        <input
          type="text"
          value={localHelperPath}
          onChange={(e) => setLocalHelperPath(e.target.value)}
          onBlur={() => onUpdate('resilience.helperPath', localHelperPath)}
          disabled={isRunning}
          placeholder="Leave blank for bundled default"
          className="w-full bg-bg-input border border-border-subtle rounded-md px-3 py-2 text-xs text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-border-focus transition-colors disabled:opacity-50"
        />
      </div>

      {/* Auto-start toggle */}
      <label className="flex items-center justify-between cursor-pointer">
        <div>
          <span className="text-text-primary text-xs block">Auto-start on launch</span>
          <span className="text-text-placeholder text-[10px]">
            Start the resilience agent automatically when GhostAI opens
          </span>
        </div>
        <input
          type="checkbox"
          checked={settings.autoStart}
          onChange={(e) => onUpdate('resilience.autoStart', e.target.checked)}
          className="rounded accent-[#14B8A6]"
        />
      </label>
    </div>
  );
}
