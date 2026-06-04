import { useCallback, useEffect, useRef, useState } from 'react';
import type { CaptureKeyEvent, CaptureKeyKind, CaptureTier, ProctorDetection } from '@shared/types';

/**
 * useCapture — Model B stealth-typing on the renderer side.
 *
 * The overlay window is WS_EX_NOACTIVATE (never foreground) so it can't receive
 * WM_KEYDOWN. Instead the main process forwards translated keystrokes captured by
 * the suppressing helper hook over 'capture:key' (and, on the degraded uiohook
 * tier, over the legacy 'invisible-input:*' channels). This hook:
 *   - normalizes both sources into a single onKey(kind, char) callback;
 *   - tracks the capture session state (active / tier) from 'capture:state';
 *   - surfaces proctor-detection ('proctor:detected') and failures ('capture:failed');
 *   - drops stale/out-of-order helper events using the seq + epoch from the event.
 *
 * It NEVER calls window-level focus — typing is delivered without the overlay
 * ever becoming the foreground window.
 */

export interface CaptureKeyHandler {
  (kind: CaptureKeyKind, char?: string): void;
}

export interface UseCapture {
  active: boolean;
  tier: CaptureTier;
  epoch: number;
  proctor: ProctorDetection;
  /** True briefly after a capture:failed event, until the next successful state. */
  degraded: boolean;
  enter(): Promise<void>;
  exit(): Promise<void>;
  toggle(): Promise<void>;
  panic(): Promise<void>;
}

export function useCapture(onKey: CaptureKeyHandler): UseCapture {
  const [active, setActive] = useState(false);
  const [tier, setTier] = useState<CaptureTier>('none');
  const [epoch, setEpoch] = useState(0);
  const [proctor, setProctor] = useState<ProctorDetection>({ detected: false, names: [] });
  const [degraded, setDegraded] = useState(false);

  // Keep the latest handler in a ref so the IPC subscription doesn't re-bind.
  const onKeyRef = useRef(onKey);
  useEffect(() => {
    onKeyRef.current = onKey;
  }, [onKey]);

  // Track the current epoch + last applied seq to reject stale/out-of-order keys.
  const epochRef = useRef(0);
  const lastSeqRef = useRef(-1);
  // Once a live 'capture:state' arrives it is authoritative — the async initial
  // status() snapshot must not clobber a newer epoch (which would drop in-flight
  // capture:key events whose epoch matches the newer session).
  const stateSeenRef = useRef(false);

  // Initial sync (in case main entered capture via hotkey before mount).
  useEffect(() => {
    let cancelled = false;
    window.ghostAPI.capture.status().then((s) => {
      if (cancelled || stateSeenRef.current) return;
      setActive(s.active);
      setTier(s.tier as CaptureTier);
      setEpoch(s.epoch);
      epochRef.current = s.epoch;
    });
    window.ghostAPI.capture.proctorStatus().then((p) => {
      if (!cancelled) setProctor(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const offState = window.ghostAPI.on('capture:state', (payload) => {
      const p = payload as { active: boolean; epoch: number; tier: CaptureTier };
      stateSeenRef.current = true;
      setActive(p.active);
      setTier(p.tier);
      setEpoch(p.epoch);
      epochRef.current = p.epoch;
      lastSeqRef.current = -1; // new session → reset ordering
      // Only clear the degraded warning on a HEALTHY helper session — otherwise a
      // capture:state emitted right after capture:failed (during degradation)
      // would instantly wipe the warning the failure just raised.
      if (p.active && p.tier === 'helper') setDegraded(false);
    });

    const offKey = window.ghostAPI.on('capture:key', (payload) => {
      const e = payload as CaptureKeyEvent;
      // Drop events from a previous session or that arrive after exit.
      if (e.epoch !== epochRef.current) return;
      if (e.seq <= lastSeqRef.current) return; // out-of-order / duplicate guard
      lastSeqRef.current = e.seq;
      onKeyRef.current(e.kind, e.char);
    });

    // Legacy uiohook fallback tier (no seq/epoch — append-only semantics).
    const offChar = window.ghostAPI.on('invisible-input:char', (payload) => {
      const p = payload as { char: string };
      if (p && typeof p.char === 'string') onKeyRef.current('char', p.char);
    });
    const offBack = window.ghostAPI.on('invisible-input:backspace', () => onKeyRef.current('backspace'));
    const offDel = window.ghostAPI.on('invisible-input:delete', () => onKeyRef.current('delete'));
    const offEnter = window.ghostAPI.on('invisible-input:enter', () => onKeyRef.current('enter'));

    const offProctor = window.ghostAPI.on('proctor:detected', (payload) => {
      setProctor(payload as ProctorDetection);
    });

    const offFailed = window.ghostAPI.on('capture:failed', () => {
      setDegraded(true);
    });

    return () => {
      offState();
      offKey();
      offChar();
      offBack();
      offDel();
      offEnter();
      offProctor();
      offFailed();
    };
  }, []);

  const enter = useCallback(async () => {
    await window.ghostAPI.capture.enter();
  }, []);
  const exit = useCallback(async () => {
    await window.ghostAPI.capture.exit();
  }, []);
  const toggle = useCallback(async () => {
    if (active) await window.ghostAPI.capture.exit();
    else await window.ghostAPI.capture.enter();
  }, [active]);
  const panic = useCallback(async () => {
    await window.ghostAPI.capture.panic();
  }, []);

  return { active, tier, epoch, proctor, degraded, enter, exit, toggle, panic };
}
