-- Fix directory company preference to use current_company before legacy fields
-- This ensures search and chips reflect the current employer instead of stale values.

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
  -- IMPORTANT: prefer current_company over legacy company_name/company
  COALESCE(NULLIF(p.current_company, ''), NULLIF(p.company_name, ''), NULLIF(p.company, '')) AS company_name,
  COALESCE(
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
