import { useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, onPostgresChangesOnce } from '../utils/supabase';
import { getMyProfile, updateMyProfile as svcUpdate } from '../services/profile';

export function useMyProfile(userId) {
  const qc = useQueryClient();
  const key = useMemo(() => ['profile', 'me'], []);

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!userId) return null;
      return await getMyProfile();
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: async (patch) => {
      return await svcUpdate(patch);
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      const optimistic = prev ? { ...prev, ...patch } : { ...patch };
      qc.setQueryData(key, optimistic);
      return { prev };
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });

  useEffect(() => {
    if (!userId) return;
    // Ensure single realtime channel for this user id
    const disposer = onPostgresChangesOnce(
      `profiles:me:${userId}`,
      `profiles-me-handler-${userId}`,
      { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
      () => {
        qc.invalidateQueries({ queryKey: key });
      }
    );
    return () => {
      try { disposer && disposer(); } catch (_) { /* ignore */ }
    };
  }, [userId, qc, key]);

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateProfile: mutation.mutateAsync,
  };
}
