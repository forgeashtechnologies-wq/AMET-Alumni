// frontend/src/hooks/useDirectory.js
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabase';

export default function useDirectory({ query = '', filters = {}, sort = 'name_asc', page = 1, pageSize = 24, source = 'rpc', adminFallback = false }) {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setError(null);
      let data = [];
      let err = null;
      try {
        const loadFromPublicView = async () => {
          const res = await supabase
            .from('alumni_directory_public')
            .select('id, full_name, avatar_url, degree_program, graduation_year, current_job_title, company_name, location_city, location_country, achievements');
          if (res.error) throw res.error;
          const rows = Array.isArray(res.data) ? res.data : [];
          return rows.map(r => ({
            ...r,
            location: [r.location_city, r.location_country].filter(Boolean).join(', ')
          }));
        };

        const loadBaseDirectory = async () => {
          const res = await supabase.rpc('get_directory_profiles');
          if (res.error || !Array.isArray(res.data)) {
            throw res.error || new Error('Bad RPC payload');
          }
          let base = res.data;
          // For admins, fall back to the public view if the primary RPC returns nothing
          if (adminFallback && (!base || base.length === 0)) {
            try {
              base = await loadFromPublicView();
            } catch (_) {
              // keep original empty base
            }
          }
          return base;
        };

        if (source === 'public') {
          // Load from public view (no PII)
          data = await loadFromPublicView();
        } else {
          const trimmedQuery = (query || '').trim();
          if (trimmedQuery) {
            // 1) Attempt backend search RPC
            const res = await supabase.rpc('get_directory_profiles_search', {
              p_search: trimmedQuery,
              p_limit: null,
              p_offset: null,
            });

            const hasValidArray = Array.isArray(res.data) && res.data.length > 0;

            if (!res.error && hasValidArray) {
              data = res.data;
            } else {
              // 2) Fallback: load full directory and let frontend filtering handle search.
              // This ensures search still works for alumni/students even if the RPC is
              // strict, misconfigured, or returns zero rows for a valid query.
              data = await loadBaseDirectory();
            }
          } else {
            // No search term: load the base directory as before
            data = await loadBaseDirectory();
          }
        }
      } catch (e) {
        err = e;
        // On error, attempt admin fallback to public view if enabled and source is rpc
        if (source === 'rpc' && adminFallback) {
          try {
            const pub = await supabase
              .from('alumni_directory_public')
              .select('id, full_name, avatar_url, degree_program, graduation_year, current_job_title, company_name, location_city, location_country, achievements');
            if (!pub.error) {
              const rows = Array.isArray(pub.data) ? pub.data : [];
              data = rows.map(r => ({
                ...r,
                location: [r.location_city, r.location_country].filter(Boolean).join(', ')
              }));
              err = null; // suppress error since fallback succeeded
            }
          } catch (fallbackErr) {
            // keep original error
          }
        }
      }

      if (ignore) return;
      if (err) {
        setAll([]);
        setError(err);
      } else {
        setAll(data);
      }
      setLoading(false);
    })();
    return () => { ignore = true; };
  }, [source, adminFallback, query]);

  // client search / filter / sort / paginate
  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    const qDept = String(filters.department || '').toLowerCase();
    const qDegree = String(filters.degree_program || '').toLowerCase();
    const qTitle = String(filters.current_job_title || '').toLowerCase();
    const qLoc = String(filters.location || '').toLowerCase();
    const qYear = filters.graduation_year ? Number(filters.graduation_year) : null;

    return all.filter(p => {
      const first = (p.first_name || '').trim();
      const last = (p.last_name || '').trim();
      const combinedName = `${first} ${last}`.trim();
      const name = (p.full_name || p.name || combinedName || (p.email ? String(p.email).split('@')[0] : '')).toLowerCase();

      const degree = (p.degree_program || p.degree || '').toLowerCase();
      const department = (p.department || p.degree_department || '').toLowerCase();
      const title = (p.current_job_title || p.current_title || p.job_title || '').toLowerCase();
      const company = (p.company_name || p.current_company || p.company || '').toLowerCase();
      const location = [p.location, p.location_city, p.location_country].filter(Boolean).join(' ').toLowerCase();

      // Always apply a text match on the loaded dataset so that search works
      // even if the backend RPC does not fully implement p_search filtering.
      const passesText = !q || [name, degree, department, title, company, location].some(v => v.includes(q));

      const byYear = qYear == null || (Number(p.graduation_year || p.batch_year || null) === qYear);
      const byDept = !qDept || department.includes(qDept);
      const byDegree = !qDegree || degree.includes(qDegree);
      const byDesignation = !qTitle || title.includes(qTitle);
      const byLocation = !qLoc || location.includes(qLoc);

      return passesText && byYear && byDept && byDegree && byDesignation && byLocation;
    });
  }, [all, query, filters, source]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const nameOf = (p) => {
      const first = (p.first_name || '').trim();
      const last = (p.last_name || '').trim();
      const combined = `${first} ${last}`.trim();
      const fallback = (p.email ? String(p.email).split('@')[0] : '')
      return (p.full_name || p.name || combined || fallback) || '';
    };
    const yearOf = (p) => Number(p.graduation_year || p.batch_year || 0);
    if (sort === 'name_asc') arr.sort((a,b)=> nameOf(a).localeCompare(nameOf(b)));
    if (sort === 'name_desc') arr.sort((a,b)=> nameOf(b).localeCompare(nameOf(a)));
    if (sort === 'year_desc') arr.sort((a,b)=> yearOf(b) - yearOf(a));
    if (sort === 'year_asc') arr.sort((a,b)=> yearOf(a) - yearOf(b));
    return arr;
  }, [filtered, sort]);

  const total = sorted.length;
  const start = Math.max(0, (page - 1) * pageSize);
  const items = sorted.slice(start, start + pageSize);

  // Expose the sorted dataset to allow callers to apply custom filters (e.g., connection tabs)
  const dataset = sorted;

  return { items, total, loading, error, dataset };
}
