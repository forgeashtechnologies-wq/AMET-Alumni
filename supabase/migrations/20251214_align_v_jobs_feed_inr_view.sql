-- Align v_jobs_feed_inr with current frontend and RPC contracts
-- - company_name uses COALESCE(companies.name, jobs.company_name)
-- - application_deadline coalesces jobs.application_deadline and jobs.deadline
-- - description exposed from jobs.description for card/list snippets
-- - company_logo_url coalesces jobs.logo_url over companies.logo_url

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
  null::text as source_type, -- kept for backward compatibility; UI infers from URLs
  j.company_id,
  coalesce(c.name, j.company_name) as company_name,
  coalesce(j.logo_url, c.logo_url) as company_logo_url,
  coalesce(a.applicant_count, 0)::bigint as applicant_count,
  -- display helpers
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
  -- newly exposed
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
