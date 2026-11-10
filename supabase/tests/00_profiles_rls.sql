-- pgTAP tests for profiles table and RLS
begin;
select plan(7);

-- 1. Table exists
select has_table('public', 'profiles', 'Table public.profiles should exist');

-- 2. RLS is enabled
select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'profiles'
  ),
  'RLS is enabled on public.profiles'
);

-- 3. Required columns exist
select has_column('public', 'profiles', 'id', 'Column profiles.id should exist');
select has_column('public', 'profiles', 'display_name', 'Column profiles.display_name should exist');
select has_column('public', 'profiles', 'locale', 'Column profiles.locale should exist');

-- 4. Policies exist
select policies_are(
  'public',
  'profiles',
  array[
    'profiles_select_owner',
    'profiles_update_owner'
  ]
);

-- 5. Public view exists
select has_view('public', 'public_profiles', 'View public.public_profiles should exist');

select * from finish();
rollback;
