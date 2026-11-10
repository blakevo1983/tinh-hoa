-- Migration: 20261110083000_create_creatures_and_items_tables.sql
-- Description: Core tables for creatures, items, inventory, and codex entries (Phase P2 - T2.1)

-- 1. creatures table
create table if not exists public.creatures (
  id uuid primary key default gen_random_uuid(),
  planet_id uuid not null references public.planets(id) on delete cascade,
  species_key text not null,
  primary_element text not null check (primary_element in ('metal','wood','water','fire','earth','light','dark','thunder')),
  secondary_element text check (secondary_element is null or secondary_element in ('metal','wood','water','fire','earth','light','dark','thunder')),
  stats jsonb not null, -- {qi, guard, agility, harmony, chaos}
  traits text[] not null default '{}' check (cardinality(traits) <= 3),
  generation int not null default 0 check (generation >= 0),
  inbreeding numeric not null default 0 check (inbreeding >= 0),
  parent_a uuid references public.creatures(id) on delete set null,
  parent_b uuid references public.creatures(id) on delete set null,
  born_at timestamptz not null default now()
);

create index if not exists idx_creatures_planet_id on public.creatures(planet_id);

-- 2. items table
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  def_key text not null,
  genome jsonb, -- null for basic raw items, structured for compound/legendary
  created_at timestamptz not null default now()
);

-- 3. inventory table
create table if not exists public.inventory (
  planet_id uuid not null references public.planets(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  qty int not null check (qty >= 0),
  primary key (planet_id, item_id)
);

create index if not exists idx_inventory_planet_id on public.inventory(planet_id);

-- 4. codex_entries table
create table if not exists public.codex_entries (
  player_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('species', 'item', 'recipe')),
  entry_key text not null,
  discovered_at timestamptz not null default now(),
  primary key (player_id, kind, entry_key)
);

create index if not exists idx_codex_entries_player on public.codex_entries(player_id);

-- 5. Enable Row Level Security (RLS) on all 4 tables (Deny-by-default)
alter table public.creatures enable row level security;
alter table public.items enable row level security;
alter table public.inventory enable row level security;
alter table public.codex_entries enable row level security;

-- Revoke all permissions from anon and authenticated
revoke all on public.creatures from anon, authenticated;
revoke all on public.items from anon, authenticated;
revoke all on public.inventory from anon, authenticated;
revoke all on public.codex_entries from anon, authenticated;

-- Grant SELECT only to authenticated users
grant select on public.creatures to authenticated;
grant select on public.items to authenticated;
grant select on public.inventory to authenticated;
grant select on public.codex_entries to authenticated;

-- 6. RLS Policies: Players can only view their own items, creatures, inventory, and codex entries
create policy "Users can view creatures on their planets"
  on public.creatures for select
  to authenticated
  using (
    planet_id in (
      select id from public.planets where owner_id = (select auth.uid())
    )
  );

create policy "Users can view inventory on their planets"
  on public.inventory for select
  to authenticated
  using (
    planet_id in (
      select id from public.planets where owner_id = (select auth.uid())
    )
  );

create policy "Users can view items in their inventory"
  on public.items for select
  to authenticated
  using (
    id in (
      select item_id from public.inventory where planet_id in (
        select id from public.planets where owner_id = (select auth.uid())
      )
    )
  );

create policy "Users can view their own codex entries"
  on public.codex_entries for select
  to authenticated
  using (
    player_id = (select auth.uid())
  );
