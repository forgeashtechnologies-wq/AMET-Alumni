/**
 * Unified Notifications Hooks
 * Consolidates JS/TS implementations with React Query
 * Supports user and admin notification flows
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { supabase } from '../utils/supabase';
import { subscribeToNotifications } from '../utils/notificationRealtime.ts';
import logger from '../utils/logger';
import {
  fetchNotifications,
  fetchAdminNotifications,
  markAllRead,
  markOneRead,
  markOneUnread,
  getBellUnreadCount,
  getAdminUnreadCount,
  subscribeAdminNotifications,
  type BellNotification,
  type AdminNotification,
  type NotificationType,
} from '../api/notifications.ts';
import { useAuth } from '../contexts/AuthContext';

dayjs.extend(relativeTime);

export type NotificationFilterTab = 'all' | 'unread' | 'read';

// ============================================================================
// USER NOTIFICATIONS HOOK
// ============================================================================

export interface UseNotificationsOptions {
  type?: NotificationType;
  unreadOnly?: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { user } = useAuth() as any;
  const qc = useQueryClient();
  const [filterTab, setFilterTab] = useState<NotificationFilterTab>('all');
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [offset, setOffset] = useState<number>(0);

  // Always reset pagination when switching tabs (All / Unread / Read)
  // so that each tab starts from the newest page of notifications.
  useEffect(() => {
    setOffset(0);
  }, [filterTab]);

  // Query key includes options and filterTab so each tab (all/unread/read)
  // has its own cache entry and triggers a refetch when changed
  const key = useMemo(
    () => ['notifications', user?.id, { offset, filterTab, ...options }],
    [user?.id, offset, filterTab, options]
  );

  const query = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const rows = await fetchNotifications({
        limit: 12,
        offset,
        unreadOnly: filterTab === 'unread',
        readOnly: filterTab === 'read',
        ...options,
      });
      return rows as BellNotification[];
    },
    staleTime: 10_000, // Consider data fresh for 10s
  });

  const all = (query.data || []) as BellNotification[];

  // Server-side filtering by is_read is now handled in fetchNotifications via RPC
  // Only apply type filter in memory
  const items = useMemo(() => {
    if (!typeFilter || typeFilter.size === 0) return all;
    return all.filter((n) => typeFilter.has(n.type));
  }, [all, typeFilter]);

  const notificationTypes = useMemo(() => {
    const uniques = new Set<string>();
    all.forEach((n) => {
      if (n?.type) uniques.add(n.type);
    });
    return Array.from(uniques).sort();
  }, [all]);

  // unread count derived from all loaded
  const unreadCount = useMemo(() => all.filter((n) => !n.is_read).length, [all]);

  // realtime subscription
  useEffect(() => {
    if (!user?.id) return;
    return subscribeToNotifications(user.id, () => {
      qc.invalidateQueries({ queryKey: ['notifications', user.id] });
      qc.invalidateQueries({ queryKey: ['bell-unread-count', user.id] });
    });
  }, [user?.id, qc]);

  // pagination: load more (12 items per page, max 50 total)
  const loadMore = async () => {
    const current = all;
    if (current.length === 0) return;
    
    // Enforce 50-item cap per spec
    const newOffset = offset + 12;
    if (newOffset >= 50) {
      logger.info('Reached 50-item notification cap');
      return;
    }
    
    setOffset(newOffset);
  };

  const toggleType = (t: string) => {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const markOne = async (id: string, toRead = true) => {
    const queryKeyBase = ['notifications', user?.id];

    // Optimistic: update all cached notification queries immediately
    const cached = qc.getQueryCache().findAll({ queryKey: queryKeyBase });
    const prevStates: Array<[readonly unknown[], unknown]> = [];

    cached.forEach((q) => {
      const prev = qc.getQueryData<BellNotification[]>(q.queryKey);
      prevStates.push([q.queryKey, prev]);
      if (Array.isArray(prev)) {
        qc.setQueryData<BellNotification[]>(
          q.queryKey,
          prev.map((n) =>
            n.id === id
              ? {
                  ...n,
                  is_read: toRead,
                  read_at: toRead ? n.read_at || new Date().toISOString() : null,
                }
              : n
          )
        );
      }
    });

    try {
      if (toRead) {
        await markOneRead(id);
      } else {
        await markOneUnread(id);
      }
    } catch (error) {
      // Roll back optimistic changes on failure
      prevStates.forEach(([k, v]) => qc.setQueryData(k as any, v));
      logger.error('Error marking notification:', error);
      throw error;
    } finally {
      // Ensure refetch to align with server state
      await qc.invalidateQueries({ queryKey: queryKeyBase });
      await qc.invalidateQueries({ queryKey: ['bell-unread-count', user?.id] });
    }
  };

  const markAll = async () => {
    try {
      await markAllRead();
      await qc.invalidateQueries({ queryKey: ['notifications', user?.id] });
      await qc.invalidateQueries({ queryKey: ['bell-unread-count', user?.id] });
    } catch (error) {
      logger.error('Error marking all notifications:', error);
      throw error;
    }
  };

  return {
    items,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error as any,
    unreadCount,
    filterTab,
    setFilterTab,
    typeFilter,
    toggleType,
    loadMore,
    markOne,
    markAll,
    notificationTypes,
    refetch: query.refetch,
  };
}

// ============================================================================
// BELL UNREAD COUNT HOOK
// ============================================================================

/**
 * Hook for fetching unread notification count (optimized for bell badge)
 * Uses RPC for efficient count without fetching all notifications
 */
export function useBellUnreadCount() {
  const { user } = useAuth() as any;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['bell-unread-count', user?.id],
    enabled: !!user?.id,
    queryFn: getBellUnreadCount,
    staleTime: 30_000, // 30 seconds
    refetchOnWindowFocus: true,
    refetchInterval: 60_000, // Refetch every minute
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user?.id) return;
    return subscribeToNotifications(user.id, () => {
      qc.invalidateQueries({ queryKey: ['bell-unread-count', user.id] });
    });
  }, [user?.id, qc]);

  return {
    count: query.data || 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ============================================================================
// ADMIN NOTIFICATIONS HOOK
// ============================================================================

export interface UseAdminNotificationsOptions {
  severity?: 'critical' | 'warning' | 'info';
  unreadOnly?: boolean;
}

export function useAdminNotifications(options: UseAdminNotificationsOptions = {}) {
  const { user, profile } = useAuth() as any;
  const qc = useQueryClient();
  const [filterTab, setFilterTab] = useState<NotificationFilterTab>('all');
  const [offset, setOffset] = useState<number>(0);

  // Only enable for admin/super_admin roles
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const key = useMemo(
    () => ['admin-notifications', user?.id, { offset, ...options }],
    [user?.id, offset, options]
  );

  const query = useQuery({
    queryKey: key,
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const rows = await fetchAdminNotifications({
        limit: 12,
        offset,
        ...options,
      });
      return rows as AdminNotification[];
    },
    staleTime: 10_000,
  });

  const all = (query.data || []) as AdminNotification[];

  // Apply tab filter
  const items = useMemo(() => {
    if (filterTab === 'unread') return all.filter((n) => !n.is_read);
    if (filterTab === 'read') return all.filter((n) => n.is_read);
    return all;
  }, [all, filterTab]);

  const unreadCount = useMemo(() => all.filter((n) => !n.is_read).length, [all]);

  // Realtime subscription for admin notifications
  const subRef = useRef<any>(null);
  useEffect(() => {
    if (!user?.id || !isAdmin) return;

    // Clean up any existing subscription first
    if (subRef.current) {
      supabase.removeChannel(subRef.current);
      subRef.current = null;
    }

    subRef.current = subscribeAdminNotifications(user.id, () => {
      qc.invalidateQueries({ queryKey: ['admin-notifications', user.id] });
      qc.invalidateQueries({ queryKey: ['admin-unread-count', user.id] });
    });

    return () => {
      if (subRef.current) {
        supabase.removeChannel(subRef.current);
        subRef.current = null;
      }
    };
  }, [user?.id, isAdmin, qc]);

  const loadMore = async () => {
    if (all.length === 0) return;
    
    // Enforce 50-item cap per spec
    const newOffset = offset + 12;
    if (newOffset >= 50) {
      logger.info('Reached 50-item admin notification cap');
      return;
    }
    
    setOffset(newOffset);
  };

  const markOne = async (id: string, toRead = true) => {
    try {
      if (toRead) {
        await markOneRead(id);
      } else {
        await markOneUnread(id);
      }
      await qc.invalidateQueries({ queryKey: ['admin-notifications', user?.id] });
      await qc.invalidateQueries({ queryKey: ['admin-unread-count', user?.id] });
    } catch (error) {
      logger.error('Error marking admin notification:', error);
      throw error;
    }
  };

  const markAll = async () => {
    try {
      await markAllRead();
      await qc.invalidateQueries({ queryKey: ['admin-notifications', user?.id] });
      await qc.invalidateQueries({ queryKey: ['admin-unread-count', user?.id] });
    } catch (error) {
      logger.error('Error marking all admin notifications:', error);
      throw error;
    }
  };

  return {
    items,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error as any,
    unreadCount,
    filterTab,
    setFilterTab,
    loadMore,
    markOne,
    markAll,
    refetch: query.refetch,
  };
}

// ============================================================================
// ADMIN UNREAD COUNT HOOK
// ============================================================================

/**
 * Hook for fetching admin unread notification count
 * Only works for admin/super_admin roles
 */
export function useAdminUnreadCount() {
  const { user, profile } = useAuth() as any;
  const qc = useQueryClient();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const query = useQuery({
    queryKey: ['admin-unread-count', user?.id],
    enabled: !!user?.id && isAdmin,
    queryFn: getAdminUnreadCount,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  // Subscribe to realtime updates
  const subRef = useRef<any>(null);
  useEffect(() => {
    if (!user || !isAdmin) return;

    subRef.current = subscribeAdminNotifications(user.id, () => {
      qc.invalidateQueries({ queryKey: ['admin-unread-count', user.id] });
    });

    return () => {
      if (subRef.current) {
        supabase.removeChannel(subRef.current);
      }
    };
  }, [user?.id, isAdmin, qc]);

  return {
    count: query.data || 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
