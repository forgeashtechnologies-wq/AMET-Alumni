import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

export default function useSignedImage(bucket, path, ttlSeconds = 600) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!bucket || !path) {
        setUrl(null);
        return;
      }
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, ttlSeconds);
      if (!cancelled) {
        setUrl(error ? null : data?.signedUrl ?? null);
      }
    })();
    return () => { cancelled = true; };
  }, [bucket, path, ttlSeconds]);
  return url;
}
