import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchMenteeRequests, fetchMentorRequests } from '../../../lib/queries/mentorship';
import { getPublicIdentity } from '../../../lib/hydrateIdentity';
import { respondToMentorshipRequest, cancelMentorshipRequest } from '../../../api/mentorshipApi';
import { mapMentorshipError } from '../../../utils/mentorshipErrorMap';
import { useOpenMentorshipChat } from '../../../hooks/useOpenMentorshipChat';
import { acceptPending, idempotentConnect } from '../../../utils/connections';
import MentorshipRequestCard from '../cards/MentorshipRequestCard';
import { toast } from 'react-hot-toast';
import { MENTORSHIP_COPY } from '../../../constants/mentorshipCopy';

/**
 * Panel showing mentorship requests (sent and received).
 * Integrates with real data and mutation hooks.
 */
export default function RequestsPanel({ sub, highlightRequestId }) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSub, setActiveSub] = useState(sub === 'received' ? 'received' : 'sent');
  const isSent = activeSub === 'sent';
  const highlightRef = useRef(null);
  const [processingId, setProcessingId] = useState(null);
  const { openChat } = useOpenMentorshipChat();
  
  const handleSubChange = (nextSub) => {
    setActiveSub(nextSub);
    const params = new URLSearchParams(searchParams);
    params.set('tab', 'requests');
    params.set('sub', nextSub);
    setSearchParams(params);
  };
  
  // Fetch requests based on direction
  const { data: requests, isLoading, error, refetch } = useQuery({
    queryKey: ['mentorship-requests', user?.id, isSent ? 'sent' : 'received'],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Only show pending requests in this panel. Accepted requests
      // move into mentorship relationships panels.
      const query = isSent
        ? await fetchMenteeRequests(user.id, { status: 'pending' })
        : await fetchMentorRequests(user.id, { status: 'pending' });

      const { data, error } = query;

      if (error) throw error;

      const rows = data || [];

      // Hydrate identities via getPublicIdentity so we always show the
      // canonical name/avatar from alumni_directory_public / profiles,
      // just like the legacy MyMentorship component.
      return Promise.all(
        rows.map(async (req) => {
          const out = { ...req };
          if (isSent && req.mentor_id) {
            out.mentor = await getPublicIdentity(req.mentor_id);
          }
          if (!isSent && req.mentee_id) {
            out.mentee = await getPublicIdentity(req.mentee_id);
          }
          return out;
        }),
      );
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds
  });
  
  // Scroll to highlighted request
  useEffect(() => {
    if (highlightRequestId && highlightRef.current) {
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [highlightRequestId]);
  
  const handleAccept = async (request) => {
    setProcessingId(request.id);
    try {
      const { relationshipId } = await respondToMentorshipRequest(request.id, 'accepted');
      toast.success('Mentorship request accepted');

      // Ensure a connection exists so DM chat can be used immediately.
      // Mirror legacy MyMentorship behavior: accept pending edge if mentee already requested,
      // otherwise initiate a fresh connection request from mentor to mentee.
      try {
        if (user?.id && request.mentee_id) {
          try {
            await acceptPending(user.id, request.mentee_id);
          } catch (_) { /* benign */ }
          try {
            await idempotentConnect(user.id, request.mentee_id);
          } catch (_) { /* benign */ }
        }
      } catch (_) {
        // Connection issues should not block mentorship acceptance; chat UI will still gate.
      }

      refetch();
      // Optionally open chat immediately if relationshipId is returned
      if (relationshipId) {
        // Could call openChat(relationshipId) here if desired
      }
    } catch (error) {
      const mapped = mapMentorshipError(error);
      toast.error(mapped.message);
    } finally {
      setProcessingId(null);
    }
  };
  
  const handleReject = async (requestId) => {
    setProcessingId(requestId);
    try {
      await respondToMentorshipRequest(requestId, 'rejected');
      toast.success('Request declined');
      refetch();
    } catch (error) {
      const mapped = mapMentorshipError(error);
      toast.error(mapped.message);
    } finally {
      setProcessingId(null);
    }
  };
  
  const handleCancel = async (requestId) => {
    setProcessingId(requestId);
    try {
      await cancelMentorshipRequest(requestId);
      toast.success('Request cancelled');
      refetch();
    } catch (error) {
      const mapped = mapMentorshipError(error);
      toast.error(mapped.message);
    } finally {
      setProcessingId(null);
    }
  };
  
  if (error) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <p className="text-rose-600 mb-3">Error loading requests: {error.message}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
        >
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          {isSent ? 'Requests I Sent' : 'Requests I Received'}
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          {isSent 
            ? MENTORSHIP_COPY.emptyStates.requests.sent.none.body
            : MENTORSHIP_COPY.emptyStates.requests.received.none.body}
        </p>

        {/* Local toggle between Sent / Received to support dual-role mentors */}
        <div className="mt-4 inline-flex rounded-full bg-slate-100 p-1 text-sm">
          <button
            type="button"
            className={`px-3 py-1.5 rounded-full ${isSent ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
            onClick={() => handleSubChange('sent')}
          >
            Sent
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-full ${!isSent ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
            onClick={() => handleSubChange('received')}
          >
            Received
          </button>
        </div>
      </div>
      
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
          <div className="flex flex-col items-center gap-3">
            <div className="spinner spinner-lg" aria-hidden="true" />
            <p className="text-sm text-slate-500 font-medium">Loading requests...</p>
            <span className="sr-only">Loading requests...</span>
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {!isLoading && (!requests || requests.length === 0) && (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-4">
            {isSent ? '📨' : '📬'}
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {isSent
              ? MENTORSHIP_COPY.emptyStates.requests.sent.none.title
              : MENTORSHIP_COPY.emptyStates.requests.received.none.title}
          </h3>
          <p className="text-slate-600">
            {isSent
              ? MENTORSHIP_COPY.emptyStates.requests.sent.none.body
              : MENTORSHIP_COPY.emptyStates.requests.received.none.body}
          </p>
        </div>
      )}
      
      {/* Request Cards */}
      {!isLoading && requests && requests.length > 0 && (
        <div className="space-y-4 page-enter">
          {requests.map((request) => (
            <div
              key={request.id}
              ref={request.id === highlightRequestId ? highlightRef : null}
            >
              <MentorshipRequestCard
                direction={isSent ? 'sent' : 'received'}
                otherUser={isSent ? request.mentor : request.mentee}
                status={request.status}
                requestId={request.id}
                createdAt={request.created_at}
                relationshipId={request.relationship_id}
                onAccept={!isSent ? () => handleAccept(request) : undefined}
                onReject={!isSent ? () => handleReject(request.id) : undefined}
                onCancel={isSent ? () => handleCancel(request.id) : undefined}
                highlighted={request.id === highlightRequestId}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
