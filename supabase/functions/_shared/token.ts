// HMAC primitives for the entitlement gate (Beta Launch Plan §6.1, §6.4).
//
//   unlockFragment = HMAC(FRAGMENT_SECRET, user.id)   — deterministic; the client
//       folds it into PBKDF2 so getApiKey() can only decrypt while the trial is live.
//   sessionToken   = base64url(payload).base64url(HMAC(SESSION_SIGNING_SECRET, payload))
//       — server-stamped expiry so a rolled-back client clock can't extend grace.

const encoder = new TextEncoder();

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return new Uint8Array(sig);
}

/** Constant-time comparison of two equal-length byte strings. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Deterministic HMAC(secret, userId) as hex — the offline-decrypt fragment. */
export async function computeFragment(
  userId: string,
  secret: string,
): Promise<string> {
  return toHex(await hmac(secret, userId));
}

export interface SessionPayload {
  uid: string;
  deviceId: string | null;
  iat: number; // issued-at, epoch seconds
  exp: number; // expiry, epoch seconds (SERVER-stamped)
}

/** Sign a server-stamped session token. */
export async function signSessionToken(
  payload: SessionPayload,
  secret: string,
): Promise<string> {
  const body = b64urlEncode(encoder.encode(JSON.stringify(payload)));
  const sig = b64urlEncode(await hmac(secret, body));
  return `${body}.${sig}`;
}

/**
 * Verify + decode a session token. Returns the payload only if the signature
 * matches and it has not expired; null otherwise. (Not needed for the Phase 1
 * acceptance test, but kept here so later phases share one implementation.)
 */
export async function verifySessionToken(
  token: string,
  secret: string,
): Promise<SessionPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = b64urlEncode(await hmac(secret, body));
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(
      new TextDecoder().decode(b64urlDecode(body)),
    ) as SessionPayload;
    const nowSec = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== "number" || payload.exp < nowSec) return null;
    return payload;
  } catch {
    return null;
  }
}
