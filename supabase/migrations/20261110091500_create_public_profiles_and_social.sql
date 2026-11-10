-- Migration: Social features - friendships, blocks, and expanded public_profiles view (T3.1)
-- Conforms to docs/05-MULTIPLAYER-SOCIAL.md, docs/04-SECURITY.md and Rule 30

-- 1. Upgrade public_profiles view with created_at to allow checking account age (>= 24h)
create or replace view public.public_profiles as
  select
    p.id,
    p.display_name,
    p.created_at,
    p.last_seen_at
  from public.profiles p;

grant select on public.public_profiles to anon, authenticated;

-- 2. Friendships table
create table if not exists public.friendships (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pk_friendships primary key (user_id, friend_id),
  constraint chk_friendships_no_self check (user_id <> friend_id)
);

create index if not exists idx_friendships_friend on public.friendships(friend_id);
create index if not exists idx_friendships_status on public.friendships(status);

-- 3. User blocks table (two-way block semantics for privacy)
create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  constraint pk_user_blocks primary key (blocker_id, blocked_id),
  constraint chk_user_blocks_no_self check (blocker_id <> blocked_id)
);

create index if not exists idx_user_blocks_blocked on public.user_blocks(blocked_id);

-- 4. Enable RLS immediately (deny-by-default)
alter table public.friendships enable row level security;
alter table public.user_blocks enable row level security;

revoke all on public.friendships from anon, authenticated;
revoke all on public.user_blocks from anon, authenticated;

grant select on public.friendships to authenticated;
grant select on public.user_blocks to authenticated;

-- Policies for friendships:
-- Either participant can see the friendship record
create policy friendships_select on public.friendships
  for select
  to authenticated
  using (auth.uid() = user_id or auth.uid() = friend_id);

-- Policies for user_blocks:
-- Only blocker can see who they have blocked (blocked user cannot inspect blocks against them to prevent retaliation)
create policy user_blocks_select on public.user_blocks
  for select
  to authenticated
  using (auth.uid() = blocker_id);

-- 5. Helper function: is_blocked (two-way check)
create or replace function public.is_blocked(p_user_a uuid, p_user_b uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_a is null or p_user_b is null then
    return false;
  end if;

  return exists (
    select 1
    from public.user_blocks
    where (blocker_id = p_user_a and blocked_id = p_user_b)
       or (blocker_id = p_user_b and blocked_id = p_user_a)
  );
end;
$$;

grant execute on function public.is_blocked(uuid, uuid) to authenticated;

-- 6. RPC: send_friend_request
create or replace function public.send_friend_request(p_friend_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_id uuid;
  v_existing_status text;
begin
  v_sender_id := auth.uid();
  if v_sender_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  if v_sender_id = p_friend_id then
    raise exception 'CANNOT_FRIEND_SELF' using errcode = '40001';
  end if;

  -- Verify target user exists
  if not exists (select 1 from public.profiles where id = p_friend_id) then
    raise exception 'USER_NOT_FOUND' using errcode = '40004';
  end if;

  -- Check if blocked in either direction
  if public.is_blocked(v_sender_id, p_friend_id) then
    raise exception 'USER_BLOCKED' using errcode = '42501';
  end if;

  -- Check existing friendship record in either direction
  select status into v_existing_status
  from public.friendships
  where (user_id = v_sender_id and friend_id = p_friend_id)
     or (user_id = p_friend_id and friend_id = v_sender_id);

  if v_existing_status = 'accepted' then
    raise exception 'ALREADY_FRIENDS' using errcode = '40002';
  elsif v_existing_status = 'pending' then
    raise exception 'REQUEST_ALREADY_PENDING' using errcode = '40003';
  end if;

  -- Upsert friendship request
  insert into public.friendships (user_id, friend_id, status, updated_at)
  values (v_sender_id, p_friend_id, 'pending', now())
  on conflict (user_id, friend_id)
  do update set status = 'pending', updated_at = now();

  return jsonb_build_object(
    'success', true,
    'sender_id', v_sender_id,
    'friend_id', p_friend_id,
    'status', 'pending'
  );
end;
$$;

grant execute on function public.send_friend_request(uuid) to authenticated;

-- 7. RPC: respond_friend_request
create or replace function public.respond_friend_request(p_sender_id uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recipient_id uuid;
  v_new_status text;
begin
  v_recipient_id := auth.uid();
  if v_recipient_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.friendships
    where user_id = p_sender_id
      and friend_id = v_recipient_id
      and status = 'pending'
  ) then
    raise exception 'REQUEST_NOT_FOUND' using errcode = '40004';
  end if;

  v_new_status := case when p_accept then 'accepted' else 'rejected' end;

  update public.friendships
  set status = v_new_status,
      updated_at = now()
  where user_id = p_sender_id
    and friend_id = v_recipient_id;

  return jsonb_build_object(
    'success', true,
    'sender_id', p_sender_id,
    'friend_id', v_recipient_id,
    'status', v_new_status
  );
end;
$$;

grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;

-- 8. RPC: remove_friend
create or replace function public.remove_friend(p_target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  delete from public.friendships
  where (user_id = v_caller_id and friend_id = p_target_id)
     or (user_id = p_target_id and friend_id = v_caller_id);

  return jsonb_build_object('success', true, 'removed_id', p_target_id);
end;
$$;

grant execute on function public.remove_friend(uuid) to authenticated;

-- 9. RPC: block_user and unblock_user
create or replace function public.block_user(p_target_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  if v_caller_id = p_target_id then
    raise exception 'CANNOT_BLOCK_SELF' using errcode = '40001';
  end if;

  -- Break any friendships immediately
  delete from public.friendships
  where (user_id = v_caller_id and friend_id = p_target_id)
     or (user_id = p_target_id and friend_id = v_caller_id);

  insert into public.user_blocks (blocker_id, blocked_id, reason)
  values (v_caller_id, p_target_id, p_reason)
  on conflict (blocker_id, blocked_id) do nothing;

  return jsonb_build_object('success', true, 'blocked_id', p_target_id);
end;
$$;

grant execute on function public.block_user(uuid, text) to authenticated;

create or replace function public.unblock_user(p_target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  delete from public.user_blocks
  where blocker_id = v_caller_id and blocked_id = p_target_id;

  return jsonb_build_object('success', true, 'unblocked_id', p_target_id);
end;
$$;

grant execute on function public.unblock_user(uuid) to authenticated;
