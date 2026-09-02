-- Run this in your Supabase project's SQL editor after supabase/workspaces.sql
-- and before supabase/tasks.sql - tasks.project_id references this table.
-- Safe to re-run - every statement here is idempotent.

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- client_id deliberately absent - feature 13 adds it via
-- `alter table projects add column ...` when it lands, mirroring
-- tasks.sql's precedent for project_id/client_id/recurrence_rule/snoozed_until.

alter table projects enable row level security;

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
-- 11b's role enforcement existed and needed a follow-up pass). No
-- update/delete policy - create-only, matching tags' precedent.
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
