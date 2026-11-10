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
