-- ============================================================================
-- SUPERSEDED — DO NOT APPLY THIS MIGRATION
-- ============================================================================
-- This migration was never applied to production. The live DB has a different
-- implementation: process_job_alerts() (plural, no args, cron-based) instead of
-- process_job_alert(p_job_id uuid) (singular, trigger-based). The
-- job_alert_notifications dedup table does NOT exist in production.
--
-- The live DB uses a last_checked_at / last_sent_at watermark for dedup instead.
-- See REVERSE_ENGINEERING/ for the full current-state documentation.
-- ============================================================================
-- Job Alert Delivery Engine (SUPERSEDED — see note above)
-- Creates: job_alert_notifications table, process_job_alerts function,
--          trigger on jobs INSERT, RLS policies, security hardening
-- ============================================================================
-- Run this in the Supabase SQL Editor for project gvbtfolcizkzihforqte
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. DEDUP TABLE: job_alert_notifications
-- ============================================================================
-- Tracks which (alert_id, job_id) pairs have already been delivered.
-- The unique constraint prevents duplicate delivery even if the function
-- runs multiple times for the same job.

CREATE TABLE IF NOT EXISTS public.job_alert_notifications (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id    uuid NOT NULL REFERENCES public.job_alerts(id) ON DELETE CASCADE,
    job_id      uuid NOT NULL,
    user_id     uuid NOT NULL,
    sent_at     timestamptz NOT NULL DEFAULT now(),
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: one alert can only fire once per job
CREATE UNIQUE INDEX IF NOT EXISTS uq_job_alert_notifications_alert_job
    ON public.job_alert_notifications (alert_id, job_id);

-- Index for looking up by user (for stats / cleanup)
CREATE INDEX IF NOT EXISTS idx_job_alert_notifications_user
    ON public.job_alert_notifications (user_id);

-- Index for looking up by job (for dedup checks)
CREATE INDEX IF NOT EXISTS idx_job_alert_notifications_job
    ON public.job_alert_notifications (job_id);

-- ============================================================================
-- 2. RLS POLICIES for job_alert_notifications
-- ============================================================================
-- Users can only see their own alert notifications (read-only from client).
-- All writes happen via SECURITY DEFINER function (process_job_alerts).

ALTER TABLE public.job_alert_notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own delivery records
DROP POLICY IF EXISTS job_alert_notifications_select_own ON public.job_alert_notifications;
CREATE POLICY job_alert_notifications_select_own
    ON public.job_alert_notifications
    FOR SELECT
    USING (user_id = auth.uid());

-- No client-side INSERT/UPDATE/DELETE — only the SECURITY DEFINER function does that
DROP POLICY IF EXISTS job_alert_notifications_insert_own ON public.job_alert_notifications;
DROP POLICY IF EXISTS job_alert_notifications_update_own ON public.job_alert_notifications;
DROP POLICY IF EXISTS job_alert_notifications_delete_own ON public.job_alert_notifications;

-- ============================================================================
-- 3. PROCESS_JOB_ALERTS FUNCTION (replace existing if present)
-- ============================================================================
-- This function:
--   1. Finds all active job alerts that match a given job (or all recent jobs)
--   2. Checks frequency eligibility (daily/weekly/biweekly/monthly)
--   3. Checks dedup table to avoid duplicate delivery
--   4. Inserts a notification into the notifications table
--   5. Records delivery in job_alert_notifications
--   6. Updates last_sent_at on the alert
--
-- Security: SECURITY DEFINER so it can write to notifications + job_alert_notifications
--           regardless of caller RLS. Called only by trigger or service_role.

CREATE OR REPLACE FUNCTION public.process_job_alerts(p_job_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_processed_count integer := 0;
    v_job record;
    v_alert record;
    v_notification_id uuid;
    v_freq_interval interval;
    v_eligible boolean;
    v_already_sent boolean;
    v_job_title text;
    v_job_company text;
    v_keywords_match boolean;
    v_location_match boolean;
    v_job_type_match boolean;
    v_exp_match boolean;
    v_salary_match boolean;
    v_keyword text;
BEGIN
    -- Iterate over the job(s) to process
    FOR v_job IN
        SELECT id, title, company_name, location, job_type, experience_level,
               salary_min, salary_max, is_active, status, created_at
        FROM public.jobs
        WHERE (p_job_id IS NULL OR id = p_job_id)
          AND is_active = true
          AND (status IS NULL OR status = 'approved' OR status = 'published' OR status = 'active')
          -- Only process jobs created in the last 7 days (when no specific job_id)
          AND (p_job_id IS NOT NULL OR created_at > now() - interval '7 days')
    LOOP
        v_job_title := COALESCE(v_job.title, 'New Job Posting');
        v_job_company := COALESCE(v_job.company_name, '');

        -- Iterate over active alerts
        FOR v_alert IN
            SELECT id, user_id, alert_name, keywords, location, job_type,
                   experience_level, min_salary, max_salary, frequency,
                   last_sent_at
            FROM public.job_alerts
            WHERE is_active = true
              AND user_id IS NOT NULL
        LOOP
            -- Check frequency eligibility
            v_eligible := true;
            IF v_alert.frequency IS NOT NULL AND v_alert.last_sent_at IS NOT NULL THEN
                v_freq_interval := CASE v_alert.frequency
                    WHEN 'daily' THEN interval '1 day'
                    WHEN 'weekly' THEN interval '7 days'
                    WHEN 'biweekly' THEN interval '14 days'
                    WHEN 'monthly' THEN interval '30 days'
                    ELSE interval '7 days' -- default to weekly
                END;
                IF now() - v_alert.last_sent_at < v_freq_interval THEN
                    v_eligible := false;
                END IF;
            END IF;

            IF NOT v_eligible THEN
                CONTINUE;
            END IF;

            -- Check dedup: has this alert already fired for this job?
            SELECT EXISTS(
                SELECT 1 FROM public.job_alert_notifications
                WHERE alert_id = v_alert.id AND job_id = v_job.id
            ) INTO v_already_sent;

            IF v_already_sent THEN
                CONTINUE;
            END IF;

            -- ---- MATCHING LOGIC ----

            -- Keywords match: at least one keyword must appear in title or company_name
            v_keywords_match := true; -- default true if no keywords specified
            IF v_alert.keywords IS NOT NULL AND array_length(v_alert.keywords, 1) > 0 THEN
                v_keywords_match := false;
                FOREACH v_keyword IN ARRAY v_alert.keywords LOOP
                    IF v_keyword IS NULL OR btrim(v_keyword) = '' THEN
                        CONTINUE;
                    END IF;
                    IF v_job.title ILIKE '%' || v_keyword || '%'
                       OR v_job.company_name ILIKE '%' || v_keyword || '%' THEN
                        v_keywords_match := true;
                        EXIT;
                    END IF;
                END LOOP;
            END IF;

            IF NOT v_keywords_match THEN
                CONTINUE;
            END IF;

            -- Location match: alert location must be contained in job location (or empty)
            v_location_match := true;
            IF v_alert.location IS NOT NULL AND btrim(v_alert.location) <> '' THEN
                v_location_match := v_job.location ILIKE '%' || v_alert.location || '%';
            END IF;

            IF NOT v_location_match THEN
                CONTINUE;
            END IF;

            -- Job type match
            v_job_type_match := true;
            IF v_alert.job_type IS NOT NULL AND btrim(v_alert.job_type) <> '' THEN
                v_job_type_match := (v_job.job_type = v_alert.job_type);
            END IF;

            IF NOT v_job_type_match THEN
                CONTINUE;
            END IF;

            -- Experience level match
            v_exp_match := true;
            IF v_alert.experience_level IS NOT NULL AND btrim(v_alert.experience_level) <> '' THEN
                v_exp_match := (v_job.experience_level = v_alert.experience_level);
            END IF;

            IF NOT v_exp_match THEN
                CONTINUE;
            END IF;

            -- Salary match: job salary range must overlap with alert salary range
            v_salary_match := true;
            IF v_alert.min_salary IS NOT NULL AND v_alert.max_salary IS NOT NULL THEN
                -- Alert specifies a range: job must overlap
                v_salary_match := (
                    (v_job.salary_max IS NULL OR v_job.salary_max >= v_alert.min_salary)
                    AND (v_job.salary_min IS NULL OR v_job.salary_min <= v_alert.max_salary)
                );
            ELSIF v_alert.min_salary IS NOT NULL THEN
                -- Alert specifies only min: job max must be >= alert min
                v_salary_match := (v_job.salary_max IS NULL OR v_job.salary_max >= v_alert.min_salary);
            ELSIF v_alert.max_salary IS NOT NULL THEN
                -- Alert specifies only max: job min must be <= alert max
                v_salary_match := (v_job.salary_min IS NULL OR v_job.salary_min <= v_alert.max_salary);
            END IF;

            IF NOT v_salary_match THEN
                CONTINUE;
            END IF;

            -- ---- ALL CRITERIA MATCHED — DELIVER ----

            -- 1. Insert notification
            v_notification_id := gen_random_uuid();
            INSERT INTO public.notifications (
                id, recipient_id, type, title, message, link,
                metadata, is_read, read_at, created_at, updated_at
            ) VALUES (
                v_notification_id,
                v_alert.user_id,
                'alert',
                'Job Alert: ' || v_alert.alert_name,
                'New job matching your alert "' || v_alert.alert_name || '": ' ||
                v_job_title || COALESCE(' at ' || v_job_company, ''),
                '/jobs/' || v_job.id,
                jsonb_build_object(
                    'entity_type', 'job',
                    'entity_id', v_job.id,
                    'alert_id', v_alert.id,
                    'audience', 'user',
                    'severity', 'info'
                ),
                false,
                NULL,
                now(),
                now()
            );

            -- 2. Record delivery in dedup table
            INSERT INTO public.job_alert_notifications (alert_id, job_id, user_id, sent_at)
            VALUES (v_alert.id, v_job.id, v_alert.user_id, now())
            ON CONFLICT (alert_id, job_id) DO NOTHING;

            -- 3. Update last_sent_at on the alert
            UPDATE public.job_alerts
            SET last_sent_at = now(), updated_at = now()
            WHERE id = v_alert.id;

            v_processed_count := v_processed_count + 1;
        END LOOP;
    END LOOP;

    RETURN v_processed_count;
END;
$$;

-- Revoke execute from anon and authenticated — only trigger/service_role should call this
REVOKE EXECUTE ON FUNCTION public.process_job_alerts(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_job_alerts(uuid) TO service_role;

-- ============================================================================
-- 4. TRIGGER: Fire process_job_alerts when a new job is inserted
-- ============================================================================
-- Uses AFTER INSERT so the job row is fully committed before matching.

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_job_alerts_on_job_insert ON public.jobs;

CREATE TRIGGER trg_job_alerts_on_job_insert
    AFTER INSERT ON public.jobs
    FOR EACH ROW
    WHEN (NEW.is_active = true)
    EXECUTE FUNCTION public.process_job_alerts(NEW.id);

-- ============================================================================
-- 5. ALSO FIRE on job status change to 'approved'/'published'/'active'
-- ============================================================================
-- Jobs may be created as 'pending' and later approved. We want alerts to fire
-- when the job becomes visible to users.

CREATE OR REPLACE FUNCTION public.trigger_process_job_alerts_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only fire if the job just became active/approved/published
    IF (NEW.is_active = true AND OLD.is_active = false)
       OR (NEW.status IS DISTINCT FROM OLD.status
           AND NEW.status IN ('approved', 'published', 'active')) THEN
        PERFORM public.process_job_alerts(NEW.id);
    END IF;
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.trigger_process_job_alerts_on_update() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_process_job_alerts_on_update() TO service_role;

DROP TRIGGER IF EXISTS trg_job_alerts_on_job_update ON public.jobs;

CREATE TRIGGER trg_job_alerts_on_job_update
    AFTER UPDATE OF is_active, status ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_process_job_alerts_on_update();

-- ============================================================================
-- 6. FIX update_job_alert RPC: treat NULL params as "skip" not "set to NULL"
-- ============================================================================
-- We need to inspect the existing function and replace it with one that
-- uses COALESCE to preserve unchanged fields.
-- This is a safe replacement that only updates fields when non-NULL is passed.

CREATE OR REPLACE FUNCTION public.update_job_alert(
    p_id uuid,
    p_alert_name text DEFAULT NULL,
    p_keywords text[] DEFAULT NULL,
    p_location text DEFAULT NULL,
    p_job_type text DEFAULT NULL,
    p_experience_level text DEFAULT NULL,
    p_min_salary integer DEFAULT NULL,
    p_max_salary integer DEFAULT NULL,
    p_frequency text DEFAULT NULL,
    p_is_active boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_owner uuid;
    v_count integer;
BEGIN
    -- Ownership check: only the alert owner can update
    SELECT user_id INTO v_owner FROM public.job_alerts WHERE id = p_id;

    IF v_owner IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Alert not found');
    END IF;

    IF v_owner <> auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'error', 'You do not have permission to update this alert');
    END IF;

    -- Enforce 10-alert limit only when creating (not updating)
    -- (create_job_alert handles the limit)

    -- Update only non-NULL fields — NULL means "don't change this field"
    -- Special case: p_is_active = false is a valid value, not "skip"
    UPDATE public.job_alerts
    SET
        alert_name = COALESCE(p_alert_name, alert_name),
        keywords = COALESCE(p_keywords, keywords),
        location = COALESCE(p_location, location),
        job_type = COALESCE(p_job_type, job_type),
        experience_level = COALESCE(p_experience_level, experience_level),
        min_salary = COALESCE(p_min_salary, min_salary),
        max_salary = COALESCE(p_max_salary, max_salary),
        frequency = COALESCE(p_frequency, frequency),
        is_active = CASE WHEN p_is_active IS NOT NULL THEN p_is_active ELSE is_active END,
        updated_at = now()
    WHERE id = p_id AND user_id = auth.uid();

    GET DIAGNOSTICS v_count = ROW_COUNT;

    IF v_count = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Failed to update alert');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_job_alert(uuid, text, text[], text, text, text, integer, integer, text, boolean) TO authenticated;

-- ============================================================================
-- 7. VERIFY create_job_alert has ownership + limit enforcement
-- ============================================================================
-- We need to ensure create_job_alert uses auth.uid() not a caller-supplied user_id.
-- Since we can't see the existing function body, we create a safe version.

CREATE OR REPLACE FUNCTION public.create_job_alert(
    p_alert_name text,
    p_keywords text[] DEFAULT NULL,
    p_location text DEFAULT NULL,
    p_job_type text DEFAULT NULL,
    p_experience_level text DEFAULT NULL,
    p_min_salary integer DEFAULT NULL,
    p_max_salary integer DEFAULT NULL,
    p_frequency text DEFAULT 'weekly',
    p_is_active boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count integer;
    v_alert_id uuid;
BEGIN
    -- Must be authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Enforce 10-alert limit
    SELECT count(*) INTO v_count
    FROM public.job_alerts
    WHERE user_id = auth.uid();

    IF v_count >= 10 THEN
        RETURN jsonb_build_object('success', false, 'error', 'You can have at most 10 job alerts. Please delete one before creating a new alert.');
    END IF;

    -- Validate alert_name
    IF p_alert_name IS NULL OR btrim(p_alert_name) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Alert name is required');
    END IF;

    -- Validate salary range
    IF p_min_salary IS NOT NULL AND p_max_salary IS NOT NULL AND p_min_salary > p_max_salary THEN
        RETURN jsonb_build_object('success', false, 'error', 'Minimum salary cannot be greater than maximum salary');
    END IF;

    -- Insert with auth.uid() as owner (NOT a caller-supplied user_id)
    v_alert_id := gen_random_uuid();
    INSERT INTO public.job_alerts (
        id, user_id, alert_name, keywords, location, job_type,
        experience_level, min_salary, max_salary, frequency, is_active,
        created_at, updated_at
    ) VALUES (
        v_alert_id, auth.uid(), btrim(p_alert_name), p_keywords, p_location, p_job_type,
        p_experience_level, p_min_salary, p_max_salary, p_frequency, p_is_active,
        now(), now()
    );

    RETURN jsonb_build_object('success', true, 'alert_id', v_alert_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_job_alert(text, text[], text, text, text, integer, integer, text, boolean) TO authenticated;

-- ============================================================================
-- 8. VERIFY delete_job_alert has ownership check
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_job_alert(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count integer;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    DELETE FROM public.job_alerts
    WHERE id = p_id AND user_id = auth.uid();

    GET DIAGNOSTICS v_count = ROW_COUNT;

    IF v_count = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Alert not found or you do not have permission to delete it');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_job_alert(uuid) TO authenticated;

-- ============================================================================
-- 9. VERIFY get_alert_performance_stats uses auth.uid()
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_alert_performance_stats(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_total_alerts integer;
    v_active_alerts integer;
    v_jobs_this_week integer;
    v_alerts_sent integer;
BEGIN
    -- Use auth.uid() if no user_id provided, or verify the provided user_id matches
    v_user_id := COALESCE(p_user_id, auth.uid());

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Security: if a user_id is passed, it must match auth.uid()
    IF p_user_id IS NOT NULL AND p_user_id <> auth.uid() THEN
        RAISE EXCEPTION 'You can only view your own alert stats';
    END IF;

    SELECT count(*) INTO v_total_alerts
    FROM public.job_alerts WHERE user_id = v_user_id;

    SELECT count(*) INTO v_active_alerts
    FROM public.job_alerts WHERE user_id = v_user_id AND is_active = true;

    SELECT count(*) INTO v_jobs_this_week
    FROM public.jobs
    WHERE is_active = true
      AND created_at > now() - interval '7 days';

    SELECT count(*) INTO v_alerts_sent
    FROM public.job_alert_notifications WHERE user_id = v_user_id;

    RETURN jsonb_build_object(
        'total_alerts', v_total_alerts,
        'active_alerts', v_active_alerts,
        'jobs_this_week', v_jobs_this_week,
        'alerts_sent', v_alerts_sent
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_alert_performance_stats(uuid) TO authenticated;

-- ============================================================================
-- 10. VERIFY notification RPCs use auth.uid() for ownership
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Only the recipient can mark their own notification as read
    UPDATE public.notifications
    SET is_read = true, read_at = now(), updated_at = now()
    WHERE id = p_notification_id AND recipient_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_notification_unread(p_notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    UPDATE public.notifications
    SET is_read = false, read_at = NULL, updated_at = now()
    WHERE id = p_notification_id AND recipient_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_notification_unread(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    UPDATE public.notifications
    SET is_read = true, read_at = now(), updated_at = now()
    WHERE recipient_id = auth.uid() AND is_read = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count integer;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN 0;
    END IF;

    SELECT count(*) INTO v_count
    FROM public.notifications
    WHERE recipient_id = auth.uid() AND is_read = false;

    RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_unread_notification_count() TO authenticated;

-- ============================================================================
-- 11. VERIFY get_notifications_paginated uses auth.uid()
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_notifications_paginated(
    p_limit integer DEFAULT 12,
    p_offset integer DEFAULT 0,
    p_is_read boolean DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    recipient_id uuid,
    type text,
    title text,
    message text,
    link text,
    metadata jsonb,
    is_read boolean,
    read_at timestamptz,
    created_at timestamptz,
    sender_id uuid,
    event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        n.id, n.recipient_id, n.type, n.title, n.message, n.link,
        n.metadata, n.is_read, n.read_at, n.created_at, n.sender_id, n.event_id
    FROM public.notifications n
    WHERE n.recipient_id = auth.uid()
      AND (p_is_read IS NULL OR n.is_read = p_is_read)
    ORDER BY n.is_read ASC, n.created_at DESC
    LIMIT LEAST(p_limit, 100)  -- cap at 100 to prevent abuse
    OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_notifications_paginated(integer, integer, boolean) TO authenticated;

-- ============================================================================
-- 12. RLS POLICIES for notifications (ensure cross-user isolation)
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only SELECT their own notifications
DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own
    ON public.notifications
    FOR SELECT
    USING (recipient_id = auth.uid());

-- No direct INSERT/UPDATE/DELETE from client — only via SECURITY DEFINER RPCs
-- (process_job_alerts inserts notifications as SECURITY DEFINER, bypassing RLS)
DROP POLICY IF EXISTS notifications_insert_own ON public.notifications;
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
DROP POLICY IF EXISTS notifications_delete_own ON public.notifications;

-- ============================================================================
-- 13. RLS POLICIES for job_alerts (ensure cross-user isolation)
-- ============================================================================

ALTER TABLE public.job_alerts ENABLE ROW LEVEL SECURITY;

-- Users can only SELECT their own alerts
DROP POLICY IF EXISTS job_alerts_select_own ON public.job_alerts;
CREATE POLICY job_alerts_select_own
    ON public.job_alerts
    FOR SELECT
    USING (user_id = auth.uid());

-- No direct INSERT/UPDATE/DELETE from client — only via SECURITY DEFINER RPCs
DROP POLICY IF EXISTS job_alerts_insert_own ON public.job_alerts;
DROP POLICY IF EXISTS job_alerts_update_own ON public.job_alerts;
DROP POLICY IF EXISTS job_alerts_delete_own ON public.job_alerts;

-- ============================================================================
-- 14. GRANTS
-- ============================================================================

GRANT SELECT ON public.job_alert_notifications TO authenticated;
GRANT SELECT ON public.bell_notifications TO authenticated;
GRANT SELECT ON public.admin_bell_notifications TO authenticated;
GRANT SELECT ON public.v_notification_prefs TO authenticated;
GRANT SELECT ON public.notification_preferences TO authenticated;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (run after migration to confirm)
-- ============================================================================

-- Check table exists:
-- SELECT * FROM pg_tables WHERE tablename = 'job_alert_notifications';

-- Check function exists:
-- SELECT proname FROM pg_proc WHERE proname = 'process_job_alerts';

-- Check trigger exists:
-- SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trg_job_alerts%';

-- Check RLS is enabled:
-- SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('notifications', 'job_alerts', 'job_alert_notifications');

-- Check policies:
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename IN ('notifications', 'job_alerts', 'job_alert_notifications');
