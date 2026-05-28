import { supabase } from '../utils/supabase';
import { logActivity } from '../utils/activityLogger';

function toLower(str) {
  return String(str || '').toLowerCase();
}

export function mapMentorshipError(error) {
  if (!error) {
    return { code: 'UNKNOWN', message: 'Something went wrong. Please try again.' };
  }

  const rawMessage = toLower(error.message || error.error_description || error.details);
  const pgCode = String(error.code || error.errcode || '').toUpperCase();

  // New: bad enum value from old data (e.g. status = 'unknown' after
  // migrating to an ENUM column). This typically happens only for legacy
  // rows and is a data issue, not something the user can resolve.
  if (rawMessage.includes('invalid input value for enum') && rawMessage.includes('mentorship_request_status')) {
    return {
      code: 'BAD_STATUS_VALUE',
      message: 'This older mentorship request has an invalid internal status and cannot be updated. Please contact support or an administrator to clean it up.',
    };
  }

  if (rawMessage.includes('not authenticated')) {
    return {
      code: 'FORBIDDEN',
      message: 'You must be signed in to perform this action.',
    };
  }

  if (rawMessage.includes('not eligible') || rawMessage.includes('not an eligible mentee')) {
    return {
      code: 'NOT_ELIGIBLE_MENTEE',
      message: 'You need an approved mentee profile to request mentorship.',
    };
  }

  if (
    rawMessage.includes('mentor is not available') ||
    rawMessage.includes('mentor unavailable') ||
    rawMessage.includes('not currently accepting')
  ) {
    return {
      code: 'MENTOR_UNAVAILABLE',
      message: 'This mentor is not currently accepting requests.',
    };
  }

  if (
    rawMessage.includes('already have a mentorship request') ||
    rawMessage.includes('duplicate') ||
    rawMessage.includes('already exists')
  ) {
    return {
      code: 'DUPLICATE_ACTIVE_REQUEST',
      message: 'You already have a pending or active request with this mentor.',
    };
  }

  if (rawMessage.includes('reached their mentee capacity') || rawMessage.includes('capacity')) {
    return {
      code: 'CAPACITY_REACHED',
      message: 'This mentor has reached their mentee limit.',
    };
  }

  // 5-request limit for mentees
  if (rawMessage.includes('pending request') && rawMessage.includes('limit')) {
    return {
      code: 'PENDING_REQUEST_LIMIT',
      message: 'You have reached the maximum number of pending mentorship requests (5). Please wait for responses or cancel existing requests.',
    };
  }

  // Mentor not selectable (blocked, rejected, or not approved)
  if (rawMessage.includes('mentor not selectable') || rawMessage.includes('not available for selection')) {
    return {
      code: 'MENTOR_NOT_SELECTABLE',
      message: 'This mentor is not available for new mentorships.',
    };
  }

  // Request already exists (duplicate check)
  if (rawMessage.includes('request_already_exists')) {
    return {
      code: 'REQUEST_ALREADY_EXISTS',
      message: 'You already have a pending or active request with this mentor.',
    };
  }

  if (rawMessage.includes('invalid status transition')) {
    return {
      code: 'INVALID_STATUS_TRANSITION',
      message: 'This mentorship request can no longer be updated.',
    };
  }

  // Ending a non-active mentorship relationship
  if (rawMessage.includes('only active mentorships can be ended')) {
    return {
      code: 'ALREADY_ENDED',
      message: 'This mentorship is no longer active.',
    };
  }

  if (
    pgCode === '42501' ||
    rawMessage.includes('permission denied') ||
    rawMessage.includes('rls') ||
    rawMessage.includes('not allowed')
  ) {
    return {
      code: 'FORBIDDEN',
      message: 'You are not allowed to perform this action.',
    };
  }

  return {
    code: 'UNKNOWN',
    message: error.message || 'Something went wrong. Please try again.',
  };
}

export async function createMentorshipRequest(mentorId, payload) {
  const { data, error } = await supabase.rpc('mentorship_request_create', {
    p_mentor_id: mentorId,
    p_message: payload?.message ?? null,
    p_goals: payload?.goals ?? null,
  });
  if (error) throw error;
  logActivity({ action: 'mentorship_request', meta: { mentor_id: mentorId } }).catch(() => {});
  return data;
}

export async function acceptMentorshipRequest(requestId) {
  // Backend contract: mentorship_request_respond(p_request_id uuid, p_new_status text)
  // Returns relationship_id on success for 'accepted'
  const { data, error } = await supabase.rpc('mentorship_request_respond', {
    p_request_id: requestId,
    p_new_status: 'accepted',
  });
  if (error) throw error;
  logActivity({ action: 'mentorship_accepted', meta: { request_id: requestId, relationship_id: data?.relationshipId || null } }).catch(() => {});
  return data;
}

export async function rejectMentorshipRequest(requestId) {
  // Backend contract: mentorship_request_respond(p_request_id uuid, p_new_status text)
  const { data, error } = await supabase.rpc('mentorship_request_respond', {
    p_request_id: requestId,
    p_new_status: 'rejected',
  });
  if (error) throw error;
  logActivity({ action: 'mentorship_rejected', meta: { request_id: requestId } }).catch(() => {});
  return data;
}

export async function cancelMentorshipRequest(requestId) {
  const { data, error } = await supabase.rpc('mentorship_request_cancel', {
    p_request_id: requestId,
  });
  if (error) throw error;
  logActivity({ action: 'mentorship_cancelled', meta: { request_id: requestId } }).catch(() => {});
  return data;
}

/**
 * End an active mentorship relationship.
 * Uses the server-side RPC so RLS and business rules are correctly enforced.
 * Backend contract: mentorship_relationship_end(p_relationship_id uuid, p_reason text)
 */
export async function endMentorshipRelationship(relationshipId, reason = null) {
  const { data, error } = await supabase.rpc('mentorship_relationship_end', {
    p_relationship_id: relationshipId,
    p_reason: reason,
  });

  if (error) throw error;
  logActivity({ action: 'mentorship_ended', meta: { relationship_id: relationshipId, reason: reason || null } }).catch(() => {});
  return data;
}

export async function toggleMentorAvailability(next) {
  const { data, error } = await supabase.rpc('mentorship_toggle_availability', {
    p_next: next,
  });
  if (error) throw error;
  return data;
}

export async function adminForceMentorUnavailable(userId) {
  const { error } = await supabase
    .from('profiles')
    .update({ is_available_for_mentorship: false })
    .eq('id', userId);
  if (error) throw error;
}
