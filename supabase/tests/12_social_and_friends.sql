begin;
select plan(8);

-- 1. Setup Alice and Bob in auth.users & profiles
insert into auth.users (id, email)
values
  ('99999999-7777-8888-9999-111111111111', 'alice_social@test.com'),
  ('99999999-7777-8888-9999-222222222222', 'bob_social@test.com')
on conflict (id) do nothing;

insert into public.profiles (id, display_name, locale)
values
  ('99999999-7777-8888-9999-111111111111', 'Alice Social', 'vi'),
  ('99999999-7777-8888-9999-222222222222', 'Bob Social', 'vi')
on conflict (id) do nothing;

-- 2. Test 1: public_profiles allows reading display_name and created_at without exposing email
set local role anon;
select results_eq(
  $$ select display_name from public.public_profiles where id = '99999999-7777-8888-9999-111111111111' $$,
  $$ values ('Alice Social'::text) $$,
  'public_profiles view is readable and returns display_name'
);

-- 3. Test 2: Alice sends friend request to Bob
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "99999999-7777-8888-9999-111111111111"}'; -- Alice

select lives_ok(
  $$ select public.send_friend_request('99999999-7777-8888-9999-222222222222') $$,
  'Alice successfully sends friend request to Bob'
);

-- 4. Test 3: Cannot friend self
select throws_ok(
  $$ select public.send_friend_request('99999999-7777-8888-9999-111111111111') $$,
  'CANNOT_FRIEND_SELF',
  'Cannot send friend request to oneself'
);

-- 5. Test 4: Cannot send duplicate pending request
select throws_ok(
  $$ select public.send_friend_request('99999999-7777-8888-9999-222222222222') $$,
  'REQUEST_ALREADY_PENDING',
  'Cannot send duplicate friend request while pending'
);

-- 6. Test 5: Bob accepts friend request
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "99999999-7777-8888-9999-222222222222"}'; -- Bob

select lives_ok(
  $$ select public.respond_friend_request('99999999-7777-8888-9999-111111111111', true) $$,
  'Bob successfully accepts Alice friend request'
);

select results_eq(
  $$ select status from public.friendships where user_id = '99999999-7777-8888-9999-111111111111' and friend_id = '99999999-7777-8888-9999-222222222222' $$,
  $$ values ('accepted'::text) $$,
  'Friendship status is now accepted'
);

-- 7. Test 6: Bob blocks Alice -> automatically breaks friendship
select lives_ok(
  $$ select public.block_user('99999999-7777-8888-9999-111111111111', 'harassment') $$,
  'Bob blocks Alice'
);

select is_empty(
  $$ select 1 from public.friendships where (user_id = '99999999-7777-8888-9999-111111111111' and friend_id = '99999999-7777-8888-9999-222222222222') or (user_id = '99999999-7777-8888-9999-222222222222' and friend_id = '99999999-7777-8888-9999-111111111111') $$,
  'Friendship between Alice and Bob is removed upon block'
);

-- 8. Test 7: Blocked Alice cannot send friend request to Bob
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "99999999-7777-8888-9999-111111111111"}'; -- Alice

select throws_ok(
  $$ select public.send_friend_request('99999999-7777-8888-9999-222222222222') $$,
  'USER_BLOCKED',
  'Blocked user cannot send friend request'
);

select * from finish();
rollback;
