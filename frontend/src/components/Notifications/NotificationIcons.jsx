import { BellIcon, UserGroupIcon, EnvelopeIcon, CalendarIcon, BriefcaseIcon, ClipboardDocumentCheckIcon, AcademicCapIcon, UsersIcon, ExclamationTriangleIcon, UserIcon } from '@heroicons/react/24/outline';

export const iconForType = (type, metadata) => {
  switch (type) {
    case 'system':
      if (metadata && metadata.original_type === 'profile') return UserIcon; // profile→system special case
      return BellIcon;
    case 'connection':
      return UserGroupIcon;
    case 'message':
      return EnvelopeIcon;
    case 'event':
    case 'event_created':
    case 'event_published':
    case 'event_updated':
      return CalendarIcon;
    case 'job':
    case 'job_posted':
    case 'job_approved':
    case 'job_applied':
      return BriefcaseIcon;
    case 'application':
    case 'application_status':
      return ClipboardDocumentCheckIcon;
    case 'mentorship':
      return AcademicCapIcon;
    case 'group':
    case 'group_join_request':
    case 'group_membership_approved':
    case 'group_membership_rejected':
    case 'group_approved':
    case 'group_rejected':
    case 'group_admin_risk':
    case 'group_invite':
    case 'group_invite_accepted':
      return UsersIcon;
    case 'alert':
      return ExclamationTriangleIcon;
    default:
      return BellIcon;
  }
};
