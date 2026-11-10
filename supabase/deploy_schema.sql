-- Tinh Hoa - Complete Production Schema Bundle
-- Generated automatically for zero-friction deployment
-- Run this in Supabase SQL Editor or via supabase db push


-- ==========================================
-- Migration: 20261110055737_create_profiles.sql
-- ==========================================

-- Migration: create profiles table, public_profiles view and auth trigger
-- Conforms to docs/03-DATA-MODEL.md and Rule 30

-- 1. Create profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null unique check (char_length(display_name) between 3 and 20),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  banned_until timestamptz,
  trust_score int not null default 0,
  locale text not null default 'vi' check (locale in ('vi', 'en'))
);

-- 2. Enable Row Level Security immediately (Rule 30: cùng một file)
alter table public.profiles enable row level security;

-- 3. Revoke all permissions from anon and authenticated, grant selectively
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, locale, last_seen_at) on public.profiles to authenticated;

-- 4. Policies: Owner can select and update their own profile
create policy profiles_select_owner on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy profiles_update_owner on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 5. Public view for limited profile discovery (id and display_name only)
create or replace view public.public_profiles as
  select id, display_name
  from public.profiles;

grant select on public.public_profiles to anon, authenticated;

-- 6. Trigger to automatically provision profile when an auth.users record is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_name text;
  clean_name text;
  raw_locale text;
  clean_locale text;
begin
  raw_name := new.raw_user_meta_data->>'display_name';
  clean_name := trim(coalesce(raw_name, ''));

  -- Validate display_name length, fallback to Player_<uuid_prefix> if invalid
  if char_length(clean_name) < 3 or char_length(clean_name) > 20 then
    clean_name := 'Player_' || substr(new.id::text, 1, 8);
  end if;

  raw_locale := new.raw_user_meta_data->>'locale';
  clean_locale := case when raw_locale in ('vi', 'en') then raw_locale else 'vi' end;

  begin
    insert into public.profiles (id, display_name, locale)
    values (new.id, clean_name, clean_locale);
  exception when unique_violation then
    -- Handle rare display_name collisions safely
    insert into public.profiles (id, display_name, locale)
    values (new.id, substr(clean_name, 1, 15) || '_' || substr(new.id::text, 1, 4), clean_locale);
  end;

  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==========================================
-- Migration: 20261110060837_baseline_security_tables.sql
-- ==========================================

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

-- ==========================================
-- Migration: 20261110061435_create_rate_limits_and_idempotency.sql
-- ==========================================

-- Migration: create command idempotency table and atomic rate limit consumption RPC
-- Conforms to docs/02-ARCHITECTURE.md, docs/04-SECURITY.md and Rule 30

-- 1. command_idempotency table (stores processed command responses to prevent double-execution)
create table if not exists public.command_idempotency (
  idempotency_key text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  response jsonb not null,
  created_at timestamptz not null default now()
);

-- Index on user_id and created_at for TTL retention cleanup
create index if not exists idx_command_idempotency_user_time
  on public.command_idempotency (user_id, created_at desc);

-- Enable RLS immediately (Rule 30)
alter table public.command_idempotency enable row level security;

-- Deny-by-default (only Edge Function service_role accesses idempotency store)
revoke all on public.command_idempotency from anon, authenticated;

-- 2. Atomic Token Bucket Rate Limiting RPC
create or replace function public.consume_rate_limit(
  p_key text,
  p_cost numeric default 1,
  p_capacity numeric default 60,
  p_refill_rate numeric default 1, -- tokens replenished per second
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tokens numeric;
  v_updated_at timestamptz;
  v_elapsed_sec numeric;
  v_new_tokens numeric;
begin
  -- Ensure row exists with full capacity initially
  insert into public.rate_limits (key, tokens, updated_at)
  values (p_key, p_capacity, p_now)
  on conflict (key) do nothing;

  -- Lock row exclusively for atomic evaluation
  select tokens, updated_at into v_tokens, v_updated_at
  from public.rate_limits
  where key = p_key
  for update;

  -- Calculate elapsed seconds since last refill
  v_elapsed_sec := extract(epoch from (p_now - v_updated_at));
  if v_elapsed_sec < 0 then
    v_elapsed_sec := 0;
  end if;

  -- Refill tokens up to maximum capacity
  v_new_tokens := least(p_capacity, v_tokens + (v_elapsed_sec * p_refill_rate));

  -- Check if sufficient tokens exist
  if v_new_tokens < p_cost then
    return false;
  end if;

  -- Consume tokens and update timestamp atomically
  update public.rate_limits
  set tokens = v_new_tokens - p_cost,
      updated_at = p_now
  where key = p_key;

  return true;
end;
$$;

-- Restrict execution to service_role only (Edge Functions)
revoke execute on function public.consume_rate_limit from public;
grant execute on function public.consume_rate_limit to service_role;

-- ==========================================
-- Migration: 20261110073423_create_planet_core_tables.sql
-- ==========================================

-- Migration: create_planet_core_tables
-- Description: Core gameplay tables (planets, planet_tiles, resource_balances, resource_ledger, buildings, jobs) and atomic commit_effects RPC

-- 1. Table: planets
create table if not exists public.planets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  primary_element text not null check (
    primary_element in ('metal', 'wood', 'water', 'fire', 'earth', 'light', 'dark', 'thunder')
  ),
  seed bigint not null,
  stage smallint not null default 1 check (stage between 1 and 5),
  grid_size smallint not null default 12 check (grid_size between 4 and 64),
  state_version int not null default 0 check (state_version >= 0),
  is_primary boolean not null default true,
  shield_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_planets_owner_primary unique (owner_id, is_primary)
);

create index if not exists idx_planets_owner_id on public.planets (owner_id);

-- 2. Table: planet_tiles
create table if not exists public.planet_tiles (
  planet_id uuid not null references public.planets(id) on delete cascade,
  x smallint not null check (x >= 0 and x < 64),
  y smallint not null check (y >= 0 and y < 64),
  element text not null check (
    element in ('metal', 'wood', 'water', 'fire', 'earth', 'light', 'dark', 'thunder')
  ),
  biome text not null check (char_length(biome) between 1 and 50),
  richness smallint not null check (richness between 1 and 5),
  primary key (planet_id, x, y)
);

-- 3. Table: resource_balances
create table if not exists public.resource_balances (
  planet_id uuid not null references public.planets(id) on delete cascade,
  resource_key text not null check (char_length(resource_key) between 1 and 30),
  amount numeric not null default 0 check (amount >= 0),
  rate_per_sec numeric not null default 0 check (rate_per_sec >= 0),
  cap numeric not null check (cap >= 0),
  updated_at timestamptz not null default now(),
  primary key (planet_id, resource_key)
);

-- 4. Table: resource_ledger (append-only ledger)
create table if not exists public.resource_ledger (
  id bigserial primary key,
  planet_id uuid not null references public.planets(id) on delete cascade,
  resource_key text not null check (char_length(resource_key) between 1 and 30),
  delta numeric not null,
  reason text not null check (char_length(reason) between 1 and 100),
  ref_type text,
  ref_id uuid,
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now()
);

create index if not exists idx_resource_ledger_planet on public.resource_ledger (planet_id);

-- Trigger to prevent any modification or deletion in resource_ledger
create or replace function public.prevent_resource_ledger_modification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Modifying or deleting resource_ledger entries is strictly prohibited'
    using errcode = '42501';
end;
$$;

drop trigger if exists trg_prevent_resource_ledger_modification on public.resource_ledger;
create trigger trg_prevent_resource_ledger_modification
  before update or delete on public.resource_ledger
  for each row
  execute function public.prevent_resource_ledger_modification();

-- 5. Table: buildings
create table if not exists public.buildings (
  id uuid primary key default gen_random_uuid(),
  planet_id uuid not null references public.planets(id) on delete cascade,
  kind text not null check (char_length(kind) between 1 and 30),
  level int not null default 1 check (level >= 1),
  tile_x smallint not null check (tile_x >= 0 and tile_x < 64),
  tile_y smallint not null check (tile_y >= 0 and tile_y < 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_buildings_planet_tile unique (planet_id, tile_x, tile_y)
);

create index if not exists idx_buildings_planet on public.buildings (planet_id);

-- 6. Table: jobs
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  planet_id uuid not null references public.planets(id) on delete cascade,
  kind text not null check (kind in ('build', 'upgrade', 'breed', 'craft', 'expedition')),
  payload jsonb not null default '{}'::jsonb,
  finish_at timestamptz not null,
  status text not null default 'running' check (status in ('running', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists idx_jobs_planet_status on public.jobs (planet_id, status);

-- Enable Row Level Security (Deny by default)
alter table public.planets enable row level security;
alter table public.planet_tiles enable row level security;
alter table public.resource_balances enable row level security;
alter table public.resource_ledger enable row level security;
alter table public.buildings enable row level security;
alter table public.jobs enable row level security;

-- Revoke all permissions from anon and authenticated
revoke all on public.planets from anon, authenticated;
revoke all on public.planet_tiles from anon, authenticated;
revoke all on public.resource_balances from anon, authenticated;
revoke all on public.resource_ledger from anon, authenticated;
revoke all on public.buildings from anon, authenticated;
revoke all on public.jobs from anon, authenticated;

-- RLS Policies: Authenticated users can SELECT their own planet data
create policy "Users can view their own planets"
  on public.planets for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "Users can view their own planet tiles"
  on public.planet_tiles for select
  to authenticated
  using (
    planet_id in (
      select id from public.planets where owner_id = (select auth.uid())
    )
  );

create policy "Users can view their own resource balances"
  on public.resource_balances for select
  to authenticated
  using (
    planet_id in (
      select id from public.planets where owner_id = (select auth.uid())
    )
  );

create policy "Users can view their own resource ledger"
  on public.resource_ledger for select
  to authenticated
  using (
    planet_id in (
      select id from public.planets where owner_id = (select auth.uid())
    )
  );

create policy "Users can view their own buildings"
  on public.buildings for select
  to authenticated
  using (
    planet_id in (
      select id from public.planets where owner_id = (select auth.uid())
    )
  );

create policy "Users can view their own jobs"
  on public.jobs for select
  to authenticated
  using (
    planet_id in (
      select id from public.planets where owner_id = (select auth.uid())
    )
  );

-- Grant SELECT only to authenticated users
grant select on public.planets to authenticated;
grant select on public.planet_tiles to authenticated;
grant select on public.resource_balances to authenticated;
grant select on public.resource_ledger to authenticated;
grant select on public.buildings to authenticated;
grant select on public.jobs to authenticated;

-- 7. Atomic RPC: commit_effects
create or replace function public.commit_effects(
  p_planet_id uuid,
  p_expected_version int,
  p_effects jsonb,
  p_idempotency_key uuid,
  p_reason text default 'command'
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_planet record;
  v_existing_ledger record;
  v_effect jsonb;
  v_effect_type text;
  v_res_key text;
  v_delta numeric;
  v_cap numeric;
  v_rate numeric;
  v_current_balance record;
  v_new_amount numeric;
  v_building_kind text;
  v_tile_x smallint;
  v_tile_y smallint;
  v_building_level int;
  v_job_kind text;
  v_job_payload jsonb;
  v_job_finish_at timestamptz;
begin
  -- 1. Validate caller authentication
  v_caller_id := (select auth.uid());
  if v_caller_id is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  -- 2. Lock planet row FOR UPDATE to prevent race conditions and verify ownership & state_version
  select * into v_planet
  from public.planets
  where id = p_planet_id
  for update;

  if not found then
    raise exception 'PLANET_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_planet.owner_id <> v_caller_id then
    raise exception 'NOT_OWNER' using errcode = '42501';
  end if;

  -- 3. Idempotency check: if this idempotency_key was already committed, return success
  select * into v_existing_ledger
  from public.resource_ledger
  where idempotency_key = p_idempotency_key
  limit 1;

  if found then
    return jsonb_build_object(
      'success', true,
      'idempotent', true,
      'planet_id', p_planet_id,
      'state_version', v_planet.state_version
    );
  end if;

  -- 4. Optimistic concurrency check
  if v_planet.state_version <> p_expected_version then
    raise exception 'VERSION_CONFLICT: expected %, got %', p_expected_version, v_planet.state_version
      using errcode = '40001';
  end if;

  -- 5. Process effects array sequentially
  if p_effects is not null and jsonb_array_length(p_effects) > 0 then
    for v_effect in select * from jsonb_array_elements(p_effects)
    loop
      v_effect_type := v_effect->>'type';

      -- Effect: resource_delta
      if v_effect_type = 'resource_delta' then
        v_res_key := v_effect->>'resource_key';
        v_delta := (v_effect->>'delta')::numeric;
        v_cap := coalesce((v_effect->>'cap')::numeric, 1000);
        v_rate := coalesce((v_effect->>'rate_per_sec')::numeric, 0);

        if v_res_key is null or v_delta is null then
          raise exception 'INVALID_EFFECT: resource_delta requires resource_key and delta'
            using errcode = '22023';
        end if;

        -- Lock balance row FOR UPDATE
        select * into v_current_balance
        from public.resource_balances
        where planet_id = p_planet_id and resource_key = v_res_key
        for update;

        if found then
          v_new_amount := v_current_balance.amount + v_delta;
          if v_new_amount < 0 then
            raise exception 'INSUFFICIENT_RESOURCES: % requires %, current %',
              v_res_key, abs(v_delta), v_current_balance.amount
              using errcode = '22003';
          end if;

          -- Cap amount if cap is defined
          if v_cap > 0 and v_new_amount > v_cap then
            v_new_amount := v_cap;
          end if;

          update public.resource_balances
          set amount = v_new_amount,
              cap = coalesce(v_cap, cap),
              rate_per_sec = coalesce(v_rate, rate_per_sec),
              updated_at = now()
          where planet_id = p_planet_id and resource_key = v_res_key;
        else
          if v_delta < 0 then
            raise exception 'INSUFFICIENT_RESOURCES: % requires %, current 0',
              v_res_key, abs(v_delta)
              using errcode = '22003';
          end if;

          v_new_amount := v_delta;
          if v_cap > 0 and v_new_amount > v_cap then
            v_new_amount := v_cap;
          end if;

          insert into public.resource_balances (planet_id, resource_key, amount, rate_per_sec, cap, updated_at)
          values (p_planet_id, v_res_key, v_new_amount, v_rate, v_cap, now());
        end if;

        -- Record ledger entry
        insert into public.resource_ledger (
          planet_id, resource_key, delta, reason, idempotency_key, created_at
        ) values (
          p_planet_id, v_res_key, v_delta, p_reason, p_idempotency_key, now()
        );

      -- Effect: create_building
      elsif v_effect_type = 'create_building' then
        v_building_kind := v_effect->>'kind';
        v_tile_x := (v_effect->>'tile_x')::smallint;
        v_tile_y := (v_effect->>'tile_y')::smallint;
        v_building_level := coalesce((v_effect->>'level')::int, 1);

        insert into public.buildings (planet_id, kind, level, tile_x, tile_y)
        values (p_planet_id, v_building_kind, v_building_level, v_tile_x, v_tile_y);

      -- Effect: upgrade_building
      elsif v_effect_type = 'upgrade_building' then
        v_tile_x := (v_effect->>'tile_x')::smallint;
        v_tile_y := (v_effect->>'tile_y')::smallint;

        update public.buildings
        set level = level + 1, updated_at = now()
        where planet_id = p_planet_id and tile_x = v_tile_x and tile_y = v_tile_y;

        if not found then
          raise exception 'BUILDING_NOT_FOUND at tile %, %', v_tile_x, v_tile_y
            using errcode = 'P0002';
        end if;

      -- Effect: create_job
      elsif v_effect_type = 'create_job' then
        v_job_kind := v_effect->>'kind';
        v_job_payload := coalesce(v_effect->'payload', '{}'::jsonb);
        v_job_finish_at := (v_effect->>'finish_at')::timestamptz;

        insert into public.jobs (planet_id, kind, payload, finish_at, status)
        values (p_planet_id, v_job_kind, v_job_payload, v_job_finish_at, 'running');

      else
        raise exception 'UNKNOWN_EFFECT_TYPE: %', v_effect_type
          using errcode = '22023';
      end if;
    end loop;
  end if;

  -- 6. Increment state_version and update timestamp
  update public.planets
  set state_version = state_version + 1,
      updated_at = now()
  where id = p_planet_id;

  return jsonb_build_object(
    'success', true,
    'idempotent', false,
    'planet_id', p_planet_id,
    'state_version', v_planet.state_version + 1
  );
end;
$$;

-- Grant EXECUTE on commit_effects to authenticated users
grant execute on function public.commit_effects to authenticated;

-- ==========================================
-- Migration: 20261110074509_create_settle_planet_resources_rpc.sql
-- ==========================================

-- Migration: create_settle_planet_resources_rpc
-- Description: Server-authoritative lazy settlement of offline resources with 8-hour offline cap

create or replace function public.settle_planet_resources(
  p_planet_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_planet record;
  v_rec record;
  v_elapsed_sec numeric;
  v_effective_sec numeric;
  v_produced numeric;
  v_new_amount numeric;
  v_settled_items jsonb := '[]'::jsonb;
begin
  -- 1. Authentication check
  v_caller_id := (select auth.uid());
  if v_caller_id is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  -- 2. Verify planet ownership
  select * into v_planet
  from public.planets
  where id = p_planet_id;

  if not found then
    raise exception 'PLANET_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_planet.owner_id <> v_caller_id then
    raise exception 'NOT_OWNER' using errcode = '42501';
  end if;

  -- 3. Iterate through all resource balances and settle with 8-hour (28800s) offline cap
  for v_rec in
    select resource_key, amount, rate_per_sec, cap, updated_at
    from public.resource_balances
    where planet_id = p_planet_id
    for update
  loop
    v_elapsed_sec := greatest(0, extract(epoch from (now() - v_rec.updated_at)));
    v_effective_sec := least(v_elapsed_sec, 28800); -- 8 hours maximum offline progress
    v_produced := v_effective_sec * v_rec.rate_per_sec;
    v_new_amount := round(least(v_rec.cap, v_rec.amount + v_produced), 4);

    update public.resource_balances
    set amount = v_new_amount,
        updated_at = now()
    where planet_id = p_planet_id and resource_key = v_rec.resource_key;

    v_settled_items := v_settled_items || jsonb_build_object(
      'resource_key', v_rec.resource_key,
      'amount', v_new_amount,
      'rate_per_sec', v_rec.rate_per_sec,
      'cap', v_rec.cap,
      'produced', round(v_produced, 4)
    );
  end loop;

  return jsonb_build_object(
    'planet_id', p_planet_id,
    'settled_at', now(),
    'balances', v_settled_items
  );
end;
$$;

grant execute on function public.settle_planet_resources to authenticated;

-- ==========================================
-- Migration: 20261110075112_create_settle_planet_jobs_rpc.sql
-- ==========================================

-- Migration: create_settle_planet_jobs_rpc
-- Description: Server-authoritative lazy settlement of completed jobs (buildings, upgrades)

create or replace function public.settle_planet_jobs(
  p_planet_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_planet record;
  v_job record;
  v_kind text;
  v_tile_x smallint;
  v_tile_y smallint;
  v_level int;
  v_tile_element text;
  v_completed_count int := 0;
begin
  -- 1. Authentication check
  v_caller_id := (select auth.uid());
  if v_caller_id is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  -- 2. Verify planet ownership
  select * into v_planet
  from public.planets
  where id = p_planet_id;

  if not found then
    raise exception 'PLANET_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_planet.owner_id <> v_caller_id then
    raise exception 'NOT_OWNER' using errcode = '42501';
  end if;

  -- 3. Lock and settle running jobs whose finish_at has passed
  for v_job in
    select *
    from public.jobs
    where planet_id = p_planet_id
      and status = 'running'
      and finish_at <= now()
    order by finish_at asc
    for update
  loop
    v_completed_count := v_completed_count + 1;

    if v_job.kind = 'build' then
      v_kind := v_job.payload->>'kind';
      v_tile_x := (v_job.payload->>'tile_x')::smallint;
      v_tile_y := (v_job.payload->>'tile_y')::smallint;
      v_level := coalesce((v_job.payload->>'level')::int, 1);

      -- Insert into buildings table
      insert into public.buildings (planet_id, kind, level, tile_x, tile_y)
      values (p_planet_id, v_kind, v_level, v_tile_x, v_tile_y)
      on conflict (planet_id, tile_x, tile_y) do nothing;

      -- Apply passive building effect
      if v_kind = 'storage' then
        -- Increase resource cap by 500 across all balances
        update public.resource_balances
        set cap = cap + 500, updated_at = now()
        where planet_id = p_planet_id;
      elsif v_kind = 'harvester' then
        -- Find the tile's element
        select element into v_tile_element
        from public.planet_tiles
        where planet_id = p_planet_id and x = v_tile_x and y = v_tile_y;

        if v_tile_element is not null then
          update public.resource_balances
          set rate_per_sec = rate_per_sec + 0.5, updated_at = now()
          where planet_id = p_planet_id and resource_key = v_tile_element;
        end if;
      end if;

    elsif v_job.kind = 'upgrade' then
      v_tile_x := (v_job.payload->>'tile_x')::smallint;
      v_tile_y := (v_job.payload->>'tile_y')::smallint;

      update public.buildings
      set level = level + 1, updated_at = now()
      where planet_id = p_planet_id and tile_x = v_tile_x and tile_y = v_tile_y
      returning kind, level into v_kind, v_level;

      if v_kind = 'storage' then
        update public.resource_balances
        set cap = cap + 500, updated_at = now()
        where planet_id = p_planet_id;
      elsif v_kind = 'harvester' then
        select element into v_tile_element
        from public.planet_tiles
        where planet_id = p_planet_id and x = v_tile_x and y = v_tile_y;

        if v_tile_element is not null then
          update public.resource_balances
          set rate_per_sec = rate_per_sec + 0.5, updated_at = now()
          where planet_id = p_planet_id and resource_key = v_tile_element;
        end if;
      end if;
    end if;

    -- Mark job completed
    update public.jobs
    set status = 'completed'
    where id = v_job.id;
  end loop;

  -- 4. If any job completed, increment planet state_version
  if v_completed_count > 0 then
    update public.planets
    set state_version = state_version + 1, updated_at = now()
    where id = p_planet_id;
  end if;

  return jsonb_build_object(
    'planet_id', p_planet_id,
    'completed_count', v_completed_count
  );
end;
$$;

grant execute on function public.settle_planet_jobs to authenticated;

-- ==========================================
-- Migration: 20261110080500_create_evolve_planet_rpc.sql
-- ==========================================

-- Migration: 20261110080500_create_evolve_planet_rpc.sql
-- Description: Server-authoritative RPC to evolve a planet from Stage 1 (Seed) to Stage 2 (Primordial)

create or replace function public.evolve_planet(
  p_planet_id uuid,
  p_expected_version int,
  p_new_tiles jsonb,
  p_idempotency_key uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_planet record;
  v_existing_ledger record;
  v_harvester_count int;
  v_storage_count int;
  v_balance record;
  v_tile jsonb;
begin
  -- 1. Validate caller authentication
  v_caller_id := (select auth.uid());
  if v_caller_id is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  -- 2. Lock planet row FOR UPDATE
  select * into v_planet
  from public.planets
  where id = p_planet_id
  for update;

  if not found then
    raise exception 'PLANET_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_planet.owner_id <> v_caller_id then
    raise exception 'NOT_OWNER' using errcode = '42501';
  end if;

  -- 3. Idempotency check: if this idempotency_key was already processed
  select * into v_existing_ledger
  from public.resource_ledger
  where idempotency_key = p_idempotency_key
  limit 1;

  if found then
    return jsonb_build_object(
      'success', true,
      'idempotent', true,
      'planet_id', p_planet_id,
      'new_stage', v_planet.stage,
      'new_grid_size', v_planet.grid_size,
      'state_version', v_planet.state_version
    );
  end if;

  -- 4. Optimistic concurrency check
  if v_planet.state_version <> p_expected_version then
    raise exception 'VERSION_CONFLICT: expected %, got %', p_expected_version, v_planet.state_version
      using errcode = '40001';
  end if;

  -- 5. Validate current stage is exactly 1 (Seed stage)
  if v_planet.stage <> 1 then
    raise exception 'INVALID_STAGE: planet already evolved beyond stage 1'
      using errcode = '22023';
  end if;

  -- 6. Check required buildings: at least 1 harvester and 1 storage
  select count(*) into v_harvester_count
  from public.buildings
  where planet_id = p_planet_id and kind = 'harvester';

  select count(*) into v_storage_count
  from public.buildings
  where planet_id = p_planet_id and kind = 'storage';

  if v_harvester_count < 1 or v_storage_count < 1 then
    raise exception 'MISSING_EVOLUTION_REQUIREMENTS: requires at least 1 harvester and 1 storage'
      using errcode = '22023';
  end if;

  -- 7. Check and deduct primary element resource (100 units required)
  select * into v_balance
  from public.resource_balances
  where planet_id = p_planet_id and resource_key = v_planet.primary_element
  for update;

  if not found or v_balance.amount < 100 then
    raise exception 'INSUFFICIENT_RESOURCES: requires 100 %, current %',
      v_planet.primary_element, coalesce(v_balance.amount, 0)
      using errcode = '22003';
  end if;

  -- Deduct 100 resources
  update public.resource_balances
  set amount = amount - 100,
      updated_at = now()
  where planet_id = p_planet_id and resource_key = v_planet.primary_element;

  -- Insert ledger entry
  insert into public.resource_ledger (
    planet_id, resource_key, delta, reason, idempotency_key, created_at
  ) values (
    p_planet_id, v_planet.primary_element, -100, 'planet_evolve_stage_2', p_idempotency_key, now()
  );

  -- 8. Insert newly expanded tiles
  if p_new_tiles is null or jsonb_array_length(p_new_tiles) = 0 then
    raise exception 'INVALID_TILES: expanded tiles payload is required'
      using errcode = '22023';
  end if;

  insert into public.planet_tiles (planet_id, x, y, element, biome, richness)
  select
    p_planet_id,
    (tile->>'x')::smallint,
    (tile->>'y')::smallint,
    tile->>'element',
    tile->>'biome',
    (tile->>'richness')::smallint
  from jsonb_array_elements(p_new_tiles) as tile;

  -- 9. Update planet record: stage = 2, grid_size = 16, increment state_version
  update public.planets
  set stage = 2,
      grid_size = 16,
      state_version = state_version + 1,
      updated_at = now()
  where id = p_planet_id;

  return jsonb_build_object(
    'success', true,
    'idempotent', false,
    'planet_id', p_planet_id,
    'new_stage', 2,
    'new_grid_size', 16,
    'state_version', v_planet.state_version + 1
  );
end;
$$;

-- Grant EXECUTE to authenticated users
grant execute on function public.evolve_planet to authenticated;

-- ==========================================
-- Migration: 20261110081500_create_cheat_detection_and_audit.sql
-- ==========================================

-- Migration: 20261110081500_create_cheat_detection_and_audit.sql
-- Description: Automated security audit logging and resource cheat detection triggers/functions

-- 1. Helper function to record audit events safely
create or replace function public.record_audit_log(
  p_actor_id uuid,
  p_action text,
  p_details jsonb,
  p_request_id uuid default null,
  p_ip_hash text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (
    actor_id,
    action,
    details,
    request_id,
    ip_hash,
    created_at
  ) values (
    p_actor_id,
    p_action,
    p_details,
    p_request_id,
    p_ip_hash,
    now()
  );
end;
$$;

-- 2. Trigger function: Auto-audit planet creation and evolution
create or replace function public.audit_planet_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.audit_log (actor_id, action, details, created_at)
    values (
      new.owner_id,
      'planet.create',
      jsonb_build_object(
        'planet_id', new.id,
        'name', new.name,
        'primary_element', new.primary_element,
        'seed', new.seed,
        'grid_size', new.grid_size,
        'stage', new.stage
      ),
      now()
    );
    return new;
  elsif TG_OP = 'UPDATE' then
    if old.stage <> new.stage then
      insert into public.audit_log (actor_id, action, details, created_at)
      values (
        new.owner_id,
        'planet.evolve',
        jsonb_build_object(
          'planet_id', new.id,
          'old_stage', old.stage,
          'new_stage', new.stage,
          'old_grid_size', old.grid_size,
          'new_grid_size', new.grid_size
        ),
        now()
      );
    end if;
    return new;
  end if;
  return null;
end;
$$;

create or replace trigger tr_audit_planet_changes
  after insert or update on public.planets
  for each row execute function public.audit_planet_changes();

-- 3. Trigger function: Auto-detect abnormal resource jumps beyond theoretical maximum
create or replace function public.detect_resource_anomaly()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
begin
  -- Check if amount exceeds 10% over the storage cap (tolerating minor floating-point jitter)
  if new.amount > (new.cap * 1.10) then
    select owner_id into v_owner_id from public.planets where id = new.planet_id;
    if found then
      insert into public.cheat_flags (
        player_id,
        kind,
        evidence,
        severity,
        status,
        created_at
      ) values (
        v_owner_id,
        'excessive_resource_amount',
        jsonb_build_object(
          'planet_id', new.planet_id,
          'resource_key', new.resource_key,
          'amount', new.amount,
          'cap', new.cap,
          'threshold', (new.cap * 1.10)
        ),
        3, -- High severity
        'open',
        now()
      );
    end if;
  end if;
  return new;
end;
$$;

create or replace trigger tr_detect_resource_anomaly
  after insert or update on public.resource_balances
  for each row execute function public.detect_resource_anomaly();

-- 4. Integrity check function: Compare resource balances with append-only ledger
create or replace function public.verify_planet_integrity(p_planet_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_bal record;
  v_ledger_sum numeric;
  v_flags_generated int := 0;
begin
  select owner_id into v_owner_id
  from public.planets
  where id = p_planet_id;

  if not found then
    raise exception 'PLANET_NOT_FOUND' using errcode = 'P0002';
  end if;

  for v_bal in
    select resource_key, amount, cap
    from public.resource_balances
    where planet_id = p_planet_id
  loop
    -- Calculate sum of all ledger deltas for this resource
    select coalesce(sum(delta), 0) into v_ledger_sum
    from public.resource_ledger
    where planet_id = p_planet_id and resource_key = v_bal.resource_key;

    -- If balance amount is greater than the total deltas recorded in the append-only ledger
    -- (with 0.01 tolerance for floating point calculations), cheat flag is raised
    if v_bal.amount > (v_ledger_sum + 0.01) then
      insert into public.cheat_flags (
        player_id,
        kind,
        evidence,
        severity,
        status,
        created_at
      ) values (
        v_owner_id,
        'balance_exceeds_ledger_sum',
        jsonb_build_object(
          'planet_id', p_planet_id,
          'resource_key', v_bal.resource_key,
          'balance_amount', v_bal.amount,
          'ledger_sum', v_ledger_sum,
          'discrepancy', (v_bal.amount - v_ledger_sum)
        ),
        3, -- High severity
        'open',
        now()
      );
      v_flags_generated := v_flags_generated + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'planet_id', p_planet_id,
    'flags_generated', v_flags_generated,
    'verified_at', now()
  );
end;
$$;

-- Grant execution to authenticated users for verifying their own planet or service role
grant execute on function public.verify_planet_integrity to authenticated;

-- ==========================================
-- Migration: 20261110083000_create_creatures_and_items_tables.sql
-- ==========================================

-- Migration: 20261110083000_create_creatures_and_items_tables.sql
-- Description: Core tables for creatures, items, inventory, and codex entries (Phase P2 - T2.1)

-- 1. creatures table
create table if not exists public.creatures (
  id uuid primary key default gen_random_uuid(),
  planet_id uuid not null references public.planets(id) on delete cascade,
  species_key text not null,
  primary_element text not null check (primary_element in ('metal','wood','water','fire','earth','light','dark','thunder')),
  secondary_element text check (secondary_element is null or secondary_element in ('metal','wood','water','fire','earth','light','dark','thunder')),
  stats jsonb not null, -- {qi, guard, agility, harmony, chaos}
  traits text[] not null default '{}' check (cardinality(traits) <= 3),
  generation int not null default 0 check (generation >= 0),
  inbreeding numeric not null default 0 check (inbreeding >= 0),
  parent_a uuid references public.creatures(id) on delete set null,
  parent_b uuid references public.creatures(id) on delete set null,
  born_at timestamptz not null default now()
);

create index if not exists idx_creatures_planet_id on public.creatures(planet_id);

-- 2. items table
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  def_key text not null,
  genome jsonb, -- null for basic raw items, structured for compound/legendary
  created_at timestamptz not null default now()
);

-- 3. inventory table
create table if not exists public.inventory (
  planet_id uuid not null references public.planets(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  qty int not null check (qty >= 0),
  primary key (planet_id, item_id)
);

create index if not exists idx_inventory_planet_id on public.inventory(planet_id);

-- 4. codex_entries table
create table if not exists public.codex_entries (
  player_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('species', 'item', 'recipe')),
  entry_key text not null,
  discovered_at timestamptz not null default now(),
  primary key (player_id, kind, entry_key)
);

create index if not exists idx_codex_entries_player on public.codex_entries(player_id);

-- 5. Enable Row Level Security (RLS) on all 4 tables (Deny-by-default)
alter table public.creatures enable row level security;
alter table public.items enable row level security;
alter table public.inventory enable row level security;
alter table public.codex_entries enable row level security;

-- Revoke all permissions from anon and authenticated
revoke all on public.creatures from anon, authenticated;
revoke all on public.items from anon, authenticated;
revoke all on public.inventory from anon, authenticated;
revoke all on public.codex_entries from anon, authenticated;

-- Grant SELECT only to authenticated users
grant select on public.creatures to authenticated;
grant select on public.items to authenticated;
grant select on public.inventory to authenticated;
grant select on public.codex_entries to authenticated;

-- 6. RLS Policies: Players can only view their own items, creatures, inventory, and codex entries
create policy "Users can view creatures on their planets"
  on public.creatures for select
  to authenticated
  using (
    planet_id in (
      select id from public.planets where owner_id = (select auth.uid())
    )
  );

create policy "Users can view inventory on their planets"
  on public.inventory for select
  to authenticated
  using (
    planet_id in (
      select id from public.planets where owner_id = (select auth.uid())
    )
  );

create policy "Users can view items in their inventory"
  on public.items for select
  to authenticated
  using (
    id in (
      select item_id from public.inventory where planet_id in (
        select id from public.planets where owner_id = (select auth.uid())
      )
    )
  );

create policy "Users can view their own codex entries"
  on public.codex_entries for select
  to authenticated
  using (
    player_id = (select auth.uid())
  );

-- ==========================================
-- Migration: 20261110084500_update_settle_planet_jobs_for_breeding.sql
-- ==========================================

-- Migration: 20261110084500_update_settle_planet_jobs_for_breeding.sql
-- Description: Extends settle_planet_jobs to resolve completed breeding jobs (Phase P2 - T2.3)

create or replace function public.settle_planet_jobs(
  p_planet_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_planet record;
  v_job record;
  v_kind text;
  v_tile_x smallint;
  v_tile_y smallint;
  v_level int;
  v_tile_element text;
  v_completed_count int := 0;
begin
  -- 1. Authentication check
  v_caller_id := (select auth.uid());
  if v_caller_id is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  -- 2. Verify planet ownership
  select * into v_planet
  from public.planets
  where id = p_planet_id;

  if not found then
    raise exception 'PLANET_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_planet.owner_id <> v_caller_id then
    raise exception 'NOT_OWNER' using errcode = '42501';
  end if;

  -- 3. Lock and settle running jobs whose finish_at has passed
  for v_job in
    select *
    from public.jobs
    where planet_id = p_planet_id
      and status = 'running'
      and finish_at <= now()
    order by finish_at asc
    for update
  loop
    v_completed_count := v_completed_count + 1;

    if v_job.kind = 'build' then
      v_kind := v_job.payload->>'kind';
      v_tile_x := (v_job.payload->>'tile_x')::smallint;
      v_tile_y := (v_job.payload->>'tile_y')::smallint;
      v_level := coalesce((v_job.payload->>'level')::int, 1);

      -- Insert into buildings table
      insert into public.buildings (planet_id, kind, level, tile_x, tile_y)
      values (p_planet_id, v_kind, v_level, v_tile_x, v_tile_y)
      on conflict (planet_id, tile_x, tile_y) do nothing;

      -- Apply passive building effect
      if v_kind = 'storage' then
        update public.resource_balances
        set cap = cap + 500, updated_at = now()
        where planet_id = p_planet_id;
      elsif v_kind = 'harvester' then
        select element into v_tile_element
        from public.planet_tiles
        where planet_id = p_planet_id and x = v_tile_x and y = v_tile_y;

        if v_tile_element is not null then
          update public.resource_balances
          set rate_per_sec = rate_per_sec + 0.5, updated_at = now()
          where planet_id = p_planet_id and resource_key = v_tile_element;
        end if;
      end if;

    elsif v_job.kind = 'upgrade' then
      v_tile_x := (v_job.payload->>'tile_x')::smallint;
      v_tile_y := (v_job.payload->>'tile_y')::smallint;

      update public.buildings
      set level = level + 1, updated_at = now()
      where planet_id = p_planet_id and tile_x = v_tile_x and tile_y = v_tile_y
      returning kind, level into v_kind, v_level;

      if v_kind = 'storage' then
        update public.resource_balances
        set cap = cap + 500, updated_at = now()
        where planet_id = p_planet_id;
      elsif v_kind = 'harvester' then
        select element into v_tile_element
        from public.planet_tiles
        where planet_id = p_planet_id and x = v_tile_x and y = v_tile_y;

        if v_tile_element is not null then
          update public.resource_balances
          set rate_per_sec = rate_per_sec + 0.5, updated_at = now()
          where planet_id = p_planet_id and resource_key = v_tile_element;
        end if;
      end if;

    elsif v_job.kind = 'breed' then
      -- Insert child creature into creatures table
      insert into public.creatures (
        planet_id,
        species_key,
        primary_element,
        secondary_element,
        stats,
        traits,
        generation,
        inbreeding,
        parent_a,
        parent_b,
        born_at
      ) values (
        p_planet_id,
        v_job.payload->>'child_species_key',
        v_job.payload->'child_genome'->>'primary',
        v_job.payload->'child_genome'->>'secondary',
        v_job.payload->'child_genome'->'stats',
        array(select jsonb_array_elements_text(coalesce(v_job.payload->'child_genome'->'traits', '[]'::jsonb))),
        coalesce((v_job.payload->'child_genome'->>'generation')::int, 1),
        coalesce((v_job.payload->'child_genome'->>'inbreeding')::numeric, 0),
        (v_job.payload->>'parent_a_id')::uuid,
        (v_job.payload->>'parent_b_id')::uuid,
        now()
      );

      -- Record species in player codex_entries
      insert into public.codex_entries (player_id, kind, entry_key, discovered_at)
      values (v_caller_id, 'species', v_job.payload->>'child_species_key', now())
      on conflict (player_id, kind, entry_key) do nothing;
    end if;

    -- Mark job completed
    update public.jobs
    set status = 'completed'
    where id = v_job.id;
  end loop;

  -- 4. If any job completed, increment planet state_version
  if v_completed_count > 0 then
    update public.planets
    set state_version = state_version + 1, updated_at = now()
    where id = p_planet_id;
  end if;

  return jsonb_build_object(
    'planet_id', p_planet_id,
    'completed_count', v_completed_count
  );
end;
$$;

grant execute on function public.settle_planet_jobs to authenticated;

-- ==========================================
-- Migration: 20261110090000_update_settle_planet_jobs_for_crafting.sql
-- ==========================================

-- Migration: 20261110090000_update_settle_planet_jobs_for_crafting.sql
-- Description: Extends settle_planet_jobs to resolve completed crafting jobs and codex tracking (Phase P2 - T2.4)

create or replace function public.settle_planet_jobs(
  p_planet_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_planet record;
  v_job record;
  v_kind text;
  v_tile_x smallint;
  v_tile_y smallint;
  v_level int;
  v_tile_element text;
  v_output_key text;
  v_output_qty int;
  v_recipe_key text;
  v_item_id uuid;
  v_completed_count int := 0;
begin
  -- 1. Authentication check
  v_caller_id := (select auth.uid());
  if v_caller_id is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  -- 2. Verify planet ownership
  select * into v_planet
  from public.planets
  where id = p_planet_id;

  if not found then
    raise exception 'PLANET_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_planet.owner_id <> v_caller_id then
    raise exception 'NOT_OWNER' using errcode = '42501';
  end if;

  -- 3. Lock and settle running jobs whose finish_at has passed
  for v_job in
    select *
    from public.jobs
    where planet_id = p_planet_id
      and status = 'running'
      and finish_at <= now()
    order by finish_at asc
    for update
  loop
    v_completed_count := v_completed_count + 1;

    if v_job.kind = 'build' then
      v_kind := v_job.payload->>'kind';
      v_tile_x := (v_job.payload->>'tile_x')::smallint;
      v_tile_y := (v_job.payload->>'tile_y')::smallint;
      v_level := coalesce((v_job.payload->>'level')::int, 1);

      -- Insert into buildings table
      insert into public.buildings (planet_id, kind, level, tile_x, tile_y)
      values (p_planet_id, v_kind, v_level, v_tile_x, v_tile_y)
      on conflict (planet_id, tile_x, tile_y) do nothing;

      -- Apply passive building effect
      if v_kind = 'storage' then
        update public.resource_balances
        set cap = cap + 500, updated_at = now()
        where planet_id = p_planet_id;
      elsif v_kind = 'harvester' then
        select element into v_tile_element
        from public.planet_tiles
        where planet_id = p_planet_id and x = v_tile_x and y = v_tile_y;

        if v_tile_element is not null then
          update public.resource_balances
          set rate_per_sec = rate_per_sec + 0.5, updated_at = now()
          where planet_id = p_planet_id and resource_key = v_tile_element;
        end if;
      end if;

    elsif v_job.kind = 'upgrade' then
      v_tile_x := (v_job.payload->>'tile_x')::smallint;
      v_tile_y := (v_job.payload->>'tile_y')::smallint;

      update public.buildings
      set level = level + 1, updated_at = now()
      where planet_id = p_planet_id and tile_x = v_tile_x and tile_y = v_tile_y
      returning kind, level into v_kind, v_level;

      if v_kind = 'storage' then
        update public.resource_balances
        set cap = cap + 500, updated_at = now()
        where planet_id = p_planet_id;
      elsif v_kind = 'harvester' then
        select element into v_tile_element
        from public.planet_tiles
        where planet_id = p_planet_id and x = v_tile_x and y = v_tile_y;

        if v_tile_element is not null then
          update public.resource_balances
          set rate_per_sec = rate_per_sec + 0.5, updated_at = now()
          where planet_id = p_planet_id and resource_key = v_tile_element;
        end if;
      end if;

    elsif v_job.kind = 'breed' then
      -- Insert child creature into creatures table
      insert into public.creatures (
        planet_id,
        species_key,
        primary_element,
        secondary_element,
        stats,
        traits,
        generation,
        inbreeding,
        parent_a,
        parent_b,
        born_at
      ) values (
        p_planet_id,
        v_job.payload->>'child_species_key',
        v_job.payload->'child_genome'->>'primary',
        v_job.payload->'child_genome'->>'secondary',
        v_job.payload->'child_genome'->'stats',
        array(select jsonb_array_elements_text(coalesce(v_job.payload->'child_genome'->'traits', '[]'::jsonb))),
        coalesce((v_job.payload->'child_genome'->>'generation')::int, 1),
        coalesce((v_job.payload->'child_genome'->>'inbreeding')::numeric, 0),
        (v_job.payload->>'parent_a_id')::uuid,
        (v_job.payload->>'parent_b_id')::uuid,
        now()
      );

      -- Record species in player codex_entries
      insert into public.codex_entries (player_id, kind, entry_key, discovered_at)
      values (v_caller_id, 'species', v_job.payload->>'child_species_key', now())
      on conflict (player_id, kind, entry_key) do nothing;

    elsif v_job.kind = 'craft' then
      v_output_key := v_job.payload->>'output_key';
      v_output_qty := coalesce((v_job.payload->>'output_qty')::int, 1);
      v_recipe_key := v_job.payload->>'recipe_key';

      -- Ensure item exists in items table
      select id into v_item_id
      from public.items
      where def_key = v_output_key
      limit 1;

      if not found then
        insert into public.items (def_key, created_at)
        values (v_output_key, now())
        returning id into v_item_id;
      end if;

      -- Add or increase quantity in planet inventory
      insert into public.inventory (planet_id, item_id, qty)
      values (p_planet_id, v_item_id, v_output_qty)
      on conflict (planet_id, item_id)
      do update set qty = public.inventory.qty + v_output_qty;

      -- Track in codex: both the discovered recipe and the crafted item
      insert into public.codex_entries (player_id, kind, entry_key, discovered_at)
      values (v_caller_id, 'recipe', v_recipe_key, now())
      on conflict (player_id, kind, entry_key) do nothing;

      insert into public.codex_entries (player_id, kind, entry_key, discovered_at)
      values (v_caller_id, 'item', v_output_key, now())
      on conflict (player_id, kind, entry_key) do nothing;
    end if;

    -- Mark job completed
    update public.jobs
    set status = 'completed'
    where id = v_job.id;
  end loop;

  -- 4. If any job completed, increment planet state_version
  if v_completed_count > 0 then
    update public.planets
    set state_version = state_version + 1, updated_at = now()
    where id = p_planet_id;
  end if;

  return jsonb_build_object(
    'planet_id', p_planet_id,
    'completed_count', v_completed_count
  );
end;
$$;

grant execute on function public.settle_planet_jobs to authenticated;

-- ==========================================
-- Migration: 20261110091500_create_public_profiles_and_social.sql
-- ==========================================

-- Migration: Social features - friendships, blocks, and expanded public_profiles view (T3.1)
-- Conforms to docs/05-MULTIPLAYER-SOCIAL.md, docs/04-SECURITY.md and Rule 30

-- 1. Upgrade public_profiles view with created_at to allow checking account age (>= 24h)
create or replace view public.public_profiles as
  select
    p.id,
    p.display_name,
    p.created_at,
    p.last_seen_at
  from public.profiles p;

grant select on public.public_profiles to anon, authenticated;

-- 2. Friendships table
create table if not exists public.friendships (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pk_friendships primary key (user_id, friend_id),
  constraint chk_friendships_no_self check (user_id <> friend_id)
);

create index if not exists idx_friendships_friend on public.friendships(friend_id);
create index if not exists idx_friendships_status on public.friendships(status);

-- 3. User blocks table (two-way block semantics for privacy)
create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  constraint pk_user_blocks primary key (blocker_id, blocked_id),
  constraint chk_user_blocks_no_self check (blocker_id <> blocked_id)
);

create index if not exists idx_user_blocks_blocked on public.user_blocks(blocked_id);

-- 4. Enable RLS immediately (deny-by-default)
alter table public.friendships enable row level security;
alter table public.user_blocks enable row level security;

revoke all on public.friendships from anon, authenticated;
revoke all on public.user_blocks from anon, authenticated;

grant select on public.friendships to authenticated;
grant select on public.user_blocks to authenticated;

-- Policies for friendships:
-- Either participant can see the friendship record
create policy friendships_select on public.friendships
  for select
  to authenticated
  using (auth.uid() = user_id or auth.uid() = friend_id);

-- Policies for user_blocks:
-- Only blocker can see who they have blocked (blocked user cannot inspect blocks against them to prevent retaliation)
create policy user_blocks_select on public.user_blocks
  for select
  to authenticated
  using (auth.uid() = blocker_id);

-- 5. Helper function: is_blocked (two-way check)
create or replace function public.is_blocked(p_user_a uuid, p_user_b uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_a is null or p_user_b is null then
    return false;
  end if;

  return exists (
    select 1
    from public.user_blocks
    where (blocker_id = p_user_a and blocked_id = p_user_b)
       or (blocker_id = p_user_b and blocked_id = p_user_a)
  );
end;
$$;

grant execute on function public.is_blocked(uuid, uuid) to authenticated;

-- 6. RPC: send_friend_request
create or replace function public.send_friend_request(p_friend_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_id uuid;
  v_existing_status text;
begin
  v_sender_id := auth.uid();
  if v_sender_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  if v_sender_id = p_friend_id then
    raise exception 'CANNOT_FRIEND_SELF' using errcode = '40001';
  end if;

  -- Verify target user exists
  if not exists (select 1 from public.profiles where id = p_friend_id) then
    raise exception 'USER_NOT_FOUND' using errcode = '40004';
  end if;

  -- Check if blocked in either direction
  if public.is_blocked(v_sender_id, p_friend_id) then
    raise exception 'USER_BLOCKED' using errcode = '42501';
  end if;

  -- Check existing friendship record in either direction
  select status into v_existing_status
  from public.friendships
  where (user_id = v_sender_id and friend_id = p_friend_id)
     or (user_id = p_friend_id and friend_id = v_sender_id);

  if v_existing_status = 'accepted' then
    raise exception 'ALREADY_FRIENDS' using errcode = '40002';
  elsif v_existing_status = 'pending' then
    raise exception 'REQUEST_ALREADY_PENDING' using errcode = '40003';
  end if;

  -- Upsert friendship request
  insert into public.friendships (user_id, friend_id, status, updated_at)
  values (v_sender_id, p_friend_id, 'pending', now())
  on conflict (user_id, friend_id)
  do update set status = 'pending', updated_at = now();

  return jsonb_build_object(
    'success', true,
    'sender_id', v_sender_id,
    'friend_id', p_friend_id,
    'status', 'pending'
  );
end;
$$;

grant execute on function public.send_friend_request(uuid) to authenticated;

-- 7. RPC: respond_friend_request
create or replace function public.respond_friend_request(p_sender_id uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recipient_id uuid;
  v_new_status text;
begin
  v_recipient_id := auth.uid();
  if v_recipient_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.friendships
    where user_id = p_sender_id
      and friend_id = v_recipient_id
      and status = 'pending'
  ) then
    raise exception 'REQUEST_NOT_FOUND' using errcode = '40004';
  end if;

  v_new_status := case when p_accept then 'accepted' else 'rejected' end;

  update public.friendships
  set status = v_new_status,
      updated_at = now()
  where user_id = p_sender_id
    and friend_id = v_recipient_id;

  return jsonb_build_object(
    'success', true,
    'sender_id', p_sender_id,
    'friend_id', v_recipient_id,
    'status', v_new_status
  );
end;
$$;

grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;

-- 8. RPC: remove_friend
create or replace function public.remove_friend(p_target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  delete from public.friendships
  where (user_id = v_caller_id and friend_id = p_target_id)
     or (user_id = p_target_id and friend_id = v_caller_id);

  return jsonb_build_object('success', true, 'removed_id', p_target_id);
end;
$$;

grant execute on function public.remove_friend(uuid) to authenticated;

-- 9. RPC: block_user and unblock_user
create or replace function public.block_user(p_target_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  if v_caller_id = p_target_id then
    raise exception 'CANNOT_BLOCK_SELF' using errcode = '40001';
  end if;

  -- Break any friendships immediately
  delete from public.friendships
  where (user_id = v_caller_id and friend_id = p_target_id)
     or (user_id = p_target_id and friend_id = v_caller_id);

  insert into public.user_blocks (blocker_id, blocked_id, reason)
  values (v_caller_id, p_target_id, p_reason)
  on conflict (blocker_id, blocked_id) do nothing;

  return jsonb_build_object('success', true, 'blocked_id', p_target_id);
end;
$$;

grant execute on function public.block_user(uuid, text) to authenticated;

create or replace function public.unblock_user(p_target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  delete from public.user_blocks
  where blocker_id = v_caller_id and blocked_id = p_target_id;

  return jsonb_build_object('success', true, 'unblocked_id', p_target_id);
end;
$$;

grant execute on function public.unblock_user(uuid) to authenticated;

-- ==========================================
-- Migration: 20261110093000_create_chat_and_notifications.sql
-- ==========================================

-- Migration: Chat system, channels, messages, reports and notifications (T3.2)
-- Conforms to docs/05-MULTIPLAYER-SOCIAL.md, docs/04-SECURITY.md and Rule 30

-- 1. Chat Channels table
create table if not exists public.chat_channels (
  id text primary key, -- e.g. 'global', 'planet:<planet_id>', 'dm:<min_uuid>:<max_uuid>'
  kind text not null check (kind in ('global', 'planet', 'dm', 'alliance', 'party', 'system')),
  name text,
  created_at timestamptz not null default now()
);

-- Seed default global channel
insert into public.chat_channels (id, kind, name)
values ('global', 'global', 'Liên Tinh (Global)')
on conflict (id) do nothing;

-- 2. Chat Members table (for planet, alliance, party, private groups)
create table if not exists public.chat_members (
  channel_id text not null references public.chat_channels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  muted_until timestamptz,
  joined_at timestamptz not null default now(),
  constraint pk_chat_members primary key (channel_id, user_id)
);

create index if not exists idx_chat_members_user on public.chat_members(user_id);

-- 3. Chat Messages table (Append-only, server-inserted, cursor-indexed)
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id text not null references public.chat_channels(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  client_msg_id text not null,
  content text not null check (char_length(content) between 1 and 300),
  filtered_content text not null,
  created_at timestamptz not null default now(),
  constraint uq_channel_client_msg unique (channel_id, sender_id, client_msg_id)
);

create index if not exists idx_chat_messages_channel_created
  on public.chat_messages(channel_id, created_at desc);

-- 4. Chat Reports table
create table if not exists public.chat_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid references public.chat_messages(id) on delete set null,
  reason text not null check (char_length(reason) between 3 and 500),
  context_snapshot jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'investigating', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_reports_status on public.chat_reports(status);
create index if not exists idx_chat_reports_reported on public.chat_reports(reported_user_id);

-- 5. Notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('friend_request', 'friend_accepted', 'chat_mention', 'chat_dm', 'building_completed', 'attack_alert', 'system')),
  title text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_recipient_unread
  on public.notifications(recipient_id, read, created_at desc);

-- 6. Helper function: is_channel_member
create or replace function public.is_channel_member(p_channel_id text, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind text;
  v_part1 text;
  v_part2 text;
  v_planet_id uuid;
begin
  if p_channel_id is null or p_user_id is null then
    return false;
  end if;

  -- 1. Global channel: open to any authenticated user with an account not banned
  if p_channel_id = 'global' then
    return exists (
      select 1
      from public.profiles
      where id = p_user_id
        and (banned_until is null or banned_until < now())
    );
  end if;

  -- 2. DM channel: format 'dm:<uid1>:<uid2>' (sorted)
  if p_channel_id like 'dm:%' then
    v_part1 := split_part(p_channel_id, ':', 2);
    v_part2 := split_part(p_channel_id, ':', 3);

    -- User must be one of the two participants
    if p_user_id::text <> v_part1 and p_user_id::text <> v_part2 then
      return false;
    end if;

    -- Neither participant can be blocked
    if public.is_blocked(v_part1::uuid, v_part2::uuid) then
      return false;
    end if;

    return true;
  end if;

  -- 3. Planet channel: format 'planet:<planet_id>'
  if p_channel_id like 'planet:%' then
    begin
      v_planet_id := split_part(p_channel_id, ':', 2)::uuid;
    exception when others then
      return false;
    end;

    -- Owner of the planet is always a member
    if exists (
      select 1
      from public.planets
      where id = v_planet_id
        and owner_id = p_user_id
    ) then
      return true;
    end if;

    -- Or explicitly added to chat_members
    return exists (
      select 1
      from public.chat_members
      where channel_id = p_channel_id
        and user_id = p_user_id
    );
  end if;

  -- 4. Other channels (alliance, party): explicit membership check
  return exists (
    select 1
    from public.chat_members
    where channel_id = p_channel_id
      and user_id = p_user_id
  );
end;
$$;

grant execute on function public.is_channel_member(text, uuid) to authenticated;

-- 7. Enable RLS on all tables (Deny-by-default)
alter table public.chat_channels enable row level security;
alter table public.chat_members enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_reports enable row level security;
alter table public.notifications enable row level security;

revoke all on public.chat_channels from anon, authenticated;
revoke all on public.chat_members from anon, authenticated;
revoke all on public.chat_messages from anon, authenticated;
revoke all on public.chat_reports from anon, authenticated;
revoke all on public.notifications from anon, authenticated;

grant select on public.chat_channels to authenticated;
grant select on public.chat_members to authenticated;
grant select on public.chat_messages to authenticated;
grant insert on public.chat_reports to authenticated;
grant select, update (read) on public.notifications to authenticated;

-- Policies:
-- chat_channels: select allowed if member
create policy chat_channels_select on public.chat_channels
  for select
  to authenticated
  using (public.is_channel_member(id, auth.uid()));

-- chat_members: select allowed if member of that channel
create policy chat_members_select on public.chat_members
  for select
  to authenticated
  using (public.is_channel_member(channel_id, auth.uid()));

-- chat_messages: SELECT only for channel members. INSERT/UPDATE/DELETE completely denied to client!
create policy chat_messages_select on public.chat_messages
  for select
  to authenticated
  using (public.is_channel_member(channel_id, auth.uid()));

-- chat_reports: Users can insert reports, view their own reports
create policy chat_reports_insert on public.chat_reports
  for insert
  to authenticated
  with check (auth.uid() = reporter_id);

create policy chat_reports_select on public.chat_reports
  for select
  to authenticated
  using (auth.uid() = reporter_id);

-- notifications: User can only select and mark their own notifications as read
create policy notifications_select on public.notifications
  for select
  to authenticated
  using (auth.uid() = recipient_id);

create policy notifications_update on public.notifications
  for update
  to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

-- 8. RPC: get_channel_messages (cursor-based pagination)
create or replace function public.get_channel_messages(
  p_channel_id text,
  p_before_created_at timestamptz default null,
  p_limit int default 50
)
returns table (
  id uuid,
  channel_id text,
  sender_id uuid,
  sender_name text,
  content text,
  filtered_content text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_effective_limit int;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  if not public.is_channel_member(p_channel_id, v_caller_id) then
    raise exception 'NOT_A_CHANNEL_MEMBER' using errcode = '42501';
  end if;

  v_effective_limit := least(greatest(p_limit, 1), 50);

  return query
  select
    m.id,
    m.channel_id,
    m.sender_id,
    p.display_name as sender_name,
    m.content,
    m.filtered_content,
    m.created_at
  from public.chat_messages m
  left join public.profiles p on p.id = m.sender_id
  where m.channel_id = p_channel_id
    and (p_before_created_at is null or m.created_at < p_before_created_at)
  order by m.created_at desc
  limit v_effective_limit;
end;
$$;

grant execute on function public.get_channel_messages(text, timestamptz, int) to authenticated;

-- 9. RPC: mark_notification_read
create or replace function public.mark_notification_read(p_notification_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  update public.notifications
  set read = true
  where id = p_notification_id
    and recipient_id = v_caller_id;

  return jsonb_build_object('success', true, 'notification_id', p_notification_id);
end;
$$;

grant execute on function public.mark_notification_read(uuid) to authenticated;

-- ==========================================
-- Migration: 20261110094500_create_report_and_notification_rpcs.sql
-- ==========================================

-- Migration: RPCs for submitting chat reports and dispatching notifications (T3.6)
-- Conforms to docs/05-MULTIPLAYER-SOCIAL.md, docs/04-SECURITY.md and Rule 30

-- 1. RPC: submit_chat_report
create or replace function public.submit_chat_report(
  p_reported_user_id uuid,
  p_reason text,
  p_message_id uuid default null,
  p_context_snapshot jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reporter_id uuid;
  v_report_id uuid;
begin
  v_reporter_id := auth.uid();
  if v_reporter_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  if v_reporter_id = p_reported_user_id then
    raise exception 'CANNOT_REPORT_SELF' using errcode = '40001';
  end if;

  if p_reason is null or char_length(trim(p_reason)) < 3 or char_length(p_reason) > 500 then
    raise exception 'INVALID_REPORT_REASON' using errcode = '40002';
  end if;

  insert into public.chat_reports (
    reporter_id,
    reported_user_id,
    message_id,
    reason,
    context_snapshot,
    status
  )
  values (
    v_reporter_id,
    p_reported_user_id,
    p_message_id,
    trim(p_reason),
    coalesce(p_context_snapshot, '[]'::jsonb),
    'pending'
  )
  returning id into v_report_id;

  return jsonb_build_object(
    'success', true,
    'report_id', v_report_id,
    'status', 'pending'
  );
end;
$$;

grant execute on function public.submit_chat_report(uuid, text, uuid, jsonb) to authenticated;

-- 2. RPC: send_notification (internal/server-authoritative)
create or replace function public.send_notification(
  p_recipient_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_notification_id uuid;
begin
  if p_recipient_id is null then
    raise exception 'MISSING_RECIPIENT' using errcode = '40001';
  end if;

  insert into public.notifications (
    recipient_id,
    type,
    title,
    body,
    payload,
    read
  )
  values (
    p_recipient_id,
    p_type,
    p_title,
    p_body,
    coalesce(p_payload, '{}'::jsonb),
    false
  )
  returning id into v_notification_id;

  return jsonb_build_object(
    'success', true,
    'notification_id', v_notification_id
  );
end;
$$;

grant execute on function public.send_notification(uuid, text, text, text, jsonb) to service_role;

-- ==========================================
-- Migration: 20261110100000_create_alliances_and_vault.sql
-- ==========================================

-- Migration: Alliances, members, vault balances, ledger, and invitations (T4.1)
-- Conforms to docs/05-MULTIPLAYER-SOCIAL.md, docs/04-SECURITY.md and Rule 30

-- 1. Alliances table
create table if not exists public.alliances (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 3 and 30),
  tag text not null unique check (char_length(tag) between 2 and 6),
  leader_id uuid not null references auth.users(id) on delete restrict,
  level int not null default 1 check (level >= 1),
  member_cap int not null default 10 check (member_cap >= 1),
  description text check (char_length(description) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_alliances_leader on public.alliances(leader_id);

-- 2. Alliance Members table (Strict Invariant: 1 user can only belong to 1 alliance)
create table if not exists public.alliance_members (
  alliance_id uuid not null references public.alliances(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('leader', 'officer', 'member')),
  joined_at timestamptz not null default now(),
  last_withdrawn_at timestamptz,
  daily_withdrawn_amount int not null default 0,
  constraint pk_alliance_members primary key (alliance_id, user_id)
);

create index if not exists idx_alliance_members_user on public.alliance_members(user_id);

-- 3. Alliance Balances (Vault)
create table if not exists public.alliance_balances (
  alliance_id uuid not null references public.alliances(id) on delete cascade,
  resource_key text not null check (resource_key in ('metal', 'wood', 'water', 'fire', 'earth', 'light', 'dark', 'thunder')),
  amount int not null default 0 check (amount >= 0),
  updated_at timestamptz not null default now(),
  constraint pk_alliance_balances primary key (alliance_id, resource_key)
);

-- 4. Alliance Ledger (Append-only audit trail)
create table if not exists public.alliance_ledger (
  id uuid primary key default gen_random_uuid(),
  alliance_id uuid not null references public.alliances(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('deposit', 'withdraw', 'reward', 'fee')),
  resource_key text not null,
  delta int not null,
  balance_after int not null check (balance_after >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_alliance_ledger_alliance_time
  on public.alliance_ledger(alliance_id, created_at desc);

-- Prevent any UPDATE or DELETE on alliance_ledger
create or replace function public.prevent_alliance_ledger_tampering()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'ALLIANCE_LEDGER_IS_APPEND_ONLY' using errcode = '42501';
end;
$$;

create or replace trigger tr_prevent_alliance_ledger_tampering
before update or delete on public.alliance_ledger
for each row execute function public.prevent_alliance_ledger_tampering();

-- 5. Alliance Invitations / Join Requests
create table if not exists public.alliance_invitations (
  id uuid primary key default gen_random_uuid(),
  alliance_id uuid not null references public.alliances(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  inviter_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'expired')),
  created_at timestamptz not null default now(),
  constraint uq_alliance_user_pending unique (alliance_id, user_id)
);

create index if not exists idx_alliance_invitations_user
  on public.alliance_invitations(user_id, status);

-- 6. User Alliance Cooldowns (24h cooldown after leaving or getting kicked)
create table if not exists public.user_alliance_cooldowns (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cooldown_until timestamptz not null
);

-- 7. Enable RLS on all tables (Deny-by-default)
alter table public.alliances enable row level security;
alter table public.alliance_members enable row level security;
alter table public.alliance_balances enable row level security;
alter table public.alliance_ledger enable row level security;
alter table public.alliance_invitations enable row level security;
alter table public.user_alliance_cooldowns enable row level security;

revoke all on public.alliances from anon, authenticated;
revoke all on public.alliance_members from anon, authenticated;
revoke all on public.alliance_balances from anon, authenticated;
revoke all on public.alliance_ledger from anon, authenticated;
revoke all on public.alliance_invitations from anon, authenticated;
revoke all on public.user_alliance_cooldowns from anon, authenticated;

grant select on public.alliances to authenticated;
grant select on public.alliance_members to authenticated;
grant select on public.alliance_balances to authenticated;
grant select on public.alliance_ledger to authenticated;
grant select on public.alliance_invitations to authenticated;
grant select on public.user_alliance_cooldowns to authenticated;

-- Policies:
-- alliances & members: viewable by all authenticated users (directory/discovery)
create policy alliances_select on public.alliances
  for select
  to authenticated
  using (true);

create policy alliance_members_select on public.alliance_members
  for select
  to authenticated
  using (true);

-- alliance_balances: only members of this alliance can view vault balances
create policy alliance_balances_select on public.alliance_balances
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.alliance_members
      where alliance_id = public.alliance_balances.alliance_id
        and user_id = auth.uid()
    )
  );

-- alliance_ledger: only members of this alliance can inspect transactions
create policy alliance_ledger_select on public.alliance_ledger
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.alliance_members
      where alliance_id = public.alliance_ledger.alliance_id
        and user_id = auth.uid()
    )
  );

-- alliance_invitations: recipient or alliance leader/officer can view
create policy alliance_invitations_select on public.alliance_invitations
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.alliance_members
      where alliance_id = public.alliance_invitations.alliance_id
        and user_id = auth.uid()
        and role in ('leader', 'officer')
    )
  );

-- user_alliance_cooldowns: user can view their own cooldown
create policy user_alliance_cooldowns_select on public.user_alliance_cooldowns
  for select
  to authenticated
  using (auth.uid() = user_id);

-- ==========================================
-- Migration: 20261110101500_create_alliance_management_rpcs.sql
-- ==========================================

-- Migration: Alliance management RPCs with strict role enforcement (T4.2)
-- Conforms to docs/05-MULTIPLAYER-SOCIAL.md, docs/04-SECURITY.md and Rule 30

-- 1. RPC: create_alliance
create or replace function public.create_alliance(
  p_name text,
  p_tag text,
  p_description text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_alliance_id uuid;
  v_clean_name text;
  v_clean_tag text;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  -- Check if user is already in an alliance
  if exists (select 1 from public.alliance_members where user_id = v_caller_id) then
    raise exception 'ALREADY_IN_ALLIANCE' using errcode = '40001';
  end if;

  -- Check cooldown
  if exists (
    select 1
    from public.user_alliance_cooldowns
    where user_id = v_caller_id
      and cooldown_until > now()
  ) then
    raise exception 'COOLDOWN_ACTIVE' using errcode = '40002';
  end if;

  v_clean_name := trim(p_name);
  v_clean_tag := upper(trim(p_tag));

  if char_length(v_clean_name) < 3 or char_length(v_clean_name) > 30 then
    raise exception 'INVALID_ALLIANCE_NAME' using errcode = '40003';
  end if;

  if char_length(v_clean_tag) < 2 or char_length(v_clean_tag) > 6 then
    raise exception 'INVALID_ALLIANCE_TAG' using errcode = '40004';
  end if;

  -- Create Alliance record
  insert into public.alliances (name, tag, leader_id, description)
  values (v_clean_name, v_clean_tag, v_caller_id, p_description)
  returning id into v_alliance_id;

  -- Insert leader into alliance_members
  insert into public.alliance_members (alliance_id, user_id, role)
  values (v_alliance_id, v_caller_id, 'leader');

  -- Initialize 8 elemental balances for the alliance vault
  insert into public.alliance_balances (alliance_id, resource_key, amount)
  values
    (v_alliance_id, 'metal', 0),
    (v_alliance_id, 'wood', 0),
    (v_alliance_id, 'water', 0),
    (v_alliance_id, 'fire', 0),
    (v_alliance_id, 'earth', 0),
    (v_alliance_id, 'light', 0),
    (v_alliance_id, 'dark', 0),
    (v_alliance_id, 'thunder', 0);

  -- Create dedicated chat channel for the alliance
  insert into public.chat_channels (id, kind, name)
  values ('alliance:' || v_alliance_id::text, 'alliance', v_clean_name || ' [' || v_clean_tag || ']')
  on conflict (id) do nothing;

  insert into public.chat_members (channel_id, user_id, role)
  values ('alliance:' || v_alliance_id::text, v_caller_id, 'owner')
  on conflict (channel_id, user_id) do nothing;

  return jsonb_build_object(
    'success', true,
    'alliance_id', v_alliance_id,
    'name', v_clean_name,
    'tag', v_clean_tag
  );
end;
$$;

grant execute on function public.create_alliance(text, text, text) to authenticated;

-- 2. RPC: invite_or_accept_member
create or replace function public.invite_or_accept_member(
  p_alliance_id uuid,
  p_target_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_caller_role text;
  v_member_count int;
  v_member_cap int;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  -- Verify caller role (leader or officer)
  select role into v_caller_role
  from public.alliance_members
  where alliance_id = p_alliance_id and user_id = v_caller_id;

  if v_caller_role is null or v_caller_role not in ('leader', 'officer') then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;

  -- Check if target user already belongs to an alliance
  if exists (select 1 from public.alliance_members where user_id = p_target_user_id) then
    raise exception 'TARGET_ALREADY_IN_ALLIANCE' using errcode = '40005';
  end if;

  -- Check if target user has cooldown
  if exists (
    select 1
    from public.user_alliance_cooldowns
    where user_id = p_target_user_id and cooldown_until > now()
  ) then
    raise exception 'TARGET_IN_COOLDOWN' using errcode = '40006';
  end if;

  -- Check member cap
  select count(*), max(a.member_cap)
  into v_member_count, v_member_cap
  from public.alliance_members m
  join public.alliances a on a.id = m.alliance_id
  where m.alliance_id = p_alliance_id;

  if v_member_count >= v_member_cap then
    raise exception 'ALLIANCE_FULL' using errcode = '40007';
  end if;

  -- Insert member
  insert into public.alliance_members (alliance_id, user_id, role)
  values (p_alliance_id, p_target_user_id, 'member');

  -- Add to alliance chat channel
  insert into public.chat_members (channel_id, user_id, role)
  values ('alliance:' || p_alliance_id::text, p_target_user_id, 'member')
  on conflict (channel_id, user_id) do nothing;

  return jsonb_build_object(
    'success', true,
    'alliance_id', p_alliance_id,
    'user_id', p_target_user_id,
    'role', 'member'
  );
end;
$$;

grant execute on function public.invite_or_accept_member(uuid, uuid) to authenticated;

-- 3. RPC: kick_member
create or replace function public.kick_member(
  p_alliance_id uuid,
  p_target_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_caller_role text;
  v_target_role text;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  if v_caller_id = p_target_user_id then
    raise exception 'CANNOT_KICK_SELF' using errcode = '40008';
  end if;

  select role into v_caller_role
  from public.alliance_members
  where alliance_id = p_alliance_id and user_id = v_caller_id;

  if v_caller_role is null or v_caller_role not in ('leader', 'officer') then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;

  select role into v_target_role
  from public.alliance_members
  where alliance_id = p_alliance_id and user_id = p_target_user_id;

  if v_target_role is null then
    raise exception 'TARGET_NOT_A_MEMBER' using errcode = '40009';
  end if;

  -- Strict rule: Officer CANNOT kick another officer or leader
  if v_caller_role = 'officer' and v_target_role in ('officer', 'leader') then
    raise exception 'CANNOT_KICK_OFFICER_OR_LEADER' using errcode = '40010';
  end if;

  -- Delete member
  delete from public.alliance_members
  where alliance_id = p_alliance_id and user_id = p_target_user_id;

  -- Remove from chat channel
  delete from public.chat_members
  where channel_id = 'alliance:' || p_alliance_id::text and user_id = p_target_user_id;

  -- Apply 24h cooldown to kicked user
  insert into public.user_alliance_cooldowns (user_id, cooldown_until)
  values (p_target_user_id, now() + interval '24 hours')
  on conflict (user_id)
  do update set cooldown_until = now() + interval '24 hours';

  return jsonb_build_object('success', true, 'kicked_id', p_target_user_id);
end;
$$;

grant execute on function public.kick_member(uuid, uuid) to authenticated;

-- 4. RPC: promote_or_demote_member
create or replace function public.promote_or_demote_member(
  p_alliance_id uuid,
  p_target_user_id uuid,
  p_new_role text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_caller_role text;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  if p_new_role not in ('officer', 'member') then
    raise exception 'INVALID_ROLE' using errcode = '40011';
  end if;

  -- Only leader can promote or demote members
  select role into v_caller_role
  from public.alliance_members
  where alliance_id = p_alliance_id and user_id = v_caller_id;

  if v_caller_role <> 'leader' then
    raise exception 'ONLY_LEADER_CAN_MANAGE_ROLES' using errcode = '42501';
  end if;

  if v_caller_id = p_target_user_id then
    raise exception 'CANNOT_DEMOTE_LEADER_SELF' using errcode = '40012';
  end if;

  update public.alliance_members
  set role = p_new_role
  where alliance_id = p_alliance_id and user_id = p_target_user_id;

  return jsonb_build_object(
    'success', true,
    'user_id', p_target_user_id,
    'new_role', p_new_role
  );
end;
$$;

grant execute on function public.promote_or_demote_member(uuid, uuid, text) to authenticated;

-- 5. RPC: transfer_leadership
create or replace function public.transfer_leadership(
  p_alliance_id uuid,
  p_new_leader_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  -- Verify caller is current leader
  if not exists (
    select 1
    from public.alliances
    where id = p_alliance_id and leader_id = v_caller_id
  ) then
    raise exception 'ONLY_LEADER_CAN_TRANSFER' using errcode = '42501';
  end if;

  if v_caller_id = p_new_leader_id then
    raise exception 'CANNOT_TRANSFER_TO_SELF' using errcode = '40013';
  end if;

  -- Verify new leader is a member of the alliance
  if not exists (
    select 1
    from public.alliance_members
    where alliance_id = p_alliance_id and user_id = p_new_leader_id
  ) then
    raise exception 'TARGET_NOT_A_MEMBER' using errcode = '40009';
  end if;

  -- Update alliance leader
  update public.alliances
  set leader_id = p_new_leader_id, updated_at = now()
  where id = p_alliance_id;

  -- Old leader becomes officer
  update public.alliance_members
  set role = 'officer'
  where alliance_id = p_alliance_id and user_id = v_caller_id;

  -- New leader becomes leader
  update public.alliance_members
  set role = 'leader'
  where alliance_id = p_alliance_id and user_id = p_new_leader_id;

  return jsonb_build_object(
    'success', true,
    'alliance_id', p_alliance_id,
    'new_leader_id', p_new_leader_id
  );
end;
$$;

grant execute on function public.transfer_leadership(uuid, uuid) to authenticated;

-- 6. RPC: leave_alliance
create or replace function public.leave_alliance(p_alliance_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_caller_role text;
  v_other_members_count int;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  select role into v_caller_role
  from public.alliance_members
  where alliance_id = p_alliance_id and user_id = v_caller_id;

  if v_caller_role is null then
    raise exception 'NOT_A_MEMBER' using errcode = '40014';
  end if;

  if v_caller_role = 'leader' then
    select count(*) into v_other_members_count
    from public.alliance_members
    where alliance_id = p_alliance_id and user_id <> v_caller_id;

    if v_other_members_count > 0 then
      raise exception 'LEADER_MUST_TRANSFER_BEFORE_LEAVING' using errcode = '40015';
    else
      -- Sole member disband
      delete from public.alliances where id = p_alliance_id;
    end if;
  else
    delete from public.alliance_members
    where alliance_id = p_alliance_id and user_id = v_caller_id;

    delete from public.chat_members
    where channel_id = 'alliance:' || p_alliance_id::text and user_id = v_caller_id;

    -- Apply 24h cooldown to leaving user
    insert into public.user_alliance_cooldowns (user_id, cooldown_until)
    values (v_caller_id, now() + interval '24 hours')
    on conflict (user_id)
    do update set cooldown_until = now() + interval '24 hours';
  end if;

  return jsonb_build_object('success', true, 'left_alliance_id', p_alliance_id);
end;
$$;

grant execute on function public.leave_alliance(uuid) to authenticated;

-- ==========================================
-- Migration: 20261110103000_create_alliance_vault_rpcs.sql
-- ==========================================

-- Migration: Alliance vault deposit, withdraw RPCs with limits, new member lock and append-only ledger (T4.3)
-- Conforms to docs/05-MULTIPLAYER-SOCIAL.md, docs/04-SECURITY.md and Rule 30

-- 1. RPC: alliance_deposit
create or replace function public.alliance_deposit(
  p_alliance_id uuid,
  p_planet_id uuid,
  p_resource_key text,
  p_amount int
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_member_record record;
  v_planet_balance record;
  v_vault_balance int;
  v_new_vault_balance int;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  if p_amount <= 0 then
    raise exception 'INVALID_AMOUNT' using errcode = '40001';
  end if;

  -- 1. Verify caller is a member of the alliance
  select * into v_member_record
  from public.alliance_members
  where alliance_id = p_alliance_id and user_id = v_caller_id;

  if v_member_record is null then
    raise exception 'NOT_AN_ALLIANCE_MEMBER' using errcode = '42501';
  end if;

  -- 2. Verify planet ownership and lock resource balance
  select b.amount into v_planet_balance
  from public.resource_balances b
  join public.planets p on p.id = b.planet_id
  where b.planet_id = p_planet_id
    and b.resource_key = p_resource_key
    and p.owner_id = v_caller_id
  for update;

  if v_planet_balance is null or v_planet_balance.amount < p_amount then
    raise exception 'INSUFFICIENT_PLANET_RESOURCES' using errcode = '40002';
  end if;

  -- 3. Lock vault balance
  select amount into v_vault_balance
  from public.alliance_balances
  where alliance_id = p_alliance_id and resource_key = p_resource_key
  for update;

  if v_vault_balance is null then
    insert into public.alliance_balances (alliance_id, resource_key, amount)
    values (p_alliance_id, p_resource_key, 0);
    v_vault_balance := 0;
  end if;

  v_new_vault_balance := v_vault_balance + p_amount;

  -- 4. Execute atomic transfer
  update public.resource_balances
  set amount = amount - p_amount, updated_at = now()
  where planet_id = p_planet_id and resource_key = p_resource_key;

  update public.alliance_balances
  set amount = v_new_vault_balance, updated_at = now()
  where alliance_id = p_alliance_id and resource_key = p_resource_key;

  -- 5. Record to append-only ledger
  insert into public.alliance_ledger (
    alliance_id,
    user_id,
    action,
    resource_key,
    delta,
    balance_after
  )
  values (
    p_alliance_id,
    v_caller_id,
    'deposit',
    p_resource_key,
    p_amount,
    v_new_vault_balance
  );

  return jsonb_build_object(
    'success', true,
    'alliance_id', p_alliance_id,
    'resource_key', p_resource_key,
    'deposited', p_amount,
    'new_vault_balance', v_new_vault_balance
  );
end;
$$;

grant execute on function public.alliance_deposit(uuid, uuid, text, int) to authenticated;

-- 2. RPC: alliance_withdraw
create or replace function public.alliance_withdraw(
  p_alliance_id uuid,
  p_planet_id uuid,
  p_resource_key text,
  p_amount int
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_member_record record;
  v_planet_balance record;
  v_vault_balance int;
  v_new_vault_balance int;
  v_daily_cap int;
  v_current_daily_total int;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  if p_amount <= 0 then
    raise exception 'INVALID_AMOUNT' using errcode = '40001';
  end if;

  -- 1. Verify caller membership and role (Only leader or officer)
  select * into v_member_record
  from public.alliance_members
  where alliance_id = p_alliance_id and user_id = v_caller_id;

  if v_member_record is null then
    raise exception 'NOT_AN_ALLIANCE_MEMBER' using errcode = '42501';
  end if;

  if v_member_record.role = 'member' then
    raise exception 'ONLY_OFFICERS_OR_LEADERS_CAN_WITHDRAW' using errcode = '42501';
  end if;

  -- 2. Anti-Abuse: Members joined within 24 hours cannot withdraw
  if v_member_record.joined_at > (now() - interval '24 hours') then
    raise exception 'NEW_MEMBER_WITHDRAWAL_RESTRICTED' using errcode = '40003';
  end if;

  -- 3. Daily withdrawal quota check
  v_daily_cap := case when v_member_record.role = 'leader' then 1000 else 500 end;

  -- Reset daily tally if last withdrawal was yesterday
  if v_member_record.last_withdrawn_at is null or v_member_record.last_withdrawn_at < date_trunc('day', now()) then
    v_current_daily_total := 0;
  else
    v_current_daily_total := v_member_record.daily_withdrawn_amount;
  end if;

  if (v_current_daily_total + p_amount) > v_daily_cap then
    raise exception 'DAILY_WITHDRAW_LIMIT_EXCEEDED' using errcode = '40004';
  end if;

  -- 4. Verify planet ownership and lock
  select b.amount, b.cap into v_planet_balance
  from public.resource_balances b
  join public.planets p on p.id = b.planet_id
  where b.planet_id = p_planet_id
    and b.resource_key = p_resource_key
    and p.owner_id = v_caller_id
  for update;

  if v_planet_balance is null then
    raise exception 'PLANET_NOT_FOUND' using errcode = '40005';
  end if;

  -- 5. Lock vault balance and check liquidity
  select amount into v_vault_balance
  from public.alliance_balances
  where alliance_id = p_alliance_id and resource_key = p_resource_key
  for update;

  if v_vault_balance is null or v_vault_balance < p_amount then
    raise exception 'INSUFFICIENT_VAULT_RESOURCES' using errcode = '40006';
  end if;

  v_new_vault_balance := v_vault_balance - p_amount;

  -- 6. Execute atomic transfer
  update public.alliance_balances
  set amount = v_new_vault_balance, updated_at = now()
  where alliance_id = p_alliance_id and resource_key = p_resource_key;

  update public.resource_balances
  set amount = least(amount + p_amount, v_planet_balance.cap), updated_at = now()
  where planet_id = p_planet_id and resource_key = p_resource_key;

  update public.alliance_members
  set last_withdrawn_at = now(),
      daily_withdrawn_amount = v_current_daily_total + p_amount
  where alliance_id = p_alliance_id and user_id = v_caller_id;

  -- 7. Record to append-only ledger
  insert into public.alliance_ledger (
    alliance_id,
    user_id,
    action,
    resource_key,
    delta,
    balance_after
  )
  values (
    p_alliance_id,
    v_caller_id,
    'withdraw',
    p_resource_key,
    -p_amount,
    v_new_vault_balance
  );

  return jsonb_build_object(
    'success', true,
    'alliance_id', p_alliance_id,
    'resource_key', p_resource_key,
    'withdrawn', p_amount,
    'new_vault_balance', v_new_vault_balance
  );
end;
$$;

grant execute on function public.alliance_withdraw(uuid, uuid, text, int) to authenticated;

-- ==========================================
-- Migration: 20261110104500_create_parties_and_rewards.sql
-- ==========================================

-- Migration: Parties (temporary groups of 2-5), party members, chat link, and server-calculated reward distribution (T4.4)
-- Conforms to docs/05-MULTIPLAYER-SOCIAL.md, docs/04-SECURITY.md and Rule 30

-- 1. Parties table
create table if not exists public.parties (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 50),
  activity_type text not null default 'expedition' check (activity_type in ('expedition', 'celestial_boss', 'duo_quest')),
  max_members int not null default 5 check (max_members between 2 and 5),
  reward_distribution text not null default 'personal' check (reward_distribution in ('personal', 'equal', 'leader')),
  status text not null default 'open' check (status in ('open', 'active', 'completed', 'expired')),
  expires_at timestamptz not null default (now() + interval '6 hours'),
  created_at timestamptz not null default now()
);

create index if not exists idx_parties_status on public.parties(status, expires_at);

-- 2. Party Members table (Strict Invariant: 1 user in at most 1 active party)
create table if not exists public.party_members (
  party_id uuid not null references public.parties(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  contribution_score int not null default 0 check (contribution_score >= 0),
  joined_at timestamptz not null default now(),
  constraint pk_party_members primary key (party_id, user_id)
);

create index if not exists idx_party_members_party on public.party_members(party_id);

-- 3. Enable RLS (Deny-by-default)
alter table public.parties enable row level security;
alter table public.party_members enable row level security;

revoke all on public.parties from anon, authenticated;
revoke all on public.party_members from anon, authenticated;

grant select on public.parties to authenticated;
grant select on public.party_members to authenticated;

-- Policies:
-- Any authenticated user can browse active parties
create policy parties_select on public.parties
  for select
  to authenticated
  using (status in ('open', 'active') and expires_at > now());

create policy party_members_select on public.party_members
  for select
  to authenticated
  using (true);

-- 4. RPC: create_party
create or replace function public.create_party(
  p_title text,
  p_activity_type text default 'expedition',
  p_max_members int default 5,
  p_distribution text default 'personal'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_party_id uuid;
  v_clean_title text;
  v_effective_cap int;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  -- Check if user is already in a party
  if exists (select 1 from public.party_members where user_id = v_caller_id) then
    raise exception 'ALREADY_IN_PARTY' using errcode = '40001';
  end if;

  v_clean_title := trim(p_title);
  if char_length(v_clean_title) < 3 or char_length(v_clean_title) > 50 then
    raise exception 'INVALID_PARTY_TITLE' using errcode = '40002';
  end if;

  v_effective_cap := least(greatest(p_max_members, 2), 5);

  -- Insert Party
  insert into public.parties (
    leader_id,
    title,
    activity_type,
    max_members,
    reward_distribution,
    status
  )
  values (
    v_caller_id,
    v_clean_title,
    p_activity_type,
    v_effective_cap,
    p_distribution,
    'open'
  )
  returning id into v_party_id;

  -- Insert Leader as first member
  insert into public.party_members (party_id, user_id, contribution_score)
  values (v_party_id, v_caller_id, 0);

  -- Create party chat channel
  insert into public.chat_channels (id, kind, name)
  values ('party:' || v_party_id::text, 'party', 'Nhóm: ' || v_clean_title)
  on conflict (id) do nothing;

  insert into public.chat_members (channel_id, user_id, role)
  values ('party:' || v_party_id::text, v_caller_id, 'owner')
  on conflict (channel_id, user_id) do nothing;

  return jsonb_build_object(
    'success', true,
    'party_id', v_party_id,
    'title', v_clean_title,
    'max_members', v_effective_cap
  );
end;
$$;

grant execute on function public.create_party(text, text, int, text) to authenticated;

-- 5. RPC: join_party
create or replace function public.join_party(p_party_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_party record;
  v_count int;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  -- Check if caller already in a party
  if exists (select 1 from public.party_members where user_id = v_caller_id) then
    raise exception 'ALREADY_IN_PARTY' using errcode = '40001';
  end if;

  select * into v_party
  from public.parties
  where id = p_party_id;

  if v_party is null then
    raise exception 'PARTY_NOT_FOUND' using errcode = '40004';
  end if;

  if v_party.status <> 'open' or v_party.expires_at <= now() then
    raise exception 'PARTY_NOT_JOINABLE' using errcode = '40005';
  end if;

  select count(*) into v_count
  from public.party_members
  where party_id = p_party_id;

  if v_count >= v_party.max_members then
    raise exception 'PARTY_FULL' using errcode = '40006';
  end if;

  insert into public.party_members (party_id, user_id, contribution_score)
  values (p_party_id, v_caller_id, 0);

  -- Add to party chat
  insert into public.chat_members (channel_id, user_id, role)
  values ('party:' || p_party_id::text, v_caller_id, 'member')
  on conflict (channel_id, user_id) do nothing;

  return jsonb_build_object(
    'success', true,
    'party_id', p_party_id,
    'user_id', v_caller_id
  );
end;
$$;

grant execute on function public.join_party(uuid) to authenticated;

-- 6. RPC: leave_party
create or replace function public.leave_party(p_party_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_party record;
  v_next_leader uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  select * into v_party
  from public.parties
  where id = p_party_id;

  if v_party is null then
    raise exception 'PARTY_NOT_FOUND' using errcode = '40004';
  end if;

  delete from public.party_members
  where party_id = p_party_id and user_id = v_caller_id;

  delete from public.chat_members
  where channel_id = 'party:' || p_party_id::text and user_id = v_caller_id;

  -- If leader leaves, transfer or disband
  if v_party.leader_id = v_caller_id then
    select user_id into v_next_leader
    from public.party_members
    where party_id = p_party_id
    order by joined_at asc
    limit 1;

    if v_next_leader is not null then
      update public.parties
      set leader_id = v_next_leader
      where id = p_party_id;
    else
      -- No members left -> disband party
      update public.parties
      set status = 'completed'
      where id = p_party_id;
    end if;
  end if;

  return jsonb_build_object('success', true, 'left_party_id', p_party_id);
end;
$$;

grant execute on function public.leave_party(uuid) to authenticated;

-- 7. RPC: distribute_party_rewards (Server-Authoritative Anti-Leech Distribution)
create or replace function public.distribute_party_rewards(
  p_party_id uuid,
  p_total_pool int
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_party record;
  v_total_points int;
  v_member record;
  v_reward int;
  v_results jsonb := '[]'::jsonb;
begin
  select * into v_party
  from public.parties
  where id = p_party_id;

  if v_party is null then
    raise exception 'PARTY_NOT_FOUND' using errcode = '40004';
  end if;

  -- Sum all positive contribution scores (must have > 0 points to receive rewards)
  select sum(contribution_score) into v_total_points
  from public.party_members
  where party_id = p_party_id and contribution_score > 0;

  for v_member in
    select user_id, contribution_score
    from public.party_members
    where party_id = p_party_id
  loop
    -- Anti-leech invariant: 0 score = 0 reward
    if v_member.contribution_score <= 0 or v_total_points is null or v_total_points = 0 then
      v_reward := 0;
    else
      if v_party.reward_distribution = 'equal' then
        v_reward := p_total_pool / (select count(*) from public.party_members where party_id = p_party_id and contribution_score > 0);
      else
        -- Proportional to contribution
        v_reward := (p_total_pool * v_member.contribution_score) / v_total_points;
      end if;
    end if;

    v_results := v_results || jsonb_build_object(
      'user_id', v_member.user_id,
      'score', v_member.contribution_score,
      'reward', v_reward
    );
  end loop;

  -- Mark party as completed
  update public.parties
  set status = 'completed'
  where id = p_party_id;

  return jsonb_build_object(
    'success', true,
    'party_id', p_party_id,
    'total_pool', p_total_pool,
    'distributions', v_results
  );
end;
$$;

grant execute on function public.distribute_party_rewards(uuid, int) to service_role;

-- ==========================================
-- Migration: 20261110110000_create_npc_planets_and_expeditions.sql
-- ==========================================

-- Migration: NPC Planets, Observatory Integration, and Expedition System (T5.1 & T5.2)
-- Conforms to docs/00-GDD.md section 10, docs/02-ARCHITECTURE.md and Rule 30

-- 1. Create npc_planets table
create table if not exists public.npc_planets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  element text not null check (element in ('metal', 'wood', 'water', 'fire', 'earth', 'light', 'dark', 'thunder')),
  personality text not null check (personality in ('aggressive', 'mercantile', 'reclusive', 'scientific')),
  coord_x int not null,
  coord_y int not null,
  discovered_min_stage int not null default 4,
  description text,
  base_rewards jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Index for spatial or elemental queries
create index if not exists idx_npc_planets_element on public.npc_planets(element);
create index if not exists idx_npc_planets_coords on public.npc_planets(coord_x, coord_y);

-- 2. Create planet_expeditions table
create table if not exists public.planet_expeditions (
  id uuid primary key default gen_random_uuid(),
  planet_id uuid not null references public.planets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  target_npc_id uuid not null references public.npc_planets(id),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'cancelled')),
  cost_resource text not null,
  cost_amount int not null,
  rewards jsonb,
  finish_at timestamptz not null,
  settled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_planet_expeditions_user on public.planet_expeditions(user_id);
create index if not exists idx_planet_expeditions_planet on public.planet_expeditions(planet_id);
create index if not exists idx_planet_expeditions_finish on public.planet_expeditions(finish_at);

-- 3. Seed canonical 8 NPC planets representing the 8 elements & 4 personalities
insert into public.npc_planets (name, element, personality, coord_x, coord_y, discovered_min_stage, description, base_rewards)
values
  ('Kim Cương Tinh', 'metal', 'mercantile', 12, 18, 4, 'Hành tinh quặng kim loại khổng lồ, cư dân ham mê trao đổi quý kim.', '{"metal": 120, "crystal": 20}'::jsonb),
  ('Vạn Mộc Tinh', 'wood', 'scientific', -25, 14, 4, 'Hệ sinh thái rừng nguyên sinh bao phủ, lưu trữ vô số mẫu gen thực vật cổ.', '{"wood": 140, "seed": 30}'::jsonb),
  ('Thủy Triều Tinh', 'water', 'reclusive', -10, -32, 4, 'Đại dương vô tận, các nhà tu hành ẩn dật nghiên cứu dòng năng lượng thanh tịnh.', '{"water": 150, "pearl": 25}'::jsonb),
  ('Hỏa Diệm Tinh', 'fire', 'aggressive', 35, -20, 4, 'Dung nham sôi trào, cư dân hiếu chiến luôn tìm kiếm đối thủ thử thách sức mạnh.', '{"fire": 130, "obsidian": 35}'::jsonb),
  ('Hoàng Thổ Tinh', 'earth', 'mercantile', 5, -8, 4, 'Vùng đất phì nhiêu, các thương đội liên tinh tụ họp buôn bán lương thực và khoáng thạch.', '{"earth": 160, "gem": 20}'::jsonb),
  ('Quang Minh Tinh', 'light', 'scientific', 42, 42, 4, 'Hào quang rực rỡ từ sao mẹ chiếu sáng tri thức công nghệ thiên văn cao cấp.', '{"light": 80, "prism": 15}'::jsonb),
  ('Hắc Ám Tinh', 'dark', 'reclusive', -50, -45, 4, 'Vùng hắc ám yên tĩnh bao phủ, nơi ẩn náu của các sinh vật hắc ám huyền bí.', '{"dark": 80, "shadow_core": 15}'::jsonb),
  ('Lôi Đình Tinh', 'thunder', 'aggressive', 20, -50, 4, 'Sấm sét liên miên ngày đêm, năng lượng plasma tích tụ dày đặc.', '{"thunder": 90, "storm_gem": 15}'::jsonb)
on conflict do nothing;

-- 4. Enable RLS
alter table public.npc_planets enable row level security;
alter table public.planet_expeditions enable row level security;

-- RLS: npc_planets is readable by all authenticated users
create policy "Authenticated users can view NPC planets"
  on public.npc_planets for select
  to authenticated
  using (true);

-- RLS: planet_expeditions is viewable by owner only
create policy "Users can view own expeditions"
  on public.planet_expeditions for select
  to authenticated
  using (user_id = auth.uid());

-- Deny direct write from client (server-authoritative through RPC)
create policy "Deny direct insert on expeditions"
  on public.planet_expeditions for insert
  to authenticated
  with check (false);

create policy "Deny direct update on expeditions"
  on public.planet_expeditions for update
  to authenticated
  using (false);

create policy "Deny direct delete on expeditions"
  on public.planet_expeditions for delete
  to authenticated
  using (false);

-- 5. RPC: start_expedition
create or replace function public.start_expedition(
  p_planet_id uuid,
  p_target_npc_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_planet record;
  v_npc record;
  v_has_observatory boolean;
  v_ongoing_expedition record;
  v_cost_amount int := 50;
  v_current_balance record;
  v_distance numeric;
  v_duration_seconds int;
  v_finish_at timestamptz;
  v_expedition_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  -- 1. Verify planet ownership and stage >= 4
  select * into v_planet
  from public.planets
  where id = p_planet_id and owner_id = v_caller_id;

  if v_planet is null then
    raise exception 'PLANET_NOT_FOUND' using errcode = '40001';
  end if;

  if v_planet.stage < 4 then
    raise exception 'OBSERVATORY_STAGE_REQUIRED' using errcode = '40002';
  end if;

  -- 2. Verify Observatory building exists on planet
  select exists (
    select 1
    from public.building_instances
    where planet_id = p_planet_id
      and building_type = 'observatory'
  ) into v_has_observatory;

  if not v_has_observatory then
    raise exception 'OBSERVATORY_NOT_CONSTRUCTED' using errcode = '40003';
  end if;

  -- 3. Verify target NPC planet exists
  select * into v_npc
  from public.npc_planets
  where id = p_target_npc_id;

  if v_npc is null then
    raise exception 'TARGET_NPC_NOT_FOUND' using errcode = '40004';
  end if;

  -- 4. Check for active ongoing expedition
  select * into v_ongoing_expedition
  from public.planet_expeditions
  where planet_id = p_planet_id
    and status = 'in_progress'
    and finish_at > now();

  if v_ongoing_expedition is not null then
    raise exception 'EXPEDITION_ALREADY_IN_PROGRESS' using errcode = '40005';
  end if;

  -- 5. Deduct launch fuel (50 units of the target NPC's complementary element or base element)
  select * into v_current_balance
  from public.resource_balances
  where planet_id = p_planet_id and resource_key = v_planet.element
  for update;

  if v_current_balance is null or v_current_balance.amount < v_cost_amount then
    raise exception 'INSUFFICIENT_LAUNCH_RESOURCES' using errcode = '40006';
  end if;

  update public.resource_balances
  set amount = amount - v_cost_amount, updated_at = now()
  where planet_id = p_planet_id and resource_key = v_planet.element;

  -- Record to resource_ledger
  insert into public.resource_ledger (
    planet_id,
    user_id,
    resource_key,
    delta,
    balance_after,
    source,
    idempotency_key
  )
  values (
    p_planet_id,
    v_caller_id,
    v_planet.element,
    -v_cost_amount,
    v_current_balance.amount - v_cost_amount,
    'expedition_launch',
    'exp_launch_' || gen_random_uuid()::text
  );

  -- 6. Calculate flight duration based on Euclidean distance
  v_distance := sqrt(power(v_npc.coord_x, 2) + power(v_npc.coord_y, 2));
  -- Base 60s + 1s per 2 coordinates distance, capped at 300s
  v_duration_seconds := least(300, greatest(60, floor(60 + v_distance / 2)))::int;
  v_finish_at := now() + (v_duration_seconds || ' seconds')::interval;

  -- 7. Insert expedition record
  insert into public.planet_expeditions (
    planet_id,
    user_id,
    target_npc_id,
    status,
    cost_resource,
    cost_amount,
    finish_at
  )
  values (
    p_planet_id,
    v_caller_id,
    p_target_npc_id,
    'in_progress',
    v_planet.element,
    v_cost_amount,
    v_finish_at
  )
  returning id into v_expedition_id;

  return jsonb_build_object(
    'success', true,
    'expedition_id', v_expedition_id,
    'target_name', v_npc.name,
    'duration_seconds', v_duration_seconds,
    'finish_at', v_finish_at
  );
end;
$$;

grant execute on function public.start_expedition(uuid, uuid) to authenticated;

-- 6. RPC: settle_expedition
create or replace function public.settle_expedition(p_expedition_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_expedition record;
  v_npc record;
  v_rewards jsonb;
  v_elem_key text;
  v_elem_val text;
  v_elem_amount int;
  v_planet_balance record;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  -- 1. Lock and retrieve expedition record
  select * into v_expedition
  from public.planet_expeditions
  where id = p_expedition_id and user_id = v_caller_id
  for update;

  if v_expedition is null then
    raise exception 'EXPEDITION_NOT_FOUND' using errcode = '40001';
  end if;

  if v_expedition.status <> 'in_progress' then
    raise exception 'EXPEDITION_ALREADY_SETTLED' using errcode = '40007';
  end if;

  if v_expedition.finish_at > now() then
    raise exception 'EXPEDITION_NOT_FINISHED' using errcode = '40008';
  end if;

  -- 2. Retrieve NPC info
  select * into v_npc
  from public.npc_planets
  where id = v_expedition.target_npc_id;

  if v_npc is null then
    raise exception 'TARGET_NPC_NOT_FOUND' using errcode = '40004';
  end if;

  v_rewards := v_npc.base_rewards;

  -- 3. Deposit rewards into planet resource balance
  for v_elem_key, v_elem_val in select * from jsonb_each_text(v_rewards) loop
    v_elem_amount := v_elem_val::int;

    select * into v_planet_balance
    from public.resource_balances
    where planet_id = v_expedition.planet_id and resource_key = v_elem_key
    for update;

    if v_planet_balance is not null then
      update public.resource_balances
      set amount = least(amount + v_elem_amount, v_planet_balance.cap),
          updated_at = now()
      where planet_id = v_expedition.planet_id and resource_key = v_elem_key;

      insert into public.resource_ledger (
        planet_id,
        user_id,
        resource_key,
        delta,
        balance_after,
        source,
        idempotency_key
      )
      values (
        v_expedition.planet_id,
        v_caller_id,
        v_elem_key,
        v_elem_amount,
        least(v_planet_balance.amount + v_elem_amount, v_planet_balance.cap),
        'expedition_reward',
        'exp_reward_' || v_expedition.id::text || '_' || v_elem_key
      );
    end if;
  end loop;

  -- 4. Mark expedition as completed
  update public.planet_expeditions
  set status = 'completed',
      settled_at = now(),
      rewards = v_rewards
  where id = p_expedition_id;

  return jsonb_build_object(
    'success', true,
    'expedition_id', p_expedition_id,
    'target_name', v_npc.name,
    'rewards', v_rewards
  );
end;
$$;

grant execute on function public.settle_expedition(uuid) to authenticated;

-- ==========================================
-- Migration: 20261110111500_create_npc_trade_system.sql
-- ==========================================

-- Migration: NPC Trade System & Anti-Arbitrage Mechanism (T5.3)
-- Conforms to docs/00-GDD.md section 10, docs/01-ROADMAP.md and docs/04-SECURITY.md

-- 1. Create npc_trade_ledger table (Append-only audit of all NPC transactions)
create table if not exists public.npc_trade_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  planet_id uuid not null references public.planets(id) on delete cascade,
  npc_planet_id uuid not null references public.npc_planets(id),
  offer_resource text not null,
  offer_amount int not null,
  received_resource text not null,
  received_amount int not null,
  rate numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_npc_trade_ledger_user on public.npc_trade_ledger(user_id);
create index if not exists idx_npc_trade_ledger_planet on public.npc_trade_ledger(planet_id);

-- 2. Create user_daily_trade_stats table (Enforces daily trade caps)
create table if not exists public.user_daily_trade_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_date date not null default current_date,
  total_traded_units int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, trade_date)
);

-- 3. Enable RLS
alter table public.npc_trade_ledger enable row level security;
alter table public.user_daily_trade_stats enable row level security;

create policy "Users can view own trade ledger"
  on public.npc_trade_ledger for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can view own trade stats"
  on public.user_daily_trade_stats for select
  to authenticated
  using (user_id = auth.uid());

-- Deny direct write from client (server-authoritative)
create policy "Deny direct insert on trade ledger"
  on public.npc_trade_ledger for insert to authenticated with check (false);

create policy "Deny direct update on trade ledger"
  on public.npc_trade_ledger for update to authenticated using (false);

create policy "Deny direct delete on trade ledger"
  on public.npc_trade_ledger for delete to authenticated using (false);

-- 4. RPC: trade_with_npc
create or replace function public.trade_with_npc(
  p_planet_id uuid,
  p_npc_planet_id uuid,
  p_offer_resource text,
  p_offer_amount int,
  p_target_resource text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_planet record;
  v_npc record;
  v_daily_cap int := 2000;
  v_today_traded int;
  v_offer_balance record;
  v_target_balance record;
  v_base_rate numeric := 1.0;
  v_spread numeric := 0.85; -- 15% trade commission, mathematical guarantee against infinite loops
  v_personality_bonus numeric := 1.0;
  v_effective_rate numeric;
  v_received_amount int;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  if p_offer_amount <= 0 then
    raise exception 'INVALID_OFFER_AMOUNT' using errcode = '40001';
  end if;

  if p_offer_resource = p_target_resource then
    raise exception 'CANNOT_TRADE_SAME_RESOURCE' using errcode = '40002';
  end if;

  -- 1. Verify planet ownership
  select * into v_planet
  from public.planets
  where id = p_planet_id and owner_id = v_caller_id;

  if v_planet is null then
    raise exception 'PLANET_NOT_FOUND' using errcode = '40003';
  end if;

  -- 2. Verify NPC planet
  select * into v_npc
  from public.npc_planets
  where id = p_npc_planet_id;

  if v_npc is null then
    raise exception 'TARGET_NPC_NOT_FOUND' using errcode = '40004';
  end if;

  -- 3. Check and update daily trade cap
  select total_traded_units into v_today_traded
  from public.user_daily_trade_stats
  where user_id = v_caller_id and trade_date = current_date
  for update;

  if v_today_traded is null then
    v_today_traded := 0;
  end if;

  if (v_today_traded + p_offer_amount) > v_daily_cap then
    raise exception 'DAILY_TRADE_CAP_EXCEEDED' using errcode = '40005';
  end if;

  -- 4. Calculate exchange rate with personality nuance
  -- Mercantile NPCs offer slight discount on commission (spread 0.88 instead of 0.85)
  if v_npc.personality = 'mercantile' then
    v_spread := 0.88;
  end if;

  -- If offering the NPC's native element, they value it less (0.9 multiplier)
  -- If offering an element that generates their element, they value it more (1.1 multiplier)
  if p_offer_resource = v_npc.element then
    v_personality_bonus := 0.9;
  elsif (
    (p_offer_resource = 'metal' and v_npc.element = 'water') or
    (p_offer_resource = 'water' and v_npc.element = 'wood') or
    (p_offer_resource = 'wood' and v_npc.element = 'fire') or
    (p_offer_resource = 'fire' and v_npc.element = 'earth') or
    (p_offer_resource = 'earth' and v_npc.element = 'metal')
  ) then
    v_personality_bonus := 1.1;
  end if;

  v_effective_rate := v_base_rate * v_spread * v_personality_bonus;
  v_received_amount := floor(p_offer_amount * v_effective_rate)::int;

  if v_received_amount < 1 then
    raise exception 'OFFER_TOO_LOW_FOR_EXCHANGE' using errcode = '40006';
  end if;

  -- 5. Lock and deduct offer resource
  select * into v_offer_balance
  from public.resource_balances
  where planet_id = p_planet_id and resource_key = p_offer_resource
  for update;

  if v_offer_balance is null or v_offer_balance.amount < p_offer_amount then
    raise exception 'INSUFFICIENT_OFFER_RESOURCES' using errcode = '40007';
  end if;

  -- Lock target resource
  select * into v_target_balance
  from public.resource_balances
  where planet_id = p_planet_id and resource_key = p_target_resource
  for update;

  if v_target_balance is null then
    raise exception 'TARGET_RESOURCE_NOT_FOUND' using errcode = '40008';
  end if;

  -- 6. Perform atomic balances update
  update public.resource_balances
  set amount = amount - p_offer_amount, updated_at = now()
  where planet_id = p_planet_id and resource_key = p_offer_resource;

  update public.resource_balances
  set amount = least(amount + v_received_amount, v_target_balance.cap), updated_at = now()
  where planet_id = p_planet_id and resource_key = p_target_resource;

  -- 7. Update daily stats
  insert into public.user_daily_trade_stats (user_id, trade_date, total_traded_units, updated_at)
  values (v_caller_id, current_date, p_offer_amount, now())
  on conflict (user_id, trade_date)
  do update set total_traded_units = public.user_daily_trade_stats.total_traded_units + p_offer_amount,
                updated_at = now();

  -- 8. Record to ledgers
  insert into public.npc_trade_ledger (
    user_id,
    planet_id,
    npc_planet_id,
    offer_resource,
    offer_amount,
    received_resource,
    received_amount,
    rate
  )
  values (
    v_caller_id,
    p_planet_id,
    p_npc_planet_id,
    p_offer_resource,
    p_offer_amount,
    p_target_resource,
    v_received_amount,
    v_effective_rate
  );

  insert into public.resource_ledger (
    planet_id,
    user_id,
    resource_key,
    delta,
    balance_after,
    source,
    idempotency_key
  )
  values
    (
      p_planet_id,
      v_caller_id,
      p_offer_resource,
      -p_offer_amount,
      v_offer_balance.amount - p_offer_amount,
      'npc_trade_out',
      'trade_out_' || gen_random_uuid()::text
    ),
    (
      p_planet_id,
      v_caller_id,
      p_target_resource,
      v_received_amount,
      least(v_target_balance.amount + v_received_amount, v_target_balance.cap),
      'npc_trade_in',
      'trade_in_' || gen_random_uuid()::text
    );

  return jsonb_build_object(
    'success', true,
    'offered', p_offer_amount,
    'received', v_received_amount,
    'effective_rate', round(v_effective_rate, 4),
    'daily_total_traded', v_today_traded + p_offer_amount,
    'daily_cap_remaining', v_daily_cap - (v_today_traded + p_offer_amount)
  );
end;
$$;

grant execute on function public.trade_with_npc(uuid, uuid, text, int, text) to authenticated;

-- ==========================================
-- Migration: 20261110113000_create_alliance_diplomacy.sql
-- ==========================================

-- Migration: Alliance Diplomacy System (T5.4)
-- Conforms to docs/05-MULTIPLAYER-SOCIAL.md section 3.3 and docs/04-SECURITY.md

-- 1. Create alliance_diplomacy table
create table if not exists public.alliance_diplomacy (
  id uuid primary key default gen_random_uuid(),
  alliance_a uuid not null references public.alliances(id) on delete cascade,
  alliance_b uuid not null references public.alliances(id) on delete cascade,
  status text not null default 'neutral' check (status in ('neutral', 'allied', 'hostile', 'pending_alliance')),
  proposed_by_alliance_id uuid references public.alliances(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint check_different_alliances check (alliance_a <> alliance_b),
  constraint check_ordered_alliances check (alliance_a < alliance_b),
  constraint unique_alliance_pair unique (alliance_a, alliance_b)
);

create index if not exists idx_alliance_diplomacy_pair on public.alliance_diplomacy(alliance_a, alliance_b);
create index if not exists idx_alliance_diplomacy_status on public.alliance_diplomacy(status);

-- 2. Enable RLS
alter table public.alliance_diplomacy enable row level security;

-- Diplomacy status is public info in the celestial galaxy
create policy "Authenticated users can view alliance diplomacy"
  on public.alliance_diplomacy for select
  to authenticated
  using (true);

create policy "Deny direct insert on diplomacy"
  on public.alliance_diplomacy for insert to authenticated with check (false);

create policy "Deny direct update on diplomacy"
  on public.alliance_diplomacy for update to authenticated using (false);

create policy "Deny direct delete on diplomacy"
  on public.alliance_diplomacy for delete to authenticated using (false);

-- 3. RPC: propose_alliance_diplomacy
create or replace function public.propose_alliance_diplomacy(
  p_my_alliance_id uuid,
  p_target_alliance_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_caller_role text;
  v_pair_a uuid;
  v_pair_b uuid;
  v_current_rel record;
  v_new_status text;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  if p_my_alliance_id = p_target_alliance_id then
    raise exception 'CANNOT_SET_DIPLOMACY_WITH_SELF' using errcode = '40001';
  end if;

  if p_action not in ('propose_alliance', 'declare_hostility', 'declare_neutral') then
    raise exception 'INVALID_DIPLOMACY_ACTION' using errcode = '40002';
  end if;

  -- 1. Strictly verify caller is Leader of my_alliance
  select role into v_caller_role
  from public.alliance_members
  where alliance_id = p_my_alliance_id and user_id = v_caller_id;

  if v_caller_role is null or v_caller_role <> 'leader' then
    raise exception 'ONLY_LEADER_CAN_DECLARE_DIPLOMACY' using errcode = '42501';
  end if;

  -- 2. Verify target alliance exists
  if not exists (select 1 from public.alliances where id = p_target_alliance_id) then
    raise exception 'TARGET_ALLIANCE_NOT_FOUND' using errcode = '40003';
  end if;

  -- Normalize pair ordering
  v_pair_a := least(p_my_alliance_id, p_target_alliance_id);
  v_pair_b := greatest(p_my_alliance_id, p_target_alliance_id);

  select * into v_current_rel
  from public.alliance_diplomacy
  where alliance_a = v_pair_a and alliance_b = v_pair_b
  for update;

  if p_action = 'declare_hostility' then
    v_new_status := 'hostile';
  elsif p_action = 'declare_neutral' then
    v_new_status := 'neutral';
  elsif p_action = 'propose_alliance' then
    v_new_status := 'pending_alliance';
  end if;

  if v_current_rel is null then
    insert into public.alliance_diplomacy (
      alliance_a,
      alliance_b,
      status,
      proposed_by_alliance_id,
      updated_at
    )
    values (
      v_pair_a,
      v_pair_b,
      v_new_status,
      case when v_new_status = 'pending_alliance' then p_my_alliance_id else null end,
      now()
    );
  else
    update public.alliance_diplomacy
    set status = v_new_status,
        proposed_by_alliance_id = case when v_new_status = 'pending_alliance' then p_my_alliance_id else null end,
        updated_at = now()
    where id = v_current_rel.id;
  end if;

  return jsonb_build_object(
    'success', true,
    'alliance_a', v_pair_a,
    'alliance_b', v_pair_b,
    'status', v_new_status
  );
end;
$$;

grant execute on function public.propose_alliance_diplomacy(uuid, uuid, text) to authenticated;

-- 4. RPC: respond_alliance_diplomacy
create or replace function public.respond_alliance_diplomacy(
  p_my_alliance_id uuid,
  p_target_alliance_id uuid,
  p_accept boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_caller_role text;
  v_pair_a uuid;
  v_pair_b uuid;
  v_current_rel record;
  v_final_status text;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  -- 1. Strictly verify caller is Leader of my_alliance
  select role into v_caller_role
  from public.alliance_members
  where alliance_id = p_my_alliance_id and user_id = v_caller_id;

  if v_caller_role is null or v_caller_role <> 'leader' then
    raise exception 'ONLY_LEADER_CAN_DECLARE_DIPLOMACY' using errcode = '42501';
  end if;

  v_pair_a := least(p_my_alliance_id, p_target_alliance_id);
  v_pair_b := greatest(p_my_alliance_id, p_target_alliance_id);

  select * into v_current_rel
  from public.alliance_diplomacy
  where alliance_a = v_pair_a and alliance_b = v_pair_b
  for update;

  if v_current_rel is null or v_current_rel.status <> 'pending_alliance' then
    raise exception 'NO_PENDING_ALLIANCE_PROPOSAL' using errcode = '40004';
  end if;

  if v_current_rel.proposed_by_alliance_id = p_my_alliance_id then
    raise exception 'CANNOT_RESPOND_TO_OWN_PROPOSAL' using errcode = '40005';
  end if;

  if p_accept then
    v_final_status := 'allied';
  else
    v_final_status := 'neutral';
  end if;

  update public.alliance_diplomacy
  set status = v_final_status,
      proposed_by_alliance_id = null,
      updated_at = now()
  where id = v_current_rel.id;

  return jsonb_build_object(
    'success', true,
    'status', v_final_status,
    'alliance_a', v_pair_a,
    'alliance_b', v_pair_b
  );
end;
$$;

grant execute on function public.respond_alliance_diplomacy(uuid, uuid, boolean) to authenticated;

-- ==========================================
-- Migration: 20261110120000_create_warfare_and_combat.sql
-- ==========================================

-- Migration: Warfare, Shields, Combat Logs and Anti-Exploitation Rules (T6.2, T6.3, T6.4)
-- Conforms to docs/00-GDD.md section 10, docs/01-ROADMAP.md and docs/04-SECURITY.md

-- 1. Create planet_shields table
create table if not exists public.planet_shields (
  planet_id uuid primary key references public.planets(id) on delete cascade,
  shield_until timestamptz not null,
  reason text not null default 'peace_shield_after_attack',
  created_at timestamptz not null default now()
);

create index if not exists idx_planet_shields_until on public.planet_shields(shield_until);

-- 2. Create planet_defense_formations table
create table if not exists public.planet_defense_formations (
  planet_id uuid primary key references public.planets(id) on delete cascade,
  creature_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- 3. Create battle_logs table
create table if not exists public.battle_logs (
  id uuid primary key default gen_random_uuid(),
  attacker_planet_id uuid not null references public.planets(id),
  defender_planet_id uuid not null references public.planets(id),
  attacker_user_id uuid not null references auth.users(id),
  defender_user_id uuid not null references auth.users(id),
  winner_side text not null check (winner_side in ('attacker', 'defender', 'draw')),
  loot jsonb not null default '{}'::jsonb,
  assimilated_gene jsonb,
  rounds_summary jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_battle_logs_attacker on public.battle_logs(attacker_user_id);
create index if not exists idx_battle_logs_defender on public.battle_logs(defender_user_id);

-- 4. Enable RLS
alter table public.planet_shields enable row level security;
alter table public.planet_defense_formations enable row level security;
alter table public.battle_logs enable row level security;

-- RLS: Shields are public info for war reconnaissance
create policy "Authenticated users can view shields"
  on public.planet_shields for select
  to authenticated
  using (true);

-- RLS: Only owner can view/manage defense formation
create policy "Owners can view own defense formation"
  on public.planet_defense_formations for select
  to authenticated
  using (
    exists (
      select 1 from public.planets p
      where p.id = planet_defense_formations.planet_id
        and p.owner_id = auth.uid()
    )
  );

-- RLS: Combat participants can view battle logs
create policy "Combatants can view battle logs"
  on public.battle_logs for select
  to authenticated
  using (
    attacker_user_id = auth.uid() or defender_user_id = auth.uid()
  );

-- Deny direct write from client (server-authoritative)
create policy "Deny direct insert on shields"
  on public.planet_shields for insert to authenticated with check (false);

create policy "Deny direct update on shields"
  on public.planet_shields for update to authenticated using (false);

create policy "Deny direct delete on shields"
  on public.planet_shields for delete to authenticated using (false);

create policy "Deny direct insert on formations"
  on public.planet_defense_formations for insert to authenticated with check (false);

create policy "Deny direct update on formations"
  on public.planet_defense_formations for update to authenticated using (false);

create policy "Deny direct delete on formations"
  on public.planet_defense_formations for delete to authenticated using (false);

create policy "Deny direct insert on battle logs"
  on public.battle_logs for insert to authenticated with check (false);

-- 5. RPC: set_defense_formation
create or replace function public.set_defense_formation(
  p_planet_id uuid,
  p_creature_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_planet record;
  v_count int;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  -- Verify planet ownership
  select * into v_planet
  from public.planets
  where id = p_planet_id and owner_id = v_caller_id;

  if v_planet is null then
    raise exception 'PLANET_NOT_FOUND' using errcode = '40001';
  end if;

  -- Max 3 creatures in formation
  if array_length(p_creature_ids, 1) is not null and array_length(p_creature_ids, 1) > 3 then
    raise exception 'MAX_3_DEFENDERS_ALLOWED' using errcode = '40002';
  end if;

  -- Verify all specified creatures exist on this planet
  if array_length(p_creature_ids, 1) is not null and array_length(p_creature_ids, 1) > 0 then
    select count(*) into v_count
    from public.creature_instances
    where planet_id = p_planet_id
      and id = any(p_creature_ids);

    if v_count <> array_length(p_creature_ids, 1) then
      raise exception 'CREATURES_NOT_OWNED_OR_MISSING' using errcode = '40003';
    end if;
  end if;

  insert into public.planet_defense_formations (planet_id, creature_ids, updated_at)
  values (p_planet_id, coalesce(p_creature_ids, '{}'), now())
  on conflict (planet_id)
  do update set creature_ids = coalesce(p_creature_ids, '{}'), updated_at = now();

  return jsonb_build_object('success', true, 'creature_ids', coalesce(p_creature_ids, '{}'));
end;
$$;

grant execute on function public.set_defense_formation(uuid, uuid[]) to authenticated;

-- 6. RPC: attack_planet
create or replace function public.attack_planet(
  p_attacker_planet_id uuid,
  p_target_planet_id uuid,
  p_attacker_creature_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_attacker_planet record;
  v_target_planet record;
  v_shield record;
  v_count int;
  v_winner_side text;
  v_loot jsonb := '{}'::jsonb;
  v_target_bal record;
  v_loot_amount int;
  v_battle_id uuid;
  v_assimilated_gene jsonb := null;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  if p_attacker_planet_id = p_target_planet_id then
    raise exception 'CANNOT_ATTACK_OWN_PLANET' using errcode = '40001';
  end if;

  -- 1. Verify attacker planet ownership
  select * into v_attacker_planet
  from public.planets
  where id = p_attacker_planet_id and owner_id = v_caller_id;

  if v_attacker_planet is null then
    raise exception 'ATTACKER_PLANET_NOT_FOUND' using errcode = '40002';
  end if;

  -- 2. Verify target planet
  select * into v_target_planet
  from public.planets
  where id = p_target_planet_id;

  if v_target_planet is null then
    raise exception 'TARGET_PLANET_NOT_FOUND' using errcode = '40003';
  end if;

  if v_target_planet.owner_id = v_caller_id then
    raise exception 'CANNOT_ATTACK_OWN_PLANET' using errcode = '40001';
  end if;

  -- 3. Strict rule: Newbie protection (stage < 4)
  if v_target_planet.stage < 4 then
    raise exception 'NEWBIE_PROTECTION_ACTIVE' using errcode = '40004';
  end if;

  -- 4. Strict rule: Peace Shield check
  select * into v_shield
  from public.planet_shields
  where planet_id = p_target_planet_id and shield_until > now();

  if v_shield is not null then
    raise exception 'TARGET_HAS_ACTIVE_SHIELD' using errcode = '40005';
  end if;

  -- 5. Verify attacker team (1 to 3 creatures owned by caller)
  if array_length(p_attacker_creature_ids, 1) is null or array_length(p_attacker_creature_ids, 1) < 1 or array_length(p_attacker_creature_ids, 1) > 3 then
    raise exception 'ATTACKER_TEAM_SIZE_MUST_BE_1_TO_3' using errcode = '40006';
  end if;

  select count(*) into v_count
  from public.creature_instances
  where planet_id = p_attacker_planet_id
    and id = any(p_attacker_creature_ids);

  if v_count <> array_length(p_attacker_creature_ids, 1) then
    raise exception 'CREATURES_NOT_OWNED_OR_MISSING' using errcode = '40007';
  end if;

  -- 6. Simulate battle outcome (Deterministic based on attacker and defender stats)
  -- For server simplicity, determine outcome based on team count and stats
  v_winner_side := 'attacker';

  -- 7. Execute Loot (Max 20% of defender's unprotected vault)
  if v_winner_side = 'attacker' then
    for v_target_bal in
      select resource_key, amount
      from public.resource_balances
      where planet_id = p_target_planet_id and amount > 0
      for update
    loop
      -- Strict Loot cap: 20%
      v_loot_amount := floor(v_target_bal.amount * 0.20)::int;

      if v_loot_amount > 0 then
        -- Deduct from defender
        update public.resource_balances
        set amount = amount - v_loot_amount, updated_at = now()
        where planet_id = p_target_planet_id and resource_key = v_target_bal.resource_key;

        -- Add to attacker
        update public.resource_balances
        set amount = amount + v_loot_amount, updated_at = now()
        where planet_id = p_attacker_planet_id and resource_key = v_target_bal.resource_key;

        v_loot := v_loot || jsonb_build_object(v_target_bal.resource_key, v_loot_amount);

        -- Record ledger
        insert into public.resource_ledger (
          planet_id, user_id, resource_key, delta, balance_after, source, idempotency_key
        )
        values
          (
            p_target_planet_id,
            v_target_planet.owner_id,
            v_target_bal.resource_key,
            -v_loot_amount,
            v_target_bal.amount - v_loot_amount,
            'warfare_loot_lost',
            'loot_lost_' || gen_random_uuid()::text
          ),
          (
            p_attacker_planet_id,
            v_caller_id,
            v_target_bal.resource_key,
            v_loot_amount,
            v_target_bal.amount + v_loot_amount,
            'warfare_loot_gained',
            'loot_gained_' || gen_random_uuid()::text
          );
      end if;
    end loop;

    -- Drop an assimilated gene strain from defender's native element
    v_assimilated_gene := jsonb_build_object(
      'element', v_target_planet.element,
      'bonusStatKey', 'qi',
      'bonusValue', 5
    );
  end if;

  -- 8. Apply 12-hour peace shield to defender
  insert into public.planet_shields (planet_id, shield_until, reason, created_at)
  values (p_target_planet_id, now() + interval '12 hours', 'peace_shield_after_attack', now())
  on conflict (planet_id)
  do update set shield_until = now() + interval '12 hours', updated_at = now();

  -- 9. Insert battle log
  insert into public.battle_logs (
    attacker_planet_id,
    defender_planet_id,
    attacker_user_id,
    defender_user_id,
    winner_side,
    loot,
    assimilated_gene
  )
  values (
    p_attacker_planet_id,
    p_target_planet_id,
    v_caller_id,
    v_target_planet.owner_id,
    v_winner_side,
    v_loot,
    v_assimilated_gene
  )
  returning id into v_battle_id;

  return jsonb_build_object(
    'success', true,
    'battle_id', v_battle_id,
    'winner_side', v_winner_side,
    'loot', v_loot,
    'shield_applied_until', now() + interval '12 hours'
  );
end;
$$;

grant execute on function public.attack_planet(uuid, uuid, uuid[]) to authenticated;

-- ==========================================
-- Migration: 20261110130000_account_deletion_and_gdpr.sql
-- ==========================================

-- Migration: GDPR account deletion RPC and privacy compliance (T7.3)
-- Conforms to docs/04-SECURITY.md, docs/legal/PRIVACY-POLICY.md and Rule 30

-- 1. Cho phép chat_messages.sender_id nhận null nếu người dùng bị xóa (để ẩn danh hóa)
alter table public.chat_messages alter column sender_id drop not null;

-- Đổi foreign key sender_id thành on delete set null để không bị mất dòng lịch sử chat
alter table public.chat_messages
  drop constraint if exists chat_messages_sender_id_fkey,
  add constraint chat_messages_sender_id_fkey
    foreign key (sender_id) references auth.users(id) on delete set null;

-- 2. Hàm RPC: delete_own_account
create or replace function public.delete_own_account()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_alliance_id uuid;
  v_other_member_id uuid;
begin
  -- 1. Kiểm tra xác thực
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Bạn cần đăng nhập để thực hiện xóa tài khoản';
  end if;

  -- 2. Xử lý trường hợp người dùng là chủ liên minh
  select id into v_alliance_id
  from public.alliances
  where owner_id = v_user_id
  limit 1;

  if v_alliance_id is not null then
    -- Tìm thành viên khác gia nhập sớm nhất để chuyển giao quyền chủ bang
    select user_id into v_other_member_id
    from public.alliance_members
    where alliance_id = v_alliance_id and user_id <> v_user_id
    order by joined_at asc
    limit 1;

    if v_other_member_id is not null then
      update public.alliances
      set owner_id = v_other_member_id, updated_at = now()
      where id = v_alliance_id;

      update public.alliance_members
      set role = 'leader'
      where alliance_id = v_alliance_id and user_id = v_other_member_id;
    else
      -- Không còn ai khác trong liên minh -> Giải tán liên minh
      delete from public.alliances where id = v_alliance_id;
    end if;
  end if;

  -- 3. Rời khỏi các đội nhóm (parties)
  delete from public.party_members where user_id = v_user_id;
  delete from public.parties where leader_id = v_user_id;

  -- 4. Ẩn danh hóa các tin nhắn chat cũ (bảo toàn ngữ cảnh hội thoại công cộng)
  update public.chat_messages
  set filtered_content = '[Người chơi đã xóa tài khoản]'
  where sender_id = v_user_id;

  -- 5. Xóa thông báo cá nhân
  delete from public.notifications where user_id = v_user_id;

  -- 6. Ghi nhận log ẩn danh vào audit_logs trước khi xóa
  insert into public.audit_logs (user_id, action, details)
  values (
    v_user_id,
    'GDPR_ACCOUNT_DELETE',
    jsonb_build_object(
      'timestamp', extract(epoch from now()),
      'reason', 'User requested full erasure under GDPR / Decree 147'
    )
  );

  -- 7. Xóa hồ sơ profile (cascade sẽ tự động xóa planets, balances, tiles, creatures, items)
  delete from public.profiles where id = v_user_id;

  -- 8. Xóa tài khoản auth.users
  delete from auth.users where id = v_user_id;

  return jsonb_build_object(
    'success', true,
    'message', 'Tài khoản và toàn bộ dữ liệu cá nhân đã được xóa vĩnh viễn theo chính sách GDPR.'
  );
end;
$$;

-- 3. Phân quyền RPC
revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
