import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import { computeEventTimelineFlags } from '../utils/eventsStatus';

export function useEvent(eventId) {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_events_with_end_at')
        .select('*')
        .eq('id', eventId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });
}

export function useMyRsvp(eventId) {
  return useQuery({
    queryKey: ['myRsvp', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_my_event_rsvp')
        .select('attendance_status, is_waitlisted, wants_to_volunteer')
        .eq('event_id', eventId)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    },
    enabled: !!eventId,
  });
}

export function useMyFeedback(eventId) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['myFeedback', eventId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_feedback')
        .select('id, rating, comment, comments, created_at')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    },
    enabled: !!(eventId && user?.id),
  });
}

export function useOrganizer(eventId) {
  return useQuery({
    queryKey: ['eventOrganizer', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_event_organizer')
        .select('name,email,phone,avatar_url,current_location,company_name,graduation_year')
        .eq('event_id', eventId)
        .single();
      if (error) return null; // Silently fail if no organizer view
      return data;
    },
    enabled: !!eventId,
  });
}

export function useEventComputedFlags(eventRow) {
  if (!eventRow) {
    return {
      startISO: null,
      endISO: null,
      eventStarted: false,
      eventEnded: false,
    };
  }

  const { startISO, endISO, eventStarted, eventEnded } = computeEventTimelineFlags(eventRow);
  return { startISO, endISO, eventStarted, eventEnded };
}

export function useMyRegistrations(userId) {
  return useQuery({
    queryKey: ['myRegistrations', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: rsvps, error: rsvpError } = await supabase
        .from('event_attendees')
        .select('event_id, user_id, attendance_status, created_at')
        .eq('user_id', userId);

      if (rsvpError) throw rsvpError;

      const eventIds = Array.from(new Set((rsvps || []).map((r) => r.event_id).filter(Boolean)));
      if (eventIds.length === 0) {
        return [];
      }

      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .in('id', eventIds);

      if (eventsError) throw eventsError;

      const rsvpByEventId = (rsvps || []).reduce((acc, r) => {
        if (!acc[r.event_id]) acc[r.event_id] = r;
        return acc;
      }, {});

      return (events || []).map((ev) => ({
        ...ev,
        my_attendance_status: rsvpByEventId[ev.id]?.attendance_status || null,
        my_rsvp_created_at: rsvpByEventId[ev.id]?.created_at || null,
      }));
    },
  });
}
