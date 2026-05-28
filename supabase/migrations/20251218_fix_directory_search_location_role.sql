CREATE OR REPLACE VIEW public.directory_profiles_base AS
SELECT
  p.id,
  p.first_name,
  p.last_name,
  p.full_name,
  p.graduation_year,
  COALESCE(deg.label, p.degree_program, p.degree) AS degree_program,
  COALESCE(dept.name, p.department) AS department,
  COALESCE(NULLIF(p.current_job_title, ''), NULLIF(p.job_title, '')) AS current_job_title,
  COALESCE(NULLIF(p.company_name, ''), NULLIF(p.current_company, ''), NULLIF(p.company, '')) AS company_name,
  COALESCE(
    NULLIF(p.current_location, ''),
    NULLIF(p.location, ''),
    NULLIF(
      TRIM(BOTH FROM (
        COALESCE(p.location_city, '') ||
        CASE
          WHEN (p.location_city <> '' AND p.location_country <> '') THEN ', '
          ELSE ''
        END ||
        COALESCE(p.location_country, '')
      )),
      ''
    )
  ) AS location,
  p.location_city,
  p.location_country,
  p.avatar_url,
  (p.role = 'employer'::public.app_role_enum) AS is_employer,
  p.role,
  p.approval_status,
  COALESCE(p.is_deleted, false) AS is_deleted,
  COALESCE(p.is_active, true) AS is_active,
  COALESCE(p.show_in_directory, true) AS show_in_directory
FROM public.profiles p
LEFT JOIN public.degrees deg ON deg.code = p.degree_code
LEFT JOIN public.departments dept ON dept.id = p.department_id;

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
BEGIN
  IF v_role = 'employer' THEN
    RETURN;
  END IF;

  IF v_is_admin THEN

    IF v_sort_field = 'graduation_year' THEN
      IF v_sort_dir = 'desc' THEN
        RETURN QUERY
        SELECT * FROM (
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
            COALESCE(p_search, '') = ''
            OR d.full_name ILIKE '%' || p_search || '%'
            OR (COALESCE(d.first_name, '') || ' ' || COALESCE(d.last_name, '')) ILIKE '%' || p_search || '%'
            OR COALESCE(d.role::text, '') ILIKE '%' || p_search || '%'
            OR COALESCE(d.degree_program, '') ILIKE '%' || p_search || '%'
            OR COALESCE(d.department, '') ILIKE '%' || p_search || '%'
            OR COALESCE(d.current_job_title, '') ILIKE '%' || p_search || '%'
            OR COALESCE(d.company_name, '') ILIKE '%' || p_search || '%'
            OR COALESCE(d.location, '') ILIKE '%' || p_search || '%'
            OR COALESCE(d.location_city, '') ILIKE '%' || p_search || '%'
            OR COALESCE(d.location_country, '') ILIKE '%' || p_search || '%'
        ) counted
        ORDER BY
          counted.graduation_year DESC,
          COALESCE(NULLIF(trim(counted.first_name), ''), NULLIF(trim(counted.full_name), '')) ASC,
          COALESCE(NULLIF(trim(counted.full_name), ''), '') ASC
        LIMIT COALESCE(p_limit, 50)
        OFFSET COALESCE(p_offset, 0);
      ELSE
        RETURN QUERY
        SELECT * FROM (
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
            COALESCE(p_search, '') = ''
            OR d.full_name ILIKE '%' || p_search || '%'
            OR (COALESCE(d.first_name, '') || ' ' || COALESCE(d.last_name, '')) ILIKE '%' || p_search || '%'
            OR COALESCE(d.role::text, '') ILIKE '%' || p_search || '%'
            OR COALESCE(d.degree_program, '') ILIKE '%' || p_search || '%'
            OR COALESCE(d.department, '') ILIKE '%' || p_search || '%'
            OR COALESCE(d.current_job_title, '') ILIKE '%' || p_search || '%'
            OR COALESCE(d.company_name, '') ILIKE '%' || p_search || '%'
            OR COALESCE(d.location, '') ILIKE '%' || p_search || '%'
            OR COALESCE(d.location_city, '') ILIKE '%' || p_search || '%'
            OR COALESCE(d.location_country, '') ILIKE '%' || p_search || '%'
        ) counted
        ORDER BY
          counted.graduation_year ASC,
          COALESCE(NULLIF(trim(counted.first_name), ''), NULLIF(trim(counted.full_name), '')) ASC,
          COALESCE(NULLIF(trim(counted.full_name), ''), '') ASC
        LIMIT COALESCE(p_limit, 50)
        OFFSET COALESCE(p_offset, 0);
      END IF;

    ELSE
      IF v_sort_dir = 'desc' THEN
        RETURN QUERY
        SELECT * FROM (
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
            COALESCE(p_search, '') = ''
            OR d.full_name ILIKE '%' || p_search || '%'
            OR (COALESCE(d.first_name, '') || ' ' || COALESCE(d.last_name, '')) ILIKE '%' || p_search || '%'
            OR COALESCE(d.role::text, '') ILIKE '%' || p_search || '%'
            OR COALESCE(d.degree_program, '') ILIKE '%' || p_search || '%'
            OR COALESCE(d.department, '') ILIKE '%' || p_search || '%'
            OR COALESCE(d.current_job_title, '') ILIKE '%' || p_search || '%'
            OR COALESCE(d.company_name, '') ILIKE '%' || p_search || '%'
            OR COALESCE(d.location, '') ILIKE '%' || p_search || '%'
            OR COALESCE(d.location_city, '') ILIKE '%' || p_search || '%'
            OR COALESCE(d.location_country, '') ILIKE '%' || p_search || '%'
        ) counted
        ORDER BY
          COALESCE(NULLIF(trim(counted.first_name), ''), NULLIF(trim(counted.full_name), '')) DESC,
          COALESCE(NULLIF(trim(counted.full_name), ''), '') DESC
        LIMIT COALESCE(p_limit, 50)
        OFFSET COALESCE(p_offset, 0);
      ELSE
        RETURN QUERY
        SELECT * FROM (
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
            COALESCE(p_search, '') = ''
            OR d.full_name ILIKE '%' || p_search || '%'
            OR (COALESCE(d.first_name, '') || ' ' || COALESCE(d.last_name, '')) ILIKE '%' || p_search || '%'
            OR COALESCE(d.role::text, '') ILIKE '%' || p_search || '%'
            OR COALESCE(d.degree_program, '') ILIKE '%' || p_search || '%'
            OR COALESCE(d.department, '') ILIKE '%' || p_search || '%'
            OR COALESCE(d.current_job_title, '') ILIKE '%' || p_search || '%'
            OR COALESCE(d.company_name, '') ILIKE '%' || p_search || '%'
            OR COALESCE(d.location, '') ILIKE '%' || p_search || '%'
            OR COALESCE(d.location_city, '') ILIKE '%' || p_search || '%'
            OR COALESCE(d.location_country, '') ILIKE '%' || p_search || '%'
        ) counted
        ORDER BY
          COALESCE(NULLIF(trim(counted.first_name), ''), NULLIF(trim(counted.full_name), '')) ASC,
          COALESCE(NULLIF(trim(counted.full_name), ''), '') ASC
        LIMIT COALESCE(p_limit, 50)
        OFFSET COALESCE(p_offset, 0);
      END IF;
    END IF;

  ELSE

    IF v_sort_field = 'graduation_year' THEN
      IF v_sort_dir = 'desc' THEN
        RETURN QUERY
        SELECT * FROM (
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
            d.is_deleted = false
            AND d.is_active = true
            AND d.show_in_directory = true
            AND (
              COALESCE(p_search, '') = ''
              OR d.full_name ILIKE '%' || p_search || '%'
              OR (COALESCE(d.first_name, '') || ' ' || COALESCE(d.last_name, '')) ILIKE '%' || p_search || '%'
              OR COALESCE(d.role::text, '') ILIKE '%' || p_search || '%'
              OR COALESCE(d.degree_program, '') ILIKE '%' || p_search || '%'
              OR COALESCE(d.department, '') ILIKE '%' || p_search || '%'
              OR COALESCE(d.current_job_title, '') ILIKE '%' || p_search || '%'
              OR COALESCE(d.company_name, '') ILIKE '%' || p_search || '%'
              OR COALESCE(d.location, '') ILIKE '%' || p_search || '%'
              OR COALESCE(d.location_city, '') ILIKE '%' || p_search || '%'
              OR COALESCE(d.location_country, '') ILIKE '%' || p_search || '%'
            )
        ) counted
        ORDER BY
          counted.graduation_year DESC,
          COALESCE(NULLIF(trim(counted.first_name), ''), NULLIF(trim(counted.full_name), '')) ASC,
          COALESCE(NULLIF(trim(counted.full_name), ''), '') ASC
        LIMIT COALESCE(p_limit, 50)
        OFFSET COALESCE(p_offset, 0);
      ELSE
        RETURN QUERY
        SELECT * FROM (
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
            d.is_deleted = false
            AND d.is_active = true
            AND d.show_in_directory = true
            AND (
              COALESCE(p_search, '') = ''
              OR d.full_name ILIKE '%' || p_search || '%'
              OR (COALESCE(d.first_name, '') || ' ' || COALESCE(d.last_name, '')) ILIKE '%' || p_search || '%'
              OR COALESCE(d.role::text, '') ILIKE '%' || p_search || '%'
              OR COALESCE(d.degree_program, '') ILIKE '%' || p_search || '%'
              OR COALESCE(d.department, '') ILIKE '%' || p_search || '%'
              OR COALESCE(d.current_job_title, '') ILIKE '%' || p_search || '%'
              OR COALESCE(d.company_name, '') ILIKE '%' || p_search || '%'
              OR COALESCE(d.location, '') ILIKE '%' || p_search || '%'
              OR COALESCE(d.location_city, '') ILIKE '%' || p_search || '%'
              OR COALESCE(d.location_country, '') ILIKE '%' || p_search || '%'
            )
        ) counted
        ORDER BY
          counted.graduation_year ASC,
          COALESCE(NULLIF(trim(counted.first_name), ''), NULLIF(trim(counted.full_name), '')) ASC,
          COALESCE(NULLIF(trim(counted.full_name), ''), '') ASC
        LIMIT COALESCE(p_limit, 50)
        OFFSET COALESCE(p_offset, 0);
      END IF;

    ELSE
      IF v_sort_dir = 'desc' THEN
        RETURN QUERY
        SELECT * FROM (
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
            d.is_deleted = false
            AND d.is_active = true
            AND d.show_in_directory = true
            AND (
              COALESCE(p_search, '') = ''
              OR d.full_name ILIKE '%' || p_search || '%'
              OR (COALESCE(d.first_name, '') || ' ' || COALESCE(d.last_name, '')) ILIKE '%' || p_search || '%'
              OR COALESCE(d.role::text, '') ILIKE '%' || p_search || '%'
              OR COALESCE(d.degree_program, '') ILIKE '%' || p_search || '%'
              OR COALESCE(d.department, '') ILIKE '%' || p_search || '%'
              OR COALESCE(d.current_job_title, '') ILIKE '%' || p_search || '%'
              OR COALESCE(d.company_name, '') ILIKE '%' || p_search || '%'
              OR COALESCE(d.location, '') ILIKE '%' || p_search || '%'
              OR COALESCE(d.location_city, '') ILIKE '%' || p_search || '%'
              OR COALESCE(d.location_country, '') ILIKE '%' || p_search || '%'
            )
        ) counted
        ORDER BY
          COALESCE(NULLIF(trim(counted.first_name), ''), NULLIF(trim(counted.full_name), '')) DESC,
          COALESCE(NULLIF(trim(counted.full_name), ''), '') DESC
        LIMIT COALESCE(p_limit, 50)
        OFFSET COALESCE(p_offset, 0);
      ELSE
        RETURN QUERY
        SELECT * FROM (
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
            d.is_deleted = false
            AND d.is_active = true
            AND d.show_in_directory = true
            AND (
              COALESCE(p_search, '') = ''
              OR d.full_name ILIKE '%' || p_search || '%'
              OR (COALESCE(d.first_name, '') || ' ' || COALESCE(d.last_name, '')) ILIKE '%' || p_search || '%'
              OR COALESCE(d.role::text, '') ILIKE '%' || p_search || '%'
              OR COALESCE(d.degree_program, '') ILIKE '%' || p_search || '%'
              OR COALESCE(d.department, '') ILIKE '%' || p_search || '%'
              OR COALESCE(d.current_job_title, '') ILIKE '%' || p_search || '%'
              OR COALESCE(d.company_name, '') ILIKE '%' || p_search || '%'
              OR COALESCE(d.location, '') ILIKE '%' || p_search || '%'
              OR COALESCE(d.location_city, '') ILIKE '%' || p_search || '%'
              OR COALESCE(d.location_country, '') ILIKE '%' || p_search || '%'
            )
        ) counted
        ORDER BY
          COALESCE(NULLIF(trim(counted.first_name), ''), NULLIF(trim(counted.full_name), '')) ASC,
          COALESCE(NULLIF(trim(counted.full_name), ''), '') ASC
        LIMIT COALESCE(p_limit, 50)
        OFFSET COALESCE(p_offset, 0);
      END IF;
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_directory_profiles_secure_count(p_search text)
RETURNS bigint
LANGUAGE sql
SET search_path TO 'public', 'auth'
AS $$
  SELECT COUNT(*)
  FROM public.directory_profiles_public AS d
  WHERE
    p_search IS NULL
    OR trim(p_search) = ''
    OR lower(d.full_name) LIKE '%' || lower(p_search) || '%'
    OR lower(coalesce(d.company_name, ''))      LIKE '%' || lower(p_search) || '%'
    OR lower(coalesce(d.degree_program, ''))    LIKE '%' || lower(p_search) || '%'
    OR lower(coalesce(d.department, ''))        LIKE '%' || lower(p_search) || '%'
    OR lower(coalesce(d.role::text, ''))        LIKE '%' || lower(p_search) || '%'
    OR lower(coalesce(d.location, ''))          LIKE '%' || lower(p_search) || '%'
    OR lower(coalesce(d.location_city, ''))     LIKE '%' || lower(p_search) || '%'
    OR lower(coalesce(d.location_country, ''))  LIKE '%' || lower(p_search) || '%';
$$;
