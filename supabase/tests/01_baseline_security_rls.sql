-- pgTAP tests for Task T0.6: Baseline DB security, RLS enforcement and audit_log protections
begin;
select plan(10);

-- (a) Verify that EVERY table in the public schema has Row Level Security (RLS) enabled
select is_empty(
  $$
    select c.relname::text
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and not c.relrowsecurity
  $$,
  'CRITICAL: Every table in public schema MUST have RLS enabled (list of non-RLS tables must be empty)'
);

-- (b) Anon must not be able to read or write to internal security tables
set local role anon;

select throws_ok(
  $$ insert into public.audit_log (action) values ('unauthorized_anon_insert') $$,
  '42501',
  null,
  'Anon cannot INSERT into public.audit_log'
);

select throws_ok(
  $$ select * from public.audit_log $$,
  '42501',
  null,
  'Anon cannot SELECT from public.audit_log'
);

select throws_ok(
  $$ insert into public.rate_limits (key, tokens) values ('test_key', 10) $$,
  '42501',
  null,
  'Anon cannot INSERT into public.rate_limits'
);

-- (c) Test user data isolation in profiles
reset role;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'user1@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'user2@test.com')
on conflict (id) do nothing;

set local role authenticated;
set local "request.jwt.claim.sub" to '11111111-1111-1111-1111-111111111111';

select is(
  (select count(*) from public.profiles where id = '11111111-1111-1111-1111-111111111111')::int,
  1,
  'Authenticated user can SELECT their own profile row'
);

select is(
  (select count(*) from public.profiles where id = '22222222-2222-2222-2222-222222222222')::int,
  0,
  'RLS prevents authenticated user from SELECTing another user profile'
);

select is(
  (select count(*) from public.public_profiles where id = '22222222-2222-2222-2222-222222222222')::int,
  1,
  'Authenticated user can view other users via public_profiles view'
);

-- (d) Authenticated user must NOT be able to directly write to audit_log
select throws_ok(
  $$ insert into public.audit_log (action) values ('unauthorized_auth_insert') $$,
  '42501',
  null,
  'Authenticated user cannot directly INSERT into public.audit_log'
);

-- Append-only trigger test on audit_log
reset role;
insert into public.audit_log (action) values ('system.init_marker');

select throws_ok(
  $$ update public.audit_log set action = 'tampered' where action = 'system.init_marker' $$,
  null,
  'audit_log is append-only: updates and deletes are prohibited',
  'Trigger prevents updating audit_log (append-only)'
);

select throws_ok(
  $$ delete from public.audit_log where action = 'system.init_marker' $$,
  null,
  'audit_log is append-only: updates and deletes are prohibited',
  'Trigger prevents deleting from audit_log (append-only)'
);

select * from finish();
rollback;
