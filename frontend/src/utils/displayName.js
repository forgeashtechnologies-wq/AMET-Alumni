export function getDisplayName(profile, user) {
  const p = profile || {};
  if (p && typeof p.full_name === 'string' && p.full_name.trim()) {
    return p.full_name.trim();
  }
  const first = (p.first_name || '').trim();
  const last = (p.last_name || '').trim();
  const combined = [first, last].filter(Boolean).join(' ').trim();
  if (combined) return combined;
  const um = (user && user.user_metadata) || {};
  const umFull = (um.full_name || um.name || '').trim();
  if (umFull) return umFull;
  const given = (um.given_name || '').trim();
  const family = (um.family_name || '').trim();
  const umCombined = [given, family].filter(Boolean).join(' ').trim();
  if (umCombined) return umCombined;
  const email = (user && user.email) || p.email || '';
  if (typeof email === 'string' && email.includes('@')) {
    return email.split('@')[0];
  }
  return 'User';
}
