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
  markAllRead,
  markOneRead,
  markOneUnread,
  getBellUnreadCount,
  type BellNotification,
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
        limit: 50,
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

  // unread count: use the bell unread count query for the accurate total,
  // falling back to page-derived count if the RPC hasn't loaded yet.
  // This avoids showing "0 unread" when there are >12 unread but only 12 loaded.
  const bellCountQuery = useQuery({
    queryKey: ['bell-unread-count', user?.id],
    enabled: !!user?.id,
    queryFn: getBellUnreadCount,
    staleTime: 30_000,
  });
  const unreadCount = useMemo(() => {
    if (bellCountQuery.data !== undefined) return bellCountQuery.data;
    return all.filter((n) => !n.is_read).length;
  }, [bellCountQuery.data, all]);

  // realtime subscription
  useEffect(() => {
    if (!user?.id) return;
    return subscribeToNotifications(user.id, () => {
      qc.invalidateQueries({ queryKey: ['notifications', user.id] });
      qc.invalidateQueries({ queryKey: ['bell-unread-count', user.id] });
    });
  }, [user?.id, qc]);

  // pagination: load more (12 items per page)
  // No artificial cap — users can paginate through all their notifications.
  // The RPC caps at 100 per call (LEAST(p_limit, 100)) to prevent abuse.
  const loadMore = async () => {
    const current = all;
    if (current.length === 0) return;

    const newOffset = offset + 12;
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
    const bellKey = ['bell-unread-count', user?.id];

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

    // Optimistically update the bell unread count immediately
    const prevBellCount = qc.getQueryData<number>(bellKey);
    if (typeof prevBellCount === 'number') {
      qc.setQueryData<number>(bellKey, Math.max(0, prevBellCount + (toRead ? -1 : 1)));
    }

    try {
      if (toRead) {
        await markOneRead(id);
      } else {
        await markOneUnread(id);
      }

      // RPC succeeded — invalidate and force-refetch to align with server state
      qc.invalidateQueries({ queryKey: queryKeyBase });
      qc.invalidateQueries({ queryKey: bellKey });
      // Force immediate refetch of bell count (don't rely on staleTime)
      qc.refetchQueries({ queryKey: bellKey });
    } catch (error) {
      // Roll back optimistic changes on failure
      prevStates.forEach(([k, v]) => qc.setQueryData(k as any, v));
      qc.setQueryData(bellKey, prevBellCount);
      logger.error('Error marking notification:', error);
      throw error;
    }
  };

  const markAll = async () => {
    try {
      // Optimistically set bell count to 0
      qc.setQueryData<number>(['bell-unread-count', user?.id], 0);
      await markAllRead();
      qc.invalidateQueries({ queryKey: ['notifications', user?.id] });
      qc.invalidateQueries({ queryKey: ['bell-unread-count', user?.id] });
      qc.refetchQueries({ queryKey: ['bell-unread-count', user?.id] });
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
    staleTime: 5_000, // 5 seconds — more responsive to mark-as-read
    refetchOnWindowFocus: true,
    refetchInterval: 30_000, // Refetch every 30 seconds
  });

  // Subscribe to realtime updates — force refetch on any notification change
  useEffect(() => {
    if (!user?.id) return;
    return subscribeToNotifications(user.id, () => {
      qc.invalidateQueries({ queryKey: ['bell-unread-count', user.id] });
      qc.refetchQueries({ queryKey: ['bell-unread-count', user.id] });
    });
  }, [user?.id, qc]);

  return {
    count: query.data || 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
