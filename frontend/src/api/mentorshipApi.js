// frontend/src/api/mentorshipApi.js
// Runtime JS wrapper around canonical mentorship RPCs.
// JS components should import from this module.
import { supabase } from '../utils/supabase';

export async function createMentorshipRequest(mentorId, message, goals) {
  const { error } = await supabase.rpc('mentorship_request_create', {
    p_mentor_id: mentorId,
    p_message: message ?? null,
    p_goals: goals ?? null,
  });
  if (error) throw error;
}

// End all active mentorship relationships between the current user and another user.
// RPC: mentorship_end_all_between(p_other_user_id uuid, p_reason text)
export async function endAllMentorshipsWithUser(otherUserId, reason) {
  const { error } = await supabase.rpc('mentorship_end_all_between', {
    p_other_user_id: otherUserId,
    p_reason: reason ?? null,
  });
  if (error) throw error;
}

// End all mentorships with a user AND disconnect from them at the connections layer.
// RPC: mentorship_full_disconnect(p_other_user_id uuid, p_reason text)
export async function fullDisconnectFromUser(otherUserId, reason) {
  const { error } = await supabase.rpc('mentorship_full_disconnect', {
    p_other_user_id: otherUserId,
    p_reason: reason ?? null,
  });
  if (error) throw error;
}

export async function cancelMentorshipRequest(requestId) {
  const { error } = await supabase.rpc('mentorship_request_cancel', {
    p_request_id: requestId,
  });
  if (error) throw error;
}

export async function respondToMentorshipRequest(requestId, status) {
  const { data, error } = await supabase.rpc('mentorship_request_respond', {
    p_request_id: requestId,
    p_new_status: status,
  });
  if (error) throw error;

  const relationshipId =
    (data && data.relationship_id) ||
    (typeof data === 'string' ? data : null) ||
    null;

  return { relationshipId };
}

export async function endMentorshipRelationship(relationshipId, reason) {
  const { error } = await supabase.rpc('mentorship_relationship_end', {
    p_relationship_id: relationshipId,
    p_reason: reason ?? null,
  });
  if (error) throw error;
}

export async function openMentorshipChat(relationshipId) {
  const { data, error } = await supabase.rpc('mentorship_open_chat', {
    p_relationship_id: relationshipId,
  });
  if (error) throw error;

  // The RPC may return the thread identifier in different shapes depending
  // on how it is implemented (plain text, object, or array of objects).
  // Normalize the value here so callers always get a usable ID.
  const row = Array.isArray(data) ? data[0] : data;

  const conversationId =
    (typeof row === 'string' ? row : null) ||
    (row && (row.conversation_id || row.thread_id || row.thread || row.id)) ||
    null;

  if (!conversationId) {
    throw new Error('DM thread creation failed – no conversation ID returned.');
  }

  return { conversationId };
}

// Block a user for safety. This will:
// - End all mentorships between the current user and the target
// - Disconnect them at the connections layer
// - Mark the connection as blocked for hard DM/relationship gating.
// RPC: user_block(p_other_user_id uuid, p_reason text)
export async function blockUser(otherUserId, reason) {
  const { error } = await supabase.rpc('user_block', {
    p_other_user_id: otherUserId,
    p_reason: reason ?? null,
  });
  if (error) throw error;
}
