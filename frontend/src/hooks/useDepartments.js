import { useMemo } from 'react';

// Canonical department codes and labels
export const DEPARTMENTS = [
  { code: 'MARINE_ENG', label: 'Marine Engineering' },
  { code: 'NAUTICAL_SCI', label: 'Nautical Science' },
  { code: 'PETROLEUM', label: 'Petroleum Engineering' },
  { code: 'MECH', label: 'Mechanical Engineering' },
  { code: 'EEE_MARINE', label: 'Electrical & Electronics – Marine' },
  { code: 'NAVAL_ARCH', label: 'Naval Architecture & Offshore' },
  { code: 'SHIPPING_LOG', label: 'Shipping & Logistics' },
];

export function getDepartmentLabel(code) {
  if (!code) return '';
  const found = DEPARTMENTS.find((d) => d.code === code);
  return found ? found.label : String(code);
}

export function useDepartments() {
  const options = useMemo(() => DEPARTMENTS, []);
  const labelMap = useMemo(() => Object.fromEntries(options.map((o) => [o.code, o.label])), [options]);
  return { options, labelMap, getLabel: getDepartmentLabel };
}
