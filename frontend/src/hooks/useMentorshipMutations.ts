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
  const { user } = useAuth() as any;

  return useMutation({
    mutationFn: async (vars: { mentorId: string; message?: string; goals?: string }) => {
      return createMentorshipRequest(vars.mentorId, {
        message: vars.message,
        goals: vars.goals,
      });
    },
    onSuccess: () => {
      // Refresh mentee-side lists and mentor inboxes
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['menteeRequests', user.id] });
        queryClient.invalidateQueries({ queryKey: ['mentorRequests'] });
      }
    },
    onError: (error: any) => {
      const mapped = mapMentorshipError(error);
      toast.error(mapped.message);
    },
  });
}

export function useAcceptMentorshipRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth() as any;

  return useMutation({
    mutationFn: async (requestId: string) => {
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
    onError: (error: any) => {
      const mapped = mapMentorshipError(error);
      toast.error(mapped.message);
    },
  });
}

export function useRejectMentorshipRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      return rejectMentorshipRequest(requestId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentorRequests'] });
      queryClient.invalidateQueries({ queryKey: ['menteeRequests'] });
    },
    onError: (error: any) => {
      const mapped = mapMentorshipError(error);
      toast.error(mapped.message);
    },
  });
}

export function useCancelMentorshipRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth() as any;

  return useMutation({
    mutationFn: async (requestId: string) => {
      return cancelMentorshipRequest(requestId);
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['menteeRequests', user.id] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['menteeRequests'] });
      }
    },
    onError: (error: any) => {
      const mapped = mapMentorshipError(error);
      toast.error(mapped.message);
    },
  });
}

export function useToggleMentorAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (next: boolean) => {
      return toggleMentorAvailability(next);
    },
    onSuccess: () => {
      // Mentor directory + any profile-dependent views
      queryClient.invalidateQueries({ queryKey: ['mentorRequests'] });
      queryClient.invalidateQueries({ queryKey: ['menteeRequests'] });
      queryClient.invalidateQueries({ queryKey: ['v_mentors_public'] });
    },
    onError: (error: any) => {
      const mapped = mapMentorshipError(error);
      toast.error(mapped.message);
    },
  });
}
