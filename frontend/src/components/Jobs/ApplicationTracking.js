import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';
import logger from '../../utils/logger';
import { normalizeStatus, STATUS_BADGE_CLASS, STATUS_LABEL } from '../../utils/applicationStatus';

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

const ApplicationTracking = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    // Route guard: only applicants (student/alumni)
    if (user && !['student','alumni'].includes(userRole)) {
      toast.error('Only student and alumni accounts can view My applications.');
      navigate('/jobs', { replace: true });
      return;
    }

    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchApplications = async () => {
      try {
        // Query that joins job_applications with jobs to get full details.
        // RLS will scope to the current user automatically.
        const { data, error } = await supabase
          .from('job_applications')
          .select(`
            id,
            created_at,
            status,
            resume_url,
            jobs:job_id (
              id,
              title,
              company_name,
              location,
              job_type,
              deadline,
              apply_url,
              application_url,
              external_url
            )
          `)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        const rows = Array.isArray(data) ? data : [];

        // Derive source_type client-side (same semantics as v_jobs_public)
        const appsWithSourceType = rows.map(app => ({
          ...app,
          jobs: app.jobs ? {
            ...app.jobs,
            source_type: (app.jobs.apply_url || app.jobs.application_url || app.jobs.external_url)
              ? 'quick_link'
              : 'in_app'
          } : null
        }));

        // Filter for in_app jobs only (matching original intent)
        const inAppApplications = appsWithSourceType.filter(app => 
          app.jobs && app.jobs.source_type === 'in_app'
        );

        const enriched = await Promise.all(inAppApplications.map(async (row) => {
          const out = { ...row };
          try {
            const path = getResumePathFromValue(row.resume_url || '');
            if (path) {
              const { data: signed, error: signErr } = await supabase
                .storage
                .from('resumes')
                .createSignedUrl(path, 60 * 60);
              if (!signErr && signed?.signedUrl) {
                out._resume_signed_url = signed.signedUrl;
              }
            }
          } catch (_) { /* ignore */ }
          return out;
        }));

        setApplications(enriched);
      } catch (error) {
        logger.error('Error fetching applications:', error);
        toast.error('We could not load your applications. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplications();
  }, [user]);

  // Status filters (canonical values)
  const filterOptions = [
    { value: 'all',           label: 'All Applications' },
    { value: 'submitted',     label: STATUS_LABEL.submitted },
    { value: 'under_review',  label: STATUS_LABEL.under_review },
    { value: 'shortlisted',   label: STATUS_LABEL.shortlisted },
    { value: 'interviewing',  label: STATUS_LABEL.interviewing },
    { value: 'offered',       label: STATUS_LABEL.offered },
    { value: 'hired',         label: STATUS_LABEL.hired },
    { value: 'rejected',      label: STATUS_LABEL.rejected },
    { value: 'withdrawn',     label: STATUS_LABEL.withdrawn },
  ];

  const filteredApplications = filter === 'all' 
    ? applications 
    : applications.filter(app => normalizeStatus(app.status) === filter);

  const getStatusBadgeClass = (status) => {
    const canonical = normalizeStatus(status);
    return STATUS_BADGE_CLASS[canonical];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const calculateDaysAgo = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading your applications...</div>;
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-xl mb-4">Please log in to view your applications.</p>
        <Link to="/login" className="px-6 py-2 bg-blue-600 text-white rounded-lg">
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">My applications</h2>
      
      {applications.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg shadow">
          <svg 
            className="mx-auto h-12 w-12 text-gray-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1} 
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">You have not applied to any roles yet</h3>
          <p className="mt-1 text-gray-500">When you apply to jobs, your applications and statuses will appear here.</p>
          <div className="mt-6">
            <Link
              to="/jobs"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Browse jobs
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Filter options */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by status
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {filterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label} {option.value === 'all'
                    ? `(${applications.length})`
                    : `(${applications.filter(app => normalizeStatus(app.status) === option.value).length})`}
                </option>
              ))}
            </select>
          </div>

          {/* Applications list */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {filteredApplications.map((application) => (
                <li key={application.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <p className="text-lg font-medium text-blue-600 truncate">
                          <Link to={`/jobs/${application.job_id}`} className="hover:underline">
                            {application.jobs?.title || 'Unknown Position'}
                          </Link>
                        </p>
                        {(() => {
                          const canonical = normalizeStatus(application.status);
                          return (
                            <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(canonical)}`}>
                              {STATUS_LABEL[canonical]}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="ml-2 flex-shrink-0 flex">
                        <p className="text-sm text-gray-500">
                          Applied {calculateDaysAgo(application.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1.581.814l-4.419-3.346-4.419 3.346A1 1 0 014 16V4zm7 5a1 1 0 10-2 0v2a1 1 0 102 0V9z" clipRule="evenodd" />
                          </svg>
                          {application.jobs?.company_name || 'Unknown Company'}
                        </p>
                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                          <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          {application.jobs?.location || 'Location not specified'}
                        </p>
                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                          <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                            <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                          </svg>
                          {application.jobs?.job_type || 'Job type not specified'}
                        </p>
                        {application._resume_signed_url && (
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M8 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V7.414a2 2 0 00-.586-1.414l-3.414-3.414A2 2 0 0010.586 2H8z"/>
                            </svg>
                            <a href={application._resume_signed_url} target="_blank" rel="noopener noreferrer" className="text-ocean-600 hover:underline">View Resume</a>
                          </p>
                        )}
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        <p>
                          {(() => { const d = application.jobs?.deadline || application.jobs?.application_deadline; return (
                            <>Deadline: {d ? formatDate(d) : 'Not specified'}</>
                          ); })()}
                        </p>
                      </div>
                    </div>

                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default ApplicationTracking;
