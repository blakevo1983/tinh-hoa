-- Migration: Chat system, channels, messages, reports and notifications (T3.2)
-- Conforms to docs/05-MULTIPLAYER-SOCIAL.md, docs/04-SECURITY.md and Rule 30

-- 1. Chat Channels table
create table if not exists public.chat_channels (
  id text primary key, -- e.g. 'global', 'planet:<planet_id>', 'dm:<min_uuid>:<max_uuid>'
  kind text not null check (kind in ('global', 'planet', 'dm', 'alliance', 'party', 'system')),
  name text,
  created_at timestamptz not null default now()
);

-- Seed default global channel
insert into public.chat_channels (id, kind, name)
values ('global', 'global', 'Liên Tinh (Global)')
on conflict (id) do nothing;

-- 2. Chat Members table (for planet, alliance, party, private groups)
create table if not exists public.chat_members (
  channel_id text not null references public.chat_channels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  muted_until timestamptz,
  joined_at timestamptz not null default now(),
  constraint pk_chat_members primary key (channel_id, user_id)
);

create index if not exists idx_chat_members_user on public.chat_members(user_id);

-- 3. Chat Messages table (Append-only, server-inserted, cursor-indexed)
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id text not null references public.chat_channels(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  client_msg_id text not null,
  content text not null check (char_length(content) between 1 and 300),
  filtered_content text not null,
  created_at timestamptz not null default now(),
  constraint uq_channel_client_msg unique (channel_id, sender_id, client_msg_id)
);

create index if not exists idx_chat_messages_channel_created
  on public.chat_messages(channel_id, created_at desc);

-- 4. Chat Reports table
create table if not exists public.chat_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid references public.chat_messages(id) on delete set null,
  reason text not null check (char_length(reason) between 3 and 500),
  context_snapshot jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'investigating', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_reports_status on public.chat_reports(status);
create index if not exists idx_chat_reports_reported on public.chat_reports(reported_user_id);

-- 5. Notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('friend_request', 'friend_accepted', 'chat_mention', 'chat_dm', 'building_completed', 'attack_alert', 'system')),
  title text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_recipient_unread
  on public.notifications(recipient_id, read, created_at desc);

-- 6. Helper function: is_channel_member
create or replace function public.is_channel_member(p_channel_id text, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind text;
  v_part1 text;
  v_part2 text;
  v_planet_id uuid;
begin
  if p_channel_id is null or p_user_id is null then
    return false;
  end if;

  -- 1. Global channel: open to any authenticated user with an account not banned
  if p_channel_id = 'global' then
    return exists (
      select 1
      from public.profiles
      where id = p_user_id
        and (banned_until is null or banned_until < now())
    );
  end if;

  -- 2. DM channel: format 'dm:<uid1>:<uid2>' (sorted)
  if p_channel_id like 'dm:%' then
    v_part1 := split_part(p_channel_id, ':', 2);
    v_part2 := split_part(p_channel_id, ':', 3);

    -- User must be one of the two participants
    if p_user_id::text <> v_part1 and p_user_id::text <> v_part2 then
      return false;
    end if;

    -- Neither participant can be blocked
    if public.is_blocked(v_part1::uuid, v_part2::uuid) then
      return false;
    end if;

    return true;
  end if;

  -- 3. Planet channel: format 'planet:<planet_id>'
  if p_channel_id like 'planet:%' then
    begin
      v_planet_id := split_part(p_channel_id, ':', 2)::uuid;
    exception when others then
      return false;
    end;

    -- Owner of the planet is always a member
    if exists (
      select 1
      from public.planets
      where id = v_planet_id
        and owner_id = p_user_id
    ) then
      return true;
    end if;

    -- Or explicitly added to chat_members
    return exists (
      select 1
      from public.chat_members
      where channel_id = p_channel_id
        and user_id = p_user_id
    );
  end if;

  -- 4. Other channels (alliance, party): explicit membership check
  return exists (
    select 1
    from public.chat_members
    where channel_id = p_channel_id
      and user_id = p_user_id
  );
end;
$$;

grant execute on function public.is_channel_member(text, uuid) to authenticated;

-- 7. Enable RLS on all tables (Deny-by-default)
alter table public.chat_channels enable row level security;
alter table public.chat_members enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_reports enable row level security;
alter table public.notifications enable row level security;

revoke all on public.chat_channels from anon, authenticated;
revoke all on public.chat_members from anon, authenticated;
revoke all on public.chat_messages from anon, authenticated;
revoke all on public.chat_reports from anon, authenticated;
revoke all on public.notifications from anon, authenticated;

grant select on public.chat_channels to authenticated;
grant select on public.chat_members to authenticated;
grant select on public.chat_messages to authenticated;
grant insert on public.chat_reports to authenticated;
grant select, update (read) on public.notifications to authenticated;

-- Policies:
-- chat_channels: select allowed if member
create policy chat_channels_select on public.chat_channels
  for select
  to authenticated
  using (public.is_channel_member(id, auth.uid()));

-- chat_members: select allowed if member of that channel
create policy chat_members_select on public.chat_members
  for select
  to authenticated
  using (public.is_channel_member(channel_id, auth.uid()));

-- chat_messages: SELECT only for channel members. INSERT/UPDATE/DELETE completely denied to client!
create policy chat_messages_select on public.chat_messages
  for select
  to authenticated
  using (public.is_channel_member(channel_id, auth.uid()));

-- chat_reports: Users can insert reports, view their own reports
create policy chat_reports_insert on public.chat_reports
  for insert
  to authenticated
  with check (auth.uid() = reporter_id);

create policy chat_reports_select on public.chat_reports
  for select
  to authenticated
  using (auth.uid() = reporter_id);

-- notifications: User can only select and mark their own notifications as read
create policy notifications_select on public.notifications
  for select
  to authenticated
  using (auth.uid() = recipient_id);

create policy notifications_update on public.notifications
  for update
  to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

-- 8. RPC: get_channel_messages (cursor-based pagination)
create or replace function public.get_channel_messages(
  p_channel_id text,
  p_before_created_at timestamptz default null,
  p_limit int default 50
)
returns table (
  id uuid,
  channel_id text,
  sender_id uuid,
  sender_name text,
  content text,
  filtered_content text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_effective_limit int;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  if not public.is_channel_member(p_channel_id, v_caller_id) then
    raise exception 'NOT_A_CHANNEL_MEMBER' using errcode = '42501';
  end if;

  v_effective_limit := least(greatest(p_limit, 1), 50);

  return query
  select
    m.id,
    m.channel_id,
    m.sender_id,
    p.display_name as sender_name,
    m.content,
    m.filtered_content,
    m.created_at
  from public.chat_messages m
  left join public.profiles p on p.id = m.sender_id
  where m.channel_id = p_channel_id
    and (p_before_created_at is null or m.created_at < p_before_created_at)
  order by m.created_at desc
  limit v_effective_limit;
end;
$$;

grant execute on function public.get_channel_messages(text, timestamptz, int) to authenticated;

-- 9. RPC: mark_notification_read
create or replace function public.mark_notification_read(p_notification_id uuid)
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

  update public.notifications
  set read = true
  where id = p_notification_id
    and recipient_id = v_caller_id;

  return jsonb_build_object('success', true, 'notification_id', p_notification_id);
end;
$$;

grant execute on function public.mark_notification_read(uuid) to authenticated;
