import { supabase } from '../utils/supabase';

export type SocialLinks = {
  linkedin?: string | null;
  github?: string | null;
  x?: string | null; // X (Twitter)
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
};

const PROVIDERS: Array<keyof SocialLinks> = ['linkedin', 'github', 'x', 'website', 'instagram', 'facebook'];

export async function loadProfileSocialLinks(profileId: string): Promise<SocialLinks> {
  try {
    // Prefer the view if present
    const { data, error } = await supabase
      .from('profile_social_links')
      .select('social_links')
      .eq('id', profileId)
      .single();

    if (!error && data && data.social_links && typeof data.social_links === 'object') {
      const obj = data.social_links as Record<string, string>;
      return {
        linkedin: obj.linkedin || null,
        github: obj.github || null,
        x: obj.x || obj.twitter || null,
        website: obj.website || null,
        instagram: obj.instagram || null,
        facebook: obj.facebook || null,
      };
    }
  } catch (_) {
    // fall back to direct table read
  }

  // Fallback: read from table rows
  try {
    const { data: rows, error } = await supabase
      .from('social_links')
      .select('type, url')
      .eq('profile_id', profileId);

    if (error) throw error;

    const links: SocialLinks = {};
    (rows || []).forEach((r: any) => {
      const type = String(r.type || '').toLowerCase();
      const normType = type === 'twitter' ? 'x' : type;
      if ((PROVIDERS as string[]).includes(normType)) {
        (links as any)[normType] = r.url;
      }
    });
    return links;
  } catch (e) {
    console.warn('Failed to load social links:', e);
    return {};
  }
}

export async function saveProfileSocialLinks(profileId: string, links: SocialLinks): Promise<void> {
  // Build rows for upsert; light normalization
  const rows: Array<{ profile_id: string; type: string; url: string }> = [];

  const normalizeType = (t: string | undefined | null): string | null => {
    const s = String(t || '').trim().toLowerCase();
    if (!s) return null;
    if (s === 'twitter') return 'x';
    return (PROVIDERS as string[]).includes(s) ? s : null;
  };

  const normalizeUrl = (url: string | undefined | null): string | null => {
    if (typeof url !== 'string') return null;
    let u = url.trim();
    if (!u) return null;
    if (!/^[a-z]+:\/\//i.test(u)) u = 'https://' + u;
    return u;
  };

  (Object.entries(links || {}) as Array<[string, any]>).forEach(([rawType, rawUrl]) => {
    const type = normalizeType(rawType);
    const url = normalizeUrl(rawUrl);
    if (type && url) rows.push({ profile_id: profileId, type, url });
  });

  if (rows.length === 0) return;

  console.info('socialLinks upsert rows (ts):', rows);
  const { error } = await supabase
    .from('social_links')
    .upsert(rows, { onConflict: 'profile_id,type' });

  if (error) {
    // Surface concise error upstream but do not block profile save elsewhere
    const err: any = new Error(error.message || 'Failed to upsert social links');
    err.code = error.code;
    err.details = error.details;
    throw err;
  }
}
