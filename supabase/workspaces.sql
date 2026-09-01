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

drop policy if exists "Users can view their own membership rows" on workspace_members;
create policy "Users can view their own membership rows"
  on workspace_members for select
  using (user_id = auth.uid());

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
