-- Run this in your Supabase project's SQL editor after supabase/workspaces.sql.
-- Safe to re-run - every statement here is idempotent.

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  company text,
  website text,
  created_at timestamptz not null default now()
);

alter table clients enable row level security;

drop policy if exists "Members can view their workspace's clients" on clients;
create policy "Members can view their workspace's clients"
  on clients for select
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = clients.workspace_id
      and workspace_members.user_id = auth.uid()
    )
  );

-- Role-gated from the start (feature 11b already exists) - no "launch
-- open, retrofit later" step needed here, unlike feature 10's tags.
drop policy if exists "Editors can create clients in their workspace" on clients;
create policy "Editors can create clients in their workspace"
  on clients for insert
  with check (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = clients.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('Admin', 'Editor')
    )
  );

-- Feature 36d: client creation modal - industry/owner/relationship/notes
-- fields. owner_id references auth.users, matching tasks.assignee_id and
-- projects.owner_id's existing convention (not profiles). No RLS changes
-- needed - the insert/select policies above are row-level, not
-- column-scoped, so they already cover these columns.
alter table clients add column if not exists industry text;
alter table clients add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table clients add column if not exists relationship text not null default 'Prospect' check (relationship in ('Active', 'Prospect', 'Churned'));
alter table clients add column if not exists notes text;
