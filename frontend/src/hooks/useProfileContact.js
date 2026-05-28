import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import logger from '../utils/logger';

// Hook for loading contact details for a given user via secure RPC.
// Never read email/phone directly from profiles or directory views.
export default function useProfileContact(userId) {
  const [email, setEmail] = useState(null);
  const [phone_number, setPhoneNumber] = useState(null);
  const [has_private_email, setHasPrivateEmail] = useState(false);
  const [has_private_phone, setHasPrivatePhone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setEmail(null);
      setPhoneNumber(null);
      setHasPrivateEmail(false);
      setHasPrivatePhone(false);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: rpcError } = await supabase.rpc('get_profile_contact_details', {
          target_user_id: userId,
        });

        if (rpcError) {
          throw rpcError;
        }

        const row = Array.isArray(data) ? data[0] : data;

        if (!cancelled) {
          setEmail(row?.email ?? null);
          setPhoneNumber(row?.phone_number ?? null);
          setHasPrivateEmail(Boolean(row?.has_private_email));
          setHasPrivatePhone(Boolean(row?.has_private_phone));
        }
      } catch (e) {
        if (!cancelled) {
          logger.error('get_profile_contact_details failed', e);
          setError(e);
          setEmail(null);
          setPhoneNumber(null);
          setHasPrivateEmail(false);
          setHasPrivatePhone(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const isLocked = email == null && phone_number == null;

  return {
    email,
    phone_number,
    has_private_email,
    has_private_phone,
    isLocked,
    loading,
    error,
  };
}
