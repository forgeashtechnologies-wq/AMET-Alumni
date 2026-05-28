import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, onPostgresChangesOnce } from '../../utils/supabase';
import AlumniCard from './AlumniCard';
import AlumniListItem from './AlumniListItem';
import { logActivity } from '../../utils/activityLogger';
import logger from '../../utils/logger';

// Filters for public_profiles_view
const FILTERABLE_COLUMNS = [
  { name: 'graduation_year', label: 'Batch Year', type: 'number', placeholder: 'e.g., 2015' },
  { name: 'department', label: 'Department', type: 'text', placeholder: 'e.g., Marine Engineering' },
  { name: 'degree_program', label: 'Degree', type: 'text', placeholder: 'e.g., B.E. Marine' },
  { name: 'current_job_title', label: 'Designation', type: 'text', placeholder: 'e.g., Chief Engineer' },
  { name: 'location', label: 'Location', type: 'text', placeholder: 'e.g., Chennai' },
];

const AlumniDirectory = () => {
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('q') || '');
  const [alumni, setAlumni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalAlumni, setTotalAlumni] = useState(0);
  const [filters, setFilters] = useState({});
  // Inline minimal filters (no drawer)
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'full_name,asc');
  const [approvedMentorIds, setApprovedMentorIds] = useState(new Set());
  const isDebouncing = searchTerm !== debouncedSearch;
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const initialLoadDoneRef = useRef(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const subscribedRef = useRef(false);
  const channelRef = useRef(null);

  useEffect(() => {
    const fetchMentorIds = async () => {
      try {
        const { data: mentorData, error: mentorError } = await supabase
          .from('mentors')
          .select('user_id')
          .eq('status', 'approved');
        
        if (mentorError) throw mentorError;
        setApprovedMentorIds(new Set(mentorData.map(m => m.user_id)));
      } catch (err) {
        logger.error('Error fetching mentor IDs:', err);
        setError('Could not load mentor information.');
      }
    };

    fetchMentorIds();
  }, []);

  const fetchAlumniData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Query from public_profiles_view (public subset of profile fields)
      // Schema: id, full_name, avatar_url, current_location, company_name, graduation_year
      let query = supabase
        .from('public_profiles_view')
        .select('id,full_name,avatar_url,current_location,company_name,graduation_year', { count: 'exact' });

      if (debouncedSearch) {
        const q = debouncedSearch.replace(/%/g, '');
        // Allow search by name, location and company name using columns that actually exist on the view
        const cols = [
          'full_name',
          'current_location',
          'company_name',
        ];
        const ors = cols.map((c) => `${c}.ilike.%${q}%`).join(',');
        if (ors) query = query.or(ors);
      }

      for (const { name, type } of FILTERABLE_COLUMNS) {
        const value = filters[name];
        if (value !== undefined && value !== '' && value !== null) {
          if (type === 'text') {
            query = query.ilike(name, `%${value}%`);
          } else if (type === 'number') {
            query = query.eq(name, Number(value));
          }
        }
      }

      const [sortField, sortOrder] = sortBy.split(',');
      query = query.order(sortField, { ascending: sortOrder === 'asc' });

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;
      // Use raw rows from public_profiles_view
      setAlumni(data || []);
      setTotalAlumni(count || 0);

      // Log directory view activity (best-effort)
      logActivity({
        action: 'directory_list_view',
        meta: {
          q: searchTerm || null,
          filters,
          sortBy,
          page: currentPage,
          perPage: itemsPerPage,
          resultCount: (data || []).length,
          total: count || 0,
        },
        route: '/directory'
      });
    } catch (err) {
      logger.error('Error fetching alumni data:', err);
      setError('Failed to fetch alumni data. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, filters, sortBy, debouncedSearch, refreshTrigger]);

  useEffect(() => {
    const run = async () => {
      await fetchAlumniData();
      // Mark initial load as done once
      if (!initialLoadDoneRef.current) initialLoadDoneRef.current = true;
      setInitialLoaded(true);
    };
    run();
  }, [fetchAlumniData]);

  // Restore from URL on first mount (search, sort, filters, page)
  useEffect(() => {
    const initialQ = searchParams.get('q');
    const initialSort = searchParams.get('sort');
    if (initialQ !== null && initialQ !== searchTerm) setSearchTerm(initialQ);
    if (initialSort && initialSort !== sortBy) setSortBy(initialSort);
    const initialPage = parseInt(searchParams.get('page') || '1', 10);
    if (!Number.isNaN(initialPage) && initialPage > 0) setCurrentPage(initialPage);
    // Restore filters from URL
    const restored = {};
    FILTERABLE_COLUMNS.forEach(({ name }) => {
      const v = searchParams.get(name);
      if (v !== null) restored[name] = v;
    });
    if (Object.keys(restored).length) setFilters(restored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search term
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Sync to URL when search or sort changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (searchTerm) params.set('q', searchTerm); else params.delete('q');
    if (sortBy) params.set('sort', sortBy); else params.delete('sort');
    setSearchParams(params, { replace: true });
  }, [searchTerm, sortBy]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Sync filters and page to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    FILTERABLE_COLUMNS.forEach(({ name }) => {
      const v = filters[name];
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        params.set(name, String(v));
      } else {
        params.delete(name);
      }
    });
    params.set('page', String(currentPage));
    setSearchParams(params, { replace: true });
  }, [filters, currentPage]);
  
  // Realtime refresh when profiles change; subscribe only after initial load (idempotent)
  useEffect(() => {
    if (!initialLoadDoneRef.current || subscribedRef.current) return;
    subscribedRef.current = true;
    onPostgresChangesOnce(
      'alumni-directory-refresh',
      'alumni-directory-refresh-handler',
      { event: '*', schema: 'public', table: 'profiles' },
      (payload) => {
        try {
          const evt = payload.eventType;
          if (evt === 'INSERT' || evt === 'DELETE') {
            setRefreshTrigger(prev => prev + 1);
            return;
          }
          if (evt === 'UPDATE') {
            const oldRow = payload.old || {};
            const newRow = payload.new || {};
            if (
              oldRow.is_approved !== newRow.is_approved ||
              oldRow.role !== newRow.role ||
              oldRow.is_employer !== newRow.is_employer ||
              oldRow.positions !== newRow.positions ||
              oldRow.first_name !== newRow.first_name ||
              oldRow.last_name !== newRow.last_name ||
              oldRow.degree !== newRow.degree ||
              oldRow.department !== newRow.department
            ) {
              setRefreshTrigger(prev => prev + 1);
            }
          }
        } catch (e) {
          logger.error('Realtime directory refresh error:', e);
        }
      }
    );
    return () => { /* registry manages channel lifecycle */ };
  }, [initialLoaded]);

  // Separate useEffect for visibility change to avoid unnecessary data fetching
  useEffect(() => {
    // Setup visibility change detection to refresh data when user returns to page
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        logger.log('Page became visible, refreshing alumni data');
        // Instead of immediately triggering a refresh, check if we need to
        if (!loading) {
          setRefreshTrigger(prev => prev + 1);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loading]);

  // Calculate total pages for pagination
  const totalPages = Math.ceil(totalAlumni / itemsPerPage);

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    const filterValue = type === 'checkbox' ? checked : value;
    setFilters(prev => ({ ...prev, [name]: filterValue }));
  };

  const handleClearAllFilters = () => {
    setFilters({});
    setCurrentPage(1);
    setRefreshTrigger(prev => prev + 1);
    // Remove all filter params from URL
    const params = new URLSearchParams(searchParams);
    FILTERABLE_COLUMNS.forEach(({ name }) => params.delete(name));
    setSearchParams(params, { replace: true });
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
        <p className="mt-4 text-gray-600">Please <Link to="/login" className="text-indigo-600 hover:underline">log in</Link> to view the alumni directory.</p>
      </div>
    );
  }

  return (
    <main id="main-content" className="bg-gray-100 min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Alumni Directory</h1>
          <p className="mt-2 text-lg text-gray-600">Explore and connect with the AMET University alumni network.</p>
        </header>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, degree, company, location, or department"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                // Whenever the keyword changes, always start from page 1
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 focus-visible:border-ocean-500"
            />
            {isDebouncing && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Searching…</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="number"
              name="graduation_year"
              value={filters.graduation_year || ''}
              onChange={handleFilterChange}
              placeholder="Batch Year"
              className="w-28 px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50"
            />
            <input
              type="text"
              name="department"
              value={filters.department || ''}
              onChange={handleFilterChange}
              placeholder="Department"
              className="w-48 px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50"
            />
            <input
              type="text"
              name="degree_program"
              value={filters.degree_program || ''}
              onChange={handleFilterChange}
              placeholder="Degree"
              className="w-48 px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50"
            />
            <input
              type="text"
              name="current_job_title"
              value={filters.current_job_title || ''}
              onChange={handleFilterChange}
              placeholder="Designation"
              className="w-48 px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50"
            />
            <input
              type="text"
              name="location"
              value={filters.location || ''}
              onChange={handleFilterChange}
              placeholder="Location"
              className="w-48 px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50"
            />
            <button
              onClick={handleClearAllFilters}
              className="px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50"
            >
              Clear
            </button>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">
              <option value="full_name,asc">Name (A-Z)</option>
              <option value="full_name,desc">Name (Z-A)</option>
              <option value="graduation_year,desc">Graduation (Newest)</option>
              <option value="graduation_year,asc">Graduation (Oldest)</option>
            </select>
            <div className="flex items-center bg-white border border-gray-300 rounded-lg shadow-sm">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-l-lg ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}>
                <Squares2X2Icon className="h-5 w-5" />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-r-lg ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}>
                <ListBulletIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <section>
          {loading ? (
            <div className="flex flex-col items-center justify-center flex-grow py-20">
              <img src="/logo.png" alt="Loading..." className="h-24 w-24 animate-spin" />
              <p className="mt-4 text-lg text-gray-600">Loading Alumni...</p>
            </div>
          ) : error ? (
            <div className="bg-red-100 text-red-800 p-6 rounded-lg flex items-center gap-4">
              <ExclamationTriangleIcon className="h-8 w-8" />
              <div>
                <h3 className="font-bold">Error</h3>
                <p>{error}</p>
              </div>
            </div>
          ) : alumni.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-lg shadow-md">
              <h3 className="text-2xl font-bold text-gray-800">{searchTerm ? `No results for ‘${searchTerm}’` : 'No Alumni Found'}</h3>
              <p className="mt-3 text-gray-600">Try adjusting your search or filter criteria.</p>
            </div>
          ) : (
            <>
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'
                : 'space-y-4'
              }>
                {alumni.map(user => {
                  // The user object is now pre-mapped by mapProfileToCard
                  const finalUser = {
                    ...user, // Contains all fields from CardProfile type
                    isMentor: approvedMentorIds.has(user.id),
                  };

                  return viewMode === 'grid' ? (
                    <AlumniCard key={user.id} alumnus={finalUser} />
                  ) : (
                    <AlumniListItem key={user.id} alumnus={finalUser} />
                  );
                })}
              </div>
              {!loading && totalPages > 1 && (
                  <nav aria-label="Pagination" className="mt-10 flex flex-col items-center">
                      <div className="border-t w-full pt-6">
                          <div className="flex justify-center items-center gap-4">
                              <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                                disabled={currentPage === 1} 
                                aria-label="Go to previous page"
                                className="inline-flex items-center min-h-[44px] min-w-[44px] px-4 py-2 rounded-lg border-2 border-ocean-300 text-ocean-700 hover:bg-ocean-50 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 transition-colors duration-200"
                              >
                                  Previous
                              </button>
                              <span aria-current="page" className="min-h-[44px] px-4 py-2 rounded-lg bg-ocean-600 text-white font-medium flex items-center">
                                Page {currentPage} of {totalPages}
                              </span>
                              <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                                disabled={currentPage === totalPages} 
                                aria-label="Go to next page"
                                className="inline-flex items-center min-h-[44px] min-w-[44px] px-4 py-2 rounded-lg border-2 border-ocean-300 text-ocean-700 hover:bg-ocean-50 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 transition-colors duration-200"
                              >
                                  Next
                              </button>
                          </div>
                      </div>
                      <div className="mt-3 text-sm text-gray-500" role="status" aria-live="polite">
                          Showing <span className="font-medium">{alumni.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalAlumni)}</span> of <span className="font-medium">{totalAlumni}</span> alumni
                      </div>
                  </nav>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
};

export default AlumniDirectory;