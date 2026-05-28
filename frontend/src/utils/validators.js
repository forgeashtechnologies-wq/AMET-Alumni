// Simple validators for URLs and emails. Keep minimal and dependency-free.

/**
 * Validate URL with allowed schemes.
 * @param {string} s
 * @param {string[]} allowedSchemes default ['https','mailto']
 */
export function isValidUrl(s = '', allowedSchemes = ['https', 'mailto']) {
  try {
    const u = new URL(String(s).trim());
    return allowedSchemes.includes(u.protocol.replace(':', ''));
  } catch (_) {
    return false;
  }
}

/**
 * Basic email validation.
 * @param {string} s
 */
export function isValidEmail(s = '') {
  const v = String(s).trim();
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// Safe LinkedIn validator: allow empty or prefix-only while typing
export function validateLinkedIn(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (trimmed === '' || trimmed === 'https://') return null;
  const linkedInRegex = /^https:\/\/(www\.)?linkedin\.com\/(in|pub|company|school)\/[\w-]+\/?$/i;
  if (!linkedInRegex.test(trimmed)) {
    return 'Invalid LinkedIn URL. Use https://www.linkedin.com/(in|pub|company|school)/...';
  }
  return null;
}

// Generic URL validator with same safety: allow empty or prefix-only
export function validateGenericUrl(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (trimmed === '' || trimmed === 'https://') return null;
  try {
    // eslint-disable-next-line no-new
    new URL(trimmed);
    return null;
  } catch {
    return 'Invalid URL format.';
  }
}

/**
 * Enforce single external URL and allowed schemes (https, mailto).
 * @param {{ application_url?: string, external_url?: string, apply_url?: string }} urls
 * @returns {string | null} error message or null
 */
export function validateJobUrls(urls = {}) {
  const { application_url, external_url, apply_url } = urls;
  const entries = [
    ['application_url', application_url],
    ['external_url', external_url],
    ['apply_url', apply_url],
  ].filter(([, v]) => v && String(v).trim() !== '');

  if (entries.length > 1) {
    return 'Provide only one application link.';
  }

  if (entries.length === 1) {
    const [field, val] = entries[0];
    if (!isValidUrl(val, ['https', 'mailto'])) {
      return `${field} must start with https:// or mailto:`;
    }
  }

  return null;
}
