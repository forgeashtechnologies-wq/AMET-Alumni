-- Enforce degree + department matching with pagination and filter parity
create or replace function public.search_jobs_with_education(
  p_search_query text default null,
  p_sort_by text default 'created_at',
  p_sort_order text default 'desc',
  p_limit int default 12,
  p_offset int default 0,
  p_job_type text default null,
  p_experience_level text default null,
  p_salary_min bigint default null,
  p_salary_max bigint default null,
  p_posted_since_days int default null,
  p_match_my_education boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_degree_code text;
  v_department text;
  v_user_level job_education_level;
  v_items jsonb := '[]'::jsonb;
  v_total int := 0;
  v_sort_col text := coalesce(nullif(p_sort_by, ''), 'created_at');
  v_sort_dir text := case when lower(coalesce(p_sort_order, 'desc')) = 'asc' then 'asc' else 'desc' end;
  v_match boolean := coalesce(p_match_my_education, true);
begin
  -- Fetch user education + department
  select degree_code, department
  into v_degree_code, v_department
  from public.profiles
  where id = v_profile_id;

  -- Map degree_code to enum level (fallback: NULL => no level)
  if v_degree_code is not null then
    v_user_level := case
      when v_degree_code ilike '%phd%' or v_degree_code ilike '%doctor%' then 'phd'::job_education_level
      when v_degree_code ilike '%master%' or v_degree_code ilike '%mba%' or v_degree_code ilike '%m.%' then 'masters'::job_education_level
      when v_degree_code ilike '%bachelor%' or v_degree_code ilike '%b.%' or v_degree_code ilike '%be%' or v_degree_code ilike '%btech%' then 'bachelors'::job_education_level
      when v_degree_code ilike '%diploma%' then 'diploma'::job_education_level
      else 'other'::job_education_level
    end;
  end if;

  -- If matching is requested but we have no mapped level, fall back to normal feed
  if v_match and v_user_level is null then
    v_match := false;
  end if;

  with base as (
    select j.*
    from public.jobs j
    where j.approval_status = 'approved'
      and j.is_active = true
      and coalesce(lower(j.status), 'active') = 'active'
      -- Match education level
      and (
        not v_match
        or j.education_requirements is null
        or j.education_requirements = '{}'::job_education_level[]
        or j.education_requirements && array[v_user_level]
      )
      -- Enforce department match when both sides present
      and (
        not v_match
        or v_department is null
        or v_department = ''
        or j.department is null
        or j.department = ''
        or lower(j.department) = lower(v_department)
      )
      -- Filters
      and (p_job_type is null or j.job_type = p_job_type)
      and (p_experience_level is null or j.experience_level = p_experience_level)
      and (p_salary_min is null or j.salary_max >= p_salary_min)
      and (p_salary_max is null or j.salary_min <= p_salary_max)
      and (
        p_posted_since_days is null
        or j.created_at >= (now() - (p_posted_since_days || ' days')::interval)
      )
      and (
        p_search_query is null
        or trim(p_search_query) = ''
        or j.title ilike '%' || p_search_query || '%'
        or j.location ilike '%' || p_search_query || '%'
        or j.company_name ilike '%' || p_search_query || '%'
      )
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'id', s.id,
      'title', s.title,
      'company_name', s.company_name,
      'location', s.location,
      'job_type', s.job_type,
      'experience_level', s.experience_level,
      'education_requirements', s.education_requirements,
      'department', s.department,
      'salary_min', s.salary_min,
      'salary_max', s.salary_max,
      'salary_range', s.salary_range,
      'application_url', s.application_url,
      'logo_url', s.logo_url,
      'source_type', s.source_type,
      'status', s.status,
      'is_active', s.is_active,
      'is_approved', s.is_approved,
      'approval_status', s.approval_status,
      'created_at', s.created_at,
      'application_deadline', s.application_deadline,
      'contact_name', case when s.approval_status = 'approved' then s.contact_name end,
      'contact_email', case when s.approval_status = 'approved' then s.contact_email end,
      'contact_phone', case when s.approval_status = 'approved' then s.contact_phone end
    )), '[]'::jsonb),
    coalesce(max(s.total_count), 0)
  into v_items, v_total
  from (
    select b.*,
           count(*) over () as total_count
    from base b
    order by
      case when v_sort_col = 'title' and v_sort_dir = 'asc' then b.title end asc nulls last,
      case when v_sort_col = 'title' and v_sort_dir = 'desc' then b.title end desc nulls last,
      case when v_sort_col = 'deadline' and v_sort_dir = 'asc' then b.application_deadline end asc nulls last,
      case when v_sort_col = 'deadline' and v_sort_dir = 'desc' then b.application_deadline end desc nulls last,
      case when v_sort_col = 'created_at' and v_sort_dir = 'asc' then b.created_at end asc nulls last,
      case when v_sort_dir = 'desc' then b.created_at end desc nulls last
    offset coalesce(p_offset,0)
    limit coalesce(p_limit,12)
  ) s;

  return jsonb_build_object(
    'items', coalesce(v_items, '[]'::jsonb),
    'total_count', coalesce(v_total, 0)
  );
end;
$$;
