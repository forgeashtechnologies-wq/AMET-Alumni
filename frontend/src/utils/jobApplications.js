import { supabase } from './supabase';

export async function hasApplied(jobId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { count, error } = await supabase
      .from('job_applications')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', jobId)
      .eq('applicant_id', user.id);
    if (error) return false;
    return (typeof count === 'number') ? count > 0 : false;
  } catch (_) {
    return false;
  }
}

export async function getAppliedJobIdsForCurrentUser(jobIds) {
  if (!Array.isArray(jobIds) || jobIds.length === 0) return [];
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const uniqueIds = Array.from(new Set(jobIds.filter(Boolean)));
    if (uniqueIds.length === 0) return [];
    const { data, error } = await supabase
      .from('job_applications')
      .select('job_id')
      .eq('applicant_id', user.id)
      .in('job_id', uniqueIds);
    if (error || !Array.isArray(data)) return [];
    const set = new Set();
    data.forEach(row => { if (row?.job_id) set.add(row.job_id); });
    return Array.from(set);
  } catch (_) {
    return [];
  }
}
