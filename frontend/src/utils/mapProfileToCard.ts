export type CardProfile = {
  id: string;
  fullName: string;
  gradYear?: string | number;
  titleAtCompany?: string;  // "Assistant at ABC Company Limited"
  profession?: string;      // "Mariner" - Industry/Department
  locationLabel?: string;   // "Chennai, India"
  degreeDepartment?: string;// "B.E., Marine Engineering"
  skills: string[];         // up to 4 with +N overflow
  isPrivate?: {             // Privacy settings
    [key: string]: boolean;
  };
};

export function mapProfileToCard(row: any): CardProfile {
  const fullName = row.full_name ?? `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim();
  
  // Format as "Company — Title" (company first)
  const title = row.current_job_title ?? row.current_title ?? row.title ?? '';
  const company = row.current_company ?? row.company ?? row.company_name ?? '';
  let titleAtCompany: string | undefined;
  if (company && title) {
    titleAtCompany = `${company} — ${title}`;
  } else if (company) {
    titleAtCompany = company;
  } else if (title) {
    titleAtCompany = title;
  } else {
    titleAtCompany = undefined;
  }
  
  // Format location as "City, Country"; support alternative keys
  const city = row.location_city ?? row.current_city ?? row.city ?? '';
  const country = row.location_country ?? row.current_country ?? row.country ?? '';
  const locationSingle = row.location ?? row.current_location ?? '';
  let locationLabel;
  if (locationSingle) {
    locationLabel = String(locationSingle);
  } else if (city && country) {
    locationLabel = `${city}, ${country}`;
  } else if (city) {
    locationLabel = city;
  } else if (country) {
    locationLabel = country;
  } else {
    locationLabel = undefined;
  }
  
  // Handle skills array properly
  const skills = Array.isArray(row.skills)
    ? row.skills
    : (typeof row.skills === 'object' && row.skills !== null && Array.isArray(row.skills?.[0]) === false)
      ? Object.values(row.skills)
      : [];
  
  // Handle privacy settings
  const isPrivate = row.is_private ?? row.isPrivate ?? {};

  // Normalize degree/department; prefer explicit fields, else try provided aggregate
  const clean = (s: any) => (typeof s === 'string' ? s.replace(/[. \s]+$/, '').trim() : '');
  const deg = clean(row.degree ?? row.degree_program);
  const dept = clean(row.department);
  const degreeDepartment = (deg && dept)
    ? `${deg} ${dept}`
    : (deg || dept || (typeof row.degree_department === 'string' ? row.degree_department.replace(/,\s*/g, ' ') : undefined));

  return {
    id: row.id,
    fullName,
    gradYear: row.graduation_year ?? row.gradYear,
    titleAtCompany,
    profession: row.profession ?? row.industry ?? row.department ?? undefined,
    locationLabel,
    degreeDepartment,
    skills: skills.map(String).filter(Boolean),
    isPrivate,
  };
}
