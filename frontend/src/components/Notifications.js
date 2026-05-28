import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { BellIcon, CalendarIcon, ChatBubbleLeftRightIcon, BriefcaseIcon } from '@heroicons/react/24/outline';

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotifications(data || []);
    } catch (error) {
      logger.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_message':
        return <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-500" />;
      case 'event_reminder':
        return <CalendarIcon className="h-6 w-6 text-red-500" />;
      case 'job_alert':
        return <BriefcaseIcon className="h-6 w-6 text-green-500" />;
      default:
        return <BellIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Notifications</h1>
      {loading ? (
        <p>Loading notifications...</p>
      ) : notifications.length > 0 ? (
        <ul className="space-y-4">
          {notifications.map((notification) => (
            <li key={notification.id} className="p-4 bg-white rounded-lg shadow-md flex items-start space-x-4">
              <div className="flex-shrink-0">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-grow">
                <p className="text-gray-800">{notification.message}</p>
                <Link to={notification.link_to} className="text-sm text-blue-600 hover:underline">
                  View Details
                </Link>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(notification.created_at).toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>You have no new notifications.</p>
      )}
    </div>
  );
};

export default Notifications;
