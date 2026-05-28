import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';
import { getDeadline, deriveJobStatus } from '../utils/jobs';
import { isDeadlinePassed } from '../utils/deadlines.ts';

// Fetch open/not-expired jobs. RLS governs visibility; we filter out expired client-side.
export function useOpenJobs({ role, search }) {
  const key = ['jobs', 'open', role, search ?? ''];

  const fetcher = async ({ pageParam = 0 }) => {
    let q = supabase
      .from('jobs')
      .select(`
        id, title, description, company_id, company_name, location, job_type,
        experience_level, department, application_deadline, deadline, expires_at,
        status, is_active, is_approved, posted_by, created_by, created_at
      `)
      .order('created_at', { ascending: false })
      .range(pageParam, pageParam + 49);

    if (search && String(search).trim()) {
      const s = `%${String(search).trim()}%`;
      q = q.or(`title.ilike.${s},company_name.ilike.${s}`);
    }

    const { data, error } = await q;
    if (error) throw error;

    const isApplicantRole = role === 'alumni' || role === 'student';

    const openRows = (data ?? []).filter((r) => {
      const expired = isDeadlinePassed(getDeadline(r));
      if (expired) return false;
      if (isApplicantRole) {
        return deriveJobStatus(r) === 'open';
      }
      return true;
    });

    return openRows;
  };

  return useInfiniteQuery({
    queryKey: key,
    queryFn: fetcher,
    getNextPageParam: (lastPage, allPages) =>
      (lastPage?.length ?? 0) < 50 ? undefined : allPages.flat().length,
    staleTime: 30_000,
  });
}
