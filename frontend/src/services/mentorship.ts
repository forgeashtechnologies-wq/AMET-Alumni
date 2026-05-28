import { supabase } from '../utils/supabase';

export type MentorshipErrorCode =
  | 'NOT_ELIGIBLE_MENTEE'
  | 'MENTOR_UNAVAILABLE'
  | 'DUPLICATE_ACTIVE_REQUEST'
  | 'CAPACITY_REACHED'
  | 'INVALID_STATUS_TRANSITION'
  | 'FORBIDDEN'
  | 'UNKNOWN';

export interface MentorshipError {
  code: MentorshipErrorCode;
  message: string;
}

function toLower(str: unknown): string {
  return String(str || '').toLowerCase();
}

export function mapMentorshipError(error: any): MentorshipError {
  if (!error) {
    return { code: 'UNKNOWN', message: 'Something went wrong. Please try again.' };
  }

  const rawMessage = toLower(error.message || error.error_description || error.details);
  const pgCode = String(error.code || error.errcode || '').toUpperCase();

  // Map by known semantic phrases emitted from RPCs / constraints
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

  if (rawMessage.includes('invalid status transition')) {
    return {
      code: 'INVALID_STATUS_TRANSITION',
      message: 'This mentorship request can no longer be updated.',
    };
  }

  if (
    pgCode === '42501' || // insufficient_privilege
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

// RPC wrappers – these throw on error and return the row payload on success

export async function createMentorshipRequest(
  mentorId: string,
  payload: { message?: string; goals?: string }
) {
  const { data, error } = await supabase.rpc('mentorship_request_create', {
    p_mentor_id: mentorId,
    p_message: payload.message ?? null,
    p_goals: payload.goals ?? null,
  });

  if (error) throw error;
  return data;
}

export async function acceptMentorshipRequest(requestId: string, reason?: string) {
  const { data, error } = await supabase.rpc('mentorship_request_respond', {
    p_request_id: requestId,
    p_new_status: 'accepted',
    p_reason: reason ?? null,
  });

  if (error) throw error;
  return data;
}

export async function rejectMentorshipRequest(requestId: string, reason?: string) {
  const { data, error } = await supabase.rpc('mentorship_request_respond', {
    p_request_id: requestId,
    p_new_status: 'rejected',
    p_reason: reason ?? null,
  });

  if (error) throw error;
  return data;
}

export async function cancelMentorshipRequest(requestId: string) {
  const { data, error } = await supabase.rpc('mentorship_request_cancel', {
    p_request_id: requestId,
  });

  if (error) throw error;
  return data;
}

export async function toggleMentorAvailability(next: boolean) {
  const { data, error } = await supabase.rpc('mentorship_toggle_availability', {
    p_next: next,
  });

  if (error) throw error;
  return data;
}

// Admin-only helper for forcing a mentor unavailable in emergencies.
// This still writes directly to profiles but is centralized here so usage is easy to audit.
export async function adminForceMentorUnavailable(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ is_available_for_mentorship: false })
    .eq('id', userId);

  if (error) throw error;
}
