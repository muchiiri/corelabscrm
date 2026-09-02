-- Run this in your Supabase project's SQL editor before testing workspace
-- creation end-to-end (feature 2a). Run after supabase/profiles.sql.

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('Admin', 'Editor', 'Viewer')),
  joined_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

alter table workspaces enable row level security;
alter table workspace_members enable row level security;

-- No insert policy: creation goes through create_workspace below
-- (SECURITY DEFINER, bypasses RLS), the same atomic-write pattern
-- profiles.sql's handle_new_user trigger established. Renaming (update) is a
-- single-row write, so it doesn't need that treatment - see the Admin-only
-- update policy near the bottom of this file.
drop policy if exists "Members can view their workspaces" on workspaces;
create policy "Members can view their workspaces"
  on workspaces for select
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = workspaces.id
      and workspace_members.user_id = auth.uid()
    )
  );

-- Expanded in feature 9 from "you can see your own row" to "you can see
-- every member of a workspace you belong to" - needed for the assignee
-- picker to list a workspace's members, not just the caller's own row.
--
-- A plain `exists (select 1 from workspace_members ...)` subquery here would
-- reference the very table the policy protects, which Postgres evaluates by
-- re-applying this same policy to the subquery - infinite recursion
-- (confirmed live: query failed with "infinite recursion detected in policy
-- for relation workspace_members"). The fix is the same SECURITY DEFINER
-- pattern already used by handle_new_user and create_workspace: the check
-- runs in a function that bypasses RLS internally, so the policy never
-- re-triggers itself.
create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = target_workspace_id
    and user_id = auth.uid()
  );
$$;

grant execute on function public.is_workspace_member(uuid) to authenticated;

drop policy if exists "Users can view their own membership rows" on workspace_members;
drop policy if exists "Members can view their workspace's membership rows" on workspace_members;
create policy "Members can view their workspace's membership rows"
  on workspace_members for select
  using (public.is_workspace_member(workspace_id));

-- Only the workspace's Admin can rename it. No Editor/Viewer members can
-- exist yet (feature 11 adds that), but this policy is written now so
-- feature 11 doesn't have to retrofit it - see feature 2c.
drop policy if exists "Admins can update their workspace" on workspaces;
create policy "Admins can update their workspace"
  on workspaces for update
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = workspaces.id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role = 'Admin'
    )
  );

create or replace function public.create_workspace(workspace_name text)
returns workspaces
language plpgsql
security definer set search_path = public
as $$
declare
  new_workspace workspaces;
begin
  if trim(workspace_name) = '' then
    raise exception 'Workspace name is required';
  end if;

  insert into workspaces (name, owner_id)
  values (trim(workspace_name), auth.uid())
  returning * into new_workspace;

  insert into workspace_members (workspace_id, user_id, role)
  values (new_workspace.id, auth.uid(), 'Admin');

  return new_workspace;
end;
$$;

grant execute on function public.create_workspace(text) to authenticated;
