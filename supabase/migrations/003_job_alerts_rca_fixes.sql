-- ============================================================================
-- 003_job_alerts_rca_fixes.sql
-- RCA: Job Alerts Not Matching — Comprehensive Fix
-- ============================================================================
-- Root Causes Fixed:
--   RC1 (CRITICAL): Case-sensitive comparison on job_type in process_job_alerts()
--   RC2 (CRITICAL): Case-sensitive comparison on experience_level in process_job_alerts()
--   RC3 (CRITICAL): sync_resume_profile_to_job_alert references non-existent columns
--   RC4 (HIGH): update_job_alert COALESCE prevents clearing filters
--   RC5 (HIGH): experience_level='any' and keywords='{any}' stored as literals
--   RC6 (HIGH): get_alert_performance_stats has same case-sensitivity bugs
--   RC7 (HIGH): No idempotency — same alert+job can produce duplicate notifications
--   RC8 (HIGH): last_checked_at watermark advanced past jobs that were never matched
-- ============================================================================
-- Scope: In-app notifications only. No email/push.
-- ============================================================================

BEGIN;

-- ============================================================================
-- FIX 1+2+6: Rewrite process_job_alerts() with case-insensitive matching
--             and idempotency check
-- ============================================================================
-- Changes from live version:
--   1. job_type comparison: = → lower() = lower()  (case-insensitive)
--   2. experience_level comparison: = → lower() = lower()  (case-insensitive)
--   3. Add idempotency: skip if notification already exists for this alert+job
--   4. Normalize 'any' keyword: treat keywords={'any'} as no keyword filter

CREATE OR REPLACE FUNCTION public.process_job_alerts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_alert record;
  v_job record;
  v_count integer := 0;
  v_last_check timestamptz;
  v_notif_id uuid;
  v_alert_sent boolean;
  v_already_notified boolean;
BEGIN
  FOR v_alert IN
    SELECT * FROM job_alerts
    WHERE is_active = true
    AND (
      last_checked_at IS NULL
      OR (frequency = 'daily'    AND last_checked_at < now() - interval '1 day')
      OR (frequency = 'weekly'   AND last_checked_at < now() - interval '7 days')
      OR (frequency = 'biweekly' AND last_checked_at < now() - interval '14 days')
      OR (frequency = 'monthly'  AND last_checked_at < now() - interval '30 days')
    )
  LOOP
    -- Use last_checked_at (always advances) for job matching
    v_last_check := COALESCE(v_alert.last_checked_at, v_alert.created_at);
    v_alert_sent := false;

    FOR v_job IN
      SELECT j.id, j.title, j.company_name
      FROM jobs j
      WHERE j.is_active = true
        AND j.is_approved = true
        AND COALESCE(j.is_rejected, false) = false
        AND j.created_at > v_last_check
        -- Case-insensitive job_type match (FIX 1)
        AND (v_alert.job_type IS NULL OR v_alert.job_type = '' OR lower(j.job_type) = lower(v_alert.job_type))
        -- Case-insensitive experience_level match (FIX 2)
        AND (v_alert.experience_level IS NULL OR v_alert.experience_level = '' OR lower(j.experience_level) = lower(v_alert.experience_level))
        AND (v_alert.location IS NULL OR v_alert.location = '' OR j.location ILIKE '%' || v_alert.location || '%')
        AND (v_alert.min_salary IS NULL OR COALESCE(j.salary_max, 0) >= v_alert.min_salary)
        AND (v_alert.max_salary IS NULL OR COALESCE(j.salary_min, 0) <= v_alert.max_salary)
        -- Keyword match: treat {'any'} or {} as no filter (FIX 5-related)
        AND (
          v_alert.keywords IS NULL
          OR array_length(v_alert.keywords, 1) IS NULL
          OR v_alert.keywords = ARRAY['any']::text[]
          OR EXISTS (
            SELECT 1 FROM unnest(v_alert.keywords) k
            WHERE k IS NOT NULL AND k != 'any'
              AND (j.title ILIKE '%' || k || '%' OR j.description ILIKE '%' || k || '%')
          )
        )
      LIMIT 10
    LOOP
      -- FIX 6: Idempotency — skip if we already notified this user about this
      -- alert+job pair
      SELECT EXISTS(
        SELECT 1 FROM notifications n
        WHERE n.recipient_id = v_alert.user_id
          AND n.metadata->>'alert_id' = v_alert.id::text
          AND n.metadata->>'job_id' = v_job.id::text
      ) INTO v_already_notified;

      IF v_already_notified THEN
        CONTINUE;
      END IF;

      -- Use notify() to respect notification preferences
      v_notif_id := public.notify(
        v_alert.user_id,
        'job',
        'New job matching your alert: ' || v_alert.alert_name,
        'New job posted: ' || v_job.title || COALESCE(' at ' || v_job.company_name, ''),
        '/jobs/' || v_job.id::text,
        jsonb_build_object('job_id', v_job.id, 'alert_id', v_alert.id, 'entity_type', 'job', 'entity_id', v_job.id::text)
      );

      -- Only count if notification was actually created (not filtered by preferences)
      IF v_notif_id IS NOT NULL THEN
        v_count := v_count + 1;
        v_alert_sent := true;
      END IF;
    END LOOP;

    -- last_checked_at ALWAYS advances (we checked for matches)
    -- last_sent_at ONLY advances if at least one notification was sent
    IF v_alert_sent THEN
      UPDATE job_alerts SET last_checked_at = now(), last_sent_at = now() WHERE id = v_alert.id;
    ELSE
      UPDATE job_alerts SET last_checked_at = now() WHERE id = v_alert.id;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$function$;

-- ============================================================================
-- FIX 6 (cont): Rewrite get_alert_performance_stats() with case-insensitive
--               matching and 'any' keyword handling
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_alert_performance_stats(p_user_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(alert_id uuid, alert_name text, jobs_this_week integer, total_matches integer, avg_match_score numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ja.id AS alert_id,
    ja.alert_name,
    COALESCE((
      SELECT count(*)
      FROM jobs j
      WHERE j.is_active = true
        AND j.is_approved = true
        AND COALESCE(j.is_rejected, false) = false
        AND j.created_at >= now() - interval '7 days'
        AND (ja.keywords IS NULL OR ja.keywords = '{}' OR ja.keywords = ARRAY['any']::text[] OR
             EXISTS (SELECT 1 FROM unnest(ja.keywords) k WHERE k IS NOT NULL AND k != 'any' AND (j.title ILIKE '%'||k||'%' OR j.description ILIKE '%'||k||'%')))
        AND (ja.location IS NULL OR ja.location = '' OR j.location ILIKE '%'||ja.location||'%')
        AND (ja.job_type IS NULL OR ja.job_type = '' OR lower(j.job_type) = lower(ja.job_type))
        AND (ja.experience_level IS NULL OR ja.experience_level = '' OR lower(j.experience_level) = lower(ja.experience_level))
        AND (ja.min_salary IS NULL OR COALESCE(j.salary_max, 0) >= ja.min_salary)
        AND (ja.max_salary IS NULL OR COALESCE(j.salary_min, 0) <= ja.max_salary)
    ), 0)::integer AS jobs_this_week,
    COALESCE((
      SELECT count(*)
      FROM jobs j
      WHERE j.is_active = true
        AND j.is_approved = true
        AND COALESCE(j.is_rejected, false) = false
        AND j.created_at >= ja.created_at
        AND (ja.keywords IS NULL OR ja.keywords = '{}' OR ja.keywords = ARRAY['any']::text[] OR
             EXISTS (SELECT 1 FROM unnest(ja.keywords) k WHERE k IS NOT NULL AND k != 'any' AND (j.title ILIKE '%'||k||'%' OR j.description ILIKE '%'||k||'%')))
        AND (ja.location IS NULL OR ja.location = '' OR j.location ILIKE '%'||ja.location||'%')
        AND (ja.job_type IS NULL OR ja.job_type = '' OR lower(j.job_type) = lower(ja.job_type))
        AND (ja.experience_level IS NULL OR ja.experience_level = '' OR lower(j.experience_level) = lower(ja.experience_level))
        AND (ja.min_salary IS NULL OR COALESCE(j.salary_max, 0) >= ja.min_salary)
        AND (ja.max_salary IS NULL OR COALESCE(j.salary_min, 0) <= ja.max_salary)
    ), 0)::integer AS total_matches,
    0::numeric AS avg_match_score
  FROM job_alerts ja
  WHERE ja.user_id = p_user_id
    AND ja.is_active = true
  GROUP BY ja.id, ja.alert_name;
END;
$function$;

-- ============================================================================
-- FIX 3: Rewrite sync_resume_profile_to_job_alert with correct column names
-- ============================================================================
-- The live function referenced:
--   - job_alerts.locations (does not exist; correct column is `location`)
--   - job_alerts.alert_frequency (does not exist; correct column is `frequency`)
-- Also the trigger is BEFORE STATEMENT but should be BEFORE ROW to access NEW.*

CREATE OR REPLACE FUNCTION public.sync_resume_profile_to_job_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_freq text;
  v_location text;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_freq := COALESCE(NEW.job_alert_frequency, 'daily');
  IF v_freq NOT IN ('daily','weekly','biweekly','monthly') THEN
    v_freq := 'daily';
  END IF;

  -- Convert preferred_locations array to a single location string for job_alerts
  -- (job_alerts.location is a text column, not an array)
  SELECT COALESCE(array_to_string(NEW.preferred_locations, ', '), '')
  INTO v_location;

  INSERT INTO public.job_alerts AS ja (
    user_id, alert_name, keywords, location,
    is_active, frequency, created_at
  )
  VALUES (
    NEW.user_id,
    'profile-default',
    COALESCE(NEW.job_alert_keywords, ARRAY[]::text[]),
    NULLIF(v_location, ''),
    COALESCE(NEW.job_alert_active, true),
    v_freq,
    now()
  )
  ON CONFLICT (user_id, alert_name)
  DO UPDATE SET
    keywords   = EXCLUDED.keywords,
    location   = EXCLUDED.location,
    is_active  = EXCLUDED.is_active,
    frequency  = EXCLUDED.frequency,
    updated_at = now();

  RETURN NEW;
END;
$function$;

-- Drop and recreate the trigger as BEFORE ROW (not STATEMENT)
DROP TRIGGER IF EXISTS trg_sync_resume_profile_to_job_alert ON public.resume_profiles;
CREATE TRIGGER trg_sync_resume_profile_to_job_alert
  BEFORE INSERT OR UPDATE ON public.resume_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_resume_profile_to_job_alert();

-- ============================================================================
-- FIX 4: Rewrite update_job_alert to allow clearing filters
-- ============================================================================
-- The live version uses COALESCE(p_job_type, job_type) which means passing
-- NULL keeps the old value. Users can never clear a filter back to "Any".
--
-- Solution: Use a sentinel value '__clear__' to explicitly clear a field.
-- When the frontend sends null (for "Any"), it will send '__clear__' instead.
-- NULL means "don't change this field" (preserves COALESCE semantics for
-- fields the caller didn't include).
--
-- The frontend jobService.js will be updated to send '__clear__' for
-- job_type and experience_level when the user selects "Any".

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
RETURNS SETOF job_alerts
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  UPDATE job_alerts SET
    alert_name = COALESCE(p_alert_name, alert_name),
    -- keywords: use sentinel '__clear__' array to clear, NULL to skip
    keywords = CASE WHEN p_keywords = ARRAY['__clear__']::text[] THEN NULL ELSE COALESCE(p_keywords, keywords) END,
    -- location: empty string clears, NULL skips
    location = CASE WHEN p_location = '__clear__' THEN NULL ELSE COALESCE(p_location, location) END,
    -- job_type: '__clear__' clears, NULL skips
    job_type = CASE WHEN p_job_type = '__clear__' THEN NULL ELSE COALESCE(p_job_type, job_type) END,
    -- experience_level: '__clear__' clears, NULL skips
    experience_level = CASE WHEN p_experience_level = '__clear__' THEN NULL ELSE COALESCE(p_experience_level, experience_level) END,
    -- min_salary: -1 sentinel clears, NULL skips
    min_salary = CASE WHEN p_min_salary = -1 THEN NULL ELSE COALESCE(p_min_salary, min_salary) END,
    -- max_salary: -1 sentinel clears, NULL skips
    max_salary = CASE WHEN p_max_salary = -1 THEN NULL ELSE COALESCE(p_max_salary, max_salary) END,
    frequency = COALESCE(p_frequency, frequency),
    is_active = COALESCE(p_is_active, is_active),
    updated_at = now()
  WHERE id = p_id AND user_id = auth.uid()
  RETURNING *;
END;
$function$;

-- ============================================================================
-- FIX 8: Sanitize create_job_alert to reject 'any' as a literal value
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_job_alert(
  p_alert_name text,
  p_keywords text[] DEFAULT NULL::text[],
  p_location text DEFAULT NULL::text,
  p_job_type text DEFAULT NULL::text,
  p_experience_level text DEFAULT NULL::text,
  p_min_salary integer DEFAULT NULL::integer,
  p_max_salary integer DEFAULT NULL::integer,
  p_frequency text DEFAULT 'weekly'::text,
  p_is_active boolean DEFAULT true
)
RETURNS SETOF job_alerts
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_alert_name text;
  v_keywords text[];
  v_job_type text;
  v_exp_level text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT check_job_alert_rate_limit() THEN
    RAISE EXCEPTION 'Maximum 10 job alerts allowed per user';
  END IF;

  v_alert_name := trim(p_alert_name);
  IF v_alert_name IS NULL OR v_alert_name = '' THEN
    RAISE EXCEPTION 'Alert name is required';
  END IF;
  IF length(v_alert_name) > 100 THEN
    v_alert_name := left(v_alert_name, 100);
  END IF;

  IF p_keywords IS NOT NULL AND array_length(p_keywords, 1) > 50 THEN
    RAISE EXCEPTION 'Maximum 50 keywords allowed per alert';
  END IF;

  IF p_min_salary IS NOT NULL AND p_max_salary IS NOT NULL AND p_min_salary > p_max_salary THEN
    RAISE EXCEPTION 'Minimum salary cannot exceed maximum salary';
  END IF;

  -- Sanitize: treat 'any' as NULL for filter fields (FIX 8)
  v_keywords := p_keywords;
  IF v_keywords IS NOT NULL THEN
    -- Remove 'any' from keywords array (case-insensitive)
    v_keywords := ARRAY(SELECT k FROM unnest(v_keywords) k WHERE lower(k) != 'any');
    -- If array is empty after filtering, set to NULL
    IF array_length(v_keywords, 1) IS NULL THEN
      v_keywords := NULL;
    END IF;
  END IF;

  v_job_type := CASE WHEN lower(p_job_type) = 'any' THEN NULL ELSE p_job_type END;
  v_exp_level := CASE WHEN lower(p_experience_level) = 'any' THEN NULL ELSE p_experience_level END;

  RETURN QUERY
  INSERT INTO job_alerts (
    user_id, alert_name, keywords, location, job_type, experience_level,
    min_salary, max_salary, frequency, is_active
  ) VALUES (
    v_user_id, v_alert_name, v_keywords, p_location, v_job_type, v_exp_level,
    p_min_salary, p_max_salary, COALESCE(p_frequency, 'weekly'), COALESCE(p_is_active, true)
  )
  RETURNING *;

EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'An alert with this name already exists';
END;
$function$;

-- ============================================================================
-- FIX 5: Clean bad data — 'any' stored as literal in existing alerts
-- ============================================================================

-- Replace experience_level = 'any' with NULL
UPDATE job_alerts SET experience_level = NULL WHERE lower(experience_level) = 'any';

-- Remove 'any' from keywords arrays
UPDATE job_alerts
SET keywords = NULL
WHERE keywords IS NOT NULL
  AND array_length(keywords, 1) IS NOT NULL
  AND keywords = ARRAY['any']::text[];

-- Remove 'any' from multi-keyword arrays (keep other keywords)
UPDATE job_alerts
SET keywords = ARRAY(SELECT k FROM unnest(keywords) k WHERE lower(k) != 'any')
WHERE keywords IS NOT NULL
  AND array_length(keywords, 1) IS NOT NULL
  AND EXISTS (SELECT 1 FROM unnest(keywords) k WHERE lower(k) = 'any')
  AND EXISTS (SELECT 1 FROM unnest(keywords) k WHERE lower(k) != 'any');

-- Set keywords to NULL if array became empty after cleanup
UPDATE job_alerts
SET keywords = NULL
WHERE keywords IS NOT NULL
  AND array_length(keywords, 1) IS NULL;

-- ============================================================================
-- FIX 7: Reset last_checked_at so existing jobs get re-evaluated
-- ============================================================================
-- This allows the next cron run to check all jobs (not just jobs created after
-- the last failed check). Combined with the idempotency check (FIX 6), this
-- will not produce duplicate notifications for already-notified alert+job pairs.

UPDATE job_alerts SET last_checked_at = NULL WHERE is_active = true;

COMMIT;
