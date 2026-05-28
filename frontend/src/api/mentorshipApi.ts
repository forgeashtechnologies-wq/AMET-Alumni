// frontend/src/api/mentorshipApi.ts
import { supabase } from '../utils/supabase';

/**
 * Canonical API wrapper for all mentorship write operations.
 * All mentorship components must use these functions instead of calling RPCs directly.
 */

/**
 * Create a mentorship request from the current mentee to the given mentor.
 * RPC: mentorship_request_create(p_mentor_id uuid, p_message text, p_goals text)
 */
export async function createMentorshipRequest(
  mentorId: string,
  message: string,
  goals?: string
): Promise<void> {
  const { error } = await supabase.rpc('mentorship_request_create', {
    p_mentor_id: mentorId,
    p_message: message ?? null,
    p_goals: goals ?? null,
  });

  if (error) {
    throw error;
  }
}

/**
 * End all active mentorship relationships in either direction between the
 * current user and the given user.
 * RPC: mentorship_end_all_between(p_other_user_id uuid, p_reason text)
 */
export async function endAllMentorshipsWithUser(
  otherUserId: string,
  reason?: string
): Promise<void> {
  const { error } = await supabase.rpc('mentorship_end_all_between', {
    p_other_user_id: otherUserId,
    p_reason: reason ?? null,
  });

  if (error) {
    throw error;
  }
}

/**
 * End all mentorships with a user AND disconnect from them at the connection
 * layer, which will also make DM read-only via are_connected/connection
 * gating.
 * RPC: mentorship_full_disconnect(p_other_user_id uuid, p_reason text)
 */
export async function fullDisconnectFromUser(
  otherUserId: string,
  reason?: string
): Promise<void> {
  const { error } = await supabase.rpc('mentorship_full_disconnect', {
    p_other_user_id: otherUserId,
    p_reason: reason ?? null,
  });

  if (error) {
    throw error;
  }
}

/**
 * Cancel a mentorship request owned by the current user.
 * RPC: mentorship_request_cancel(p_request_id uuid)
 */
export async function cancelMentorshipRequest(
  requestId: string
): Promise<void> {
  const { error } = await supabase.rpc('mentorship_request_cancel', {
    p_request_id: requestId,
  });

  if (error) {
    throw error;
  }
}

/**
 * Respond to a mentorship request as the mentor.
 * RPC: mentorship_request_respond(p_request_id uuid, p_new_status text)
 * Returns relationship_id on success for 'accepted', otherwise null.
 */
export async function respondToMentorshipRequest(
  requestId: string,
  status: 'accepted' | 'rejected' | 'cancelled'
): Promise<{ relationshipId: string | null }> {
  const { data, error } = await supabase.rpc('mentorship_request_respond', {
    p_request_id: requestId,
    p_new_status: status,
  });

  if (error) {
    throw error;
  }

  // Normalize to { relationshipId: string | null }
  const relationshipId =
    (data && (data as any).relationship_id) ??
    (typeof data === 'string' ? data : null) ??
    null;

  return { relationshipId };
}

/**
 * End an active mentorship relationship.
 * RPC: mentorship_relationship_end(p_relationship_id uuid, p_reason text)
 */
export async function endMentorshipRelationship(
  relationshipId: string,
  reason?: string
): Promise<void> {
  const { error } = await supabase.rpc('mentorship_relationship_end', {
    p_relationship_id: relationshipId,
    p_reason: reason ?? null,
  });

  if (error) {
    throw error;
  }
}

/**
 * Open (or create) the DM conversation associated with a mentorship relationship.
 * RPC: mentorship_open_chat(p_relationship_id uuid)
 * Returns conversation_id (DM thread id).
 */
export async function openMentorshipChat(
  relationshipId: string
): Promise<{ conversationId: string }> {
  const { data, error } = await supabase.rpc('mentorship_open_chat', {
    p_relationship_id: relationshipId,
  });

  if (error) {
    throw error;
  }

  const conversationId =
    (typeof data === 'string' ? data : (data as any)?.conversation_id) ?? null;

  if (!conversationId) {
    throw new Error('DM thread creation failed – no conversation ID returned.');
  }

  return { conversationId };
}

/**
 * Block a user for safety. This will:
 * - End all mentorships between the current user and the target
 * - Disconnect them at the connections layer
 * - Mark the connection as blocked for hard DM/relationship gating.
 * RPC: user_block(p_other_user_id uuid, p_reason text)
 */
export async function blockUser(
  otherUserId: string,
  reason?: string
): Promise<void> {
  const { error } = await supabase.rpc('user_block', {
    p_other_user_id: otherUserId,
    p_reason: reason ?? null,
  });

  if (error) {
    throw error;
  }
}
