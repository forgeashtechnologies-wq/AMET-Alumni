// Shared account status helper for profiles/users
// Normalizes approval + active/deleted flags into a single status code + label + badge style.

export const ACCOUNT_STATUS_CODES = {
  APPROVED: 'approved',
  PENDING: 'pending',
  REJECTED: 'rejected',
  BLOCKED: 'blocked',
  DELETED: 'deleted',
  UNKNOWN: 'unknown',
};

export const ACCOUNT_STATUS_META = {
  [ACCOUNT_STATUS_CODES.APPROVED]: {
    label: 'Approved',
    badgeClass: 'bg-green-100 text-green-800',
    tone: 'success',
  },
  [ACCOUNT_STATUS_CODES.PENDING]: {
    label: 'Pending',
    badgeClass: 'bg-yellow-100 text-yellow-800',
    tone: 'warning',
  },
  [ACCOUNT_STATUS_CODES.REJECTED]: {
    label: 'Rejected',
    badgeClass: 'bg-red-100 text-red-800',
    tone: 'error',
  },
  [ACCOUNT_STATUS_CODES.BLOCKED]: {
    label: 'Blocked',
    badgeClass: 'bg-orange-100 text-orange-800',
    tone: 'error',
  },
  [ACCOUNT_STATUS_CODES.DELETED]: {
    label: 'Deleted',
    badgeClass: 'bg-gray-100 text-gray-600',
    tone: 'muted',
  },
  [ACCOUNT_STATUS_CODES.UNKNOWN]: {
    label: 'Unknown',
    badgeClass: 'bg-gray-100 text-gray-800',
    tone: 'muted',
  },
};

/**
 * Compute a normalized account status for a user/profile-like row.
 * Accepts either DB columns (approval_status, alumni_verification_status, is_approved, is_active, is_deleted)
 * or the AuthContext-style flags (approvalStatus, isFullyApproved).
 */
export function getAccountStatus(input) {
  const src = input || {};

  const isDeleted = src.is_deleted === true;
  const isActive = src.is_active !== false; // default to active when null/undefined

  const approvalRaw =
    src.approvalStatus ??
    src.approval_status ??
    src.alumni_verification_status ??
    (src.is_approved === true ? 'approved' : null);

  let code = ACCOUNT_STATUS_CODES.UNKNOWN;

  if (isDeleted) {
    code = ACCOUNT_STATUS_CODES.DELETED;
  } else if (!isActive) {
    code = ACCOUNT_STATUS_CODES.BLOCKED;
  } else if (approvalRaw === 'rejected') {
    code = ACCOUNT_STATUS_CODES.REJECTED;
  } else if (approvalRaw === 'approved') {
    code = ACCOUNT_STATUS_CODES.APPROVED;
  } else if (approvalRaw === 'pending' || approvalRaw === null || approvalRaw === undefined) {
    code = ACCOUNT_STATUS_CODES.PENDING;
  }

  const meta = ACCOUNT_STATUS_META[code] || ACCOUNT_STATUS_META[ACCOUNT_STATUS_CODES.UNKNOWN];

  return {
    ...meta,
    code,
    approvalStatus: approvalRaw || null,
    isActive,
    isDeleted,
    // Mirrors backend fc_is_fully_approved where provided by AuthContext/useApproval
    isFullyApproved: !!src.isFullyApproved,
  };
}
