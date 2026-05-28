/**
 * @fileoverview Standardized error mapping for Jobs module
 * Maps backend errors to user-friendly messages
 */

// Error code to user message mapping
export const JOB_ERROR_CODES = {
  JOB_NOT_FOUND: 'The job you are looking for does not exist or has been removed.',
  JOB_EXPIRED: 'This job listing has expired and is no longer accepting applications.',
  JOB_PAUSED: 'This job listing is currently paused by the employer.',
  JOB_REJECTED: 'This job listing has been rejected by administrators.',
  NOT_AUTHORIZED: 'You do not have permission to perform this action.',
  RATE_LIMIT_EXCEEDED: 'You have exceeded the rate limit. Please try again later.',
  INVALID_URL: 'The provided URL is invalid. Please use http://, https://, or mailto: links.',
  INVALID_SALARY: 'Invalid salary range. Minimum salary cannot exceed maximum salary.',
  ALREADY_APPLIED: 'You have already applied to this job.',
  BLOCKED_USER: 'Your account is blocked. Please contact support.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};

// PostgreSQL error code mapping
const PG_ERROR_MAP = {
  '23505': 'This record already exists.',
  '23503': 'This operation references data that does not exist.',
  '23514': 'The provided data does not meet validation requirements.',
  '42501': 'You do not have permission to perform this action.',
  '42883': 'This operation is not available.',
  'PGRST116': 'No matching record found.',
  'PGRST202': 'This operation is not available.',
};

/**
 * Maps a Supabase/PostgreSQL error to a user-friendly message
 * @param {Error|object} error - The error object from Supabase
 * @returns {string} User-friendly error message
 */
export function mapJobError(error) {
  if (!error) return JOB_ERROR_CODES.UNKNOWN_ERROR;
  
  const message = error?.message || error?.error_description || '';
  const code = error?.code || '';
  const details = error?.details || '';
  
  // Check for specific error patterns
  if (message.includes('rate limit') || message.includes('Rate limit')) {
    return JOB_ERROR_CODES.RATE_LIMIT_EXCEEDED;
  }
  
  if (message.includes('blocked') || message.includes('Blocked')) {
    return JOB_ERROR_CODES.BLOCKED_USER;
  }
  
  if (message.includes('not found') || code === 'PGRST116') {
    return JOB_ERROR_CODES.JOB_NOT_FOUND;
  }
  
  if (message.includes('permission') || message.includes('authorized') || code === '42501') {
    return JOB_ERROR_CODES.NOT_AUTHORIZED;
  }
  
  if (message.includes('URL') || message.includes('url')) {
    return JOB_ERROR_CODES.INVALID_URL;
  }
  
  if (message.includes('salary')) {
    return JOB_ERROR_CODES.INVALID_SALARY;
  }
  
  if (message.includes('already applied') || message.includes('duplicate')) {
    return JOB_ERROR_CODES.ALREADY_APPLIED;
  }
  
  // Check PostgreSQL error codes
  if (PG_ERROR_MAP[code]) {
    return PG_ERROR_MAP[code];
  }
  
  // Network errors
  if (error instanceof TypeError && message.includes('fetch')) {
    return JOB_ERROR_CODES.NETWORK_ERROR;
  }
  
  // Return the original message if it's user-friendly enough
  if (message && message.length < 200 && !message.includes('SQL') && !message.includes('pg_')) {
    return message;
  }
  
  return JOB_ERROR_CODES.UNKNOWN_ERROR;
}

/**
 * Determines if an error is retryable
 * @param {Error|object} error - The error object
 * @returns {boolean} Whether the operation can be retried
 */
export function isRetryableError(error) {
  if (!error) return false;
  
  const code = error?.code || '';
  const message = error?.message || '';
  
  // Network errors are retryable
  if (error instanceof TypeError && message.includes('fetch')) {
    return true;
  }
  
  // Rate limit errors are retryable after waiting
  if (message.includes('rate limit')) {
    return true;
  }
  
  // Timeout errors are retryable
  if (message.includes('timeout') || code === 'ETIMEDOUT') {
    return true;
  }
  
  // Server errors (5xx) are retryable
  if (error?.status >= 500 && error?.status < 600) {
    return true;
  }
  
  return false;
}

/**
 * Gets the appropriate HTTP status code for an error
 * @param {Error|object} error - The error object
 * @returns {number} HTTP status code
 */
export function getErrorStatusCode(error) {
  if (!error) return 500;
  
  const code = error?.code || '';
  const message = error?.message || '';
  
  if (code === '42501' || message.includes('permission') || message.includes('authorized')) {
    return 403;
  }
  
  if (code === 'PGRST116' || message.includes('not found')) {
    return 404;
  }
  
  if (code === '23505' || message.includes('duplicate')) {
    return 409;
  }
  
  if (message.includes('rate limit')) {
    return 429;
  }
  
  if (message.includes('validation') || code === '23514') {
    return 400;
  }
  
  return error?.status || 500;
}

export default {
  JOB_ERROR_CODES,
  mapJobError,
  isRetryableError,
  getErrorStatusCode,
};
