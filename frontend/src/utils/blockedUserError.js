import toast from 'react-hot-toast';

/**
 * Check if an error is a blocked user error (PBLCK code or user_blocked hint)
 * @param {Error|object} error - The error object from Supabase
 * @returns {boolean} - True if this is a blocked user error
 */
export function isBlockedUserError(error) {
  if (!error) return false;
  
  // Check for custom PBLCK error code
  if (error.code === 'PBLCK') return true;
  
  // Check for hint
  if (error.hint === 'user_blocked') return true;
  
  // Check for message patterns
  const message = error.message || String(error);
  if (message.includes('Account is restricted')) return true;
  if (message.includes('user_blocked')) return true;
  
  return false;
}

/**
 * Handle a blocked user error by showing a toast
 * @param {Error|object} error - The error object
 * @returns {boolean} - True if the error was handled as a blocked user error
 */
export function handleBlockedUserError(error) {
  if (isBlockedUserError(error)) {
    toast.error(
      'Your account has been restricted. You cannot perform this action. Please contact support if you believe this is an error.',
      { duration: 5000, id: 'blocked-user-error' }
    );
    return true;
  }
  return false;
}

/**
 * Wrapper for async actions that handles blocked user errors
 * @param {Function} action - The async action to perform
 * @param {object} options - Options
 * @param {Function} options.onBlocked - Callback when user is blocked
 * @param {Function} options.onError - Callback for other errors
 * @returns {Promise<any>} - The result of the action
 */
export async function withBlockedCheck(action, options = {}) {
  try {
    return await action();
  } catch (error) {
    if (isBlockedUserError(error)) {
      handleBlockedUserError(error);
      if (options.onBlocked) options.onBlocked(error);
      return null;
    }
    if (options.onError) options.onError(error);
    throw error;
  }
}

export default {
  isBlockedUserError,
  handleBlockedUserError,
  withBlockedCheck,
};
