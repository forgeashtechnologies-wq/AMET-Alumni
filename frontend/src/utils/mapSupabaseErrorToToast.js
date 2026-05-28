import toast from 'react-hot-toast';
import logger from './logger';

// Deduped error toast with a stable id
export function mapSupabaseErrorToToast(err, fallbackMessage = 'Something went wrong') {
  const code = String(err?.code || err?.status || '');
  const raw = String(err?.message || err?.error_description || fallbackMessage || 'Error');
  const msg = raw.slice(0, 512);

  // Friendly mapping for DB check constraints on publish
  const lower = msg.toLowerCase();
  if (code === '23514' && (lower.includes('chk_jobs_ready_when_active') || lower.includes('chk_jobs_can_open'))) {
    const friendly = 'For Quick Link, add Title, External Application URL, and a Deadline date.';
    logger.error('[SupabaseError 23514]', msg);
    toast.dismiss('supabase-error');
    toast.error(friendly, { id: 'supabase-error' });
    return;
  }

  logger.error('[SupabaseError]', msg);
  toast.dismiss('supabase-error');
  toast.error(msg, { id: 'supabase-error' });
}

// Back-compat helper used in guard flows
export function handleSupabaseGuardError(err) {
  const msg = String(err?.message || 'Guard error').slice(0, 256);
  logger.error('[GuardError]', msg);
  toast.dismiss('supabase-guard');
  toast.error('Your profile is not approved. Kindly contact administrator.', { id: 'supabase-guard' });
}
