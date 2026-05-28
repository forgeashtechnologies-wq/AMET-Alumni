import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { getLatestEdge, idempotentConnect } from '../../utils/connections';
import { log } from '../../utils/log';
import { isQuickLink } from '../../utils/jobs';

// Normalize resume value (path or legacy public URL) into a storage path
const getResumePathFromValue = (value) => {
  if (!value) return null;

  // New style: plain key/path like "userId/uuid-file.pdf"
  if (!/^https?:\/\//i.test(value)) {
    return value;
  }

  // Legacy style: full public URL containing "/storage/v1/object/public/resumes/<key>"
  const match = value.match(/\/storage\/v1\/object\/public\/resumes\/(.+)$/);
  if (match && match[1]) {
    return match[1];
  }

  return null;
};

const STATUS_MAP = {
  'Submitted': 'submitted',
  'Under review': 'reviewed',
  'Shortlisted': 'interviewing',
  'Offered': 'offered',
  'Rejected': 'rejected',
};

const CANONICAL_DB_VALUES = new Set(Object.values(STATUS_MAP));

const DB_TO_LABEL = {
  'submitted': 'Submitted',
  'reviewed': 'Under review',
  'interviewing': 'Shortlisted',
  'offered': 'Offered',
  'rejected': 'Rejected',
  'applied': 'Submitted',
  'under_review': 'Under review',
  'shortlisted': 'Shortlisted',
  'hired': 'Offered',
};

function getLabelForStatus(status) {
  return DB_TO_LABEL[status] || (status ? String(status) : 'Submitted');
}

function mapLabelToDb(label) {
  const dbValue = STATUS_MAP[label] ?? label?.toLowerCase()?.trim();
  return dbValue;
}

const ManageJobApplications = () => {
  const { jobId, id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [applications, setApplications] = useState([]);
  const [savingIds, setSavingIds] = useState(new Set());
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connMap, setConnMap] = useState(new Map()); // applicant_id -> status
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;
  const isMountedRef = useRef(true);

  // Handle both parameter names (jobId and id)
  const actualJobId = jobId || id;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchJobAndApplications = useCallback(async () => {
    if (!user || !actualJobId) {
      if (isMountedRef.current) {
        setError("Invalid or missing job ID.");
        setLoading(false);
      }
      return;
    }

    try {
      if (!isMountedRef.current) return;
      setLoading(true);
      // Session snapshot
      const { data: { session } } = await supabase.auth.getSession();
      log.group('[APPS] session', { hasSession: !!session, userId: session?.user?.id, jobId: actualJobId });

      // Fetch job details (admin-aware: allow admins to see any job)
      const t0 = performance.now();
      let jobQuery = supabase
        .from('jobs')
        .select('id, title, posted_by, user_id, created_by, company_id')
        .eq('id', actualJobId);

      // If admin, no additional filter needed; RLS will allow
      // If not admin, add ownership filter to prevent unauthorized access
      if (!isAdmin) {
        jobQuery = jobQuery.or(`posted_by.eq.${user.id},user_id.eq.${user.id},created_by.eq.${user.id}`);
      }

      const jobResp = await jobQuery.single();
      const jobData = jobResp.data; const jobError = jobResp.error;
      log.group('[APPS] job fetch', {
        ms: +(performance.now() - t0).toFixed(1),
        error: jobError ? { code: jobError.code, message: jobError.message, details: jobError.details } : null,
        gotRow: !!jobData
      });

      if (jobError || !jobData) {
        if (isMountedRef.current) {
          setError("This job either doesn’t exist or you’re not authorized to view its applications.");
          setJob(null);
          setApplications([]);
        }
        return;
      }

      if (isMountedRef.current) {
        setJob(jobData);
      }

      // Determine ownership (posted_by OR user_id OR created_by) or admin
      const ownerIds = [jobData.posted_by, jobData.user_id, jobData.created_by].filter(Boolean);
      const isOwner = ownerIds.includes(user.id) || isAdmin;

      if (isOwner) {
        // Use owner-scoped RPC with paging and total_count
        const offset = (currentPage - 1) * pageSize;
        const t1 = performance.now();
        const { data: rpcRows, error: rpcErr2 } = await supabase.rpc('get_applications_for_job_v2', {
          p_job_id: actualJobId,
          p_limit: pageSize,
          p_offset: offset,
        });
        log.group('[APPS] list via get_applications_for_job', {
          ms: +(performance.now() - t1).toFixed(1),
          error: rpcErr2 ? { code: rpcErr2.code, message: rpcErr2.message, details: rpcErr2.details } : null,
          rows: Array.isArray(rpcRows) ? rpcRows.length : 0
        });
        if (rpcErr2) throw rpcErr2;
        const baseRows = Array.isArray(rpcRows) ? rpcRows : [];
        baseRows.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        // Enrich rows: signed URL fallback and applicant display name
        const enriched = await Promise.all(baseRows.map(async (row) => {
          const out = { ...row };
          try {
            // Derive an authorization-checked resume path via RPC before signing
            const { data: resumePath, error: pathErr } = await supabase.rpc(
              'get_job_application_resume_path_for_viewer',
              { p_application_id: row.id }
            );

            if (!pathErr && resumePath) {
              const { data: signed, error: signErr } = await supabase
                .storage
                .from('resumes')
                .createSignedUrl(resumePath, 60 * 60);
              if (!signErr && signed?.signedUrl) {
                out._resume_signed_url = signed.signedUrl;
              }
            }
          } catch (_) { /* ignore */ }

          try {
            // Applicant display name fallback if RPC did not return applicant_name
            if (!out.applicant_name && out.applicant_id) {
              const { data: prof } = await supabase
                .from('profiles')
                .select('full_name, name, first_name, last_name')
                .eq('id', out.applicant_id)
                .maybeSingle();
              if (prof) {
                out._applicant_display = (
                  prof.full_name ||
                  prof.name ||
                  [prof.first_name, prof.last_name].filter(Boolean).join(' ') ||
                  'Applicant'
                );
              }
            }
          } catch (_) { /* ignore */ }
          return out;
        }));

        if (isMountedRef.current) {
          setApplications(enriched);
          setTotalCount(baseRows[0]?.total_count ?? 0);
        }
        // Load connection status for each applicant
        if (user?.id && Array.isArray(baseRows)) {
          const entries = await Promise.all(
            baseRows.map(async (app) => {
              const otherId = app.applicant_id;
              if (!otherId) return [null, null];
              try {
                const edge = await getLatestEdge(user.id, otherId);
                return [otherId, edge?.status || null];
              } catch (e) {
                return [otherId, null];
              }
            })
          );
          const map = new Map(entries.filter(([k]) => !!k));
          if (isMountedRef.current) {
            setConnMap(map);
          }
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message);
      }
      log.group('[APPS] fetch error', { error: err });
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [actualJobId, user, isAdmin, currentPage]);

  useEffect(() => {
    fetchJobAndApplications();
  }, [fetchJobAndApplications]);

  const handleStatusChange = async (applicationId, newStatus) => {
    try {
      if (!isMountedRef.current) return;
      setSavingIds(prev => new Set(prev).add(applicationId));
      if (!CANONICAL_DB_VALUES.has(newStatus)) {
        log.group('[APPS] invalid status for DB', { newStatus });
        throw new Error('Invalid status');
      }
      const { error } = await supabase.rpc('set_application_status', {
        p_application_id: applicationId,
        p_status: newStatus,
        p_notes: null,
      });

      if (error) throw error;

      if (isMountedRef.current) {
        setApplications(apps =>
          apps.map(app => (app.id === applicationId ? { ...app, status: newStatus } : app))
        );
      }
      toast.success('Application status updated.');
    } catch (err) {
      const msg = (err?.code === '42501' || err?.code === 'P0001' || err?.status === 403 || /RLS|permission|not allowed/i.test(err?.message || ''))
        ? 'Only the job owner can manage applications.'
        : 'We could not update the status. Please try again.';
      toast.error(msg);
      log.group('[APPS] error updating status', { error: err });
    }
    finally {
      if (isMountedRef.current) {
        setSavingIds(prev => {
          const next = new Set(prev);
          next.delete(applicationId);
          return next;
        });
      }
    }
  };

  const handleRequestConnection = async (otherId) => {
    if (!user?.id || !otherId) return;
    try {
      await idempotentConnect(user.id, otherId);
      toast.success('Connection request sent.');
      // Refresh connection map for this applicant
      const edge = await getLatestEdge(user.id, otherId);
      if (isMountedRef.current) {
        setConnMap(prev => new Map(prev).set(otherId, edge?.status || 'pending'));
      }
    } catch (e) {
      // idempotentConnect already toasts on failure
    }
  };

  const canMessage = (otherId) => {
    const status = connMap.get(otherId);
    return status === 'accepted' || status === 'connected';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {loading && (
        <div className="py-10"><LoadingSpinner message="Loading applications..." /></div>
      )}
      {(!loading && !actualJobId) && (
        <div className="text-center py-10 bg-red-50 rounded-lg border border-red-200">
          <div className="text-red-600 font-medium">Invalid or missing job ID</div>
          <p className="text-red-500 text-sm mt-1">Please check the URL and try again.</p>
        </div>
      )}
      {(!loading && error) && (
        <div className="text-center py-10 bg-red-50 rounded-lg border border-red-200">
          <div className="text-red-600 font-medium">Access Denied</div>
          <p className="text-red-500 text-sm mt-1">{error}</p>
          <p className="text-gray-500 text-xs mt-2">You need to be the job poster or an administrator to view applications.</p>
        </div>
      )}
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors mr-4"
          aria-label="Go back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-3xl font-bold mb-2">Manage Applications</h1>
          <h2 className="text-xl text-gray-600">For: {job?.title || 'Unknown job'}</h2>
        </div>
      </div>
      
      {(() => {
        const quick = isQuickLink(job);
        if (quick) {
          return (
            <div className="mb-6 p-4 rounded-md bg-blue-50 text-blue-800 border border-blue-100">
              This is a Quick Link job. Applications are collected on the external site, so there may be no in-app applicants here.
            </div>
          );
        }

        const ownerIds = [job?.posted_by, job?.user_id, job?.created_by].filter(Boolean);
        const isOwner = ownerIds.includes(user.id) || isAdmin;

        if (!isOwner && !isAdmin) {
          return (
            <div className="mb-6 p-4 rounded-md bg-yellow-50 text-yellow-800 border border-yellow-100">
              You are not authorized to view applications for this job.
            </div>
          );
        }

        return (
          applications.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
              <p className="text-gray-600 mb-4">No one has applied to this job yet.</p>
              <div className="text-sm text-gray-500 space-y-1">
                <p>• Share this job on social media to attract more applicants</p>
                <p>• Consider reviewing your job requirements and salary</p>
                <p>• Check back later for new applications</p>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile list (sm and below) */}
              <div className="md:hidden space-y-3">
                {applications.map(app => (
                  <div key={app.id} className="bg-white shadow rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link to={`/jobs/${actualJobId}/applicants/${app.applicant_id}`} className="block font-medium text-gray-900 truncate hover:underline">
                          {app._applicant_display || app.applicant_name || 'Applicant'}
                        </Link>
                        <div className="mt-1 text-xs text-gray-500">Applied on {new Date(app.created_at).toLocaleDateString()}</div>
                        <div className="mt-2 text-sm">
                          {app._resume_signed_url ? (
                            <>
                              <a href={app._resume_signed_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View Resume</a>
                              <div className="mt-1 text-xs text-gray-500 space-x-2">
                                {app.resume_from_profile ? <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">Profile</span> : <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700">New Upload</span>}
                                {app.matches_primary ? <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-ocean-100 text-ocean-700">Primary</span> : null}
                                {app.resume_uploaded_at ? <span>Uploaded: {new Date(app.resume_uploaded_at).toLocaleDateString()}</span> : null}
                              </div>
                            </>
                          ) : (
                            <span className="text-gray-400">No resume</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Status</label>
                        {(() => {
                          const currentLabel = getLabelForStatus(app.status);
                          const currentDb = CANONICAL_DB_VALUES.has(app.status)
                            ? app.status
                            : mapLabelToDb(currentLabel);
                          const isNonCanonical = !CANONICAL_DB_VALUES.has(app.status);
                          return (
                            <select
                              value={currentDb}
                              onChange={(e) => handleStatusChange(app.id, e.target.value)}
                              disabled={savingIds.has(app.id)}
                              aria-label={`Update status for ${app.applicant_name || 'applicant'}`}
                              className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md disabled:opacity-60"
                            >
                              {isNonCanonical && (
                                <option value={app.status} disabled>{currentLabel} (legacy)</option>
                              )}
                              <option value="submitted">Submitted</option>
                              <option value="reviewed">Under review</option>
                              <option value="interviewing">Shortlisted</option>
                              <option value="offered">Offered</option>
                              <option value="rejected">Rejected</option>
                            </select>
                          );
                        })()}
                        {savingIds.has(app.id) && (
                          <div className="text-xs text-gray-400 mt-1" aria-live="polite">Saving…</div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Link to={`/jobs/${actualJobId}/applicants/${app.applicant_id}`} className="text-ocean-600 hover:underline text-sm">View Profile</Link>
                        {canMessage(app.applicant_id) ? (
                          <button onClick={() => navigate(`/messages?peer=${app.applicant_id}&job=${actualJobId}`)} className="text-blue-600 hover:underline text-sm">Message</button>
                        ) : (
                          <button onClick={() => handleRequestConnection(app.applicant_id)} className="text-green-600 hover:underline text-sm">Request Connection</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table (md and up) */}
              <div className="hidden md:block bg-white shadow-md rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied On</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resume</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {applications.map(app => (
                      <tr key={app.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <Link to={`/directory/${app.applicant_id}`} className="text-sm font-medium text-gray-900 hover:underline">
                              {app._applicant_display || app.applicant_name || 'Applicant'}
                            </Link>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(app.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {app._resume_signed_url ? (
                            <div>
                              <a href={app._resume_signed_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View Resume</a>
                              <div className="mt-1 text-xs text-gray-500 space-x-2">
                                {app.resume_from_profile ? <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">Profile</span> : <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700">New Upload</span>}
                                {app.matches_primary ? <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-ocean-100 text-ocean-700">Primary</span> : null}
                                {app.resume_uploaded_at ? <span>Uploaded: {new Date(app.resume_uploaded_at).toLocaleDateString()}</span> : null}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {(() => {
                            const currentLabel = getLabelForStatus(app.status);
                            const currentDb = CANONICAL_DB_VALUES.has(app.status)
                              ? app.status
                              : mapLabelToDb(currentLabel);
                            const isNonCanonical = !CANONICAL_DB_VALUES.has(app.status);
                            return (
                              <select
                                value={currentDb}
                                onChange={(e) => handleStatusChange(app.id, e.target.value)}
                                disabled={savingIds.has(app.id)}
                                aria-label={`Update status for ${app.applicant_name || 'applicant'}`}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:opacity-60"
                              >
                                {isNonCanonical && (
                                  <option value={app.status} disabled>{currentLabel} (legacy)</option>
                                )}
                                <option value="submitted">Submitted</option>
                                <option value="reviewed">Under review</option>
                                <option value="interviewing">Shortlisted</option>
                                <option value="offered">Offered</option>
                                <option value="rejected">Rejected</option>
                              </select>
                            );
                          })()}
                          {savingIds.has(app.id) && (
                            <div className="text-xs text-gray-400 mt-1" aria-live="polite">Saving…</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                          <Link to={`/jobs/${actualJobId}/applicants/${app.applicant_id}`} className="text-ocean-600 hover:underline">View Profile</Link>
                          {canMessage(app.applicant_id) ? (
                            <button onClick={() => navigate(`/messages?peer=${app.applicant_id}&job=${actualJobId}`)} className="text-blue-600 hover:underline">Message</button>
                          ) : (
                            <button onClick={() => handleRequestConnection(app.applicant_id)} className="text-green-600 hover:underline">Request Connection</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        );
      })()}
      
      {/* Pagination */}
      {totalCount > pageSize && (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center min-h-[44px] min-w-[44px] px-4 py-2 rounded-lg border-2 border-ocean-300 text-ocean-700 hover:bg-ocean-50 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 transition-colors duration-200"
          >
            Previous
          </button>
          <span className="min-h-[44px] px-4 py-2 rounded-lg bg-ocean-600 text-white font-medium flex items-center">
            Page {currentPage} of {Math.ceil(totalCount / pageSize)}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
            disabled={currentPage >= Math.ceil(totalCount / pageSize)}
            className="inline-flex items-center min-h-[44px] min-w-[44px] px-4 py-2 rounded-lg border-2 border-ocean-300 text-ocean-700 hover:bg-ocean-50 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 transition-colors duration-200"
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
};

export default ManageJobApplications;
