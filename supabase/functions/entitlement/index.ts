// InvisiQ — entitlement/check (Beta Launch Plan §5.3, §6).
//
// The server-clock brain. Deployed at /functions/v1/entitlement/check.
//   1. Verify Supabase JWT → user.id.
//   2. Device dedupe: a machine that already burned a trial under another
//      account inherits that window (no fresh 14 days).
//   3. Genuinely new → started_at = now(), expires_at = now() + 14d (SERVER clock).
//   4. Active  → { status:'active', daysLeft, expiresAt, sessionToken, unlockFragment }.
//   5. Expired → { status:'expired' } with NO fragment and NO token.

import { type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { handleOptions, json } from "../_shared/cors.ts";
import { getAdminClient, getUser } from "../_shared/auth.ts";
import { computeFragment, signSessionToken } from "../_shared/token.ts";

const DAY_MS = 86_400_000;

function requireSecret(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

interface TrialRow {
  user_id: string;
  device_id: string | null;
  started_at: string;
  expires_at: string;
  status: string;
}

/** Resolve (or create) the authoritative trial window for this user. */
async function resolveTrial(
  admin: SupabaseClient,
  userId: string,
  deviceId: string | null,
  trialDays: number,
): Promise<TrialRow> {
  // (1) Existing trial is always authoritative.
  const existing = await admin
    .from("trials")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing.data) return existing.data as TrialRow;

  // (2) New user. Try to inherit a window already burned on this device.
  let startedAt: string | null = null;
  let expiresAt: string | null = null;

  if (deviceId) {
    const device = await admin
      .from("devices")
      .select("first_user_id")
      .eq("device_id", deviceId)
      .maybeSingle();
    if (device.data?.first_user_id) {
      const firstTrial = await admin
        .from("trials")
        .select("started_at, expires_at")
        .eq("user_id", device.data.first_user_id)
        .maybeSingle();
      if (firstTrial.data) {
        startedAt = firstTrial.data.started_at;
        expiresAt = firstTrial.data.expires_at;
      }
    }
  }

  // (3) Genuinely new device → fresh server-clock window.
  if (!startedAt || !expiresAt) {
    const now = Date.now();
    startedAt = new Date(now).toISOString();
    expiresAt = new Date(now + trialDays * DAY_MS).toISOString();
    if (deviceId) {
      // Record this machine as a trial consumer. ignoreDuplicates so a
      // concurrent first-call never clobbers the original first_user_id.
      await admin
        .from("devices")
        .upsert(
          { device_id: deviceId, first_user_id: userId },
          { onConflict: "device_id", ignoreDuplicates: true },
        );
    }
  }

  const inserted = await admin
    .from("trials")
    .insert({
      user_id: userId,
      device_id: deviceId,
      started_at: startedAt,
      expires_at: expiresAt,
      status: "active",
    })
    .select()
    .single();

  if (inserted.error || !inserted.data) {
    throw new Error(`trial_create_failed: ${inserted.error?.message}`);
  }
  return inserted.data as TrialRow;
}

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  try {
    const fragmentSecret = requireSecret("FRAGMENT_SECRET");
    const sessionSecret = requireSecret("SESSION_SIGNING_SECRET");
    const trialDays = Number(Deno.env.get("TRIAL_DAYS") ?? "14");
    const sessionTtlHours = Number(Deno.env.get("SESSION_TTL_HOURS") ?? "24");

    const admin = getAdminClient();
    const user = await getUser(req, admin);
    if (!user) return json(401, { error: "unauthorized" });

    const body = await req.json().catch(() => ({}));
    const deviceId = typeof body.device_id === "string"
      ? body.device_id.slice(0, 200)
      : null;

    // Keep a profile row in sync (best-effort).
    await admin
      .from("profiles")
      .upsert({ id: user.id, email: user.email }, { onConflict: "id" });

    const trial = await resolveTrial(admin, user.id, deviceId, trialDays);

    // Status is decided by the SERVER clock, never the client.
    const now = Date.now();
    const expiresMs = new Date(trial.expires_at).getTime();
    const active = trial.status === "active" && now < expiresMs;

    if (!active) {
      // Flip status once so it reflects reality (idempotent).
      if (trial.status === "active") {
        await admin
          .from("trials")
          .update({ status: "expired" })
          .eq("user_id", user.id);
      }
      return json(200, { status: "expired" });
    }

    const daysLeft = Math.max(0, Math.ceil((expiresMs - now) / DAY_MS));
    const unlockFragment = await computeFragment(user.id, fragmentSecret);
    const sessionToken = await signSessionToken(
      {
        uid: user.id,
        deviceId,
        iat: Math.floor(now / 1000),
        exp: Math.floor(now / 1000) + sessionTtlHours * 3600,
      },
      sessionSecret,
    );

    return json(200, {
      status: "active",
      daysLeft,
      expiresAt: trial.expires_at,
      sessionToken,
      unlockFragment,
    });
  } catch (err) {
    console.error("entitlement/check error:", err instanceof Error ? err.message : err);
    return json(500, { error: "internal_error" });
  }
});
