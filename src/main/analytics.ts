// InvisiQ — Analytics + full prompt capture (Beta Launch Plan §8).
//
// Batches privacy-safe events and prompt TEXT, flushing to the `telemetry` edge
// function (which validates the JWT and REDACTS server-side before writing).
//
// GUARDRAILS (do not weaken):
//   - TEXT ONLY. Never send screenshot pixels or OCR'd screen content. Image
//     attachments are recorded as a `has_image` flag only.
//   - Capture the user's TYPED prompt, not the memory/transcript-augmented body
//     and not the AI response.
//   - Every prompt is stamped with the in-force T&C version (proof of disclosure).

import { SUPABASE_URL, SUPABASE_ANON_KEY, CURRENT_TOS_VERSION } from '@shared/constants';
import { getAccessToken, getUserId } from './auth';

interface QueuedEvent {
  name: string;
  props: Record<string, unknown>;
  ts: string;
}

interface QueuedPrompt {
  content: string;
  model?: string;
  mode?: string;
  has_image: boolean;
  tos_version: string;
}

const FLUSH_DEBOUNCE_MS = 8000;
const FLUSH_AT = 25; // flush eagerly once the combined queue reaches this
const QUEUE_CAP = 500; // bound memory if the network is down for a long time

let events: QueuedEvent[] = [];
let prompts: QueuedPrompt[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function cap<T>(arr: T[]): T[] {
  return arr.length > QUEUE_CAP ? arr.slice(arr.length - QUEUE_CAP) : arr;
}

function scheduleFlush(): void {
  if (events.length + prompts.length >= FLUSH_AT) {
    void flush();
    return;
  }
  if (!flushTimer) {
    flushTimer = setTimeout(() => { void flush(); }, FLUSH_DEBOUNCE_MS);
  }
}

/** Queue a privacy-safe analytics event (no prompt text). */
export function trackEvent(name: string, props: Record<string, unknown> = {}): void {
  if (typeof name !== 'string' || !name) return;
  events.push({ name: name.slice(0, 120), props: props ?? {}, ts: new Date().toISOString() });
  events = cap(events);
  scheduleFlush();
}

/** Queue the user's typed prompt text (stamped with the in-force T&C version). */
export function capturePrompt(p: {
  content: string;
  model?: string;
  mode?: string;
  hasImage?: boolean;
}): void {
  if (typeof p?.content !== 'string') return;
  prompts.push({
    content: p.content,
    model: p.model,
    mode: p.mode,
    has_image: !!p.hasImage,
    tos_version: CURRENT_TOS_VERSION,
  });
  prompts = cap(prompts);
  scheduleFlush();
}

/** Flush queued events + prompts to the telemetry edge function. */
export async function flush(): Promise<void> {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  if (events.length === 0 && prompts.length === 0) return;

  const token = await getAccessToken();
  if (!token) return; // not signed in yet — keep queued; a later event reschedules

  const batchEvents = events;
  const batchPrompts = prompts;
  events = [];
  prompts = [];

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/telemetry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ events: batchEvents, prompts: batchPrompts }),
    });
    if (!res.ok) throw new Error(`telemetry_http_${res.status}`);
  } catch {
    // Requeue (oldest-first) and let the next tick retry; bounded by QUEUE_CAP.
    events = cap(batchEvents.concat(events));
    prompts = cap(batchPrompts.concat(prompts));
    scheduleFlush();
  }
}

/** Record T&C acceptance server-side (writes tos_acceptances via telemetry). */
export async function acceptTos(): Promise<{ ok: boolean }> {
  const token = await getAccessToken();
  if (!token) return { ok: false };
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/telemetry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tos: { tos_version: CURRENT_TOS_VERSION } }),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

/**
 * Delete the user's own prompt rows (Beta Launch Plan §8 "Delete my data").
 * RLS scopes the delete to the caller's rows; we filter by user_id explicitly
 * because PostgREST rejects an unfiltered DELETE.
 */
export async function deleteMyData(): Promise<{ ok: boolean; error?: string }> {
  const token = await getAccessToken();
  const uid = getUserId();
  if (!token || !uid) return { ok: false, error: 'not_signed_in' };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/prompts?user_id=eq.${uid}`, {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        Prefer: 'return=minimal',
      },
    });
    return res.ok ? { ok: true } : { ok: false, error: `http_${res.status}` };
  } catch {
    return { ok: false, error: 'network' };
  }
}
