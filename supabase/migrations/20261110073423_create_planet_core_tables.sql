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
