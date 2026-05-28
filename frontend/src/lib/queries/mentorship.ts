import { supabase } from '../../utils/supabase';

type OrderOpt = { ascending?: boolean };
type ListOpt = { status?: string | string[]; order?: OrderOpt };

// NOTE: Column names here must match the existing Supabase views used by legacy
// components (MyMentorship, MentorshipStatus, etc.). Those views already expose
// denormalized name + avatar fields, so we just select them directly.

export async function fetchMenteeRequests(userId: string, opt: ListOpt = {}) {
  let q = supabase
    .from('v_my_mentorship_requests')
    .select(`
      id,
      mentor_id,
      mentee_id,
      status,
      message,
      goals,
      created_at,
      relationship_id,
      mentor_full_name,
      mentor_avatar
    `)
    .eq('mentee_id', userId)
    .order('created_at', { ascending: opt.order?.ascending ?? false });

  if (opt.status) {
    if (Array.isArray(opt.status)) q = q.in('status', opt.status);
    else q = q.eq('status', opt.status);
  }

  return q;
}

export async function fetchMentorRequests(userId: string, opt: ListOpt = {}) {
  let q = supabase
    .from('v_my_mentorship_dashboard')
    .select(`
      id,
      mentor_id,
      mentee_id,
      status,
      message,
      goals,
      created_at,
      relationship_id,
      mentee_full_name,
      mentee_avatar
    `)
    .eq('mentor_id', userId)
    .order('created_at', { ascending: opt.order?.ascending ?? false });

  if (opt.status) {
    if (Array.isArray(opt.status)) q = q.in('status', opt.status);
    else q = q.eq('status', opt.status);
  }

  return q;
}

export async function fetchMentorsAdmin(opt: { status?: 'pending'|'approved'|'rejected'|'all', search?: string }) {
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
