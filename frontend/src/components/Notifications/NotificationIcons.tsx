import { BellIcon, UserGroupIcon, EnvelopeIcon, CalendarIcon, BriefcaseIcon, ClipboardDocumentCheckIcon, AcademicCapIcon, UsersIcon, ExclamationTriangleIcon, UserIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export const iconForType = (type: string, metadata?: Record<string, any>) => {
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
      return UsersIcon;
    case 'group_membership_approved':
      return CheckCircleIcon;
    case 'group_membership_rejected':
    case 'group_admin_risk':
      return ExclamationTriangleIcon;
    case 'alert':
      return ExclamationTriangleIcon;
    default:
      return BellIcon;
  }
};
