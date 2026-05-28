import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import logger from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';

export default function useRoleCounts() {
  const { isAdmin } = useAuth();
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetchCounts = async () => {
      setLoading(true);
      setError(null);

      try {
        // Prefer unified RPC. If unavailable or returns empty, try fallbacks in order.
        const tryUnified = async () => supabase.rpc('get_role_counts_for_user');
        const tryAdmin    = async () => supabase.rpc('get_all_profiles_count_by_role_admin');
        const tryPublic   = async () => supabase.rpc('get_directory_role_counts');

        const attempts = [tryUnified, tryAdmin, tryPublic];
        let payload = null;
        let lastErr = null;
        for (const fn of attempts) {
          try {
            const res = await fn();
            if (res?.error) throw res.error;
            if (res?.data) { payload = res.data; break; }
          } catch (e) {
            lastErr = e;
          }
        }

        if (!mounted) return;
        if (payload == null) {
          throw lastErr || new Error('role counts unavailable');
        }
        setCounts(payload);
      } catch (err) {
        logger.error('Failed to fetch role counts:', err);
        if (mounted) {
          setError(err);
          setCounts(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchCounts();

    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  const getDisplayCounts = () => {
    if (!counts) {
      return {
        alumni: 0,
        students: 0,
        employers: 0,
        alumniBreakdown: undefined,
        studentBreakdown: undefined,
        employerBreakdown: undefined,
      };
    }

    // If RPC returned breakdown objects (admin path), use their totals; otherwise use plain numbers.
    if (counts.alumni && typeof counts.alumni === 'object') {
      return {
        alumni: Number(counts.alumni.total || 0),
        students: Number(counts.student?.total || 0),
        employers: Number(counts.employer?.total || 0),
        alumniBreakdown: counts.alumni,
        studentBreakdown: counts.student,
        employerBreakdown: counts.employer,
      };
    }

    return {
      alumni: Number(counts.alumni || 0),
      students: Number(counts.student || 0),
      employers: Number(counts.employer || 0),
      alumniBreakdown: undefined,
      studentBreakdown: undefined,
      employerBreakdown: undefined,
    };
  };

  const displayCounts = getDisplayCounts();

  return { counts, displayCounts, loading, error };
}
