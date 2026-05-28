import { useEffect, useState, useCallback } from 'react';
import { supabase, onPostgresChangesOnce } from '../utils/supabase';
import { fetchMyThreads } from '../api/dm';

export default function useGlobalBadges(currentUserId) {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingConnections, setPendingConnections] = useState(0);

  const load = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const threads = await fetchMyThreads();
      const sum = (threads || []).reduce((a, r) => a + (r.unread_count || 0), 0);
      setUnreadMessages(sum);
    } catch (_) {
      setUnreadMessages(0);
    }
    try {
      const { count } = await supabase
        .from('connections')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', currentUserId)
        .eq('status', 'pending');
      setPendingConnections(count || 0);
    } catch (_) {
      setPendingConnections(0);
    }
  }, [currentUserId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!currentUserId) return;
    const ch = `badges-${currentUserId}`;
    onPostgresChangesOnce(
      ch,
      `dm-badges-${currentUserId}`,
      { event: '*', schema: 'public', table: 'dm_messages' },
      () => load()
    );
    onPostgresChangesOnce(
      ch,
      `conn-badges-rec-${currentUserId}`,
      { event: '*', schema: 'public', table: 'connections', filter: `recipient_id=eq.${currentUserId}` },
      () => load()
    );
    onPostgresChangesOnce(
      ch,
      `conn-badges-req-${currentUserId}`,
      { event: '*', schema: 'public', table: 'connections', filter: `requester_id=eq.${currentUserId}` },
      () => load()
    );
    return () => {};
  }, [currentUserId, load]);

  return { unreadMessages, pendingConnections, reload: load };
}
