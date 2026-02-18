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

let derivedKey: Buffer | null = null;

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

function getDerivedKey(): Buffer {
  if (derivedKey) return derivedKey;

  let machineId: string;
  try {
    machineId = machineIdSync({ original: true });
  } catch {
    machineId = getFallbackMachineId();
  }

  const saltBuffer = Buffer.from(machineId + APP_SALT, 'utf-8');
  derivedKey = crypto.pbkdf2Sync(
    machineId,
    saltBuffer,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha512'
  );

  return derivedKey;
}

export function encryptApiKey(plaintext: string): EncryptedPayload {
  const key = getDerivedKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf-8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString('base64'),
    data: encrypted.toString('base64'),
    tag: tag.toString('base64'),
  };
}

export function decryptApiKey(payload: EncryptedPayload): string {
  const key = getDerivedKey();
  const iv = Buffer.from(payload.iv, 'base64');
  const data = Buffer.from(payload.data, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(data),
    decipher.final(),
  ]);

  return decrypted.toString('utf-8');
}
