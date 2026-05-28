// frontend/src/components/Mentorship/MentorshipStatusChip.jsx
import React from 'react';
import clsx from 'clsx';

/**
 * Shared status chip component for all mentorship statuses.
 * Provides consistent labels and colors across the mentorship module.
 * 
 * @param {Object} props
 * @param {'request'|'relationship'} props.type - Type of status
 * @param {string} props.status - Status value
 * @param {string} [props.endedBy] - Who ended the relationship (for relationships)
 * @param {string} [props.className] - Additional CSS classes
 */
export function MentorshipStatusChip(props) {
  const { type, status, endedBy, className } = props;

  let label = '';
  let variant = 'muted'; // info | success | warning | danger | muted

  if (type === 'request') {
    switch (status) {
      case 'pending':
        label = 'Pending';
        variant = 'warning';
        break;
      case 'accepted':
        label = 'Accepted';
        variant = 'success';
        break;
      case 'rejected':
        label = 'Declined';
        variant = 'danger';
        break;
      case 'cancelled_by_user':
        label = 'Cancelled';
        variant = 'muted';
        break;
      case 'cancelled_by_system':
        label = 'Cancelled by system';
        variant = 'muted';
        break;
      default:
        label = String(status || '').toUpperCase() || 'Unknown';
        variant = 'muted';
        break;
    }
  } else {
    // relationship
    switch (status) {
      case 'active':
        label = 'Active';
        variant = 'success';
        break;
      case 'completed':
        label = 'Completed';
        variant = 'info';
        break;
      case 'ended_by_mentor':
        label = 'Ended by mentor';
        variant = 'muted';
        break;
      case 'ended_by_mentee':
        label = 'Ended by mentee';
        variant = 'muted';
        break;
      case 'ended_by_system':
        label = 'Ended by platform';
        variant = 'muted';
        break;
      default:
        label = String(status || '').toUpperCase() || 'Unknown';
        variant = 'muted';
        break;
    }
  }

  const base =
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold';
  const variantClasses =
    variant === 'success'
      ? 'bg-emerald-100 text-emerald-800'
      : variant === 'warning'
      ? 'bg-amber-100 text-amber-800'
      : variant === 'danger'
      ? 'bg-rose-100 text-rose-800'
      : variant === 'info'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-slate-100 text-slate-600';

  return (
    <span className={clsx(base, variantClasses, className)}>
      {label}
    </span>
  );
}

export default MentorshipStatusChip;
