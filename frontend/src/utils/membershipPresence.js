import logger from './logger';
// Tiny helper to check if a user is already a member of a group
// Usage: const member = await isMember(supabase, groupId, user.id);
export async function isMember(supabase, groupId, userId) {
  const { count, error } = await supabase
    .from('group_members')
    .select('*', { head: true, count: 'exact' })
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) {
    logger.warn('membership check error', error);
    // Treat errors as unknown rather than not a member
    return false;
  }
  return (count ?? 0) > 0;
}
