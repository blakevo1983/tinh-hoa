begin;
select plan(8);

-- 1. Setup Alice, Bob, and Eve
insert into auth.users (id, email)
values
  ('77777777-1111-2222-3333-444444444441', 'alice_chat@test.com'),
  ('77777777-1111-2222-3333-444444444442', 'bob_chat@test.com'),
  ('77777777-1111-2222-3333-444444444443', 'eve_chat@test.com')
on conflict (id) do nothing;

insert into public.profiles (id, display_name, locale)
values
  ('77777777-1111-2222-3333-444444444441', 'Alice Chat', 'vi'),
  ('77777777-1111-2222-3333-444444444442', 'Bob Chat', 'vi'),
  ('77777777-1111-2222-3333-444444444443', 'Eve Chat', 'vi')
on conflict (id) do nothing;

-- 2. Setup Alice's Planet
insert into public.planets (id, owner_id, name, primary_element, seed, stage, grid_size)
values (
  '88888888-aaaa-bbbb-cccc-111111111111',
  '77777777-1111-2222-3333-444444444441',
  'Alice Planet',
  'water',
  998877,
  1,
  12
);

insert into public.chat_channels (id, kind, name)
values ('planet:88888888-aaaa-bbbb-cccc-111111111111', 'planet', 'Alice Planet Chat')
on conflict (id) do nothing;

-- 3. Test 1: Alice is member of global channel
select is(
  public.is_channel_member('global', '77777777-1111-2222-3333-444444444441'),
  true,
  'Alice is a valid member of global channel'
);

-- 4. Test 2: Planet channel membership check (Alice is owner -> true; Eve is stranger -> false)
select is(
  public.is_channel_member('planet:88888888-aaaa-bbbb-cccc-111111111111', '77777777-1111-2222-3333-444444444441'),
  true,
  'Alice as planet owner is automatically a member'
);

select is(
  public.is_channel_member('planet:88888888-aaaa-bbbb-cccc-111111111111', '77777777-1111-2222-3333-444444444443'),
  false,
  'Eve as stranger is not a member of Alice planet channel'
);

-- 5. Test 3: DM channel between Alice and Bob
select is(
  public.is_channel_member('dm:77777777-1111-2222-3333-444444444441:77777777-1111-2222-3333-444444444442', '77777777-1111-2222-3333-444444444441'),
  true,
  'Alice is a valid participant of Alice-Bob DM'
);

-- 6. Test 4: Block prevents DM membership
insert into public.user_blocks (blocker_id, blocked_id, reason)
values ('77777777-1111-2222-3333-444444444442', '77777777-1111-2222-3333-444444444441', 'Spam');

select is(
  public.is_channel_member('dm:77777777-1111-2222-3333-444444444441:77777777-1111-2222-3333-444444444442', '77777777-1111-2222-3333-444444444441'),
  false,
  'Blocked participant cannot access DM channel'
);

-- 7. Test 5 & 6: RLS on chat_messages (Direct INSERT is forbidden; SELECT is restricted to members)
insert into public.chat_messages (channel_id, sender_id, client_msg_id, content, filtered_content)
values (
  'planet:88888888-aaaa-bbbb-cccc-111111111111',
  '77777777-1111-2222-3333-444444444441',
  'msg-secret-1',
  'Secret message on Alice planet',
  'Secret message on Alice planet'
);

set local role authenticated;
set local "request.jwt.claims" to '{"sub": "77777777-1111-2222-3333-444444444443"}'; -- Eve

-- Eve tries to select Alice planet messages -> empty
select is_empty(
  $$ select 1 from public.chat_messages where channel_id = 'planet:88888888-aaaa-bbbb-cccc-111111111111' $$,
  'Eve cannot read messages in Alice private planet channel'
);

-- Eve tries to directly insert into chat_messages -> denied
select throws_ok(
  $$ insert into public.chat_messages (channel_id, sender_id, client_msg_id, content, filtered_content)
     values ('global', '77777777-1111-2222-3333-444444444443', 'eve-1', 'hack', 'hack') $$,
  '42501',
  null,
  'Client cannot directly insert into chat_messages'
);

-- 8. Test 7 & 8: Notifications RLS
set local role postgres;
insert into public.notifications (id, recipient_id, type, title, body)
values (
  '99999999-5555-6666-7777-888888888881',
  '77777777-1111-2222-3333-444444444441',
  'system',
  'Welcome',
  'Welcome to Tinh Hoa'
);

set local role authenticated;
set local "request.jwt.claims" to '{"sub": "77777777-1111-2222-3333-444444444441"}'; -- Alice
select lives_ok(
  $$ select public.mark_notification_read('99999999-5555-6666-7777-888888888881') $$,
  'Alice can mark her own notification as read'
);

select * from finish();
rollback;
