import { supabase, ensureValidSession } from '../utils/supabase';

/** Create (pending) via SECURITY DEFINER RPC */
type CreateGroupInput = {
  name: string;
  description?: string;
  isPrivate?: boolean;
  tags?: string[];
  alumniOnly?: boolean;
};
export async function createGroup({
  name,
  description = '',
  isPrivate = false,
  tags = [],
  alumniOnly = false,
}: CreateGroupInput) {
  await guardEmployers();
  await ensureValidSession();
  const { data, error } = await supabase.rpc('create_group_and_add_admin', {
    group_name: name.trim(),
    group_description: (description || '').trim(),
    group_is_private: !!isPrivate,
    group_tags: Array.isArray(tags) ? tags : [],
  });
  if (error) throw error;
  return data as string; // group_id
}

/**
 * Load groups visible to the current user via the secure RPC.
 * The RPC handles role-aware filtering (employer exclusion, alumni_only, etc.)
 * This variant returns the full result set and is kept for backward
 * compatibility. Prefer fetchGroupsPagedRpc for new code.
 */
export async function fetchGroupsRpc(): Promise<any[]> {
  const { data, error } = await supabase.rpc('list_groups_for_current_user');
  if (error) throw error;
  return data || [];
}

/**
 * Paged listing via list_groups_for_current_user_paged. This does not change
 * the underlying visibility rules; it only limits how many rows are returned
 * per call so that the frontend can implement server-side pagination.
 */
export async function fetchGroupsPagedRpc(options?: { limit?: number; offset?: number }): Promise<any[]> {
  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;
  const { data, error } = await supabase.rpc('list_groups_for_current_user_paged', {
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return data || [];
}

/**
 * Legacy fetchGroups - kept for backward compatibility.
 * Prefer fetchGroupsRpc for new code.
 */
export async function fetchGroups(options?: { isAdmin?: boolean }) {
  // Try the secure RPC first
  try {
    const rpcData = await fetchGroupsRpc();
    if (rpcData && rpcData.length >= 0) return rpcData;
  } catch (_) {
    // Fall back to direct query if RPC not available
  }
  
  const isAdmin = !!options?.isAdmin || (await isSiteAdmin()).value;
  const { data, error } = await supabase
    .from('groups')
    .select('id,name,description,is_private,is_admin_only_posts,is_archived,is_approved,approval_status,created_by,group_avatar_url,tags,created_at,alumni_only')
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (isAdmin) return data;
  return (data || []).filter(
    (g: any) => g.is_approved === true && g.is_archived === false && g.is_private === false
  );
}

/** One group + my membership (if any) */
export async function fetchGroup(groupId: string, userId?: string) {
  const [g, m] = await Promise.all([
    supabase.from('groups').select('*').eq('id', groupId).single(),
    userId
      ? supabase.from('group_members').select('role,status', { head: false }).eq('group_id', groupId).eq('user_id', userId).maybeSingle()
      : Promise.resolve({ data: null, error: null })
  ]);
  if (g.error) throw g.error;
  return { group: g.data, myMembership: m.data } as { group: any; myMembership: { role?: 'admin' | 'member'; status?: string } | null };
}

// Note: All membership mutations must go through RPCs below. Direct writes to
// group_members / group_memberships from the frontend are intentionally
// removed to ensure RLS and SECURITY DEFINER functions enforce permissions.

/** Toggle admin-only posts (creator/group-admin/site-admin) via RPC */
export async function setAdminOnlyPosts(groupId: string, on: boolean) {
  await guardEmployers();
  const { error } = await supabase.rpc('set_group_admin_only_posts', {
    p_group_id: groupId,
    p_on: !!on,
  });
  if (error) throw error;
}

/** Archive/unarchive (site admin OR group admin) */
export async function setArchived(groupId: string, on: boolean) {
  await guardEmployers();
  const { error } = await supabase.from('groups').update({ is_archived: on }).eq('id', groupId);
  if (error) throw error;
}

/** Approve (site admin only) */
export async function approveGroup(groupId: string) {
  const { error } = await supabase.from('groups').update({ is_approved: true, approval_status: 'approved' }).eq('id', groupId);
  if (error) throw error;
}

/** Posts (respect admin-only + archived in UI; RLS enforces anyway) */
export async function createPost(groupId: string, content: string, userId: string) {
  await guardEmployers();
  const { error } = await supabase.from('group_posts').insert({ group_id: groupId, user_id: userId, content, status: 'approved' });
  if (error) throw error;
}
export async function updatePost(postId: string, content: string) {
  await guardEmployers();
  const { error } = await supabase.from('group_posts').update({ content }).eq('id', postId);
  if (error) throw error;
}
export async function deletePost(postId: string) {
  await guardEmployers();
  const { error } = await supabase.from('group_posts').delete().eq('id', postId);
  if (error) throw error;
}

/** Comments: use group_comments (canonical). Note: table has (post_id, author_id, content, ...) */
export async function createComment(postId: string, _groupId: string, content: string, userId: string) {
  await guardEmployers();
  const { error } = await supabase.from('group_comments').insert({ post_id: postId, author_id: userId, content });
  if (error) throw error;
}
export async function updateComment(id: string, content: string) {
  await guardEmployers();
  const { error } = await supabase.from('group_comments').update({ content }).eq('id', id);
  if (error) throw error;
}
export async function deleteComment(id: string) {
  await guardEmployers();
  const { error } = await supabase.from('group_comments').delete().eq('id', id);
  if (error) throw error;
}

/** Join group via secure RPC (handles alumni_only, employer ban, etc.) */
export async function joinGroupRpc(groupId: string): Promise<'active' | 'pending'> {
  await guardEmployers();
  const { data, error } = await supabase.rpc('join_group', { p_group_id: groupId });
  if (error) throw error;
  return (data as any) as 'active' | 'pending';
}

/** Legacy alias for backward compatibility */
export async function joinGroupV2(groupId: string): Promise<'active' | 'pending'> {
  return joinGroupRpc(groupId);
}

export async function inviteMemberByEmail(groupId: string, email: string) {
  const { error } = await supabase.rpc('invite_member_by_email', { p_group_id: groupId, p_email: email.toLowerCase() });
  if (error) throw error;
}

export async function listPendingMembers(groupId: string): Promise<Array<{ user_id: string; requested_at: string }>> {
  const { data, error } = await supabase.rpc('list_pending_members', { p_group_id: groupId });
  if (error) throw error;
  return (data as any) || [];
}

export async function approveGroupMember(groupId: string, userId: string) {
  const { error } = await supabase.rpc('approve_group_member', { p_group_id: groupId, p_user_id: userId });
  if (error) throw error;
}

export async function rejectGroupMember(groupId: string, userId: string) {
  const { error } = await supabase.rpc('reject_group_member', { p_group_id: groupId, p_user_id: userId });
  if (error) throw error;
}

export async function setMemberRoleRpc(groupId: string, userId: string, role: 'member' | 'admin') {
  const { error } = await supabase.rpc('set_member_role', { p_group_id: groupId, p_user_id: userId, p_role: role });
  if (error) throw error;
}

export async function removeMemberRpc(groupId: string, userId: string) {
  const { error } = await supabase.rpc('remove_member', { p_group_id: groupId, p_user_id: userId });
  if (error) throw error;
}

export async function leaveGroupRpc(groupId: string) {
  const { error } = await supabase.rpc('leave_group', { p_group_id: groupId });
  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────────────────────
// Group Lifecycle RPCs (admin actions)
// ─────────────────────────────────────────────────────────────────────────────

/** Approve a group (site admin only) */
export async function approveGroupRpc(groupId: string) {
  const { error } = await supabase.rpc('approve_group', { p_group_id: groupId });
  if (error) throw error;
}

/** Reject a group (site admin only) */
export async function rejectGroupRpc(groupId: string, reason?: string) {
  const { error } = await supabase.rpc('reject_group', {
    p_group_id: groupId,
    p_reason: reason || null,
  });
  if (error) throw error;
}

/** Archive a group (site admin or group admin) */
export async function archiveGroupRpc(groupId: string) {
  const { error } = await supabase.rpc('archive_group', { p_group_id: groupId });
  if (error) throw error;
}

/** Delete a group securely (site admin only) */
export async function deleteGroupRpc(groupId: string) {
  const { error } = await supabase.rpc('delete_group_secure', { p_group_id: groupId });
  if (error) throw error;
}

/** Update alumni_only flag on a group */
export async function setAlumniOnly(groupId: string, alumniOnly: boolean) {
  await guardEmployers();
  const { error } = await supabase.rpc('set_group_alumni_only', {
    p_group_id: groupId,
    p_on: !!alumniOnly,
  });
  if (error) throw error;
}

/** Update group avatar URL after uploading to storage */
export async function updateGroupAvatarRpc(groupId: string, url: string | null) {
  const { error } = await supabase.rpc('update_group_avatar', {
    p_group_id: groupId,
    p_url: url || null,
  });
  if (error) throw error;
}

// Helpers
async function getMyRole(): Promise<'alumni' | 'employer' | 'admin' | 'super_admin' | null> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return null;
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
  return (data?.role as any) || null;
}

async function isSiteAdmin() {
  const role = await getMyRole();
  return { value: role === 'admin' || role === 'super_admin', role };
}

async function guardEmployers(explicitRole?: string) {
  const role = explicitRole || (await getMyRole());
  if (role === 'employer') {
    const err: any = new Error('Employers cannot perform this action.');
    err.code = 'EMPLOYER_POLICY';
    throw err;
  }
}
