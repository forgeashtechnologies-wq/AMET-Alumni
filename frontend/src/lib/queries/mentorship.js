import { supabase } from '../../utils/supabase';

export async function fetchMenteeRequests(userId, opt = {}) {
  let q = supabase
    .from('v_my_mentorship_requests')
    .select('id, mentor_id, mentee_id, status, message, goals, created_at')
    .eq('mentee_id', userId)
    .order('created_at', { ascending: opt.order?.ascending ?? false });

  if (opt.status) {
    if (Array.isArray(opt.status)) q = q.in('status', opt.status);
    else q = q.eq('status', opt.status);
  }

  return q;
}

export async function fetchMentorRequests(userId, opt = {}) {
  let q = supabase
    .from('v_my_mentorship_dashboard')
    .select('id, mentor_id, mentee_id, status, message, goals, created_at')
    .eq('mentor_id', userId)
    .order('created_at', { ascending: opt.order?.ascending ?? false });

  if (opt.status) {
    if (Array.isArray(opt.status)) q = q.in('status', opt.status);
    else q = q.eq('status', opt.status);
  }

  return q;
}

export async function fetchMentorsAdmin(opt = {}) {
  let q = supabase
    .from('mentors')
    .select(`
      user_id,
      status,
      expertise,
      mentoring_preferences,
      created_at,
      applicant:profiles!mentors_user_id_fkey (id, full_name, email, avatar_url, location, approval_status, is_available_for_mentorship)
    `)
    .order('created_at', { ascending: false });

  if (opt.status && opt.status !== 'all') {
    q = q.eq('status', opt.status);
  }

  return q;
}
