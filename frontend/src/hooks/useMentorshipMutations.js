import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import {
  acceptMentorshipRequest,
  cancelMentorshipRequest,
  createMentorshipRequest,
  rejectMentorshipRequest,
  toggleMentorAvailability,
  mapMentorshipError,
} from '../services/mentorship';

export function useCreateMentorshipRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ mentorId, message, goals }) => {
      return createMentorshipRequest(mentorId, { message, goals });
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['menteeRequests', user.id] });
        queryClient.invalidateQueries({ queryKey: ['mentorRequests'] });
      }
    },
    onError: (error) => {
      const mapped = mapMentorshipError(error);
      toast.error(mapped.message);
    },
  });
}

export function useAcceptMentorshipRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (requestId) => {
      return acceptMentorshipRequest(requestId);
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['mentorRequests'] });
        queryClient.invalidateQueries({ queryKey: ['menteeRequests', user.id] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['mentorRequests'] });
        queryClient.invalidateQueries({ queryKey: ['menteeRequests'] });
      }
    },
    onError: (error) => {
      const mapped = mapMentorshipError(error);
      toast.error(mapped.message);
    },
  });
}

export function useRejectMentorshipRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId) => {
      return rejectMentorshipRequest(requestId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentorRequests'] });
      queryClient.invalidateQueries({ queryKey: ['menteeRequests'] });
    },
    onError: (error) => {
      const mapped = mapMentorshipError(error);
      toast.error(mapped.message);
    },
  });
}

export function useCancelMentorshipRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (requestId) => {
      return cancelMentorshipRequest(requestId);
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['menteeRequests', user.id] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['menteeRequests'] });
      }
    },
    onError: (error) => {
      const mapped = mapMentorshipError(error);
      toast.error(mapped.message);
    },
  });
}

export function useToggleMentorAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (next) => {
      return toggleMentorAvailability(next);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentorRequests'] });
      queryClient.invalidateQueries({ queryKey: ['menteeRequests'] });
      queryClient.invalidateQueries({ queryKey: ['v_mentors_public'] });
    },
    onError: (error) => {
      const mapped = mapMentorshipError(error);
      toast.error(mapped.message);
    },
  });
}
