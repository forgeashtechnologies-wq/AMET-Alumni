import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import { Link } from 'react-router-dom';
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

const JobApplicationStatus = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchApplications = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('job_applications')
          .select(`
            id,
            created_at,
            status,
            resume_url,
            jobs:job_id!inner (id, title, company_name, source_type)
          `)
          .eq('applicant_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        const rows = Array.isArray(data) ? data : [];

        const enriched = await Promise.all(rows.map(async (row) => {
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
      } catch (err) {
        setError('Failed to fetch application status.');
        logger.error('Error fetching applications:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [user]);

  if (loading) {
    return <LoadingSpinner message="Loading your applications..." />;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My Job Applications</h1>
      {applications.length === 0 ? (
        <p>You have not applied to any jobs yet.</p>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {applications.map((app) => (
              <li key={app.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <Link to={`/jobs/${app.jobs?.id || app.job_id}`} className="block">
                      <p className="text-lg font-semibold text-blue-600">{app.jobs?.title || 'Job'}</p>
                    </Link>
                    <p className="text-sm text-gray-600">{app.jobs?.company_name || ''}</p>
                    <p className="text-xs text-gray-500 mt-1">Applied on: {new Date(app.created_at).toLocaleDateString()}</p>
                    {app._resume_signed_url && (
                      <a href={app._resume_signed_url} target="_blank" rel="noopener noreferrer" className="text-xs text-ocean-600 hover:underline">
                        View Resume
                      </a>
                    )}
                  </div>
                  {(() => {
                    const canonical = normalizeStatus(app.status);
                    return (
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${STATUS_BADGE_CLASS[canonical]}`}>
                        {STATUS_LABEL[canonical]}
                      </span>
                    );
                  })()}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default JobApplicationStatus;
