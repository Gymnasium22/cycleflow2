-- Diagnostics and fix for notification cron job
-- Run this in Supabase SQL Editor
-- IMPORTANT: Replace the placeholders below with your actual keys before running:
--   <SB_ANON_KEY>  -> your Supabase Project API "anon public" key
--   <CRON_SECRET>  -> your CRON_SECRET secret value (must match the Edge Function secret)

-- 1. Check if required extensions are enabled
SELECT * FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');

-- 2. List all scheduled cron jobs
SELECT * FROM cron.job;

-- 3. Show recent cron job run details (last 10)
SELECT
  jobid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;

-- 4. Unschedule existing notification jobs (if any)
DO $$
BEGIN
  PERFORM cron.unschedule('send-telegram-notifications');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Job send-telegram-notifications does not exist or could not be unscheduled';
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('send-cycle-notifications');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Job send-cycle-notifications does not exist or could not be unscheduled';
END $$;

-- 5. Schedule new notification job
-- IMPORTANT: Replace <SB_ANON_KEY> and <CRON_SECRET> with actual values before running!
SELECT cron.schedule(
  'send-telegram-notifications',
  '*/15 * * * *',
  $$ SELECT net.http_post(
    url := 'https://eofhvkiidqyxkrpimwer.supabase.co/functions/v1/send-notifications',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <SB_ANON_KEY>", "X-Cron-Secret": "<CRON_SECRET>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id; $$
);

-- 6. Verify the job was created
SELECT * FROM cron.job;

-- 7. Manual test: call the function once (optional)
-- IMPORTANT: Replace <SB_ANON_KEY> and <CRON_SECRET> with actual values before running!
-- SELECT net.http_post(
--   url := 'https://eofhvkiidqyxkrpimwer.supabase.co/functions/v1/send-notifications',
--   headers := '{"Content-Type": "application/json", "Authorization": "Bearer <SB_ANON_KEY>", "X-Cron-Secret": "<CRON_SECRET>"}'::jsonb,
--   body := '{}'::jsonb
-- );
