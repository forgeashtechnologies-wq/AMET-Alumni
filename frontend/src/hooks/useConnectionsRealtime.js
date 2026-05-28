import { useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import logger from '../utils/logger';

/**
 * Realtime hook for connections table for a given user.
 * Subscribes to any changes where requester_id = me OR recipient_id = me
 * and invokes onChange(payload) for each event.
 */
export function useConnectionsRealtime(userId, onChange) {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!userId) return;
    // Avoid double-subscribe under React Strict Mode
    if (initializedRef.current) return;
    initializedRef.current = true;

    const channelName = `connections:${userId}`;
    const ch = supabase
      .channel(channelName)
      .on('postgres_changes', {
        schema: 'public',
        table: 'connections',
        event: '*',
        filter: `requester_id=eq.${userId}`,
      }, (payload) => {
        try { onChange?.(payload); } catch (e) { logger.error('connections requester handler error', e); }
      })
      .on('postgres_changes', {
        schema: 'public',
        table: 'connections',
        event: '*',
        filter: `recipient_id=eq.${userId}`,
      }, (payload) => {
        try { onChange?.(payload); } catch (e) { logger.error('connections recipient handler error', e); }
      })
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          // no-op; useful for debugging if needed
        }
      });

    return () => {
      try { supabase.removeChannel(ch); } catch (e) { /* ignore */ }
      initializedRef.current = false;
    };
  }, [userId, onChange]);
}
