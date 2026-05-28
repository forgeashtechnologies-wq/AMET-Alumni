import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getMentorshipStatusMessage } from '../../utils/mentorshipStatus';
import { useMentorshipSummary } from '../../hooks/useMentorshipSummary';

/**
 * Displays a single, unified status banner for mentorship program
 * Shows blocking/important conditions (profile incomplete, pending approval, at capacity, etc.)
 */
export default function MentorshipStatusBanner() {
  const { profile } = useAuth();
  const location = useLocation();
  const {
    hasAnyOutgoingRequests,
    hasAnyActiveMentor,
    hasMentorProfile,
    mentorProfileStatus,
    isApprovedMentor,
    mentorRow,
  } = useMentorshipSummary();

  // Mentor-track messages (application status, capacity hints)
  const mentorMessages = useMemo(() => {
    if (!profile) return { mentee: null, mentor: null };
    return getMentorshipStatusMessage(profile, mentorRow);
  }, [profile, mentorRow]);

  // Mentee-track banner: onboarding vs optional improvement
  const menteeMessage = useMemo(() => {
    if (!profile) return null;

    const hasActivity = hasAnyOutgoingRequests || hasAnyActiveMentor;

    // 1) Onboarding mentee (new user, no activity)
    if (!hasActivity) {
      return {
        type: 'warning',
        title: 'Get better mentor matches',
        body: 'Add your interests and preferences to help mentors understand how to support you.',
        ctaLabel: 'Update mentorship goals',
        // Reuse existing flow for mentorship details (mentee goals route can be swapped in later)
        ctaHref: '/mentorship/become-mentor',
      };
    }

    // 2) Active mentee (has requests or mentor) – optional improvement banner
    return {
      type: 'info',
      title: 'Improve your mentorship experience',
      body: 'You can add your goals and preferences to help mentors tailor their guidance.',
      ctaLabel: 'Update mentorship goals',
      ctaHref: '/mentorship/become-mentor',
    };
  }, [
    profile,
    hasAnyOutgoingRequests,
    hasAnyActiveMentor,
    isApprovedMentor,
  ]);

  // Determine which message to show based on current route
  const currentPath = location.pathname;
  const showMenteeFirst = currentPath.includes('/find') || currentPath.includes('/requests');
  const showMentorFirst = currentPath.includes('/requests-to-me') || currentPath.includes('/me');

  // For dual-role approved mentors, the My Mentorship hub should not show a large
  // onboarding banner; rely on the My Mentorship page itself for status.
  if (currentPath.includes('/me') && isApprovedMentor) {
    return null;
  }

  // Select primary message based on context
  let primaryMessage = null;
  let secondaryMessage = null;

  const mentorMessage = mentorMessages.mentor;

  if (showMenteeFirst) {
    primaryMessage = menteeMessage;
    secondaryMessage = mentorMessage;
  } else if (showMentorFirst) {
    primaryMessage = mentorMessage;
    secondaryMessage = menteeMessage;
  } else {
    // Default: show mentee first, then mentor if both exist
    primaryMessage = menteeMessage || mentorMessage;
    secondaryMessage = menteeMessage && mentorMessage ? mentorMessage : null;
  }

  // Don't show banner if no messages
  if (!primaryMessage && !secondaryMessage) return null;

  const typeStyles = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: 'ℹ️',
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: '✓',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: '⚠️',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: '✕',
    },
  };

  const renderBanner = (message) => {
    if (!message) return null;

    const style = typeStyles[message.type] || typeStyles.info;

    return (
      <div className={`${style.bg} border-b ${style.border}`} role="status" aria-live="polite">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0" aria-hidden="true">
              {style.icon}
            </span>
            <div className="flex-1 min-w-0">
              <h3 className={`text-sm sm:text-base font-semibold ${style.text}`}>
                {message.title}
              </h3>
              <p className={`mt-1 text-sm ${style.text} opacity-90`}>
                {message.body}
              </p>
              {message.ctaLabel && message.ctaHref && (
                <Link
                  to={message.ctaHref}
                  className={`mt-3 inline-block px-4 py-2 text-sm font-medium ${style.text} bg-white border ${style.border} rounded-md hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors`}
                >
                  {message.ctaLabel}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderBanner(primaryMessage)}
      {secondaryMessage && renderBanner(secondaryMessage)}
    </>
  );
}
