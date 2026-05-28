import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchExpiredJobsAdmin, fetchMyExpiredJobs } from '../api/jobs';
import { isAdmin } from '../utils/roles';

export function useExpiredJobs({ role, search }) {
  const key = ['jobs', 'expired', role, search ?? ''];
  const fetcher = ({ pageParam = 0 }) =>
    isAdmin(role)
      ? fetchExpiredJobsAdmin({ offset: pageParam, search })
      : fetchMyExpiredJobs({ offset: pageParam, search });

  return useInfiniteQuery({
    queryKey: key,
    queryFn: fetcher,
    getNextPageParam: (lastPage, allPages) =>
      (lastPage?.length ?? 0) === 0 ? undefined : allPages.flat().length,
    staleTime: 30_000,
  });
}
