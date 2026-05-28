// Shared helper for toggling job bookmark via RPC
export async function toggleBookmarkRPC(supabase, jobId) {
  const { data, error } = await supabase.rpc('toggle_job_bookmark', { p_job_id: jobId });
  if (error) throw error;
  // RPC returns boolean: true => bookmarked, false => unbookmarked
  return data === true;
}

// Helper for fetching all bookmarked job IDs for a user
export async function fetchJobBookmarks(supabase, userId) {
  const { data, error } = await supabase
    .from('job_bookmarks')
    .select('job_id')
    .eq('user_id', userId);

  return { data, error };
}
