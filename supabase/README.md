# InvisiQ Backend — Phase 1 (Supabase)

Backend foundation for the beta: auth-backed schema, the server-clock
**entitlement** gate, and the **telemetry** ingest function. **Zero client
changes** — this directory deploys independently of the Electron app and never
touches the stealth/capture code.

> Source of truth: [`docs/InvisiQ-Beta-Launch-Plan.md`](../docs/InvisiQ-Beta-Launch-Plan.md)
> §5 (backend), §6 (trial mechanics), §8 (analytics), §15 (rollout).

## Layout

```
supabase/
├── config.toml                              # CLI config (verify_jwt per function)
├── .env.example                             # secrets to set (placeholders only)
├── migrations/
│   └── 20260606120000_phase1_schema.sql     # §5.2 schema + RLS + indexes
└── functions/
    ├── _shared/{cors,auth,token,redact}.ts  # shared helpers
    ├── entitlement/index.ts                  # → /functions/v1/entitlement/check
    └── telemetry/index.ts                    # → /functions/v1/telemetry
```

## What you fill in

| Thing | Where | Notes |
|---|---|---|
| Project ref | `supabase link --project-ref <ref>` | from the Supabase dashboard URL |
| `FRAGMENT_SECRET` | `supabase secrets set` | long random; **never rotate on a live cohort** (breaks every derived key) |
| `SESSION_SIGNING_SECRET` | `supabase secrets set` | long random; different from the fragment secret |
| `TRIAL_DAYS` *(opt)* | `supabase secrets set` | defaults to `14` |
| `SESSION_TTL_HOURS` *(opt)* | `supabase secrets set` | defaults to `24` (offline grace) |
| Google OAuth client | Dashboard → Auth → Providers → Google | needed for Phase 2, not for these curl tests |

`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY` are injected
by the platform automatically — do **not** set them.

Generate strong secrets:

```bash
openssl rand -hex 32   # run twice, one per secret
```

## Deploy

```bash
# From the repo root, one-time link:
supabase link --project-ref <your-project-ref>

# 1. Apply the schema migration
supabase db push

# 2. Set secrets (after copying .env.example → .env and filling values)
supabase secrets set --env-file supabase/.env

# 3. Deploy the functions
supabase functions deploy entitlement
supabase functions deploy telemetry
```

## Acceptance test (§15 Phase 1)

> **Target:** test JWT → `active` + fragment on first call; identical
> `expires_at` on a repeat call; `expired` after backdating the trial row.

Set shell vars (anon key from Dashboard → Settings → API):

```bash
PROJECT_REF=<your-project-ref>
BASE=https://$PROJECT_REF.supabase.co
ANON=<anon-public-key>
```

### 1. Make a test user + get its JWT

Create a test user (Dashboard → Authentication → Add user → email + password,
"auto-confirm"), then exchange password for an access token:

```bash
ACCESS=$(curl -s "$BASE/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d '{"email":"tester@example.com","password":"test-password-123"}' \
  | jq -r .access_token)
echo "$ACCESS"   # should be a long JWT, not null
```

### 2. First call → active + fragment, fresh 14-day window

```bash
curl -s "$BASE/functions/v1/entitlement/check" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d '{"device_id":"test-device-abc"}' | jq
```
Expect:
```json
{ "status": "active", "daysLeft": 14, "expiresAt": "...",
  "sessionToken": "....", "unlockFragment": "<64-hex>" }
```

### 3. Repeat call → SAME expires_at (server window is sticky)

```bash
curl -s "$BASE/functions/v1/entitlement/check" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d '{"device_id":"test-device-abc"}' | jq .expiresAt
```
Must equal the `expiresAt` from step 2. `unlockFragment` is also identical
(it's `HMAC(secret, user.id)` — deterministic).

### 4. Backdate the trial → expired, no fragment

Run in Dashboard → SQL Editor (replace the email):

```sql
update public.trials
set expires_at = now() - interval '1 day'
where user_id = (select id from auth.users where email = 'tester@example.com');
```

Then call again:

```bash
curl -s "$BASE/functions/v1/entitlement/check" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d '{"device_id":"test-device-abc"}' | jq
```
Expect — **no `sessionToken`, no `unlockFragment`**:
```json
{ "status": "expired" }
```

### 5. (Bonus) Device dedupe

Create a *second* test user, sign in, and call with the **same**
`device_id`. The second user inherits the first user's `expiresAt` instead of
getting a fresh 14 days.

### 6. Telemetry smoke test

```bash
curl -s "$BASE/functions/v1/telemetry" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d '{
        "events": [{"name":"app_launch","props":{"v":"0.1.0"}}],
        "prompts": [{"content":"my key is sk-proj-ABCDEFGHIJKLMNOP and email a@b.com","model":"gpt-4o","mode":"coding","has_image":false,"tos_version":"2026-06-01"}],
        "tos": {"tos_version":"2026-06-01"}
      }' | jq
```
Expect `{ "ok": true, "inserted": { "events": 1, "prompts": 1, "tos": true } }`.
Then verify redaction in SQL Editor — the stored `content` must read
`my key is [REDACTED_API_KEY] and email [REDACTED_EMAIL]`:

```sql
select content, model, mode, has_image, tos_version from public.prompts order by created_at desc limit 1;
```

## Notes

- **Server clock only.** `started_at`/`expires_at` are stamped from the edge
  runtime's `Date.now()`. The client never sends or sets them.
- **No client prompt writes.** RLS forbids client INSERTs on `prompts` /
  `trials` / `devices`; only these functions (service role) write them.
- **Rate limiting.** `telemetry` enforces per-request batch caps
  (`MAX_EVENTS`/`MAX_PROMPTS`) but not true per-user rate limiting — that needs
  a counter table or an external limiter, deferred past Phase 1.
- **Redaction is best-effort.** It strips obvious keys/PII as defence-in-depth;
  the hard guarantee is that screenshots/OCR text never reach `prompts` at all
  (enforced by the client at the dispatch chokepoint in a later phase).
