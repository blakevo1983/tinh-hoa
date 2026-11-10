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
