import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import logger from '../utils/logger';

export function useConnectionStatus(userId, otherId) {
  const [status, setStatus] = useState('loading');
  const [direction, setDirection] = useState(null); // 'sent' | 'received' | null
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    if (!userId || !otherId) return;
    setIsLoading(true);
    setDirection(null);
    try {
      // 1) Get high-level status via RPC
      const { data: rpcStatus, error: rpcErr } = await supabase.rpc('get_connection_status', {
        user_1_id: userId,
        user_2_id: otherId,
      });
      if (rpcErr) throw rpcErr;
      const s = rpcStatus || 'idle';
      setStatus(s);

      // 2) If pending, figure out direction (who sent it)
      if (s === 'pending') {
        const { data: row, error: rowErr } = await supabase
          .from('connections')
          .select('requester_id, recipient_id, status')
          .or(`and(requester_id.eq.${userId},recipient_id.eq.${otherId}),and(requester_id.eq.${otherId},recipient_id.eq.${userId})`)
          .limit(1)
          .single();
        if (!rowErr && row) {
          setDirection(row.requester_id === userId ? 'sent' : 'received');
        }
      }
    } catch (error) {
      logger.error('Error fetching connection status:', error);
      setStatus('idle');
      setDirection(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId, otherId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const refreshStatus = () => {
    fetchStatus();
  };

  return { status, direction, isLoading, refreshStatus };
}
