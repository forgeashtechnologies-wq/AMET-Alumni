import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logger from '../../utils/logger';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { getRequestStatusUI } from '../../utils/mentorshipStatus';
import { ConfirmationDialog } from '../../components/shared';

/**
 * My Requests page - Requests I sent as a mentee
 * Data: v_my_mentorship_requests
 */
export default function MyRequestsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [cancellingId, setCancellingId] = useState(null);
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
        .from('v_my_mentorship_requests')
        .select('*')
        .eq('mentee_id', user.id)
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

  async function handleCancelRequest(requestId) {
    try {
      setCancellingId(requestId);
      const { error } = await supabase.rpc('mentorship_request_cancel', {
        p_request_id: requestId,
      });

      if (error) throw error;

      toast.success('Your request has been cancelled.');
      fetchRequests(); // Refresh list
    } catch (error) {
      logger.error('Error cancelling request:', error);
      toast.error('We could not cancel this request. Please try again.');
    } finally {
      setCancellingId(null);
    }
  }

  const filteredRequests = requests.filter((req) => {
    if (statusFilter === 'all') return true;
    return req.status === statusFilter;
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Requests I have sent</h2>
        <p className="mt-1 text-sm text-gray-600">
          Mentorship requests you have sent to mentors, grouped by status.
        </p>
        <p className="mt-1 text-sm font-medium text-gray-700">
          {requests.length} total · {pendingCount} pending
        </p>
      </div>

      {/* Filter Bar */}
      <div className="mb-6 flex flex-wrap gap-2">
        {['all', 'pending', 'accepted', 'rejected', 'cancelled_by_user'].map((status) => {
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
              {status === 'all' ? 'All' : status === 'cancelled_by_user' ? 'Cancelled' : status.charAt(0).toUpperCase() + status.slice(1)}{' '}
              ({count})
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {statusFilter === 'all'
                ? 'No mentorship requests yet'
                : `No ${statusFilter} requests`}
            </h3>
            <p className="text-gray-600 mb-4">
              {statusFilter === 'all'
                ? 'Browse mentors and send your first mentorship request to get started.'
                : `You do not have any ${statusFilter} requests.`}
            </p>
            {statusFilter === 'all' && (
              <button
                onClick={() => navigate('/mentorship/find')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Find mentors
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => {
            const statusUI = getRequestStatusUI(request.status);
            const isPending = request.status === 'pending';
            const isAccepted = request.status === 'accepted';

            return (
              <div
                key={request.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <img
                    src={request.mentor_avatar || '/default-avatar.svg'}
                    alt={`${request.mentor_full_name}'s profile picture`}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {request.mentor_full_name || 'Mentor'}
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

                    {/* Status Message */}
                    <p className="mt-2 text-sm text-gray-600">
                      {isPending && 'Waiting for your mentor to respond.'}
                      {isAccepted && 'Your mentor accepted. You can start chatting.'}
                      {request.status === 'rejected' && 'This mentor was not available.'}
                      {request.status === 'cancelled_by_user' && 'You cancelled this request.'}
                      {request.status === 'cancelled_by_system' && 'This request was auto-cancelled.'}
                    </p>

                    {/* Actions */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {isPending && (
                        <button
                          onClick={() => setConfirmDialog({
                            type: 'cancel-request',
                            requestId: request.id,
                            description: 'Are you sure you want to cancel this request?',
                          })}
                          disabled={cancellingId === request.id}
                          className="px-4 py-2 text-sm border border-red-300 text-red-700 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {cancellingId === request.id ? 'Cancelling…' : 'Cancel request'}
                        </button>
                      )}
                      {isAccepted && (
                        <button
                          onClick={() => navigate(`/messages?mentorId=${request.mentor_id}`)}
                          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                          Go to chat
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/mentorship/mentor/${request.mentor_id}`)}
                        className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        View mentor
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <ConfirmationDialog
        isOpen={confirmDialog?.type === 'cancel-request'}
        onClose={() => setConfirmDialog(null)}
        onConfirm={async () => {
          if (!confirmDialog?.requestId) return;
          const id = confirmDialog.requestId;
          setConfirmDialog(null);
          await handleCancelRequest(id);
        }}
        title="Cancel mentorship request"
        description={confirmDialog?.description || 'Are you sure you want to cancel this request?'}
        variant="warning"
      />
    </div>
  );
}
