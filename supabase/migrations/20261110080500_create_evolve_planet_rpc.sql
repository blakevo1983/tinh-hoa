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
