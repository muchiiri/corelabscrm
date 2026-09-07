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

-- Expanded in feature 9 from "you can see your own profile" to "you can see
-- your own profile, or anyone's who shares a workspace with you" - needed to
-- show fellow members' names in the assignee picker.
--
-- Uses the same SECURITY DEFINER pattern as workspaces.sql's
-- is_workspace_member: the membership check runs in a function that bypasses
-- RLS internally, so reading workspace_members from inside this policy can't
-- recurse into workspace_members' own select policy.
create or replace function public.shares_workspace_with(target_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from workspace_members wm1
    join workspace_members wm2 on wm1.workspace_id = wm2.workspace_id
    where wm1.user_id = auth.uid()
    and wm2.user_id = target_user_id
  );
$$;

grant execute on function public.shares_workspace_with(uuid) to authenticated;

drop policy if exists "Users can view their own profile" on profiles;
drop policy if exists "Users can view profiles of their workspace members" on profiles;
create policy "Users can view profiles of their workspace members"
  on profiles for select
  using (
    auth.uid() = id
    or public.shares_workspace_with(id)
  );

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

-- Feature 44d: per-account notification preferences. Plain columns on
-- profiles, same as theme_preference - not a separate table, since this
-- is a fixed, named set of toggles, not a dynamic list. The existing
-- "Users can update their own profile" policy above already covers
-- writes to these. Not wired to any real email send yet (no EmailJS
-- integration exists) - these just persist the user's choice.
alter table profiles add column if not exists notify_assigned_to_me boolean not null default true;
alter table profiles add column if not exists notify_mentions boolean not null default true;
alter table profiles add column if not exists notify_due_soon boolean not null default true;
alter table profiles add column if not exists notify_project_activity boolean not null default false;
alter table profiles add column if not exists notify_product_news boolean not null default false;

-- Feature 28: gates the evening-summary email (completed tasks + workspace
-- activity overview). Defaults true like notify_due_soon - a core digest
-- toggle, not an opt-in extra like notify_project_activity/notify_product_news.
alter table profiles add column if not exists notify_evening_summary boolean not null default true;
