// Service-role Supabase client + JWT → user resolution.
//
// We verify the caller's Supabase JWT explicitly (auth.getUser) rather than
// trusting only the platform gate, so every function resolves a concrete
// user.id before touching the database with the service role.

import {
  createClient,
  type SupabaseClient,
  type User,
} from "npm:@supabase/supabase-js@2";

/**
 * Service-role client. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are
 * auto-injected into the edge runtime — they are NOT set via `secrets set`.
 */
export function getAdminClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Extract the bearer token from the Authorization header. */
export function getBearer(req: Request): string | null {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  return token.length > 0 ? token : null;
}

/**
 * Verify the request's JWT and resolve the authenticated user.
 * Returns null when there is no valid user (caller should respond 401).
 */
export async function getUser(
  req: Request,
  admin: SupabaseClient,
): Promise<User | null> {
  const token = getBearer(req);
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}
