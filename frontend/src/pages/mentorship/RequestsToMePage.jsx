import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logger from '../../utils/logger';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { getRequestStatusUI } from '../../utils/mentorshipStatus';
import { useMentorshipSummary } from '../../hooks/useMentorshipSummary';
import { ConfirmationDialog } from '../../components/shared';

/**
 * Requests to Me page - Mentor's inbox for incoming requests
 * Data: v_my_mentorship_dashboard
 */
export default function RequestsToMePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [actionLoading, setActionLoading] = useState(null);
  const [actionType, setActionType] = useState(null); // 'accept' or 'decline'
  const { hasMentorProfile, mentorProfileStatus, isApprovedMentor } = useMentorshipSummary();
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => {
    if (user?.id) {
      fetchRequests();
    }
  }, [user?.id]);

  async function fetchRequests() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('v_my_mentorship_dashboard')
        .select('*')
        .eq('mentor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      logger.error('Error fetching requests:', error);
      toast.error('We could not load your requests. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(requestId) {
    try {
      setActionLoading(requestId);
      setActionType('accept');
      // Backend contract: mentorship_request_respond(p_request_id uuid, p_new_status text)
      const { error } = await supabase.rpc('mentorship_request_respond', {
        p_request_id: requestId,
        p_new_status: 'accepted',
      });

      if (error) {
        // Check for capacity error
        if (error.message?.includes('capacity')) {
          toast.error('You have reached your mentee limit. End an existing mentorship or increase your capacity.');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Request accepted. You can now chat with your new mentee.');
      fetchRequests(); // Refresh list
    } catch (error) {
      logger.error('Error accepting request:', error);
      toast.error('We could not accept this request. Please try again.');
    } finally {
      setActionLoading(null);
      setActionType(null);
    }
  }

  function openDeclineDialog(requestId) {
    setConfirmDialog({
      type: 'decline',
      requestId,
      description: 'Are you sure you want to decline this request?',
    });
  }

  async function handleDecline(requestId) {
    try {
      setActionLoading(requestId);
      setActionType('decline');
      // Backend contract: mentorship_request_respond(p_request_id uuid, p_new_status text)
      const { error } = await supabase.rpc('mentorship_request_respond', {
        p_request_id: requestId,
        p_new_status: 'rejected',
      });

      if (error) throw error;

      toast.success('Request declined.');
      fetchRequests(); // Refresh list
    } catch (error) {
      logger.error('Error declining request:', error);
      toast.error('We could not decline this request. Please try again.');
    } finally {
      setActionLoading(null);
      setActionType(null);
    }
  }

  const filteredRequests = requests.filter((req) => {
    if (statusFilter === 'all') return true;
    return req.status === statusFilter;
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const acceptedCount = requests.filter((r) => r.status === 'accepted').length;

  // Non-mentor: show locked / educational state
  if (!loading && !hasMentorProfile) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Become a mentor to receive requests</h2>
          <p className="text-sm text-gray-600 mb-4">
            Once you create a mentor profile and it is approved, students and early-career members can request mentorship from you here.
          </p>
          <button
            onClick={() => navigate('/mentorship/become-mentor')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Become a mentor
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Requests I have received</h2>
        <p className="mt-1 text-sm text-gray-600">
          Requests from mentees asking you to be their mentor.
        </p>
        <p className="mt-1 text-sm font-medium text-gray-700">
          {pendingCount} pending
        </p>

        {mentorProfileStatus === 'pending' && (
          <p className="mt-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2">
            Your mentor profile is under review. You will start receiving requests once it is approved.
          </p>
        )}
        {mentorProfileStatus === 'rejected' && (
          <p className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            Your mentor profile is not currently live. Please update your details and resubmit it for approval.
          </p>
        )}
      </div>

      {/* Filter Bar */}
      <div className="mb-6 flex flex-wrap gap-2">
        {['pending', 'accepted', 'rejected', 'all'].map((status) => {
          const count = status === 'all' ? requests.length : requests.filter((r) => r.status === status).length;
          const isActive = statusFilter === status;
          
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="max-w-sm mx-auto">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {statusFilter === 'pending'
                ? 'No pending mentorship requests'
                : `No ${statusFilter} requests`}
            </h3>
            <p className="text-gray-600 mb-3">
              {statusFilter === 'pending'
                ? 'When mentees send you mentorship requests, they will appear here.'
                : `You do not have any ${statusFilter} requests.`}
            </p>
            {statusFilter === 'pending' && isApprovedMentor && acceptedCount > 0 && (
              <p className="text-xs text-gray-500">
                You have {acceptedCount} accepted mentee(s). View them in{' '}
                <button
                  type="button"
                  onClick={() => navigate('/mentorship/me')}
                  className="underline text-blue-600 hover:text-blue-800"
                >
                  My mentorships
                </button>
                .
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => {
            const statusUI = getRequestStatusUI(request.status);
            const isPending = request.status === 'pending';
            const isAccepted = request.status === 'accepted';
            const isLoading = actionLoading === request.id;

            return (
              <div
                key={request.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <img
                    src={request.mentee_avatar || '/default-avatar.svg'}
                    alt={`${request.mentee_full_name}'s profile picture`}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {request.mentee_full_name || 'Student'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Requested on {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Status Chip */}
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusUI.bgClass} ${statusUI.textClass} flex-shrink-0`}
                        aria-label={statusUI.ariaLabel}
                      >
                        <span aria-hidden="true">{statusUI.icon}</span>
                        {statusUI.text}
                      </span>
                    </div>

                    {/* Message/Goals */}
                    {request.message && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-700 line-clamp-3">
                          {request.message}
                        </p>
                      </div>
                    )}

                    {/* Status Message */}
                    <p className="mt-2 text-sm text-gray-600">
                      {isPending && 'Would you like to mentor this member?'}
                      {isAccepted && 'You have accepted this mentee. You can chat anytime.'}
                      {request.status === 'rejected' && 'You declined this request.'}
                    </p>

                    {/* Actions */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {isPending && (
                        <>
                          <button
                            onClick={() => handleAccept(request.id)}
                            disabled={isLoading}
                            className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isLoading && actionType === 'accept' ? 'Accepting...' : 'Accept'}
                          </button>
                          <button
                            onClick={() => setConfirmDialog({
                              type: 'decline',
                              requestId: request.id,
                              description: `Are you sure you want to decline ${request.mentee_full_name}'s request?`,
                            })}
                            disabled={isLoading}
                            className="px-4 py-2 text-sm border border-red-300 text-red-700 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isLoading && actionType === 'decline' ? 'Declining...' : 'Decline'}
                          </button>
                        </>
                      )}
                      {isAccepted && (
                        <button
                          onClick={() => navigate(`/messages?menteeId=${request.mentee_id}`)}
                          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                          Go to chat
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <ConfirmationDialog
        isOpen={confirmDialog?.type === 'decline'}
        onClose={() => setConfirmDialog(null)}
        onConfirm={async () => {
          if (!confirmDialog?.requestId) return;
          const id = confirmDialog.requestId;
          setConfirmDialog(null);
          await handleDecline(id);
        }}
        title="Decline mentorship request"
        description={confirmDialog?.description || 'Are you sure you want to decline this request?'}
        variant="warning"
      />
    </div>
  );
}
