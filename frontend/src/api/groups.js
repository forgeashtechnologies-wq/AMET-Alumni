import { supabase, ensureValidSession } from '../utils/supabase';

// Create (pending) via SECURITY DEFINER RPC
export async function createGroup({ name, description = '', isPrivate = false, tags = [] }) {
  await ensureValidSession();
  const { data, error } = await supabase.rpc('create_group_and_add_admin', {
    group_name: name.trim(),
    group_description: (description || '').trim(),
    group_is_private: !!isPrivate,
    group_tags: Array.isArray(tags) ? tags : 
      (tags || '').split(',').map(t => t.trim()).filter(Boolean)
  });
  if (error) throw error;
  return data; // group_id
}

// Load groups visible to the current user (RLS will filter)
export async function fetchGroups() {
  const { data, error } = await supabase
    .from('groups')
    .select('id,name,description,is_private,is_admin_only_posts,is_archived,is_approved,approval_status,created_by,group_avatar_url,tags,created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// Role-aware listing via secure RPC (preferred for new code)
export async function fetchGroupsRpc() {
  const { data, error } = await supabase.rpc('list_groups_for_current_user');
  if (error) throw error;
  return data || [];
}

// Paged listing via list_groups_for_current_user_paged. This preserves the
// same visibility rules but only returns a window of rows per call so that
// callers can implement server-side pagination.
export async function fetchGroupsPagedRpc({ limit = 20, offset = 0 } = {}) {
  const { data, error } = await supabase.rpc('list_groups_for_current_user_paged', {
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return data || [];
}

// One group + my membership (if any)
export async function fetchGroup(groupId, userId) {
  const [g, m] = await Promise.all([
    supabase.from('groups').select('*').eq('id', groupId).single(),
    userId
      ? supabase.from('group_members').select('role,status', { head: false }).eq('group_id', groupId).eq('user_id', userId).maybeSingle()
      : Promise.resolve({ data: null, error: null })
  ]);
  if (g.error) throw g.error;
  return { group: g.data, myMembership: m.data };
}

// NOTE: Legacy helpers below are kept for backward compatibility but should
// not be used for new code. All membership mutations must go through the
// RPC-based helpers further down (joinGroup, approveGroupMember, etc.).

// Public self-join (deprecated) – use joinGroup instead
export async function joinPublicGroup(groupId, userId) {
  return joinGroup(groupId);
}

// Private request to join (deprecated) – use joinGroup instead
export async function requestJoinPrivateGroup(groupId, userId) {
  return joinGroup(groupId);
}

// Admin: approve/deny a pending request (deprecated) – use approveGroupMember / rejectGroupMember
export async function decideJoinRequest(id, status) {
  throw new Error('decideJoinRequest is no longer supported. Use approveGroupMember / rejectGroupMember.');
}

// Admin/Group-admin: invite/add member directly (deprecated) – use inviteMemberByEmail or approveGroupMember
export async function addMember(groupId, userId, role = 'member') {
  return approveGroupMember(groupId, userId);
}

// Leave group (self) (deprecated) – use leaveGroupRpc
export async function leaveGroup(groupId, userId) {
  return leaveGroupRpc(groupId);
}

// Promote/Demote (admin or group-admin) (deprecated) – use setMemberRoleRpc
export async function setMemberRole(groupId, userId, role) {
  return setMemberRoleRpc(groupId, userId, role);
}

// Toggle admin-only posts (creator/group-admin/site-admin) via RPC
export async function setAdminOnlyPosts(groupId, on) {
	const { error } = await supabase.rpc('set_group_admin_only_posts', {
		p_group_id: groupId,
		p_on: !!on,
	});
	if (error) throw error;
}

// Archive/unarchive (site admin OR group admin)
export async function setArchived(groupId, on) {
  const { error } = await supabase.rpc('archive_group', { p_group_id: groupId });
  if (error) throw error;
}

// Approve (site admin only)
export async function approveGroup(groupId) {
  const { error } = await supabase.from('groups').update({ is_approved: true, approval_status: 'approved' }).eq('id', groupId);
  if (error) throw error;
}

// Posts (respect admin-only + archived in UI; RLS enforces anyway)
export async function createPost(groupId, content, userId) {
  const { error } = await supabase.from('group_posts').insert({ group_id: groupId, user_id: userId, content, status: 'approved' });
  if (error) throw error;
}
export async function updatePost(postId, content) {
  const { error } = await supabase.from('group_posts').update({ content }).eq('id', postId);
  if (error) throw error;
}
export async function deletePost(postId) {
  const { error } = await supabase.from('group_posts').delete().eq('id', postId);
  if (error) throw error;
}

// Comments: use group_comments (canonical) — table has (post_id, author_id, content, ...)
export async function createComment(postId, _groupId, content, userId) {
  const { error } = await supabase.from('group_comments').insert({ post_id: postId, author_id: userId, content });
  if (error) throw error;
}
export async function updateComment(id, content) {
  const { error } = await supabase.from('group_comments').update({ content }).eq('id', id);
  if (error) throw error;
}
export async function deleteComment(id) {
  const { error } = await supabase.from('group_comments').delete().eq('id', id);
  if (error) throw error;
}

// Moderation RPCs (JS build uses this file by default when importing '../api/groups')
// Join a group using the hardened join_group RPC.
// Returns a membership state string: 'active' | 'pending'.
export async function joinGroup(groupId) {
  const { data, error } = await supabase.rpc('join_group', { p_group_id: groupId });
  if (error) throw error;
  return data; // expected to be 'active' or 'pending'
}

// Alias matching the TypeScript helper name
export async function joinGroupRpc(groupId) {
  return joinGroup(groupId);
}

export async function inviteMemberByEmail(groupId, email) {
  const { error } = await supabase.rpc('invite_member_by_email', { p_group_id: groupId, p_email: String(email || '').toLowerCase() });
  if (error) throw error;
}

export async function listPendingMembers(groupId) {
  const { data, error } = await supabase.rpc('list_pending_members', { p_group_id: groupId });
  if (error) throw error;
  return data || [];
}

export async function approveGroupMember(groupId, userId) {
  const { error } = await supabase.rpc('approve_group_member', { p_group_id: groupId, p_user_id: userId });
  if (error) throw error;
}

export async function rejectGroupMember(groupId, userId) {
  const { error } = await supabase.rpc('reject_group_member', { p_group_id: groupId, p_user_id: userId });
  if (error) throw error;
}

export async function setMemberRoleRpc(groupId, userId, role) {
  const { error } = await supabase.rpc('set_member_role', { p_group_id: groupId, p_user_id: userId, p_role: role });
  if (error) throw error;
}

export async function removeMemberRpc(groupId, userId) {
  const { error } = await supabase.rpc('remove_member', { p_group_id: groupId, p_user_id: userId });
  if (error) throw error;
}

export async function leaveGroupRpc(groupId) {
  const { error } = await supabase.rpc('leave_group', { p_group_id: groupId });
  if (error) throw error;
}

// Lifecycle RPC helpers matching TS API
export async function approveGroupRpc(groupId) {
  const { error } = await supabase.rpc('approve_group', { p_group_id: groupId });
  if (error) throw error;
}

export async function rejectGroupRpc(groupId, reason) {
  const { error } = await supabase.rpc('reject_group', {
    p_group_id: groupId,
    p_reason: reason || null,
  });
  if (error) throw error;
}

export async function archiveGroupRpc(groupId) {
  const { error } = await supabase.rpc('archive_group', { p_group_id: groupId });
  if (error) throw error;
}

export async function setAlumniOnly(groupId, alumniOnly) {
	const { error } = await supabase.rpc('set_group_alumni_only', {
		p_group_id: groupId,
		p_on: !!alumniOnly,
	});
	if (error) throw error;
}

// Update group avatar URL (used after uploading to storage)
export async function updateGroupAvatarRpc(groupId, url) {
	const { error } = await supabase.rpc('update_group_avatar', {
		p_group_id: groupId,
		p_url: url || null,
	});
	if (error) throw error;
}

// Allow a user to withdraw their own pending join request for a group.
// This assumes a SECURITY DEFINER RPC cancel_group_join_request(p_group_id uuid)
// that deletes or updates the caller's row in group_memberships where status = 'pending'.
export async function withdrawJoinRequest(groupId) {
	const { error } = await supabase.rpc('cancel_group_join_request', { p_group_id: groupId });
	if (error) throw error;
}

// Accept a pending group invite or join request for the current user.
// This calls the accept_group_invite(p_group_id uuid) RPC, which promotes the
// membership row in group_memberships from 'pending' to 'approved' and relies
// on triggers to sync to group_members.
export async function acceptGroupInvite(groupId) {
  const { data, error } = await supabase.rpc('accept_group_invite', { p_group_id: groupId });
  if (error) throw error;
  return data;
}

// Reject/decline a pending group invite for the current user.
export async function rejectGroupInvite(groupId) {
  const { data, error } = await supabase.rpc('reject_group_invite', { p_group_id: groupId });
  if (error) throw error;
  return data;
}

// Cancel a group invite (by inviter or group admin).
export async function cancelGroupInvite(inviteId) {
  const { data, error } = await supabase.rpc('cancel_group_invite', { p_invite_id: inviteId });
  if (error) throw error;
  return data;
}

// Delete a group permanently (super_admin only).
// Uses the hardened delete_group_secure RPC.
export async function deleteGroupRpc(groupId) {
  const { error } = await supabase.rpc('delete_group_secure', { p_group_id: groupId });
  if (error) throw error;
}
