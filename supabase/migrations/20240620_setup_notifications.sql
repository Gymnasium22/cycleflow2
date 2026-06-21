-- Enable required extensions for cron and HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Add timezone column to profiles if not exists
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- Ensure settings table has required notification columns
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS ovulation_reminder_days INTEGER DEFAULT 1;

-- Cron job: call send-notifications every 15 minutes
-- Replace <CRON_SECRET> with your actual CRON_SECRET value
-- Replace <SB_ANON_KEY> with your actual anon key
-- Note: pg_cron jobs run in the UTC timezone by default
SELECT cron.schedule(
  'send-telegram-notifications',
  '*/15 * * * *',
  $$ SELECT net.http_post(
    url := 'https://eofhvkiidqyxkrpimwer.supabase.co/functions/v1/send-notifications',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <SB_ANON_KEY>", "X-Cron-Secret": "<CRON_SECRET>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id; $$
);

-- Verify the job was created
SELECT * FROM cron.job;
