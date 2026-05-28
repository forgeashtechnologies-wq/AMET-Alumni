export function getApplyState(job, userRole) {
  const now = new Date();
  const isExpired = job?.deadline ? new Date(job.deadline) < now : false;
  const isPubliclyVisible = job?.is_active && job?.is_approved && !isExpired;

  const isApplicant = userRole === 'student' || userRole === 'alumni';
  const isInternal = !job?.applicationUrl; // in-app vs quick link

  const canApply =
    isApplicant &&
    isInternal &&
    job?.is_active &&
    job?.is_approved &&
    !isExpired &&
    !job?.isOwner;

  return { isExpired, isPubliclyVisible, canApply };
}
