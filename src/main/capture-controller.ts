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
import { globalShortcut } from 'electron';
import { getOverlayWindow, hideOverlay, setOnOverlayHidden } from './overlay';
import { setContentProtectionDesired } from './stealth';
import { getNestedSetting } from './store';
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

// ── Adaptive content protection (GetWindowDisplayAffinity sweep evasion) ──────
// Bucket-B proctors enumerate processes AND can run a GetWindowDisplayAffinity
// sweep that finds WDA_EXCLUDEFROMCAPTURE windows by their affinity flag (name-
// independent — the disguise name does NOT help here). For these, IF the user
// opted in (stealth.evadeSweepProctor), we drop WDA so the sweep finds nothing.
// Bucket-A proctors (browser extensions: proctorio, honorlock) only see the
// SHARED screen, so WDA must stay ON for them — we never degrade on those.
const SWEEP_CAPABLE_PROCTORS = [
  'msb', // Mettl Secure Browser (process + the MsbWindowCef window class)
  'mettl',
  'lockdownbrowser', // Respondus LockDown Browser
  'safeexambrowser',
  'examroot',
  'proctoru',
];

function isSweepCapableProctor(names: string[]): boolean {
  return names.some((raw) => {
    const n = raw.toLowerCase();
    return SWEEP_CAPABLE_PROCTORS.some((p) => n.includes(p));
  });
}

function applyAdaptiveContentProtection(state: ProctorDetection): void {
  // Opt-in only (default off): dropping WDA dodges affinity sweeps but exposes
  // the overlay to screenshots/recording (the MORE common proctor vector), so we
  // never flip it automatically unless the user enabled it.
  const optedIn =
    (getNestedSetting('stealth.evadeSweepProctor') as boolean | undefined) === true;
  if (!optedIn) return;

  const win = getOverlayWindow();
  if (!win || win.isDestroyed()) return;

  const shouldDrop = state.detected && isSweepCapableProctor(state.names);
  setContentProtectionDesired(win, !shouldDrop);
  logger.log(
    `[capture] adaptive WDA → ${shouldDrop ? 'DROPPED (sweep-capable proctor present)' : 'restored'}`,
  );
}

// ── Paste-into-capture shortcut ───────────────────────────────────────────────
// In stealth the overlay is WS_EX_NOACTIVATE (never foreground), so neither a DOM
// paste event nor the helper's pass-through Ctrl+V reaches the textarea. While
// capture is active we grab Ctrl+V system-wide and forward a 'capture:paste' to the
// renderer, which reads the clipboard via IPC and inserts at the caret. This is
// consistent with capture's model (all keys belong to InvisiQ while typing) and is
// scoped to the session — released the moment capture exits. Fail-soft: if the
// grab fails, the Paste button in InputArea remains the reliable path.
const PASTE_ACCELERATOR = 'CommandOrControl+V';

function registerPasteShortcut(): void {
  try {
    if (globalShortcut.isRegistered(PASTE_ACCELERATOR)) return;
    const ok = globalShortcut.register(PASTE_ACCELERATOR, () => {
      if (captureActive) notify('capture:paste');
    });
    if (!ok) logger.warn('[capture] could not grab Ctrl+V for paste — use the Paste button');
  } catch (err) {
    logger.warn('[capture] paste shortcut register threw:', err);
  }
}

function unregisterPasteShortcut(): void {
  try {
    if (globalShortcut.isRegistered(PASTE_ACCELERATOR)) {
      globalShortcut.unregister(PASTE_ACCELERATOR);
    }
  } catch {
    /* best effort */
  }
}

// ── Helper response handling ────────────────────────────────────────────────
function handleHelperResponse(resp: ResilienceResponse): void {
  switch (resp.type) {
    case 'ready':
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
      applyAdaptiveContentProtection(proctorState);
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

  // Invariant: stealth capture must never outlive overlay visibility. If the
  // overlay is hidden by ANY path (toggle hotkey, Escape, IPC, programmatic),
  // tear the capture session down so the suppressing hook stops eating keystrokes
  // into an invisible window. This is the fix for "typing in another app goes into
  // InvisiQ even though it isn't visible."
  setOnOverlayHidden(() => {
    if (captureActive) void exitCapture();
  });

  // Randomized pipe name per launch — a stable well-known pipe from a hooking
  // binary is a cheap IOC for an AV/EDR detection rule.
  const pipeName = `InvisiQ-${randomBytes(4).toString('hex')}`;
  try {
    const res = await startAgent('', pipeName);
    logger.log(`[capture] helper spawn: ${res.success ? 'ok' : 'failed'}${res.error ? ' — ' + res.error : ''}`);
  } catch (err) {
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
  registerPasteShortcut();

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
  unregisterPasteShortcut();

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
  unregisterPasteShortcut();
  if (unsubscribeResponses) {
    unsubscribeResponses();
    unsubscribeResponses = null;
  }
  captureActive = false;
  tier = 'none';
}
