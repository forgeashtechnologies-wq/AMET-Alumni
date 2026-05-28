import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { iconForType } from './NotificationIcons';
import { getNotificationLink, type Notification } from '../../api/notifications';

const labelForType = (type?: string): string => {
  const t = (type || '').toLowerCase();

  if (['connection', 'connection_request'].includes(t)) return 'Connections';
  if (['message', 'chat_message'].includes(t)) return 'Messages';
  if (['job', 'job_posted', 'job_approved', 'job_applied'].includes(t)) return 'Jobs';
  if (['application', 'application_status'].includes(t)) return 'Applications';
  if (t === 'mentorship') return 'Mentorship';
  if (t.startsWith('event')) return 'Events';
  if (t === 'group' || t.startsWith('group_')) return 'Groups';
  if (['alert'].includes(t)) return 'Alerts';
  if (t === 'system') return 'System';

  return 'Notification';
};

type Props = { n: Notification; onToggleRead?: (id: string, toRead?: boolean) => void; onNavigate?: () => void };

export default function NotificationItem({ n, onToggleRead, onNavigate }: Props) {
  const navigate = useNavigate();
  const Icon = iconForType(n.type, n.metadata || undefined);
  const unread = !n.is_read;
  const title = n.title || 'New activity';
  const message = n.message || '';
  
  // Use secure link getter (sanitizes and derives safe links)
  const safeLink = getNotificationLink(n);
  
  const open = () => {
    // When opening an unread notification from the list, mark it as read
    if (onToggleRead && !n.is_read) {
      onToggleRead(n.id, true);
    }

    if (safeLink && safeLink !== '#') {
      navigate(safeLink);
      if (onNavigate) onNavigate();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => e.key === 'Enter' && open()}
      className={`group flex items-start gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${unread ? 'bg-ocean-50' : 'hover:bg-gray-50'}`}
      aria-label={title}
    >
      <div className="mt-1">
        <Icon className="w-5 h-5 text-gray-600" />
      </div>
      <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-0.5">
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-slate-50 text-slate-500">
              {labelForType(n.type)}
            </span>
          </div>
          <p
            className={`text-sm ${unread ? 'font-semibold text-gray-900' : 'text-gray-800'} break-words`}
          >
            {title}
          </p>
          {message && (
            <p className="mt-0.5 text-xs text-gray-600 break-words">{message}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-xs text-gray-500">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
          <div className="flex items-center gap-1">
            {unread && <span className="w-1.5 h-1.5 rounded-full bg-ocean-500" aria-hidden />}
            {onToggleRead && (
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full p-1 text-gray-400 hover:text-ocean-600 hover:bg-ocean-50 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleRead(n.id, !n.is_read);
                }}
                aria-label={n.is_read ? 'Mark as unread' : 'Mark as read'}
                title={n.is_read ? 'Mark as unread' : 'Mark as read'}
              >
                <CheckCircleIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
