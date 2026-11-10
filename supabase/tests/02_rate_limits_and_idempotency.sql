-- pgTAP tests for rate limits RPC and idempotency table protections
begin;
select plan(7);

-- 1. Verify command_idempotency table exists and has RLS enabled
select has_table('public', 'command_idempotency', 'Table command_idempotency must exist');
select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'command_idempotency'
  ),
  'RLS is enabled on command_idempotency'
);

-- 2. Verify anon and authenticated cannot access command_idempotency
set local role anon;
select throws_ok(
  $$ insert into public.command_idempotency (idempotency_key, user_id, response) values ('k1', '00000000-0000-0000-0000-000000000000', '{}') $$,
  '42501',
  null,
  'Anon cannot insert into command_idempotency'
);

set local role authenticated;
select throws_ok(
  $$ select * from public.command_idempotency $$,
  '42501',
  null,
  'Authenticated cannot select from command_idempotency'
);

-- 3. Verify consume_rate_limit RPC behavior (as superuser/service_role)
reset role;

-- Fresh rate limit key with capacity 2 and cost 1
select is(
  public.consume_rate_limit('test:user1', 1, 2, 0.1, now()),
  true,
  'First rate limit consumption should succeed (2 -> 1)'
);

select is(
  public.consume_rate_limit('test:user1', 1, 2, 0.1, now()),
  true,
  'Second rate limit consumption should succeed (1 -> 0)'
);

select is(
  public.consume_rate_limit('test:user1', 1, 2, 0.1, now()),
  false,
  'Third rate limit consumption should be rejected (insufficient tokens)'
);

select * from finish();
rollback;
