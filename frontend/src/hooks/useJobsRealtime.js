import { useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';

export default function useJobsRealtime({ userId, onJobs, onBookmarks }) {
  const channelRef = useRef(null);

  useEffect(() => {
    if (channelRef.current) return; // prevent StrictMode double-subscribe

    const channel = supabase.channel(`jobs-feed-${userId || 'anon'}`);

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, onJobs)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'job_bookmarks', filter: userId ? `user_id=eq.${userId}` : undefined },
        onBookmarks
      )
      .subscribe(); // subscribe exactly once

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, onJobs, onBookmarks]); // DO NOT depend on filters/sort/view
}
