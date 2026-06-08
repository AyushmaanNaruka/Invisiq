import { useState, useEffect, useCallback } from 'react';
import type { EntitlementStatus } from '@shared/types';

interface UseEntitlementResult {
  entitlement: EntitlementStatus;
  isLoading: boolean; // first status fetch (incl. launch-time server check)
  isRefreshing: boolean;
  refresh: () => Promise<void>;
}

const UNKNOWN: EntitlementStatus = { status: 'unknown', daysLeft: 0, expiresAt: null };

/**
 * Renderer-side trial state. Reads `entitlement:status` once (which awaits the
 * main-process launch check) and stays in sync via `entitlement:changed`.
 */
export function useEntitlement(signedIn: boolean): UseEntitlementResult {
  const [entitlement, setEntitlement] = useState<EntitlementStatus>(UNKNOWN);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Only meaningful once signed in (entitlement keys off the auth session).
    if (!signedIn) {
      setEntitlement(UNKNOWN);
      setIsLoading(false);
      return;
    }
    let mounted = true;
    setIsLoading(true);
    window.ghostAPI.entitlement
      .status()
      .then((s) => { if (mounted) setEntitlement(s); })
      .catch(() => { /* treat as unknown */ })
      .finally(() => { if (mounted) setIsLoading(false); });

    const off = window.ghostAPI.on('entitlement:changed', (s: unknown) => {
      setEntitlement((s as EntitlementStatus) ?? UNKNOWN);
    });
    return () => { mounted = false; off(); };
  }, [signedIn]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const s = await window.ghostAPI.entitlement.refresh();
      setEntitlement(s);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return { entitlement, isLoading, isRefreshing, refresh };
}
