import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import logger from '../utils/logger';
import { idempotentConnect } from '../utils/connections';
import toast from 'react-hot-toast';
import { toFriendlyToast } from '../utils/errors';

export const AllowedStatuses = new Set(['pending','accepted','declined']);

export function useConnections(currentUserId, visibleProfileIds = []) {
  const [byProfile, setByProfile] = useState(new Map());
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!currentUserId || !Array.isArray(visibleProfileIds) || visibleProfileIds.length === 0) return;
    setLoading(true);
    try {
      // fetch edges where I am requester or recipient and the other id is in the current page
      let q = supabase
        .from('connections')
        .select('id, requester_id, recipient_id, status, created_at, updated_at')
        .or(`requester_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
        .in('requester_id', [currentUserId, ...visibleProfileIds])
        .in('recipient_id', [currentUserId, ...visibleProfileIds]);

      const { data, error } = await q;
      if (error) throw error;

      const map = new Map();
      for (const row of data || []) {
        const otherId = row.requester_id === currentUserId ? row.recipient_id : row.requester_id;
        if (!visibleProfileIds.includes(otherId)) continue;
        map.set(otherId, row);
      }

/*
// Panel-focused hook: returns lists and counts for received, sent, and accepted peers.
// Does not require Directory context. RPC-first (optional), falls back to selects.
/*
export function useConnectionsPanel(currentUserId) {
  const [loading, setLoading] = useState(true);
  const [lists, setLists] = useState({ received: [], sent: [], accepted: [] });
  const [counts, setCounts] = useState({ received: 0, sent: 0, accepted: 0 });

  const load = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      // 1) Load edges involving me
      const { data: edges, error: eErr } = await supabase
        .from('connections')
        .select('id, requester_id, recipient_id, status, created_at')
        .or(`requester_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`);
      if (eErr) throw eErr;

      const receivedEdges = (edges || []).filter(r => r.status === 'pending' && r.recipient_id === currentUserId);
      const sentEdges = (edges || []).filter(r => r.status === 'pending' && r.requester_id === currentUserId);
      const acceptedEdges = (edges || []).filter(r => ['accepted','connected'].includes(r.status));

      const peerIds = Array.from(new Set([
        ...receivedEdges.map(r => r.requester_id),
        ...sentEdges.map(r => r.recipient_id),
        ...acceptedEdges.map(r => (r.requester_id === currentUserId ? r.recipient_id : r.requester_id)),
      ].filter(Boolean)));

      // 2) Load peer profiles in one go
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

  // Realtime subscribe to connections changes for me
  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase
      .channel(`conn-panel-${currentUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections', filter: `requester_id=eq.${currentUserId}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections', filter: `recipient_id=eq.${currentUserId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, load]);

  // Actions
  const accept = useCallback(async (peerId) => {
    try {
      const { data: edge } = await supabase
        .from('connections')
        .select('id')
        .eq('recipient_id', currentUserId)
        .eq('requester_id', peerId)
        .eq('status', 'pending')
        .maybeSingle();
      if (!edge) return;
      const { error } = await supabase.from('connections').update({ status: 'accepted' }).eq('id', edge.id);
      if (error) throw error;
      toast.success('Request accepted');
      load();
    } catch (e) { toast.error('Accept failed'); }
  }, [currentUserId, load]);

  const reject = useCallback(async (peerId) => {
    try {
      const { data: edge } = await supabase
        .from('connections')
        .select('id')
        .eq('recipient_id', currentUserId)
        .eq('requester_id', peerId)
        .eq('status', 'pending')
        .maybeSingle();
      if (!edge) return;
      const { error } = await supabase.from('connections').update({ status: 'rejected' }).eq('id', edge.id);
      if (error) throw error;
      toast('Request rejected');
      load();
    } catch (e) { toast.error('Reject failed'); }
  }, [currentUserId, load]);

  const cancel = useCallback(async (peerId) => {
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
    } catch (e) { toast.error('Cancel failed'); }
  }, [currentUserId, load]);

  return { loading, lists, counts, reload: load, actions: { accept, reject, cancel } };
}
*/
      setByProfile(map);
    } catch (e) {
      logger.error('useConnections.load error', e);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, JSON.stringify(visibleProfileIds)]);

  useEffect(() => { load(); }, [load]);

  // ---- Mutations ----
  const connect = useCallback(async (targetProfileId) => {
    if (!currentUserId || targetProfileId === currentUserId) return;

    const prev = byProfile.get(targetProfileId);
    const optimistic = { id: null, requester_id: currentUserId, recipient_id: targetProfileId, status: 'pending' };
    setByProfile(new Map(byProfile).set(targetProfileId, optimistic));

    try {
      const data = await idempotentConnect(currentUserId, targetProfileId);
      if (data) {
        setByProfile(new Map(byProfile).set(targetProfileId, data));
      }
      toast.success('Request sent');
    } catch (error) {
      const map = new Map(byProfile);
      if (prev) map.set(targetProfileId, prev); else map.delete(targetProfileId);
      setByProfile(map);
      toFriendlyToast(toast, error, 'Could not send request');
      return;
    }
  }, [byProfile, currentUserId]);

  const accept = useCallback(async (targetProfileId) => {
    const row = byProfile.get(targetProfileId);
    if (!row || row.status !== 'pending' || row.recipient_id !== currentUserId) return;

    const { data, error } = await supabase
      .from('connections')
      .update({ status: 'accepted' })
      .eq('id', row.id)
      .select()
      .single();

    if (error) return toFriendlyToast(toast, error, 'Accept failed');
    setByProfile(new Map(byProfile).set(targetProfileId, data));
    toast.success('Connection accepted');
  }, [byProfile, currentUserId]);

  const decline = useCallback(async (targetProfileId) => {
    const row = byProfile.get(targetProfileId);
    if (!row || row.status !== 'pending' || row.recipient_id !== currentUserId) return;

    const { data, error } = await supabase
      .from('connections')
      .update({ status: 'declined' })
      .eq('id', row.id)
      .select()
      .single();

    if (error) return toFriendlyToast(toast, error, 'Decline failed');
    setByProfile(new Map(byProfile).set(targetProfileId, data));
    toast('Request declined');
  }, [byProfile, currentUserId]);

  const cancel = useCallback(async (targetProfileId) => {
    const row = byProfile.get(targetProfileId);
    if (!row || row.status !== 'pending' || row.requester_id !== currentUserId) return;

    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('id', row.id);

    if (error) return toFriendlyToast(toast, error, 'Cancel failed');

    const map = new Map(byProfile);
    map.delete(targetProfileId);
    setByProfile(map);
    toast('Request canceled');
  }, [byProfile, currentUserId]);

  const removeConnection = useCallback(async (targetProfileId) => {
    const row = byProfile.get(targetProfileId);
    if (!row || !['accepted'].includes(row.status)) return;

    // Prefer RPC if present
    try {
      const { error } = await supabase.rpc('remove_connection', { p_user: currentUserId, p_other: targetProfileId });
      if (error) throw error;
    } catch (_) {
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', row.id);
      if (error) return toFriendlyToast(toast, error, 'Remove failed');
    }

    const map = new Map(byProfile);
    map.delete(targetProfileId);
    setByProfile(map);
    toast('Connection removed');
  }, [byProfile, currentUserId]);

  return {
    loading,
    byProfile,
    reload: load,
    actions: { connect, accept, decline, cancel, removeConnection },
  };
}
