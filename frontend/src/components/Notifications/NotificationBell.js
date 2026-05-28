/**
 * @deprecated This component is deprecated. Use Bell.tsx or Bell.jsx instead.
 * 
 * This legacy component:
 * - Uses direct table access instead of bell_notifications view
 * - Uses deprecated get_unread_notifications_count_by_type RPC
 * - Uses legacy onPostgresChangesOnce realtime helper
 * 
 * Migration: Import Bell from './Bell' instead of NotificationBell
 */
import React, { useState, useEffect, useRef } from 'react';
import { supabase, onPostgresChangesOnce } from '../../utils/supabase';
import { NOTIF_ID_FIELD, notifScopeFilter } from '../../utils/notifications';
import logger from '../../utils/logger';
import { BellIcon, EnvelopeIcon, UserIcon, CalendarIcon, BriefcaseIcon, ChatBubbleLeftRightIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

// eslint-disable-next-line no-console
console.warn('NotificationBell.js is deprecated. Use Bell.tsx or Bell.jsx instead.');

const NotificationBell = ({ currentUser }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  
  // Icons mapping for each notification type
  const typeIcons = {
    profile: UserIcon,
    connections: UserGroupIcon,
    messaging: EnvelopeIcon,
    events: CalendarIcon,
    jobs: BriefcaseIcon,
    chat: ChatBubbleLeftRightIcon,
    default: BellIcon
  };

  // Handle notification count updates and fetch initial count
  useEffect(() => {
    if (!currentUser?.id) return;

    const fetchUnreadCount = async () => {
      try {
        const { data, error } = await supabase
          .rpc('get_unread_notifications_count_by_type', { type_filter: '' });

        if (error) throw error;
        setUnreadCount(data || 0);
      } catch (err) {
        logger.error('Error fetching notification count:', err);
      }
    };

    fetchUnreadCount();
  }, [currentUser?.id]);

  // Set up realtime notifications (idempotent listener attach)
  useEffect(() => {
    if (!currentUser?.id) return;

    const channelName = `notifications:${currentUser.id}`;

    const handleNewNotification = (payload) => {
      if (payload.new) {
        logger.log('New notification received:', payload.new.id);
        setUnreadCount(prev => prev + 1);
        toast(payload.new.title || 'New notification', {
          icon: '🔔',
          duration: 4000
        });
        if (showDropdown) {
          fetchNotifications();
        }
      }
    };

    // Set up the change listener - this is idempotent
    const changes = {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `${NOTIF_ID_FIELD}=eq.${currentUser.id}`
    };
    
    // Attach listener exactly once per user-specific key
    onPostgresChangesOnce(
      channelName,
      `insert:public:notifications:recipient=${currentUser.id}`,
      changes,
      handleNewNotification
    );

    // Nothing to clean up - our global registry handles this now
  }, [currentUser?.id]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (showDropdown && currentUser?.id) {
      fetchNotifications();
    }
  }, [showDropdown, currentUser?.id]);

  // Handle clicks outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch notifications when dropdown is opened
  const fetchNotifications = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(notifScopeFilter(currentUser.id))
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      logger.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDropdown = () => {
    const newState = !showDropdown;
    setShowDropdown(newState);
    if (newState) {
      fetchNotifications();
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId
      });

      if (error) throw error;
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      logger.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!currentUser || notifications.length === 0) return;

    try {
      const { error } = await supabase.rpc('mark_all_notifications_read');

      if (error) throw error;
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (err) {
      logger.error('Error marking all notifications as read:', err);
      toast.error('Failed to mark notifications as read');
    }
  };

  const formatNotificationDate = (date) => {
    try {
      const today = new Date().toDateString();
      const notifDate = new Date(date).toDateString();
      
      if (today === notifDate) {
        return formatDistanceToNow(new Date(date), { addSuffix: true });
      } else {
        return format(new Date(date), 'MMM dd, yyyy');
      }
    } catch (err) {
      logger.error('Date formatting error:', err);
      return 'Unknown date';
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read if it's not already
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    setShowDropdown(false);
  };

  // Helper function to get icon for notification type
  const getIconForType = (type) => {
    const IconComponent = typeIcons[type] || typeIcons.default;
    return <IconComponent className="h-4 w-4" />;
  };

  // Safely parse metadata payload which may be JSON or object
  const parseMetadata = (metadata) => {
    if (!metadata) return null;
    if (typeof metadata === 'object') return metadata;
    try {
      return JSON.parse(metadata);
    } catch {
      return null;
    }
  };

  // Compute a destination link for specific types if link is not set
  const deriveLink = (notification) => {
    if (!notification) return null;
    const { type, metadata } = notification;
    const meta = parseMetadata(metadata);
    if (type === 'mentorship_request' && meta) {
      if (meta.status === 'accepted') {
        // Navigate to mentorship hub with highlight on the relationship
        // The relationship_id should be in metadata after accept
        if (meta.relationship_id) {
          return `/mentorship?tab=mentee&highlightRelationshipId=${meta.relationship_id}`;
        }
        // Fallback: go to My Mentors tab
        return '/mentorship?tab=mentee';
      }
      if (meta.status === 'rejected') {
        return '/mentorship?tab=requests&sub=sent';
      }
      // Pending request - go to sent requests
      if (meta.status === 'pending') {
        return '/mentorship?tab=requests&sub=sent';
      }
    }
    return null;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center">
        {/* Main notification button with bell icon */}
        <button
          onClick={toggleDropdown}
          className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
          aria-label="Notifications"
        >
          <BellIcon className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications Dropdown */}
      {showDropdown && (
        <div className="fixed inset-x-0 top-16 px-3 z-50 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:px-0">
          <div className="ml-auto w-full max-w-md sm:max-w-none sm:w-80 bg-white rounded-md shadow-lg max-h-[70vh] sm:max-h-96 overflow-auto">
            <div className="p-3 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-xs text-ocean-600 hover:text-ocean-800"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="overflow-y-auto max-h-72">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-ocean-500 mx-auto"></div>
                </div>
              ) : notifications.length > 0 ? (
                <div>
                  {notifications.map((notification) => (
                    <Link 
                      key={notification.id} 
                      to={notification.link || deriveLink(notification) || '#'} 
                      className="block"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className={`p-3 border-b hover:bg-gray-50 ${!notification.is_read ? 'bg-blue-50' : ''}`}>
                        <div className="flex justify-between items-start">
                          <p className="font-medium text-sm text-gray-800">{notification.title}</p>
                          <span className="text-xs text-gray-500">
                            {formatNotificationDate(notification.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  No notifications found
                </div>
              )}
            </div>
            
            <div className="p-2 border-t border-gray-200 bg-gray-50">
              <Link 
                to="/notifications" 
                className="block w-full text-center text-sm text-ocean-600 hover:text-ocean-800 py-1"
                onClick={() => setShowDropdown(false)}
              >
                View all notifications
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
