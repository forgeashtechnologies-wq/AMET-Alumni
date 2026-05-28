import React from 'react';
import { useApproval } from '../../hooks/useApproval';

// Guard component to restrict access based on approval status
export default function ApprovedGuard({
  require = 'approved',
  children,
  fallback = null,
  showBlockedMessage = true,
  skeleton = null,
}) {
  const {
    loading,
    isApproved,
    isApprovedMentor,
    isApprovedMentee,
    isApprovedEmployer,
    isAdminLike,
  } = useApproval();

  if (loading) {
    if (skeleton !== null && skeleton !== undefined) {
      return skeleton;
    }
    return (
      <div className="py-8 text-center text-gray-500">
        Checking your account status...
      </div>
    );
  }

  // Admin-like roles bypass approval checks entirely
  if (isAdminLike) return <>{children}</>;

  const allowed =
    require === 'approved' || require === 'approved-user' ? isApproved :
    require === 'approved-mentor' ? isApprovedMentor :
    require === 'approved-mentee' ? isApprovedMentee :
    require === 'approved-employer' ? isApprovedEmployer :
    false;

  if (!allowed) {
    if (fallback) return fallback;

    if (!showBlockedMessage) return null;

    const message =
      require === 'approved-employer'
        ? 'Your employer profile is not yet approved. Please contact the administrator if you think this is a mistake.'
        : 'Your profile is not yet approved. Please contact the administrator.';

    return (
      <div className="p-4 rounded-md bg-red-50 text-red-700 border border-red-200">
        {message}
      </div>
    );
  }

  return <>{children}</>;
}
