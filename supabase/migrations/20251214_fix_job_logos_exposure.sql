-- Expose job-level logos in public listings and detail RPCs
-- - Ensure get_jobs_public_v5 returns job.logo_url (and exposes company_logo_url as a coalesce)
-- - Align fallback view v_jobs_feed_inr to prefer jobs.logo_url over companies.logo_url

-- Update get_jobs_public_v5 to include logo fields
create or replace function public.get_jobs_public_v5(
  p_search_query text default null,
  p_sort_by text default 'created_at',
  p_sort_order text default 'desc',
  p_limit integer default 12,
  p_offset integer default 0,
  p_department text default null,
  p_job_type text default null,
  p_experience_level text default null,
  p_location text default null,
  p_industry text default null,
  p_salary_min integer default null,
  p_salary_max integer default null,
  p_posted_since_days integer default null
) returns table(
  id uuid,
  title text,
  description text,
  company_id uuid,
  company_name text,
  company_logo_url text,
  logo_url text,
  application_url text,
  external_url text,
  apply_url text,
  source_type text,
  application_deadline timestamptz,
  deadline timestamptz,
  status text,
  department text,
  job_type text,
  experience_level text,
  industry text,
  location text,
  salary_min integer,
  salary_max integer,
  skills text[],
  is_active boolean,
  is_approved boolean,
  created_at timestamptz,
  total_count bigint
) language sql security definer
set search_path = public
as $$
with base as (
  select
    j.id,
    j.title,
    j.description,
    j.company_id,
    coalesce(c.name, j.company_name) as company_name,
    coalesce(j.logo_url, c.logo_url) as company_logo_url,
    j.logo_url,
    j.application_url,
    j.external_url,
    j.apply_url,
    case
      when coalesce(j.apply_url, j.application_url, j.external_url) is not null then
        case
          when j.apply_url is not null or j.application_url is not null then 'in_app'
          else 'quick_link'
        end
      else null
    end as source_type,
    j.application_deadline,
    j.deadline,
    j.status,
    j.department,
    j.job_type,
    j.experience_level,
    j.industry,
    j.location,
    j.salary_min,
    j.salary_max,
    j.skills,
    j.is_active,
    j.is_approved,
    j.created_at
  from public.jobs j
  left join public.companies c on c.id = j.company_id
  where
    j.is_active = true
    and j.is_approved = true
    and (p_department       is null or j.department       = p_department)
    and (p_job_type         is null or j.job_type         = p_job_type)
    and (p_experience_level is null or j.experience_level = p_experience_level)
    and (p_location         is null or j.location ilike ('%' || p_location || '%'))
    and (p_industry         is null or j.industry         = p_industry)
    and (
      (p_salary_min is null and p_salary_max is null) or
      (
        (j.salary_min is not null or j.salary_max is not null) and
        (p_salary_min is null or coalesce(j.salary_max, j.salary_min) >= p_salary_min) and
        (p_salary_max is null or coalesce(j.salary_min, j.salary_max) <= p_salary_max)
      )
    )
    and (
      p_posted_since_days is null or
      j.created_at >= (now() - make_interval(days => p_posted_since_days))
    )
    and (
      p_search_query is null or (
        j.title ilike ('%' || p_search_query || '%')
        or j.description ilike ('%' || p_search_query || '%')
        or coalesce(c.name, j.company_name) ilike ('%' || p_search_query || '%')
        or j.location ilike ('%' || p_search_query || '%')
        or exists (
          select 1
          from unnest(j.skills) as s(skill)
          where s.skill ilike ('%' || p_search_query || '%')
        )
      )
    )
),
counted as (
  select b.*, count(*) over () as total_count
  from base b
)
select *
from counted
order by
  case when p_sort_by in ('created_at') and p_sort_order = 'asc'  then created_at          end asc  nulls last,
  case when p_sort_by in ('created_at') and p_sort_order = 'desc' then created_at          end desc nulls last,
  case when p_sort_by in ('title')      and p_sort_order = 'asc'  then title               end asc  nulls last,
  case when p_sort_by in ('title')      and p_sort_order = 'desc' then title               end desc nulls last,
  case when p_sort_by in ('deadline')   and p_sort_order = 'asc'  then application_deadline end asc  nulls last,
  case when p_sort_by in ('deadline')   and p_sort_order = 'desc' then application_deadline end desc nulls last
offset p_offset
limit  p_limit;
$$;

comment on function public.get_jobs_public_v5 is 'Public jobs feed (v5). Returns job.logo_url and company_logo_url (coalesced j.logo_url, companies.logo_url).';

-- Align the fallback view to prefer job-level logos
create or replace view public.v_jobs_feed_inr as
select
  j.id,
  j.title,
  j.created_at,
  j.updated_at,
  j.location,
  j.job_type,
  j.experience_level,
  j.salary_min,
  j.salary_max,
  coalesce(j.application_deadline, j.deadline) as application_deadline,
  coalesce(j.is_active, true) as is_active,
  j.is_approved,
  j.application_url,
  null::text as source_type,
  j.company_id,
  coalesce(c.name, j.company_name) as company_name,
  coalesce(j.logo_url, c.logo_url) as company_logo_url,
  coalesce(a.applicant_count, 0)::bigint as applicant_count,
  case
    when j.salary_min is not null and j.salary_max is not null then to_char(j.salary_min, 'FM999,999,999') || ' - ' || to_char(j.salary_max, 'FM999,999,999')
    when j.salary_min is not null then 'From ' || to_char(j.salary_min, 'FM999,999,999')
    when j.salary_max is not null then 'Up to ' || to_char(j.salary_max, 'FM999,999,999')
    else null
  end as salary_range,
  case
    when j.salary_min is not null and j.salary_max is not null then '₹' || to_char(j.salary_min, 'FM999,999,999') || ' – ₹' || to_char(j.salary_max, 'FM999,999,999')
    when j.salary_min is not null then 'From ₹' || to_char(j.salary_min, 'FM999,999,999')
    when j.salary_max is not null then 'Up to ₹' || to_char(j.salary_max, 'FM999,999,999')
    else null
  end as salary_display,
  case
    when j.salary_min is not null and j.salary_max is not null then '₹' || to_char(j.salary_min, 'FM999,999,999') || ' – ₹' || to_char(j.salary_max, 'FM999,999,999')
    when j.salary_min is not null then 'From ₹' || to_char(j.salary_min, 'FM999,999,999')
    when j.salary_max is not null then 'Up to ₹' || to_char(j.salary_max, 'FM999,999,999')
    else null
  end as salary_display_inr,
  j.description
from public.jobs j
left join public.companies c on c.id = j.company_id
left join (
  select job_applications.job_id, count(*) as applicant_count
  from public.job_applications
  group by job_applications.job_id
) a on a.job_id = j.id
where coalesce(j.is_active, true)
  and ((j.status is null) or (j.status = 'active'))
  and ((j.open_at is null) or (j.open_at <= now()))
  and ((j.close_at is null) or (j.close_at >= now()));
