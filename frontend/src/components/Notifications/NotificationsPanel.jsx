import React from 'react';
import dayjs from 'dayjs';
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import NotificationItem from './NotificationItem';
import { useNotifications } from '../../hooks/useNotifications';

function NotificationsLoading() {
  return (
    <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-2">
        <div className="spinner spinner-md" aria-hidden="true" />
        <span className="sr-only">Loading notifications...</span>
      </div>
    </div>
  );
}

const groupByTime = (items) => {
  const groups = { today: [], yesterday: [], earlier: [] };
  const startOfToday = dayjs().startOf('day');

  items.forEach((n) => {
    const createdDay = dayjs(n.created_at).startOf('day');
    const diffDays = startOfToday.diff(createdDay, 'day');
    if (diffDays === 0) groups.today.push(n);
    else if (diffDays === 1) groups.yesterday.push(n);
    else groups.earlier.push(n);
  });

  return groups;
};

export default function NotificationsPanel({ onClose }) {
  const {
    items,
    isLoading,
    isFetching,
    error,
    unreadCount,
    typeFilter,
    toggleType,
    loadMore,
    markOne,
    markAll,
    notificationTypes = [],
  } = useNotifications();

  const hasUnread = unreadCount > 0;
  const hasItems = items && items.length > 0;
  const groups = groupByTime(items || []);

  return (
    <div className="w-full sm:max-w-md bg-white shadow-xl rounded-t-2xl sm:rounded-lg overflow-hidden flex flex-col" role="dialog" aria-label="Notifications">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold text-gray-900">Notifications</h3>
        <div className="flex items-center gap-1">
          {hasUnread && (
            <button
              type="button"
              onClick={markAll}
              className="inline-flex items-center justify-center rounded-full p-1.5 text-gray-500 hover:text-ocean-600 hover:bg-ocean-50 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400"
              aria-label="Mark all as read"
              disabled={isLoading || isFetching}
            >
              <CheckCircleIcon className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            aria-label="Close notifications"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs removed: we always show all notifications now */}

      {notificationTypes.length > 0 && (
        <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/80 flex flex-wrap gap-2">
          {notificationTypes.map((type) => {
            const active = typeFilter?.has(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                className={`text-xs px-2.5 py-1 rounded-full border transition ${
                  active
                    ? 'bg-ocean-50 border-ocean-300 text-ocean-700 font-medium'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
                aria-pressed={active}
              >
                {type.replace(/_/g, ' ')}
              </button>
            );
          })}
        </div>
      )}

      <div className="max-h-[70vh] overflow-auto mt-2" role="list">
        {isLoading && !error && (
          <div className="p-3">
            <NotificationsLoading />
          </div>
        )}
        {error && (
          <div className="p-4 text-sm text-red-600">
            Failed to load notifications.{' '}
            <button
              type="button"
              onClick={loadMore}
              className="underline font-medium"
            >
              Retry
            </button>
          </div>
        )}
        {!isLoading && !error && !hasItems && (
          <div className="p-8 text-center text-sm text-gray-500">
            {typeFilter && typeFilter.size > 0
              ? 'No notifications match the selected filters.'
              : 'No notifications yet.'}
          </div>
        )}

        {!isLoading && !error && hasItems && (
          <>
            {['today','yesterday','earlier'].map((key) => {
              const groupItems = groups[key];
              if (!groupItems || groupItems.length === 0) return null;
              const label = key === 'today' ? 'Today' : key === 'yesterday' ? 'Yesterday' : 'Earlier';
              return (
                <div key={key} className="pb-2">
                  <div className="px-3 pt-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {label}
                  </div>
                  {groupItems.map((n) => (
                    <div key={n.id} role="listitem">
                      <NotificationItem n={n} onToggleRead={markOne} onNavigate={onClose} />
                    </div>
                  ))}
                </div>
              );
            })}

            {hasItems && (
              <div className="p-3 pt-1">
                <button
                  type="button"
                  onClick={loadMore}
                  className="w-full text-sm border rounded-md py-2 hover:bg-gray-50"
                >
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
