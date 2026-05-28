/**
 * Hook for managing multiple degrees per profile
 * Uses RPCs: get_my_degrees, upsert_my_degree, delete_my_degree
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';
import toast from 'react-hot-toast';

export function useProfileDegrees() {
  const queryClient = useQueryClient();

  // Fetch all degrees for current user
  const {
    data: degrees = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['profile-degrees'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_degrees');
      if (error) throw error;
      // Returns array of { id, degree_code, institution_name, graduation_year, is_primary }
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Add or update a degree
  const upsertDegreeMutation = useMutation({
    mutationFn: async ({ id, degree_code, institution_name, program_name, graduation_year, is_primary }) => {
      if (!degree_code) {
        throw new Error('Degree is required');
      }
      const { data, error } = await supabase.rpc('upsert_my_degree', {
        p_id: id || null,
        p_degree_code: degree_code,
        p_institution_name: institution_name || null,
        p_program_name: program_name || null,
        p_graduation_year: graduation_year ? parseInt(graduation_year, 10) : null,
        p_is_primary: is_primary || false,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile-degrees'] });
      // Also invalidate profile query since primary degree syncs to profiles.degree_code
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success(data?.id ? 'Degree updated' : 'Degree added');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to save degree');
    },
  });

  // Delete a degree
  const deleteDegreeMutation = useMutation({
    mutationFn: async (degreeId) => {
      if (!degreeId) throw new Error('Degree ID required');
      const { data, error } = await supabase.rpc('delete_my_degree', {
        p_id: degreeId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-degrees'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Degree removed');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to remove degree');
    },
  });

  // Computed values
  const primaryDegree = degrees.find((d) => d.is_primary) || degrees[0] || null;
  const additionalDegrees = degrees.filter((d) => !d.is_primary);

  return {
    // Data
    degrees,
    primaryDegree,
    additionalDegrees,
    degreeCount: degrees.length,

    // Loading states
    isLoading,
    isSaving: upsertDegreeMutation.isPending,
    isDeleting: deleteDegreeMutation.isPending,

    // Error
    error,

    // Actions
    addDegree: (degreeData) => upsertDegreeMutation.mutate({ ...degreeData, id: null }),
    updateDegree: upsertDegreeMutation.mutate,
    deleteDegree: deleteDegreeMutation.mutate,
    setPrimaryDegree: (degreeId) => {
      const degree = degrees.find((d) => d.id === degreeId);
      if (degree) {
        upsertDegreeMutation.mutate({ ...degree, is_primary: true });
      }
    },
    refetch,
  };
}

export default useProfileDegrees;
