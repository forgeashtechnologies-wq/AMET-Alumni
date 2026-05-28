// frontend/src/hooks/useRecentActivity.js
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";

/**
 * Supported activity kinds (per your spec):
 * - event_rsvp (going / not_going / interested)
 * - job_applied
 * - connection (sent / accepted / rejected / disconnected)
 * - group (joined / left)
 * - mentorship (mentor|mentee: request|accepted|rejected|disconnected)
 */
export default function useRecentActivity(limit = 5) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.rpc('get_recent_activity', { p_limit: limit });
      if (cancelled) return;
      if (error) setError(error);
      setItems(Array.isArray(data) ? data : []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [limit]);

  return { items, loading, error };
}
