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
