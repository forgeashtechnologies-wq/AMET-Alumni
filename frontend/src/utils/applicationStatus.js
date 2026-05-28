// Canonical job application status helpers (JS wrapper)
// Keep this in sync with backend job_applications.status CHECK constraint

export const APPLICATION_STATUS = [
  'submitted',
  'under_review',
  'shortlisted',
  'interviewing',
  'offered',
  'hired',
  'rejected',
  'withdrawn',
];

const LEGACY_TO_CANONICAL = {
  // Submitted
  submitted: 'submitted',
  applied: 'submitted',
  pending: 'submitted',

  // Under review
  review: 'under_review',
  reviewing: 'under_review',
  reviewed: 'under_review',
  under_review: 'under_review',
  in_progress: 'under_review',

  // Shortlisted
  shortlisted: 'shortlisted',

  // Interviewing
  interview: 'interviewing',
  interviewing: 'interviewing',

  // Offered
  offer: 'offered',
  offered: 'offered',

  // Hired
  hired: 'hired',

  // Rejected
  rejected: 'rejected',
  declined: 'rejected',

  // Withdrawn
  withdrawn: 'withdrawn',
};

export function normalizeStatus(raw) {
  const key = (raw || '').toLowerCase().trim();
  const mapped = LEGACY_TO_CANONICAL[key];
  if (mapped) return mapped;
  if (APPLICATION_STATUS.includes(key)) {
    return key;
  }
  return 'submitted';
}

export const STATUS_LABEL = {
  submitted: 'Submitted',
  under_review: 'Under review',
  shortlisted: 'Shortlisted',
  interviewing: 'Interviewing',
  offered: 'Offer received',
  hired: 'Hired',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export const STATUS_BADGE_CLASS = {
  submitted: 'bg-ocean-100 text-ocean-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  shortlisted: 'bg-indigo-100 text-indigo-800',
  interviewing: 'bg-purple-100 text-purple-800',
  offered: 'bg-green-100 text-green-800',
  hired: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-800',
};
