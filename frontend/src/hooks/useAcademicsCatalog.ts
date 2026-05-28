import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabase';

export type Degree = { degree_code: string; degree_label: string };
export type Department = { id: string; name: string; slug: string };
export type DegreeGroup = { degree_code: string; degree_label: string; departments: Department[] };

export function useAcademicsCatalog() {
  const [degrees, setDegrees] = useState<Degree[]>([]);
  const [groups, setGroups] = useState<DegreeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [degRes, grpRes] = await Promise.all([
          supabase.from('v_degrees').select('*').order('degree_label', { ascending: true }),
          supabase.from('v_degree_department_groups').select('*').order('degree_label', { ascending: true }),
        ]);
        if (degRes.error) throw degRes.error;
        if (grpRes.error) throw grpRes.error;
        if (!mounted) return;
        setDegrees((degRes.data ?? []).map((d: any) => ({ degree_code: d.degree_code, degree_label: d.degree_label })));
        setGroups((grpRes.data ?? []).map((g: any) => ({
          degree_code: g.degree_code,
          degree_label: g.degree_label,
          departments: (g.departments ?? []).map((d: any) => ({ id: d.id, name: d.name, slug: d.slug })),
        })));
        setError(undefined);
      } catch (err: any) {
        setError(err?.message ?? 'Failed loading degrees/departments');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const byCode = useMemo(() => Object.fromEntries(groups.map(g => [g.degree_code, g])), [groups]);

  const getDepartments = (degree_code?: string): Department[] =>
    degree_code ? (byCode[degree_code]?.departments ?? []) : [];

  const isValidDegree = (code?: string) => !!code && degrees.some(d => d.degree_code === code);

  const isValidDepartmentFor = (degree_code?: string, department_id?: string) =>
    !!degree_code && !!department_id && getDepartments(degree_code).some(dep => dep.id === department_id);

  return { degrees, groups, getDepartments, isValidDegree, isValidDepartmentFor, loading, error };
}
