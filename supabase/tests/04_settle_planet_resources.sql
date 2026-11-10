-- pgTAP test: 04_settle_planet_resources.sql
-- Verify server-authoritative lazy settlement of offline resources

begin;
select plan(5);

-- 1. Setup test user and planet
insert into auth.users (id, email)
values ('33333333-3333-3333-3333-333333333333', 'settle_user@test.com')
on conflict (id) do nothing;

insert into public.profiles (id, display_name)
values ('33333333-3333-3333-3333-333333333333', 'SettlePlayer')
on conflict (id) do nothing;

insert into public.planets (id, owner_id, name, primary_element, seed, state_version)
values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '33333333-3333-3333-3333-333333333333',
  'TerraSettle',
  'earth',
  55555,
  0
) on conflict (id) do nothing;

-- Set up resource balance with updated_at set 2 hours ago (7200 seconds ago)
-- rate: 0.5/sec -> expected increase: 7200 * 0.5 = 3600 units
insert into public.resource_balances (planet_id, resource_key, amount, rate_per_sec, cap, updated_at)
values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'earth',
  100,
  0.5,
  10000,
  now() - interval '2 hours'
) on conflict (planet_id, resource_key) do nothing;

-- 2. Test: Non-owner is rejected
set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111'; -- other user

select throws_ok(
  $$ select public.settle_planet_resources('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid) $$,
  '42501',
  'NOT_OWNER',
  'Non-owner cannot settle resources on another player planet'
);

-- 3. Test: Owner settles 2 hours of progression successfully
set local "request.jwt.claim.sub" = '33333333-3333-3333-3333-333333333333';

select lives_ok(
  $$ select public.settle_planet_resources('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid) $$,
  'Owner can settle planet resources'
);

set local role postgres;

-- 100 base + 7200 * 0.5 = 3700
select results_eq(
  $$ select amount from public.resource_balances where planet_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and resource_key = 'earth' $$,
  $$ values (3700::numeric) $$,
  'Resource balance updated after 2 hours of production (100 + 3600 = 3700)'
);

-- 4. Test: Offline cap of 8 hours (28,800s) is enforced when offline for 24 hours
-- Set updated_at to 24 hours ago and increase cap to 50000 so cap doesn't bottleneck
update public.resource_balances
set updated_at = now() - interval '24 hours',
    cap = 50000
where planet_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

set local role authenticated;
set local "request.jwt.claim.sub" = '33333333-3333-3333-3333-333333333333';

select lives_ok(
  $$ select public.settle_planet_resources('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid) $$,
  'Owner can settle planet resources after 24 hours'
);

set local role postgres;

-- 3700 base + 28800 (8hr max) * 0.5 = 3700 + 14400 = 18100
select results_eq(
  $$ select amount from public.resource_balances where planet_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and resource_key = 'earth' $$,
  $$ values (18100::numeric) $$,
  'Offline progress strictly capped at 8 hours (28800s * 0.5 = 14400) despite 24h offline'
);

select finish();
rollback;
