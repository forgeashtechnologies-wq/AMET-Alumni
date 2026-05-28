import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';

async function getMyMembership(supabase, groupId) {
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) return null;
  const userId = authData.user.id;
  const { data, error } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();

  // ignore "0 rows" variant (PGRST116) since maybeSingle handles it
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export default function RequireGroupAdmin({ children }) {
  const { id } = useParams();
  const { profile } = useAuth();
  const { data: membership, isLoading } = useQuery({
    queryKey: ['gm', id],
    queryFn: () => getMyMembership(supabase, id),
  });

  if (isLoading) return null;

  const isSiteAdmin = profile?.is_admin === true;
  const isGroupAdmin = !!membership && membership.role === 'admin';

  if (!isSiteAdmin && !isGroupAdmin) {
    return <Navigate to={`/groups/${id}`} replace />;
  }

  return children || null;
}
