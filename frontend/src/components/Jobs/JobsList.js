import React, { useMemo, useState } from 'react';
import { Box, Typography, Grid, CircularProgress } from '@mui/material';
import JobCard from './JobCard.jsx';
import JobsFilterBar from './JobsFilterBar.jsx';
import { useAuth } from '../../contexts/AuthContext';
import { isAdmin, isEmployer } from '../../utils/roles';
import { sortJobs } from '../../utils/jobs';
import { useExpiredJobs } from '../../hooks/useExpiredJobs';
import { useOpenJobs } from '../../hooks/useOpenJobs';

const JobsList = () => {
  const { user, userRole } = useAuth();
  const uid = user?.id ?? null;

  // Minimal controls
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest'); // 'newest' | 'deadline' | 'alpha'
  const [expiredOnly, setExpiredOnly] = useState(false);

  const canSeeExpired = isAdmin(userRole) || isEmployer(userRole);

  // Expired list (RPC) only when toggle ON and role allowed
  const expiredQuerySearch = expiredOnly && canSeeExpired ? (search || null) : null;
  const {
    data: expiredData,
    fetchNextPage: fetchMoreExpired,
    hasNextPage: hasMoreExpired,
    isLoading: loadingExpired,
    isError: errorExpired,
  } = useExpiredJobs({ role: userRole, search: expiredQuerySearch });

  // Open/all list (RLS + client filter) when toggle OFF
  const {
    data: openData,
    fetchNextPage: fetchMoreOpen,
    hasNextPage: hasMoreOpen,
    isLoading: loadingOpen,
    isError: errorOpen,
  } = useOpenJobs({ role: userRole, search });

  // Flatten and map viewer id for ownership checks in cards
  const expiredRows = useMemo(() => {
    if (!expiredOnly || !canSeeExpired) return [];
    const flat = (expiredData?.pages ?? []).flat();
    return uid ? flat.map(r => ({ ...r, __auth_user_id: uid })) : flat;
  }, [expiredOnly, canSeeExpired, expiredData, uid]);

  const openRows = useMemo(() => {
    if (expiredOnly) return [];
    const flat = (openData?.pages ?? []).flat();
    return uid ? flat.map(r => ({ ...r, __auth_user_id: uid })) : flat;
  }, [expiredOnly, openData, uid]);

  const rows = useMemo(() => {
    const base = expiredOnly && canSeeExpired ? expiredRows : openRows;
    return sortJobs(base, sort);
  }, [expiredOnly, canSeeExpired, expiredRows, openRows, sort]);

  const loading = expiredOnly ? loadingExpired : loadingOpen;
  const error = expiredOnly ? errorExpired : errorOpen;
  const fetchMore = expiredOnly ? fetchMoreExpired : fetchMoreOpen;
  const hasMore = expiredOnly ? hasMoreExpired : hasMoreOpen;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', py: 4, px: 2 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>Job Openings</Typography>
      <div className="mb-4">
        <JobsFilterBar
          role={userRole}
          search={search} setSearch={setSearch}
          sort={sort} setSort={setSort}
          expiredOnly={expiredOnly} setExpiredOnly={setExpiredOnly}
        />
      </div>
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Jobs Found</h3>
          <p className="text-gray-600">Try adjusting your search terms or browse all available positions.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <Grid container spacing={3}>
            {rows.map(row => (
              <Grid item xs={12} sm={6} md={4} key={row.id}>
                <JobCard row={row} role={userRole} />
              </Grid>
            ))}
          </Grid>
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button onClick={() => fetchMore()} className="px-4 py-2 border rounded-lg">
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </Box>
  );
};

export default JobsList;
