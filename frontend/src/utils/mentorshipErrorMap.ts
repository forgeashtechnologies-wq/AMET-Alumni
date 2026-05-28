// frontend/src/utils/mentorshipErrorMap.ts
import type { PostgrestError } from '@supabase/supabase-js';

export type MentorshipErrorCode =
  | 'PENDING_REQUEST_LIMIT'
  | 'MENTOR_NOT_SELECTABLE'
  | 'MENTOR_AT_CAPACITY'
  | 'REQUEST_ALREADY_EXISTS'
  | 'NOT_AUTHORIZED'
  | 'UNKNOWN';

export interface MentorshipError {
  code: MentorshipErrorCode;
  message: string;
}

function toLower(str: unknown): string {
  return String(str || '').toLowerCase();
}

/**
 * Centralized error mapping for all mentorship operations.
 * Maps backend RPC errors to user-friendly messages with typed error codes.
 */
export function mapMentorshipError(error: any): MentorshipError {
  if (!error) {
    return {
      code: 'UNKNOWN',
      message: 'Something went wrong. Please try again.',
    };
  }

  const e = error as PostgrestError & {
    error_description?: string;
    details?: string;
  };

  const rawMessage = toLower(
    e.message || e.error_description || e.details
  );
  const pgCode = String((e as any).code || (e as any).errcode || '').toUpperCase();

  // 5-request-per-mentee limit
  if (
    rawMessage.includes('pending request') &&
    rawMessage.includes('limit')
  ) {
    return {
      code: 'PENDING_REQUEST_LIMIT',
      message:
        "You've reached the maximum number of active mentorship requests. Cancel one to request a new mentor.",
    };
  }

  // Mentor not selectable (blocked / rejected / hidden)
  if (
    rawMessage.includes('mentor not selectable') ||
    rawMessage.includes('not available for selection')
  ) {
    return {
      code: 'MENTOR_NOT_SELECTABLE',
      message: 'This mentor is not available for new mentorships right now.',
    };
  }

  // Mentor capacity reached
  if (
    rawMessage.includes('reached their mentee capacity') ||
    rawMessage.includes('mentor at capacity') ||
    rawMessage.includes('no remaining capacity') ||
    rawMessage.includes('at capacity')
  ) {
    return {
      code: 'MENTOR_AT_CAPACITY',
      message: 'This mentor is at full capacity and cannot take more mentees.',
    };
  }

  // Duplicate request / existing relationship
  if (
    rawMessage.includes('request_already_exists') ||
    rawMessage.includes('already have a mentorship request') ||
    rawMessage.includes('duplicate') ||
    rawMessage.includes('already exists')
  ) {
    return {
      code: 'REQUEST_ALREADY_EXISTS',
      message:
        'You already have a request or mentorship relationship with this mentor.',
    };
  }

  // RLS / authorization failures
  if (
    rawMessage.includes('not authenticated') ||
    pgCode === '42501' ||
    rawMessage.includes('permission denied') ||
    rawMessage.includes('rls') ||
    rawMessage.includes('not allowed')
  ) {
    return {
      code: 'NOT_AUTHORIZED',
      message: "You're not allowed to perform this action.",
    };
  }

  return {
    code: 'UNKNOWN',
    message: (error as any).message || 'Something went wrong. Please try again.',
  };
}
