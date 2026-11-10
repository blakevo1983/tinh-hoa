-- Migration: baseline security tables (audit_log, rate_limits, feature_flags, cheat_flags)
-- Conforms to docs/03-DATA-MODEL.md, docs/04-SECURITY.md and Rule 30

-- 1. audit_log (Append-only security and operational audit trail)
create table if not exists public.audit_log (
  id bigserial primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  details jsonb,
  ip_hash text,
  request_id uuid,
  created_at timestamptz not null default now()
);

-- Trigger: strictly prevent any UPDATE or DELETE on audit_log
create or replace function public.prevent_audit_log_modification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'audit_log is append-only: updates and deletes are prohibited';
end;
$$;

create or replace trigger audit_log_prevent_modification
  before update or delete on public.audit_log
  for each row execute function public.prevent_audit_log_modification();

-- 2. rate_limits (Token bucket rate limiting table)
create table if not exists public.rate_limits (
  key text primary key,
  tokens numeric not null check (tokens >= 0),
  updated_at timestamptz not null default now()
);

-- 3. feature_flags (Operational kill switches and gradual rollout)
create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null,
  rollout_percent smallint not null default 100 check (rollout_percent between 0 and 100)
);

-- 4. cheat_flags (Heuristic anomaly detection for human review)
create table if not exists public.cheat_flags (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references auth.users(id) on delete cascade,
  kind text not null,
  evidence jsonb,
  severity smallint not null check (severity between 1 and 3),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed', 'banned')),
  created_at timestamptz not null default now()
);

-- 5. Enable Row Level Security (RLS) immediately on all tables (Rule 30)
alter table public.audit_log enable row level security;
alter table public.rate_limits enable row level security;
alter table public.feature_flags enable row level security;
alter table public.cheat_flags enable row level security;

-- 6. Revoke all permissions from anon and authenticated (Deny-by-default)
revoke all on public.audit_log from anon, authenticated;
revoke all on public.rate_limits from anon, authenticated;
revoke all on public.feature_flags from anon, authenticated;
revoke all on public.cheat_flags from anon, authenticated;

-- 7. Selective grants: feature_flags read-only for public clients
grant select on public.feature_flags to anon, authenticated;

create policy feature_flags_select_all on public.feature_flags
  for select
  to anon, authenticated
  using (enabled = true);
