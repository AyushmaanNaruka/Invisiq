/**
 * capture-controller.ts — Model B stealth-typing orchestration.
 *
 * Owns the "capture session" lifecycle that lets the user type into InvisiQ
 * while the overlay stays WS_EX_NOACTIVATE (never foreground). It sits on top of
 * resilience-controller (which manages the ghostai_helper.exe process + pipe)
 * and implements:
 *   - an epoch model so stale keys from a previous session are rejected;
 *   - a heartbeat (ping/pong) liveness check on the helper pipe;
 *   - the degradation ladder: helper → uiohook → clipboard, so the textarea is
 *     never silently dead.
 *
 * The actual suppressing keyboard hook lives in the helper. This module never
 * touches keystrokes directly except to relay the helper's translated events to
 * the renderer over 'capture:key'.
 */

import { randomBytes } from 'node:crypto';
import { getOverlayWindow, hideOverlay } from './overlay';
import {
  startAgent,
  sendCommand,
  onHelperResponse,
  isHelperConnected,
} from './resilience-controller';
import { armInvisibleInput, disarmInvisibleInput } from './invisible-input';
import { logger } from '@shared/logger';
import type {
  CaptureTier,
  CaptureFailReason,
  ProctorDetection,
  ResilienceResponse,
} from '@shared/types';

// ── Module state ────────────────────────────────────────────────────────────
let captureActive = false;
let epoch = 0;
let tier: CaptureTier = 'none';
let helperReady = false;
let proctorState: ProctorDetection = { detected: false, names: [] };

let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let lastPongAt = 0;
let unsubscribeResponses: (() => void) | null = null;

const HEARTBEAT_INTERVAL_MS = 2000;
const HEARTBEAT_TIMEOUT_MS = 5000;

// ── Renderer notifications ──────────────────────────────────────────────────
function notify(channel: string, payload?: unknown): void {
  const win = getOverlayWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, payload);
  }
}

function notifyCaptureState(): void {
  notify('capture:state', { active: captureActive, epoch, tier });
}

// ── Helper response handling ────────────────────────────────────────────────
function handleHelperResponse(resp: ResilienceResponse): void {
  switch (resp.type) {
    case 'ready':
      helperReady = true;
      logger.log('[capture] helper ready');
      break;

    case 'pong':
      lastPongAt = Date.now();
      break;

    case 'key': {
      // Relay only live, in-epoch keys to the renderer. Drop stale events that
      // arrive after capture exit or from a previous session.
      const p = resp.payload as { epoch?: number } | undefined;
      if (captureActive && tier === 'helper' && p && p.epoch === epoch) {
        notify('capture:key', resp.payload);
      }
      break;
    }

    case 'proctor':
      proctorState = (resp.payload as unknown as ProctorDetection) ?? { detected: false, names: [] };
      notify('proctor:detected', proctorState);
      break;

    case 'capture_failed':
      onCaptureFailure(((resp.payload as { reason?: CaptureFailReason })?.reason) ?? 'pipe-dropped');
      break;
  }
}

// ── Heartbeat ───────────────────────────────────────────────────────────────
function startHeartbeat(): void {
  stopHeartbeat();
  lastPongAt = Date.now();
  heartbeatInterval = setInterval(() => {
    if (!captureActive || tier !== 'helper') {
      stopHeartbeat();
      return;
    }
    if (Date.now() - lastPongAt > HEARTBEAT_TIMEOUT_MS) {
      logger.warn('[capture] heartbeat lost');
      onCaptureFailure('heartbeat-lost');
      return;
    }
    sendCommand({ type: 'ping' });
  }, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// ── Degradation ladder ──────────────────────────────────────────────────────
function onCaptureFailure(reason: CaptureFailReason): void {
  logger.warn(`[capture] failure: ${reason} (tier was ${tier})`);
  notify('capture:failed', { reason });
  stopHeartbeat();

  // Session lock: the hook is gone and input can't be captured until unlock.
  // Exit capture entirely — the user re-enters when they return.
  if (reason === 'session-locked') {
    void exitCapture();
    return;
  }

  if (!captureActive) return;

  // Degrade to the next tier so the textarea never goes silently dead.
  if (tier === 'helper') {
    // Best-effort: tell the helper to uninstall its suppressing hook. If the
    // failure was a false heartbeat loss (helper still alive), this prevents the
    // hook from staying installed and freezing the foreground keyboard while we
    // ALSO arm uiohook. Harmless no-op if the pipe is genuinely dead.
    sendCommand({ type: 'set_capture', payload: { active: false, epoch } });
    const armed = tryArmUiohook();
    tier = armed ? 'uiohook' : 'clipboard';
    logger.log(`[capture] degraded helper → ${tier}`);
    notifyCaptureState();
  } else if (tier === 'uiohook') {
    tier = 'clipboard';
    notifyCaptureState();
  }
}

function tryArmUiohook(): boolean {
  try {
    const res = armInvisibleInput();
    return res.armed;
  } catch {
    return false;
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Spawn the resident helper (best-effort) and subscribe to its responses.
 * Called once at startup. The hook itself is NOT installed until enterCapture()
 * — so an idle helper carries no keylogger signature.
 */
export async function initCaptureController(): Promise<void> {
  unsubscribeResponses = onHelperResponse(handleHelperResponse);

  // Randomized pipe name per launch — a stable well-known pipe from a hooking
  // binary is a cheap IOC for an AV/EDR detection rule.
  const pipeName = `InvisiQ-${randomBytes(4).toString('hex')}`;
  try {
    const res = await startAgent('', pipeName);
    helperReady = res.success && isHelperConnected();
    logger.log(`[capture] helper spawn: ${res.success ? 'ok' : 'failed'}${res.error ? ' — ' + res.error : ''}`);
  } catch (err) {
    helperReady = false;
    logger.warn('[capture] helper spawn threw — will degrade on capture:', err);
  }
}

/**
 * Enter capture mode. Picks the best available input tier and activates it.
 * Idempotent: re-entering while active re-asserts the current tier.
 */
export function enterCapture(): { active: boolean; epoch: number; tier: CaptureTier } {
  if (captureActive) {
    return { active: true, epoch, tier };
  }

  epoch += 1;
  captureActive = true;

  if (isHelperConnected()) {
    tier = 'helper';
    lastPongAt = Date.now();
    sendCommand({ type: 'set_capture', payload: { active: true, epoch } });
    startHeartbeat();
  } else if (tryArmUiohook()) {
    tier = 'uiohook';
  } else {
    tier = 'clipboard';
  }

  logger.log(`[capture] enter — tier=${tier} epoch=${epoch}`);
  notifyCaptureState();
  return { active: true, epoch, tier };
}

/** Exit capture mode and tear down whichever tier was active. */
export async function exitCapture(): Promise<{ active: boolean }> {
  if (!captureActive) return { active: false };

  stopHeartbeat();

  if (tier === 'helper') {
    sendCommand({ type: 'set_capture', payload: { active: false, epoch } });
  } else if (tier === 'uiohook') {
    try {
      disarmInvisibleInput();
    } catch {
      /* best effort */
    }
  }

  captureActive = false;
  tier = 'none';
  logger.log('[capture] exit');
  notifyCaptureState();
  return { active: false };
}

/**
 * Panic kill switch — instantly exit capture, hide the overlay, disarm
 * everything. Wired to a global hotkey.
 */
export async function panic(): Promise<{ success: boolean }> {
  logger.warn('[capture] PANIC');
  await exitCapture();
  try {
    disarmInvisibleInput();
  } catch {
    /* best effort */
  }
  hideOverlay();
  return { success: true };
}

export function getCaptureStatus(): { active: boolean; epoch: number; tier: CaptureTier } {
  return { active: captureActive, epoch, tier };
}

export function getProctorStatus(): ProctorDetection {
  return proctorState;
}

export function isCaptureActive(): boolean {
  return captureActive;
}

/**
 * Synchronous teardown for app shutdown — clears the heartbeat timer and the
 * response subscription. The helper PROCESS is killed separately by
 * cleanupResilience() in will-quit (and its parent-death watchdog is the
 * ultimate backstop), so we don't await the async stopAgent() here.
 */
export function cleanupCaptureController(): void {
  stopHeartbeat();
  if (unsubscribeResponses) {
    unsubscribeResponses();
    unsubscribeResponses = null;
  }
  captureActive = false;
  tier = 'none';
}
