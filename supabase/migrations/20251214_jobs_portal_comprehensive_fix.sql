-- ============================================================================
-- JOBS PORTAL COMPREHENSIVE FIX MIGRATION
-- Addresses: RLS gaps, validation, constraints, indexes, security hardening
-- Date: 2024-12-14
-- ============================================================================

-- ============================================================================
-- SECTION A: HELPER FUNCTIONS FOR VALIDATION
-- ============================================================================

-- URL validation helper (safe schemes only)
CREATE OR REPLACE FUNCTION is_safe_url(url text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF url IS NULL OR url = '' THEN
    RETURN true; -- NULL/empty is allowed
  END IF;
  -- Only allow http, https, mailto schemes
  RETURN url ~* '^(https?://|mailto:)[^\s<>"'']+$';
END;
$$;

-- Rate limiting helper for job alerts
CREATE OR REPLACE FUNCTION check_job_alert_rate_limit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_max_alerts integer := 10; -- Max alerts per user
BEGIN
  SELECT count(*) INTO v_count
  FROM job_alerts
  WHERE user_id = auth.uid();
  
  RETURN v_count < v_max_alerts;
END;
$$;

-- Rate limiting helper for job postings
CREATE OR REPLACE FUNCTION check_job_posting_rate_limit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_max_per_day integer := 10; -- Max jobs per day per user
BEGIN
  SELECT count(*) INTO v_count
  FROM jobs
  WHERE (posted_by = auth.uid() OR created_by = auth.uid())
    AND created_at > now() - interval '24 hours';
  
  RETURN v_count < v_max_per_day;
END;
$$;

-- ============================================================================
-- SECTION B: CONSTRAINTS AND VALIDATION
-- ============================================================================

-- Add CHECK constraint for safe URLs on jobs table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'jobs_application_url_safe' AND conrelid = 'jobs'::regclass
  ) THEN
    ALTER TABLE jobs ADD CONSTRAINT jobs_application_url_safe 
      CHECK (is_safe_url(application_url));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'jobs_external_url_safe' AND conrelid = 'jobs'::regclass
  ) THEN
    ALTER TABLE jobs ADD CONSTRAINT jobs_external_url_safe 
      CHECK (is_safe_url(external_url));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'jobs_apply_url_safe' AND conrelid = 'jobs'::regclass
  ) THEN
    ALTER TABLE jobs ADD CONSTRAINT jobs_apply_url_safe 
      CHECK (is_safe_url(apply_url));
  END IF;
END $$;

-- Add salary range validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'jobs_salary_range_valid' AND conrelid = 'jobs'::regclass
  ) THEN
    ALTER TABLE jobs ADD CONSTRAINT jobs_salary_range_valid 
      CHECK (salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max);
  END IF;
END $$;

-- Add job_alerts constraints
DO $$
BEGIN
  -- Max keywords constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'job_alerts_max_keywords' AND conrelid = 'job_alerts'::regclass
  ) THEN
    ALTER TABLE job_alerts ADD CONSTRAINT job_alerts_max_keywords 
      CHECK (keywords IS NULL OR array_length(keywords, 1) <= 50);
  END IF;
  
  -- Salary range validation
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'job_alerts_salary_valid' AND conrelid = 'job_alerts'::regclass
  ) THEN
    ALTER TABLE job_alerts ADD CONSTRAINT job_alerts_salary_valid 
      CHECK (min_salary IS NULL OR max_salary IS NULL OR min_salary <= max_salary);
  END IF;
END $$;

-- ============================================================================
-- SECTION C: SERVER-SIDE VALIDATION RPC FOR JOB CREATION
-- ============================================================================

-- Drop existing function if exists to recreate with proper validation
DROP FUNCTION IF EXISTS create_job_validated(jsonb);

CREATE OR REPLACE FUNCTION create_job_validated(p_job_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
  v_is_employer_approved boolean;
  v_job_id uuid;
  v_title text;
  v_company_name text;
  v_location text;
  v_job_type text;
  v_description text;
  v_requirements text;
  v_salary_range text;
  v_salary_min bigint;
  v_salary_max bigint;
  v_application_url text;
  v_deadline timestamptz;
  v_skills text[];
  v_education_requirements job_education_level[];
  v_contact_name text;
  v_contact_email text;
  v_contact_phone text;
  v_logo_url text;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  -- Check if user is blocked
  IF is_user_blocked(v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Your account is blocked');
  END IF;
  
  -- Check admin or approved employer
  v_is_admin := fc_is_admin();
  v_is_employer_approved := fc_is_employer_approved(v_user_id);
  
  IF NOT v_is_admin AND NOT v_is_employer_approved THEN
    RETURN jsonb_build_object('success', false, 'error', 'You must be an approved employer to post jobs');
  END IF;
  
  -- Check rate limit
  IF NOT check_job_posting_rate_limit() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rate limit exceeded. Maximum 10 jobs per day.');
  END IF;
  
  -- Extract and validate fields
  v_title := trim(p_job_data->>'title');
  IF v_title IS NULL OR v_title = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job title is required');
  END IF;
  IF length(v_title) > 200 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job title must be 200 characters or less');
  END IF;
  
  v_company_name := trim(p_job_data->>'company_name');
  IF v_company_name IS NOT NULL AND length(v_company_name) > 100 THEN
    v_company_name := left(v_company_name, 100);
  END IF;
  
  v_location := trim(p_job_data->>'location');
  v_job_type := lower(trim(p_job_data->>'job_type'));
  v_description := trim(p_job_data->>'description');
  v_requirements := trim(p_job_data->>'requirements');
  v_salary_range := trim(p_job_data->>'salary_range');
  
  -- Parse salary min/max
  v_salary_min := (p_job_data->>'salary_min')::bigint;
  v_salary_max := (p_job_data->>'salary_max')::bigint;
  
  -- Validate salary range
  IF v_salary_min IS NOT NULL AND v_salary_max IS NOT NULL AND v_salary_min > v_salary_max THEN
    RETURN jsonb_build_object('success', false, 'error', 'Minimum salary cannot exceed maximum salary');
  END IF;
  
  -- Validate and sanitize application URL
  v_application_url := trim(p_job_data->>'application_url');
  IF v_application_url IS NOT NULL AND v_application_url != '' THEN
    IF NOT is_safe_url(v_application_url) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid application URL. Must start with http://, https://, or mailto:');
    END IF;
  END IF;
  
  -- Parse deadline
  BEGIN
    v_deadline := (p_job_data->>'deadline')::timestamptz;
  EXCEPTION WHEN OTHERS THEN
    v_deadline := NULL;
  END;
  
  -- Parse skills array
  IF p_job_data ? 'skills' AND jsonb_typeof(p_job_data->'skills') = 'array' THEN
    SELECT array_agg(trim(elem::text, '"'))
    INTO v_skills
    FROM jsonb_array_elements_text(p_job_data->'skills') elem
    WHERE trim(elem) != '';
  END IF;
  
  -- Parse education requirements
  IF p_job_data ? 'education_requirements' AND jsonb_typeof(p_job_data->'education_requirements') = 'array' THEN
    SELECT array_agg(trim(elem::text, '"')::job_education_level)
    INTO v_education_requirements
    FROM jsonb_array_elements_text(p_job_data->'education_requirements') elem
    WHERE trim(elem) != '';
  END IF;
  
  -- Contact info
  v_contact_name := trim(p_job_data->>'contact_name');
  v_contact_email := trim(p_job_data->>'contact_email');
  v_contact_phone := trim(p_job_data->>'contact_phone');
  v_logo_url := trim(p_job_data->>'logo_url');
  
  -- Validate contact email format if provided
  IF v_contact_email IS NOT NULL AND v_contact_email != '' THEN
    IF v_contact_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid contact email format');
    END IF;
  END IF;
  
  -- Insert the job
  INSERT INTO jobs (
    title,
    company_name,
    location,
    job_type,
    description,
    requirements,
    salary_range,
    salary_min,
    salary_max,
    application_url,
    deadline,
    application_deadline,
    skills,
    education_requirements,
    contact_name,
    contact_email,
    contact_phone,
    logo_url,
    posted_by,
    created_by,
    is_active,
    is_approved,
    status
  ) VALUES (
    v_title,
    v_company_name,
    v_location,
    v_job_type,
    v_description,
    v_requirements,
    v_salary_range,
    v_salary_min,
    v_salary_max,
    v_application_url,
    v_deadline,
    v_deadline,
    v_skills,
    COALESCE(v_education_requirements, '{}'::job_education_level[]),
    v_contact_name,
    v_contact_email,
    v_contact_phone,
    v_logo_url,
    v_user_id,
    v_user_id,
    true,
    CASE WHEN v_is_admin THEN true ELSE false END,
    CASE WHEN v_is_admin THEN 'active' ELSE 'draft' END
  )
  RETURNING id INTO v_job_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'job_id', v_job_id,
    'message', CASE WHEN v_is_admin THEN 'Job published successfully' ELSE 'Job submitted for approval' END
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION create_job_validated(jsonb) TO authenticated;

-- ============================================================================
-- SECTION D: SERVER-SIDE VALIDATION RPC FOR JOB UPDATE
-- ============================================================================

DROP FUNCTION IF EXISTS update_job_validated(uuid, jsonb);

CREATE OR REPLACE FUNCTION update_job_validated(p_job_id uuid, p_job_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
  v_is_owner boolean;
  v_existing_job jobs%ROWTYPE;
  v_title text;
  v_company_name text;
  v_location text;
  v_job_type text;
  v_description text;
  v_requirements text;
  v_salary_range text;
  v_salary_min bigint;
  v_salary_max bigint;
  v_application_url text;
  v_deadline timestamptz;
  v_skills text[];
  v_contact_name text;
  v_contact_email text;
  v_contact_phone text;
  v_logo_url text;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  -- Check if user is blocked
  IF is_user_blocked(v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Your account is blocked');
  END IF;
  
  -- Get existing job
  SELECT * INTO v_existing_job FROM jobs WHERE id = p_job_id;
  IF v_existing_job.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job not found');
  END IF;
  
  -- Check ownership or admin
  v_is_admin := fc_is_admin();
  v_is_owner := (v_existing_job.posted_by = v_user_id OR v_existing_job.created_by = v_user_id OR v_existing_job.user_id = v_user_id);
  
  IF NOT v_is_admin AND NOT v_is_owner THEN
    RETURN jsonb_build_object('success', false, 'error', 'You do not have permission to edit this job');
  END IF;
  
  -- Extract and validate fields (use existing values as defaults)
  v_title := COALESCE(NULLIF(trim(p_job_data->>'title'), ''), v_existing_job.title);
  IF length(v_title) > 200 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job title must be 200 characters or less');
  END IF;
  
  v_company_name := CASE 
    WHEN p_job_data ? 'company_name' THEN trim(p_job_data->>'company_name')
    ELSE v_existing_job.company_name
  END;
  IF v_company_name IS NOT NULL AND length(v_company_name) > 100 THEN
    v_company_name := left(v_company_name, 100);
  END IF;
  
  v_location := CASE WHEN p_job_data ? 'location' THEN trim(p_job_data->>'location') ELSE v_existing_job.location END;
  v_job_type := CASE WHEN p_job_data ? 'job_type' THEN lower(trim(p_job_data->>'job_type')) ELSE v_existing_job.job_type END;
  v_description := CASE WHEN p_job_data ? 'description' THEN trim(p_job_data->>'description') ELSE v_existing_job.description END;
  v_requirements := CASE WHEN p_job_data ? 'requirements' THEN trim(p_job_data->>'requirements') ELSE v_existing_job.requirements END;
  v_salary_range := CASE WHEN p_job_data ? 'salary_range' THEN trim(p_job_data->>'salary_range') ELSE v_existing_job.salary_range END;
  
  -- Parse salary min/max
  v_salary_min := CASE WHEN p_job_data ? 'salary_min' THEN (p_job_data->>'salary_min')::bigint ELSE v_existing_job.salary_min END;
  v_salary_max := CASE WHEN p_job_data ? 'salary_max' THEN (p_job_data->>'salary_max')::bigint ELSE v_existing_job.salary_max END;
  
  -- Validate salary range
  IF v_salary_min IS NOT NULL AND v_salary_max IS NOT NULL AND v_salary_min > v_salary_max THEN
    RETURN jsonb_build_object('success', false, 'error', 'Minimum salary cannot exceed maximum salary');
  END IF;
  
  -- Validate application URL
  v_application_url := CASE WHEN p_job_data ? 'application_url' THEN trim(p_job_data->>'application_url') ELSE v_existing_job.application_url END;
  IF v_application_url IS NOT NULL AND v_application_url != '' THEN
    IF NOT is_safe_url(v_application_url) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid application URL. Must start with http://, https://, or mailto:');
    END IF;
  END IF;
  
  -- Parse deadline
  IF p_job_data ? 'deadline' THEN
    BEGIN
      v_deadline := (p_job_data->>'deadline')::timestamptz;
    EXCEPTION WHEN OTHERS THEN
      v_deadline := v_existing_job.deadline;
    END;
  ELSE
    v_deadline := v_existing_job.deadline;
  END IF;
  
  -- Parse skills array
  IF p_job_data ? 'skills' AND jsonb_typeof(p_job_data->'skills') = 'array' THEN
    SELECT array_agg(trim(elem::text, '"'))
    INTO v_skills
    FROM jsonb_array_elements_text(p_job_data->'skills') elem
    WHERE trim(elem) != '';
  ELSE
    v_skills := v_existing_job.skills;
  END IF;
  
  -- Contact info
  v_contact_name := CASE WHEN p_job_data ? 'contact_name' THEN trim(p_job_data->>'contact_name') ELSE v_existing_job.contact_name END;
  v_contact_email := CASE WHEN p_job_data ? 'contact_email' THEN trim(p_job_data->>'contact_email') ELSE v_existing_job.contact_email END;
  v_contact_phone := CASE WHEN p_job_data ? 'contact_phone' THEN trim(p_job_data->>'contact_phone') ELSE v_existing_job.contact_phone END;
  v_logo_url := CASE WHEN p_job_data ? 'logo_url' THEN trim(p_job_data->>'logo_url') ELSE v_existing_job.logo_url END;
  
  -- Validate contact email format if provided
  IF v_contact_email IS NOT NULL AND v_contact_email != '' THEN
    IF v_contact_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid contact email format');
    END IF;
  END IF;
  
  -- Update the job
  UPDATE jobs SET
    title = v_title,
    company_name = v_company_name,
    location = v_location,
    job_type = v_job_type,
    description = v_description,
    requirements = v_requirements,
    salary_range = v_salary_range,
    salary_min = v_salary_min,
    salary_max = v_salary_max,
    application_url = v_application_url,
    deadline = v_deadline,
    application_deadline = v_deadline,
    skills = v_skills,
    contact_name = v_contact_name,
    contact_email = v_contact_email,
    contact_phone = v_contact_phone,
    logo_url = v_logo_url,
    updated_at = now()
  WHERE id = p_job_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'job_id', p_job_id,
    'message', 'Job updated successfully'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION update_job_validated(uuid, jsonb) TO authenticated;

-- ============================================================================
-- SECTION E: RPC FOR TOGGLING JOB VISIBILITY (PAUSE/RESUME)
-- ============================================================================

DROP FUNCTION IF EXISTS toggle_job_visibility(uuid, boolean);

CREATE OR REPLACE FUNCTION toggle_job_visibility(p_job_id uuid, p_is_active boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
  v_is_owner boolean;
  v_existing_job jobs%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  -- Get existing job
  SELECT * INTO v_existing_job FROM jobs WHERE id = p_job_id;
  IF v_existing_job.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job not found');
  END IF;
  
  -- Check ownership or admin
  v_is_admin := fc_is_admin();
  v_is_owner := (v_existing_job.posted_by = v_user_id OR v_existing_job.created_by = v_user_id OR v_existing_job.user_id = v_user_id);
  
  IF NOT v_is_admin AND NOT v_is_owner THEN
    RETURN jsonb_build_object('success', false, 'error', 'You do not have permission to modify this job');
  END IF;
  
  -- Cannot resume a rejected job
  IF p_is_active = true AND v_existing_job.is_rejected = true THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot resume a rejected job');
  END IF;
  
  UPDATE jobs SET
    is_active = p_is_active,
    updated_at = now()
  WHERE id = p_job_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'is_active', p_is_active,
    'message', CASE WHEN p_is_active THEN 'Job resumed' ELSE 'Job paused' END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION toggle_job_visibility(uuid, boolean) TO authenticated;

-- ============================================================================
-- SECTION F: ENHANCED JOB ALERTS RPC WITH RATE LIMITING
-- ============================================================================

-- Drop and recreate create_job_alert with rate limiting
DROP FUNCTION IF EXISTS create_job_alert(text, text[], text, text, text, integer, integer, text, boolean);

CREATE OR REPLACE FUNCTION create_job_alert(
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
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_alert_id uuid;
  v_alert_name text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Check rate limit
  IF NOT check_job_alert_rate_limit() THEN
    RAISE EXCEPTION 'Maximum 10 job alerts allowed per user';
  END IF;
  
  -- Validate alert name
  v_alert_name := trim(p_alert_name);
  IF v_alert_name IS NULL OR v_alert_name = '' THEN
    RAISE EXCEPTION 'Alert name is required';
  END IF;
  IF length(v_alert_name) > 100 THEN
    v_alert_name := left(v_alert_name, 100);
  END IF;
  
  -- Validate keywords count
  IF p_keywords IS NOT NULL AND array_length(p_keywords, 1) > 50 THEN
    RAISE EXCEPTION 'Maximum 50 keywords allowed per alert';
  END IF;
  
  -- Validate salary range
  IF p_min_salary IS NOT NULL AND p_max_salary IS NOT NULL AND p_min_salary > p_max_salary THEN
    RAISE EXCEPTION 'Minimum salary cannot exceed maximum salary';
  END IF;
  
  INSERT INTO job_alerts (
    user_id,
    alert_name,
    keywords,
    location,
    job_type,
    experience_level,
    min_salary,
    max_salary,
    frequency,
    is_active
  ) VALUES (
    v_user_id,
    v_alert_name,
    p_keywords,
    p_location,
    p_job_type,
    p_experience_level,
    p_min_salary,
    p_max_salary,
    COALESCE(p_frequency, 'weekly'),
    COALESCE(p_is_active, true)
  )
  RETURNING id INTO v_alert_id;
  
  RETURN jsonb_build_object('success', true, 'alert_id', v_alert_id);
  
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'An alert with this name already exists';
END;
$$;

GRANT EXECUTE ON FUNCTION create_job_alert(text, text[], text, text, text, integer, integer, text, boolean) TO authenticated;

-- ============================================================================
-- SECTION G: SANITIZATION TRIGGER FOR JOB DESCRIPTIONS
-- ============================================================================

-- Function to strip potentially dangerous content from text fields
CREATE OR REPLACE FUNCTION sanitize_job_text_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Strip script tags and event handlers from description
  IF NEW.description IS NOT NULL THEN
    NEW.description := regexp_replace(NEW.description, '<script[^>]*>.*?</script>', '', 'gi');
    NEW.description := regexp_replace(NEW.description, 'on\w+\s*=\s*[''"][^''"]*[''"]', '', 'gi');
    NEW.description := regexp_replace(NEW.description, 'javascript:', '', 'gi');
  END IF;
  
  -- Strip from requirements
  IF NEW.requirements IS NOT NULL THEN
    NEW.requirements := regexp_replace(NEW.requirements, '<script[^>]*>.*?</script>', '', 'gi');
    NEW.requirements := regexp_replace(NEW.requirements, 'on\w+\s*=\s*[''"][^''"]*[''"]', '', 'gi');
    NEW.requirements := regexp_replace(NEW.requirements, 'javascript:', '', 'gi');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS trg_sanitize_job_text ON jobs;
CREATE TRIGGER trg_sanitize_job_text
  BEFORE INSERT OR UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION sanitize_job_text_fields();

-- ============================================================================
-- SECTION H: ADDITIONAL INDEXES FOR PERFORMANCE
-- ============================================================================

-- Partial index for active approved jobs (common query pattern)
CREATE INDEX IF NOT EXISTS idx_jobs_live_feed 
  ON jobs (created_at DESC) 
  WHERE is_active = true AND is_approved = true AND COALESCE(is_rejected, false) = false;

-- Index for job alerts matching
CREATE INDEX IF NOT EXISTS idx_jobs_alert_matching 
  ON jobs (job_type, experience_level, location) 
  WHERE is_active = true AND is_approved = true;

-- Index for deadline-based queries
CREATE INDEX IF NOT EXISTS idx_jobs_deadline_active 
  ON jobs (deadline, application_deadline) 
  WHERE is_active = true AND is_approved = true;

-- ============================================================================
-- SECTION I: GRANT PERMISSIONS
-- ============================================================================

-- Ensure RPCs are accessible
GRANT EXECUTE ON FUNCTION is_safe_url(text) TO authenticated;
GRANT EXECUTE ON FUNCTION check_job_alert_rate_limit() TO authenticated;
GRANT EXECUTE ON FUNCTION check_job_posting_rate_limit() TO authenticated;

-- ============================================================================
-- SECTION J: ERROR MAPPING VIEW FOR FRONTEND
-- ============================================================================

-- Create a view for standardized error codes
CREATE OR REPLACE VIEW v_job_error_codes AS
SELECT * FROM (VALUES
  ('JOB_NOT_FOUND', 'The job you are looking for does not exist or has been removed.'),
  ('JOB_EXPIRED', 'This job listing has expired and is no longer accepting applications.'),
  ('JOB_PAUSED', 'This job listing is currently paused by the employer.'),
  ('JOB_REJECTED', 'This job listing has been rejected by administrators.'),
  ('NOT_AUTHORIZED', 'You do not have permission to perform this action.'),
  ('RATE_LIMIT_EXCEEDED', 'You have exceeded the rate limit. Please try again later.'),
  ('INVALID_URL', 'The provided URL is invalid. Please use http://, https://, or mailto: links.'),
  ('INVALID_SALARY', 'Invalid salary range. Minimum salary cannot exceed maximum salary.'),
  ('ALREADY_APPLIED', 'You have already applied to this job.'),
  ('BLOCKED_USER', 'Your account is blocked. Please contact support.')
) AS t(error_code, user_message);

GRANT SELECT ON v_job_error_codes TO authenticated;

-- ============================================================================
-- SECTION K: NOTIFICATION HELPER FOR JOB ALERTS
-- ============================================================================

-- Function to check and send job alert notifications (to be called by cron)
CREATE OR REPLACE FUNCTION process_job_alerts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert record;
  v_job record;
  v_count integer := 0;
  v_last_check timestamptz;
BEGIN
  -- Process each active alert
  FOR v_alert IN 
    SELECT * FROM job_alerts 
    WHERE is_active = true 
    AND (last_sent_at IS NULL OR 
         (frequency = 'daily' AND last_sent_at < now() - interval '1 day') OR
         (frequency = 'weekly' AND last_sent_at < now() - interval '7 days') OR
         (frequency = 'biweekly' AND last_sent_at < now() - interval '14 days') OR
         (frequency = 'monthly' AND last_sent_at < now() - interval '30 days'))
  LOOP
    v_last_check := COALESCE(v_alert.last_sent_at, v_alert.created_at);
    
    -- Find matching jobs posted since last check
    FOR v_job IN
      SELECT j.id, j.title, j.company_name
      FROM jobs j
      WHERE j.is_active = true
        AND j.is_approved = true
        AND COALESCE(j.is_rejected, false) = false
        AND j.created_at > v_last_check
        AND (v_alert.job_type IS NULL OR j.job_type = v_alert.job_type)
        AND (v_alert.experience_level IS NULL OR j.experience_level = v_alert.experience_level)
        AND (v_alert.location IS NULL OR j.location ILIKE '%' || v_alert.location || '%')
        AND (v_alert.min_salary IS NULL OR COALESCE(j.salary_max, 0) >= v_alert.min_salary)
        AND (v_alert.max_salary IS NULL OR COALESCE(j.salary_min, 0) <= v_alert.max_salary)
        AND (v_alert.keywords IS NULL OR array_length(v_alert.keywords, 1) = 0 OR
             EXISTS (
               SELECT 1 FROM unnest(v_alert.keywords) k
               WHERE j.title ILIKE '%' || k || '%' OR j.description ILIKE '%' || k || '%'
             ))
      LIMIT 10
    LOOP
      -- Insert notification
      INSERT INTO notifications (
        recipient_id,
        type,
        title,
        message,
        data,
        created_at
      ) VALUES (
        v_alert.user_id,
        'job_alert',
        'New job matching your alert: ' || v_alert.alert_name,
        'New job posted: ' || v_job.title || COALESCE(' at ' || v_job.company_name, ''),
        jsonb_build_object('job_id', v_job.id, 'alert_id', v_alert.id),
        now()
      );
      
      v_count := v_count + 1;
    END LOOP;
    
    -- Update last_sent_at
    UPDATE job_alerts SET last_sent_at = now() WHERE id = v_alert.id;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
