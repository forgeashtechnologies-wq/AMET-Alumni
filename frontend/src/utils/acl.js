export const canCreateGroup = (role) =>
  role === 'alumni' || role === 'admin' || role === 'super_admin';

export const isSiteAdmin = (role) =>
  role === 'admin' || role === 'super_admin';

// Legacy signature kept for compatibility
export const canManageGroupLegacy = (
  me = {},
  group = {},
  myMembership = {}
) => isSiteAdmin(me?.role) || group?.created_by === me?.id || myMembership?.role === 'admin';

// New helpers for Groups authorization
export const isGroupAdmin = (m) =>
  !!m && (m.status === 'active' || m.status === undefined) && (m.role === 'admin' || m.role === 'owner');

// New signature: (isSiteAdminFlag, isCreator, membership)
export const canManageGroup = (isSiteAdminFlag, isCreator, m) =>
  !!isSiteAdminFlag || !!isCreator || isGroupAdmin(m);

export const canPostToGroup = (group = {}, isSiteAdminFlag = false, m) => {
  if (group?.is_archived) return false;
  if (group?.is_admin_only_posts) return !!isSiteAdminFlag || isGroupAdmin(m);
  return !!m; // members can post otherwise
};

// Single source of truth for comment composer eligibility (JS)
export const canCommentOnGroup = (group = {}, role, isMember) => {
  if (!role || role === 'employer') return false;
  if (role === 'admin' || role === 'super_admin') return true;
  // For non-admin users, require group membership regardless of privacy
  return !!isMember;
};

// Additional helpers to mirror TypeScript ACL exports
export const isEmployer = (role) => role === 'employer';
export const isStudent = (role) => role === 'student';
export const isAlumni = (role) => role === 'alumni';

export const canJoinGroup = (group = {}, role, isMember) => {
  if (!group) return { allowed: false, reason: 'Group not found.' };
  if (isMember) return { allowed: false, reason: 'Already a member.' };
  if (isEmployer(role)) return { allowed: false, reason: 'Employers cannot join groups.' };
  if (group.is_archived) return { allowed: false, reason: 'This group is archived.' };
  if (group.approval_status === 'rejected') return { allowed: false, reason: 'This group has been rejected.' };
  if (!group.is_approved && group.approval_status !== 'approved') {
    return { allowed: false, reason: 'This group is pending approval.' };
  }
  if (group.alumni_only && role === 'student') {
    return { allowed: false, reason: 'This group is for alumni only.' };
  }
  return { allowed: true };
};

export const getGroupStatus = (group = {}) => {
  if (!group) {
    return {
      isPending: false,
      isApproved: false,
      isRejected: false,
      isArchived: false,
      isActive: false,
      statusLabel: 'Unknown',
      statusColor: 'gray',
    };
  }

  const isArchived = !!group.is_archived;
  const isPending =
    group.approval_status === 'pending' ||
    (!group.is_approved && group.approval_status !== 'rejected');
  const isRejected = group.approval_status === 'rejected';
  const isApproved =
    group.is_approved === true || group.approval_status === 'approved';
  const isActive = isApproved && !isArchived;

  let statusLabel = 'Active';
  let statusColor = 'green';

  if (isArchived) {
    statusLabel = 'Archived';
    statusColor = 'gray';
  } else if (isRejected) {
    statusLabel = 'Rejected';
    statusColor = 'red';
  } else if (isPending) {
    statusLabel = 'Pending Approval';
    statusColor = 'yellow';
  }

  return {
    isPending,
    isApproved,
    isRejected,
    isArchived,
    isActive,
    statusLabel,
    statusColor,
  };
};
