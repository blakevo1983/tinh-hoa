-- Migration: Alliances, members, vault balances, ledger, and invitations (T4.1)
-- Conforms to docs/05-MULTIPLAYER-SOCIAL.md, docs/04-SECURITY.md and Rule 30

-- 1. Alliances table
create table if not exists public.alliances (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 3 and 30),
  tag text not null unique check (char_length(tag) between 2 and 6),
  leader_id uuid not null references auth.users(id) on delete restrict,
  level int not null default 1 check (level >= 1),
  member_cap int not null default 10 check (member_cap >= 1),
  description text check (char_length(description) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_alliances_leader on public.alliances(leader_id);

-- 2. Alliance Members table (Strict Invariant: 1 user can only belong to 1 alliance)
create table if not exists public.alliance_members (
  alliance_id uuid not null references public.alliances(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('leader', 'officer', 'member')),
  joined_at timestamptz not null default now(),
  last_withdrawn_at timestamptz,
  daily_withdrawn_amount int not null default 0,
  constraint pk_alliance_members primary key (alliance_id, user_id)
);

create index if not exists idx_alliance_members_user on public.alliance_members(user_id);

-- 3. Alliance Balances (Vault)
create table if not exists public.alliance_balances (
  alliance_id uuid not null references public.alliances(id) on delete cascade,
  resource_key text not null check (resource_key in ('metal', 'wood', 'water', 'fire', 'earth', 'light', 'dark', 'thunder')),
  amount int not null default 0 check (amount >= 0),
  updated_at timestamptz not null default now(),
  constraint pk_alliance_balances primary key (alliance_id, resource_key)
);

-- 4. Alliance Ledger (Append-only audit trail)
create table if not exists public.alliance_ledger (
  id uuid primary key default gen_random_uuid(),
  alliance_id uuid not null references public.alliances(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('deposit', 'withdraw', 'reward', 'fee')),
  resource_key text not null,
  delta int not null,
  balance_after int not null check (balance_after >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_alliance_ledger_alliance_time
  on public.alliance_ledger(alliance_id, created_at desc);

-- Prevent any UPDATE or DELETE on alliance_ledger
create or replace function public.prevent_alliance_ledger_tampering()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'ALLIANCE_LEDGER_IS_APPEND_ONLY' using errcode = '42501';
end;
$$;

create or replace trigger tr_prevent_alliance_ledger_tampering
before update or delete on public.alliance_ledger
for each row execute function public.prevent_alliance_ledger_tampering();

-- 5. Alliance Invitations / Join Requests
create table if not exists public.alliance_invitations (
  id uuid primary key default gen_random_uuid(),
  alliance_id uuid not null references public.alliances(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  inviter_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'expired')),
  created_at timestamptz not null default now(),
  constraint uq_alliance_user_pending unique (alliance_id, user_id)
);

create index if not exists idx_alliance_invitations_user
  on public.alliance_invitations(user_id, status);

-- 6. User Alliance Cooldowns (24h cooldown after leaving or getting kicked)
create table if not exists public.user_alliance_cooldowns (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cooldown_until timestamptz not null
);

-- 7. Enable RLS on all tables (Deny-by-default)
alter table public.alliances enable row level security;
alter table public.alliance_members enable row level security;
alter table public.alliance_balances enable row level security;
alter table public.alliance_ledger enable row level security;
alter table public.alliance_invitations enable row level security;
alter table public.user_alliance_cooldowns enable row level security;

revoke all on public.alliances from anon, authenticated;
revoke all on public.alliance_members from anon, authenticated;
revoke all on public.alliance_balances from anon, authenticated;
revoke all on public.alliance_ledger from anon, authenticated;
revoke all on public.alliance_invitations from anon, authenticated;
revoke all on public.user_alliance_cooldowns from anon, authenticated;

grant select on public.alliances to authenticated;
grant select on public.alliance_members to authenticated;
grant select on public.alliance_balances to authenticated;
grant select on public.alliance_ledger to authenticated;
grant select on public.alliance_invitations to authenticated;
grant select on public.user_alliance_cooldowns to authenticated;

-- Policies:
-- alliances & members: viewable by all authenticated users (directory/discovery)
create policy alliances_select on public.alliances
  for select
  to authenticated
  using (true);

create policy alliance_members_select on public.alliance_members
  for select
  to authenticated
  using (true);

-- alliance_balances: only members of this alliance can view vault balances
create policy alliance_balances_select on public.alliance_balances
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.alliance_members
      where alliance_id = public.alliance_balances.alliance_id
        and user_id = auth.uid()
    )
  );

-- alliance_ledger: only members of this alliance can inspect transactions
create policy alliance_ledger_select on public.alliance_ledger
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.alliance_members
      where alliance_id = public.alliance_ledger.alliance_id
        and user_id = auth.uid()
    )
  );

-- alliance_invitations: recipient or alliance leader/officer can view
create policy alliance_invitations_select on public.alliance_invitations
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.alliance_members
      where alliance_id = public.alliance_invitations.alliance_id
        and user_id = auth.uid()
        and role in ('leader', 'officer')
    )
  );

-- user_alliance_cooldowns: user can view their own cooldown
create policy user_alliance_cooldowns_select on public.user_alliance_cooldowns
  for select
  to authenticated
  using (auth.uid() = user_id);
