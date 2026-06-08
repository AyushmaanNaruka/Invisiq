// InvisiQ — Entitlement / trial enforcement (Beta Launch Plan §6).
//
// On launch (after auth) we call entitlement/check with the user's Supabase JWT.
// While the trial is active the server returns an `unlockFragment`, which we feed
// into crypto.ts so API keys can be decrypted (§6.1). After expiry there is no
// fragment → getApiKey() returns null → no provider initializes → hard lock.
//
// FAIL-CLOSED: the fragment is held in MEMORY only (never persisted). A cold
// launch with no network can't fetch it → locked. Offline grace is within-session
// only: if a check already succeeded this session and the server-stamped session
// token hasn't expired, a transient network failure on refresh won't lock you.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@shared/constants';
import { setServerFragment, getDeviceId } from './crypto';
import { getAccessToken } from './auth';
import { getOverlayWindow } from './overlay';
import type { EntitlementStatus, EntitlementStatusKind } from '@shared/types';

interface CheckResponse {
  status: string;
  daysLeft?: number;
  expiresAt?: string;
  sessionToken?: string;
  unlockFragment?: string;
}

let status: EntitlementStatusKind = 'unknown';
let daysLeft = 0;
let expiresAt: string | null = null;
let sessionTokenExp = 0; // epoch seconds, parsed from the server session token
let initPromise: Promise<void> | null = null;

export function getStatus(): EntitlementStatus {
  return { status, daysLeft, expiresAt };
}

export function isActive(): boolean {
  return status === 'active';
}

function emitChanged(): void {
  try {
    getOverlayWindow()?.webContents.send('entitlement:changed', getStatus());
  } catch {
    /* window may not exist yet */
  }
}

/** Read the `exp` claim from the server session token (base64url payload.sig). */
function parseSessionExp(token: string): number {
  try {
    const body = token.split('.')[0];
    const json = Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp : 0;
  } catch {
    return 0;
  }
}

function applyActive(res: CheckResponse): void {
  status = 'active';
  daysLeft = res.daysLeft ?? 0;
  expiresAt = res.expiresAt ?? null;
  sessionTokenExp = res.sessionToken ? parseSessionExp(res.sessionToken) : 0;
  setServerFragment(res.unlockFragment ?? null);
}

function applyLocked(kind: 'expired' | 'offline' | 'unknown'): void {
  status = kind;
  daysLeft = 0;
  if (kind !== 'offline') expiresAt = null;
  sessionTokenExp = 0;
  setServerFragment(null);
}

/**
 * Verify entitlement against the server. Safe to call at launch and on demand.
 * Returns the resulting status.
 */
export async function check(): Promise<EntitlementStatus> {
  const token = await getAccessToken();
  if (!token) {
    applyLocked('unknown'); // not signed in
    emitChanged();
    return getStatus();
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/entitlement/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ device_id: getDeviceId() }),
    });

    if (!res.ok) {
      // 401/5xx — treat like a failed verification (don't grant offline grace
      // for an explicit server rejection unless we still hold a live session).
      throw new Error(`entitlement_http_${res.status}`);
    }

    const data = (await res.json()) as CheckResponse;
    if (data.status === 'active' && data.unlockFragment) {
      applyActive(data);
    } else {
      applyLocked('expired');
    }
  } catch {
    // Network/verification failure. Within-session grace: if we already hold a
    // fragment and the server-stamped session token hasn't expired, stay active.
    const nowSec = Math.floor(Date.now() / 1000);
    if (status === 'active' && sessionTokenExp > nowSec) {
      // keep current active state (offline grace within this session)
    } else {
      applyLocked('offline');
    }
  }

  emitChanged();
  return getStatus();
}

/** Run the launch-time check once. Subsequent calls return the same promise. */
export function initEntitlement(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = check().then(() => undefined);
  return initPromise;
}

/** Status after the launch-time check has settled (used by IPC). */
export async function getStatusReady(): Promise<EntitlementStatus> {
  if (initPromise) await initPromise;
  return getStatus();
}

/** Force a re-check (e.g. user clicked "retry" on the lock screen). */
export async function refresh(): Promise<EntitlementStatus> {
  return check();
}
