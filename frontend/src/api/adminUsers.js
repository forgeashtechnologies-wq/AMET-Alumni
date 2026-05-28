import { supabase } from '../utils/supabase';
import logger from '../utils/logger';
import { adminCountProfilesForApproval } from './admin';

// Admin Users API client built on top of existing admin RPCs.
// Currently uses admin_list_profiles_for_approval as the grid source,
// but is structured so we can later switch to get_admin_user_grid with minimal changes.

/**
 * Fetch a paginated grid of admin-visible users.
 *
 * @param {Object} params
 * @param {string | null} params.search
 * @param {string | null} params.role      // 'alumni' | 'student' | 'employer' | 'admin' | null
 * @param {string | null} params.status    // 'pending' | 'approved' | 'rejected' | null
 * @param {number} params.page             // 1-based
 * @param {number} params.pageSize
 */
export async function fetchAdminUserGrid({ search, role, status, page, pageSize }) {
  const limit = pageSize;
  const offset = (page - 1) * pageSize;
  // Primary: admin_list_profiles_for_approval remains the grid source so we
  // preserve all profile fields (including mentorship statuses).
  const profilesResult = await supabase.rpc('admin_list_profiles_for_approval', {
    p_status: status ?? null,
    p_role: role ?? null,
    p_search: search ?? null,
    p_limit: limit,
    p_offset: offset,
  });

  if (profilesResult.error) throw profilesResult.error;

  const profileRows = Array.isArray(profilesResult.data) ? profilesResult.data : [];

  // Fetch mentor profile statuses for the current slice
  const mentorByUserId = new Map();
  const profileIds = profileRows.map((row) => row.id).filter(Boolean);
  if (profileIds.length) {
    const { data: mentorRows, error: mentorError } = await supabase
      .from('mentors')
      .select('user_id, status')
      .in('user_id', profileIds);

    if (mentorError) {
      logger.error('Failed to load mentor profile statuses:', mentorError);
    } else if (Array.isArray(mentorRows)) {
      mentorRows.forEach((mentor) => {
        if (mentor?.user_id) {
          mentorByUserId.set(mentor.user_id, mentor.status || null);
        }
      });
    }
  }

  // Secondary: fetch last_sign_in_at data to power the "Last Login" column.
  // We intentionally ignore paging here and fetch a reasonably large slice
  // for the current search term to avoid mismatches in pagination/sort
  // between the two RPCs.
  const loginsResult = await supabase.rpc('admin_list_users_with_last_login', {
    // We intentionally do not filter by search here, because the search
    // semantics differ between the two RPCs (full_name vs first/last name).
    // Instead, we fetch a large slice and join purely by id.
    p_search: null,
    p_limit: 10000,
    p_offset: 0,
  });

  if (loginsResult.error) {
    // eslint-disable-next-line no-console
    logger.error('admin_list_users_with_last_login failed:', loginsResult.error);
  }

  const loginRows = Array.isArray(loginsResult.data) ? loginsResult.data : [];

  const loginById = new Map(
    loginRows.map((row) => [row.id, row.last_sign_in_at || row.created_at || null])
  );

  const rows = profileRows.map((row) => {
    const mergedLastLogin =
      row.last_sign_in_at ??
      loginById.get(row.id) ??
      // Fallback: use profile created_at so Last Login is never blindly N/A
      row.created_at ??
      null;

    return {
      ...row,
      last_sign_in_at: mergedLastLogin,
      mentor_profile_status: mentorByUserId.get(row.id) || null,
    };
  });

  let totalCount;
  try {
    // Use the dedicated counting RPC so pagination metadata stays correct
    // and consistent with the filters applied to the main grid.
    totalCount = await adminCountProfilesForApproval({
      status,
      role,
      search,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    logger.error('admin_count_profiles_for_approval failed:', error);
    totalCount = undefined;
  }

  return { rows, totalCount };
}

export async function adminUsersUpdateProfileApproval({ profileId, decision, notes }) {
  const { data, error } = await supabase.rpc('admin_update_profile_approval', {
    p_profile_id: profileId,
    p_decision: decision,
    p_notes: notes ?? null,
  });

  if (error) throw error;
  return data;
}

export async function adminUsersRestoreUser({ userId, reason }) {
  const { data, error } = await supabase.rpc('admin_restore_user', {
    target: userId,
    p_reason: reason ?? null,
  });

  if (error) throw error;
  return data;
}

export async function adminUsersToggleActive({ userId, isActive, reason }) {
  const { data, error } = await supabase.rpc('admin_toggle_active', {
    p_user_id: userId,
    p_is_active: isActive,
    p_reason: reason ?? null,
  });

  if (error) throw error;
  return data;
}

export async function adminUsersSoftDelete({ userId, reason }) {
  const { data, error } = await supabase.rpc('admin_soft_delete_user', {
    target: userId,
    p_reason: reason ?? null,
  });

  if (error) throw error;
  return data;
}

export async function adminUsersPurgeData({ userId }) {
  const { data, error } = await supabase.rpc('admin_purge_user_data', {
    target: userId,
  });

  if (error) throw error;
  return data;
}

export async function adminUsersDeleteAuthUser({ userId }) {
  const { data, error } = await supabase.rpc('admin_delete_user_rpc', {
    target: userId,
  });

  if (error) throw error;

  // Treat success only when RPC explicitly returns ok with 2xx status
  if (!data?.ok || !(data.status >= 200 && data.status < 300)) {
    const status = data?.status ?? 'unknown';
    const body = data?.body ?? '';
    throw new Error(`Auth delete failed (status ${status}) ${body}`);
  }

  return data;
}
