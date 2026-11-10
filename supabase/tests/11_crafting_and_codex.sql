begin;
select plan(7);

-- 1. Setup Alice and Bob
insert into auth.users (id, email)
values
  ('88888888-8888-8888-8888-888888888881', 'alice_craft@test.com'),
  ('88888888-8888-8888-8888-888888888882', 'bob_craft@test.com')
on conflict (id) do nothing;

insert into public.profiles (id, display_name, locale)
values
  ('88888888-8888-8888-8888-888888888881', 'Alice Craft', 'vi'),
  ('88888888-8888-8888-8888-888888888882', 'Bob Craft', 'vi')
on conflict (id) do nothing;

-- 2. Setup Alice Planet
insert into public.planets (id, owner_id, name, primary_element, seed, stage, grid_size)
values (
  '99999999-cccc-9999-9999-999999999999',
  '88888888-8888-8888-8888-888888888881',
  'Alice Craft Planet',
  'metal',
  111222,
  1,
  12
);

insert into public.resource_balances (planet_id, resource_key, amount, cap, rate_per_sec)
values ('99999999-cccc-9999-9999-999999999999', 'metal', 100, 1000, 0);

insert into public.buildings (planet_id, kind, level, tile_x, tile_y)
values ('99999999-cccc-9999-9999-999999999999', 'crafting_furnace', 1, 2, 2);

-- Insert raw items into items table
insert into public.items (id, def_key)
values
  ('b1111111-2222-3333-4444-555555555551', 'iron_ore'),
  ('b1111111-2222-3333-4444-555555555552', 'flame_coal');

insert into public.inventory (planet_id, item_id, qty)
values
  ('99999999-cccc-9999-9999-999999999999', 'b1111111-2222-3333-4444-555555555551', 10),
  ('99999999-cccc-9999-9999-999999999999', 'b1111111-2222-3333-4444-555555555552', 5);

-- 3. Test 1: IDOR - Bob cannot craft on Alice planet
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "88888888-8888-8888-8888-888888888882"}'; -- Bob

select throws_ok(
  $$
    select public.commit_effects(
      '99999999-cccc-9999-9999-999999999999'::uuid,
      0,
      '[{"type": "resource_delta", "resource_key": "metal", "delta": -10}]'::jsonb,
      'b0000001-0000-0000-0000-000000000001'::uuid
    );
  $$,
  '42501',
  'NOT_OWNER',
  'Test 1: IDOR - Bob blocked from crafting on Alice planet'
);

-- 4. Test 2: Alice commits crafting job (Alloy Ingot)
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "88888888-8888-8888-8888-888888888881"}'; -- Alice

select lives_ok(
  $$
    select public.commit_effects(
      '99999999-cccc-9999-9999-999999999999'::uuid,
      0,
      jsonb_build_array(
        jsonb_build_object(
          'type', 'resource_delta',
          'resource_key', 'metal',
          'delta', -10
        ),
        jsonb_build_object(
          'type', 'create_job',
          'kind', 'craft',
          'payload', jsonb_build_object(
            'recipe_key', 'recipe_alloy_ingot',
            'output_key', 'alloy_ingot',
            'output_qty', 1
          ),
          'finish_at', (now() - interval '1 second')
        )
      ),
      'a0000001-0000-0000-0000-000000000001'::uuid,
      'craft_alloy_ingot'
    );
  $$,
  'Test 2: Alice commits craft job successfully'
);

set local role postgres;

-- 5. Test 3: Resource deducted (100 - 10 = 90)
select results_eq(
  $$ select amount from public.resource_balances where planet_id = '99999999-cccc-9999-9999-999999999999' and resource_key = 'metal' $$,
  $$ values (90::numeric) $$,
  'Test 3: 10 metal deducted for craft job'
);

-- 6. Test 4: Settle craft job creates output item in inventory and codex
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "88888888-8888-8888-8888-888888888881"}';

select results_eq(
  $$
    select (public.settle_planet_jobs('99999999-cccc-9999-9999-999999999999'::uuid))->>'completed_count'
  $$,
  $$ values ('1') $$,
  'Test 4: settle_planet_jobs completes 1 craft job'
);

set local role postgres;

-- 7. Test 5: Verify alloy_ingot is added to inventory
select results_eq(
  $$
    select inv.qty
    from public.inventory inv
    join public.items i on i.id = inv.item_id
    where inv.planet_id = '99999999-cccc-9999-9999-999999999999' and i.def_key = 'alloy_ingot'
  $$,
  $$ values (1) $$,
  'Test 5: Crafted alloy_ingot exists in Alice inventory with qty 1'
);

-- 8. Test 6: Verify recipe and item are both added to codex
select results_eq(
  $$
    select kind, entry_key
    from public.codex_entries
    where player_id = '88888888-8888-8888-8888-888888888881'
    order by kind asc
  $$,
  $$ values ('item'::text, 'alloy_ingot'::text), ('recipe'::text, 'recipe_alloy_ingot'::text) $$,
  'Test 6: Codex discovered entries recorded for both item and recipe'
);

-- 9. Test 7: Bob cannot view Alice codex or inventory
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "88888888-8888-8888-8888-888888888882"}';

select is_empty(
  $$ select * from public.codex_entries where player_id = '88888888-8888-8888-8888-888888888881' $$,
  'Test 7: Bob blocked from reading Alice codex entries'
);

select * from finish();
rollback;
