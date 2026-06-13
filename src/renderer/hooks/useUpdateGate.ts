import { useState, useEffect } from 'react';
import type { VersionGateStatus } from '@shared/types';

const OK: VersionGateStatus = {
  required: false,
  reason: null,
  message: null,
  minVersion: null,
  latestVersion: null,
  currentVersion: '',
};

/**
 * Remote kill-switch / version-floor state (Beta Launch Plan §10.4). Reads the
 * launch-time check (fail-open) and listens for live `update:required`. Default
 * is not-required, so a slow/failed check never blocks the app.
 */
export function useUpdateGate(): { gate: VersionGateStatus } {
  const [gate, setGate] = useState<VersionGateStatus>(OK);

  useEffect(() => {
    let mounted = true;
    window.ghostAPI.update
      .versionStatus()
      .then((s) => { if (mounted) setGate(s); })
      .catch(() => { /* fail-open */ });
    const off = window.ghostAPI.on('update:required', (s: unknown) => {
      setGate((s as VersionGateStatus) ?? OK);
    });
    return () => { mounted = false; off(); };
  }, []);

  return { gate };
}
