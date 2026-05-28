/**
 * Hook for managing professional achievements (awards, publications, patents, certifications)
 * Uses RPCs: get_my_achievements, upsert_my_achievement, delete_my_achievement, get_profile_achievements
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';
import toast from 'react-hot-toast';

// Achievement categories matching the DB enum
export const ACHIEVEMENT_CATEGORIES = [
  { value: 'award', label: 'Award' },
  { value: 'publication', label: 'Publication' },
  { value: 'patent', label: 'Patent' },
  { value: 'certification', label: 'Certification' },
];

export function useProfileAchievements(profileId = null) {
  const queryClient = useQueryClient();
  const isOwnProfile = !profileId;

  // Fetch achievements - own or another profile's public achievements
  const {
    data: rawAchievements = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['profile-achievements', profileId],
    queryFn: async () => {
      if (isOwnProfile) {
        const { data, error } = await supabase.rpc('get_my_achievements');
        if (error) throw error;
        const list = data || [];
        // Normalize to UI-friendly shape
        return list.map((a) => ({
          ...a,
          // DB uses organization/year; UI expects issuer/date_awarded
          issuer: a.issuer ?? a.organization ?? null,
          date_awarded: a.date_awarded || (a.year ? `${a.year}-01-01` : null),
        }));
      } else {
        const { data, error } = await supabase.rpc('get_profile_achievements', {
          p_profile_id: profileId,
        });
        if (error) throw error;
        const list = data || [];
        return list.map((a) => ({
          ...a,
          issuer: a.issuer ?? a.organization ?? null,
          date_awarded: a.date_awarded || (a.year ? `${a.year}-01-01` : null),
        }));
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // Add or update an achievement (only for own profile)
  const upsertAchievementMutation = useMutation({
    mutationFn: async ({ id, category, title, issuer, date_awarded, url, description }) => {
      if (!category || !title) {
        throw new Error('Category and title are required');
      }
      const { data, error } = await supabase.rpc('upsert_my_achievement', {
        p_id: id || null,
        p_category: category,
        p_title: title,
        p_issuer: issuer || null,
        p_date_awarded: date_awarded || null,
        p_url: url || null,
        p_description: description || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-achievements', null] });
      toast.success('Achievement saved');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to save achievement');
    },
  });

  // Delete an achievement (only for own profile)
  const deleteAchievementMutation = useMutation({
    mutationFn: async (achievementId) => {
      if (!achievementId) throw new Error('Achievement ID required');
      const { data, error } = await supabase.rpc('delete_my_achievement', {
        p_id: achievementId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-achievements', null] });
      toast.success('Achievement removed');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to remove achievement');
    },
  });

  // Group achievements by category
  const achievements = rawAchievements;

  const achievementsByCategory = ACHIEVEMENT_CATEGORIES.reduce((acc, cat) => {
    acc[cat.value] = achievements.filter((a) => a.category === cat.value);
    return acc;
  }, {});

  return {
    // Data
    achievements,
    achievementsByCategory,
    achievementCount: achievements.length,

    // Loading states
    isLoading,
    isSaving: upsertAchievementMutation.isPending,
    isDeleting: deleteAchievementMutation.isPending,

    // Error
    error,

    // Actions (only available for own profile)
    addAchievement: isOwnProfile
      ? (data) => upsertAchievementMutation.mutate({ ...data, id: null })
      : null,
    updateAchievement: isOwnProfile ? upsertAchievementMutation.mutate : null,
    deleteAchievement: isOwnProfile ? deleteAchievementMutation.mutate : null,
    refetch,

    // Helpers
    isOwnProfile,
    categories: ACHIEVEMENT_CATEGORIES,
  };
}

export default useProfileAchievements;
