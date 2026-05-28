import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { normalizeStatus, STATUS_BADGE_CLASS, STATUS_LABEL } from '../../utils/applicationStatus';

const JobApplicationReview = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentApplication, setCurrentApplication] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState('submitted');

  const fetchApplications = async (status = statusFilter) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_job_applications_for_review', {
        p_status: status,
        p_limit: 50
      });

      if (error) throw error;

      setApplications(data || []);
    } catch (error) {
      logger.error('Error fetching job applications:', error);
      toast.error('Failed to load job applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const handleViewApplication = (application) => {
    setCurrentApplication(application);
    setAdminNotes(application.admin_notes || '');
    setShowModal(true);
  };

  const handleReviewAction = async (status) => {
    try {
      const { data, error } = await supabase.rpc('review_job_application', {
        p_application_id: currentApplication.id,
        p_status: status,
        p_notes: adminNotes
      });

      if (error) throw error;

      const canonical = normalizeStatus(status);
      toast.success(`Application marked as ${STATUS_LABEL[canonical]}`);
      setShowModal(false);
      
      // Update the local state
      setApplications(applications.map(app => 
        app.id === currentApplication.id 
          ? { ...app, status: canonical, admin_notes: adminNotes } 
          : app
      ));
    } catch (error) {
      logger.error(`Error ${status} application:`, error);
      toast.error(`Failed to ${status} application`);
    }
  };

  const StatusBadge = ({ status }) => {
    const canonical = normalizeStatus(status);
    let icon = <ClockIcon className="h-4 w-4 mr-1" />;
    if (canonical === 'rejected') {
      icon = <XCircleIcon className="h-4 w-4 mr-1" />;
    } else if (canonical === 'offered' || canonical === 'hired' || canonical === 'shortlisted') {
      icon = <CheckCircleIcon className="h-4 w-4 mr-1" />;
    } else if (canonical === 'under_review') {
      icon = <EyeIcon className="h-4 w-4 mr-1" />;
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${STATUS_BADGE_CLASS[canonical]}`}>
        {icon}
        {STATUS_LABEL[canonical]}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Job Application Review</h1>
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            onClick={() => setStatusFilter('submitted')}
            className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
              statusFilter === 'submitted' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Pending
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('under_review')}
            className={`px-4 py-2 text-sm font-medium ${
              statusFilter === 'under_review' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Under Review
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('shortlisted')}
            className={`px-4 py-2 text-sm font-medium ${
              statusFilter === 'shortlisted' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Approved
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('rejected')}
            className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
              statusFilter === 'rejected' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Rejected
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">No {statusFilter} applications found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applicant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applied On
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {applications.map((application) => (
                <tr key={application.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{application.applicant_name}</div>
                        <div className="text-sm text-gray-500">{application.applicant_email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{application.job_title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{application.company}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(application.created_at)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={application.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleViewApplication(application)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Application Review Modal */}
      {showModal && currentApplication && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-xl font-semibold">Application Review</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-lg font-semibold mb-2">Applicant Information</h4>
                <p className="mb-2"><span className="font-medium">Name:</span> {currentApplication.applicant_name}</p>
                <p className="mb-2"><span className="font-medium">Email:</span> {currentApplication.applicant_email}</p>
                <p className="mb-2">
                  <span className="font-medium">Status:</span> 
                  <StatusBadge status={currentApplication.status} />
                </p>
                <p className="mb-2"><span className="font-medium">Applied On:</span> {formatDate(currentApplication.created_at)}</p>
                {currentApplication.reviewed_at && (
                  <p className="mb-2">
                    <span className="font-medium">Reviewed On:</span> {formatDate(currentApplication.reviewed_at)}
                    {currentApplication.reviewer_name && ` by ${currentApplication.reviewer_name}`}
                  </p>
                )}
              </div>
              
              <div>
                <h4 className="text-lg font-semibold mb-2">Job Information</h4>
                <p className="mb-2"><span className="font-medium">Position:</span> {currentApplication.job_title}</p>
                <p className="mb-2"><span className="font-medium">Company:</span> {currentApplication.company}</p>
              </div>
            </div>
            
            <div className="mt-4">
              <h4 className="text-lg font-semibold mb-2">Cover Letter</h4>
              <div className="p-3 bg-gray-50 rounded-lg text-sm whitespace-pre-wrap">
                {currentApplication.cover_letter || 'No cover letter provided.'}
              </div>
            </div>
            
            {currentApplication.resume_url && (
              <div className="mt-4">
                <h4 className="text-lg font-semibold mb-2">Resume</h4>
                <a 
                  href={currentApplication.resume_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  View Resume
                </a>
              </div>
            )}
            
            <div className="mt-4">
              <h4 className="text-lg font-semibold mb-2">Admin Notes</h4>
              <textarea
                className="w-full p-2 border rounded-md"
                rows="3"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this application (optional)"
              ></textarea>
            </div>
            
            {['submitted','under_review'].includes(normalizeStatus(currentApplication.status)) ? (
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => handleReviewAction('under_review')}
                  className="px-4 py-2 bg-yellow-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  Mark Under Review
                </button>
                <button
                  onClick={() => handleReviewAction('shortlisted')}
                  className="px-4 py-2 bg-green-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReviewAction('rejected')}
                  className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Reject
                </button>
              </div>
            ) : (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default JobApplicationReview;
