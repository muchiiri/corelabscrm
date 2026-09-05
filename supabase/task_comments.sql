-- Run this in your Supabase project's SQL editor after supabase/tasks.sql.
-- Safe to re-run - every statement here is idempotent.

create table if not exists task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table task_comments enable row level security;

-- task_comments has no workspace_id of its own, so these scope through the
-- referenced task's workspace instead - same pattern client_interaction_logs.sql
-- uses for scoping through clients.
drop policy if exists "Members can view their workspace's task comments" on task_comments;
create policy "Members can view their workspace's task comments"
  on task_comments for select
  using (
    exists (
      select 1 from tasks
      join workspace_members on workspace_members.workspace_id = tasks.workspace_id
      where tasks.id = task_comments.task_id
      and workspace_members.user_id = auth.uid()
    )
  );

-- Role-gated like every other content write since feature 11b, plus a
-- self-authorship check (author_id = auth.uid()) so an Editor can't post a
-- comment as someone else - a distinct property from the role check,
-- verified separately, same as client_interaction_logs.sql.
drop policy if exists "Editors can comment on tasks in their workspace" on task_comments;
create policy "Editors can comment on tasks in their workspace"
  on task_comments for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from tasks
      join workspace_members on workspace_members.workspace_id = tasks.workspace_id
      where tasks.id = task_comments.task_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('Admin', 'Editor')
    )
  );
