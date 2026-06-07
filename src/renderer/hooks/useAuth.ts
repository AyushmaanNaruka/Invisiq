import { useState, useEffect, useCallback } from 'react';
import type { AuthStatus } from '@shared/types';

interface UseAuthResult {
  status: AuthStatus;
  isLoading: boolean; // first status fetch (incl. launch-time silent refresh)
  isBusy: boolean; // an interactive login/logout is in flight
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const SIGNED_OUT: AuthStatus = { signedIn: false, email: null, userId: null };

/**
 * Renderer-side auth state. Reads `auth:status` once (which awaits the
 * main-process silent refresh) and stays in sync via `auth:changed`.
 */
export function useAuth(): UseAuthResult {
  const [status, setStatus] = useState<AuthStatus>(SIGNED_OUT);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    window.ghostAPI.auth
      .status()
      .then((s) => { if (mounted) setStatus(s); })
      .catch(() => { /* stay signed out */ })
      .finally(() => { if (mounted) setIsLoading(false); });

    const off = window.ghostAPI.on('auth:changed', (s: unknown) => {
      setStatus((s as AuthStatus) ?? SIGNED_OUT);
    });
    return () => { mounted = false; off(); };
  }, []);

  const login = useCallback(async () => {
    setIsBusy(true);
    setError(null);
    try {
      const s = (await window.ghostAPI.auth.login()) as AuthStatus & { error?: string };
      if (s.error) setError(s.error);
      setStatus({ signedIn: s.signedIn, email: s.email, userId: s.userId });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed');
    } finally {
      setIsBusy(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsBusy(true);
    try {
      const s = await window.ghostAPI.auth.logout();
      setStatus(s);
    } finally {
      setIsBusy(false);
    }
  }, []);

  return { status, isLoading, isBusy, error, login, logout };
}
