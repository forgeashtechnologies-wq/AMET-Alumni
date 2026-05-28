import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import Avatar from '../common/Avatar';
import { useAvatars } from '../../hooks/useAvatar';
import logger from '../../utils/logger';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getNotificationLink, 
  fetchNotifications as fetchNotificationsAPI,
  markOneRead as markOneReadAPI,
  markAllRead as markAllReadAPI,
  subscribeMyNotifications
} from '../../api/notifications.ts';

const NotificationsPage = () => {
  const { user: authUser, profile } = useAuth();
  const currentUser = profile || authUser;
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'unread', 'read'
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  // Track component mount state
  const isMountedRef = useRef(true);

  // Fetch avatars for connection requests
  const requestUserIds = [
    ...incomingRequests.map(req => req.requester?.id).filter(Boolean),
    ...outgoingRequests.map(req => req.recipient?.id).filter(Boolean)
  ];
  const { avatarUrls } = useAvatars(requestUserIds, {
    useSignedUrls: true,
    autoFetch: requestUserIds.length > 0,
  });

  const fetchNotifications = useCallback(async () => {
    if (!currentUser || !isMountedRef.current) return;

    setLoading(true);
    try {
      // Use the canonical paginated RPC via the TS API
      // This respects notification_preferences and RLS
      const data = await fetchNotificationsAPI({
        limit: 50,
        offset: 0,
        unreadOnly: activeTab === 'unread',
        readOnly: activeTab === 'read',
      });

      if (isMountedRef.current) {
        setNotifications(data || []);
      }
    } catch (err) {
      logger.error('Error fetching notifications:', err);
      toast.error('Failed to load notifications');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [currentUser, activeTab]);

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

  const handleNotificationsUpdate = useCallback((payload) => {
    if (!isMountedRef.current) return;
    logger.log('Realtime notification update:', payload);
    fetchNotifications();
  }, [fetchNotifications]);

  const handleConnectionsUpdate = useCallback((payload) => {
    if (!isMountedRef.current) return;
    logger.log('Realtime connection update:', payload);
    fetchConnectionRequests();
  }, [fetchConnectionRequests]);

  // Realtime subscription ref
  const notifSubRef = useRef(null);
  const connSubRef = useRef(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    
    isMountedRef.current = true;
    
    fetchNotifications();
    fetchConnectionRequests();
    
    // Use canonical TS realtime helper for notifications
    notifSubRef.current = subscribeMyNotifications(currentUser.id, handleNotificationsUpdate);
    
    // Subscribe to connections changes
    connSubRef.current = supabase
      .channel(`connections:${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'connections' },
        handleConnectionsUpdate
      )
      .subscribe();
    
    return () => {
      isMountedRef.current = false;
      if (notifSubRef.current) {
        supabase.removeChannel(notifSubRef.current);
      }
      if (connSubRef.current) {
        supabase.removeChannel(connSubRef.current);
      }
    };
  }, [currentUser?.id, fetchNotifications, fetchConnectionRequests, handleNotificationsUpdate, handleConnectionsUpdate]);



  const markAsRead = async (notificationId) => {
    try {
      // Use canonical TS API which calls the secure RPC
      await markOneReadAPI(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      logger.error('Error marking notification as read:', err);
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    if (!currentUser || notifications.length === 0) return;

    try {
      // Use canonical TS API which calls the secure RPC
      await markAllReadAPI();
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
      fetchNotifications();
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
      
      // Refresh connection requests
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
      
      // Refresh connection requests
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
    setActiveTab(tab);
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
          <button 
            onClick={markAllAsRead} 
            className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg border-2 border-ocean-600 text-ocean-600 hover:bg-ocean-600 hover:text-white text-sm transition-[colors,opacity,transform,shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
          >
            Mark all as read
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b">
            <button 
              onClick={() => handleTabChange('all')}
              className={`flex-1 py-3 px-4 text-center ${activeTab === 'all' ? 'bg-gray-100 border-b-2 border-ocean-500 font-medium' : 'hover:bg-gray-50'}`}
            >
              All
            </button>
            <button 
              onClick={() => handleTabChange('unread')}
              className={`flex-1 py-3 px-4 text-center ${activeTab === 'unread' ? 'bg-gray-100 border-b-2 border-ocean-500 font-medium' : 'hover:bg-gray-50'}`}
            >
              Unread
            </button>
            <button 
              onClick={() => handleTabChange('read')}
              className={`flex-1 py-3 px-4 text-center ${activeTab === 'read' ? 'bg-gray-100 border-b-2 border-ocean-500 font-medium' : 'hover:bg-gray-50'}`}
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
          ) : notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map(notification => (
                (() => {
                  const safeLink = getNotificationLink(notification);
                  return (
                    <Link 
                      key={notification.id}
                      to={safeLink}
                      className="block"
                      onClick={() => !notification.is_read && markAsRead(notification.id)}
                    >
                  <div className={`p-4 hover:bg-gray-50 ${!notification.is_read ? 'bg-ocean-50' : ''}`}>
                    <div className="flex justify-between">
                      <h3 className="font-medium text-gray-900">{notification.title}</h3>
                      <span className="text-sm text-gray-500">{formatDate(notification.created_at)}</span>
                    </div>
                    <p className="mt-1 text-gray-600">{notification.message}</p>
                  </div>
                    </Link>
                  );
                })()
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
