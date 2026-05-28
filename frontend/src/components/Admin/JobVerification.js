import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import toast from 'react-hot-toast';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/solid';
import { getJobLogoUrl, getJobCompanyName } from '../../utils/jobs';

const JobVerification = () => {
  const [pendingJobs, setPendingJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPendingJobs = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select('*, companies(name, logo_url)')
        .eq('is_approved', false)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPendingJobs(data);
    } catch (err) {
      logger.error('Error fetching pending jobs:', err);
      setError('Failed to load jobs for verification.');
      toast.error('Could not fetch pending jobs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingJobs();
  }, [fetchPendingJobs]);

  const handleJobAction = async (jobId, isApproved) => {
    try {
      const { error } = await supabase.rpc('admin_set_job_approval', {
        p_job_id: jobId,
        p_approved: isApproved,
        p_rejected: !isApproved,
      });

      if (error) throw error;

      setPendingJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
      toast.success(`Job has been ${isApproved ? 'approved' : 'rejected'}.`);
    } catch (err) {
      logger.error('Error updating job status via admin_set_job_approval:', err);
      const msg = (err?.code === '42501' || err?.status === 403 || /RLS|permission|not allowed/i.test(err?.message || ''))
        ? 'You are not allowed to perform this action.'
        : 'Failed to update job status.';
      toast.error(msg);
    }
  };

  if (loading) {
    return <div className="text-center p-10">Loading pending jobs...</div>;
  }

  if (error) {
    return <div className="text-center p-10 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Job Post Verification</h1>
      {pendingJobs.length > 0 ? (
        <div className="glass-card rounded-lg p-6">
          <ul className="divide-y divide-gray-200">
            {pendingJobs.map(job => {
              const logoSrc = getJobLogoUrl(job) || '/default-company-logo.svg';
              const companyName = getJobCompanyName(job) || 'N/A';
              return (
              <li key={job.id} className="py-4 flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <img src={logoSrc} alt="" className="w-12 h-12 rounded-lg object-contain bg-white" />
                    <div>
                      <p className="font-semibold text-ocean-700">{job.title}</p>
                      <p className="text-sm text-gray-600">{companyName}</p>
                      <p className="text-xs text-gray-500">Posted on: {new Date(job.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button 
                    onClick={() => handleJobAction(job.id, true)}
                    className="btn-primary bg-green-500 hover:bg-green-600 inline-flex items-center gap-1.5"
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                    Approve
                  </button>
                  <button 
                    onClick={() => handleJobAction(job.id, false)}
                    className="btn-danger bg-red-500 hover:bg-red-600 inline-flex items-center gap-1.5"
                  >
                    <XCircleIcon className="w-5 h-5" />
                    Reject
                  </button>
                </div>
              </li>
            ); })}
          </ul>
        </div>
      ) : (
        <div className="text-center py-12 glass-card rounded-lg">
          <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Pending Jobs</h3>
          <p className="mt-1 text-sm text-gray-500">All job submissions have been reviewed.</p>
        </div>
      )}
    </div>
  );
};

export default JobVerification;
