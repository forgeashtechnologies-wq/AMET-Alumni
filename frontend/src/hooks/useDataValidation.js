/**
 * Hook for admin data validation tools
 * Uses RPCs: admin_run_validation, admin_get_validation_runs
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';
import toast from 'react-hot-toast';

export function useDataValidation() {
  const queryClient = useQueryClient();

  // Fetch validation run history
  const {
    data: validationRuns = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['data-validation-runs'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_validation_runs', {
        p_limit: 20,
      });
      if (error) throw error;
      return data || [];
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  // Run a new validation
  const runValidationMutation = useMutation({
    mutationFn: async (scope = 'all') => {
      const { data, error } = await supabase.rpc('admin_run_validation', {
        p_scope: scope,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['data-validation-runs'] });
      const totalIssues = data?.summary?.total_issues || 0;
      if (totalIssues > 0) {
        toast.error(`Validation found ${totalIssues} issue(s)`);
      } else {
        toast.success('Validation complete - no issues found');
      }
    },
    onError: (err) => {
      toast.error(err.message || 'Validation failed');
    },
  });

  // Get the latest run
  const latestRun = validationRuns[0] || null;

  // Parse summary from latest run
  const latestSummary = latestRun?.summary || {};

  return {
    // Data
    validationRuns,
    latestRun,
    latestSummary,

    // Computed issue counts from latest run
    issues: {
      orphanEventRsvps: latestSummary.orphan_event_rsvps || 0,
      orphanJobApplications: latestSummary.orphan_job_applications || 0,
      orphanGroupMembers: latestSummary.orphan_group_members || 0,
      profilesMissingEmail: latestSummary.profiles_missing_email || 0,
      jobsMissingTitle: latestSummary.jobs_missing_title || 0,
      eventsMissingTitle: latestSummary.events_missing_title || 0,
      total: latestSummary.total_issues || 0,
    },

    // Loading states
    isLoading,
    isRunning: runValidationMutation.isPending,

    // Error
    error,

    // Actions
    runValidation: (scope) => runValidationMutation.mutate(scope),
    refetch,
  };
}

export default useDataValidation;
