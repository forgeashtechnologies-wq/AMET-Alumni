// frontend/src/services/directoryApi.js
// Centralized API helpers for Directory feature
// Uses the public view alumni_directory_public for student-safe directory access

import { supabase } from '../utils/supabase';

// Public directory (no contacts)
export async function fetchPublicDirectory({ search = '', limit = 20, offset = 0 } = {}) {
  // NOTE: this is a VIEW, not the profiles table
  let query = supabase
    .from('alumni_directory_public')
    .select('*', { count: 'exact' })
    .range(offset, offset + limit - 1);

  // Optional text search across a few fields (adjust if you have pg FTS)
  if (search) {
    // Simple ilike filters across a few columns
    query = query.or([
      `full_name.ilike.%${search}%`,
      `degree_program.ilike.%${search}%`,
      `company_name.ilike.%${search}%`,
      `location_city.ilike.%${search}%`,
      `location_country.ilike.%${search}%`,
      `current_job_title.ilike.%${search}%`,
    ].join(','));
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return { data, count };
}

// Mentor contact unlock via RPC (only if mentorship accepted/active)
export async function fetchMentorContact(mentorId) {
  const { data, error } = await supabase.rpc('get_mentor_contact', { mentor_uuid: mentorId });
  if (error) throw error;
  return data || {};
}
