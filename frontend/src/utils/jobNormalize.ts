export function normalizeJob(raw: any) {
  const description =
    raw?.description ??
    raw?.summary ??
    (Array.isArray(raw?.requirements) ? raw.requirements.join(' • ') : null);

  const deadline = raw?.deadline ?? raw?.application_deadline ?? null;

  const applicationUrl =
    raw?.application_url ?? raw?.apply_url ?? raw?.external_url ?? null;

  const company = raw?.companies
    ? { name: raw.companies.name, logo_url: raw.companies.logo_url }
    : { name: raw.company_name ?? null, logo_url: raw.company_logo_url ?? null };

  const currentUserId = raw?.__currentUserId ?? null;
  const ownerIds = [raw?.posted_by, raw?.created_by, raw?.user_id].filter(Boolean);
  const isOwner = currentUserId ? ownerIds.includes(currentUserId) : false;

  return {
    ...raw,
    description,
    deadline,
    applicationUrl,
    company,
    isOwner,
  };
}
