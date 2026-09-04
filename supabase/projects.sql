-- Run this in your Supabase project's SQL editor after supabase/workspaces.sql
-- and before supabase/tasks.sql - tasks.project_id references this table.
-- Safe to re-run - every statement here is idempotent.

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table projects enable row level security;

-- Run this after supabase/clients.sql (client_id references clients).
alter table projects add column if not exists client_id uuid references clients(id) on delete set null;

drop policy if exists "Members can view their workspace's projects" on projects;
create policy "Members can view their workspace's projects"
  on projects for select
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = projects.workspace_id
      and workspace_members.user_id = auth.uid()
    )
  );

-- Role-gated from the start (unlike tags, which launched before feature
-- 11b's role enforcement existed and needed a follow-up pass). No delete
-- policy yet.
drop policy if exists "Editors can create projects in their workspace" on projects;
create policy "Editors can create projects in their workspace"
  on projects for insert
  with check (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = projects.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('Admin', 'Editor')
    )
  );

-- Feature 34d: status/description columns. This update policy exists so a
-- future feature can let a project's status change - nothing in the app
-- writes to `status` yet, every project stays at its 'Active' default.
alter table projects add column if not exists status text not null default 'Active' check (status in ('Active', 'Completed', 'Archived'));
alter table projects add column if not exists description text;

drop policy if exists "Editors can update their workspace's projects" on projects;
create policy "Editors can update their workspace's projects"
  on projects for update
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = projects.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('Admin', 'Editor')
    )
  );
