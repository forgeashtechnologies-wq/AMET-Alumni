// src/lib/membership.ts
export async function getMyMembership(supabase, groupId) {
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) return null;
  const userId = authData.user.id;
  const { data, error } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();

  // ignore “0 rows” variant (PGRST116) since maybeSingle handles it
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}
