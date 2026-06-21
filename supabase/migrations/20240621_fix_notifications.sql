-- Diagnostics and fix for notification cron job
-- Run this in Supabase SQL Editor

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
SELECT cron.unschedule('send-telegram-notifications');
SELECT cron.unschedule('send-cycle-notifications');

-- 5. Schedule new notification job
-- Replace <CRON_SECRET> with your actual CRON_SECRET value
SELECT cron.schedule(
  'send-telegram-notifications',
  '*/15 * * * *',
  $$ SELECT net.http_post(
    url := 'https://eofhvkiidqyxkrpimwer.supabase.co/functions/v1/send-notifications',
    headers := '{"Content-Type": "application/json", "X-Cron-Secret": "<CRON_SECRET>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id; $$
);

-- 6. Verify the job was created
SELECT * FROM cron.job;

-- 7. Manual test: call the function once (optional, requires CRON_SECRET)
-- SELECT net.http_post(
--   url := 'https://eofhvkiidqyxkrpimwer.supabase.co/functions/v1/send-notifications',
--   headers := '{"Content-Type": "application/json", "X-Cron-Secret": "<CRON_SECRET>"}'::jsonb,
--   body := '{}'::jsonb
-- );
