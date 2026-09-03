-- Run this in your Supabase project's SQL editor after supabase/clients.sql.
-- Safe to re-run - every statement here is idempotent.

create table if not exists client_interaction_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  note text not null,
  occurred_at timestamptz not null default now()
);

alter table client_interaction_logs enable row level security;

-- client_interaction_logs has no workspace_id of its own, so these scope
-- through the referenced client's workspace instead - same pattern
-- task_tags.sql uses for scoping through tasks.
drop policy if exists "Members can view their workspace's client interaction logs" on client_interaction_logs;
create policy "Members can view their workspace's client interaction logs"
  on client_interaction_logs for select
  using (
    exists (
      select 1 from clients
      join workspace_members on workspace_members.workspace_id = clients.workspace_id
      where clients.id = client_interaction_logs.client_id
      and workspace_members.user_id = auth.uid()
    )
  );

-- Role-gated like every other content write since feature 11b, plus a
-- self-authorship check (author_id = auth.uid()) so an Editor can't log
-- an interaction as someone else - a distinct property from the role
-- check, verified separately.
drop policy if exists "Editors can log interactions for their workspace's clients" on client_interaction_logs;
create policy "Editors can log interactions for their workspace's clients"
  on client_interaction_logs for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from clients
      join workspace_members on workspace_members.workspace_id = clients.workspace_id
      where clients.id = client_interaction_logs.client_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('Admin', 'Editor')
    )
  );
