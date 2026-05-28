-- ============================================================================
-- SPEC A–F IMPLEMENTATION MIGRATION
-- Team: OPIB-∞ + UUX-∞ + Supreme DB Architect
-- Date: 2025-12-12
-- ============================================================================
-- This migration implements all spec items A–F:
--   A. Auth, Profile, Degrees, Achievements, Privacy
--   B. Jobs – Education Requirements & Contact Info
--   C. Events – Deadlines, Sponsor, Cost, Volunteering
--   D. Event Feedback – Attendee Form
--   F. Admin – Data Backup, Import Validation & Duplicates
-- ============================================================================

-- Enable pgcrypto for password hashing (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- A1. SECURITY QUESTIONS
-- ============================================================================

-- Create security_questions table
CREATE TABLE IF NOT EXISTS public.security_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_security_question_profile UNIQUE (profile_id)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_security_questions_profile_id
  ON public.security_questions(profile_id);

-- Enable RLS
ALTER TABLE public.security_questions ENABLE ROW LEVEL SECURITY;

-- RLS: Owner can manage their own security question
CREATE POLICY "owner_manage_own_security_question"
  ON public.security_questions
  FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_security_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_security_questions_updated_at ON public.security_questions;
CREATE TRIGGER trg_security_questions_updated_at
  BEFORE UPDATE ON public.security_questions
  FOR EACH ROW EXECUTE FUNCTION update_security_questions_updated_at();

-- ============================================================================
-- A1. SECURITY QUESTION RPCs
-- ============================================================================

-- RPC: Set security question (hashes answer, never exposes hash)
CREATE OR REPLACE FUNCTION public.set_my_security_question(
  p_question text,
  p_answer_plaintext text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
  v_answer_hash text;
BEGIN
  -- Validate inputs
  IF p_question IS NULL OR trim(p_question) = '' THEN
    RAISE EXCEPTION 'Security question cannot be empty' USING ERRCODE = 'check_violation';
  END IF;
  
  IF p_answer_plaintext IS NULL OR length(trim(p_answer_plaintext)) < 3 THEN
    RAISE EXCEPTION 'Security answer must be at least 3 characters' USING ERRCODE = 'check_violation';
  END IF;
  
  -- Hash the answer using bcrypt
  v_answer_hash := crypt(lower(trim(p_answer_plaintext)), gen_salt('bf'));
  
  -- Upsert the security question
  INSERT INTO public.security_questions (profile_id, question, answer_hash)
  VALUES (v_profile_id, trim(p_question), v_answer_hash)
  ON CONFLICT (profile_id) DO UPDATE
  SET question = EXCLUDED.question,
      answer_hash = EXCLUDED.answer_hash,
      updated_at = now();
  
  -- Log to activity_events
  INSERT INTO public.activity_events (
    actor_id, category, action_code, action_label,
    entity_type, entity_id, metadata
  ) VALUES (
    v_profile_id, 'update', 'security_question_updated', 'Updated security question',
    'profile', v_profile_id, '{"field": "security_question"}'::jsonb
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC: Get my security question (question only, never hash)
CREATE OR REPLACE FUNCTION public.get_my_security_question()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
  v_question text;
BEGIN
  SELECT question INTO v_question
  FROM public.security_questions
  WHERE profile_id = v_profile_id;
  
  IF v_question IS NULL THEN
    RETURN jsonb_build_object('has_question', false, 'question', null);
  END IF;
  
  RETURN jsonb_build_object('has_question', true, 'question', v_question);
END;
$$;

-- RPC: Verify security answer (for password reset gating)
CREATE OR REPLACE FUNCTION public.verify_my_security_answer(
  p_answer_plaintext text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
  v_stored_hash text;
BEGIN
  SELECT answer_hash INTO v_stored_hash
  FROM public.security_questions
  WHERE profile_id = v_profile_id;
  
  IF v_stored_hash IS NULL THEN
    -- No security question set, allow through
    RETURN true;
  END IF;
  
  -- Compare using crypt
  RETURN v_stored_hash = crypt(lower(trim(p_answer_plaintext)), v_stored_hash);
END;
$$;

-- ============================================================================
-- A2. PROFILE DEGREES (Additional degrees)
-- ============================================================================

-- Create profile_degrees table
CREATE TABLE IF NOT EXISTS public.profile_degrees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  degree_code text NOT NULL,
  institution_name text,
  graduation_year int,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profile_degrees_profile_id
  ON public.profile_degrees(profile_id);

CREATE INDEX IF NOT EXISTS idx_profile_degrees_degree_code
  ON public.profile_degrees(degree_code);

-- Unique constraint: only one primary degree per profile
CREATE UNIQUE INDEX IF NOT EXISTS uq_profile_degrees_primary
  ON public.profile_degrees(profile_id)
  WHERE is_primary = true;

-- Enable RLS
ALTER TABLE public.profile_degrees ENABLE ROW LEVEL SECURITY;

-- RLS: Owner can manage their own degrees
CREATE POLICY "owner_manage_own_degrees"
  ON public.profile_degrees
  FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- RLS: Anyone can read degrees (for directory)
CREATE POLICY "anyone_can_read_degrees"
  ON public.profile_degrees
  FOR SELECT
  USING (true);

-- Trigger: Sync primary degree to profiles.degree_code
CREATE OR REPLACE FUNCTION sync_primary_degree_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting a new primary, unset others first
  IF NEW.is_primary = true THEN
    UPDATE public.profile_degrees
    SET is_primary = false
    WHERE profile_id = NEW.profile_id
      AND id != NEW.id
      AND is_primary = true;
    
    -- Sync to profiles.degree_code
    UPDATE public.profiles
    SET degree_code = NEW.degree_code
    WHERE id = NEW.profile_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_primary_degree ON public.profile_degrees;
CREATE TRIGGER trg_sync_primary_degree
  AFTER INSERT OR UPDATE OF is_primary, degree_code ON public.profile_degrees
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION sync_primary_degree_to_profile();

-- ============================================================================
-- A2. PROFILE DEGREES RPCs
-- ============================================================================

-- RPC: Get my degrees
CREATE OR REPLACE FUNCTION public.get_my_degrees()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', pd.id,
        'degree_code', pd.degree_code,
        'institution_name', pd.institution_name,
        'graduation_year', pd.graduation_year,
        'is_primary', pd.is_primary
      ) ORDER BY pd.is_primary DESC, pd.graduation_year DESC NULLS LAST
    ), '[]'::jsonb)
    FROM public.profile_degrees pd
    WHERE pd.profile_id = v_profile_id
  );
END;
$$;

-- RPC: Upsert my degree
CREATE OR REPLACE FUNCTION public.upsert_my_degree(
  p_id uuid DEFAULT NULL,
  p_degree_code text DEFAULT NULL,
  p_institution_name text DEFAULT NULL,
  p_graduation_year int DEFAULT NULL,
  p_is_primary boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
  v_result_id uuid;
BEGIN
  -- Validate degree_code
  IF p_degree_code IS NULL OR trim(p_degree_code) = '' THEN
    RAISE EXCEPTION 'Degree code is required' USING ERRCODE = 'check_violation';
  END IF;
  
  -- Validate graduation_year if provided
  IF p_graduation_year IS NOT NULL AND (p_graduation_year < 1900 OR p_graduation_year > extract(year from now()) + 10) THEN
    RAISE EXCEPTION 'Invalid graduation year' USING ERRCODE = 'check_violation';
  END IF;
  
  IF p_id IS NOT NULL THEN
    -- Update existing
    UPDATE public.profile_degrees
    SET degree_code = COALESCE(p_degree_code, degree_code),
        institution_name = p_institution_name,
        graduation_year = p_graduation_year,
        is_primary = p_is_primary,
        updated_at = now()
    WHERE id = p_id AND profile_id = v_profile_id
    RETURNING id INTO v_result_id;
    
    IF v_result_id IS NULL THEN
      RAISE EXCEPTION 'Degree not found or not owned by you' USING ERRCODE = '42501';
    END IF;
  ELSE
    -- Insert new
    INSERT INTO public.profile_degrees (profile_id, degree_code, institution_name, graduation_year, is_primary)
    VALUES (v_profile_id, trim(p_degree_code), p_institution_name, p_graduation_year, p_is_primary)
    RETURNING id INTO v_result_id;
  END IF;
  
  RETURN jsonb_build_object('success', true, 'id', v_result_id);
END;
$$;

-- RPC: Delete my degree
CREATE OR REPLACE FUNCTION public.delete_my_degree(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
  v_deleted_count int;
BEGIN
  DELETE FROM public.profile_degrees
  WHERE id = p_id AND profile_id = v_profile_id;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  IF v_deleted_count = 0 THEN
    RAISE EXCEPTION 'Degree not found or not owned by you' USING ERRCODE = '42501';
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- View: Profile degrees summary for directory
CREATE OR REPLACE VIEW public.v_profile_degrees_summary AS
SELECT
  p.id AS profile_id,
  pd_primary.degree_code AS primary_degree_code,
  COALESCE(
    (SELECT COUNT(*) FROM public.profile_degrees pd WHERE pd.profile_id = p.id) - 1,
    0
  )::int AS extra_degrees_count
FROM public.profiles p
LEFT JOIN public.profile_degrees pd_primary
  ON pd_primary.profile_id = p.id AND pd_primary.is_primary = true;

-- View: Aggregated profile degrees for directory/profile education lists
-- Produces a JSONB array of objects like:
--   [{ degree: 'MBA', institution: 'AMET', year: 2024, is_primary: true }, ...]
CREATE OR REPLACE VIEW public.v_profile_degrees_education AS
SELECT
  pd.profile_id,
  jsonb_agg(
    jsonb_build_object(
      'degree', pd.degree_code,
      'institution', pd.institution_name,
      'year', pd.graduation_year,
      'is_primary', pd.is_primary
    )
    ORDER BY pd.is_primary DESC, pd.graduation_year DESC NULLS LAST, pd.created_at DESC
  ) AS education
FROM public.profile_degrees pd
GROUP BY pd.profile_id;

-- ============================================================================
-- A3. PROFESSIONAL ACHIEVEMENTS
-- ============================================================================

-- Create achievement_category enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'achievement_category') THEN
    CREATE TYPE achievement_category AS ENUM (
      'award',
      'publication',
      'patent',
      'certification'
    );
  END IF;
END$$;

-- Create profile_achievements table (separate from existing achievements table)
CREATE TABLE IF NOT EXISTS public.profile_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category achievement_category NOT NULL,
  title text NOT NULL,
  organization text,
  year int,
  url text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_profile_achievements_profile_category
  ON public.profile_achievements(profile_id, category);

-- Enable RLS
ALTER TABLE public.profile_achievements ENABLE ROW LEVEL SECURITY;

-- RLS: Owner can manage their own achievements
CREATE POLICY "owner_manage_own_achievements"
  ON public.profile_achievements
  FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- RLS: Anyone can read achievements (for public profile)
CREATE POLICY "anyone_can_read_achievements"
  ON public.profile_achievements
  FOR SELECT
  USING (true);

-- ============================================================================
-- A3. ACHIEVEMENTS RPCs
-- ============================================================================

-- RPC: Get my achievements
CREATE OR REPLACE FUNCTION public.get_my_achievements()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', pa.id,
        'category', pa.category,
        'title', pa.title,
        'organization', pa.organization,
        'year', pa.year,
        'url', pa.url,
        'description', pa.description
      ) ORDER BY pa.year DESC NULLS LAST, pa.created_at DESC
    ), '[]'::jsonb)
    FROM public.profile_achievements pa
    WHERE pa.profile_id = v_profile_id
  );
END;
$$;

-- RPC: Upsert my achievement
CREATE OR REPLACE FUNCTION public.upsert_my_achievement(
  p_id uuid DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_organization text DEFAULT NULL,
  p_year int DEFAULT NULL,
  p_url text DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
  v_result_id uuid;
  v_category achievement_category;
BEGIN
  -- Validate title
  IF p_title IS NULL OR trim(p_title) = '' THEN
    RAISE EXCEPTION 'Title is required' USING ERRCODE = 'check_violation';
  END IF;
  
  -- Validate category
  IF p_category IS NOT NULL THEN
    BEGIN
      v_category := p_category::achievement_category;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Invalid category. Must be: award, publication, patent, or certification' USING ERRCODE = 'check_violation';
    END;
  END IF;
  
  -- Validate year if provided
  IF p_year IS NOT NULL AND (p_year < 1900 OR p_year > extract(year from now()) + 5) THEN
    RAISE EXCEPTION 'Invalid year' USING ERRCODE = 'check_violation';
  END IF;
  
  -- Validate URL format if provided
  IF p_url IS NOT NULL AND p_url !~ '^https?://' THEN
    RAISE EXCEPTION 'URL must start with http:// or https://' USING ERRCODE = 'check_violation';
  END IF;
  
  IF p_id IS NOT NULL THEN
    -- Update existing
    UPDATE public.profile_achievements
    SET category = COALESCE(v_category, category),
        title = COALESCE(trim(p_title), title),
        organization = p_organization,
        year = p_year,
        url = p_url,
        description = p_description,
        updated_at = now()
    WHERE id = p_id AND profile_id = v_profile_id
    RETURNING id INTO v_result_id;
    
    IF v_result_id IS NULL THEN
      RAISE EXCEPTION 'Achievement not found or not owned by you' USING ERRCODE = '42501';
    END IF;
  ELSE
    -- Insert new (category required for insert)
    IF v_category IS NULL THEN
      RAISE EXCEPTION 'Category is required for new achievements' USING ERRCODE = 'check_violation';
    END IF;
    
    INSERT INTO public.profile_achievements (profile_id, category, title, organization, year, url, description)
    VALUES (v_profile_id, v_category, trim(p_title), p_organization, p_year, p_url, p_description)
    RETURNING id INTO v_result_id;
  END IF;
  
  RETURN jsonb_build_object('success', true, 'id', v_result_id);
END;
$$;

-- RPC: Delete my achievement
CREATE OR REPLACE FUNCTION public.delete_my_achievement(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
  v_deleted_count int;
BEGIN
  DELETE FROM public.profile_achievements
  WHERE id = p_id AND profile_id = v_profile_id;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  IF v_deleted_count = 0 THEN
    RAISE EXCEPTION 'Achievement not found or not owned by you' USING ERRCODE = '42501';
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC: Get profile achievements (for public view)
CREATE OR REPLACE FUNCTION public.get_profile_achievements(p_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', pa.id,
        'category', pa.category,
        'title', pa.title,
        'organization', pa.organization,
        'year', pa.year,
        'url', pa.url
      ) ORDER BY pa.year DESC NULLS LAST, pa.created_at DESC
    ), '[]'::jsonb)
    FROM public.profile_achievements pa
    WHERE pa.profile_id = p_profile_id
  );
END;
$$;

-- ============================================================================
-- B1. JOBS – EDUCATION REQUIREMENTS
-- ============================================================================

-- Create job_education_level enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_education_level') THEN
    CREATE TYPE job_education_level AS ENUM (
      'diploma',
      'bachelors',
      'masters',
      'phd',
      'other'
    );
  END IF;
END$$;

-- Add education_requirements array column to jobs
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS education_requirements job_education_level[] DEFAULT '{}';

-- GIN index for array containment queries
CREATE INDEX IF NOT EXISTS idx_jobs_education_requirements_gin
  ON public.jobs USING gin (education_requirements);

-- ============================================================================
-- B2. JOBS – CONTACT INFO
-- ============================================================================

-- Add contact columns (contact_email already exists, add name and phone)
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_phone text;

-- ============================================================================
-- B. JOBS RPCs
-- ============================================================================

-- RPC: Search jobs with education filter
CREATE OR REPLACE FUNCTION public.search_jobs_with_education(
  p_filters jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
  v_user_education_levels job_education_level[];
  v_match_my_education boolean;
  v_result jsonb;
BEGIN
  -- Extract filter options
  v_match_my_education := COALESCE((p_filters->>'match_my_education')::boolean, false);
  
  -- If matching user's education, get their degree level
  IF v_match_my_education AND v_profile_id IS NOT NULL THEN
    -- Map user's degree_code to education level
    -- This is a simplified mapping; adjust based on your degree catalog
    SELECT ARRAY[
      CASE 
        WHEN p.degree_code ILIKE '%phd%' OR p.degree_code ILIKE '%doctor%' THEN 'phd'::job_education_level
        WHEN p.degree_code ILIKE '%master%' OR p.degree_code ILIKE '%mba%' OR p.degree_code ILIKE '%m.%' THEN 'masters'::job_education_level
        WHEN p.degree_code ILIKE '%bachelor%' OR p.degree_code ILIKE '%b.%' OR p.degree_code ILIKE '%be%' OR p.degree_code ILIKE '%btech%' THEN 'bachelors'::job_education_level
        WHEN p.degree_code ILIKE '%diploma%' THEN 'diploma'::job_education_level
        ELSE 'other'::job_education_level
      END
    ]
    INTO v_user_education_levels
    FROM public.profiles p
    WHERE p.id = v_profile_id;
  END IF;
  
  -- Build and execute query
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', j.id,
      'title', j.title,
      'company_name', j.company_name,
      'location', j.location,
      'job_type', j.job_type,
      'description', j.description,
      'salary_range', j.salary_range,
      'education_requirements', j.education_requirements,
      'contact_name', CASE WHEN j.approval_status = 'approved' THEN j.contact_name END,
      'contact_email', CASE WHEN j.approval_status = 'approved' THEN j.contact_email END,
      'contact_phone', CASE WHEN j.approval_status = 'approved' THEN j.contact_phone END,
      'application_url', j.application_url,
      'created_at', j.created_at,
      'is_approved', j.is_approved,
      'approval_status', j.approval_status
    ) ORDER BY j.created_at DESC
  ), '[]'::jsonb)
  INTO v_result
  FROM public.jobs j
  WHERE j.approval_status = 'approved'
    AND j.is_active = true
    AND (
      NOT v_match_my_education
      OR j.education_requirements = '{}'::job_education_level[]
      OR j.education_requirements && v_user_education_levels
    );
  
  RETURN v_result;
END;
$$;

-- ============================================================================
-- C1. EVENTS – REGISTRATION DEADLINE (already exists, add enforcement)
-- ============================================================================

-- Add has_cost boolean (events already has registration_deadline and sponsors)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS has_cost boolean NOT NULL DEFAULT false;

-- Rename sponsors to sponsor_name if it's different (it's already 'sponsors')
-- We'll use the existing 'sponsors' column as sponsor_name

-- ============================================================================
-- C1. REGISTRATION DEADLINE ENFORCEMENT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION enforce_event_registration_deadline()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = NEW.event_id
      AND e.registration_deadline IS NOT NULL
      AND now() > e.registration_deadline
  ) THEN
    RAISE EXCEPTION 'Registrations closed for this event' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_event_rsvp_deadline ON public.event_rsvps;
CREATE TRIGGER trg_event_rsvp_deadline
  BEFORE INSERT ON public.event_rsvps
  FOR EACH ROW EXECUTE FUNCTION enforce_event_registration_deadline();

-- ============================================================================
-- C4. VOLUNTEERING INTEREST ON RSVP
-- ============================================================================

ALTER TABLE public.event_rsvps
  ADD COLUMN IF NOT EXISTS wants_to_volunteer boolean NOT NULL DEFAULT false;

-- ============================================================================
-- C4. VOLUNTEERS CSV RPC
-- ============================================================================

-- Helper function to check if user is admin or event owner
CREATE OR REPLACE FUNCTION is_admin_or_event_owner(p_event_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
  v_is_admin boolean;
  v_is_owner boolean;
BEGIN
  -- Check if admin
  SELECT COALESCE(is_admin, false) INTO v_is_admin
  FROM public.profiles WHERE id = v_profile_id;
  
  IF v_is_admin THEN RETURN true; END IF;
  
  -- Check if event owner
  SELECT EXISTS(
    SELECT 1 FROM public.events
    WHERE id = p_event_id
      AND (organizer_id = v_profile_id OR created_by = v_profile_id OR creator_id = v_profile_id)
  ) INTO v_is_owner;
  
  RETURN v_is_owner;
END;
$$;

-- RPC: Get event volunteers for CSV export
CREATE OR REPLACE FUNCTION public.admin_get_event_volunteers(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_or_event_owner(p_event_id) THEN
    RAISE EXCEPTION 'Forbidden: You must be an admin or event organizer' USING ERRCODE = '42501';
  END IF;
  
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'full_name', p.full_name,
        'email', p.email,
        'phone', p.phone_number,
        'rsvp_status', r.attendance_status,
        'rsvp_created_at', r.created_at
      ) ORDER BY r.created_at
    ), '[]'::jsonb)
    FROM public.event_rsvps r
    JOIN public.profiles p ON p.id = r.user_id
    WHERE r.event_id = p_event_id
      AND r.wants_to_volunteer = true
  );
END;
$$;

-- ============================================================================
-- D. EVENT FEEDBACK
-- ============================================================================

-- Create feedback_interest_level enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feedback_interest_level') THEN
    CREATE TYPE feedback_interest_level AS ENUM (
      'very_interested',
      'somewhat_interested',
      'not_interested'
    );
  END IF;
END$$;

-- Create event_feedback table
CREATE TABLE IF NOT EXISTS public.event_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Ratings (1-5)
  overall_rating smallint NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  content_rating smallint CHECK (content_rating BETWEEN 1 AND 5),
  speakers_rating smallint CHECK (speakers_rating BETWEEN 1 AND 5),
  logistics_rating smallint CHECK (logistics_rating BETWEEN 1 AND 5),
  venue_rating smallint CHECK (venue_rating BETWEEN 1 AND 5),
  communication_rating smallint CHECK (communication_rating BETWEEN 1 AND 5),
  
  -- Text feedback
  worked_well text,
  could_improve text,
  future_suggestions text,
  
  -- Interest level
  interest_level feedback_interest_level,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- One feedback per attendee per event
  CONSTRAINT uq_event_feedback_unique_attendee UNIQUE (event_id, profile_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_feedback_event_id
  ON public.event_feedback(event_id);

CREATE INDEX IF NOT EXISTS idx_event_feedback_profile_id
  ON public.event_feedback(profile_id);

-- Enable RLS
ALTER TABLE public.event_feedback ENABLE ROW LEVEL SECURITY;

-- RLS: Attendee can manage their own feedback
CREATE POLICY "attendee_manage_own_feedback"
  ON public.event_feedback
  FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- RLS: Admin/event owner can read all feedback for their events
CREATE POLICY "admin_event_owner_read_feedback"
  ON public.event_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_feedback.event_id
        AND (e.organizer_id = auth.uid() OR e.created_by = auth.uid() OR e.creator_id = auth.uid())
    )
  );

-- ============================================================================
-- D. EVENT FEEDBACK RPCs
-- ============================================================================

-- RPC: Submit event feedback
CREATE OR REPLACE FUNCTION public.submit_event_feedback(
  p_event_id uuid,
  p_overall_rating smallint,
  p_content_rating smallint DEFAULT NULL,
  p_speakers_rating smallint DEFAULT NULL,
  p_logistics_rating smallint DEFAULT NULL,
  p_venue_rating smallint DEFAULT NULL,
  p_communication_rating smallint DEFAULT NULL,
  p_worked_well text DEFAULT NULL,
  p_could_improve text DEFAULT NULL,
  p_interest_level text DEFAULT NULL,
  p_future_suggestions text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
  v_interest feedback_interest_level;
  v_result_id uuid;
BEGIN
  -- Check user has RSVP for this event
  IF NOT EXISTS (
    SELECT 1 FROM public.event_rsvps
    WHERE event_id = p_event_id AND user_id = v_profile_id
  ) THEN
    RAISE EXCEPTION 'Only attendees can submit feedback' USING ERRCODE = '42501';
  END IF;
  
  -- Check event has started (feedback only after event begins)
  IF NOT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = p_event_id
      AND (e.start_date < now() OR e.start_at < now())
  ) THEN
    RAISE EXCEPTION 'Feedback can only be submitted after the event starts' USING ERRCODE = 'check_violation';
  END IF;
  
  -- Validate overall rating
  IF p_overall_rating IS NULL OR p_overall_rating < 1 OR p_overall_rating > 5 THEN
    RAISE EXCEPTION 'Overall rating must be between 1 and 5' USING ERRCODE = 'check_violation';
  END IF;
  
  -- Parse interest level
  IF p_interest_level IS NOT NULL THEN
    BEGIN
      v_interest := p_interest_level::feedback_interest_level;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Invalid interest level' USING ERRCODE = 'check_violation';
    END;
  END IF;
  
  -- Upsert feedback
  INSERT INTO public.event_feedback (
    event_id, profile_id,
    overall_rating, content_rating, speakers_rating, logistics_rating, venue_rating, communication_rating,
    worked_well, could_improve, interest_level, future_suggestions
  ) VALUES (
    p_event_id, v_profile_id,
    p_overall_rating, p_content_rating, p_speakers_rating, p_logistics_rating, p_venue_rating, p_communication_rating,
    p_worked_well, p_could_improve, v_interest, p_future_suggestions
  )
  ON CONFLICT (event_id, profile_id) DO UPDATE
  SET overall_rating = EXCLUDED.overall_rating,
      content_rating = EXCLUDED.content_rating,
      speakers_rating = EXCLUDED.speakers_rating,
      logistics_rating = EXCLUDED.logistics_rating,
      venue_rating = EXCLUDED.venue_rating,
      communication_rating = EXCLUDED.communication_rating,
      worked_well = EXCLUDED.worked_well,
      could_improve = EXCLUDED.could_improve,
      interest_level = EXCLUDED.interest_level,
      future_suggestions = EXCLUDED.future_suggestions,
      updated_at = now()
  RETURNING id INTO v_result_id;
  
  RETURN jsonb_build_object('success', true, 'id', v_result_id);
END;
$$;

-- RPC: Get my feedback for an event
CREATE OR REPLACE FUNCTION public.get_my_event_feedback(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'id', ef.id,
      'overall_rating', ef.overall_rating,
      'content_rating', ef.content_rating,
      'speakers_rating', ef.speakers_rating,
      'logistics_rating', ef.logistics_rating,
      'venue_rating', ef.venue_rating,
      'communication_rating', ef.communication_rating,
      'worked_well', ef.worked_well,
      'could_improve', ef.could_improve,
      'interest_level', ef.interest_level,
      'future_suggestions', ef.future_suggestions,
      'created_at', ef.created_at,
      'updated_at', ef.updated_at
    )
    FROM public.event_feedback ef
    WHERE ef.event_id = p_event_id AND ef.profile_id = v_profile_id
  );
END;
$$;

-- RPC: Get event feedback summary (admin/organizer)
CREATE OR REPLACE FUNCTION public.get_event_feedback_summary(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_or_event_owner(p_event_id) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  
  RETURN (
    SELECT jsonb_build_object(
      'total_responses', COUNT(*),
      'avg_overall', ROUND(AVG(overall_rating)::numeric, 2),
      'avg_content', ROUND(AVG(content_rating)::numeric, 2),
      'avg_speakers', ROUND(AVG(speakers_rating)::numeric, 2),
      'avg_logistics', ROUND(AVG(logistics_rating)::numeric, 2),
      'avg_venue', ROUND(AVG(venue_rating)::numeric, 2),
      'avg_communication', ROUND(AVG(communication_rating)::numeric, 2),
      'interest_breakdown', jsonb_build_object(
        'very_interested', COUNT(*) FILTER (WHERE interest_level = 'very_interested'),
        'somewhat_interested', COUNT(*) FILTER (WHERE interest_level = 'somewhat_interested'),
        'not_interested', COUNT(*) FILTER (WHERE interest_level = 'not_interested')
      )
    )
    FROM public.event_feedback
    WHERE event_id = p_event_id
  );
END;
$$;

-- RPC: Get event feedback details (admin/organizer)
CREATE OR REPLACE FUNCTION public.get_event_feedback_details(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_or_event_owner(p_event_id) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', ef.id,
        'profile_name', p.full_name,
        'overall_rating', ef.overall_rating,
        'content_rating', ef.content_rating,
        'speakers_rating', ef.speakers_rating,
        'logistics_rating', ef.logistics_rating,
        'venue_rating', ef.venue_rating,
        'communication_rating', ef.communication_rating,
        'worked_well', ef.worked_well,
        'could_improve', ef.could_improve,
        'interest_level', ef.interest_level,
        'future_suggestions', ef.future_suggestions,
        'submitted_at', ef.created_at
      ) ORDER BY ef.created_at DESC
    ), '[]'::jsonb)
    FROM public.event_feedback ef
    JOIN public.profiles p ON p.id = ef.profile_id
    WHERE ef.event_id = p_event_id
  );
END;
$$;

-- ============================================================================
-- F1. CSV IMPORT – VALIDATION OPTIONS & DUPLICATE STRATEGY
-- ============================================================================

ALTER TABLE public.csv_import_history
  ADD COLUMN IF NOT EXISTS validation_mode text NOT NULL DEFAULT 'strict'
    CHECK (validation_mode IN ('strict', 'skip_invalid')),
  ADD COLUMN IF NOT EXISTS duplicate_strategy text NOT NULL DEFAULT 'skip'
    CHECK (duplicate_strategy IN ('skip', 'update', 'insert_anyway')),
  ADD COLUMN IF NOT EXISTS validation_summary jsonb DEFAULT '{}'::jsonb;

-- ============================================================================
-- F2. DATA VALIDATION RUNS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.data_validation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_by uuid REFERENCES public.profiles(id),
  scope text NOT NULL DEFAULT 'all',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  summary jsonb DEFAULT '{}'::jsonb,
  error_message text
);

-- Index
CREATE INDEX IF NOT EXISTS idx_data_validation_runs_run_by
  ON public.data_validation_runs(run_by);

-- Enable RLS
ALTER TABLE public.data_validation_runs ENABLE ROW LEVEL SECURITY;

-- RLS: Only admins can see validation runs
CREATE POLICY "admin_manage_validation_runs"
  ON public.data_validation_runs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- ============================================================================
-- F2. DATA VALIDATION RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_run_validation(p_scope text DEFAULT 'all')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
  v_is_admin boolean;
  v_run_id uuid;
  v_summary jsonb := '{}'::jsonb;
  v_orphan_rsvps int;
  v_orphan_applications int;
  v_orphan_group_members int;
  v_profiles_missing_email int;
  v_jobs_missing_title int;
  v_events_missing_title int;
BEGIN
  -- Check admin
  SELECT COALESCE(is_admin, false) INTO v_is_admin
  FROM public.profiles WHERE id = v_profile_id;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Forbidden: Admin access required' USING ERRCODE = '42501';
  END IF;
  
  -- Create run record
  INSERT INTO public.data_validation_runs (run_by, scope, status)
  VALUES (v_profile_id, p_scope, 'running')
  RETURNING id INTO v_run_id;
  
  BEGIN
    -- Check for orphan event_rsvps
    SELECT COUNT(*) INTO v_orphan_rsvps
    FROM public.event_rsvps r
    LEFT JOIN public.events e ON e.id = r.event_id
    WHERE e.id IS NULL;
    
    -- Check for orphan job_applications
    SELECT COUNT(*) INTO v_orphan_applications
    FROM public.job_applications ja
    LEFT JOIN public.jobs j ON j.id = ja.job_id
    WHERE j.id IS NULL;
    
    -- Check for orphan group_members
    SELECT COUNT(*) INTO v_orphan_group_members
    FROM public.group_members gm
    LEFT JOIN public.groups g ON g.id = gm.group_id
    WHERE g.id IS NULL;
    
    -- Check for profiles missing email
    SELECT COUNT(*) INTO v_profiles_missing_email
    FROM public.profiles
    WHERE email IS NULL OR trim(email) = '';
    
    -- Check for jobs missing title
    SELECT COUNT(*) INTO v_jobs_missing_title
    FROM public.jobs
    WHERE title IS NULL OR trim(title) = '';
    
    -- Check for events missing title
    SELECT COUNT(*) INTO v_events_missing_title
    FROM public.events
    WHERE title IS NULL OR trim(title) = '';
    
    -- Build summary
    v_summary := jsonb_build_object(
      'orphan_event_rsvps', v_orphan_rsvps,
      'orphan_job_applications', v_orphan_applications,
      'orphan_group_members', v_orphan_group_members,
      'profiles_missing_email', v_profiles_missing_email,
      'jobs_missing_title', v_jobs_missing_title,
      'events_missing_title', v_events_missing_title,
      'total_issues', v_orphan_rsvps + v_orphan_applications + v_orphan_group_members + v_profiles_missing_email + v_jobs_missing_title + v_events_missing_title
    );
    
    -- Update run record
    UPDATE public.data_validation_runs
    SET status = 'completed',
        finished_at = now(),
        summary = v_summary
    WHERE id = v_run_id;
    
  EXCEPTION WHEN OTHERS THEN
    UPDATE public.data_validation_runs
    SET status = 'failed',
        finished_at = now(),
        error_message = SQLERRM
    WHERE id = v_run_id;
    
    RAISE;
  END;
  
  RETURN jsonb_build_object(
    'success', true,
    'run_id', v_run_id,
    'summary', v_summary
  );
END;
$$;

-- RPC: Get validation run history
CREATE OR REPLACE FUNCTION public.admin_get_validation_runs(p_limit int DEFAULT 10)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  SELECT COALESCE(is_admin, false) INTO v_is_admin
  FROM public.profiles WHERE id = v_profile_id;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Forbidden: Admin access required' USING ERRCODE = '42501';
  END IF;
  
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', dvr.id,
        'run_by_name', p.full_name,
        'scope', dvr.scope,
        'status', dvr.status,
        'started_at', dvr.started_at,
        'finished_at', dvr.finished_at,
        'summary', dvr.summary,
        'error_message', dvr.error_message
      ) ORDER BY dvr.started_at DESC
    ), '[]'::jsonb)
    FROM public.data_validation_runs dvr
    LEFT JOIN public.profiles p ON p.id = dvr.run_by
    LIMIT p_limit
  );
END;
$$;

-- ============================================================================
-- BACKFILL: Migrate existing profiles.degree_code to profile_degrees
-- ============================================================================

-- Insert primary degree for profiles that have degree_code but no profile_degrees entry
INSERT INTO public.profile_degrees (profile_id, degree_code, graduation_year, is_primary)
SELECT p.id, p.degree_code, p.graduation_year, true
FROM public.profiles p
WHERE p.degree_code IS NOT NULL
  AND p.degree_code != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.profile_degrees pd
    WHERE pd.profile_id = p.id
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- GRANT EXECUTE ON ALL NEW FUNCTIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.set_my_security_question(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_security_question() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_my_security_answer(text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_my_degrees() TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_my_degree(uuid, text, text, int, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_degree(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_my_achievements() TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_my_achievement(uuid, text, text, text, int, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_achievement(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_achievements(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.search_jobs_with_education(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_event_volunteers(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.submit_event_feedback(uuid, smallint, smallint, smallint, smallint, smallint, smallint, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_event_feedback(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_feedback_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_feedback_details(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_run_validation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_validation_runs(int) TO authenticated;

-- ============================================================================
-- DONE
-- ============================================================================
