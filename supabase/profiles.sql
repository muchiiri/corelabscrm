-- Run this in your Supabase project's SQL editor before testing sign-up
-- end-to-end (feature 1a, step 7). Steps 1-6 don't need it.
--
-- If you already ran an earlier version of this file, everything here is
-- safe to re-run - the table/policy statements are idempotent, and the new
-- "Auto-create profile on signup" section is what you actually need now.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  avatar_url text,
  theme_preference text not null default 'light' check (theme_preference in ('light', 'dark')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Profiles are created by the trigger below (SECURITY DEFINER, bypasses
-- RLS), not by the client, so there is no insert policy.
drop policy if exists "Users can insert their own profile" on profiles;

drop policy if exists "Users can view their own profile" on profiles;
create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on profiles;
create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup, server-side. A client-side insert
-- immediately after supabase.auth.signUp() fails whenever "Confirm email" is
-- on, because there is no session (and therefore no auth.uid()) until the
-- user confirms. This trigger fires when the auth user row is created,
-- independent of session state.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, theme_preference)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    'light'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
