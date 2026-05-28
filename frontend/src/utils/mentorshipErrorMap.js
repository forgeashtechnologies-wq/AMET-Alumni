// frontend/src/utils/mentorshipErrorMap.js
// Runtime JS version of mentorship error mapping used by the UI.

function toLower(str) {
  return String(str || '').toLowerCase();
}

export function mapMentorshipError(error) {
  if (!error) {
    return {
      code: 'UNKNOWN',
      message: 'Something went wrong. Please try again.',
    };
  }

  const rawMessage = toLower(error.message || error.error_description || error.details);
  const pgCode = String(error.code || error.errcode || '').toUpperCase();

  // 5-request-per-mentee limit
  if (rawMessage.includes('pending request') && rawMessage.includes('limit')) {
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
    message: error.message || 'Something went wrong. Please try again.',
  };
}
