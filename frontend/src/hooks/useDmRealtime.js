import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabase';

export function useDmRealtime(threadId, onInsert) {
  const stableCb = useRef(null);
  stableCb.current = onInsert;

  const handler = useCallback((payload) => {
    if (!stableCb.current) return;
    const row = payload?.new;
    if (row && row.thread_id === threadId) {
      stableCb.current(row);
    }
  }, [threadId]);

  useEffect(() => {
    if (!threadId) return undefined;
    // Fresh channel per mount with a unique topic to avoid multiple subscribe errors in dev strict mode
    const topic = `dm:${threadId}:${Date.now()}`;
    const ch = supabase.channel(topic);
    ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages', filter: `thread_id=eq.${threadId}` }, handler);
    ch.subscribe();

    // Cleanup: unsubscribe only (do not remove channel) to avoid handshake teardown noise
    return () => {
      try { ch.unsubscribe(); } catch (e) { void e; }
    };
  }, [threadId, handler]);
}
