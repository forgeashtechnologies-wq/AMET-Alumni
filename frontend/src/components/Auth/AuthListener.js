import { useEffect } from 'react';
import { supabase } from '../../utils/supabase';

/**
 * AuthListener
 * Listens for Supabase auth state changes globally. When a PASSWORD_RECOVERY
 * event fires (user clicked the reset link in email), we redirect to the
 * in-app password update page while preserving the URL hash (tokens).
 *
 * Notes:
 * - Our app already has UpdatePassword at "/update-password". We preserve the
 *   hash by appending window.location.hash.
 * - Also works if your email template uses implicit flow (hash-based tokens).
 * - Keep this mounted once at the root (e.g., in App.js) so it always runs.
 *
 * Docs:
 * - https://supabase.com/docs/reference/javascript/auth-onauthstatechange
 * - https://supabase.com/docs/guides/auth/password-reset#reset-the-password
 */
export default function AuthListener() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Preserve hash because it may contain tokens
        const hash = window.location.hash || '';
        window.location.replace('/update-password' + hash);
      }
    });
    return () => subscription?.unsubscribe();
  }, []);
  return null;
}
