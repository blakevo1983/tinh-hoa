-- Migration: Alliance management RPCs with strict role enforcement (T4.2)
-- Conforms to docs/05-MULTIPLAYER-SOCIAL.md, docs/04-SECURITY.md and Rule 30

-- 1. RPC: create_alliance
create or replace function public.create_alliance(
  p_name text,
  p_tag text,
  p_description text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_alliance_id uuid;
  v_clean_name text;
  v_clean_tag text;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  -- Check if user is already in an alliance
  if exists (select 1 from public.alliance_members where user_id = v_caller_id) then
    raise exception 'ALREADY_IN_ALLIANCE' using errcode = '40001';
  end if;

  -- Check cooldown
  if exists (
    select 1
    from public.user_alliance_cooldowns
    where user_id = v_caller_id
      and cooldown_until > now()
  ) then
    raise exception 'COOLDOWN_ACTIVE' using errcode = '40002';
  end if;

  v_clean_name := trim(p_name);
  v_clean_tag := upper(trim(p_tag));

  if char_length(v_clean_name) < 3 or char_length(v_clean_name) > 30 then
    raise exception 'INVALID_ALLIANCE_NAME' using errcode = '40003';
  end if;

  if char_length(v_clean_tag) < 2 or char_length(v_clean_tag) > 6 then
    raise exception 'INVALID_ALLIANCE_TAG' using errcode = '40004';
  end if;

  -- Create Alliance record
  insert into public.alliances (name, tag, leader_id, description)
  values (v_clean_name, v_clean_tag, v_caller_id, p_description)
  returning id into v_alliance_id;

  -- Insert leader into alliance_members
  insert into public.alliance_members (alliance_id, user_id, role)
  values (v_alliance_id, v_caller_id, 'leader');

  -- Initialize 8 elemental balances for the alliance vault
  insert into public.alliance_balances (alliance_id, resource_key, amount)
  values
    (v_alliance_id, 'metal', 0),
    (v_alliance_id, 'wood', 0),
    (v_alliance_id, 'water', 0),
    (v_alliance_id, 'fire', 0),
    (v_alliance_id, 'earth', 0),
    (v_alliance_id, 'light', 0),
    (v_alliance_id, 'dark', 0),
    (v_alliance_id, 'thunder', 0);

  -- Create dedicated chat channel for the alliance
  insert into public.chat_channels (id, kind, name)
  values ('alliance:' || v_alliance_id::text, 'alliance', v_clean_name || ' [' || v_clean_tag || ']')
  on conflict (id) do nothing;

  insert into public.chat_members (channel_id, user_id, role)
  values ('alliance:' || v_alliance_id::text, v_caller_id, 'owner')
  on conflict (channel_id, user_id) do nothing;

  return jsonb_build_object(
    'success', true,
    'alliance_id', v_alliance_id,
    'name', v_clean_name,
    'tag', v_clean_tag
  );
end;
$$;

grant execute on function public.create_alliance(text, text, text) to authenticated;

-- 2. RPC: invite_or_accept_member
create or replace function public.invite_or_accept_member(
  p_alliance_id uuid,
  p_target_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_caller_role text;
  v_member_count int;
  v_member_cap int;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  -- Verify caller role (leader or officer)
  select role into v_caller_role
  from public.alliance_members
  where alliance_id = p_alliance_id and user_id = v_caller_id;

  if v_caller_role is null or v_caller_role not in ('leader', 'officer') then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;

  -- Check if target user already belongs to an alliance
  if exists (select 1 from public.alliance_members where user_id = p_target_user_id) then
    raise exception 'TARGET_ALREADY_IN_ALLIANCE' using errcode = '40005';
  end if;

  -- Check if target user has cooldown
  if exists (
    select 1
    from public.user_alliance_cooldowns
    where user_id = p_target_user_id and cooldown_until > now()
  ) then
    raise exception 'TARGET_IN_COOLDOWN' using errcode = '40006';
  end if;

  -- Check member cap
  select count(*), max(a.member_cap)
  into v_member_count, v_member_cap
  from public.alliance_members m
  join public.alliances a on a.id = m.alliance_id
  where m.alliance_id = p_alliance_id;

  if v_member_count >= v_member_cap then
    raise exception 'ALLIANCE_FULL' using errcode = '40007';
  end if;

  -- Insert member
  insert into public.alliance_members (alliance_id, user_id, role)
  values (p_alliance_id, p_target_user_id, 'member');

  -- Add to alliance chat channel
  insert into public.chat_members (channel_id, user_id, role)
  values ('alliance:' || p_alliance_id::text, p_target_user_id, 'member')
  on conflict (channel_id, user_id) do nothing;

  return jsonb_build_object(
    'success', true,
    'alliance_id', p_alliance_id,
    'user_id', p_target_user_id,
    'role', 'member'
  );
end;
$$;

grant execute on function public.invite_or_accept_member(uuid, uuid) to authenticated;

-- 3. RPC: kick_member
create or replace function public.kick_member(
  p_alliance_id uuid,
  p_target_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_caller_role text;
  v_target_role text;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  if v_caller_id = p_target_user_id then
    raise exception 'CANNOT_KICK_SELF' using errcode = '40008';
  end if;

  select role into v_caller_role
  from public.alliance_members
  where alliance_id = p_alliance_id and user_id = v_caller_id;

  if v_caller_role is null or v_caller_role not in ('leader', 'officer') then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;

  select role into v_target_role
  from public.alliance_members
  where alliance_id = p_alliance_id and user_id = p_target_user_id;

  if v_target_role is null then
    raise exception 'TARGET_NOT_A_MEMBER' using errcode = '40009';
  end if;

  -- Strict rule: Officer CANNOT kick another officer or leader
  if v_caller_role = 'officer' and v_target_role in ('officer', 'leader') then
    raise exception 'CANNOT_KICK_OFFICER_OR_LEADER' using errcode = '40010';
  end if;

  -- Delete member
  delete from public.alliance_members
  where alliance_id = p_alliance_id and user_id = p_target_user_id;

  -- Remove from chat channel
  delete from public.chat_members
  where channel_id = 'alliance:' || p_alliance_id::text and user_id = p_target_user_id;

  -- Apply 24h cooldown to kicked user
  insert into public.user_alliance_cooldowns (user_id, cooldown_until)
  values (p_target_user_id, now() + interval '24 hours')
  on conflict (user_id)
  do update set cooldown_until = now() + interval '24 hours';

  return jsonb_build_object('success', true, 'kicked_id', p_target_user_id);
end;
$$;

grant execute on function public.kick_member(uuid, uuid) to authenticated;

-- 4. RPC: promote_or_demote_member
create or replace function public.promote_or_demote_member(
  p_alliance_id uuid,
  p_target_user_id uuid,
  p_new_role text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_caller_role text;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  if p_new_role not in ('officer', 'member') then
    raise exception 'INVALID_ROLE' using errcode = '40011';
  end if;

  -- Only leader can promote or demote members
  select role into v_caller_role
  from public.alliance_members
  where alliance_id = p_alliance_id and user_id = v_caller_id;

  if v_caller_role <> 'leader' then
    raise exception 'ONLY_LEADER_CAN_MANAGE_ROLES' using errcode = '42501';
  end if;

  if v_caller_id = p_target_user_id then
    raise exception 'CANNOT_DEMOTE_LEADER_SELF' using errcode = '40012';
  end if;

  update public.alliance_members
  set role = p_new_role
  where alliance_id = p_alliance_id and user_id = p_target_user_id;

  return jsonb_build_object(
    'success', true,
    'user_id', p_target_user_id,
    'new_role', p_new_role
  );
end;
$$;

grant execute on function public.promote_or_demote_member(uuid, uuid, text) to authenticated;

-- 5. RPC: transfer_leadership
create or replace function public.transfer_leadership(
  p_alliance_id uuid,
  p_new_leader_id uuid
)
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

  -- Verify caller is current leader
  if not exists (
    select 1
    from public.alliances
    where id = p_alliance_id and leader_id = v_caller_id
  ) then
    raise exception 'ONLY_LEADER_CAN_TRANSFER' using errcode = '42501';
  end if;

  if v_caller_id = p_new_leader_id then
    raise exception 'CANNOT_TRANSFER_TO_SELF' using errcode = '40013';
  end if;

  -- Verify new leader is a member of the alliance
  if not exists (
    select 1
    from public.alliance_members
    where alliance_id = p_alliance_id and user_id = p_new_leader_id
  ) then
    raise exception 'TARGET_NOT_A_MEMBER' using errcode = '40009';
  end if;

  -- Update alliance leader
  update public.alliances
  set leader_id = p_new_leader_id, updated_at = now()
  where id = p_alliance_id;

  -- Old leader becomes officer
  update public.alliance_members
  set role = 'officer'
  where alliance_id = p_alliance_id and user_id = v_caller_id;

  -- New leader becomes leader
  update public.alliance_members
  set role = 'leader'
  where alliance_id = p_alliance_id and user_id = p_new_leader_id;

  return jsonb_build_object(
    'success', true,
    'alliance_id', p_alliance_id,
    'new_leader_id', p_new_leader_id
  );
end;
$$;

grant execute on function public.transfer_leadership(uuid, uuid) to authenticated;

-- 6. RPC: leave_alliance
create or replace function public.leave_alliance(p_alliance_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_caller_role text;
  v_other_members_count int;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  select role into v_caller_role
  from public.alliance_members
  where alliance_id = p_alliance_id and user_id = v_caller_id;

  if v_caller_role is null then
    raise exception 'NOT_A_MEMBER' using errcode = '40014';
  end if;

  if v_caller_role = 'leader' then
    select count(*) into v_other_members_count
    from public.alliance_members
    where alliance_id = p_alliance_id and user_id <> v_caller_id;

    if v_other_members_count > 0 then
      raise exception 'LEADER_MUST_TRANSFER_BEFORE_LEAVING' using errcode = '40015';
    else
      -- Sole member disband
      delete from public.alliances where id = p_alliance_id;
    end if;
  else
    delete from public.alliance_members
    where alliance_id = p_alliance_id and user_id = v_caller_id;

    delete from public.chat_members
    where channel_id = 'alliance:' || p_alliance_id::text and user_id = v_caller_id;

    -- Apply 24h cooldown to leaving user
    insert into public.user_alliance_cooldowns (user_id, cooldown_until)
    values (v_caller_id, now() + interval '24 hours')
    on conflict (user_id)
    do update set cooldown_until = now() + interval '24 hours';
  end if;

  return jsonb_build_object('success', true, 'left_alliance_id', p_alliance_id);
end;
$$;

grant execute on function public.leave_alliance(uuid) to authenticated;
