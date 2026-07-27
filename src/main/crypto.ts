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

let cachedMachineId: string | null = null;
let machineKey: Buffer | null = null;

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

// ── Key derivation ──────────────────────────────────────────
// IMPORTANT: APP_SALT is fixed (changing it bricks every saved key — CLAUDE.md).

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

// ── API keys (machine-only key) ─────────────────────────────

export function encryptApiKey(plaintext: string): EncryptedPayload {
  return aesEncrypt(getMachineKey(), plaintext);
}

/**
 * Decrypt an API key. A payload saved under the old entitlement-bound scheme
 * (pre open-source release) cannot be decrypted here — that scheme no longer
 * exists. The caller (store.ts's getApiKey) treats a decrypt failure as
 * "no key", clearing the entry and prompting re-entry rather than crashing.
 */
export function decryptApiKey(payload: EncryptedPayload): string {
  return aesDecrypt(getMachineKey(), payload);
}

// ── Generic machine-key secrets ─────────────────────────────

export function encryptSecret(plaintext: string): EncryptedPayload {
  return aesEncrypt(getMachineKey(), plaintext);
}

export function decryptSecret(payload: EncryptedPayload): string {
  return aesDecrypt(getMachineKey(), payload);
}
