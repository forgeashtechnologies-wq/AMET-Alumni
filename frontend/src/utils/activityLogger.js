import logger from './logger';
// Lightweight client activity logger
// Inserts into public.user_activity_logs with RLS: user_id must equal auth.uid()

import { supabase } from './supabase';

export async function logActivity({ action, meta = {}, route = null }) {
  try {
    if (!action) return;
    // Prefer session-based check to avoid a network call
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return; // only log for authenticated users

    // Deduplicate logs for the same action+route within 60 seconds
    if (!window.__activity_guard__) window.__activity_guard__ = new Map();
    const key = `${action}::${route || window.location.pathname}`;
    const now = Date.now();
    const lastAt = window.__activity_guard__.get(key) || 0;
    if (now - lastAt < 60000) {
      return;
    }
    window.__activity_guard__.set(key, now);

    const payload = {
      user_id: user.id,
      action,
      route: route || window.location.pathname,
      meta,
      ua: navigator.userAgent || null,
    };

    // Best-effort: do not throw to UI
    await supabase.from('user_activity_logs').insert([payload]);
  } catch (e) {
    // Swallow errors to avoid impacting UX
    if (process.env.NODE_ENV === 'development') {
      logger.warn('logActivity failed:', e?.message || e);
    }
  }
}
