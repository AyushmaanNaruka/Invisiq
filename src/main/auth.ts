// InvisiQ — Authentication (Beta Launch Plan §7).
//
// Google OAuth via the SYSTEM BROWSER + a loopback redirect (RFC 8252), using
// Supabase's PKCE flow. No in-app browser window (nothing to leak), no
// supabase-js dependency — just the documented GoTrue REST endpoints over the
// Node global `fetch` (Electron 33 / Node 20).
//
//   login()        → open Google in the system browser, catch the code on a
//                    127.0.0.1 loopback server, exchange for a Supabase session.
//   initAuth()     → silent refresh on launch from the encrypted refresh token.
//   getAccessToken → fresh access token (auto-refreshes), for entitlement /
//                    telemetry in later phases.
//
// The refresh token is encrypted with the MACHINE-ONLY key (crypto.ts), so it
// stays decryptable offline regardless of trial entitlement — auth must work
// before the entitlement fragment is even fetched (avoids a chicken-and-egg).

import crypto from 'crypto';
import http from 'http';
import { shell } from 'electron';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@shared/constants';
import { encryptSecret, decryptSecret } from './crypto';
import { getAuthSession, setAuthSession, clearAuthSession } from './store';
import { getOverlayWindow } from './overlay';
import type { AuthStatus } from '@shared/types';

// Fixed loopback ports (add http://127.0.0.1:* to Supabase Auth redirect URLs).
const LOOPBACK_PORTS = [8123, 8234, 8345];
const LOGIN_TIMEOUT_MS = 3 * 60 * 1000;
const REFRESH_SKEW_S = 60; // refresh this many seconds before expiry

interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch seconds
  userId: string;
  email: string | null;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
  user?: { id: string; email?: string | null };
}

let session: Session | null = null;
let initPromise: Promise<void> | null = null;

// ── PKCE ────────────────────────────────────────────────────

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generatePkce(): { verifier: string; challenge: string } {
  const verifier = base64url(crypto.randomBytes(64));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

// ── Status + events ─────────────────────────────────────────

export function getStatus(): AuthStatus {
  return {
    signedIn: !!session,
    email: session?.email ?? null,
    userId: session?.userId ?? null,
  };
}

/** Current signed-in user id (null if signed out). */
export function getUserId(): string | null {
  return session?.userId ?? null;
}

function emitChanged(): void {
  try {
    getOverlayWindow()?.webContents.send('auth:changed', getStatus());
  } catch {
    // Window may not exist yet at boot — renderer re-queries status on mount.
  }
}

// ── Loopback server ─────────────────────────────────────────

function renderPage(title: string, message: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>InvisiQ</title>
<style>body{font-family:system-ui,sans-serif;background:#16213e;color:#E8E8E8;display:flex;
align-items:center;justify-content:center;height:100vh;margin:0}.card{text-align:center;padding:2rem}
h1{color:#00B894;font-size:1.25rem;margin:0 0 .5rem}p{color:#8B8B9E}</style></head>
<body><div class="card"><h1>${title}</h1><p>${message}</p></div></body></html>`;
}

interface Loopback {
  server: http.Server;
  port: number;
  codePromise: Promise<string>;
}

function listenLoopback(): Promise<Loopback> {
  return new Promise((resolve, reject) => {
    let settle: ((code: string) => void) | null = null;
    let fail: ((err: Error) => void) | null = null;
    const codePromise = new Promise<string>((res, rej) => { settle = res; fail = rej; });

    const timer = setTimeout(() => fail?.(new Error('login_timeout')), LOGIN_TIMEOUT_MS);
    const done = (): void => clearTimeout(timer);

    const server = http.createServer((req, res) => {
      let reqUrl: URL;
      try {
        reqUrl = new URL(req.url || '/', 'http://127.0.0.1');
      } catch {
        res.writeHead(400); res.end(); return;
      }
      const code = reqUrl.searchParams.get('code');
      const oauthErr = reqUrl.searchParams.get('error');
      if (oauthErr) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(renderPage('Sign-in cancelled', 'You can close this tab.'));
        done(); fail?.(new Error(`oauth_error: ${oauthErr}`));
        return;
      }
      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(renderPage('Signed in', 'You can close this tab and return to InvisiQ.'));
        done(); settle?.(code);
        return;
      }
      res.writeHead(404); res.end();
    });

    const tryPort = (i: number): void => {
      if (i >= LOOPBACK_PORTS.length) { done(); reject(new Error('no_free_loopback_port')); return; }
      const port = LOOPBACK_PORTS[i];
      const onError = (e: NodeJS.ErrnoException): void => {
        if (e.code === 'EADDRINUSE') { tryPort(i + 1); }
        else { done(); reject(e); }
      };
      server.once('error', onError);
      server.listen(port, '127.0.0.1', () => {
        server.removeListener('error', onError);
        resolve({ server, port, codePromise });
      });
    };
    tryPort(0);
  });
}

// ── Token endpoints ─────────────────────────────────────────

async function safeText(res: Response): Promise<string> {
  try { return (await res.text()).slice(0, 200); } catch { return ''; }
}

function applyTokens(t: TokenResponse): void {
  const expiresAt = typeof t.expires_at === 'number'
    ? t.expires_at
    : Math.floor(Date.now() / 1000) + (t.expires_in ?? 3600);
  session = {
    accessToken: t.access_token,
    refreshToken: t.refresh_token,
    expiresAt,
    userId: t.user?.id ?? session?.userId ?? '',
    email: t.user?.email ?? session?.email ?? null,
  };
}

function persistSession(): void {
  if (!session) return;
  setAuthSession({
    refreshToken: encryptSecret(session.refreshToken),
    userId: session.userId,
    email: session.email,
  });
}

async function exchangeCode(authCode: string, verifier: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=pkce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ auth_code: authCode, code_verifier: verifier }),
  });
  if (!res.ok) throw new Error(`token_exchange_failed: ${res.status} ${await safeText(res)}`);
  applyTokens((await res.json()) as TokenResponse);
  persistSession();
}

/** Refresh using the stored refresh token. Returns false (and signs out) on failure. */
async function refreshTokens(): Promise<boolean> {
  if (!session?.refreshToken) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ refresh_token: session.refreshToken }),
    });
    if (!res.ok) {
      // 400/401 → refresh token revoked/expired. Distinguish from transient
      // network errors (caught below): an HTTP rejection means truly signed out.
      session = null;
      clearAuthSession();
      emitChanged();
      return false;
    }
    applyTokens((await res.json()) as TokenResponse);
    persistSession();
    emitChanged();
    return true;
  } catch {
    // Network error — keep the session so a later call can retry; just no token now.
    return false;
  }
}

// ── Public API ──────────────────────────────────────────────

/** Interactive Google sign-in via the system browser + loopback redirect. */
export async function login(): Promise<AuthStatus> {
  const { verifier, challenge } = generatePkce();
  const { server, port, codePromise } = await listenLoopback();
  try {
    const url = new URL(`${SUPABASE_URL}/auth/v1/authorize`);
    url.searchParams.set('provider', 'google');
    url.searchParams.set('redirect_to', `http://127.0.0.1:${port}`);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 's256');
    await shell.openExternal(url.toString());

    const code = await codePromise;
    await exchangeCode(code, verifier);
    emitChanged();
    return getStatus();
  } finally {
    server.close();
  }
}

/** Server-side revoke (best-effort) + clear local session. */
export async function logout(): Promise<AuthStatus> {
  if (session?.accessToken) {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.accessToken}` },
      });
    } catch { /* best-effort */ }
  }
  session = null;
  clearAuthSession();
  emitChanged();
  return getStatus();
}

/**
 * Silent refresh on launch. Loads the encrypted refresh token and validates it
 * against the server. Idempotent — safe to call once during app bootstrap.
 */
export function initAuth(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const stored = getAuthSession();
    if (!stored?.refreshToken) return;
    try {
      const refreshToken = decryptSecret(stored.refreshToken);
      session = {
        accessToken: '',
        refreshToken,
        expiresAt: 0,
        userId: stored.userId,
        email: stored.email,
      };
      await refreshTokens(); // populates a live access token or signs out
    } catch {
      // Corrupted/undecryptable session — clear it and stay signed out.
      session = null;
      clearAuthSession();
    }
  })();
  return initPromise;
}

/** Status after the launch-time silent refresh has settled (used by IPC). */
export async function getStatusReady(): Promise<AuthStatus> {
  if (initPromise) await initPromise;
  return getStatus();
}

/** A fresh access token, auto-refreshing if near expiry. Null if signed out. */
export async function getAccessToken(): Promise<string | null> {
  if (initPromise) await initPromise;
  if (!session) return null;
  const now = Math.floor(Date.now() / 1000);
  if (!session.accessToken || now >= session.expiresAt - REFRESH_SKEW_S) {
    const ok = await refreshTokens();
    if (!ok) return null;
  }
  return session?.accessToken ?? null;
}
