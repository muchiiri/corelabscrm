-- Run this in your Supabase project's SQL editor after supabase/workspaces.sql.
-- Safe to re-run - every statement here is idempotent.

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  type text not null check (type in ('project-status', 'task-completion')),
  format text not null check (format in ('csv', 'pdf')),
  period_start date not null,
  period_end date not null,
  generated_at timestamptz not null default now()
);

alter table reports enable row level security;

-- Unlike every other table's insert policy (clients, projects, tasks - all
-- Admin/Editor only), this one is open to every workspace member. Exporting
-- a report doesn't mutate any CRM content a Viewer can't already see on
-- screen - it's a read/output action, not a write to task/project/client
-- data - so there's no reason to block Viewer from downloading the same
-- numbers they're already allowed to view.
drop policy if exists "Members can view their workspace's reports" on reports;
create policy "Members can view their workspace's reports"
  on reports for select
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = reports.workspace_id
      and workspace_members.user_id = auth.uid()
    )
  );

drop policy if exists "Members can log reports in their workspace" on reports;
create policy "Members can log reports in their workspace"
  on reports for insert
  with check (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = reports.workspace_id
      and workspace_members.user_id = auth.uid()
    )
  );
