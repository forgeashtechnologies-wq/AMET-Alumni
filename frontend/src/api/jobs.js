import { supabase } from '../utils/supabase';
import { normalizeJob } from '../utils/jobs';

export async function fetchJobsFeed({ limit = 50, offset = 0, sortBy = 'created_at', sortOrder = 'desc' } = {}) {
  const { data, error } = await supabase.rpc('get_jobs_public_v5', {
    p_search_query: null,
    p_sort_by: sortBy,
    p_sort_order: sortOrder,
    p_limit: limit,
    p_offset: offset,
    p_department: null,
    p_job_type: null,
    p_experience_level: null,
    p_location: null,
    p_industry: null,
    p_salary_min: null,
    p_salary_max: null,
    p_posted_since_days: null,
  });
  if (error) throw error;
  return (data || []).map(normalizeJob);
}

export async function fetchJobById(jobId) {
  // Prefer canonical details RPC for single job
  const { data, error } = await supabase.rpc('get_job_details', { p_id: jobId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row ? normalizeJob(row) : null;
}

// Expired jobs feeds (admin/employer)
export async function fetchExpiredJobsAdmin({ limit = 50, offset = 0, search = null }) {
  const { data, error } = await supabase.rpc('get_expired_jobs_admin', {
    p_limit: limit,
    p_offset: offset,
    p_search: search,
  });
  if (error) throw error;
  return (data ?? []).map(normalizeJob);
}

export async function fetchMyExpiredJobs({ limit = 50, offset = 0, search = null }) {
  const { data, error } = await supabase.rpc('get_my_expired_jobs', {
    p_limit: limit,
    p_offset: offset,
    p_search: search,
  });
  if (error) throw error;
  return (data ?? []).map(normalizeJob);
}
