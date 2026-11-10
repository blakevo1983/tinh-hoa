-- Migration: create profiles table, public_profiles view and auth trigger
-- Conforms to docs/03-DATA-MODEL.md and Rule 30

-- 1. Create profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null unique check (char_length(display_name) between 3 and 20),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  banned_until timestamptz,
  trust_score int not null default 0,
  locale text not null default 'vi' check (locale in ('vi', 'en'))
);

-- 2. Enable Row Level Security immediately (Rule 30: cùng một file)
alter table public.profiles enable row level security;

-- 3. Revoke all permissions from anon and authenticated, grant selectively
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, locale, last_seen_at) on public.profiles to authenticated;

-- 4. Policies: Owner can select and update their own profile
create policy profiles_select_owner on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy profiles_update_owner on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 5. Public view for limited profile discovery (id and display_name only)
create or replace view public.public_profiles as
  select id, display_name
  from public.profiles;

grant select on public.public_profiles to anon, authenticated;

-- 6. Trigger to automatically provision profile when an auth.users record is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_name text;
  clean_name text;
  raw_locale text;
  clean_locale text;
begin
  raw_name := new.raw_user_meta_data->>'display_name';
  clean_name := trim(coalesce(raw_name, ''));

  -- Validate display_name length, fallback to Player_<uuid_prefix> if invalid
  if char_length(clean_name) < 3 or char_length(clean_name) > 20 then
    clean_name := 'Player_' || substr(new.id::text, 1, 8);
  end if;

  raw_locale := new.raw_user_meta_data->>'locale';
  clean_locale := case when raw_locale in ('vi', 'en') then raw_locale else 'vi' end;

  begin
    insert into public.profiles (id, display_name, locale)
    values (new.id, clean_name, clean_locale);
  exception when unique_violation then
    -- Handle rare display_name collisions safely
    insert into public.profiles (id, display_name, locale)
    values (new.id, substr(clean_name, 1, 15) || '_' || substr(new.id::text, 1, 4), clean_locale);
  end;

  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
