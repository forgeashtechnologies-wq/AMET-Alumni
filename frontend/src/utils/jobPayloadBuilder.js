/**
 * @fileoverview Helper to build a job payload that matches the public.jobs schema.
 */
import { parseINR } from './money';

/**
 * Converts a CSV string to a clean array of strings.
 * @param {string | null | undefined} str The input string.
 * @returns {string[] | null} An array of strings, or null if input is empty.
 */
const splitCsvToArray = (str) => {
  if (!str) return null;
  return str
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
};

/**
 * Safely converts a value to an integer, returning null for invalid numbers.
 * @param {any} val The value to convert.
 * @returns {number | null} The number or null.
 */
const toIntOrNull = (val) => {
  const num = parseInt(val, 10);
  return isNaN(num) ? null : num;
};

/**
 * Converts a date string to ISO format, returning null for invalid dates.
 * @param {string | null | undefined} dateStr The date string.
 * @returns {string | null} An ISO date string or null.
 */
const toISO = (dateStr) => {
  if (!dateStr) return null;
  try {
    // Return date-only string (YYYY-MM-DD) to satisfy DATE columns
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  } catch (e) {
    return null;
  }
};

/**
 * Builds a job payload that matches the `public.jobs` schema.
 * @param {object} form - The current formData from the PostJob component.
 * @param {'quick' | 'form'} mode - The type of submission.
 * @returns {object} A plain object ready for supabase.insert().
 */
export function buildJobPayload(form, mode) {
  // Sanitize numeric salary inputs (strings with commas/symbols to integers)
  const sanitizedMin = parseINR(form.salary_min);
  const sanitizedMax = parseINR(form.salary_max);
  // For Quick Links, set exactly one link field expected by DB constraints.
  // For In-App forms, leave link fields null and rely on contact_email.
  const linkFields =
    mode === 'quick'
      ? { application_url: form.application_url?.trim() || null, external_url: null, apply_url: null }
      : { application_url: null, external_url: null, apply_url: null };

  // Map the free-text skills input to a string array.
  const skills = splitCsvToArray(form.nice_to_have_skills || form.skillsText);

  // Normalize education requirements to enum[] expected by DB
  const educationReq = (() => {
    const v = form.education_requirements;
    if (!v) return null;
    if (Array.isArray(v)) {
      const arr = v.map(x => String(x).trim()).filter(Boolean);
      return arr.length ? arr : null;
    }
    const s = String(v).trim();
    return s ? [s] : null;
  })();

  return {
    title: form.title?.trim(),
    company_name: form.company_name?.trim(), // Optional, but good to have
    location: form.location?.trim() || null,
    job_type: form.job_type || null,
    experience_level: form.experience_level || null,
    department: form.department?.trim() || null,
    industry: form.industry?.trim() || null,
    salary_min: sanitizedMin,
    salary_max: sanitizedMax,

    // Create salary_range string for display
    salary_range: (() => {
      const min = sanitizedMin;
      const max = sanitizedMax;
      if (min && max) {
        return `${min.toLocaleString('en-IN')} - ${max.toLocaleString('en-IN')}`;
      } else if (min) {
        return `${min.toLocaleString('en-IN')}+`;
      } else if (max) {
        return `Up to ${max.toLocaleString('en-IN')}`;
      }
      return null;
    })(),

    // Map long-text fields to the correct columns (prefer normalized keys, fallback to legacy)
    description: form.description?.trim()
      || form.summary?.trim()
      || null,
    requirements: form.requirements?.trim()
      || form.responsibilities?.trim()
      || form.qualifications?.trim()
      || null,

    // Optional job-level logo URL (not tied to companies)
    logo_url: (form.logo_url && String(form.logo_url).trim()) || null,

    // Map skills to the `skills` array column
    skills,

    // Use the correct column names for contact and deadline
    contact_email: form.contact_email?.trim() || null,
    contact_name: form.contact_name?.trim() || null,
    contact_phone: form.contact_phone?.trim() || null,
    deadline: toISO(form.deadline),

    // Education requirements (enum[])
    education_requirements: educationReq,

    status: 'active', // Default status

    // Ensure only one link field is set for quick-links
    ...linkFields,
  };
}
