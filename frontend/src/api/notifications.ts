/**
 * Unified Notifications API
 * Consolidates JS/TS implementations with security enhancements
 * Supports both user and admin notification flows
 */
import { supabase } from '../utils/supabase';

// ============================================================================
// CANONICAL NOTIFICATION TYPES
// ============================================================================

export const CANONICAL_NOTIFICATION_TYPES = [
  'system',
  'connection',
  'message',
  'event',
  'event_created',
  'event_published',
  'event_updated',
  'job',
  'job_posted',
  'job_approved',
  'job_applied',
  'application',
  'application_status',
  'mentorship',
  // Group / governance related
  'group',
  'group_join_request',
  'group_membership_approved',
  'group_membership_rejected',
  'group_admin_risk',
  'group_invite_received',
  'group_invite_accepted',
  'group_approved',
  'group_rejected',
  'group_deleted',
  'alert',
] as const;

export type NotificationType = typeof CANONICAL_NOTIFICATION_TYPES[number];

// For backward compatibility and runtime checks
export const ALLOWED_TYPES = new Set<string>(CANONICAL_NOTIFICATION_TYPES);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface NotificationMetadata {
  audience?: 'user' | 'admin';
  severity?: 'critical' | 'warning' | 'info';
  entity_id?: string;
  entity_type?: 'job' | 'event' | 'mentorship' | 'connection' | 'application' | 'group' | 'profile';
  action_required?: boolean;
  relationship_id?: string;
  status?: string;
  original_type?: string;
  group_id?: string; // For group-related notifications
  tab?: string;
  mentor_user_id?: string;
  [key: string]: any; // Allow additional fields
}

export interface Notification {
  id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  metadata?: NotificationMetadata | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface AdminNotification extends Notification {
  severity?: 'critical' | 'warning' | 'info';
  entity_type?: string;
  entity_id?: string;
  action_required?: boolean;
}

// View-backed type is the same shape exposed by bell_notifications
export type BellNotification = Notification;

// ============================================================================
// SECURITY: LINK SANITIZATION
// ============================================================================

/**
 * Sanitizes notification links to prevent open redirects
 * Only allows internal app routes (starting with /)
 */
export function sanitizeNotificationLink(link?: string | null): string | null {
  if (!link) return null;
  
  // Only allow internal paths
  if (!link.startsWith('/')) return null;
  
  // Block protocol-relative URLs (//example.com)
  if (link.startsWith('//')) return null;
  
  // Block suspicious patterns
  if (link.includes(' ') || link.length > 500) return null;
  
  return link;
}

/**
 * Derives a safe internal link from notification metadata
 * Used as fallback when link field is not set
 */
export function deriveNotificationLink(notification: Notification): string | null {
  const { type, metadata } = notification;
  
  if (!metadata) return null;
  
  // Mentorship-specific routing
  if (type === 'mentorship' || type?.startsWith('mentorship_')) {
    const originalType = metadata.original_type || type;
    
    // New request received by mentor -> go to Requests Received tab
    if (originalType === 'mentorship_request_created' && metadata.actor === 'mentee') {
      return '/mentorship?tab=requests&sub=received';
    }
    
    // Request accepted/rejected -> mentee goes to My Mentors or Sent Requests
    if (metadata.status === 'accepted' && metadata.relationship_id) {
      return `/mentorship?tab=mentee&highlightRelationshipId=${metadata.relationship_id}`;
    }
    if (metadata.status === 'rejected' || metadata.status === 'pending') {
      return '/mentorship?tab=requests&sub=sent';
    }
    
    // Confirmation for mentee that request was sent
    if (originalType === 'mentorship_request_confirmation') {
      return '/mentorship?tab=requests&sub=sent';
    }
    
    // Cancelled by user -> mentor sees this
    if (originalType === 'mentorship_request_cancelled_by_user') {
      return '/mentorship?tab=requests&sub=received';
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

  // Entity-based routing (type-safe where possible)
  if (metadata.entity_type && metadata.entity_id) {
    const id = String(metadata.entity_id);
    switch (metadata.entity_type) {
      case 'job':
        return `/jobs/${id}`;
      case 'event':
        return `/events/${id}`;
      case 'application':
        return `/applications/${id}`;
      case 'connection':
        return `/network`;
      case 'group':
        return `/groups/${id}`;
      case 'profile': {
        // Only allow UUID-looking IDs to prevent routing tricks
        const uuidPattern = /^[0-9a-fA-F-]{36}$/;
        if (uuidPattern.test(id)) {
          // Admin-only route for reviewing mentor profiles
          const tab = metadata.tab || 'mentorship';
          return `/admin/users/${id}?tab=${encodeURIComponent(tab)}`;
        }
        return null;
      }
      default:
        return null;
    }
  }
  
  return null;
}

/**
 * Gets the final safe link for a notification
 * Prioritizes sanitized link field, then derived link, then fallback
 */
export function getNotificationLink(notification: Notification): string {
  const sanitized = sanitizeNotificationLink(notification.link);
  if (sanitized) return sanitized;
  
  const derived = deriveNotificationLink(notification);
  if (derived) return derived;
  
  return '#'; // Safe fallback
}

// ============================================================================
// USER NOTIFICATIONS API
// ============================================================================

export interface FetchNotificationsOptions {
  limit?: number;
  offset?: number;
  type?: NotificationType;
  unreadOnly?: boolean;
  readOnly?: boolean;
}

/**
 * Fetches user notifications via get_notifications_paginated RPC
 * Uses offset-based pagination (12 items per page, max 50 total)
 * RPC enforces recipient_id = auth.uid() and uses is_bell_visible index
 */
export async function fetchNotifications(options: FetchNotificationsOptions = {}) {
  const { limit = 12, offset = 0, unreadOnly, readOnly } = options;
  
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) throw new Error('Not authenticated');

  // Determine is_read filter: null = all, false = unread only, true = read only
  let p_is_read: boolean | null = null;
  if (unreadOnly) p_is_read = false;
  if (readOnly) p_is_read = true;

  // Call RPC with limit capped at 12 per spec and optional is_read filter
  const { data, error } = await supabase.rpc('get_notifications_paginated', {
    p_limit: Math.min(limit, 12),
    p_offset: offset,
    p_is_read
  });

  if (error) throw error;
  
  return (data || []) as BellNotification[];
}

/**
 * Marks a single notification as read via RPC
 * RPC enforces recipient_id = auth.uid() ownership check
 */
export async function markOneRead(id: string) {
  const { error } = await supabase.rpc('mark_notification_read', {
    p_notification_id: id
  });
  if (error) throw error;
}

/**
 * Marks a single notification as unread via RPC
 * RPC enforces recipient_id = auth.uid() ownership check
 */
export async function markOneUnread(id: string) {
  const { error } = await supabase.rpc('mark_notification_unread', {
    p_notification_id: id,
  });
  if (error) throw error;
}

/**
 * Marks all user notifications as read via RPC
 * RPC enforces recipient_id = auth.uid()
 */
export async function markAllRead() {
  const { error } = await supabase.rpc('mark_all_notifications_read');
  if (error) throw error;
}

/**
 * Gets unread notification count for current user via RPC
 * Uses get_unread_notification_count (new spec-compliant name)
 */
export async function getBellUnreadCount(): Promise<number> {
  const { data, error } = await supabase.rpc('get_unread_notification_count');
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching unread count:', error);
    return 0;
  }
  return data || 0;
}

/**
 * Subscribes to real-time notification changes for current user
 */
export function subscribeMyNotifications(
  userId: string,
  onChange: (payload: any) => void
) {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table: 'notifications', 
        filter: `recipient_id=eq.${userId}` 
      },
      onChange
    )
    .subscribe();
}

// ============================================================================
// ADMIN NOTIFICATIONS API
// ============================================================================

export interface FetchAdminNotificationsOptions {
  limit?: number;
  offset?: number;
  severity?: 'critical' | 'warning' | 'info';
  unreadOnly?: boolean;
}

/**
 * Fetches admin notifications from admin_bell_notifications view
 * Only accessible to admin/super_admin roles
 */
export async function fetchAdminNotifications(options: FetchAdminNotificationsOptions = {}) {
  const { limit = 12, offset = 0, severity, unreadOnly = false } = options;
  
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) throw new Error('Not authenticated');

  let query = supabase
    .from('admin_bell_notifications')
    .select('*')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (severity) {
    query = query.eq('severity', severity);
  }
  
  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  return (data || []) as AdminNotification[];
}

/**
 * Gets unread admin notification count for current admin user
 */
export async function getAdminUnreadCount(): Promise<number> {
  const { data, error } = await supabase.rpc('get_admin_unread_count');
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching admin unread count:', error);
    return 0;
  }
  return data || 0;
}

/**
 * Subscribes to real-time admin notification changes
 */
export function subscribeAdminNotifications(
  userId: string,
  onChange: (payload: any) => void
) {
  return supabase
    .channel(`admin-notifications:${userId}`)
    .on(
      'postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table: 'notifications', 
        filter: `recipient_id=eq.${userId}` 
      },
      (payload: any) => {
        // Only trigger for admin-audience notifications
        if (payload.new && (payload.new as any).metadata?.audience === 'admin') {
          onChange(payload);
        }
      }
    )
    .subscribe();
}
