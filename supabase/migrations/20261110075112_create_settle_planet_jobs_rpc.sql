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
