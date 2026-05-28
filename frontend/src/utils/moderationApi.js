// Frontend API helpers for Events moderation
// Uses single column approval_status with reviewed_by and reviewed_at audit fields

import { supabase } from './supabase';

export async function approveEvent(id, userId) {
  return supabase
    .from('events')
    .update({
      approval_status: 'approved',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();
}

export async function rejectEvent(id, userId, reason = null) {
  return supabase
    .from('events')
    .update({
      approval_status: 'rejected',
      rejection_reason: reason || null,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();
}

export async function fetchPendingEvents() {
  return supabase
    .from('events')
    .select('*')
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: false });
}
