import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { iconForType } from './NotificationIcons';
import { getNotificationLink } from '../../api/notifications';

const labelForType = (type) => {
  const t = (type || '').toLowerCase();

  if (['connection', 'connection_request'].includes(t)) return 'Connections';
  if (['message', 'chat_message'].includes(t)) return 'Messages';
  if (['job', 'job_posted', 'job_approved', 'job_applied'].includes(t)) return 'Jobs';
  if (['application', 'application_status'].includes(t)) return 'Applications';
  if (t === 'mentorship') return 'Mentorship';
  if (t.startsWith('event')) return 'Events';
  // Group-related notification types
  if (t === 'group' || t.startsWith('group_')) return 'Groups';
  if (['alert'].includes(t)) return 'Alerts';
  if (t === 'system') return 'System';

  return 'Notification';
};

export default function NotificationItem({ n, onToggleRead, onNavigate }) {
  const navigate = useNavigate();
  const Icon = iconForType(n.type, n.metadata || undefined);
  const unread = !n.is_read;
  const title = n.title || 'New activity';
  const message = n.message || '';
  const relativeTime = formatDistanceToNow(new Date(n.created_at), { addSuffix: true });

  // Use secure link getter (sanitizes and derives safe links)
  const safeLink = getNotificationLink(n);
  const hasActionableLink = safeLink && safeLink !== '#';
  const ctaText =
    n?.metadata?.cta_label &&
    n?.metadata?.cta_label.trim().length > 0
      ? n.metadata.cta_label
      : null;

  const handleOpen = () => {
    if (onToggleRead && unread) {
      onToggleRead(n.id, true);
    }
    if (hasActionableLink) {
      navigate(safeLink);
      if (onNavigate) onNavigate();
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOpen();
    }
  };

  return (
    <div
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      className={`w-full text-left rounded-xl border transition shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 cursor-pointer select-none ${
        unread ? 'bg-ocean-50/70 border-ocean-100 hover:border-ocean-200' : 'bg-white border-gray-100 hover:border-gray-200'
      }`}
      aria-label={`${labelForType(n.type)} notification: ${title}`}
    >
      <div className="flex items-start gap-3 px-3 py-2.5">
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500"
          aria-hidden="true"
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 bg-slate-100">
              {labelForType(n.type)}
            </span>
            <span className="text-xs text-gray-500" title={new Date(n.created_at).toLocaleString()}>
              {relativeTime}
            </span>
          </div>
          <p
            className={`mt-0.5 text-sm leading-snug break-words line-clamp-2 ${
              unread ? 'font-semibold text-gray-900' : 'text-gray-800'
            }`}
          >
            {title}
          </p>
          {message && (
            <p className="mt-0.5 text-xs text-gray-600 leading-relaxed break-words line-clamp-2">{message}</p>
          )}
          {hasActionableLink && ctaText && (
            <span className="sr-only">{ctaText}</span>
          )}
        </div>
        {onToggleRead && (
          <div className="flex flex-col items-center gap-1">
            {unread && <span className="h-1.5 w-1.5 rounded-full bg-ocean-500" aria-hidden="true" />}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleRead(n.id, !n.is_read);
              }}
              className="inline-flex items-center justify-center rounded-full p-1 text-gray-400 hover:text-ocean-600 hover:bg-ocean-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
              aria-label={n.is_read ? 'Mark notification as unread' : 'Mark notification as read'}
            >
              <CheckCircleIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
