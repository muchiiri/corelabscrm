-- Run this in your Supabase project's SQL editor after supabase/workspaces.sql.
-- Safe to re-run - every statement here is idempotent.

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null,
  description text,
  priority text not null default 'Medium' check (priority in ('High', 'Medium', 'Low')),
  status text not null default 'Todo' check (status in ('Todo', 'In Progress', 'Blocked', 'Waiting', 'Done')),
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- client_id, recurrence_rule, and snoozed_until are deliberately absent -
-- features 13, 19, and 20 each add their own column via
-- `alter table tasks add column ...` when they land.
alter table tasks add column if not exists assignee_id uuid references auth.users(id) on delete set null;

-- Run this after supabase/projects.sql (project_id references projects).
alter table tasks add column if not exists project_id uuid references projects(id) on delete set null;

alter table tasks enable row level security;

drop policy if exists "Members can view their workspace's tasks" on tasks;
create policy "Members can view their workspace's tasks"
  on tasks for select
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = tasks.workspace_id
      and workspace_members.user_id = auth.uid()
    )
  );

-- Feature 11b: Admin and Editor can write; Viewer is read-only (select above
-- stays unrestricted). Extends the existing cross-table workspace_members
-- check already on these policies - no new helper needed, no recursion risk
-- (this table isn't subquerying itself).
drop policy if exists "Members can create tasks in their workspace" on tasks;
drop policy if exists "Editors can create tasks in their workspace" on tasks;
create policy "Editors can create tasks in their workspace"
  on tasks for insert
  with check (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = tasks.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('Admin', 'Editor')
    )
  );

drop policy if exists "Members can update their workspace's tasks" on tasks;
drop policy if exists "Editors can update their workspace's tasks" on tasks;
create policy "Editors can update their workspace's tasks"
  on tasks for update
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = tasks.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('Admin', 'Editor')
    )
  );

drop policy if exists "Members can delete their workspace's tasks" on tasks;
drop policy if exists "Editors can delete their workspace's tasks" on tasks;
create policy "Editors can delete their workspace's tasks"
  on tasks for delete
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = tasks.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('Admin', 'Editor')
    )
  );

-- 3b needs this once edits exist; cheap to add alongside the table now.
create or replace function public.set_tasks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on tasks;
create trigger tasks_set_updated_at
  before update on tasks
  for each row execute function public.set_tasks_updated_at();
