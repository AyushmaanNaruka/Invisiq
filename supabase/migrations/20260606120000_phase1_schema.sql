-- InvisiQ Beta — Phase 1 backend foundation
-- Schema + RLS for auth/trial/analytics (Beta Launch Plan §5.2).
--
-- Invariants (do NOT relax):
--   * trials / devices / prompts are written ONLY by edge functions (service role,
--     server clock). The client must never set its own started_at/expires_at, and
--     must never INSERT a prompt row (server redacts first).
--   * The client may INSERT its own events and read/delete its own data, nothing more.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  created_at  timestamptz not null default now()
);

-- Authoritative trial window. ALL times are SERVER-set by the edge function.
create table if not exists public.trials (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  device_id   text,
  started_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  status      text not null default 'active'
);

-- Binds a machine to its first trial, so a new Google account on the same
-- machine inherits the existing window instead of getting a fresh 14 days.
create table if not exists public.devices (
  device_id          text primary key,
  first_user_id      uuid references auth.users(id),
  trial_consumed_at  timestamptz not null default now()
);

-- Privacy-safe analytics. NO prompt text here.
create table if not exists public.events (
  id       bigint generated always as identity primary key,
  user_id  uuid references auth.users(id) on delete set null,
  name     text not null,
  props    jsonb not null default '{}',
  ts       timestamptz not null default now()
);

-- EVERY prompt logged (disclosed in T&C). TEXT ONLY — never screenshots/OCR.
create table if not exists public.prompts (
  id           bigint generated always as identity primary key,
  user_id      uuid references auth.users(id) on delete cascade,
  content      text,                              -- server-redacted of API keys / obvious PII before write
  model        text,
  mode         text,
  has_image    boolean not null default false,    -- image attachments: FLAG ONLY, image not stored
  tos_version  text not null,                      -- which T&C version was in force (proof of disclosure)
  created_at   timestamptz not null default now()
);

-- Proof each user accepted the T&C that discloses prompt logging.
create table if not exists public.tos_acceptances (
  user_id      uuid references auth.users(id) on delete cascade,
  tos_version  text not null,
  accepted_at  timestamptz not null default now(),
  primary key (user_id, tos_version)
);

-- ---------------------------------------------------------------------------
-- Indexes (support the entitlement check + analytics reads)
-- ---------------------------------------------------------------------------

create index if not exists trials_expires_at_idx    on public.trials (expires_at);
create index if not exists devices_first_user_idx    on public.devices (first_user_id);
create index if not exists events_user_ts_idx        on public.events (user_id, ts desc);
create index if not exists prompts_user_created_idx  on public.prompts (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles        enable row level security;
alter table public.trials          enable row level security;
alter table public.devices         enable row level security;
alter table public.events          enable row level security;
alter table public.prompts         enable row level security;
alter table public.tos_acceptances enable row level security;

-- profiles: read your own row only.
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for select using (auth.uid() = id);

-- trials: read your own row only. (Writes go through the service-role edge fn.)
drop policy if exists "own trial" on public.trials;
create policy "own trial" on public.trials
  for select using (auth.uid() = user_id);

-- devices: no client policies at all → fully service-role-only (RLS denies by default).

-- events: client may INSERT its own events (and read them back).
drop policy if exists "insert own events" on public.events;
create policy "insert own events" on public.events
  for insert with check (auth.uid() = user_id);
drop policy if exists "read own events" on public.events;
create policy "read own events" on public.events
  for select using (auth.uid() = user_id);

-- prompts: client may read + delete its own rows, but NEVER insert.
-- INSERTs are written by the telemetry edge function (service role) after redaction.
drop policy if exists "read own prompts" on public.prompts;
create policy "read own prompts" on public.prompts
  for select using (auth.uid() = user_id);
drop policy if exists "delete own prompts" on public.prompts;
create policy "delete own prompts" on public.prompts
  for delete using (auth.uid() = user_id);

-- tos_acceptances: full access to your own rows.
drop policy if exists "own tos" on public.tos_acceptances;
create policy "own tos" on public.tos_acceptances
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
