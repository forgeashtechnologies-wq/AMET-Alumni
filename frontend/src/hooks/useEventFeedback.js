/**
 * Hook for managing event feedback with detailed ratings
 * Uses RPCs: submit_event_feedback, get_my_event_feedback, get_event_feedback_summary, get_event_feedback_details
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';
import toast from 'react-hot-toast';

// Interest level options matching DB enum
export const INTEREST_LEVELS = [
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'interested', label: 'Interested' },
  { value: 'very_interested', label: 'Very Interested' },
];

// Rating fields for the feedback form
export const RATING_FIELDS = [
  { key: 'overall_rating', label: 'Overall Experience', required: true },
  { key: 'content_rating', label: 'Content Quality', required: false },
  { key: 'speakers_rating', label: 'Speakers/Presenters', required: false },
  { key: 'logistics_rating', label: 'Logistics & Organization', required: false },
  { key: 'venue_rating', label: 'Venue/Platform', required: false },
  { key: 'communication_rating', label: 'Communication', required: false },
];

export function useEventFeedback(eventId, { isAdmin = false } = {}) {
  const queryClient = useQueryClient();

  // Fetch user's own feedback for this event
  const {
    data: myFeedback,
    isLoading: isLoadingMyFeedback,
    error: myFeedbackError,
    refetch: refetchMyFeedback,
  } = useQuery({
    queryKey: ['event-feedback', eventId, 'mine'],
    queryFn: async () => {
      if (!eventId) return null;
      const { data, error } = await supabase.rpc('get_my_event_feedback', {
        p_event_id: eventId,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch feedback summary (admin/organizer only)
  const {
    data: feedbackSummary,
    isLoading: isLoadingSummary,
    error: summaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['event-feedback', eventId, 'summary'],
    queryFn: async () => {
      if (!eventId) return null;
      const { data, error } = await supabase.rpc('get_event_feedback_summary', {
        p_event_id: eventId,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!eventId && isAdmin,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch detailed feedback list (admin/organizer only)
  const {
    data: feedbackDetails = [],
    isLoading: isLoadingDetails,
    error: detailsError,
    refetch: refetchDetails,
  } = useQuery({
    queryKey: ['event-feedback', eventId, 'details'],
    queryFn: async () => {
      if (!eventId) return [];
      const { data, error } = await supabase.rpc('get_event_feedback_details', {
        p_event_id: eventId,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!eventId && isAdmin,
    staleTime: 2 * 60 * 1000,
  });

  // Submit or update feedback
  const submitFeedbackMutation = useMutation({
    mutationFn: async (feedbackData) => {
      if (!eventId) throw new Error('Event ID required');
      if (!feedbackData.overall_rating || feedbackData.overall_rating < 1 || feedbackData.overall_rating > 5) {
        throw new Error('Overall rating (1-5) is required');
      }

      const { data, error } = await supabase.rpc('submit_event_feedback', {
        p_event_id: eventId,
        p_overall_rating: feedbackData.overall_rating,
        p_content_rating: feedbackData.content_rating || null,
        p_speakers_rating: feedbackData.speakers_rating || null,
        p_logistics_rating: feedbackData.logistics_rating || null,
        p_venue_rating: feedbackData.venue_rating || null,
        p_communication_rating: feedbackData.communication_rating || null,
        p_worked_well: feedbackData.worked_well || null,
        p_could_improve: feedbackData.could_improve || null,
        p_future_suggestions: feedbackData.future_suggestions || null,
        p_interest_level: feedbackData.interest_level || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-feedback', eventId] });
      toast.success('Feedback submitted successfully');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to submit feedback');
    },
  });

  return {
    // User's own feedback
    myFeedback,
    hasSubmittedFeedback: !!myFeedback,
    isLoadingMyFeedback,
    myFeedbackError,

    // Admin/organizer data
    feedbackSummary,
    feedbackDetails,
    feedbackCount: feedbackDetails.length,
    isLoadingSummary,
    isLoadingDetails,
    summaryError,
    detailsError,

    // Mutation state
    isSubmitting: submitFeedbackMutation.isPending,

    // Actions
    submitFeedback: submitFeedbackMutation.mutate,
    refetchMyFeedback,
    refetchSummary,
    refetchDetails,

    // Helpers
    ratingFields: RATING_FIELDS,
    interestLevels: INTEREST_LEVELS,
  };
}

export default useEventFeedback;
