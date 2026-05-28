// Centralized admin RPC wrappers

import { supabase } from '../utils/supabase';

/**
 * Update profile approval state via centralized admin RPC.
 * @param {{ profileId: string, decision: string, notes?: string | null }} params
 * decision: 'approve' | 'reject' | 'block' | 'unblock' | 'deactivate' | 'reactivate' | 'reset'
 * @returns {Promise<any>} RPC response data
 */
export async function adminUpdateProfileApproval({ profileId, decision, notes }) {
	const { data, error } = await supabase.rpc('admin_update_profile_approval', {
		p_profile_id: profileId,
		p_decision: decision,
		p_notes: notes ?? null,
	});

	if (error) throw error;
	return data;
}

/**
 * List profiles for approval queues with optional filters.
 * @param {{ status?: string | null, role?: string | null, search?: string | null, limit?: number, offset?: number }} params
 * status: 'pending' | 'approved' | 'rejected' | null
 * role: 'alumni' | 'student' | 'employer' | 'admin' | null
 */
export async function adminListProfilesForApproval({ status, role, search, limit = 50, offset = 0 }) {
	const { data, error } = await supabase.rpc('admin_list_profiles_for_approval', {
		p_status: status ?? null,
		p_role: role ?? null,
		p_search: search ?? null,
		p_limit: limit,
		p_offset: offset,
	});

	if (error) throw error;
	return data;
}

/**
 * Count profiles for admin queues with optional filters.
 * Mirrors admin_list_profiles_for_approval filters to support pagination.
 * @param {{ status?: string | null, role?: string | null, search?: string | null }} params
 */
export async function adminCountProfilesForApproval({ status, role, search }) {
	const { data, error } = await supabase.rpc('admin_count_profiles_for_approval', {
		p_status: status ?? null,
		p_role: role ?? null,
		p_search: search ?? null,
	});

	if (error) throw error;
	// Normalize various possible shapes into a plain number.
	if (typeof data === 'number') return data;
	if (typeof data === 'string') return Number(data) || 0;
	if (Array.isArray(data) && data.length) {
		const first = data[0];
		if (typeof first === 'number') return first;
		if (typeof first === 'string') return Number(first) || 0;
		if (first && typeof first === 'object') {
			const v = Object.values(first)[0];
			if (typeof v === 'number') return v;
			if (typeof v === 'string') return Number(v) || 0;
		}
	}
	if (data && typeof data === 'object') {
		const v = Object.values(data)[0];
		if (typeof v === 'number') return v;
		if (typeof v === 'string') return Number(v) || 0;
	}
	return 0;
}

/**
 * Fetch approval/audit history for a given profile.
 * @param {{ profileId: string, limit?: number, offset?: number }} params
 */
export async function adminGetProfileApprovalAudit({ profileId, limit = 50, offset = 0 }) {
	const { data, error } = await supabase.rpc('admin_get_profile_approval_audit', {
		p_profile_id: profileId,
		p_limit: limit,
		p_offset: offset,
	});

	if (error) throw error;
	return data;
}
