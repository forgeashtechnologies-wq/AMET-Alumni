import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Unified frontend approval engine
// Derives approval + profile completeness state from the current user's profile
export function useApproval() {
  const {
    user,
    profile,
    loading: authLoading,
    getUserRole,
    hasPermission,
    approvalFlags,
    role: ctxRole,
    isAdminLike: isAdminLikeFlag,
  } = useAuth();

  const state = useMemo(() => {
    const baseProfile = profile || null;
    const role = (ctxRole || (getUserRole ? getUserRole() : baseProfile?.role || '')).toLowerCase();

    const isAdminLike = isAdminLikeFlag || role === 'admin' || role === 'super_admin';

    // Prefer canonical RPC-derived flags when available
    const flagsApprovalStatus = approvalFlags?.approvalStatus ?? null;
    const flagsIsFullyApproved =
      typeof approvalFlags?.isFullyApproved === 'boolean'
        ? approvalFlags.isFullyApproved
        : null;

    // Fallback to profile fields only when flags are absent
    const profileApprovalStatus =
      baseProfile?.approval_status ??
      baseProfile?.alumni_verification_status ??
      (baseProfile?.is_approved === true ? 'approved' : null);

    const approvalStatus = flagsApprovalStatus ?? profileApprovalStatus;

    const hasRpcFlags = Boolean(approvalFlags);

    // Treat "no RPC flags yet" as loading so UI doesn't misinterpret as pending
    const loading =
      authLoading ||
      (!!user && !hasRpcFlags);

    let isApproved = false;
    let isRejected = false;
    let isPending = false;

    if (isAdminLike) {
      isApproved = true;
      isRejected = false;
      isPending = false;
    } else if (!loading) {
      isRejected =
        approvalStatus === 'rejected' ||
        baseProfile?.alumni_verification_status === 'rejected';
      isApproved = approvalStatus === 'approved';
      isPending = !isRejected && !isApproved;
    }

    const isEmployer = role === 'employer' || (hasPermission ? hasPermission('post:jobs') : false);

    let isProfileComplete = false;
    if (isAdminLike) {
      isProfileComplete = true;
    } else if (isEmployer) {
      const hasCompany =
        Boolean(baseProfile?.company_id) || Boolean(baseProfile?.company_name);
      isProfileComplete = hasCompany;
    } else {
      // Mirror backend fc_is_fully_approved semantics for non-employer users
      const hasCoreAcademics =
        Boolean(baseProfile?.degree_code) &&
        Boolean(baseProfile?.department_id);

      const isAlumniRole = role === 'alumni';
      const isStudentRole = role === 'student';

      const hasGradForAlumni =
        isAlumniRole &&
        (baseProfile?.graduation_year != null ||
          baseProfile?.expected_graduation_year != null);

      const hasGradForStudent =
        isStudentRole && baseProfile?.expected_graduation_year != null;

      const passesGradRule =
        !isAlumniRole && !isStudentRole
          ? true
          : isAlumniRole
            ? hasGradForAlumni
            : hasGradForStudent;

      isProfileComplete = hasCoreAcademics && passesGradRule;
    }

    const isFullyApproved =
      flagsIsFullyApproved !== null
        ? !!flagsIsFullyApproved
        : !!isApproved && isProfileComplete;

    const isMentor = role === 'mentor' || (hasPermission ? hasPermission('manage:mentor_profile') : false);
    const isMentee =
      role === 'mentee' ||
      role === 'student' ||
      role === 'alumni' ||
      (hasPermission ? hasPermission('request:mentorship') : false);

    const isApprovedMentor = isMentor && isFullyApproved;
    const isApprovedMentee = isMentee && isFullyApproved;
    const isApprovedEmployer = isEmployer && isFullyApproved;

    return {
      loading,
      profile: baseProfile,
      role,
      approvalStatus,
      approvalFlags,
      isPending,
      isApproved,
      isRejected,
      isProfileComplete,
      isFullyApproved,
      isMentor,
      isMentee,
      isEmployer,
      isApprovedMentor,
      isApprovedMentee,
      isApprovedEmployer,
      isAdminLike,
    };
  }, [
    user,
    profile,
    authLoading,
    approvalFlags,
    getUserRole,
    hasPermission,
    ctxRole,
    isAdminLikeFlag,
  ]);

  return state;
}

