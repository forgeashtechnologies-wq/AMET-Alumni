import { useMemo } from 'react';
import { useMentorshipRoleContext } from './useMentorshipRoleContext';

type BannerConfig = {
  variant: 'info' | 'success' | 'warning' | 'danger';
  role: 'mentee' | 'mentor' | 'both';
  title: string;
  body: string;
  primaryCta?: { label: string; to: string };
  secondaryCta?: { label: string; to: string };
};

/**
 * Computes which banners to show based on mentorship role/status.
 * Returns an ordered list of banner configurations (max 2).
 */
export function useMentorshipBannerModel(): BannerConfig[] {
  const roleContext = useMentorshipRoleContext();
  
  return useMemo(() => {
    const banners: BannerConfig[] = [];
    
    const {
      isMenteeApproved,
      hasMentorProfile,
      mentorStatus,
      isDualRole,
      menteeActiveCount,
      menteeRequestsSentCount,
      mentorCapacity,
      mentorCurrentMentees,
    } = roleContext;
    
    // Mentee banners
    if (!isMenteeApproved) {
      banners.push({
        variant: 'warning',
        role: 'mentee',
        title: 'Complete your profile to request a mentor',
        body: 'Before you can request mentorship, we need a few more details about your background and goals.',
        primaryCta: {
          label: 'Complete my profile',
          to: '/mentorship?tab=settings&mode=mentee',
        },
      });
    } else if (isMenteeApproved && !hasMentorProfile) {
      // Mentee-only user
      if (!menteeActiveCount && !menteeRequestsSentCount) {
        banners.push({
          variant: 'info',
          role: 'mentee',
          title: 'Find a mentor to get started',
          body: 'Browse alumni mentors who match your interests and send a mentorship request.',
          primaryCta: {
            label: 'Browse mentors',
            to: '/mentorship?tab=find',
          },
        });
      } else if (menteeRequestsSentCount && menteeRequestsSentCount > 0) {
        banners.push({
          variant: 'info',
          role: 'mentee',
          title: 'You have mentorship requests waiting',
          body: "You'll get an email and in-app notification when your requests are accepted or declined.",
          primaryCta: {
            label: 'View my requests',
            to: '/mentorship?tab=requests&sub=sent',
          },
        });
      }
    }
    
    // Mentor banners
    if (!hasMentorProfile && isMenteeApproved) {
      // Soft CTA for mentee-approved users to become mentors
      banners.push({
        variant: 'info',
        role: 'mentor',
        title: 'Share your experience as a mentor',
        body: 'Create a mentor profile so students and younger alumni can request mentorship from you.',
        primaryCta: {
          label: 'Become a mentor',
          to: '/mentorship?tab=settings&mode=mentor',
        },
      });
    } else if (hasMentorProfile) {
      if (mentorStatus === 'pending') {
        banners.push({
          variant: 'warning',
          role: 'mentor',
          title: 'Your mentor profile is under review',
          body: "We're reviewing your mentor application. You'll be notified once it's approved.",
          primaryCta: {
            label: 'Review my profile',
            to: '/mentorship?tab=settings&mode=mentor',
          },
        });
      } else if (mentorStatus === 'rejected') {
        banners.push({
          variant: 'danger',
          role: 'mentor',
          title: 'Your mentor application needs attention',
          body: 'Please review the feedback and update your profile to reapply.',
          primaryCta: {
            label: 'Review feedback',
            to: '/mentorship?tab=settings&mode=mentor',
          },
        });
      } else if (mentorStatus === 'approved') {
        const atCapacity = 
          mentorCapacity && 
          mentorCurrentMentees && 
          mentorCurrentMentees >= mentorCapacity;
        
        if (atCapacity) {
          banners.push({
            variant: 'warning',
            role: 'mentor',
            title: "You're at your mentee capacity",
            body: 'New mentorship requests are paused until you increase your capacity or complete an existing mentorship.',
            primaryCta: {
              label: 'Manage capacity',
              to: '/mentorship?tab=settings&mode=mentor',
            },
          });
        }
      }
    }
    
    // Limit to 2 banners max (one mentee, one mentor)
    return banners.slice(0, 2);
  }, [roleContext]);
}
