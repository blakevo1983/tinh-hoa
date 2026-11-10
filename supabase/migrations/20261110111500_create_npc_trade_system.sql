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
