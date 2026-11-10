begin;
select plan(9);

-- 1. Setup test users in auth.users
insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'alice_evo@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob_evo@test.com')
on conflict (id) do nothing;

insert into public.profiles (id, display_name, locale)
values
  ('11111111-1111-1111-1111-111111111111', 'Alice Evo', 'vi'),
  ('22222222-2222-2222-2222-222222222222', 'Bob Evo', 'vi')
on conflict (id) do nothing;

-- 2. Setup Alice planet (Stage 1, 12x12 grid)
insert into public.planets (id, owner_id, name, primary_element, seed, state_version, stage, grid_size)
values (
  '99999999-9999-9999-9999-999999999999',
  '11111111-1111-1111-1111-111111111111',
  'Alice Planet Evo',
  'metal',
  1234567890,
  1,
  1,
  12
);

-- Insert 144 initial tiles for Alice planet
insert into public.planet_tiles (planet_id, x, y, element, biome, richness)
select
  '99999999-9999-9999-9999-999999999999',
  (s % 12)::smallint,
  (s / 12)::smallint,
  'metal',
  'iron_crags',
  2
from generate_series(0, 143) as s;

-- 3. Test 1: evolve fails when requirements (harvester & storage) are not met
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "11111111-1111-1111-1111-111111111111"}';

select throws_ok(
  $$
    select public.evolve_planet(
      '99999999-9999-9999-9999-999999999999'::uuid,
      1,
      '[{"x": 12, "y": 0, "element": "metal", "biome": "iron_crags", "richness": 2}]'::jsonb,
      'a0000001-0000-0000-0000-000000000001'::uuid
    );
  $$,
  '22023',
  NULL,
  'Test 1: evolve fails if required buildings (harvester & storage) are missing'
);

-- Back to postgres to insert required buildings and insufficient resources
set local role postgres;
insert into public.buildings (planet_id, kind, level, tile_x, tile_y)
values
  ('99999999-9999-9999-9999-999999999999', 'harvester', 1, 0, 0),
  ('99999999-9999-9999-9999-999999999999', 'storage', 1, 0, 1);

insert into public.resource_balances (planet_id, resource_key, amount, cap, rate_per_sec)
values ('99999999-9999-9999-9999-999999999999', 'metal', 50, 1000, 1);

-- 4. Test 2: evolve fails when resource amount < 100
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "11111111-1111-1111-1111-111111111111"}';

select throws_ok(
  $$
    select public.evolve_planet(
      '99999999-9999-9999-9999-999999999999'::uuid,
      1,
      '[{"x": 12, "y": 0, "element": "metal", "biome": "iron_crags", "richness": 2}]'::jsonb,
      'a0000002-0000-0000-0000-000000000002'::uuid
    );
  $$,
  '22003',
  NULL,
  'Test 2: evolve fails if balance < 100'
);

-- Back to postgres to grant 150 resources to Alice
set local role postgres;
update public.resource_balances
set amount = 150
where planet_id = '99999999-9999-9999-9999-999999999999' and resource_key = 'metal';

-- 5. Test 3: IDOR - Bob tries to evolve Alice planet
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "22222222-2222-2222-2222-222222222222"}';

select throws_ok(
  $$
    select public.evolve_planet(
      '99999999-9999-9999-9999-999999999999'::uuid,
      1,
      '[{"x": 12, "y": 0, "element": "metal", "biome": "iron_crags", "richness": 2}]'::jsonb,
      'b0000001-0000-0000-0000-000000000001'::uuid
    );
  $$,
  '42501',
  'NOT_OWNER',
  'Test 3: foreign user cannot evolve planet (NOT_OWNER)'
);

-- 6. Test 4: Alice evolves planet successfully
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "11111111-1111-1111-1111-111111111111"}';

-- Prepare 112 expansion tiles (from 144 to 255)
do $$
declare
  v_tiles jsonb := '[]'::jsonb;
  x int;
  y int;
begin
  for y in 0..15 loop
    for x in 0..15 loop
      if x >= 12 or y >= 12 then
        v_tiles := v_tiles || jsonb_build_object(
          'x', x,
          'y', y,
          'element', 'metal',
          'biome', 'iron_crags',
          'richness', 2
        );
      end if;
    end loop;
  end loop;

  perform public.evolve_planet(
    '99999999-9999-9999-9999-999999999999'::uuid,
    1,
    v_tiles,
    'a0000003-0000-0000-0000-000000000003'::uuid
  );
end;
$$;

set local role postgres;

-- Verify stage = 2
select results_eq(
  $$ select stage, grid_size, state_version from public.planets where id = '99999999-9999-9999-9999-999999999999' $$,
  $$ values (2::smallint, 16::smallint, 2) $$,
  'Test 4: planet stage is 2, grid_size is 16, state_version incremented'
);

-- Verify tile count is now 256 (144 + 112)
select results_eq(
  $$ select count(*)::int from public.planet_tiles where planet_id = '99999999-9999-9999-9999-999999999999' $$,
  $$ values (256) $$,
  'Test 5: total planet tiles expanded to 256'
);

-- Verify 100 resources deducted (150 - 100 = 50)
select results_eq(
  $$ select amount from public.resource_balances where planet_id = '99999999-9999-9999-9999-999999999999' and resource_key = 'metal' $$,
  $$ values (50::numeric) $$,
  'Test 6: 100 metal resources deducted'
);

-- Verify ledger recorded
select results_eq(
  $$ select delta, reason from public.resource_ledger where planet_id = '99999999-9999-9999-9999-999999999999' and idempotency_key = 'a0000003-0000-0000-0000-000000000003' $$,
  $$ values (-100::numeric, 'planet_evolve_stage_2'::text) $$,
  'Test 7: ledger record logged correctly'
);

-- 7. Test 8: Replay with same idempotency_key returns idempotent without deducting again
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "11111111-1111-1111-1111-111111111111"}';

select results_eq(
  $$
    select (public.evolve_planet(
      '99999999-9999-9999-9999-999999999999'::uuid,
      2,
      '[]'::jsonb,
      'a0000003-0000-0000-0000-000000000003'::uuid
    ))->>'idempotent'
  $$,
  $$ values ('true') $$,
  'Test 8: replay with same idempotency key is idempotent'
);

-- 8. Test 9: Trying to evolve again with new idempotency_key fails INVALID_STAGE
select throws_ok(
  $$
    select public.evolve_planet(
      '99999999-9999-9999-9999-999999999999'::uuid,
      2,
      '[]'::jsonb,
      'a0000004-0000-0000-0000-000000000004'::uuid
    );
  $$,
  '22023',
  NULL,
  'Test 9: cannot evolve planet that is already stage 2'
);

select * from finish();
rollback;
