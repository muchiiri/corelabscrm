-- Run this in your Supabase project's SQL editor after supabase/tasks.sql.
-- Safe to re-run - every statement here is idempotent.

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  color text not null default 'gray' check (color in ('gray', 'red', 'orange', 'green', 'blue', 'purple')),
  created_at timestamptz not null default now()
);

create unique index if not exists tags_workspace_id_lower_name_idx
  on tags (workspace_id, lower(name));

create table if not exists task_tags (
  task_id uuid not null references tasks(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (task_id, tag_id)
);

alter table tags enable row level security;
alter table task_tags enable row level security;

-- Same non-recursive workspace_members check tasks.sql already uses. No
-- SECURITY DEFINER helper needed here (unlike workspaces.sql's feature 9
-- fix) - that recursion only happens when a policy subqueries its own
-- table; tags and task_tags each query a different table than themselves.
drop policy if exists "Members can view their workspace's tags" on tags;
create policy "Members can view their workspace's tags"
  on tags for select
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = tags.workspace_id
      and workspace_members.user_id = auth.uid()
    )
  );

-- Feature 11b: Admin and Editor can write; Viewer is read-only (select
-- above stays unrestricted).
drop policy if exists "Members can create tags in their workspace" on tags;
create policy "Editors can create tags in their workspace"
  on tags for insert
  with check (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = tags.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('Admin', 'Editor')
    )
  );

-- task_tags has no workspace_id of its own, so these scope through the
-- referenced task's workspace instead.
drop policy if exists "Members can view their workspace's task tags" on task_tags;
create policy "Members can view their workspace's task tags"
  on task_tags for select
  using (
    exists (
      select 1 from tasks
      join workspace_members on workspace_members.workspace_id = tasks.workspace_id
      where tasks.id = task_tags.task_id
      and workspace_members.user_id = auth.uid()
    )
  );

-- Feature 11b: Admin and Editor can write; Viewer is read-only.
drop policy if exists "Members can tag tasks in their workspace" on task_tags;
create policy "Editors can tag tasks in their workspace"
  on task_tags for insert
  with check (
    exists (
      select 1 from tasks
      join workspace_members on workspace_members.workspace_id = tasks.workspace_id
      where tasks.id = task_tags.task_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('Admin', 'Editor')
    )
  );

drop policy if exists "Members can untag tasks in their workspace" on task_tags;
create policy "Editors can untag tasks in their workspace"
  on task_tags for delete
  using (
    exists (
      select 1 from tasks
      join workspace_members on workspace_members.workspace_id = tasks.workspace_id
      where tasks.id = task_tags.task_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('Admin', 'Editor')
    )
  );
