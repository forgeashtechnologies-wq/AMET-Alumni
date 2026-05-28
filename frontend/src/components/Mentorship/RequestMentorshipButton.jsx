import React, { useState } from 'react';
import { useApproval } from '../../hooks/useApproval';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { useCreateMentorshipRequest } from '../../hooks/useMentorshipMutations';
import { CheckCircleIcon, ClockIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';

export default function RequestMentorshipButton({
  mentorId,
  disabled = false,
  requested = false,
  requestStatus = null,
  disabledReason,
  onSuccess,
}) {
  const { loading, isApprovedMentee } = useApproval();
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();
  const createMutation = useCreateMentorshipRequest();

  const isOwnerMentor = !!user && !!mentorId && user.id === mentorId;

  const onClick = async () => {
    if (!isApprovedMentee) {
      toast.error('Your profile is not approved. Kindly contact administrator.');
      return;
    }
    if (requested) return; // already requested
    if (isOwnerMentor) {
      toast.error("You can't join your own mentorship as a mentee.");
      return;
    }
    try {
      setBusy(true);
      // RPC handles auth, eligibility, capacity, and duplicate checks server-side
      await createMutation.mutateAsync({ mentorId });

      setSuccess(true);
      toast.success('Mentorship request sent! The mentor will review your request.');
      
      // Emit global event so other screens (Mentorship.js) can refresh
      window.dispatchEvent(
        new CustomEvent('mentorship:request:created', {
          detail: { mentorId, menteeId: user?.id },
        })
      );
      if (typeof onSuccess === 'function') {
        onSuccess({ mentorId, menteeId: user?.id });
      }
      
      // Reset success state after animation
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      // Error toasts are already handled inside the mutation via mapMentorshipError
    } finally {
      setBusy(false);
    }
  };

  const activeStatus = requestStatus || (requested ? 'pending' : null);
  const hasOpenRequest = activeStatus === 'pending' || activeStatus === 'accepted';
  const isDisabled = loading || busy || !isApprovedMentee || !!disabled || hasOpenRequest;

  // Determine button label for accessibility
  const getAriaLabel = () => {
    if (isOwnerMentor) return 'You are the mentor for this program';
    if (activeStatus === 'accepted') return 'Mentorship request accepted';
    if (activeStatus === 'pending') return 'Mentorship request pending review';
    if (!isApprovedMentee) return 'Your profile must be approved to request mentorship';
    if (disabled && disabledReason) return disabledReason;
    if (disabled) return 'This mentor is not accepting requests right now';
    if (busy) return 'Sending mentorship request';
    return 'Request mentorship from this mentor';
  };

  // Owner mentor badge
  if (isOwnerMentor) {
    return (
      <div 
        className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-3 py-1.5 text-xs font-semibold"
        role="status"
      >
        <CheckCircleIcon className="w-4 h-4 mr-1.5" aria-hidden="true" />
        <span>You are the mentor</span>
      </div>
    );
  }

  // Accepted status badge
  if (activeStatus === 'accepted') {
    return (
      <div 
        className="inline-flex items-center rounded-lg bg-emerald-100 text-emerald-800 px-4 py-2 text-sm font-semibold"
        role="status"
        aria-label="Mentorship request accepted"
      >
        <CheckCircleIcon className="w-4 h-4 mr-2" aria-hidden="true" />
        <span>Request Accepted</span>
      </div>
    );
  }

  // Pending status badge
  if (activeStatus === 'pending') {
    return (
      <div 
        className="inline-flex items-center rounded-lg bg-amber-100 text-amber-800 px-4 py-2 text-sm font-semibold"
        role="status"
        aria-label="Mentorship request pending review"
      >
        <ClockIcon className="w-4 h-4 mr-2" aria-hidden="true" />
        <span>Request Pending</span>
      </div>
    );
  }

  // Request button
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-label={getAriaLabel()}
      aria-busy={busy}
      aria-disabled={isDisabled}
      title={
        !isApprovedMentee
          ? 'Your profile is not approved. Kindly contact administrator.'
          : disabled && disabledReason
            ? disabledReason
            : disabled
              ? "This mentor isn't accepting requests right now."
              : undefined
      }
      className={`
        inline-flex items-center justify-center gap-2 tap-target
        rounded-lg px-4 py-2.5 text-sm font-semibold
        transition-all duration-fast
        ${success 
          ? 'bg-emerald-500 text-white' 
          : 'bg-ocean-500 text-white hover:bg-ocean-600'
        }
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2
        disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-ocean-500
        active:scale-[0.98]
      `}
    >
      {busy ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          <span>Sending…</span>
        </>
      ) : success ? (
        <>
          <CheckCircleIcon className="w-4 h-4" aria-hidden="true" />
          <span>Request Sent!</span>
        </>
      ) : (
        <>
          <UserPlusIcon className="w-4 h-4" aria-hidden="true" />
          <span>Request Mentorship</span>
        </>
      )}
    </button>
  );
}
