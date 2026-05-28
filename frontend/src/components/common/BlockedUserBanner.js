import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

/**
 * BlockedUserBanner - Shows a persistent banner for blocked users
 * Displays at the top of the page when user is blocked
 */
const BlockedUserBanner = () => {
  const { isBlocked, blockedReason } = useAuth();

  if (!isBlocked) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap">
          <div className="flex items-center flex-1 min-w-0">
            <span className="flex p-2 rounded-lg bg-red-800">
              <ExclamationTriangleIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </span>
            <div className="ml-3 font-medium truncate">
              <p className="text-sm sm:text-base">
                <span className="font-bold">Your account has been restricted.</span>
                {' '}You can view your past activity but cannot perform new actions.
              </p>
              {blockedReason && (
                <p className="text-xs sm:text-sm opacity-90 mt-1">
                  Reason: {blockedReason}
                </p>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 mt-2 sm:mt-0 sm:ml-4">
            <a
              href="mailto:support@ametalumni.in?subject=Account%20Appeal"
              className="inline-flex items-center px-4 py-2 border border-white rounded-md text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-600 focus:ring-white transition-colors"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockedUserBanner;
