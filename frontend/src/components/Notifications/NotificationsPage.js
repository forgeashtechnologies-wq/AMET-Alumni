import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import Avatar from '../common/Avatar';
import { useAvatars } from '../../hooks/useAvatar';
import logger from '../../utils/logger';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications, useBellUnreadCount } from '../../hooks/useNotifications';
import NotificationItem from './NotificationItem';

const NotificationsPage = () => {
  const { user: authUser, profile } = useAuth();
  const currentUser = profile || authUser;
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const isMountedRef = useRef(true);

  // Use the unified notifications hook — provides pagination, realtime (shared singleton),
  // optimistic mark-read/unread, and load-more. This eliminates the duplicate realtime
  // subscription that existed when this page managed its own channel.
  const {
    items: notifications,
    isLoading: loading,
    isFetching,
    error: notifError,
    filterTab,
    setFilterTab,
    markOne,
    markAll,
    refetch,
  } = useNotifications();

  // Use the bell unread count hook for the accurate total (not page-derived count)
  const { count: totalUnreadCount } = useBellUnreadCount();

  // Fetch avatars for connection requests
  const requestUserIds = [
    ...incomingRequests.map(req => req.requester?.id).filter(Boolean),
    ...outgoingRequests.map(req => req.recipient?.id).filter(Boolean)
  ];
  const { avatarUrls } = useAvatars(requestUserIds, {
    useSignedUrls: true,
    autoFetch: requestUserIds.length > 0,
  });

  const fetchConnectionRequests = useCallback(async () => {
    if (!currentUser || !isMountedRef.current) return;

    setRequestsLoading(true);
    try {
      const { data: incoming, error: incomingError } = await supabase
        .from('connections')
        .select(`id, status, created_at, requester:requester_id(id, full_name, avatar_url, job_title, company)`)
        .eq('recipient_id', currentUser.id)
        .eq('status', 'pending');

      if (incomingError) throw incomingError;
      if (isMountedRef.current) {
        setIncomingRequests(incoming || []);
      }

      const { data: outgoing, error: outgoingError } = await supabase
        .from('connections')
        .select(`id, status, created_at, recipient:recipient_id(id, full_name, avatar_url, job_title, company)`)
        .eq('requester_id', currentUser.id)
        .eq('status', 'pending');

      if (outgoingError) throw outgoingError;
      if (isMountedRef.current) {
        setOutgoingRequests(outgoing || []);
      }

    } catch (error) {
      logger.error('Error fetching connection requests:', error);
      toast.error('Failed to load connection requests.');
    } finally {
      if (isMountedRef.current) {
        setRequestsLoading(false);
      }
    }
  }, [currentUser]);

  // Only subscribe to connections changes — notifications realtime is handled
  // by the useNotifications hook via the shared singleton channel.
  const connSubRef = useRef(null);

  useEffect(() => {
    if (!currentUser?.id) return;

    isMountedRef.current = true;
    fetchConnectionRequests();

    // Subscribe to connections changes only (notifications are handled by the hook)
    connSubRef.current = supabase
      .channel(`connections:${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'connections' },
        () => {
          if (isMountedRef.current) fetchConnectionRequests();
        }
      )
      .subscribe();

    return () => {
      isMountedRef.current = false;
      if (connSubRef.current) {
        supabase.removeChannel(connSubRef.current);
      }
    };
  }, [currentUser?.id, fetchConnectionRequests]);

  const markAllAsRead = async () => {
    try {
      await markAll();
      toast.success('All notifications marked as read');
    } catch (err) {
      logger.error('Error marking all notifications as read:', err);
      toast.error('Failed to mark notifications as read');
    }
  };

  const handleConnectionResponse = async (requestId, newStatus) => {
    try {
      const { error } = await supabase
        .from('connections')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) throw error;
      toast.success(`Request ${newStatus === 'accepted' ? 'accepted' : 'declined'}.`);

      fetchConnectionRequests();
    } catch (error) {
      logger.error('Error responding to request:', error);
      toast.error('Failed to update connection.');
    }
  };

  const handleCancelRequest = async (requestId) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Are you sure you want to cancel this connection request?')) return;

    try {
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', requestId);

      if (error) throw error;
      toast.success('Request cancelled.');

      fetchConnectionRequests();
    } catch (error) {
      logger.error('Error cancelling request:', error);
      toast.error('Failed to cancel request.');
    }
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (err) {
      return 'Unknown date';
    }
  };

  const handleTabChange = (tab) => {
    setFilterTab(tab);
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>

      {/* Connection Requests Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Connection Requests</h2>

        {requestsLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-ocean-500 mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Incoming Requests */}
            {incomingRequests.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-3">Incoming Requests</h3>
                <div className="bg-white rounded-lg shadow divide-y">
                  {incomingRequests.map(req => (
                    <div key={req.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center mb-3 md:mb-0">
                        <div className="flex-shrink-0 h-12 w-12 rounded-full overflow-hidden">
                          <Avatar src={avatarUrls[req.requester.id] || req.requester.avatar_url || null} alt={req.requester.full_name} size={48} />
                        </div>
                        <div className="ml-4">
                          <Link to={`/profile/${req.requester.id}`} className="text-lg font-medium text-gray-900 hover:text-ocean-600">
                            {req.requester.full_name}
                          </Link>
                          <p className="text-sm text-gray-500">
                            {req.requester.job_title} {req.requester.company ? `at ${req.requester.company}` : ''}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">Requested {formatDate(req.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleConnectionResponse(req.id, 'accepted')}
                          className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-gradient-to-b from-ocean-500 to-ocean-600 text-white text-sm font-medium hover:from-ocean-600 hover:to-ocean-700 transition-[colors,opacity,transform,shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleConnectionResponse(req.id, 'declined')}
                          className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-gradient-to-b from-red-500 to-red-600 text-white text-sm font-medium hover:from-red-600 hover:to-red-700 transition-[colors,opacity,transform,shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Outgoing Requests */}
            {outgoingRequests.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3">Sent Requests</h3>
                <div className="bg-white rounded-lg shadow divide-y">
                  {outgoingRequests.map(req => (
                    <div key={req.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center mb-3 md:mb-0">
                        <div className="flex-shrink-0 h-12 w-12 rounded-full overflow-hidden">
                          <Avatar src={avatarUrls[req.recipient.id] || req.recipient.avatar_url || null} alt={req.recipient.full_name} size={48} />
                        </div>
                        <div className="ml-4">
                          <Link to={`/profile/${req.recipient.id}`} className="text-lg font-medium text-gray-900 hover:text-ocean-600">
                            {req.recipient.full_name}
                          </Link>
                          <p className="text-sm text-gray-500">
                            {req.recipient.job_title} {req.recipient.company ? `at ${req.recipient.company}` : ''}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">Sent {formatDate(req.created_at)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancelRequest(req.id)}
                        className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 text-sm font-medium transition-[colors,opacity,transform,shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
                      >
                        Cancel Request
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <p className="text-gray-500">No pending connection requests</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notifications Section */}
      <div className="mt-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">All Notifications</h2>
          <div className="flex items-center gap-3">
            {totalUnreadCount > 0 && (
              <span className="text-sm text-gray-500">{totalUnreadCount} unread</span>
            )}
            <button
              onClick={markAllAsRead}
              disabled={loading || isFetching || notifications.length === 0}
              className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg border-2 border-ocean-600 text-ocean-600 hover:bg-ocean-600 hover:text-white text-sm transition-[colors,opacity,transform,shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Mark all as read
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => handleTabChange('all')}
              className={`flex-1 py-3 px-4 text-center ${filterTab === 'all' ? 'bg-gray-100 border-b-2 border-ocean-500 font-medium' : 'hover:bg-gray-50'}`}
            >
              All
            </button>
            <button
              onClick={() => handleTabChange('unread')}
              className={`flex-1 py-3 px-4 text-center ${filterTab === 'unread' ? 'bg-gray-100 border-b-2 border-ocean-500 font-medium' : 'hover:bg-gray-50'}`}
            >
              Unread
            </button>
            <button
              onClick={() => handleTabChange('read')}
              className={`flex-1 py-3 px-4 text-center ${filterTab === 'read' ? 'bg-gray-100 border-b-2 border-ocean-500 font-medium' : 'hover:bg-gray-50'}`}
            >
              Read
            </button>
          </div>

          {/* Notification List */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-ocean-500 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading notifications...</p>
            </div>
          ) : notifError ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-2">Failed to load notifications.</p>
              <button
                onClick={() => refetch()}
                className="text-sm text-ocean-600 hover:underline"
              >
                Retry
              </button>
            </div>
          ) : notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  n={notification}
                  onToggleRead={markOne}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No notifications found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
