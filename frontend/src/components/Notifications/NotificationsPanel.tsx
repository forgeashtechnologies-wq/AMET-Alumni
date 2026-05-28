import React from 'react';
import NotificationItem from './NotificationItem';
import { useNotifications } from '../../hooks/useNotifications';

const TYPES = ['system','connection','message','event','job','application','mentorship','group','alert'] as const;

type Props = { onClose?: () => void };

export default function NotificationsPanel({ onClose }: Props) {
  const {
    items,
    isLoading,
    error,
    loadMore,
    markOne,
    markAll,
  } = useNotifications({ unreadOnly: true });

  return (
    <div className="w-full max-w-md bg-white shadow-xl rounded-lg overflow-hidden flex flex-col" role="dialog" aria-label="Notifications">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold">Notifications</h3>
        <div className="flex items-center gap-2">
          <button className="text-sm text-ocean-600 hover:underline" onClick={markAll} aria-label="Mark all as read">Mark all as read</button>
          <button className="text-gray-500" onClick={onClose} aria-label="Close">✕</button>
        </div>
      </div>

      {/* Tabs removed: we always show a single flat list of notifications */}

      <div className="max-h-[70vh] overflow-auto divide-y mt-2" role="list">
        {isLoading && <div className="p-4 text-sm text-gray-500">Loading...</div>}
        {error && <div className="p-4 text-sm text-red-600">Failed to load</div>}
        {!isLoading && items.length === 0 && (
          <div className="p-8 text-center text-sm text-gray-500">No notifications</div>
        )}
        {items.map((n) => (
          <div key={n.id} role="listitem">
            <NotificationItem n={n} onToggleRead={markOne} />
          </div>
        ))}
        {items.length > 0 && (
          <div className="p-3">
            <button onClick={loadMore} className="w-full text-sm border rounded-md py-2 hover:bg-gray-50">Load more</button>
          </div>
        )}
      </div>
    </div>
  );
}
