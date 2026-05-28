import { toast } from 'react-hot-toast';
import { supabase } from './supabase';

const ALLOWED_ROLES = ['alumni', 'student', 'employer', 'admin', 'super_admin'];

/**
 * Shared helper for changing a user's role safely.
 * - Uses admin_set_user_role RPC
 * - Enforces "last super_admin" guard on demotions
 *
 * Manual test cases:
 * 1) With 2 super_admins, demote one to admin -> should succeed.
 * 2) With 1 super_admin, attempt demotion -> should show error toast and not change role.
 * 3) Change a non-super_admin role (e.g. alumni -> employer) -> should succeed.
 */
export async function changeUserRole({ userId, oldRole, newRole }) {
  if (!userId) {
    const message = 'Missing user id.';
    toast.error(message);
    return { success: false, error: message };
  }

  if (!ALLOWED_ROLES.includes(newRole)) {
    const message = 'Invalid role';
    toast.error(message);
    return { success: false, error: message };
  }

  // Guard: do not demote the last super_admin
  if (oldRole === 'super_admin' && newRole !== 'super_admin') {
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'super_admin');

    if (countError) {
      const message = countError.message || 'Failed to verify super admin count.';
      toast.error(message);
      return { success: false, error: message };
    }

    if ((count ?? 0) <= 1) {
      const message = 'You cannot demote the last super admin.';
      toast.error(message);
      return { success: false, error: message };
    }
  }

  const { error: roleError } = await supabase.rpc('admin_set_user_role', {
    p_user_id: userId,
    p_role: newRole,
  });

  if (roleError) {
    const message = roleError.message || 'Failed to update user role.';
    toast.error(message);
    return { success: false, error: message };
  }

  toast.success('User role updated successfully.');
  return { success: true };
}
