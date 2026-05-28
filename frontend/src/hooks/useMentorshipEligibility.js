import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApproval } from './useApproval';

// Frontend helper for mentorship-specific eligibility and messaging
export function useMentorshipEligibility() {
  const { profile } = useAuth();
  const approval = useApproval();

  return useMemo(() => {
    const baseProfile = profile || approval.profile || null;

    const approvalStatus = baseProfile?.approval_status || approval.approvalStatus || null;
    const menteeStatus = baseProfile?.mentee_status || null;
    const mentorStatus = baseProfile?.mentor_status || null;

    const hasExplicitMenteeStatus = typeof menteeStatus === 'string' && menteeStatus.length > 0;
    const hasExplicitMentorStatus = typeof mentorStatus === 'string' && mentorStatus.length > 0;

    const isApprovedMentee = hasExplicitMenteeStatus
      ? approvalStatus === 'approved' && menteeStatus === 'approved'
      : approval.isApprovedMentee;

    const isApprovedMentor = hasExplicitMentorStatus
      ? approvalStatus === 'approved' && mentorStatus === 'approved'
      : approval.isApprovedMentor;

    let menteeReason = undefined;
    let mentorReason = undefined;

    if (!isApprovedMentee) {
      if (approvalStatus !== 'approved') {
        menteeReason = 'Your profile has not been approved yet. Once an admin approves your profile, you can request mentorship.';
      } else if (hasExplicitMenteeStatus && menteeStatus !== 'approved') {
        menteeReason = 'Your mentee status is pending or not approved. You can request mentorship once your mentee status is approved.';
      }
    }

    if (!isApprovedMentor) {
      if (approvalStatus !== 'approved') {
        mentorReason = 'Your profile has not been approved yet. Once an admin approves your profile, you can receive mentorship requests.';
      } else if (hasExplicitMentorStatus && mentorStatus !== 'approved') {
        mentorReason = 'Your mentor status is pending or not approved. You can receive mentorship requests once your mentor status is approved.';
      }
    }

    const isDualRole = isApprovedMentee && isApprovedMentor;

    return {
      isApprovedMentee,
      isApprovedMentor,
      menteeReason,
      mentorReason,
      isDualRole,
      approvalStatus,
      menteeStatus,
      mentorStatus,
    };
  }, [profile, approval]);
}
