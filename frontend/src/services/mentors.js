// frontend/src/services/mentors.js
import { supabase } from '../utils/supabase';
import logger from '../utils/logger';

/**
 * Translates a PostgREST error into a user-friendly message.
 * @param {object} error - The PostgREST error object.
 * @returns {string} A user-friendly error message.
 */
const handlePostgrestError = (error) => {
  if (!error) return 'An unknown error occurred.';

  // 406: No rows for .single() -> should be handled by .maybeSingle(), but as a fallback.
  if (error.code === 'PGRST116') {
    return 'The requested profile could not be found.';
  }
  const message = error.message || '';
  const normalized = message.toLowerCase();

  if (normalized.includes('students_cannot_be_mentors')) {
    return 'Only alumni and employer accounts can register as trainers.';
  }
  if (normalized.includes('profile_missing')) {
    return 'We could not find your profile. Please refresh and try again.';
  }
  if (normalized.includes('not_authenticated')) {
    return 'Your session has expired. Please sign in again.';
  }
  // 23514: Check constraint violation (e.g., invalid status)
  if (error.code === '23514') {
    return 'One or more fields have an invalid value (e.g., status). Please review and try again.';
  }

  return error.message || 'An unexpected error occurred.';
};

/**
 * Fetches the mentor profile for the currently signed-in user.
 * Returns null if the user has no mentor profile yet.
 * @returns {Promise<object|null>} The mentor profile or null.
 */
export const getMyMentorProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  try {
    const { data, error } = await supabase
      .from('mentors')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error fetching my mentor profile:', handlePostgrestError(error));
    return null;
  }
};

/**
 * Fetches a mentor profile by its unique ID.
 * @param {string} id - The UUID of the mentor.
 * @returns {Promise<object|null>} The mentor profile or null if not found.
 */
export const getMentorById = async (id) => {
  if (!id) return null;

  try {
    const { data, error } = await supabase
      .from('mentors')
      .select('*, profile:profiles(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error(`Error fetching mentor by ID (${id}):`, handlePostgrestError(error));
    return null;
  }
};

/**
 * Lists all approved mentors, with pagination.
 * @param {{ page?: number, perPage?: number }} params - Pagination parameters.
 * @returns {Promise<object[]|null>} A list of approved mentors.
 */
export const listApprovedMentors = async ({ page = 1, perPage = 20 } = {}) => {
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  try {
    const { data, error } = await supabase
      .from('mentors')
      .select('*, profile:profiles(full_name, avatar_url, headline)')
      .eq('status', 'approved')
      .range(from, to);

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error listing approved mentors:', handlePostgrestError(error));
    return [];
  }
};

/**
 * Creates or updates a mentor profile.
 * Ensures a valid status is set.
 * @param {object} payload - The mentor data to upsert.
 * @returns {Promise<{data: object|null, error: string|null}>} The upserted mentor data or an error message.
 */
export const upsertMentor = async (payload) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'User not authenticated.' };

  const rpcPayload = {
    p_mentoring_capacity_hours_per_month: payload.mentoring_capacity_hours_per_month ?? null,
    p_expertise: payload.expertise ?? [],
    p_mentoring_preferences: payload.mentoring_preferences ?? null,
    p_mentoring_experience_years: payload.mentoring_experience_years ?? null,
    p_mentoring_statement: payload.mentoring_statement ?? null,
    p_max_mentees: payload.max_mentees ?? null,
    p_mentoring_experience_description: payload.mentoring_experience_description ?? null,
  };

  try {
    const { data, error } = await supabase.rpc('save_mentor_profile', rpcPayload);
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logger.error('Error saving mentor profile via RPC:', error);
    return { data: null, error: handlePostgrestError(error) };
  }
};
