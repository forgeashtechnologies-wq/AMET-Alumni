/**
 * Notifications Page Component
 * 
 * This component has been updated to use the canonical notification system:
 * - Uses useNotifications hook (which calls get_notifications_paginated RPC)
 * - Uses useConnectionsPanel hook for connection requests
 * - Respects notification preferences via bell_notifications view
 * 
 * Note: For the bell dropdown, use Bell.tsx or Bell.jsx instead.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import NotificationItem from './NotificationItem';
import { useNotifications } from '../../hooks/useNotifications';
import { 
  AcademicCapIcon, 
  UserIcon, 
  UserGroupIcon, 
  EnvelopeIcon, 
  CalendarIcon, 
  BriefcaseIcon, 
  ChatBubbleLeftRightIcon,
  BellIcon,
  FunnelIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import Avatar from '../common/Avatar';
import { useAvatars } from '../../hooks/useAvatar';
import useConnectionsPanel from '../../hooks/useConnectionsPanel';

const Notifications = () => {
  const { user, profile } = useAuth();
  const currentUser = profile || user;
  
  // Unified notifications hook (RPC + React Query)
  const {
    items: notifications,
    isLoading: notificationsLoading,
    isFetching: notificationsFetching,
    error: notificationsError,
    filterTab,
    setFilterTab,
    loadMore,
    markOne,
    markAll,
  } = useNotifications();

  // Shared connections panel hook (fetches received/sent/accepted + uses RPCs where needed)
  const {
    loading: connectionRequestsLoading,
    lists: connectionLists,
    actions: connectionActions,
  } = useConnectionsPanel(currentUser?.id);

  const incomingRequests = connectionLists?.received || [];
  const outgoingRequests = connectionLists?.sent || [];

  // Fetch avatars for connection requests
  const requestUserIds = [
    ...incomingRequests.map(req => req.id).filter(Boolean),
    ...outgoingRequests.map(req => req.id).filter(Boolean)
  ];
  const { avatarUrls } = useAvatars(requestUserIds, {
    useSignedUrls: true,
    autoFetch: requestUserIds.length > 0,
  });

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>
      
      {/* Connection Requests Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Connection Requests</h2>
        
        {connectionRequestsLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-ocean-500 mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {incomingRequests.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-3">Incoming Requests</h3>
                <div className="bg-white rounded-lg shadow divide-y">
                  {incomingRequests.map(req => (
                    <div key={req.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center mb-3 md:mb-0">
                        <div className="flex-shrink-0">
                          <div className="h-12 w-12 rounded-full overflow-hidden">
                            <Avatar src={avatarUrls[req.id] || req.avatar_url || null} alt={req.full_name} size={48} />
                          </div>
                        </div>
                        <div className="ml-4">
                          <Link to={`/profile/${req.id}`} className="text-lg font-medium text-gray-900 hover:text-ocean-600">
                            {req.full_name}
                          </Link>
                          <p className="text-sm text-gray-500">
                            {req.current_job_title} {req.company_name ? `at ${req.company_name}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2 mt-3 md:mt-0">
                        <button 
                          onClick={() => connectionActions.accept(req.id)}
                          className="px-4 py-2 bg-ocean-500 text-white rounded hover:bg-ocean-600 text-sm font-medium"
                        >
                          Accept
                        </button>
                        <button 
                          onClick={() => connectionActions.reject(req.id)}
                          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm font-medium"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {outgoingRequests.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3">Sent Requests</h3>
                <div className="bg-white rounded-lg shadow divide-y">
                  {outgoingRequests.map(req => (
                    <div key={req.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center mb-3 md:mb-0">
                        <div className="flex-shrink-0">
                          <div className="h-12 w-12 rounded-full overflow-hidden">
                            <Avatar src={avatarUrls[req.id] || req.avatar_url || null} alt={req.full_name} size={48} />
                          </div>
                        </div>
                        <div className="ml-4">
                          <Link to={`/profile/${req.id}`} className="text-lg font-medium text-gray-900 hover:text-ocean-600">
                            {req.full_name}
                          </Link>
                          <p className="text-sm text-gray-500">
                            {req.current_job_title} {req.company_name ? `at ${req.company_name}` : ''}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">Sent {format(new Date(req._edge?.created_at || req.created_at), 'MMM dd, yyyy')}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => connectionActions.cancel(req.id)}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm font-medium"
                      >
                        Cancel Request
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {(incomingRequests.length === 0 && outgoingRequests.length === 0) && (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <p className="text-gray-500">No pending connection requests</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Notifications Section */}
      <div className="mt-10">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3 sm:gap-4">
          <h2 className="text-xl font-semibold">All Notifications</h2>
          <button 
            onClick={markAll}
            disabled={notificationsLoading || notificationsFetching || !notifications.length}
            className="text-sm text-ocean-600 hover:text-ocean-800 disabled:opacity-50 disabled:cursor-not-allowed order-last md:order-none"
          >
            Mark all as read
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Tabs */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-4 border-b bg-gray-50">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 text-sm rounded-md ${
                  filterTab === 'all' ? 'bg-ocean-500 text-white' : 'bg-white hover:bg-gray-100'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterTab('unread')}
                className={`px-3 py-1.5 text-sm rounded-md ${
                  filterTab === 'unread' ? 'bg-ocean-500 text-white' : 'bg-white hover:bg-gray-100'
                }`}
              >
                Unread
              </button>
              <button
                onClick={() => setFilterTab('read')}
                className={`px-3 py-1.5 text-sm rounded-md ${
                  filterTab === 'read' ? 'bg-ocean-500 text-white' : 'bg-white hover:bg-gray-100'
                }`}
              >
                Read
              </button>
            </div>
          </div>
          
          {notificationsError && (
            <div className="px-4 py-3 text-sm text-red-600 border-b">
              Failed to load notifications.
            </div>
          )}
          
          {notificationsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-ocean-500 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading...</p>
            </div>
          ) : notifications.length > 0 ? (
            <>
              <ul className="divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <li key={notification.id} className="p-2">
                    <NotificationItem n={notification} onToggleRead={markOne} />
                  </li>
                ))}
              </ul>
              <div className="p-3 border-t text-center">
                <button
                  onClick={loadMore}
                  className="inline-flex items-center px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50"
                >
                  Load more
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications</h3>
              <p className="mt-1 text-sm text-gray-500">You're all caught up!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
