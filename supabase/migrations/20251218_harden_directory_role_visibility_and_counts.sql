CREATE OR REPLACE VIEW public.directory_profiles_public AS
SELECT
  dp.id,
  dp.first_name,
  dp.last_name,
  dp.full_name,
  dp.graduation_year,
  dp.degree_program,
  dp.department,
  dp.current_job_title,
  dp.company_name,
  dp.location,
  dp.location_city,
  dp.location_country,
  dp.avatar_url,
  dp.is_employer,
  dp.role,
  dp.approval_status,
  dp.is_deleted,
  dp.is_active,
  dp.show_in_directory
FROM public.directory_profiles_base dp
WHERE
  COALESCE(dp.is_deleted, false) = false
  AND COALESCE(dp.is_active, true) = true
  AND COALESCE(dp.show_in_directory, true) = true
  AND dp.approval_status = 'approved'::public.profile_approval_status
  AND dp.role <> 'employer'::public.app_role_enum;

CREATE OR REPLACE FUNCTION public.get_directory_profiles_secure(
  p_search text,
  p_limit integer,
  p_offset integer,
  p_sort_field text,
  p_sort_dir text
)
RETURNS TABLE(
  id uuid,
  first_name text,
  last_name text,
  full_name text,
  graduation_year integer,
  degree_program text,
  department text,
  current_job_title text,
  company_name text,
  location text,
  location_city text,
  location_country text,
  avatar_url text,
  role text,
  approval_status text,
  is_active boolean,
  is_deleted boolean,
  show_in_directory boolean,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role       text    := public.get_user_role();
  v_is_admin   boolean := public.app_is_admin();
  v_sort_field text    := lower(coalesce(nullif(p_sort_field, ''), 'name'));
  v_sort_dir   text    := case
                           when lower(p_sort_dir) in ('asc','desc') then lower(p_sort_dir)
                           else 'asc'
                         end;
  v_search     text    := nullif(trim(coalesce(p_search, '')), '');
BEGIN
  IF v_role = 'employer' THEN
    RETURN;
  END IF;

  IF v_is_admin THEN
    RETURN QUERY
    SELECT
      d.id,
      d.first_name,
      d.last_name,
      d.full_name,
      d.graduation_year,
      d.degree_program,
      d.department,
      d.current_job_title,
      d.company_name,
      d.location,
      d.location_city,
      d.location_country,
      d.avatar_url,
      d.role::text,
      d.approval_status::text,
      d.is_active,
      d.is_deleted,
      d.show_in_directory,
      COUNT(*) OVER () AS total_count
    FROM public.directory_profiles_base AS d
    WHERE
      COALESCE(d.is_deleted, false) = false
      AND COALESCE(d.is_active, true) = true
      AND (
        v_search IS NULL
        OR d.full_name ILIKE '%' || v_search || '%'
        OR (COALESCE(d.first_name, '') || ' ' || COALESCE(d.last_name, '')) ILIKE '%' || v_search || '%'
        OR COALESCE(d.role::text, '') ILIKE '%' || v_search || '%'
        OR COALESCE(d.degree_program, '') ILIKE '%' || v_search || '%'
        OR COALESCE(d.department, '') ILIKE '%' || v_search || '%'
        OR COALESCE(d.current_job_title, '') ILIKE '%' || v_search || '%'
        OR COALESCE(d.company_name, '') ILIKE '%' || v_search || '%'
        OR COALESCE(d.location, '') ILIKE '%' || v_search || '%'
        OR COALESCE(d.location_city, '') ILIKE '%' || v_search || '%'
        OR COALESCE(d.location_country, '') ILIKE '%' || v_search || '%'
      )
    ORDER BY
      CASE
        WHEN v_sort_field = 'graduation_year' AND v_sort_dir = 'asc' THEN d.graduation_year
        ELSE NULL
      END ASC,
      CASE
        WHEN v_sort_field = 'graduation_year' AND v_sort_dir = 'desc' THEN d.graduation_year
        ELSE NULL
      END DESC,
      CASE
        WHEN v_sort_field <> 'graduation_year' AND v_sort_dir = 'asc' THEN COALESCE(NULLIF(trim(d.first_name), ''), NULLIF(trim(d.full_name), ''))
        ELSE NULL
      END ASC,
      CASE
        WHEN v_sort_field <> 'graduation_year' AND v_sort_dir = 'desc' THEN COALESCE(NULLIF(trim(d.first_name), ''), NULLIF(trim(d.full_name), ''))
        ELSE NULL
      END DESC,
      COALESCE(NULLIF(trim(d.full_name), ''), '') ASC
    LIMIT COALESCE(p_limit, 50)
    OFFSET COALESCE(p_offset, 0);
  ELSE
    RETURN QUERY
    SELECT
      d.id,
      d.first_name,
      d.last_name,
      d.full_name,
      d.graduation_year,
      d.degree_program,
      d.department,
      d.current_job_title,
      d.company_name,
      d.location,
      d.location_city,
      d.location_country,
      d.avatar_url,
      d.role::text,
      d.approval_status::text,
      d.is_active,
      d.is_deleted,
      d.show_in_directory,
      COUNT(*) OVER () AS total_count
    FROM public.directory_profiles_public AS d
    WHERE
      (
        v_search IS NULL
        OR d.full_name ILIKE '%' || v_search || '%'
        OR (COALESCE(d.first_name, '') || ' ' || COALESCE(d.last_name, '')) ILIKE '%' || v_search || '%'
        OR COALESCE(d.role::text, '') ILIKE '%' || v_search || '%'
        OR COALESCE(d.degree_program, '') ILIKE '%' || v_search || '%'
        OR COALESCE(d.department, '') ILIKE '%' || v_search || '%'
        OR COALESCE(d.current_job_title, '') ILIKE '%' || v_search || '%'
        OR COALESCE(d.company_name, '') ILIKE '%' || v_search || '%'
        OR COALESCE(d.location, '') ILIKE '%' || v_search || '%'
        OR COALESCE(d.location_city, '') ILIKE '%' || v_search || '%'
        OR COALESCE(d.location_country, '') ILIKE '%' || v_search || '%'
      )
    ORDER BY
      CASE
        WHEN v_sort_field = 'graduation_year' AND v_sort_dir = 'asc' THEN d.graduation_year
        ELSE NULL
      END ASC,
      CASE
        WHEN v_sort_field = 'graduation_year' AND v_sort_dir = 'desc' THEN d.graduation_year
        ELSE NULL
      END DESC,
      CASE
        WHEN v_sort_field <> 'graduation_year' AND v_sort_dir = 'asc' THEN COALESCE(NULLIF(trim(d.first_name), ''), NULLIF(trim(d.full_name), ''))
        ELSE NULL
      END ASC,
      CASE
        WHEN v_sort_field <> 'graduation_year' AND v_sort_dir = 'desc' THEN COALESCE(NULLIF(trim(d.first_name), ''), NULLIF(trim(d.full_name), ''))
        ELSE NULL
      END DESC,
      COALESCE(NULLIF(trim(d.full_name), ''), '') ASC
    LIMIT COALESCE(p_limit, 50)
    OFFSET COALESCE(p_offset, 0);
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_directory_profiles_secure(text, integer, integer, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_directory_profiles_secure(text, integer, integer, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_directory_profiles_secure(text, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_directory_profiles_secure(text, integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_role_counts_for_user() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_role_counts_for_user() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_directory_role_counts() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_directory_role_counts() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_all_profiles_count_by_role_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_all_profiles_count_by_role_admin() TO authenticated;

REVOKE ALL ON TABLE public.directory_profiles_public FROM anon;
REVOKE ALL ON TABLE public.directory_profiles_public FROM authenticated;
GRANT SELECT ON TABLE public.directory_profiles_public TO authenticated;
GRANT SELECT ON TABLE public.directory_profiles_public TO service_role;
