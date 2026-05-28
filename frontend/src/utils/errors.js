// Centralized friendly error message mapping
// Usage: import { getFriendlyErrorMessage } from '../utils/errors';
// toast.error(getFriendlyErrorMessage(err, 'Fallback message'))

export function getFriendlyErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  const code = String(err?.code ?? '').toLowerCase();
  const status = String(err?.status ?? '').toLowerCase();
  const msg = String(err?.message ?? '').toLowerCase();
  const details = String(err?.details ?? '').toLowerCase();
  const hint = String(err?.hint ?? '').toLowerCase();
  const full = `${msg} ${details} ${hint}`.trim();

  // Rate limit
  if (code === '42901' || status === '429' || /rate_limit|too many .* actions in this window/i.test(full)) {
    if (/group_create/i.test(full)) {
      return 'You have reached the daily group creation limit. Please try again tomorrow.';
    }
    return 'Too many requests. Please wait a bit and try again.';
  }

  // Explicit employer policy block
  if (code === 'employer_policy' || /employers cannot perform this action/i.test(full)) {
    return 'Employers cannot perform this action.';
  }

  // PostgREST single-row mismatch (common when an entity becomes hidden/pending)
  if (/json object requested, multiple \(or no\) rows returned/i.test(full)) {
    return 'This item is currently not available. It may be pending review or archived.';
  }

  // Permission denied
  if (code === '42501' || status === '403' || /permission denied|rls|not allowed|forbidden/i.test(full)) {
    return "You don't have permission for that.";
  }

  // Duplicate/unique violations
  if (code === '23505' || /duplicate|unique constraint/i.test(full)) {
    // Profiles: email/phone already tied to another user
    if (/uq_profiles_email_lower|uniq_profiles_email_active|profiles_phone_unique/i.test(full)) {
      return 'An account with this email or phone number already exists. Please log in or contact support.';
    }

    // Groups: name uniqueness (normalized)
    if (/uq_groups_name_norm_active|name_norm/i.test(full)) {
      return 'A group with this name already exists. Please choose a different name.';
    }

    // Default for membership/connection/group-style duplicates
    return 'Already a member or request pending.';
  }

  // Not found
  if (status === '404' || /not found|no row/i.test(full)) {
    return 'We could not find what you were looking for.';
  }

  // Network/timeout
  if (/network|fetch failed|timeout|timed out|connection/i.test(full)) {
    return 'Network error. Please check your connection and try again.';
  }

  // Storage issues (common patterns)
  if (/bucket|storage|upload|download/i.test(full)) {
    return 'There was a problem handling your file. Please try again.';
  }

  return fallback;
}

export function toFriendlyToast(toast, err, fallback) {
  try {
    const msg = getFriendlyErrorMessage(err, fallback);
    toast.error(msg);
  } catch (_) {
    toast.error(fallback || 'Something went wrong. Please try again.');
  }
}