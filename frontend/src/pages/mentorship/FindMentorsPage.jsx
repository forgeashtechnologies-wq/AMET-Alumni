import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import logger from '../../utils/logger';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { getMentorCapacityState } from '../../utils/mentorshipStatus';
import MentorCapacityPill from '../../components/Mentorship/MentorCapacityPill';
import { useMentorshipSummary } from '../../hooks/useMentorshipSummary';

/**
 * Find Mentors page - Browse and request mentorship
 * Data: get_mentors_for_current_mentee RPC + v_mentors_public
 */
export default function FindMentorsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAcceptingOnly, setShowAcceptingOnly] = useState(true);
  const { requests, relationships } = useMentorshipSummary();

  useEffect(() => {
    fetchMentors();
  }, [showAcceptingOnly]);

  async function fetchMentors() {
    try {
      setLoading(true);
      
      // Use RPC for personalized mentor list
      const { data, error } = await supabase.rpc('get_mentors_for_current_mentee', {
        p_limit: 50,
        p_offset: 0,
      });

      if (error) throw error;

      let filtered = data || [];

      // Text search (basic, client-side for now)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter((m) => {
          return (
            (m.full_name || '').toLowerCase().includes(q) ||
            (m.organization || '').toLowerCase().includes(q) ||
            (m.title || '').toLowerCase().includes(q)
          );
        });
      }

      // Client-side filter for availability + capacity if toggle is on
      if (showAcceptingOnly) {
        filtered = filtered.filter((m) => {
          const current = m.current_mentees_count || 0;
          const max = m.max_mentees || 0;
          return m.is_available_for_mentorship && (max <= 0 || current < max);
        });
      }

      setMentors(filtered);
    } catch (error) {
      logger.error('Error fetching mentors:', error);
      toast.error('We could not load mentors. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Derive relationship state for a given mentor
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

    const hasPending = reqs.some((r) => r.status === 'pending');
    if (hasPending) return { state: 'request_pending', activeRel: null };

    const hasPastRel = rels.some((r) => r.status !== 'active');
    if (hasPastRel) return { state: 'past_mentorship', activeRel: null };

    const hasRejected = reqs.some(
      (r) =>
        r.status === 'rejected' ||
        r.status === 'cancelled_by_user' ||
        r.status === 'cancelled_by_system'
    );
    if (hasRejected) return { state: 'request_rejected', activeRel: null };

    return { state: 'none', activeRel: null };
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Find a mentor</h2>
        <p className="mt-1 text-sm text-gray-600">
          Search mentors from the AMET community who can guide you and send a mentorship request.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <input
          type="search"
          placeholder="Search by name, company, or location"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            checked={showAcceptingOnly}
            onChange={(e) => setShowAcceptingOnly(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Only show mentors accepting new mentees</span>
        </label>
      </div>

      {/* Mentor Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" role="status" aria-label="Loading mentors">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="flex items-start gap-4 mb-4">
                <div className="h-12 w-12 bg-gray-200 rounded-full flex-shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
              <div className="h-6 bg-gray-200 rounded-full w-40 mb-4"></div>
              <div className="flex gap-2">
                <div className="h-10 bg-gray-200 rounded flex-1"></div>
                <div className="h-10 bg-gray-200 rounded w-32"></div>
              </div>
            </div>
          ))}
          <span className="sr-only">Loading mentor profiles...</span>
        </div>
      ) : mentors.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-600">
            No mentors match your filters. Try clearing some filters or adjusting your search.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mentors.map((mentor) => {
            const currentCount = mentor.current_mentees_count || 0;
            const maxCount = mentor.max_mentees || 0;
            const capacityState = getMentorCapacityState(
              mentor.is_available_for_mentorship,
              currentCount,
              maxCount || 0
            );

            const isAccepting = capacityState === 'accepting';
            const isAtCapacity = capacityState === 'at_capacity';

            const { state: relationshipState, activeRel } = getRelationshipState(mentor.id);

            return (
              <div key={mentor.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <img
                    src={mentor.avatar_url || '/default-avatar.svg'}
                    alt={`${mentor.full_name}'s profile picture`}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {mentor.full_name}
                        </h3>
                        <p className="text-sm text-gray-600">{mentor.title || 'Maritime Professional'}</p>
                        <p className="text-sm text-gray-500">{mentor.organization || 'AMET'}</p>
                      </div>
                      {relationshipState === 'request_accepted' && (
                        <span className="ml-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Your mentor
                        </span>
                      )}
                      {relationshipState === 'request_pending' && (
                        <span className="ml-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Request pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <MentorCapacityPill
                    current={currentCount}
                    max={maxCount}
                    isAvailable={mentor.is_available_for_mentorship}
                    size="sm"
                  />
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  <div className="flex gap-2">
                    {relationshipState === 'request_accepted' ? (
                      <>
                        <button
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                          onClick={() =>
                            navigate(
                              `/messages?userId=${mentor.id}&source=mentorship${activeRel ? `&relationshipId=${activeRel.id}` : ''}`
                            )
                          }
                        >
                          Go to chat
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/mentorship/mentor/${mentor.id}`)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                          aria-label={`View ${mentor.full_name}'s profile`}
                        >
                          View mentor
                        </button>
                      </>
                    ) : relationshipState === 'request_pending' ? (
                      <>
                        <button
                          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md cursor-default disabled:opacity-75 text-sm"
                          disabled
                        >
                          Request pending
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate('/mentorship/my-requests')}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm"
                        >
                          View request
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          disabled={!isAccepting}
                          title={!isAccepting ? (isAtCapacity ? 'This mentor is at capacity' : 'This mentor is not accepting new mentees') : 'Send a mentorship request'}
                          onClick={() => navigate(`/mentorship/mentor/${mentor.id}`)}
                        >
                          {isAtCapacity ? 'At capacity' : 'Request mentorship'}
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/mentorship/mentor/${mentor.id}`)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                          aria-label={`View ${mentor.full_name}'s profile`}
                        >
                          View profile
                        </button>
                      </>
                    )}
                  </div>
                  {!isAccepting && relationshipState === 'none' && (
                    <p className="text-xs text-gray-500 text-center">
                      {isAtCapacity
                        ? 'This mentor has reached their mentee capacity'
                        : 'This mentor is not currently accepting new mentees'}
                    </p>
                  )}
                  {relationshipState === 'past_mentorship' && (
                    <p className="text-xs text-gray-500 text-center">
                      You previously had a mentorship with this mentor.
                    </p>
                  )}
                  {relationshipState === 'request_rejected' && (
                    <p className="text-xs text-gray-500 text-center">
                      Your last request was not accepted. You may try again later if appropriate.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
