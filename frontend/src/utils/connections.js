import logger from './logger';
import { supabase } from './supabase';
import toast from 'react-hot-toast';
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_KEY;

// Returns latest connection edge between a and b (by updated_at then created_at)
export async function getLatestEdge(a, b) {
  if (!a || !b || a === b) return null;
  const { data, error } = await supabase
    .from('connections')
    .select('id, requester_id, recipient_id, status, created_at, updated_at')
    .or(`and(requester_id.eq.${a},recipient_id.eq.${b}),and(requester_id.eq.${b},recipient_id.eq.${a})`)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

// Fetch simplified relationship from the directory view
export async function fetchRel(meId, otherId) {
  const { data, error } = await supabase
    .from('v_directory_connection_states')
    .select('status,pending_side')
    .eq('other_user_id', otherId)
    .maybeSingle();
  if (error) throw error;
  return data || { status: null, pending_side: null };
}

// Idempotent connect: accepts incoming if present, treats duplicates as success
export async function idempotentConnect(requesterId, recipientId) {
  if (!requesterId || !recipientId) throw new Error('Missing IDs');
  if (requesterId === recipientId) throw new Error('Cannot connect to yourself');

  // RPC-first (if present on the DB): lets the server own requester_id/status under RLS
  const rpcAttempts = [
    { name: 'request_connection', params: { p_recipient: recipientId } },
  ];
  for (const attempt of rpcAttempts) {
    try {
      const { data, error } = await supabase.rpc(attempt.name, attempt.params);
      if (!error && data) return data;
    } catch (_) { /* try next */ }
  }

  // check existing (either direction)
  const { data: existing, error: findErr } = await supabase
    .from('connections')
    .select('id,status,requester_id,recipient_id')
    .or(`and(requester_id.eq.${requesterId},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${requesterId})`)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1);

  if (findErr) throw findErr;
  if (existing?.length) {
    const edge = existing[0];

    // auto-accept if the *other* person already requested me
    if (edge.status === 'pending' && edge.requester_id === recipientId) {
      const { data, error } = await supabase
        .from('connections')
        .update({ status: 'accepted' })
        .eq('id', edge.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    // revive same-direction declined back to pending
    if (edge.status === 'declined' && edge.requester_id === requesterId) {
      const { data, error } = await supabase
        .from('connections')
        .update({ status: 'pending' })
        .eq('id', edge.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    return edge; // already have something; treat as success
  }

  // Primary insert path: manual fetch without columns query param (works around PostgREST columns= for JSON bug)
  let createErr = null;
  try {
    const { data: sess } = await supabase.auth.getSession();
    const accessToken = sess?.session?.access_token;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !accessToken) throw new Error('Missing env/session');
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/connections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify([{ recipient_id: recipientId }]),
    });
    if (!resp.ok) {
      let j = null; try { j = await resp.json(); } catch (_) { /* no-op */ }
      logger.error('manual POST /connections failed', resp.status, j);
      throw new Error('manual-insert-failed');
    }
    const latest = await getLatestEdge(requesterId, recipientId);
    if (latest) return latest;
    return null;
  } catch (eManual) {
    createErr = eManual;
    // fall back to supabase-js insert attempts
  }

  // fresh insert: prefer minimal payload to satisfy RLS/triggers (let DB set requester_id/status)
  // fallback to explicit payload if minimal insert fails for any reason
  try {
    const { error } = await supabase
      .from('connections')
      .insert([{ recipient_id: recipientId }], { returning: 'minimal' });
    if (error) throw error;
    // fetch the latest edge after insert
    const latest = await getLatestEdge(requesterId, recipientId);
    if (latest) return latest;
    return null;
  } catch (e) {
    createErr = e;
    // continue to fallback path
  }

  // minimal attempt 2: provide status only (let DB derive requester_id)
  try {
    const { error } = await supabase
      .from('connections')
      .insert([{ recipient_id: recipientId, status: 'pending' }], { returning: 'minimal' });
    if (error) throw error;
    const latest = await getLatestEdge(requesterId, recipientId);
    if (latest) return latest;
    return null;
  } catch (e1) {
    // keep original minimal error but prefer the more recent detail if any
    if (!createErr) createErr = e1;
  }

  try {
    const { error } = await supabase
      .from('connections')
      .insert([{ requester_id: requesterId, recipient_id: recipientId, status: 'pending' }], { returning: 'minimal' });
    if (error) throw error;
    const latest = await getLatestEdge(requesterId, recipientId);
    if (latest) return latest;
    return null;
  } catch (e2) {
    const msg = (e2?.message || e2?.code || '').toString().toLowerCase();
    if (msg.includes('23505') || msg.includes('409') || msg.includes('duplicate') || msg.includes('conflict')) {
      // treat duplicate as success by returning the latest edge
      const latest = await getLatestEdge(requesterId, recipientId);
      if (latest) return latest;
      return null;
    }
    // Log original minimal insert error for diagnostics
    logger.error('connections.idempotentConnect insert errors', { minimal: createErr, fallback: e2 });
    // Final fallback: raw fetch without columns param to avoid client library query mutation
    try {
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess?.session?.access_token;
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !accessToken) throw e2;
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/connections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify([{ recipient_id: recipientId }]),
      });
      if (!resp.ok) {
        let j = null; try { j = await resp.json(); } catch (_) { /* no-op */ }
        logger.error('manual POST /connections failed', resp.status, j);
        throw e2;
      }
      const latest = await getLatestEdge(requesterId, recipientId);
      if (latest) return latest;
      return null;
    } catch (e3) {
      throw e2; // rethrow original
    }
  }
}

// Deprecated: use idempotentConnect
export async function connectTo(meId, otherId) {
  try {
    await idempotentConnect(meId, otherId);
    toast.success('Connection request sent');
  } catch (error) {
    const code = (error?.code || error?.status || error?.message || '').toString().toLowerCase();
    if (code.includes('23505') || code.includes('409') || code.includes('duplicate') || code.includes('already')) {
      return;
    }
    logger.error('connectTo error', error);
    toast.error('Failed to send request');
    throw error;
  }
}

export async function updateEdge(edgeId, status) {
  const { data, error } = await supabase
    .from('connections')
    .update({ status })
    .eq('id', edgeId)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error('No row updated');
}

export async function cancelPending(meId, otherId) {
  const edge = await getLatestEdge(meId, otherId);
  if (edge?.status === 'pending' && edge.requester_id === meId) {
    try {
      await updateEdge(edge.id, 'removed');
    } catch (e) {
      logger.error('cancelPending error', e);
      toast.error('Failed to cancel request');
      throw e;
    }
  }
}

export async function acceptPending(meId, otherId) {
  const edge = await getLatestEdge(meId, otherId);
  if (edge?.status === 'pending' && edge.recipient_id === meId) {
    try {
      // Use server-side RPC which runs as SECURITY DEFINER and lets
      // triggers safely manage dm_threads without direct table access.
      const { error } = await supabase.rpc('connection_accept', {
        p_connection_id: edge.id,
      });
      if (error) {
        logger.error('connection_accept RPC error', error);
        throw error;
      }
    } catch (e) {
      logger.error('acceptPending error', e);
      toast.error('Failed to accept request');
      throw e;
    }
  }
}

export async function declinePending(meId, otherId) {
  const edge = await getLatestEdge(meId, otherId);
  if (edge?.status === 'pending' && edge.recipient_id === meId) {
    try {
      await updateEdge(edge.id, 'declined');
    } catch (e) {
      logger.error('declinePending error', e);
      toast.error('Failed to decline request');
      throw e;
    }
  }
}

export async function removeConnection(meId, otherId) {
  const edge = await getLatestEdge(meId, otherId);
  if (edge && (edge.status === 'accepted' || edge.status === 'connected')) {
    try {
      await updateEdge(edge.id, 'removed');
      toast('Connection removed', { icon: '🗑️' });
    } catch (e) {
      logger.error('removeConnection error', e);
      toast.error('Failed to remove connection');
      throw e;
    }
  }
}

// High-level helper: attempt to request connection for a job context
// Tries RPC first if available; falls back to idempotentConnect without blocking the caller
export async function requestConnectionForJob(jobId, employerId, meId) {
  try {
    if (jobId) {
      const { error } = await supabase.rpc('request_connection_for_job', { p_job_id: jobId });
      if (!error) return;
      // If RPC returns an error, fall through to fallback
      logger.warn('request_connection_for_job RPC error, falling back:', error?.message || error);
    }
  } catch (e) {
    // benign: fall back
    logger.warn('request_connection_for_job RPC unavailable, falling back');
  }
  try {
    if (meId && employerId) {
      await idempotentConnect(meId, employerId);
    }
  } catch (e) {
    // Swallow to keep UX smooth; chat page will still gate by connection state
    logger.warn('Fallback idempotentConnect failed (non-fatal):', e?.message || e);
  }
}

// Optional convenience for events (RPC may or may not exist)
export async function requestConnectionForEvent(eventId, organizerId, meId) {
  try {
    if (eventId) {
      const { error } = await supabase.rpc('request_connection_for_event', { p_event_id: eventId });
      if (!error) return;
      logger.warn('request_connection_for_event RPC error, falling back:', error?.message || error);
    }
  } catch (e) {
    logger.warn('request_connection_for_event RPC unavailable, falling back');
  }
  try {
    if (meId && organizerId) {
      await idempotentConnect(meId, organizerId);
    }
  } catch (e) {
    logger.warn('Fallback idempotentConnect failed (non-fatal):', e?.message || e);
  }
}
