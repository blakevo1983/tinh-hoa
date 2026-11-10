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
