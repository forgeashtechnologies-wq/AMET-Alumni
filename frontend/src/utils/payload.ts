/**
 * Utility functions for sanitizing payloads before sending to Supabase
 */

/**
 * Sanitizes a profile update payload to ensure it only contains valid columns
 * and passes CHECK/FK constraints.
 * 
 * @param p Raw profile payload from form
 * @returns Sanitized payload with only allowed columns and valid values
 */
export function sanitizeProfilePayload(p: any) {
  const out: Record<string, any> = {
    first_name: p.first_name?.trim() || null,
    last_name: p.last_name?.trim() || null,
    graduation_year: p.graduation_year ? Number(p.graduation_year) : null,
    degree_program: p.degree_program || null,      // must match degree_programs.code
    department: p.department || null,
    company_name: p.company_name?.trim() || null,
    current_job_title: p.current_job_title?.trim() || null,
    location: p.location?.trim() || null,
    linkedin_url: p.linkedin_url?.trim() || null,
  };
  
  // If avatar_url is present in the payload, include it
  if (p.avatar_url) {
    out.avatar_url = p.avatar_url;
  }

  // Drop undefined values to avoid WITH CHECK failures
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined));
}
