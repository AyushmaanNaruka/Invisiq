import crypto from 'crypto';
import { machineIdSync } from 'node-machine-id';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import type { EncryptedPayload } from '@shared/types';

const APP_SALT = 'ghostai-v1-api-key-encryption-salt';
const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

// Payload schema version. Absent/1 = MACHINE-only key (legacy API keys + all
// auth secrets). 2 = ENTITLED key (machineId + server fragment) — API keys only,
// written after Phase 3. See getApiKey() migration in store.ts.
const ENTITLED_PAYLOAD_VERSION = 2;

let cachedMachineId: string | null = null;
let machineKey: Buffer | null = null;
let entitledKey: Buffer | null = null;
let serverFragment: string | null = null;

function getFallbackMachineId(): string {
  const fallbackPath = path.join(app.getPath('userData'), '.machine-id');
  try {
    return fs.readFileSync(fallbackPath, 'utf-8').trim();
  } catch {
    const id = crypto.randomUUID();
    fs.mkdirSync(path.dirname(fallbackPath), { recursive: true });
    fs.writeFileSync(fallbackPath, id, 'utf-8');
    return id;
  }
}

function getMachineId(): string {
  if (cachedMachineId) return cachedMachineId;
  try {
    cachedMachineId = machineIdSync(true);
  } catch {
    cachedMachineId = getFallbackMachineId();
  }
  return cachedMachineId;
}

/** Stable per-machine id used for trial device-dedupe (Beta Launch Plan §5.3). */
export function getDeviceId(): string {
  return getMachineId();
}

// ── Key derivation ──────────────────────────────────────────
// IMPORTANT: APP_SALT is fixed (changing it bricks every saved key — CLAUDE.md).
// We change the INPUT MATERIAL, not the salt.

/**
 * Machine-only key. Byte-identical to the pre-Phase-3 derivation, so existing
 * auth refresh tokens AND legacy (v1) API keys still decrypt. Used for secrets
 * that must work offline and independent of the trial (the auth refresh token).
 */
function getMachineKey(): Buffer {
  if (machineKey) return machineKey;
  const id = getMachineId();
  machineKey = crypto.pbkdf2Sync(
    id,
    Buffer.from(id + APP_SALT, 'utf-8'),
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha512'
  );
  return machineKey;
}

/**
 * Entitlement-bound key = PBKDF2(machineId + SERVER_FRAGMENT, machineId+APP_SALT).
 * The fragment is issued by entitlement/check and held in memory only. Without
 * it, API keys cannot be decrypted — this is the core trial gate (§6.1).
 */
function getEntitledKey(): Buffer {
  if (!serverFragment) {
    const err = new Error('ENTITLEMENT_EXPIRED');
    err.name = 'EntitlementError';
    throw err;
  }
  if (entitledKey) return entitledKey;
  const id = getMachineId();
  entitledKey = crypto.pbkdf2Sync(
    id + serverFragment,
    Buffer.from(id + APP_SALT, 'utf-8'),
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha512'
  );
  return entitledKey;
}

/** Set (or clear) the server entitlement fragment. Called by entitlement.ts. */
export function setServerFragment(fragment: string | null): void {
  if (fragment === serverFragment) return;
  serverFragment = fragment;
  entitledKey = null; // force recompute (or lock) on next use
}

/** True while a valid entitlement fragment is held → API keys are decryptable. */
export function hasServerFragment(): boolean {
  return serverFragment !== null;
}

// ── AES-256-GCM core ────────────────────────────────────────

function aesEncrypt(key: Buffer, plaintext: string): { iv: string; data: string; tag: string } {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
  return {
    iv: iv.toString('base64'),
    data: encrypted.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  };
}

function aesDecrypt(key: Buffer, payload: EncryptedPayload): string {
  const iv = Buffer.from(payload.iv, 'base64');
  const data = Buffer.from(payload.data, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf-8');
}

// ── API keys (entitlement-bound) ────────────────────────────

/** Encrypt an API key with the ENTITLED key. Throws if no fragment (not active). */
export function encryptApiKey(plaintext: string): EncryptedPayload {
  return { ...aesEncrypt(getEntitledKey(), plaintext), v: ENTITLED_PAYLOAD_VERSION };
}

/**
 * Decrypt an API key. v:2 → entitled key (needs fragment). Legacy (no v / v1) →
 * machine key, so pre-Phase-3 keys still read and can be migrated to v:2.
 */
export function decryptApiKey(payload: EncryptedPayload): string {
  const key = payload.v === ENTITLED_PAYLOAD_VERSION ? getEntitledKey() : getMachineKey();
  return aesDecrypt(key, payload);
}

/** True if this stored payload predates the entitled-key scheme (needs migration). */
export function isLegacyApiKeyPayload(payload: EncryptedPayload): boolean {
  return payload.v !== ENTITLED_PAYLOAD_VERSION;
}

// ── Generic machine-key secrets (auth refresh token, etc.) ──
// Always machine-only — must decrypt offline and independent of the trial gate.

export function encryptSecret(plaintext: string): EncryptedPayload {
  return aesEncrypt(getMachineKey(), plaintext);
}

export function decryptSecret(payload: EncryptedPayload): string {
  return aesDecrypt(getMachineKey(), payload);
}
