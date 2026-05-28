import { useMemo } from 'react';

// Canonical degree program codes and labels
// Store codes in DB; show labels in UI
export const DEGREE_PROGRAMS = [
  { code: 'BE', label: 'B.E' },
  { code: 'BTECH', label: 'B.Tech' },
  { code: 'BSC_NS', label: 'B.Sc. Nautical Science' },
  { code: 'BE_ME', label: 'B.E. Marine Engineering' },
  { code: 'ME', label: 'M.E' },
  { code: 'MBA', label: 'MBA' },
  { code: 'HND', label: 'HND' },
  { code: 'GME', label: 'Graduate Marine Engineering (GME)' },
  { code: 'ETO', label: 'Electro Technical Officers (ETO)' },
];

export function getDegreeLabel(code) {
  if (!code) return '';
  const found = DEGREE_PROGRAMS.find((d) => d.code === code);
  return found ? found.label : String(code);
}

export function useDegreePrograms() {
  const options = useMemo(() => DEGREE_PROGRAMS, []);
  const labelMap = useMemo(() => Object.fromEntries(options.map((o) => [o.code, o.label])), [options]);
  return { options, labelMap, getLabel: getDegreeLabel };
}
