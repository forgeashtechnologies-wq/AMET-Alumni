import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

// Returns { status, pending_side } for the relationship between meId and peerId
export function useConnectionRel(meId, peerId) {
  const [rel, setRel] = useState({ status: null, pending_side: null });

  useEffect(() => {
    let active = true;
    if (!meId || !peerId || meId === peerId) {
      setRel({ status: null, pending_side: null });
      return () => { active = false; };
    }

    const fetchRel = async () => {
      try {
        // v_directory_connection_states is built for the current user in many apps; if not, fall back to direct query
        const { data, error } = await supabase
          .from('v_directory_connection_states')
          .select('status,pending_side')
          .eq('other_user_id', peerId)
          .maybeSingle();
        if (!error && data && active) {
          setRel({ status: data.status ?? null, pending_side: data.pending_side ?? null });
        } else if (active) {
          setRel({ status: null, pending_side: null });
        }
      } catch (e) {
        if (active) setRel({ status: null, pending_side: null });
      }
    };

    fetchRel();

    // Realtime: listen for changes touching meId and peerId; refetch on any
    const channel = supabase.channel(`conn-${meId}-${peerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections', filter: `requester_id=eq.${meId}` }, (payload) => {
        const row = payload.new || payload.old || {};
        if (row.recipient_id === peerId || row.requester_id === peerId) fetchRel();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections', filter: `recipient_id=eq.${meId}` }, (payload) => {
        const row = payload.new || payload.old || {};
        if (row.recipient_id === peerId || row.requester_id === peerId) fetchRel();
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [meId, peerId]);

  return rel;
}
