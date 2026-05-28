export type AppRole = 'alumni' | 'student' | 'employer' | 'admin' | 'super_admin';

// ─────────────────────────────────────────────────────────────────────────────
// Role Checks
// ─────────────────────────────────────────────────────────────────────────────

export const isSiteAdmin = (role?: AppRole) =>
  role === 'admin' || role === 'super_admin';

export const isEmployer = (role?: AppRole) => role === 'employer';

export const isStudent = (role?: AppRole) => role === 'student';

export const isAlumni = (role?: AppRole) => role === 'alumni';

// ─────────────────────────────────────────────────────────────────────────────
// Group Creation
// ─────────────────────────────────────────────────────────────────────────────

/** Only alumni and admins can create groups. Employers and students cannot. */
export const canCreateGroup = (role?: AppRole) =>
  role === 'alumni' || role === 'admin' || role === 'super_admin';

// ─────────────────────────────────────────────────────────────────────────────
// Group Membership Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const isGroupAdmin = (m?: { status?: string; role?: 'admin' | 'owner' | 'member' }) =>
  !!m && (m.status === 'active' || m.status === undefined) && (m.role === 'admin' || m.role === 'owner');

export const canManageGroupLegacy = (
  me: { id?: string; role?: AppRole },
  group: any,
  myMembership?: { role?: 'admin' | 'member' }
) =>
  isSiteAdmin(me?.role) || group?.created_by === me?.id || myMembership?.role === 'admin';

export const canManageGroup = (
  isSiteAdminFlag: boolean,
  isCreator: boolean,
  m?: { status?: string; role?: 'admin' | 'owner' | 'member' }
) => isSiteAdminFlag || isCreator || isGroupAdmin(m);

// ─────────────────────────────────────────────────────────────────────────────
// Group Joining
// ─────────────────────────────────────────────────────────────────────────────

export interface GroupForJoinCheck {
  is_archived?: boolean;
  is_approved?: boolean;
  approval_status?: 'pending' | 'approved' | 'rejected';
  alumni_only?: boolean;
}

/**
 * Determines if a user can join a group.
 * - Employers cannot join any group.
 * - Students cannot join alumni_only groups.
 * - Archived or unapproved groups cannot be joined.
 */
export const canJoinGroup = (
  group: GroupForJoinCheck | null | undefined,
  role?: AppRole,
  isMember?: boolean
): { allowed: boolean; reason?: string } => {
  if (!group) return { allowed: false, reason: 'Group not found.' };
  if (isMember) return { allowed: false, reason: 'Already a member.' };
  if (isEmployer(role)) return { allowed: false, reason: 'Employers cannot join groups.' };
  if (group.is_archived) return { allowed: false, reason: 'This group is archived.' };
  if (group.approval_status === 'rejected') return { allowed: false, reason: 'This group has been rejected.' };
  if (!group.is_approved && group.approval_status !== 'approved') {
    // Pending groups can still be joined by the creator (handled elsewhere), but not by others
    return { allowed: false, reason: 'This group is pending approval.' };
  }
  if (group.alumni_only && isStudent(role)) {
    return { allowed: false, reason: 'This group is for alumni only.' };
  }
  return { allowed: true };
};

// ─────────────────────────────────────────────────────────────────────────────
// Group Posting
// ─────────────────────────────────────────────────────────────────────────────

export interface GroupForPostCheck {
  is_archived?: boolean;
  is_admin_only_posts?: boolean;
}

/**
 * Determines if a user can post to a group.
 * - Archived groups: no posting.
 * - Admin-only posts: only site admins or group admins can post.
 * - Otherwise: any member can post.
 */
export const canPostToGroup = (
  group: GroupForPostCheck | null | undefined,
  isSiteAdminFlag: boolean,
  m?: { status?: string; role?: 'admin' | 'owner' | 'member' }
): boolean => {
  if (!group) return false;
  if (group.is_archived) return false;
  if (group.is_admin_only_posts) return isSiteAdminFlag || isGroupAdmin(m);
  // Otherwise members can post
  return !!m;
};

// ─────────────────────────────────────────────────────────────────────────────
// Group Commenting
// ─────────────────────────────────────────────────────────────────────────────

export interface GroupForCommentCheck {
  is_private?: boolean;
  is_archived?: boolean;
}

/**
 * Determines if a user can comment on a group post.
 * - Employers cannot comment.
 * - Archived groups: read-only.
 * - Private groups: only members can comment.
 * - Public groups: only members can comment (non-members can view but not post).
 * - Site admins can always comment (unless archived).
 */
export const canCommentOnGroup = (
  group: GroupForCommentCheck | null | undefined,
  role?: AppRole,
  isMember?: boolean
): boolean => {
  if (!group) return false;
  if (!role || isEmployer(role)) return false;
  if (group.is_archived) return false;
  if (isSiteAdmin(role)) return true;
  // Both public and private groups require membership to comment
  return !!isMember;
};

// ─────────────────────────────────────────────────────────────────────────────
// Group Visibility
// ─────────────────────────────────────────────────────────────────────────────

export interface GroupForVisibilityCheck {
  is_private?: boolean;
  is_approved?: boolean;
  is_archived?: boolean;
  approval_status?: 'pending' | 'approved' | 'rejected';
}

/**
 * Determines if a user can view a group's content (posts/comments).
 * - Private groups: only members can view.
 * - Public groups: anyone (except employers) can view.
 * - Unapproved/archived groups: only admins and members can view.
 */
export const canViewGroupContent = (
  group: GroupForVisibilityCheck | null | undefined,
  role?: AppRole,
  isMember?: boolean
): boolean => {
  if (!group) return false;
  if (isEmployer(role)) return false;
  if (isSiteAdmin(role)) return true;
  if (isMember) return true;
  // Non-members can only view public, approved, non-archived groups
  if (group.is_private) return false;
  if (group.is_archived) return false;
  if (!group.is_approved && group.approval_status !== 'approved') return false;
  return true;
};

// ─────────────────────────────────────────────────────────────────────────────
// Group Lifecycle Status Helpers
// ─────────────────────────────────────────────────────────────────────────────

export type GroupApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface GroupStatusInfo {
  isPending: boolean;
  isApproved: boolean;
  isRejected: boolean;
  isArchived: boolean;
  isActive: boolean; // approved and not archived
  statusLabel: string;
  statusColor: 'yellow' | 'green' | 'red' | 'gray';
}

export const getGroupStatus = (group: {
  is_approved?: boolean;
  is_archived?: boolean;
  approval_status?: GroupApprovalStatus;
} | null | undefined): GroupStatusInfo => {
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
  const isPending = group.approval_status === 'pending' || (!group.is_approved && group.approval_status !== 'rejected');
  const isRejected = group.approval_status === 'rejected';
  const isApproved = group.is_approved === true || group.approval_status === 'approved';
  const isActive = isApproved && !isArchived;

  let statusLabel = 'Active';
  let statusColor: 'yellow' | 'green' | 'red' | 'gray' = 'green';

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

  return { isPending, isApproved, isRejected, isArchived, isActive, statusLabel, statusColor };
};
