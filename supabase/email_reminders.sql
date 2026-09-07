-- Run this in your Supabase project's SQL editor after supabase/tasks.sql.
-- Safe to re-run - every statement here is idempotent.

create table if not exists email_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('morning-digest', 'evening-summary', 'pre-deadline-24h', 'pre-deadline-12h', 'pre-deadline-1h')),
  task_id uuid references tasks(id) on delete cascade,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  created_at timestamptz not null default now()
);

alter table email_reminders enable row level security;

-- Unlike every other table here, this one has no policies at all - it's
-- written and read only by the morning-digest Edge Function using the
-- service-role key, which bypasses RLS entirely. No UI reads this table in
-- this feature, so leaving RLS enabled with zero policies denies all
-- client-side (anon/authenticated) access by default rather than
-- accidentally exposing another user's reminder history.
