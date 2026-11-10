begin;
select plan(6);

-- 1. Setup Alice and Bob
insert into auth.users (id, email)
values
  ('66666666-1111-2222-3333-444444444441', 'alice_report@test.com'),
  ('66666666-1111-2222-3333-444444444442', 'bob_report@test.com')
on conflict (id) do nothing;

insert into public.profiles (id, display_name, locale)
values
  ('66666666-1111-2222-3333-444444444441', 'Alice Reporter', 'vi'),
  ('66666666-1111-2222-3333-444444444442', 'Bob Violator', 'vi')
on conflict (id) do nothing;

-- 2. Test 1: Alice submits chat report against Bob
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "66666666-1111-2222-3333-444444444441"}'; -- Alice

select lives_ok(
  $$ select public.submit_chat_report('66666666-1111-2222-3333-444444444442', 'Spamming vulgar terms repeatedly', null, '[{"msg":"spam"}]'::jsonb) $$,
  'Alice successfully submits chat report'
);

-- 3. Test 2: Alice cannot report herself
select throws_ok(
  $$ select public.submit_chat_report('66666666-1111-2222-3333-444444444441', 'Self report test') $$,
  'CANNOT_REPORT_SELF',
  'Cannot report oneself'
);

-- 4. Test 3: Rejects short reason
select throws_ok(
  $$ select public.submit_chat_report('66666666-1111-2222-3333-444444444442', 'no') $$,
  'INVALID_REPORT_REASON',
  'Rejects report reason shorter than 3 characters'
);

-- 5. Test 4: Server sends notification to Bob
set local role postgres;
select lives_ok(
  $$ select public.send_notification('66666666-1111-2222-3333-444444444442', 'system', 'Cảnh báo', 'Vui lòng tuân thủ quy tắc ứng xử.', '{"severity": 1}'::jsonb) $$,
  'System sends notification to Bob'
);

-- 6. Test 5: Bob reads and marks notification read
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "66666666-1111-2222-3333-444444444442"}'; -- Bob

select results_eq(
  $$ select read from public.notifications where recipient_id = '66666666-1111-2222-3333-444444444442' limit 1 $$,
  $$ values (false) $$,
  'Notification is initially unread'
);

-- Mark read
select lives_ok(
  $$ select public.mark_notification_read(id) from public.notifications where recipient_id = '66666666-1111-2222-3333-444444444442' limit 1 $$,
  'Bob successfully marks his notification as read'
);

select * from finish();
rollback;
