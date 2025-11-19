-- ================================================================
-- SETUP CRON JOB FOR APPOINTMENT REMINDERS
-- ================================================================
-- This script configures automatic appointment reminder processing
-- using pg_cron to execute every 15 minutes.
--
-- Prerequisites:
-- 1. pg_cron extension installed
-- 2. pg_net extension installed
-- 3. Edge functions deployed (send-reminder-email, process-appointment-reminders)
-- 4. Database variables configured (see below)
--
-- Author: TuTurno Development Team
-- Date: 2025-10-22
-- ================================================================

-- ================================================================
-- STEP 1: Enable Required Extensions
-- ================================================================

-- Enable pg_cron for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net for HTTP requests from database
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ================================================================
-- STEP 2: Configure Database Variables (REQUIRED)
-- ================================================================
-- You must set these variables in Supabase Dashboard → Database → Database Settings → Custom Postgres Config
-- Or via SQL:
/*
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
ALTER DATABASE postgres SET app.settings.supabase_service_role_key = 'your-service-role-key';
*/

-- Verify configuration (run this to check if variables are set)
-- SELECT current_setting('app.settings.supabase_url', true);
-- SELECT current_setting('app.settings.supabase_service_role_key', true);

-- ================================================================
-- STEP 3: Create HTTP Trigger Function
-- ================================================================

CREATE OR REPLACE FUNCTION public.trigger_process_reminders()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_supabase_url TEXT;
    v_service_role_key TEXT;
    v_edge_function_url TEXT;
    v_request_id BIGINT;
BEGIN
    -- Get configuration from database variables
    v_supabase_url := current_setting('app.settings.supabase_url', true);
    v_service_role_key := current_setting('app.settings.supabase_service_role_key', true);

    -- Validate configuration
    IF v_supabase_url IS NULL OR v_service_role_key IS NULL THEN
        RAISE EXCEPTION 'Database variables not configured. Set app.settings.supabase_url and app.settings.supabase_service_role_key';
    END IF;

    -- Build edge function URL
    v_edge_function_url := v_supabase_url || '/functions/v1/process-appointment-reminders';

    -- Log execution (optional, can be removed in production)
    RAISE NOTICE '[CRON] ⏰ Triggering reminder processing at %', NOW();
    RAISE NOTICE '[CRON] 🌐 Edge Function URL: %', v_edge_function_url;

    -- Make HTTP POST request to edge function using pg_net
    SELECT INTO v_request_id
        net.http_post(
            url := v_edge_function_url,
            headers := jsonb_build_object(
                'Authorization', 'Bearer ' || v_service_role_key,
                'Content-Type', 'application/json'
            ),
            body := '{}'::jsonb,
            timeout_milliseconds := 60000  -- 60 seconds timeout
        );

    RAISE NOTICE '[CRON] ✅ Request sent successfully. Request ID: %', v_request_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '[CRON] ❌ Error triggering reminders: % - %', SQLERRM, SQLSTATE;
        -- Don't re-raise, allow cron to continue
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.trigger_process_reminders() TO postgres;

-- ================================================================
-- STEP 4: Schedule Cron Job (Every 15 Minutes)
-- ================================================================

-- Remove existing job if it exists (safe to run multiple times)
SELECT cron.unschedule('process-appointment-reminders')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'process-appointment-reminders'
);

-- Schedule new cron job: every 15 minutes
-- Schedule: */15 * * * * = "At every 15 minutes"
-- Timezone: UTC (Supabase default)
SELECT cron.schedule(
    'process-appointment-reminders',           -- Job name
    '*/15 * * * *',                           -- Cron expression: every 15 minutes
    $$SELECT public.trigger_process_reminders();$$  -- SQL to execute
);

-- ================================================================
-- STEP 5: Helper Functions for Debugging
-- ================================================================

-- Function: Get count of pending reminders
CREATE OR REPLACE FUNCTION public.get_pending_reminders_count()
RETURNS TABLE (
    total_pending BIGINT,
    ready_to_send BIGINT,
    future_scheduled BIGINT
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        COUNT(*) FILTER (WHERE status = 'pending') AS total_pending,
        COUNT(*) FILTER (WHERE status = 'pending' AND scheduled_for <= NOW()) AS ready_to_send,
        COUNT(*) FILTER (WHERE status = 'pending' AND scheduled_for > NOW()) AS future_scheduled
    FROM public.appointment_reminders
    WHERE reminder_type = 'email';
$$;

-- Function: View upcoming reminders (next 24 hours)
CREATE OR REPLACE VIEW public.upcoming_reminders AS
SELECT
    ar.id AS reminder_id,
    ar.scheduled_for,
    ar.status,
    a.id AS appointment_id,
    a.appointment_date,
    a.start_time,
    u.first_name || ' ' || u.last_name AS client_name,
    u.email AS client_email,
    b.name AS business_name,
    EXTRACT(EPOCH FROM (ar.scheduled_for - NOW())) / 60 AS minutes_until_send
FROM public.appointment_reminders ar
JOIN public.appointments a ON ar.appointment_id = a.id
LEFT JOIN public.users u ON a.client_id = u.id
JOIN public.businesses b ON a.business_id = b.id
WHERE ar.reminder_type = 'email'
  AND ar.status = 'pending'
  AND ar.scheduled_for BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
ORDER BY ar.scheduled_for ASC;

-- Function: View cron job status
CREATE OR REPLACE VIEW public.cron_job_status AS
SELECT
    jobid,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active,
    jobname
FROM cron.job
WHERE jobname = 'process-appointment-reminders';

-- ================================================================
-- STEP 6: Update Default Reminder Time to 1.5 Hours
-- ================================================================

-- Update default reminder_hours_before from 24 to 1.5 hours (90 minutes)
-- This accounts for the potential 15-minute cron delay, ensuring clients
-- get at least 75 minutes notice even in worst case scenario.

-- Important: This converts hours to a decimal (1.5 = 1 hour 30 minutes)
-- The database stores this as INTEGER, so we need to handle this properly.

-- Option 1: Change column type to DECIMAL to support 1.5
ALTER TABLE public.businesses
ALTER COLUMN reminder_hours_before TYPE NUMERIC(4,1);

-- Option 2: Change column to reminder_minutes_before (INTEGER)
-- ALTER TABLE public.businesses
-- RENAME COLUMN reminder_hours_before TO reminder_minutes_before;
-- ALTER TABLE public.businesses
-- ALTER COLUMN reminder_minutes_before SET DEFAULT 90;

-- For now, using Option 1 (NUMERIC) to maintain backward compatibility
-- Update default to 1.5 hours
ALTER TABLE public.businesses
ALTER COLUMN reminder_hours_before SET DEFAULT 1.5;

-- Update existing businesses to use new default (optional)
-- Uncomment if you want to update all existing businesses:
-- UPDATE public.businesses
-- SET reminder_hours_before = 1.5
-- WHERE reminder_hours_before = 24;

-- Also update the trigger function to use NUMERIC instead of INTEGER
DROP FUNCTION IF EXISTS public.create_appointment_reminders();

CREATE OR REPLACE FUNCTION public.create_appointment_reminders()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_reminder_hours NUMERIC(4,1);  -- Changed from INTEGER to NUMERIC
    v_reminder_time TIMESTAMP WITH TIME ZONE;
    v_enable_reminders BOOLEAN;
    v_email_enabled BOOLEAN;
    v_sms_enabled BOOLEAN;
    v_push_enabled BOOLEAN;
BEGIN
    -- Only create reminders if status = 'confirmed' AND has client_id
    IF NEW.status = 'confirmed' AND NEW.client_id IS NOT NULL AND (OLD IS NULL OR OLD.status != 'confirmed') THEN

        -- Get business configuration
        SELECT
            enable_reminders,
            reminder_hours_before,
            reminder_email_enabled,
            reminder_sms_enabled,
            reminder_push_enabled
        INTO
            v_enable_reminders,
            v_reminder_hours,
            v_email_enabled,
            v_sms_enabled,
            v_push_enabled
        FROM public.businesses
        WHERE id = NEW.business_id;

        -- If no configuration found, use defaults
        IF v_reminder_hours IS NULL THEN
            v_reminder_hours := 1.5;
        END IF;

        -- Calculate reminder time: appointment datetime minus reminder hours
        v_reminder_time := (NEW.appointment_date + NEW.start_time) - (v_reminder_hours || ' hours')::INTERVAL;

        -- Only create reminders if enabled and scheduled time is in the future
        IF v_enable_reminders AND v_reminder_time > NOW() THEN

            -- Create email reminder if enabled
            IF v_email_enabled THEN
                INSERT INTO public.appointment_reminders (
                    appointment_id,
                    reminder_type,
                    scheduled_for,
                    status
                ) VALUES (
                    NEW.id,
                    'email',
                    v_reminder_time,
                    'pending'
                )
                ON CONFLICT (appointment_id, reminder_type, scheduled_for) DO NOTHING;
            END IF;

            -- SMS and Push reminders can be added here in the future
            -- IF v_sms_enabled THEN ... END IF;
            -- IF v_push_enabled THEN ... END IF;

        END IF;
    END IF;

    -- Cancel all pending reminders if appointment is cancelled
    IF NEW.status = 'cancelled' AND (OLD IS NULL OR OLD.status != 'cancelled') THEN
        UPDATE public.appointment_reminders
        SET status = 'cancelled',
            error_message = 'Appointment was cancelled'
        WHERE appointment_id = NEW.id
          AND status = 'pending';
    END IF;

    -- Also cancel reminders if appointment is moved to a past time
    IF NEW.status IN ('confirmed', 'pending') THEN
        UPDATE public.appointment_reminders
        SET status = 'cancelled',
            error_message = 'Appointment time changed to past'
        WHERE appointment_id = NEW.id
          AND status = 'pending'
          AND scheduled_for <= NOW();
    END IF;

    RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_create_appointment_reminders ON public.appointments;

CREATE TRIGGER trigger_create_appointment_reminders
    AFTER INSERT OR UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.create_appointment_reminders();

-- ================================================================
-- STEP 7: Verification Queries
-- ================================================================

-- Run these queries to verify setup:

-- 1. Check if cron job is scheduled
-- SELECT * FROM cron.job WHERE jobname = 'process-appointment-reminders';

-- 2. Check pending reminders count
-- SELECT * FROM public.get_pending_reminders_count();

-- 3. View upcoming reminders
-- SELECT * FROM public.upcoming_reminders LIMIT 10;

-- 4. View cron job status
-- SELECT * FROM public.cron_job_status;

-- 5. Check recent cron executions
-- SELECT * FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-appointment-reminders')
-- ORDER BY start_time DESC
-- LIMIT 10;

-- ================================================================
-- MANUAL TESTING
-- ================================================================

-- To manually test the system without waiting for cron:

-- 1. Call the trigger function directly
-- SELECT public.trigger_process_reminders();

-- 2. Check the results
-- SELECT * FROM public.appointment_reminders
-- WHERE status = 'sent'
-- ORDER BY sent_at DESC
-- LIMIT 10;

-- ================================================================
-- TROUBLESHOOTING
-- ================================================================

-- If reminders are not being sent:

-- 1. Verify database variables are set
-- SELECT current_setting('app.settings.supabase_url', true) AS supabase_url;
-- SELECT current_setting('app.settings.supabase_service_role_key', true) AS service_role_key;

-- 2. Check for errors in cron execution
-- SELECT * FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-appointment-reminders')
--   AND status = 'failed'
-- ORDER BY start_time DESC;

-- 3. Check pg_net requests and responses
-- SELECT * FROM net._http_response
-- ORDER BY created DESC
-- LIMIT 10;

-- 4. Verify edge functions are deployed and accessible
-- Use Supabase Dashboard → Edge Functions → Logs

-- 5. Check appointment_reminders for failed reminders
-- SELECT * FROM public.appointment_reminders
-- WHERE status = 'failed'
-- ORDER BY created_at DESC
-- LIMIT 10;

-- ================================================================
-- CLEANUP (Use only if you need to remove the cron job)
-- ================================================================

-- To disable/remove the cron job:
-- SELECT cron.unschedule('process-appointment-reminders');

-- To remove all functions and views:
-- DROP VIEW IF EXISTS public.upcoming_reminders CASCADE;
-- DROP VIEW IF EXISTS public.cron_job_status CASCADE;
-- DROP FUNCTION IF EXISTS public.get_pending_reminders_count() CASCADE;
-- DROP FUNCTION IF EXISTS public.trigger_process_reminders() CASCADE;

-- ================================================================
-- END OF SCRIPT
-- ================================================================

RAISE NOTICE '✅ Cron job setup complete!';
RAISE NOTICE '📋 Next steps:';
RAISE NOTICE '  1. Configure database variables (SUPABASE_URL, SERVICE_ROLE_KEY)';
RAISE NOTICE '  2. Deploy edge functions: npx supabase functions deploy send-reminder-email';
RAISE NOTICE '  3. Deploy edge functions: npx supabase functions deploy process-appointment-reminders';
RAISE NOTICE '  4. Test manually: SELECT public.trigger_process_reminders();';
RAISE NOTICE '  5. Monitor: SELECT * FROM public.upcoming_reminders;';
