-- pgTAP test: 03_planet_core_rls_and_rpc.sql
-- Verify core tables RLS deny direct mutation, and commit_effects atomic behaviors

begin;
select plan(12);

-- 1. Setup test users and data
insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'planet_owner@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'other_user@test.com')
on conflict (id) do nothing;

insert into public.profiles (id, display_name)
values
  ('11111111-1111-1111-1111-111111111111', 'PlanetOwner'),
  ('22222222-2222-2222-2222-222222222222', 'OtherUser')
on conflict (id) do nothing;

-- Create initial planet for owner directly in migration setup
insert into public.planets (id, owner_id, name, primary_element, seed, grid_size, state_version)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'AquaWorld',
  'water',
  12345,
  12,
  0
) on conflict (id) do nothing;

-- Seed initial resource balance: 50 water
insert into public.resource_balances (planet_id, resource_key, amount, rate_per_sec, cap)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'water',
  50,
  1,
  500
) on conflict (planet_id, resource_key) do nothing;

-- 2. Test: Direct INSERT/UPDATE/DELETE from authenticated user is blocked
set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';

-- Direct insert into planets should throw 42501 permission denied
select throws_ok(
  $$ insert into public.planets (owner_id, name, primary_element, seed) values ('11111111-1111-1111-1111-111111111111', 'Hacked', 'fire', 99) $$,
  '42501',
  NULL,
  'Authenticated user cannot directly INSERT into planets'
);

-- Direct update into resource_balances should throw 42501
select throws_ok(
  $$ update public.resource_balances set amount = 99999 where planet_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  '42501',
  NULL,
  'Authenticated user cannot directly UPDATE resource_balances'
);

-- Direct delete from resource_ledger should throw 42501
select throws_ok(
  $$ delete from public.resource_ledger where planet_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  '42501',
  NULL,
  'Authenticated user cannot directly DELETE from resource_ledger'
);

-- Direct insert into buildings should throw 42501
select throws_ok(
  $$ insert into public.buildings (planet_id, kind, tile_x, tile_y) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cheat', 0, 0) $$,
  '42501',
  NULL,
  'Authenticated user cannot directly INSERT into buildings'
);

-- 3. Test: commit_effects - non-owner gets NOT_OWNER
set local "request.jwt.claim.sub" = '22222222-2222-2222-2222-222222222222';
select throws_ok(
  $$ select public.commit_effects(
       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
       0,
       '[]'::jsonb,
       '99999999-9999-9999-9999-999999999999'::uuid
     ) $$,
  '42501',
  'NOT_OWNER',
  'Non-owner cannot commit effects to another player planet'
);

-- 4. Test: commit_effects - owner with wrong expected_version gets VERSION_CONFLICT
set local "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';
select throws_ok(
  $$ select public.commit_effects(
       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
       99, -- wrong version (current is 0)
       '[]'::jsonb,
       '88888888-8888-8888-8888-888888888888'::uuid
     ) $$,
  '40001',
  NULL,
  'Commit with mismatched expected_version raises VERSION_CONFLICT'
);

-- 5. Test: commit_effects - insufficient resources is rejected (trying to spend 100 when only 50 available)
select throws_ok(
  $$ select public.commit_effects(
       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
       0,
       '[{"type": "resource_delta", "resource_key": "water", "delta": -100}]'::jsonb,
       '77777777-7777-7777-7777-777777777777'::uuid
     ) $$,
  '22003',
  NULL,
  'Spending more resources than balance raises INSUFFICIENT_RESOURCES'
);

-- 6. Test: commit_effects - successful effect application (spend 20 water, build harvester)
select lives_ok(
  $$ select public.commit_effects(
       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
       0,
       '[
          {"type": "resource_delta", "resource_key": "water", "delta": -20},
          {"type": "create_building", "kind": "harvester", "tile_x": 1, "tile_y": 1, "level": 1}
        ]'::jsonb,
       '66666666-6666-6666-6666-666666666666'::uuid
     ) $$,
  'Valid commit_effects execution succeeds and updates version'
);

-- Verify state updated: version is now 1, water is 30, building created, ledger recorded
set local role postgres;

select results_eq(
  $$ select state_version from public.planets where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  $$ values (1) $$,
  'Planet state_version incremented to 1'
);

select results_eq(
  $$ select amount from public.resource_balances where planet_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and resource_key = 'water' $$,
  $$ values (30::numeric) $$,
  'Water resource balance correctly decremented from 50 to 30'
);

select results_eq(
  $$ select kind from public.buildings where planet_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and tile_x = 1 and tile_y = 1 $$,
  $$ values ('harvester'::text) $$,
  'Building harvester was created at tile (1, 1)'
);

-- 7. Test: Idempotency - repeated call with same idempotency_key returns idempotent success without double deducting
set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';

select results_eq(
  $$ select (public.commit_effects(
       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
       1,
       '[{"type": "resource_delta", "resource_key": "water", "delta": -20}]'::jsonb,
       '66666666-6666-6666-6666-666666666666'::uuid -- same key as above
     ))->>'idempotent' $$,
  $$ values ('true'::text) $$,
  'Repeated call with same idempotency_key returns idempotent = true'
);

select finish();
rollback;
