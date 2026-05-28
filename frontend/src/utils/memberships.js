// src/utils/memberships.js
// Returns a map keyed by groupId: { isMember: boolean, isAdmin: boolean, isPending: boolean }
export async function fetchMembershipMap(supabase, groupIds) {
  if (!Array.isArray(groupIds) || groupIds.length === 0) return {};
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return {};

  // Active memberships from group_members
  const { data: activeRows, error: activeErr } = await supabase
    .from('group_members')
    .select('group_id, role')
    .in('group_id', groupIds)
    .eq('user_id', userId);

  if (activeErr) throw activeErr;

  const map = (activeRows || []).reduce((acc, row) => {
    acc[row.group_id] = {
      isMember: true,
      isAdmin: row.role === 'admin',
      isPending: false,
    };
    return acc;
  }, {});

  // Pending join requests from group_memberships
  const { data: pendingRows, error: pendingErr } = await supabase
    .from('group_memberships')
    .select('group_id, status')
    .in('group_id', groupIds)
    .eq('user_id', userId)
    .eq('status', 'pending');

  if (pendingErr) throw pendingErr;

  (pendingRows || []).forEach((row) => {
    const current = map[row.group_id] || { isMember: false, isAdmin: false, isPending: false };
    map[row.group_id] = { ...current, isPending: true };
  });

  return map;
}
