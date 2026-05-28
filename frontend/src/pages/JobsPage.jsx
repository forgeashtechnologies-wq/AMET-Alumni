import React, { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import JobsFilterBar from '../components/Jobs/JobsFilterBar';
import { useExpiredJobs } from '../hooks/useExpiredJobs';
import { useOpenJobs } from '../hooks/useOpenJobs';
import { isAdmin, isEmployer } from '../utils/roles';
import { sortJobs } from '../utils/jobs';
import JobCard from '../components/Jobs/JobCard.jsx';

export default function JobsPage() {
  const { user, profile } = useAuth();
  const uid = user?.id ?? null;
  const role = profile?.role ?? 'alumni';

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest'); // 'newest' | 'deadline' | 'alpha'
  const [expiredOnly, setExpiredOnly] = useState(false);

  // Expired list (only when toggle is ON and role can see)
  const expiredQuerySearch = expiredOnly && (isAdmin(role) || isEmployer(role)) ? (search || null) : null;
  const {
    data: expiredData,
    fetchNextPage: fetchMoreExpired,
    hasNextPage: hasMoreExpired,
    isLoading: loadingExpired,
    isError: errorExpired,
  } = useExpiredJobs({ role, search: expiredQuerySearch });

  // Open/all list (toggle OFF) – RLS + client filter
  const {
    data: openData,
    fetchNextPage: fetchMoreOpen,
    hasNextPage: hasMoreOpen,
    isLoading: loadingOpen,
    isError: errorOpen,
  } = useOpenJobs({ role, search });

  const expiredRows = useMemo(() => {
    if (!expiredOnly || !(isAdmin(role) || isEmployer(role))) return [];
    const flat = (expiredData?.pages ?? []).flat();
    return uid ? flat.map((r) => ({ ...r, __auth_user_id: uid })) : flat;
  }, [expiredOnly, role, expiredData, uid]);

  const openRows = useMemo(() => {
    if (expiredOnly) return [];
    const flat = (openData?.pages ?? []).flat();
    return uid ? flat.map((r) => ({ ...r, __auth_user_id: uid })) : flat;
  }, [expiredOnly, openData, uid]);

  const rows = useMemo(() => {
    const base = expiredOnly && (isAdmin(role) || isEmployer(role)) ? expiredRows : openRows;
    return sortJobs(base, sort);
  }, [expiredOnly, role, expiredRows, openRows, sort]);

  const loading = expiredOnly ? loadingExpired : loadingOpen;
  const error = expiredOnly ? errorExpired : errorOpen;
  const fetchMore = expiredOnly ? fetchMoreExpired : fetchMoreOpen;
  const hasMore = expiredOnly ? hasMoreExpired : hasMoreOpen;

  return (
    <div className="container max-w-6xl mx-auto p-4">
      <JobsFilterBar
        role={role}
        search={search} setSearch={setSearch}
        sort={sort} setSort={setSort}
        expiredOnly={expiredOnly} setExpiredOnly={setExpiredOnly}
      />

      {loading && <div className="py-10 text-sm text-gray-500">Loading…</div>}
      {error && <div className="py-10 text-sm text-red-600">Failed to load jobs.</div>}
      {!loading && rows.length === 0 && (
        <div className="py-16 text-center text-sm text-gray-500">No jobs found.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rows.map((row) => (
          <JobCard key={row.id} row={row} role={role} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button onClick={() => fetchMore()} className="px-4 py-2 border rounded-lg">
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
