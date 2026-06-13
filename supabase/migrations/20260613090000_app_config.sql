-- InvisiQ Beta — remote kill-switch + version floor (Beta Launch Plan §10.4).
--
-- Single-row config the client reads at launch to decide whether the running
-- build must force-update before it can be used. Public-READ (the check runs
-- pre-auth, even on a killed build); writes are service-role only (no client
-- insert/update policy) so the fleet control can't be tampered from a client.

create table if not exists public.app_config (
  id              int primary key default 1,
  min_version     text,                              -- builds below this are forced to update
  killed_versions text[] not null default '{}',      -- exact versions disabled remotely
  message         text,                              -- optional message shown on the forced-update screen
  latest_version  text,                              -- newest available (informational)
  updated_at      timestamptz not null default now(),
  constraint app_config_singleton check (id = 1)
);

alter table public.app_config enable row level security;

-- Public read (anon + authenticated). The version gate runs before sign-in.
drop policy if exists "public read app_config" on public.app_config;
create policy "public read app_config" on public.app_config
  for select using (true);
-- No insert/update/delete policy → writes are service-role only.

-- Seed: floor = current shipping version, nothing killed → gate is inert by default.
insert into public.app_config (id, min_version, latest_version, message)
values (1, '1.2.0', '1.2.0', null)
on conflict (id) do nothing;
