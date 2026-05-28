import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import logger from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';

/**
 * Centralized mentorship summary for banner logic and relationship-aware UI.
 * Fetches lightweight request/relationship/mentor data for the current user
 * and exposes derived flags used across the Mentorship module.
 */
export function useMentorshipSummary() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [mentorRow, setMentorRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // Manual refetch function
  const refetch = useCallback(() => {
    setRefetchTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isCancelled = false;
    async function fetchSummary() {
      if (!user?.id) {
        setRequests([]);
        setRelationships([]);
        setMentorRow(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [reqRes, relRes, mentorRes] = await Promise.all([
          supabase
            .from('v_my_mentorship_requests')
            .select('id, status, mentor_id, mentee_id, created_at')
            .eq('mentee_id', user.id),
          supabase
            .from('v_my_mentorship_relationships')
            .select('id, status, mentor_id, mentee_id, start_date, end_date'),
          supabase
            .from('mentors')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle(),
        ]);

        if (isCancelled) return;

        if (reqRes.error) throw reqRes.error;
        if (relRes.error) throw relRes.error;
        if (mentorRes.error && mentorRes.error.code !== 'PGRST116') {
          // Ignore "no rows" for maybeSingle, but surface other errors
          throw mentorRes.error;
        }

        setRequests(reqRes.data || []);
        setRelationships(relRes.data || []);
        setMentorRow(mentorRes.data || null);
      } catch (err) {
        if (!isCancelled) {
          logger.error('Error loading mentorship summary:', err);
          setError(err);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchSummary();
    return () => {
      isCancelled = true;
    };
  }, [user?.id, refetchTrigger]);

  const derived = useMemo(() => {
    if (!user?.id) {
      return {
        hasAnyOutgoingRequests: false,
        hasAnyActiveMentor: false,
        hasMentorProfile: false,
        mentorProfileStatus: null,
        isApprovedMentor: false,
        pendingRequestCount: 0,
        hasReachedRequestLimit: false,
      };
    }

    const hasAnyOutgoingRequests = requests.length > 0;

    // Count pending requests for the 5-request limit
    const pendingRequestCount = requests.filter(
      (r) => r.mentee_id === user.id && r.status === 'pending'
    ).length;
    
    // Backend enforces max 5 pending requests per mentee
    const MAX_PENDING_REQUESTS = 5;
    const hasReachedRequestLimit = pendingRequestCount >= MAX_PENDING_REQUESTS;

    const hasAnyActiveMentor = relationships.some(
      (r) => r.mentee_id === user.id && r.status === 'active'
    );

    const hasMentorProfile = !!mentorRow;
    const mentorProfileStatus = mentorRow?.status || null;
    const isApprovedMentor = mentorProfileStatus === 'approved';

    return {
      hasAnyOutgoingRequests,
      hasAnyActiveMentor,
      hasMentorProfile,
      mentorProfileStatus,
      isApprovedMentor,
      pendingRequestCount,
      hasReachedRequestLimit,
    };
  }, [user?.id, requests, relationships, mentorRow]);

  return {
    loading,
    error,
    requests,
    relationships,
    mentorRow,
    refetch,
    ...derived,
  };
}
