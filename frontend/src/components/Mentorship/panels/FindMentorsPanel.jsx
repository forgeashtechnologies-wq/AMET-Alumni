import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../utils/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useOpenMentorshipChat } from '../../../hooks/useOpenMentorshipChat';
import { useMentorshipSummary } from '../../../hooks/useMentorshipSummary';
import { cancelMentorshipRequest } from '../../../api/mentorshipApi';
import { mapMentorshipError } from '../../../utils/mentorshipErrorMap';
import { getMentorCapacityState } from '../../../utils/mentorshipStatus';
import MentorCapacityPill from '../MentorCapacityPill';
import { toast } from 'react-hot-toast';
import { MENTORSHIP_COPY } from '../../../constants/mentorshipCopy';

/**
 * Panel for browsing and requesting trainers.
 * Integrated with useOpenMentorshipChat for accepted relationships.
 */
export default function FindMentorsPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openChat, loadingId } = useOpenMentorshipChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAcceptingOnly, setShowAcceptingOnly] = useState(true);
  const [cancellingRequestId, setCancellingRequestId] = useState(null);
  const { requests, relationships, pendingRequestCount, hasReachedRequestLimit, refetch: refetchSummary } = useMentorshipSummary();
  
  // Max pending requests constant (matches backend)
  const MAX_PENDING_REQUESTS = 5;
  const {
    data: mentors = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['find-mentors', user?.id, showAcceptingOnly],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_mentors_for_current_mentee', {
        p_limit: 50,
        p_offset: 0,
      });

      if (error) throw error;

      let filtered = data || [];

      // Filter for availability + capacity (server-derived flags)
      if (showAcceptingOnly) {
        filtered = filtered.filter((m) => {
          const current = m.current_mentees_count || 0;
          const max = m.max_mentees || 0;
          return m.is_available_for_mentorship && (max <= 0 || current < max);
        });
      }

      return filtered;
    },
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  // Client-side text search over the fetched mentor list
  const filteredMentors = useMemo(() => {
    if (!searchQuery.trim()) return mentors;
    const q = searchQuery.toLowerCase();
    return (mentors || []).filter((m) => (
      (m.full_name || '').toLowerCase().includes(q) ||
      (m.organization || '').toLowerCase().includes(q) ||
      (m.title || '').toLowerCase().includes(q)
    ));
  }, [mentors, searchQuery]);

  // Get relationship state for a mentor
  const getRelationshipState = (mentorUserId) => {
    if (!user?.id) return { state: 'none', activeRel: null };

    const rels = relationships.filter(
      (r) => r.mentor_id === mentorUserId && r.mentee_id === user.id
    );
    const activeRel = rels.find((r) => r.status === 'active');
    if (activeRel) return { state: 'request_accepted', activeRel };

    const reqs = requests.filter(
      (r) => r.mentor_id === mentorUserId && r.mentee_id === user.id
    );

    const pendingReq = reqs.find((r) => r.status === 'pending');
    if (pendingReq) return { state: 'request_pending', activeRel: null, pendingRequest: pendingReq };

    return { state: 'none', activeRel: null, pendingRequest: null };
  };

  const handleRequestMentorship = (mentorRouteId) => {
    if (!mentorRouteId) return;
    // Route through the mentor profile page so the user can write a
    // personalized message and goals in the existing modal.
    navigate(`/mentorship/mentor/${mentorRouteId}?openRequest=1`);
  };

  const handleCancelRequest = async (requestId) => {
    if (!requestId) return;
    
    setCancellingRequestId(requestId);
    try {
      await cancelMentorshipRequest(requestId);
      toast.success('Mentorship request cancelled');
      // Refetch summary to update request state
      if (refetchSummary) refetchSummary();
    } catch (error) {
      const mapped = mapMentorshipError(error);
      toast.error(mapped.message || 'Failed to cancel request');
    } finally {
      setCancellingRequestId(null);
    }
  };

  const handleOpenChat = (relationshipId) => {
    if (relationshipId) {
      openChat(relationshipId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Find Trainers</h2>
        <p className="text-sm text-slate-600 mt-1">
          Browse alumni trainers and send mentorship requests
        </p>
      </div>

      {/* Request Limit Banner */}
      {hasReachedRequestLimit && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <span className="text-amber-600 text-xl" aria-hidden="true">⚠️</span>
          <div>
            <h3 className="text-sm font-semibold text-amber-800">
              Request limit reached
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              You have {pendingRequestCount} of {MAX_PENDING_REQUESTS} pending requests. 
              Wait for responses or cancel existing requests before sending new ones.
            </p>
            <button
              onClick={() => navigate('/mentorship?tab=requests&sub=sent')}
              className="mt-2 text-sm font-medium text-amber-800 hover:text-amber-900 underline"
            >
              View my requests →
            </button>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="search"
          placeholder="Search by name, company, or title"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-400 focus:border-transparent"
        />
        <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-md cursor-pointer hover:bg-slate-50">
          <input
            type="checkbox"
            checked={showAcceptingOnly}
            onChange={(e) => setShowAcceptingOnly(e.target.checked)}
            className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-400"
          />
          <span className="text-sm text-slate-700">Show accepting only</span>
        </label>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-16" role="status" aria-live="polite">
          <div className="flex flex-col items-center gap-3">
            <div className="spinner spinner-lg" aria-hidden="true" />
            <p className="text-sm text-slate-500 font-medium">Finding trainers...</p>
            <span className="sr-only">Loading trainers...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <p className="text-rose-600 mb-3">
            We couldn’t load trainers. Please try again.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && mentors.length === 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {MENTORSHIP_COPY.emptyStates.findMentors.default.title}
          </h3>
          <p className="text-slate-600">
            {MENTORSHIP_COPY.emptyStates.findMentors.default.body}
          </p>
        </div>
      )}

      {/* Mentor Cards */}
      {!isLoading && !error && mentors.length > 0 && filteredMentors.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 page-enter">
          {filteredMentors.map((mentor, index) => {
            const currentCount = mentor.current_mentees_count || 0;
            const maxCount = mentor.max_mentees || 0;
            const capacityState = getMentorCapacityState(
              mentor.is_available_for_mentorship,
              currentCount,
              maxCount
            );

            const { state: relationshipState, activeRel, pendingRequest } = getRelationshipState(mentor.user_id);
            const isAccepted = relationshipState === 'request_accepted';
            const isPending = relationshipState === 'request_pending';

            return (
              <div
                key={mentor.id}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow"
              >
                {/* Mentor Info */}
                <div className="flex items-start gap-4 mb-4">
                  <img
                    src={mentor.avatar_url || '/default-avatar.svg'}
                    alt={mentor.full_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-slate-900 truncate">
                      {mentor.full_name}
                    </h3>
                    <p className="text-sm text-slate-600 truncate">
                      {mentor.title || 'Professional'}
                    </p>
                    {mentor.organization && (
                      <p className="text-sm text-slate-500 truncate">
                        {mentor.organization}
                      </p>
                    )}
                    {/* Compact mentorship summary */}
                    <p className="mt-1 text-xs text-slate-500 truncate">
                      {[
                        mentor.mentoring_experience_years != null
                          ? `${mentor.mentoring_experience_years} yrs mentoring`
                          : null,
                        mentor.mentoring_capacity_hours_per_month != null
                          ? `${mentor.mentoring_capacity_hours_per_month} hrs/mo`
                          : null,
                        mentor.max_mentees != null
                          ? `Max ${mentor.max_mentees} trainees`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' • ') || 'Mentorship details not specified yet.'}
                    </p>

                    {/* Brief mentoring statement (what this mentor focuses on) */}
                    {mentor.mentoring_statement && (
                      <p className="mt-1 text-xs text-slate-600 overflow-hidden text-ellipsis">
                        {mentor.mentoring_statement}
                      </p>
                    )}
                  </div>
                </div>

                {/* Capacity Pill */}
                <div className="mb-4">
                  <MentorCapacityPill
                    isAvailable={mentor.is_available_for_mentorship}
                    current={currentCount}
                    max={maxCount}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {isAccepted ? (
                    <button
                      onClick={() => handleOpenChat(activeRel?.id)}
                      disabled={!!activeRel?.id && loadingId === activeRel.id}
                      className="flex-1 inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 transition-colors"
                    >
                      {activeRel?.id && loadingId === activeRel.id ? 'Opening…' : 'Open Chat'}
                    </button>
                  ) : isPending ? (
                    <button
                      onClick={() => handleCancelRequest(pendingRequest?.id)}
                      disabled={cancellingRequestId === pendingRequest?.id}
                      className="flex-1 inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-60"
                    >
                      {cancellingRequestId === pendingRequest?.id ? 'Cancelling…' : 'Cancel Request'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRequestMentorship(mentor.user_id || mentor.id)}
                      disabled={
                        capacityState === 'at_capacity' ||
                        hasReachedRequestLimit
                      }
                      title={
                        hasReachedRequestLimit
                          ? `You have ${pendingRequestCount} pending requests (max ${MAX_PENDING_REQUESTS})`
                          : capacityState === 'at_capacity'
                            ? 'This trainer is at capacity'
                            : 'Request mentorship'
                      }
                      className="flex-1 inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                      {hasReachedRequestLimit ? 'Limit Reached' : 'Request Mentorship'}
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/mentorship/mentor/${mentor.id}`)}
                    className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
