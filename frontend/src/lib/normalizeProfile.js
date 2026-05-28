// frontend/src/lib/normalizeProfile.js

export function normalizeProfile(row = {}) {
  const safe = (v) => (typeof v === 'string' ? v.trim() : v);
  const first = safe(row.first_name) || '';
  const last = safe(row.last_name) || '';
  const combined = `${first} ${last}`.trim();
  const full_name = safe(row.full_name)
    || safe(row.name)
    || (combined || 'Alumni');

  return {
    id: row.id,
    full_name,
    graduation_year: row.graduation_year ?? row.batch_year ?? null,
    degree_program: row.degree_program ?? row.degree ?? null,
    department: row.department ?? row.degree_department ?? null,
    company_name: row.company_name ?? row.current_company ?? null,
    current_job_title: row.current_job_title ?? row.current_title ?? null,
    location: row.location ?? row.location_label ?? null,
    avatar_url: row.avatar_url ?? row.photo_url ?? null,
    is_employer: !!row.is_employer,
    role: row.role || (row.is_employer ? 'employer' : undefined),
    _raw: row,
  };
}
