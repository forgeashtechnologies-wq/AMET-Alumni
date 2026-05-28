import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';

export function useProfileById(userId) {
  const query = useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, first_name, last_name, avatar_url, email')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    },
    staleTime: 60_000,
  });
  return { profile: query.data, ...query };
}
