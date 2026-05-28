import { useMemo } from 'react';
import { useMentorshipRoleContext } from './useMentorshipRoleContext';
import { MENTORSHIP_COPY } from '../constants/mentorshipCopy';

/**
 * Computes which banners to show based on mentorship role/status.
 * Returns an ordered list of banner configurations (max 2).
 * 
 * @returns {Array<Object>} Array of banner configs
 * @property {string} variant - 'info' | 'success' | 'warning' | 'danger'
 * @property {string} role - 'mentee' | 'mentor' | 'both'
 * @property {string} title
 * @property {string} body
 * @property {Object} [primaryCta] - { label: string, to: string }
 * @property {Object} [secondaryCta] - { label: string, to: string }
 */
export function useMentorshipBannerModel() {
  const roleContext = useMentorshipRoleContext();
  
  return useMemo(() => {
    const banners = [];
    
    const {
      isMenteeApproved,
      hasMentorProfile,
      mentorStatus,
      isDualRole,
      menteeActiveCount,
      menteeRequestsSentCount,
      mentorCapacity,
      mentorCurrentMentees,
      isStudent,
    } = roleContext;
    
    // Mentee banners
    if (!isMenteeApproved) {
      const copy = MENTORSHIP_COPY.banners.mentee.unapprovedProfile;
      banners.push({
        variant: 'warning',
        role: 'mentee',
        title: copy.title,
        body: copy.body,
        primaryCta: {
          label: copy.ctaLabel,
          to: copy.ctaHref,
        },
      });
    } else if (isMenteeApproved && !hasMentorProfile) {
      // Mentee-only user
      if (!menteeActiveCount && !menteeRequestsSentCount) {
        const copy = MENTORSHIP_COPY.banners.mentee.noMentorsYet;
        banners.push({
          variant: 'info',
          role: 'mentee',
          title: copy.title,
          body: copy.body,
          primaryCta: {
            label: copy.ctaLabel,
            to: copy.ctaHref,
          },
        });
      } else if (menteeRequestsSentCount && menteeRequestsSentCount > 0) {
        const copy = MENTORSHIP_COPY.banners.mentee.pendingRequestsOnly;
        banners.push({
          variant: 'info',
          role: 'mentee',
          title: copy.title,
          body: copy.body,
          primaryCta: {
            label: copy.ctaLabel,
            to: copy.ctaHref,
          },
        });
      } else if (menteeActiveCount && menteeActiveCount > 0) {
        const copy = MENTORSHIP_COPY.banners.mentee.hasActiveMentors;
        banners.push({
          variant: 'success',
          role: 'mentee',
          title: copy.title,
          body: copy.body,
          primaryCta: {
            label: copy.ctaLabel,
            to: copy.ctaHref,
          },
        });
      }
    }
    
    // Mentor banners (skip entirely for students)
    if (!isStudent) {
      if (!hasMentorProfile && isMenteeApproved) {
        // Soft CTA for mentee-approved users to become mentors
        const copy = MENTORSHIP_COPY.banners.mentor.noMentorProfile;
        banners.push({
          variant: 'info',
          role: 'mentor',
          title: copy.title,
          body: copy.body,
          primaryCta: {
            label: copy.ctaLabel,
            to: copy.ctaHref,
          },
        });
      } else if (hasMentorProfile) {
        if (mentorStatus === 'pending') {
          const copy = MENTORSHIP_COPY.banners.mentor.pendingApproval;
          banners.push({
            variant: 'warning',
            role: 'mentor',
            title: copy.title,
            body: copy.body,
            primaryCta: {
              label: copy.ctaLabel,
              to: copy.ctaHref,
            },
          });
        } else if (mentorStatus === 'rejected') {
          const copy = MENTORSHIP_COPY.banners.mentor.rejectedApplication;
          banners.push({
            variant: 'danger',
            role: 'mentor',
            title: copy.title,
            body: copy.body,
            primaryCta: {
              label: copy.ctaLabel,
              to: copy.ctaHref,
            },
          });
        } else if (mentorStatus === 'approved') {
          const atCapacity = 
            mentorCapacity && 
            mentorCurrentMentees && 
            mentorCurrentMentees >= mentorCapacity;
          
          if (atCapacity) {
            const copy = MENTORSHIP_COPY.banners.mentor.approvedAtCapacity;
            banners.push({
              variant: 'warning',
              role: 'mentor',
              title: copy.title,
              body: copy.body,
              primaryCta: {
                label: copy.ctaLabel,
                to: copy.ctaHref,
              },
            });
          } else {
            const copy = MENTORSHIP_COPY.banners.mentor.approvedAvailable;
            banners.push({
              variant: 'success',
              role: 'mentor',
              title: copy.title,
              body: copy.body,
              primaryCta: {
                label: copy.ctaLabel,
                to: copy.ctaHref,
              },
            });
          }
        }
      }
    }
    
    // Limit to 2 banners max (one mentee, one mentor)
    return banners.slice(0, 2);
  }, [roleContext]);
}
