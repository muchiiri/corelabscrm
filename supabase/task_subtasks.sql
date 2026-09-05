-- Run this in your Supabase project's SQL editor after supabase/tasks.sql.
-- Safe to re-run - every statement here is idempotent.

create table if not exists task_subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  title text not null,
  is_done boolean not null default false,
  position integer not null,
  created_at timestamptz not null default now()
);

alter table task_subtasks enable row level security;

-- task_subtasks has no workspace_id of its own, so these scope through the
-- referenced task's workspace instead - same non-recursive join task_tags
-- already uses in tags.sql.
drop policy if exists "Members can view their workspace's task subtasks" on task_subtasks;
create policy "Members can view their workspace's task subtasks"
  on task_subtasks for select
  using (
    exists (
      select 1 from tasks
      join workspace_members on workspace_members.workspace_id = tasks.workspace_id
      where tasks.id = task_subtasks.task_id
      and workspace_members.user_id = auth.uid()
    )
  );

drop policy if exists "Editors can add subtasks to tasks in their workspace" on task_subtasks;
create policy "Editors can add subtasks to tasks in their workspace"
  on task_subtasks for insert
  with check (
    exists (
      select 1 from tasks
      join workspace_members on workspace_members.workspace_id = tasks.workspace_id
      where tasks.id = task_subtasks.task_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('Admin', 'Editor')
    )
  );

-- Needed for toggling is_done - task_tags never needed this since it has
-- no mutable field, only insert/delete.
drop policy if exists "Editors can update subtasks on tasks in their workspace" on task_subtasks;
create policy "Editors can update subtasks on tasks in their workspace"
  on task_subtasks for update
  using (
    exists (
      select 1 from tasks
      join workspace_members on workspace_members.workspace_id = tasks.workspace_id
      where tasks.id = task_subtasks.task_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('Admin', 'Editor')
    )
  )
  with check (
    exists (
      select 1 from tasks
      join workspace_members on workspace_members.workspace_id = tasks.workspace_id
      where tasks.id = task_subtasks.task_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('Admin', 'Editor')
    )
  );

drop policy if exists "Editors can remove subtasks from tasks in their workspace" on task_subtasks;
create policy "Editors can remove subtasks from tasks in their workspace"
  on task_subtasks for delete
  using (
    exists (
      select 1 from tasks
      join workspace_members on workspace_members.workspace_id = tasks.workspace_id
      where tasks.id = task_subtasks.task_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('Admin', 'Editor')
    )
  );
