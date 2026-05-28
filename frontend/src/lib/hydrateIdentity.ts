import { supabase } from '../utils/supabase';

export type PublicIdentity = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  location?: string | null;
};

export async function getPublicIdentity(userId: string): Promise<PublicIdentity> {
  // Try public directory first
  const { data: pub } = await supabase
    .from('alumni_directory_public')
    .select('id, full_name, avatar_url, location_city, location_country')
    .eq('id', userId)
    .maybeSingle();

  if (pub) {
    const loc = [pub.location_city, pub.location_country].filter(Boolean).join(', ') || null;
    return {
      id: pub.id,
      full_name: pub.full_name,
      avatar_url: pub.avatar_url || '/default-avatar.svg',
      location: loc,
    };
  }

  // Fallback to profiles
  const { data: prof } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, location')
    .eq('id', userId)
    .maybeSingle();

  return {
    id: prof?.id || userId,
    full_name: prof?.full_name || null,
    avatar_url: (prof?.avatar_url as string) || '/default-avatar.svg',
    location: (prof?.location as string) || null,
  };
}
