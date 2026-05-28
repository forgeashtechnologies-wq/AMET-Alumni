import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../hooks/useNotification';
import { LinkIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

const PostJobWithLink = () => {
  const [title, setTitle] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !jobUrl.trim()) {
      showError('Please fill in both the job title and the URL.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('jobs')
        .insert([
          {
            title,
            application_url: jobUrl,
            description: `This is an external job posting. Apply at the provided link.`,
            is_active: true,
            is_approved: false,
            created_by: user?.id || null
          }
        ])
        .select();

      if (error) throw error;

      showSuccess('Job posted successfully!');
      navigate('/jobs');
    } catch (error) {
      const code = error?.code;
      const msg = String(error?.message || error?.details || '');
      if (code === '42501' || /row-level security/i.test(msg) || /fc_is_fully_approved/i.test(msg)) {
        showError('Your account must be an approved Employer to post jobs. Please wait for admin approval or contact the administrator for assistance.');
      } else {
        showError(error.message || 'Failed to post job.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div>
          <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">Post a Job with a Link</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Quickly share a job opportunity by providing a direct link.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="job-title" className="sr-only">Job Title</label>
              <input
                id="job-title"
                name="title"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-ocean-500 focus:border-ocean-500 focus:z-10 sm:text-sm"
                placeholder="Job Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="job-url" className="sr-only">Job URL</label>
              <input
                id="job-url"
                name="url"
                type="url"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-ocean-500 focus:border-ocean-500 focus:z-10 sm:text-sm"
                placeholder="https://example.com/job-posting"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-ocean-600 hover:bg-ocean-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ocean-500 disabled:opacity-50"
            >
              {loading ? 'Posting...' : 'Post Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostJobWithLink;
