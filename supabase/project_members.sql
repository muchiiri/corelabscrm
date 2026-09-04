-- Run this in your Supabase project's SQL editor after supabase/projects.sql.
-- Safe to re-run - every statement here is idempotent.

create table if not exists project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

alter table project_members enable row level security;

drop policy if exists "Members can view their workspace's project members" on project_members;
create policy "Members can view their workspace's project members"
  on project_members for select
  using (
    exists (
      select 1 from projects
      join workspace_members on workspace_members.workspace_id = projects.workspace_id
      where projects.id = project_members.project_id
      and workspace_members.user_id = auth.uid()
    )
  );

-- No update/delete policy yet - nothing in feature 38 edits or removes
-- membership after creation (see current-feature.md's Out of scope).
drop policy if exists "Editors can add project members in their workspace" on project_members;
create policy "Editors can add project members in their workspace"
  on project_members for insert
  with check (
    exists (
      select 1 from projects
      join workspace_members on workspace_members.workspace_id = projects.workspace_id
      where projects.id = project_members.project_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('Admin', 'Editor')
    )
  );
