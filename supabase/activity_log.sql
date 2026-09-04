-- Run this in your Supabase project's SQL editor after supabase/workspaces.sql.
-- Safe to re-run - every statement here is idempotent.

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  summary text not null,
  entity_type text,
  entity_id uuid,
  occurred_at timestamptz not null default now()
);

alter table activity_log enable row level security;

-- Open to every workspace member, like reports.sql - logging an activity
-- isn't a content mutation a role should be able to block, it's a
-- byproduct of actions every role can already take (or already see).
drop policy if exists "Members can view their workspace's activity" on activity_log;
create policy "Members can view their workspace's activity"
  on activity_log for select
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = activity_log.workspace_id
      and workspace_members.user_id = auth.uid()
    )
  );

drop policy if exists "Members can log activity in their workspace" on activity_log;
create policy "Members can log activity in their workspace"
  on activity_log for insert
  with check (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = activity_log.workspace_id
      and workspace_members.user_id = auth.uid()
    )
  );
