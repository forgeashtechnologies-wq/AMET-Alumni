import { useQuery } from '@tanstack/react-query';
import { fetchAdminUserGrid } from '../api/adminUsers';

/**
 * Hook to load the admin user grid with pagination and filters.
 */
export function useAdminUsersGrid({ search, role, status, page, pageSize }) {
  return useQuery({
    queryKey: ['adminUsers', { search, role, status, page, pageSize }],
    queryFn: () =>
      fetchAdminUserGrid({
        search: search || null,
        role: role || null,
        status: status || null,
        page,
        pageSize,
      }),
    // Preserve previous page's data while the next page is loading
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
  });
}
