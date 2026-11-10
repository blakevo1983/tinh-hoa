begin;
select plan(7);

-- 1. Setup test user
insert into auth.users (id, email)
values ('33333333-3333-3333-3333-333333333333', 'cheat_test@test.com')
on conflict (id) do nothing;

insert into public.profiles (id, display_name, locale)
values ('33333333-3333-3333-3333-333333333333', 'Cheat Tester', 'vi')
on conflict (id) do nothing;

-- 2. Test 1: Inserting a planet triggers audit_log entry with action 'planet.create'
insert into public.planets (id, owner_id, name, primary_element, seed, stage, grid_size)
values (
  '88888888-8888-8888-8888-888888888888',
  '33333333-3333-3333-3333-333333333333',
  'Audited Planet',
  'fire',
  999111,
  1,
  12
);

select results_eq(
  $$
    select action, (details->>'name')::text
    from public.audit_log
    where actor_id = '33333333-3333-3333-3333-333333333333' and action = 'planet.create'
    order by created_at desc limit 1
  $$,
  $$ values ('planet.create'::text, 'Audited Planet'::text) $$,
  'Test 1: audit_log automatically records planet.create'
);

-- 3. Test 2: Updating planet stage triggers audit_log with action 'planet.evolve'
update public.planets
set stage = 2, grid_size = 16
where id = '88888888-8888-8888-8888-888888888888';

select results_eq(
  $$
    select action, (details->>'new_stage')::text
    from public.audit_log
    where actor_id = '33333333-3333-3333-3333-333333333333' and action = 'planet.evolve'
    order by created_at desc limit 1
  $$,
  $$ values ('planet.evolve'::text, '2'::text) $$,
  'Test 2: audit_log automatically records planet.evolve on stage upgrade'
);

-- 4. Test 3: audit_log is strictly append-only (UPDATE and DELETE prohibited)
select throws_ok(
  $$ delete from public.audit_log where actor_id = '33333333-3333-3333-3333-333333333333' $$,
  NULL,
  'audit_log is append-only: updates and deletes are prohibited',
  'Test 3: cannot delete from audit_log'
);

-- 5. Test 4: Resource overflow (> 110% cap) raises cheat flag automatically via trigger
insert into public.resource_balances (planet_id, resource_key, amount, cap, rate_per_sec)
values (
  '88888888-8888-8888-8888-888888888888',
  'fire',
  2000, -- Exceeds cap (1000) by 200%
  1000,
  0
);

select results_eq(
  $$
    select kind, severity, status
    from public.cheat_flags
    where player_id = '33333333-3333-3333-3333-333333333333' and kind = 'excessive_resource_amount'
    order by created_at desc limit 1
  $$,
  $$ values ('excessive_resource_amount'::text, 3::smallint, 'open'::text) $$,
  'Test 4: cheat_flags records excessive_resource_amount trigger'
);

-- 6. Test 5: verify_planet_integrity flags when balance > ledger sum
-- Reset fire balance to 500 without recording into ledger (ledger sum is 0)
update public.resource_balances
set amount = 500, cap = 1000
where planet_id = '88888888-8888-8888-8888-888888888888' and resource_key = 'fire';

-- Run integrity verification
select is(
  (public.verify_planet_integrity('88888888-8888-8888-8888-888888888888'::uuid))->>'flags_generated',
  '1',
  'Test 5: verify_planet_integrity generates 1 flag when balance exceeds ledger'
);

select results_eq(
  $$
    select kind, severity
    from public.cheat_flags
    where player_id = '33333333-3333-3333-3333-333333333333' and kind = 'balance_exceeds_ledger_sum'
    order by created_at desc limit 1
  $$,
  $$ values ('balance_exceeds_ledger_sum'::text, 3::smallint) $$,
  'Test 6: cheat_flags records balance_exceeds_ledger_sum'
);

-- 7. Test 7: Normal authenticated user CANNOT read cheat_flags (no SELECT grant / RLS deny-by-default)
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "33333333-3333-3333-3333-333333333333"}';

select throws_ok(
  $$ select * from public.cheat_flags $$,
  '42501',
  NULL,
  'Test 7: authenticated player cannot read cheat_flags (permission denied)'
);

select * from finish();
rollback;
