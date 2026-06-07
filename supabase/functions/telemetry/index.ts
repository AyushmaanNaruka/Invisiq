// InvisiQ — telemetry (Beta Launch Plan §5.3, §8).
//
// JWT-validated batch insert of:
//   * events       — privacy-safe analytics (client-authored, no prompt text).
//   * prompts       — EVERY prompt's TEXT, server-redacted before write. Image
//                     attachments recorded as has_image flag only — never stored.
//   * tos           — optional T&C acceptance proof.
//
// Prompt INSERTs are performed here with the service role *after* redaction;
// the client can never write a prompt row directly (enforced by RLS).

import { type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { handleOptions, json } from "../_shared/cors.ts";
import { getAdminClient, getUser } from "../_shared/auth.ts";
import { redact } from "../_shared/redact.ts";

// Best-effort batch caps (a stateless edge fn can't do true per-user rate
// limiting without a counter table — see README "Rate limiting").
const MAX_EVENTS = 100;
const MAX_PROMPTS = 50;
const FALLBACK_TOS_VERSION = "beta-unset";

interface EventInput {
  name?: unknown;
  props?: unknown;
  ts?: unknown;
}

interface PromptInput {
  content?: unknown;
  model?: unknown;
  mode?: unknown;
  has_image?: unknown;
  tos_version?: unknown;
}

function asString(v: unknown, max = 4000): string | null {
  if (typeof v !== "string") return null;
  return v.slice(0, max);
}

async function insertEvents(
  admin: SupabaseClient,
  userId: string,
  events: EventInput[],
): Promise<number> {
  const rows = events
    .filter((e) => typeof e?.name === "string")
    .slice(0, MAX_EVENTS)
    .map((e) => ({
      user_id: userId,
      name: (e.name as string).slice(0, 120),
      props: (e.props && typeof e.props === "object") ? e.props : {},
      ...(typeof e.ts === "string" ? { ts: e.ts } : {}),
    }));
  if (rows.length === 0) return 0;
  const { error } = await admin.from("events").insert(rows);
  if (error) throw new Error(`events_insert_failed: ${error.message}`);
  return rows.length;
}

async function insertPrompts(
  admin: SupabaseClient,
  userId: string,
  prompts: PromptInput[],
  bodyTosVersion: string | null,
): Promise<number> {
  const rows = prompts
    .slice(0, MAX_PROMPTS)
    .map((p) => ({
      user_id: userId,
      // TEXT ONLY, redacted. Never accept image/OCR content here.
      content: redact(asString(p.content)),
      model: asString(p.model, 120),
      mode: asString(p.mode, 120),
      has_image: p.has_image === true,
      tos_version: asString(p.tos_version, 60) ?? bodyTosVersion ??
        FALLBACK_TOS_VERSION,
    }));
  if (rows.length === 0) return 0;
  const { error } = await admin.from("prompts").insert(rows);
  if (error) throw new Error(`prompts_insert_failed: ${error.message}`);
  return rows.length;
}

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  try {
    const admin = getAdminClient();
    const user = await getUser(req, admin);
    if (!user) return json(401, { error: "unauthorized" });

    const body = await req.json().catch(() => ({}));
    const events: EventInput[] = Array.isArray(body.events) ? body.events : [];
    const prompts: PromptInput[] = Array.isArray(body.prompts)
      ? body.prompts
      : [];
    const bodyTosVersion = asString(body.tos_version, 60);

    const insertedEvents = await insertEvents(admin, user.id, events);
    const insertedPrompts = await insertPrompts(
      admin,
      user.id,
      prompts,
      bodyTosVersion,
    );

    // Optional T&C acceptance proof.
    let tosAccepted = false;
    const tos = body.tos;
    const tosVersion = tos && typeof tos === "object"
      ? asString(tos.tos_version, 60)
      : null;
    if (tosVersion) {
      const { error } = await admin
        .from("tos_acceptances")
        .upsert(
          { user_id: user.id, tos_version: tosVersion },
          { onConflict: "user_id,tos_version", ignoreDuplicates: true },
        );
      if (error) throw new Error(`tos_insert_failed: ${error.message}`);
      tosAccepted = true;
    }

    return json(200, {
      ok: true,
      inserted: {
        events: insertedEvents,
        prompts: insertedPrompts,
        tos: tosAccepted,
      },
    });
  } catch (err) {
    console.error("telemetry error:", err instanceof Error ? err.message : err);
    return json(500, { error: "internal_error" });
  }
});
