/**
 * SettingsCompanion — Phase 4 / Sprint 16
 *
 * Companion server settings: QR pairing, connected devices, port configuration.
 */

import { useState, useCallback, useEffect } from 'react';
import { Smartphone, Wifi, WifiOff, QrCode, X, RefreshCw } from 'lucide-react';
import { GhostTooltip } from './ui/GhostTooltip';
import type { CompanionDevice } from '@shared/types';

interface SettingsCompanionProps {
  enabled: boolean;
  port: number;
  onUpdate: (key: string, value: unknown) => Promise<void>;
}

export default function SettingsCompanion({
  enabled,
  port,
  onUpdate,
}: SettingsCompanionProps): JSX.Element {
  const [serverStatus, setServerStatus] = useState<{
    running: boolean;
    connectedDevices: CompanionDevice[];
    actualPort: number;
  } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [localPort, setLocalPort] = useState(port);

  const refreshStatus = useCallback(async () => {
    try {
      const status = await window.ghostAPI.companion.status();
      setServerStatus({
        running: status.running,
        connectedDevices: status.connectedDevices,
        actualPort: status.port,
      });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 5000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  const handleStartServer = useCallback(async () => {
    setIsStarting(true);
    try {
      const result = await window.ghostAPI.companion.start(localPort);
      if (result.success) {
        setQrDataUrl(result.qrDataUrl || null);
        await refreshStatus();
        await onUpdate('companion.enabled', true);
        await onUpdate('companion.port', localPort);
      }
    } catch (err) {
      console.error('[SettingsCompanion] Start failed:', err);
    } finally {
      setIsStarting(false);
    }
  }, [localPort, refreshStatus, onUpdate]);

  const handleStopServer = useCallback(async () => {
    try {
      await window.ghostAPI.companion.stop();
      setQrDataUrl(null);
      await refreshStatus();
      await onUpdate('companion.enabled', false);
    } catch (err) {
      console.error('[SettingsCompanion] Stop failed:', err);
    }
  }, [refreshStatus, onUpdate]);

  const isRunning = serverStatus?.running ?? false;

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="flex items-start gap-2 p-2.5 rounded-md bg-accent-primary/10 border border-accent-primary/20">
        <Smartphone size={14} className="text-accent-primary shrink-0 mt-0.5" />
        <p className="text-text-secondary text-[10px] leading-relaxed">
          Companion mode lets you control GhostAI from your phone or tablet.
          Your phone must be on the same Wi-Fi network as this computer.
        </p>
      </div>

      {/* Server control */}
      <div>
        <label className="block text-text-secondary text-xs mb-2">Server</label>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="number"
            value={localPort}
            onChange={(e) => setLocalPort(Number(e.target.value))}
            disabled={isRunning}
            min={1024}
            max={65535}
            className="w-24 bg-bg-input border border-border-subtle rounded-md px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-border-focus transition-colors disabled:opacity-50"
          />
          <span className="text-xs text-text-secondary">Port</span>
          <div className="flex-1" />
          <GhostTooltip content="Refresh status" placement="top">
            <button
              onClick={refreshStatus}
              className="p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              <RefreshCw size={13} strokeWidth={1.75} />
            </button>
          </GhostTooltip>
        </div>

        <button
          onClick={isRunning ? handleStopServer : handleStartServer}
          disabled={isStarting}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-colors ${
            isRunning
              ? 'bg-status-error/10 text-status-error hover:bg-status-error/20 border border-status-error/20'
              : 'bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 border border-accent-primary/20'
          } disabled:opacity-50`}
        >
          {isRunning ? (
            <><WifiOff size={13} strokeWidth={1.75} /> Stop Server</>
          ) : isStarting ? (
            <><Wifi size={13} strokeWidth={1.75} className="animate-pulse" /> Starting...</>
          ) : (
            <><Wifi size={13} strokeWidth={1.75} /> Start Server</>
          )}
        </button>

        {serverStatus && (
          <p className={`text-[10px] text-center mt-1.5 ${isRunning ? 'text-status-success' : 'text-text-placeholder'}`}>
            {isRunning
              ? `Running on localhost:${serverStatus.actualPort}`
              : 'Server stopped'}
          </p>
        )}
      </div>

      {/* QR Code */}
      {isRunning && qrDataUrl && (
        <div>
          <label className="block text-text-secondary text-xs mb-2">
            <QrCode size={11} className="inline mr-1" />
            Scan to Pair
          </label>
          <div className="flex items-center justify-center p-3 bg-surface-elevated rounded-lg border border-border-subtle">
            <img
              src={qrDataUrl}
              alt="Pairing QR code"
              className="w-32 h-32 rounded"
            />
          </div>
          <p className="text-[10px] text-text-placeholder text-center mt-1.5">
            Pairing token expires after first use
          </p>
        </div>
      )}

      {/* Connected devices */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-text-secondary text-xs">
            Connected Devices ({serverStatus?.connectedDevices.length ?? 0})
          </label>
        </div>
        {serverStatus?.connectedDevices && serverStatus.connectedDevices.length > 0 ? (
          <div className="space-y-2">
            {serverStatus.connectedDevices.map((device) => (
              <div
                key={device.id}
                className="flex items-center gap-2 p-2 bg-surface-elevated rounded-lg border border-border-subtle"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-status-success shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-primary truncate">{device.name}</p>
                  <p className="text-[10px] text-text-placeholder">{device.platform} · {new Date(device.connectedAt).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-6 text-text-placeholder">
            <div className="text-center">
              <Smartphone size={24} strokeWidth={1.25} className="mx-auto mb-1" />
              <p className="text-[10px]">No devices connected</p>
            </div>
          </div>
        )}
      </div>

      {/* Auto-start toggle */}
      <label className="flex items-center justify-between cursor-pointer">
        <div>
          <span className="text-text-primary text-xs block">Auto-start on launch</span>
          <span className="text-text-placeholder text-[10px]">
            Start companion server automatically when GhostAI opens
          </span>
        </div>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onUpdate('companion.autoStart', e.target.checked)}
          className="rounded accent-[#14B8A6]"
        />
      </label>
    </div>
  );
}
