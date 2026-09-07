-- Run this in your Supabase project's SQL editor after deploying
-- supabase/functions/morning-digest and supabase/functions/evening-summary
-- (see each function's header comment - this project has no Supabase CLI
-- set up yet, so that's a manual deploy via the CLI or the Dashboard's Edge
-- Functions editor).
--
-- Safe to re-run - the extension statements are idempotent, and the job is
-- unscheduled first if it already exists, then rescheduled, so you can
-- paste this again after changing the URL or key below without a "job name
-- already exists" error on older pg_cron versions.
--
-- SECURITY: <YOUR_PROJECT_REF> and <YOUR_SERVICE_ROLE_KEY> below are
-- placeholders, not real values. Fill in your project's real values only
-- here, in the SQL editor - never commit a real service role key to this
-- repo, and never paste this file back with real values filled in.

-- pg_cron and pg_net are off by default on some projects. This usually
-- succeeds directly from the SQL editor; if it errors with a permissions
-- issue instead of just working, enable both manually via Dashboard >
-- Database > Extensions, then re-run this file.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('morning-digest-daily')
where exists (select 1 from cron.job where jobname = 'morning-digest-daily');

select cron.schedule(
  'morning-digest-daily',
  '0 5 * * *', -- 05:00 UTC = 08:00 +3, matches project-overview.md's fixed send time
  $$
  select net.http_post(
    url := 'https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/morning-digest',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <YOUR_SERVICE_ROLE_KEY>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.unschedule('evening-summary-daily')
where exists (select 1 from cron.job where jobname = 'evening-summary-daily');

select cron.schedule(
  'evening-summary-daily',
  '0 15 * * *', -- 15:00 UTC = 18:00 +3, matches project-overview.md's fixed send time
  $$
  select net.http_post(
    url := 'https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/evening-summary',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <YOUR_SERVICE_ROLE_KEY>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
