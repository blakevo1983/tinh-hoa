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
