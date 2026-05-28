import { supabase, onPostgresChangesOnce } from '../utils/supabase';

// Allowed types per spec
// Keep this in sync with public.notifications chk_notifications_type and
// any module-specific notification types we actually emit from the backend.
export const ALLOWED_TYPES = new Set([
  'system', 'connection', 'message',
  'event', 'event_created', 'event_published', 'event_updated',
  'job', 'job_posted', 'job_approved', 'job_applied',
  'application', 'application_status',
  'mentorship',
  // Groups
  'group', 'group_join_request', 'group_membership_approved', 'group_membership_rejected', 'group_admin_risk',
  'alert',
]);

// ---------------------------------------------------------------------------
// SECURITY HELPERS: LINK SANITIZATION & DERIVATION (JS VERSION)
// ---------------------------------------------------------------------------

// Sanitizes notification links to prevent open redirects
// Only allows internal app routes (starting with /)
export function sanitizeNotificationLink(link) {
  if (!link) return null;
  if (typeof link !== 'string') return null;

  // Must start with a single leading slash
  if (!link.startsWith('/')) return null;

  // Block protocol-relative URLs (//example.com)
  if (link.startsWith('//')) return null;

  // Block suspicious patterns
  if (link.includes(' ') || link.length > 500) return null;

  return link;
}

// Derives a safe internal link from notification metadata
// Used as fallback when link field is not set
export function deriveNotificationLink(notification) {
  if (!notification) return null;
  const { type, metadata } = notification;
  if (!metadata || typeof metadata !== 'object') return null;

  // Mentorship-specific routing
  if (type === 'mentorship' && metadata.status) {
    if (metadata.status === 'accepted' && metadata.relationship_id) {
      return `/mentorship?tab=mentee&highlightRelationshipId=${metadata.relationship_id}`;
    }
    if (metadata.status === 'rejected' || metadata.status === 'pending') {
      return '/mentorship?tab=requests&sub=sent';
    }
  }

  // Group-related routing
  if (type && (type === 'group' || type.startsWith('group_'))) {
    // If group_id is in metadata, link to that group
    if (metadata.group_id) {
      // For admin-related notifications, link to manage page
      if (type === 'group_join_request' || type === 'group_admin_risk') {
        return `/groups/${metadata.group_id}/manage`;
      }
      return `/groups/${metadata.group_id}`;
    }
    // Fallback to groups list
    return '/groups';
  }

  // Entity-based routing
  if (metadata.entity_type && metadata.entity_id) {
    switch (metadata.entity_type) {
      case 'job':
        return `/jobs/${metadata.entity_id}`;
      case 'event':
        return `/events/${metadata.entity_id}`;
      case 'application':
        return `/applications/${metadata.entity_id}`;
      case 'connection':
        return '/network';
      case 'group':
        return `/groups/${metadata.entity_id}`;
      default:
        return null;
    }
  }

  return null;
}

// Gets the final safe link for a notification
// Prioritizes sanitized link field, then derived link, then fallback
export function getNotificationLink(notification) {
  if (!notification) return '#';

  const sanitized = sanitizeNotificationLink(notification.link);
  if (sanitized) return sanitized;

  const derived = deriveNotificationLink(notification);
  if (derived) return derived;

  return '#';
}

export async function fetchNotifications({ limit = 30, cursor } = {}) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) throw new Error('Not authenticated');

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', user.id)
    .order('is_read', { ascending: true })
    .order('created_at', { descending: true })
    .limit(limit);

  if (cursor) query = query.lt('created_at', cursor);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).filter(n => ALLOWED_TYPES.has(n.type));
}

export async function markOneRead(id) {
  const { error } = await supabase.rpc('mark_notification_read', {
    p_notification_id: id
  });
  if (error) throw error;
}

export async function markOneUnread(id) {
  // Uses mark_notification_unread RPC for consistency with other notification flows
  const { error } = await supabase.rpc('mark_notification_unread', {
    p_notification_id: id
  });
  if (error) throw error;
}

export async function markAllRead() {
  const { error } = await supabase.rpc('mark_all_notifications_read');
  if (error) throw error;
}

export function subscribeMyNotifications(userId, onChange) {
  return onPostgresChangesOnce(
    `notifications:${userId}`,
    `*:public:notifications:recipient_id=eq.${userId}`,
    { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
    onChange
  );
}
