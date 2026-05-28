// Normalizes a raw profile row from DB into a UI-friendly shape
// Used by Directory read-only profile view and Profile Settings read views

export function validateSocialLinks(links) {
  const out = {};
  if (!links || typeof links !== 'object') return out;
  const val = (key, url) => {
    if (!url || typeof url !== 'string') return;
    const u = url.trim();
    try { new URL(u); } catch { return; }
    const lc = u.toLowerCase();
    switch (key) {
      case 'github':
        if (lc.startsWith('https://github.com/')) out.github = u; break;
      case 'twitter':
        if (lc.startsWith('https://twitter.com/') || lc.startsWith('https://x.com/')) out.twitter = u; break;
      case 'x':
        if (lc.startsWith('https://x.com/') || lc.startsWith('https://twitter.com/')) out.x = u; break;
      case 'linkedin':
        // normalize www to non-www for consistency
        if (lc.startsWith('https://linkedin.com/') || lc.startsWith('https://www.linkedin.com/')) {
          out.linkedin = u.replace('https://www.linkedin.com/', 'https://linkedin.com/');
        }
        break;
      case 'website':
        if (lc.startsWith('http://') || lc.startsWith('https://')) out.website = u; break;
      default:
        if (lc.startsWith('http://') || lc.startsWith('https://')) out[key] = u; break;
    }
  };
  Object.entries(links).forEach(([k, v]) => val(k, v));
  return out;
}

export function mapProfileForUI(row) {
  if (!row || typeof row !== 'object') return null;

  const fullName = row.full_name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Unknown';
  const email = row.email || '';
  const phone = row.phone || row.phone_number || '';

  const graduationYear = row.batch || row.graduation_year || 'Not specified';
  const degree = row.course || row.degree || 'Not specified';
  const department = row.department || 'Not specified';

  const currentPosition = row.position || row.current_position || 'Not specified';
  const company = row.company || row.current_company || row.company_name || 'Not specified';
  const location = row.city || row.location || '';
  // Derive a user-friendly locationDisplay: "City, Country" where available
  const locationCity = row.location_city || row.city || '';
  const locationCountry = row.location_country || row.country || '';
  const locationDisplay = locationCity && locationCountry
    ? `${locationCity}, ${locationCountry}`
    : (locationCity || locationCountry || location);

  // Avatar: rely solely on stored avatar_url (or photo_url fallback) and let the Avatar component handle fallbacks
  const avatar_url = row.avatar_url ?? row.photo_url ?? null;

  const about = row.about || row.bio || row.brief || '';

  const experience = Array.isArray(row.work_experience) ? row.work_experience : [];
  const education = Array.isArray(row.education) ? row.education : [];
  const skills = Array.isArray(row.skills) ? row.skills : [];
  const achievements = Array.isArray(row.achievements) ? row.achievements : [];
  const interests = row.interests || [];
  const languages = row.languages || [];

  const socialLinks = validateSocialLinks(row.social_links || {
    linkedin: row.linkedin_url || '',
    website: row.website || '',
    twitter: row.twitter || ''
  });

  // Profession preference: explicit profession > industry > department
  const profession = row.profession || row.industry || row.department || '';

  // Company — Position helper (company first)
  let companyPosition = '';
  if (company && company !== 'Not specified' && currentPosition && currentPosition !== 'Not specified') {
    companyPosition = `${company} — ${currentPosition}`;
  } else if (company && company !== 'Not specified') {
    companyPosition = company;
  } else if (currentPosition && currentPosition !== 'Not specified') {
    companyPosition = currentPosition;
  }

  // Build a compact education summary like: "B.E. Marine Engineering (2020)"
  const educationSummaryParts = [];
  if (degree && degree !== 'Not specified') {
    educationSummaryParts.push(degree);
  }
  if (department && department !== 'Not specified') {
    educationSummaryParts.push(department);
  }
  let educationSummary = educationSummaryParts.join(' ');
  if (graduationYear && graduationYear !== 'Not specified') {
    educationSummary = educationSummary ? `${educationSummary} (${graduationYear})` : String(graduationYear);
  }
  const degreeDepartment = educationSummaryParts.join(' '); // no year, just degree + department

  return {
    id: row.id,
    name: fullName,
    fullName, // alias to satisfy shared mapper contract
    email,
    phone,
    graduationYear,
    degree,
    department,
    degreeDepartment,
    educationSummary,
    currentPosition,
    companyPosition,
    company,
    location,
    locationDisplay,
    avatar_url,
    // Backwards-compatible alias for existing UI that still expects `avatar`
    avatar: avatar_url,
    coverImage: row.cover_image || 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=300&fit=crop',
    verified: !!row.is_verified,
    joinedDate: row.created_at ? new Date(row.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '',
    about,
    profession,
    experience,
    education,
    skills,
    achievements,
    interests,
    languages,
    socialLinks,
    // social alias for the doc's contract (keep both for compatibility)
    social: {
      github: socialLinks.github,
      twitter: socialLinks.twitter || socialLinks.x,
      linkedin: socialLinks.linkedin,
      website: socialLinks.website,
    },
  };
}
