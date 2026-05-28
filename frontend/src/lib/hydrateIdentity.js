import { supabase } from '../utils/supabase';

export async function getPublicIdentity(userId) {
  // Try public directory first
  const { data: pub } = await supabase
    .from('alumni_directory_public')
    .select('id, full_name, avatar_url, location_city, location_country, current_job_title, company_name')
    .eq('id', userId)
    .maybeSingle();

  if (pub) {
    const loc = [pub.location_city, pub.location_country].filter(Boolean).join(', ') || null;
    return {
      id: pub.id,
      full_name: pub.full_name,
      avatar_url: pub.avatar_url || '/default-avatar.svg',
      location: loc,
      current_job_title: pub.current_job_title || null,
      company_name: pub.company_name || null,
    };
  }

  // Fallback to profiles
  const { data: prof } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, location, current_job_title, company_name')
    .eq('id', userId)
    .maybeSingle();

  return {
    id: prof?.id || userId,
    full_name: prof?.full_name || null,
    avatar_url: prof?.avatar_url || '/default-avatar.svg',
    location: prof?.location || null,
    current_job_title: prof?.current_job_title || null,
    company_name: prof?.company_name || null,
  };
}
