begin;
select plan(10);

-- 1. Table existence and RLS enabled checks
select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'creatures'
  ),
  'RLS is enabled on public.creatures'
);

select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'items'
  ),
  'RLS is enabled on public.items'
);

select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'inventory'
  ),
  'RLS is enabled on public.inventory'
);

select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'codex_entries'
  ),
  'RLS is enabled on public.codex_entries'
);

-- 2. Setup Alice and Bob
insert into auth.users (id, email)
values
  ('44444444-4444-4444-4444-444444444444', 'alice_p2@test.com'),
  ('55555555-5555-5555-5555-555555555555', 'bob_p2@test.com')
on conflict (id) do nothing;

insert into public.profiles (id, display_name, locale)
values
  ('44444444-4444-4444-4444-444444444444', 'Alice P2', 'vi'),
  ('55555555-5555-5555-5555-555555555555', 'Bob P2', 'vi')
on conflict (id) do nothing;

-- 3. Setup Alice Planet, Creature, Item, Inventory, Codex
insert into public.planets (id, owner_id, name, primary_element, seed, stage, grid_size)
values (
  '77777777-7777-7777-7777-777777777777',
  '44444444-4444-4444-4444-444444444444',
  'Alice P2 Planet',
  'wood',
  555111,
  1,
  12
);

insert into public.creatures (id, planet_id, species_key, primary_element, stats, traits)
values (
  'c1111111-1111-1111-1111-111111111111',
  '77777777-7777-7777-7777-777777777777',
  'verdant_sprout',
  'wood',
  '{"qi": 25, "guard": 15, "agility": 20, "harmony": 30, "chaos": 5}'::jsonb,
  array['photosynthesis']
);

insert into public.items (id, def_key, genome)
values (
  'baaaaaaa-1111-1111-1111-111111111111',
  'ancient_wood',
  null
);

insert into public.inventory (planet_id, item_id, qty)
values (
  '77777777-7777-7777-7777-777777777777',
  'baaaaaaa-1111-1111-1111-111111111111',
  10
);

insert into public.codex_entries (player_id, kind, entry_key)
values (
  '44444444-4444-4444-4444-444444444444',
  'species',
  'verdant_sprout'
);

-- 4. Test Alice SELECT capabilities
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "44444444-4444-4444-4444-444444444444"}';

select results_eq(
  $$ select species_key from public.creatures where id = 'c1111111-1111-1111-1111-111111111111' $$,
  $$ values ('verdant_sprout'::text) $$,
  'Alice can view her own creature'
);

select results_eq(
  $$ select qty from public.inventory where planet_id = '77777777-7777-7777-7777-777777777777' $$,
  $$ values (10) $$,
  'Alice can view her planet inventory'
);

select results_eq(
  $$ select def_key from public.items where id = 'baaaaaaa-1111-1111-1111-111111111111' $$,
  $$ values ('ancient_wood'::text) $$,
  'Alice can view item definitions in her inventory'
);

select results_eq(
  $$ select entry_key from public.codex_entries where player_id = '44444444-4444-4444-4444-444444444444' $$,
  $$ values ('verdant_sprout'::text) $$,
  'Alice can view her own codex entry'
);

-- 5. Test Bob (Attacker) isolation via RLS
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "55555555-5555-5555-5555-555555555555"}';

select is_empty(
  $$ select * from public.creatures where planet_id = '77777777-7777-7777-7777-777777777777' $$,
  'Bob cannot view Alice creatures (RLS isolation)'
);

select is_empty(
  $$ select * from public.codex_entries where player_id = '44444444-4444-4444-4444-444444444444' $$,
  'Bob cannot view Alice codex entries (RLS isolation)'
);

select * from finish();
rollback;
