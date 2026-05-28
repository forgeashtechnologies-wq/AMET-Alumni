import { supabase } from '../utils/supabase';

/**
 * Admin service for managing mentorship statuses via backend RPCs.
 * Never use direct .update() calls for mentee_status or mentor_status.
 */

export async function adminUpdateMenteeStatus(userId, status) {
  const { error } = await supabase.rpc('admin_update_mentee_status', {
    p_user_id: userId,
    p_status: status,
  });
  if (error) throw error;
}

export async function adminUpdateMentorStatus(userId, status) {
  const { error } = await supabase.rpc('admin_update_mentor_status', {
    p_user_id: userId,
    p_status: status,
  });
  if (error) throw error;
}
