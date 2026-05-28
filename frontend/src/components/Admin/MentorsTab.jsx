import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import logger from '../../utils/logger';
import { MentorStatusChip } from '../../lib/statusChips';
import { Skeleton } from '../ui/skeleton';
import { adminForceMentorUnavailable } from '../../services/mentorship';

const PAGE_SIZE = 10;

// Simple CSV export for filtered rows
function exportMentorsCSV(rows) {
  const header = ['name', 'email', 'status', 'created_at'];
  const lines = [header.join(',')];
  (rows || []).forEach(r => {
    const name = (r.applicant?.full_name || '').replaceAll(',', ' ');
    const email = (r.applicant?.email || '').replaceAll(',', ' ');
    const status = r.status || '';
    const createdAt = r.created_at || '';
    lines.push([name, email, status, createdAt].join(','));
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mentors.csv';
  a.click();
  URL.revokeObjectURL(url);
}

const MentorsTab = () => {
  const { userRole } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState('pending'); // default Pending
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Base query: mentors joined to profiles
      let query = supabase
        .from('mentors')
        .select(`
          user_id,
          status,
          expertise,
          mentoring_preferences,
          created_at,
          applicant:profiles!mentors_user_id_fkey (id, full_name, email, avatar_url, location, last_seen, role, is_available_for_mentorship)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Pagination via range
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await query.range(from, to);
      if (error) throw error;

      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      logger.error(e);
      setError('Failed to load mentors');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const forceUnavailable = useCallback(async (userId) => {
    try {
      // Optimistic update: flip availability immediately
      const prev = rows.slice();
      setRows(r => r.map(x => (
        x.user_id === userId
          ? { ...x, applicant: { ...x.applicant, is_available_for_mentorship: false } }
          : x
      )));
      await adminForceMentorUnavailable(userId);
      toast.success('Availability set to Off');
      fetchRows();
    } catch (e) {
      logger.error(e);
      toast.error('Failed to force unavailable');
      // Revert if optimistic update was applied
      fetchRows();
    }
  }, [fetchRows, rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      (r.applicant?.full_name || '').toLowerCase().includes(q) ||
      (r.applicant?.email || '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const handleApprove = async (userId) => {
    try {
      const prev = rows.slice();
      // optimistic update
      setRows(r => r.map(x => x.user_id === userId ? { ...x, status: 'approved' } : x));
      const { error } = await supabase
        .from('mentors')
        .update({ status: 'approved' })
        .eq('user_id', userId);
      if (error) throw error;
      toast.success('Mentor approved');
    } catch (e) {
      logger.error(e);
      toast.error('Failed to approve mentor');
      fetchRows();
    }
  };

  const handleReject = async (userId) => {
    try {
      const prev = rows.slice();
      setRows(r => r.map(x => x.user_id === userId ? { ...x, status: 'rejected' } : x));
      const { error } = await supabase
        .from('mentors')
        .update({ status: 'rejected' })
        .eq('user_id', userId);
      if (error) throw error;
      toast.success('Mentor rejected');
    } catch (e) {
      logger.error(e);
      toast.error('Failed to reject mentor');
      fetchRows();
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Mentors</h2>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}
            className="form-input px-3 py-2 rounded"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
          <input
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            placeholder="Search name/email"
            className="form-input px-3 py-2 rounded"
          />
          <button
            className="px-3 py-2 rounded border text-sm"
            onClick={() => exportMentorsCSV(filtered)}
          >
            Download CSV
          </button>
        </div>
      </div>


      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border border-ocean-100 rounded-lg">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-600">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          {statusFilter === 'pending' ? 'No mentor applications in Pending.' : 'No mentor applications in this view.'}
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg mb-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Availability</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Seen</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((row) => (
                <tr key={row.user_id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={row.applicant?.avatar_url || '/default-avatar.svg'}
                        alt={row.applicant?.full_name || 'User'}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/default-avatar.svg';
                        }}
                      />
                      <div>
                        <div className="font-medium text-gray-900">{row.applicant?.full_name || 'Unknown'}</div>
                        <div className="text-gray-500 text-sm">{row.applicant?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">Mentor</td>
                  <td className="px-4 py-3">
                    <MentorStatusChip status={row.status} />
                  </td>
                  <td className="px-4 py-3">
                    {row.applicant?.is_available_for_mentorship ? (
                      <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs">Accepting mentees</span>
                    ) : (
                      <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs">Unavailable</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{row.applicant?.location || '-'}</td>
                  <td className="px-4 py-3">{row.applicant?.last_seen ? new Date(row.applicant.last_seen).toLocaleString() : '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {(() => {
                        const applicantRole = (row.applicant?.role || 'alumni');
                        const isAdminApplicant = applicantRole === 'admin' || applicantRole === 'super_admin';
                        const isSuperAdmin = userRole === 'super_admin';
                        const disableForRole = isAdminApplicant && !isSuperAdmin;
                        return (
                          <>
                            <button
                              className="px-3 py-1 rounded bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-50"
                              onClick={() => handleApprove(row.user_id)}
                              disabled={row.status === 'approved' || disableForRole}
                            >
                              Approve
                            </button>
                            <button
                              className="px-3 py-1 rounded border border-red-600 text-red-600 text-sm hover:bg-red-50 disabled:opacity-50"
                              onClick={() => handleReject(row.user_id)}
                              disabled={row.status === 'rejected' || disableForRole}
                            >
                              Reject
                            </button>
                            <button
                              className="px-3 py-1 rounded border text-sm hover:bg-gray-50 disabled:opacity-50"
                              onClick={() => forceUnavailable(row.user_id)}
                              disabled={disableForRole || row.applicant?.is_available_for_mentorship === false}
                              title="Force Unavailable"
                            >
                              Force Unavailable
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <nav aria-label="Pagination" className="flex items-center justify-center gap-4 mt-6">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          aria-label="Go to previous page"
          className="inline-flex items-center min-h-[44px] min-w-[44px] px-4 py-2 rounded-lg border-2 border-ocean-300 text-ocean-700 hover:bg-ocean-50 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 transition-colors duration-200"
        >
          Previous
        </button>
        <span aria-current="page" className="min-h-[44px] px-4 py-2 rounded-lg bg-ocean-600 text-white font-medium flex items-center">
          Page {page}
        </span>
        <button
          onClick={() => setPage(p => p + 1)}
          aria-label="Go to next page"
          className="inline-flex items-center min-h-[44px] min-w-[44px] px-4 py-2 rounded-lg border-2 border-ocean-300 text-ocean-700 hover:bg-ocean-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 transition-colors duration-200"
        >
          Next
        </button>
      </nav>
      <div className="text-center mt-3 text-sm text-gray-600" role="status" aria-live="polite">
        Showing {filtered.length} mentor(s)
      </div>
    </div>
  );
};

export default MentorsTab;
