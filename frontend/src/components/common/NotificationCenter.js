import React, { createContext, useContext, useState } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  XCircleIcon 
} from '@heroicons/react/24/outline';

// Create a context for notifications
const NotificationContext = createContext();

// Custom hook to use the notification context
export const useNotification = () => useContext(NotificationContext);

// Notification Provider component
export const NotificationProvider = ({ children }) => {
  // We can extend this state to track notifications history if needed
  const [notifications, setNotifications] = useState([]);

  // Function to show a success notification
  const showSuccess = (message, options = {}) => {
    const toastId = toast.custom((t) => (
      <div 
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
      >
        <div className="flex-1 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-6 w-6 text-green-400" aria-hidden="true" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">Success</p>
              <p className="mt-1 text-sm text-gray-500">{message}</p>
            </div>
          </div>
        </div>
        <div className="border-l border-gray-200">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-ocean-600 hover:text-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-500"
          >
            Close
          </button>
        </div>
      </div>
    ), { duration: options.duration || 3000, ...options });

    addToNotifications('success', message, toastId);
    return toastId;
  };

  // Function to show an error notification
  const showError = (message, options = {}) => {
    const toastId = toast.custom((t) => (
      <div 
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
      >
        <div className="flex-1 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <XCircleIcon className="h-6 w-6 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">Error</p>
              <p className="mt-1 text-sm text-gray-500">{message}</p>
            </div>
          </div>
        </div>
        <div className="border-l border-gray-200">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-ocean-600 hover:text-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-500"
          >
            Close
          </button>
        </div>
      </div>
    ), { duration: options.duration || 5000, ...options });

    addToNotifications('error', message, toastId);
    return toastId;
  };

  // Function to show a warning notification
  const showWarning = (message, options = {}) => {
    const toastId = toast.custom((t) => (
      <div 
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
      >
        <div className="flex-1 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" aria-hidden="true" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">Warning</p>
              <p className="mt-1 text-sm text-gray-500">{message}</p>
            </div>
          </div>
        </div>
        <div className="border-l border-gray-200">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-ocean-600 hover:text-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-500"
          >
            Close
          </button>
        </div>
      </div>
    ), { duration: options.duration || 4000, ...options });

    addToNotifications('warning', message, toastId);
    return toastId;
  };

  // Function to show an info notification
  const showInfo = (message, options = {}) => {
    const toastId = toast.custom((t) => (
      <div 
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
      >
        <div className="flex-1 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <InformationCircleIcon className="h-6 w-6 text-ocean-400" aria-hidden="true" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">Information</p>
              <p className="mt-1 text-sm text-gray-500">{message}</p>
            </div>
          </div>
        </div>
        <div className="border-l border-gray-200">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-ocean-600 hover:text-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-500"
          >
            Close
          </button>
        </div>
      </div>
    ), { duration: options.duration || 3000, ...options });

    addToNotifications('info', message, toastId);
    return toastId;
  };



  // Add notification to history
  const addToNotifications = (type, message, id) => {
    const newNotification = {
      id,
      type,
      message,
      timestamp: new Date()
    };
    
    setNotifications(prev => [newNotification, ...prev]);
  };

  // Function to dismiss a notification
  const dismiss = (id) => {
    toast.dismiss(id);
  };

  // Context value
  const value = {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    dismiss,
    notifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Toaster 
        position="top-right"
        toastOptions={{
          // Default options for all toasts
          className: '',
          duration: 4000,
          style: {
            background: '#fff',
            color: '#363636',
          },
        }}
      />
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
