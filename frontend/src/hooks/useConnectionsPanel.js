// frontend/src/hooks/useConnectionsPanel.js
import { useCallback, useEffect, useState } from 'react';
import { supabase, onPostgresChangesOnce } from '../utils/supabase';
import logger from '../utils/logger';
import toast from 'react-hot-toast';

export default function useConnectionsPanel(currentUserId) {
  const [loading, setLoading] = useState(true);
  const [lists, setLists] = useState({ received: [], sent: [], accepted: [] });
  const [counts, setCounts] = useState({ received: 0, sent: 0, accepted: 0 });

  const load = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      // Fetch all edges involving me
      const { data: edges, error: eErr } = await supabase
        .from('connections')
        .select('id, requester_id, recipient_id, status, created_at')
        .or(`requester_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`);
      if (eErr) throw eErr;

      const receivedEdges = (edges || []).filter(r => r.status === 'pending' && r.recipient_id === currentUserId);
      const sentEdges = (edges || []).filter(r => r.status === 'pending' && r.requester_id === currentUserId);
      const acceptedEdges = (edges || []).filter(r => ['accepted'].includes(r.status));

      const peerIds = Array.from(new Set([
        ...receivedEdges.map(r => r.requester_id),
        ...sentEdges.map(r => r.recipient_id),
        ...acceptedEdges.map(r => (r.requester_id === currentUserId ? r.recipient_id : r.requester_id)),
      ].filter(Boolean)));

      // Load peer profiles once
      let profiles = [];
      if (peerIds.length > 0) {
        const { data: profs, error: pErr } = await supabase
          .from('profiles')
          .select('id, full_name, first_name, last_name, email, avatar_url, degree_program, department, graduation_year, company_name, current_job_title, role')
          .in('id', peerIds);
        if (pErr) throw pErr;
        profiles = profs || [];
      }

      const pMap = new Map(profiles.map(p => [p.id, p]));
      const mapEdgeToItem = (edge, otherId) => ({
        ...pMap.get(otherId),
        id: otherId,
        _edge: edge,
      });

      const received = receivedEdges.map(r => mapEdgeToItem(r, r.requester_id));
      const sent = sentEdges.map(r => mapEdgeToItem(r, r.recipient_id));
      const accepted = acceptedEdges.map(r => mapEdgeToItem(r, r.requester_id === currentUserId ? r.recipient_id : r.requester_id));

      setLists({ received, sent, accepted });
      setCounts({ received: received.length, sent: sent.length, accepted: accepted.length });
    } catch (e) {
      logger.error('useConnectionsPanel.load error', e);
      setLists({ received: [], sent: [], accepted: [] });
      setCounts({ received: 0, sent: 0, accepted: 0 });
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => { load(); }, [load]);

  // Realtime subscribe to changes (idempotent via registry)
  useEffect(() => {
    if (!currentUserId) return;
    const chName = `conn-panel-${currentUserId}`;
    onPostgresChangesOnce(
      chName,
      `conn-panel-req-${currentUserId}`,
      { event: '*', schema: 'public', table: 'connections', filter: `requester_id=eq.${currentUserId}` },
      () => load()
    );
    onPostgresChangesOnce(
      chName,
      `conn-panel-rec-${currentUserId}`,
      { event: '*', schema: 'public', table: 'connections', filter: `recipient_id=eq.${currentUserId}` },
      () => load()
    );
    return () => { /* no-op; registry manages channel lifecycle */ };
  }, [currentUserId, load]);

  // Actions
  const accept = async (peerId) => {
    try {
      const { data: edge } = await supabase
        .from('connections')
        .select('id')
        .eq('recipient_id', currentUserId)
        .eq('requester_id', peerId)
        .eq('status', 'pending')
        .maybeSingle();
      if (!edge) return;

      // Use server-side RPC so dm_threads creation runs under SECURITY DEFINER
      const { error } = await supabase.rpc('connection_accept', {
        p_connection_id: edge.id,
      });
      if (error) throw error;

      toast.success('Request accepted');
      load();
    } catch (e) {
      logger.error('useConnectionsPanel.accept error', e);
      toast.error('Accept failed');
    }
  };

  const reject = async (peerId) => {
    try {
      const { data: edge } = await supabase
        .from('connections')
        .select('id')
        .eq('recipient_id', currentUserId)
        .eq('requester_id', peerId)
        .eq('status', 'pending')
        .maybeSingle();
      if (!edge) return;
      const { error } = await supabase.from('connections').update({ status: 'declined' }).eq('id', edge.id);
      if (error) throw error;
      toast('Request rejected');
      load();
    } catch (_) { toast.error('Reject failed'); }
  };

  const cancel = async (peerId) => {
    try {
      const { data: edge } = await supabase
        .from('connections')
        .select('id')
        .eq('requester_id', currentUserId)
        .eq('recipient_id', peerId)
        .eq('status', 'pending')
        .maybeSingle();
      if (!edge) return;
      const { error } = await supabase.from('connections').delete().eq('id', edge.id);
      if (error) throw error;
      toast('Request canceled');
      load();
    } catch (_) { toast.error('Cancel failed'); }
  };

  const disconnect = async (peerId) => {
    try {
      // Find the accepted/connected edge between current user and peer
      const { data: edge } = await supabase
        .from('connections')
        .select('id')
        .or(`and(requester_id.eq.${currentUserId},recipient_id.eq.${peerId}),and(requester_id.eq.${peerId},recipient_id.eq.${currentUserId})`)
        .in('status', ['accepted'])
        .maybeSingle();
      if (!edge) return;
      const { error } = await supabase.from('connections').delete().eq('id', edge.id);
      if (error) throw error;
      toast.success('Connection removed');
      load();
    } catch (_) { toast.error('Disconnect failed'); }
  };

  return { loading, lists, counts, reload: load, actions: { accept, reject, cancel, disconnect } };
}
