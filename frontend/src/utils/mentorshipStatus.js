/**
 * Unified status mapping system for mentorship module
 * Ensures consistent status display across all components
 */

// Request status enum mapping
export const REQUEST_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CANCELLED_BY_USER: 'cancelled_by_user',
  CANCELLED_BY_SYSTEM: 'cancelled_by_system',
};

// Relationship status enum mapping
export const RELATIONSHIP_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  PAUSED: 'paused',
  TERMINATED: 'terminated',
};

// User-level status
export const MENTEE_STATUS = {
  NOT_SETUP: 'not_setup',
  INCOMPLETE: 'incomplete',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  SUSPENDED: 'suspended',
};

export const MENTOR_STATUS = {
  NOT_SETUP: 'not_setup',
  INCOMPLETE: 'incomplete',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  AT_CAPACITY: 'at_capacity',
  PAUSED: 'paused',
  SUSPENDED: 'suspended',
};

/**
 * Get UI representation for request status
 * @param {string} status - Request status enum value
 * @returns {Object} { text, color, icon, ariaLabel }
 */
export function getRequestStatusUI(status) {
  const statusMap = {
    [REQUEST_STATUS.PENDING]: {
      text: 'Pending',
      color: 'yellow',
      bgClass: 'bg-yellow-100',
      textClass: 'text-yellow-800',
      icon: '⏳',
      ariaLabel: 'Waiting for response, pending status',
    },
    [REQUEST_STATUS.ACCEPTED]: {
      text: 'Accepted',
      color: 'green',
      bgClass: 'bg-green-100',
      textClass: 'text-green-800',
      icon: '✓',
      ariaLabel: 'Request accepted, active status',
    },
    [REQUEST_STATUS.REJECTED]: {
      text: 'Declined',
      color: 'red',
      bgClass: 'bg-red-100',
      textClass: 'text-red-800',
      icon: '✕',
      ariaLabel: 'Request declined',
    },
    [REQUEST_STATUS.CANCELLED_BY_USER]: {
      text: 'Cancelled',
      color: 'gray',
      bgClass: 'bg-gray-100',
      textClass: 'text-gray-800',
      icon: '○',
      ariaLabel: 'Request cancelled by you',
    },
    [REQUEST_STATUS.CANCELLED_BY_SYSTEM]: {
      text: 'Auto-cancelled',
      color: 'gray',
      bgClass: 'bg-gray-100',
      textClass: 'text-gray-800',
      icon: '○',
      ariaLabel: 'Request auto-cancelled by system',
    },
  };

  return statusMap[status] || {
    text: status || 'Unknown',
    color: 'gray',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-600',
    icon: '?',
    ariaLabel: `Status: ${status}`,
  };
}

/**
 * Get UI representation for relationship status
 * @param {string} status - Relationship status enum value
 * @returns {Object} { text, color, icon, ariaLabel }
 */
export function getRelationshipStatusUI(status) {
  const statusMap = {
    [RELATIONSHIP_STATUS.ACTIVE]: {
      text: 'Active',
      color: 'blue',
      bgClass: 'bg-blue-100',
      textClass: 'text-blue-800',
      icon: '●',
      ariaLabel: 'Active mentorship',
    },
    [RELATIONSHIP_STATUS.COMPLETED]: {
      text: 'Completed',
      color: 'green',
      bgClass: 'bg-green-100',
      textClass: 'text-green-800',
      icon: '✓',
      ariaLabel: 'Mentorship completed',
    },
    [RELATIONSHIP_STATUS.PAUSED]: {
      text: 'Paused',
      color: 'yellow',
      bgClass: 'bg-yellow-100',
      textClass: 'text-yellow-800',
      icon: '⏸',
      ariaLabel: 'Mentorship paused',
    },
    [RELATIONSHIP_STATUS.TERMINATED]: {
      text: 'Ended',
      color: 'gray',
      bgClass: 'bg-gray-100',
      textClass: 'text-gray-800',
      icon: '○',
      ariaLabel: 'Mentorship ended',
    },
  };

  return statusMap[status] || {
    text: status || 'Unknown',
    color: 'gray',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-600',
    icon: '?',
    ariaLabel: `Status: ${status}`,
  };
}

/**
 * Determine mentor capacity state from DB fields
 * @param {boolean} isAvailable - profiles.is_available_for_mentorship
 * @param {number} currentCount - current_mentees_count
 * @param {number} maxCount - max_mentees
 * @returns {string} 'accepting' | 'at_capacity' | 'not_accepting'
 */
export function getMentorCapacityState(isAvailable, currentCount, maxCount) {
  if (!isAvailable) return 'not_accepting';
  if (currentCount >= maxCount) return 'at_capacity';
  return 'accepting';
}

/**
 * Determine user's relationship state with a mentor
 * @param {string} mentorId - Mentor's user ID
 * @param {Array} requests - Array from v_my_mentorship_requests
 * @param {Array} relationships - Array from v_my_mentorship_relationships
 * @returns {string} 'none' | 'pending' | 'active'
 */
export function getUserRelationshipState(mentorId, requests = [], relationships = []) {
  // Check for active relationship
  const activeRel = relationships.find(
    (r) => r.mentor_id === mentorId && r.status === RELATIONSHIP_STATUS.ACTIVE
  );
  if (activeRel) return 'active';

  // Check for pending request
  const pendingReq = requests.find(
    (r) => r.mentor_id === mentorId && r.status === REQUEST_STATUS.PENDING
  );
  if (pendingReq) return 'pending';

  return 'none';
}

/**
 * Generate status banner message based on user's mentee/mentor status
 * @param {Object} profile - User profile with role flags
 * @param {Object} mentorRow - Mentor row if user is a mentor
 * @returns {Object|null} { type, title, body, ctaLabel, ctaHref } or null
 */
/**
 * Get separate mentee and mentor status messages
 * Returns an object with mentee and mentor properties, each can be null
 * This allows the UI to show appropriate messages based on context
 */
export function getMentorshipStatusMessage(profile, mentorRow) {
  const messages = {
    mentee: null,
    mentor: null,
  };

  // MENTEE TRACK: Profile completion and mentee approval
  if (profile && !profile.is_mentee_approved) {
    const isProfileComplete = profile.is_profile_complete === true;
    messages.mentee = {
      type: 'warning',
      title: 'Before you can request mentors',
      body: 'You need to complete your mentorship details before you can send mentorship requests.',
      ctaLabel: isProfileComplete ? 'Edit mentorship details' : 'Complete mentorship details',
      ctaHref: '/mentorship/become-mentor',
    };
  }

  // MENTOR TRACK: Application status
  if (mentorRow) {
    if (mentorRow.status === 'pending') {
      messages.mentor = {
        type: 'info',
        title: 'Your mentor profile status',
        body: "Your mentor application is under review. You'll be notified once approved.",
        ctaLabel: null,
        ctaHref: null,
      };
    } else if (mentorRow.status === 'rejected') {
      messages.mentor = {
        type: 'error',
        title: 'Your mentor profile status',
        body: 'Your mentor application was not approved. Please review the feedback and resubmit.',
        ctaLabel: 'Review and resubmit',
        ctaHref: '/mentorship/become-mentor',
      };
    } else if (mentorRow.status === 'approved') {
      // Check capacity only for approved mentors
      const current = mentorRow.current_mentees_count || 0;
      const max = mentorRow.max_mentees || 0;
      
      if (profile?.is_available_for_mentorship && current >= max) {
        messages.mentor = {
          type: 'info',
          title: 'You are at capacity',
          body: `You are currently mentoring ${current} of ${max} mentees. Update your capacity or pause accepting new requests.`,
          ctaLabel: 'Manage capacity',
          ctaHref: '/mentorship/me',
        };
      }
    }
  }

  return messages;
}
