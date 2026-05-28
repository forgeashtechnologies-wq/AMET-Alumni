export function sanitizeProfilePayload(p) {
  const out = {
    first_name: p.first_name?.trim() || null,
    last_name: p.last_name?.trim() || null,
    graduation_year: p.graduation_year ? Number(p.graduation_year) : null,
    degree_program: p.degree_program || null, // must match degree_programs.code
    // Keep legacy degree column in sync if backend expects it
    degree: p.degree_program || null,
    department: p.department || null,
    company_name: p.company_name?.trim() || null,
    current_job_title: p.current_job_title?.trim() || null,
    job_title: p.current_job_title?.trim() || null,
    location: p.location?.trim() || null,
    linkedin_url: p.linkedin_url?.trim() || null,
    avatar_url: p.avatar_url || undefined,
  };
  // Drop undefined (but keep null) to avoid failing WITH CHECK constraints
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined));
}
