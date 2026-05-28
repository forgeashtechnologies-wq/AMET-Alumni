-- Ensure get_jobs_admin_v1 bypasses RLS by disabling row_security inside the SECURITY DEFINER function
BEGIN;

CREATE OR REPLACE FUNCTION public.get_jobs_admin_v1(
  p_search_query text DEFAULT NULL,
  p_sort_by text DEFAULT 'created_at',
  p_sort_order text DEFAULT 'desc',
  p_status text DEFAULT 'all',
  p_approval text DEFAULT 'all',
  p_job_type text DEFAULT NULL,
  p_experience_level text DEFAULT NULL,
  p_salary_min numeric DEFAULT NULL,
  p_salary_max numeric DEFAULT NULL,
  p_posted_since_days integer DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE
  v_jwt jsonb := current_setting('request.jwt.claims', true)::jsonb;
  v_jwt_role text := coalesce(v_jwt->>'role', '');
  v_profile_role text := NULL;
  v_is_admin boolean := false;
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_sort text := lower(coalesce(p_sort_by, 'created_at'));
  v_order text := case when lower(coalesce(p_sort_order, 'desc')) = 'asc' then 'asc' else 'desc' end;
  v_search text := nullif(trim(coalesce(p_search_query, '')), '');
  v_status text := lower(coalesce(nullif(p_status, ''), 'all'));
  v_approval text := lower(coalesce(nullif(p_approval, ''), 'all'));
  v_job_type text := lower(nullif(coalesce(p_job_type, ''), 'all'));
  v_experience text := lower(nullif(coalesce(p_experience_level, ''), 'all'));
  v_salary_min numeric := p_salary_min;
  v_salary_max numeric := p_salary_max;
  v_posted_days integer := p_posted_since_days;
  v_payload jsonb;
BEGIN
  -- Disable row-level security for the duration of this function so admins truly see every job row.
  PERFORM set_config('row_security', 'off', true);

  IF v_jwt_role IN ('service_role', 'supabase_admin') THEN
    v_is_admin := true;
  ELSE
    BEGIN
      SELECT role
      INTO v_profile_role
      FROM public.profiles
      WHERE id = auth.uid();
    EXCEPTION WHEN others THEN
      v_profile_role := NULL;
    END;
    v_is_admin := coalesce(v_profile_role, '') IN ('admin', 'super_admin');
  END IF;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_salary_min IS NOT NULL AND v_salary_min < 0 THEN
    v_salary_min := 0;
  END IF;
  IF v_salary_max IS NOT NULL AND v_salary_max < 0 THEN
    v_salary_max := NULL;
  END IF;

  WITH filtered AS (
    SELECT
      j.*,
      c.name AS company_name,
      c.logo_url AS company_logo_url
    FROM public.jobs j
    LEFT JOIN public.companies c ON c.id = j.company_id
    WHERE
      (v_job_type IS NULL OR lower(coalesce(j.job_type, '')) = v_job_type)
      AND (v_experience IS NULL OR lower(coalesce(j.experience_level, '')) = v_experience)
      AND (v_salary_min IS NULL OR coalesce(j.salary_max, j.salary_min, 0) >= v_salary_min)
      AND (v_salary_max IS NULL OR coalesce(j.salary_min, j.salary_max, 0) <= v_salary_max)
      AND (
        v_posted_days IS NULL
        OR j.created_at >= (now() - make_interval(days => greatest(v_posted_days, 0)))
      )
      AND (
        v_search IS NULL
        OR j.title ILIKE '%' || v_search || '%'
        OR coalesce(j.location, '') ILIKE '%' || v_search || '%'
        OR coalesce(c.name, '') ILIKE '%' || v_search || '%'
      )
      AND (
        v_approval = 'all'
        OR (v_approval = 'approved' AND j.is_approved IS TRUE AND coalesce(j.is_rejected, false) IS NOT TRUE)
        OR (v_approval = 'pending' AND coalesce(j.is_approved, false) IS NOT TRUE AND coalesce(j.is_rejected, false) IS NOT TRUE)
        OR (v_approval = 'disabled' AND j.is_active = FALSE AND coalesce(j.is_rejected, false) IS NOT TRUE)
        OR (v_approval = 'rejected' AND j.is_rejected IS TRUE)
      )
      AND (
        v_status = 'all'
        OR (v_status = 'live' AND coalesce(j.is_active, true) IS TRUE AND lower(coalesce(j.status, 'active')) = 'active')
        OR (v_status = 'paused' AND (j.is_active = FALSE OR lower(coalesce(j.status, 'active')) <> 'active'))
        OR (v_status = 'pending' AND coalesce(j.is_approved, false) IS NOT TRUE AND coalesce(j.is_rejected, false) IS NOT TRUE)
        OR (v_status = 'disabled' AND j.is_active = FALSE AND coalesce(j.is_rejected, false) IS NOT TRUE)
        OR (v_status = 'rejected' AND coalesce(j.is_rejected, false) IS TRUE)
      )
  ),
  ordered AS (
    SELECT *
    FROM filtered
    ORDER BY
      CASE WHEN v_sort = 'title' AND v_order = 'asc' THEN lower(title) END ASC,
      CASE WHEN v_sort = 'title' AND v_order = 'desc' THEN lower(title) END DESC,
      CASE WHEN v_sort = 'deadline' AND v_order = 'asc'
        THEN coalesce(deadline, application_deadline, expires_at, created_at) END ASC,
      CASE WHEN v_sort = 'deadline' AND v_order = 'desc'
        THEN coalesce(deadline, application_deadline, expires_at, created_at) END DESC,
      CASE WHEN v_sort = 'created_at' AND v_order = 'asc' THEN created_at END ASC,
      CASE WHEN v_sort = 'created_at' AND v_order = 'desc' THEN created_at END DESC,
      created_at DESC,
      id DESC
    LIMIT v_limit OFFSET v_offset
  ),
  totals AS (
    SELECT count(*) AS total_count FROM filtered
  )
  SELECT jsonb_build_object(
    'items', coalesce(jsonb_agg(to_jsonb(ordered.*)), '[]'::jsonb),
    'total_count', coalesce(max(totals.total_count), 0)
  )
  INTO v_payload
  FROM ordered CROSS JOIN totals;

  RETURN coalesce(v_payload, jsonb_build_object('items', '[]'::jsonb, 'total_count', 0));
END;
$$;

COMMIT;
