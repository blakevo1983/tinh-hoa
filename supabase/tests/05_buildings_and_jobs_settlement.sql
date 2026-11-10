-- pgTAP test: 05_buildings_and_jobs_settlement.sql
-- Verify building construction jobs and lazy job settlement

begin;
select plan(7);

-- 1. Setup test user and planet with tiles
insert into auth.users (id, email)
values ('44444444-4444-4444-4444-444444444444', 'builder@test.com')
on conflict (id) do nothing;

insert into public.profiles (id, display_name)
values ('44444444-4444-4444-4444-444444444444', 'MasterBuilder')
on conflict (id) do nothing;

insert into public.planets (id, owner_id, name, primary_element, seed, state_version)
values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '44444444-4444-4444-4444-444444444444',
  'BuildPlanet',
  'wood',
  66666,
  0
) on conflict (id) do nothing;

-- Add a wood tile at (2, 2)
insert into public.planet_tiles (planet_id, x, y, element, biome, richness)
values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  2,
  2,
  'wood',
  'verdant_forest',
  3
) on conflict (planet_id, x, y) do nothing;

-- Base resource balance for wood
insert into public.resource_balances (planet_id, resource_key, amount, rate_per_sec, cap)
values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'wood',
  100,
  0.5,
  500
) on conflict (planet_id, resource_key) do nothing;

-- 2. Create a running build job with finish_at in the future (5 minutes from now)
insert into public.jobs (id, planet_id, kind, payload, finish_at, status)
values (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'build',
  '{"kind": "harvester", "tile_x": 2, "tile_y": 2, "level": 1}'::jsonb,
  now() + interval '5 minutes',
  'running'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '44444444-4444-4444-4444-444444444444';

-- Running settle_planet_jobs before finish_at should not complete the job
select results_eq(
  $$ select (public.settle_planet_jobs('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid))->>'completed_count' $$,
  $$ values ('0'::text) $$,
  'No jobs completed when finish_at is in the future'
);

set local role postgres;

select results_eq(
  $$ select status from public.jobs where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' $$,
  $$ values ('running'::text) $$,
  'Job remains in running status'
);

select results_eq(
  $$ select count(*)::int from public.buildings where planet_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' $$,
  $$ values (0) $$,
  'No building constructed yet'
);

-- 3. Simulate time elapsed: set finish_at to 10 seconds ago
update public.jobs
set finish_at = now() - interval '10 seconds'
where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

set local role authenticated;
set local "request.jwt.claim.sub" = '44444444-4444-4444-4444-444444444444';

-- Settle completed job
select results_eq(
  $$ select (public.settle_planet_jobs('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid))->>'completed_count' $$,
  $$ values ('1'::text) $$,
  'Job is completed via lazy settlement'
);

set local role postgres;

-- Verify job status is now completed
select results_eq(
  $$ select status from public.jobs where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' $$,
  $$ values ('completed'::text) $$,
  'Job status updated to completed'
);

-- Verify building is created
select results_eq(
  $$ select kind from public.buildings where planet_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' and tile_x = 2 and tile_y = 2 $$,
  $$ values ('harvester'::text) $$,
  'Harvester building is created at tile (2, 2)'
);

-- Verify wood rate_per_sec increased (+0.5 from harvester)
select results_eq(
  $$ select rate_per_sec from public.resource_balances where planet_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' and resource_key = 'wood' $$,
  $$ values (1.0::numeric) $$, -- initial 0.5 + 0.5 = 1.0
  'Wood production rate increased by 0.5'
);

select finish();
rollback;
