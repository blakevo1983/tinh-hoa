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
