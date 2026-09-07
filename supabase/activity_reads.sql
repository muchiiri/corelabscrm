-- Run this in your Supabase project's SQL editor after supabase/activity_log.sql.
-- Safe to re-run - every statement here is idempotent.

create table if not exists activity_reads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

alter table activity_reads enable row level security;

-- Per-user, per-workspace - the Activity feed itself is workspace-scoped
-- (useActivityFeed.js filters by workspace_id), so read state has to be
-- too. Each user can only see and write their own row.
drop policy if exists "Users can view their own read state" on activity_reads;
create policy "Users can view their own read state"
  on activity_reads for select
  using (user_id = auth.uid());

drop policy if exists "Users can insert their own read state" on activity_reads;
create policy "Users can insert their own read state"
  on activity_reads for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can update their own read state" on activity_reads;
create policy "Users can update their own read state"
  on activity_reads for update
  using (user_id = auth.uid());
