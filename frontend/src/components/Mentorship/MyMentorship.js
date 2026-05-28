/**
 * @deprecated LEGACY COMPONENT - DO NOT USE IN NEW CODE
 * 
 * ⚠️ WARNING: This component is DEPRECATED and must not be used in new features.
 * 
 * The mentorship module has been refactored to use canonical backend RPCs and a panel-based architecture.
 * 
 * CORRECT APPROACH - Use the new mentorship hub:
 * - Route: /mentorship (handled by MentorshipLayout.jsx)
 * - MentorshipHub.jsx - Central hub with tab routing
 * - panels/FindMentorsPanel.jsx - Browse mentors
 * - panels/MyMentorsPanel.jsx - My mentors (as mentee)
 * - panels/MyMenteesPanel.jsx - My mentees (as mentor)
 * - panels/RequestsPanel.jsx - Sent/received requests
 * - panels/MentorshipSettingsPanel.jsx - Mentor profile & availability
 * 
 * All write operations now use canonical API:
 * - api/mentorshipApi.ts - Wraps all mentorship RPCs
 * - createMentorshipRequest, cancelMentorshipRequest, respondToMentorshipRequest
 * - endMentorshipRelationship, openMentorshipChat
 * 
 * All chat functionality now uses:
 * - useOpenMentorshipChat hook (calls mentorship_open_chat RPC)
 * - Navigates to /messages?conversationId=<id>&source=mentorship&relationshipId=<id>
 * - ChatWindow.js renders mentorship-aware UI
 * 
 * LEGACY ISSUES WITH THIS COMPONENT:
 * - Uses deprecated ensureDmThreadWith directly (bypasses mentorship_open_chat RPC)
 * - Mixes mutation hooks with direct RPC calls
 * - Does not use centralized error mapping
 * - Does not use MentorshipStatusChip for consistent status display
 * 
 * This file is kept temporarily for reference only.
 * DO NOT route to this component. DO NOT import it in new code.
 */
import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase, onPostgresChangesOnce } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getAccountStatus } from '../../utils/accountStatus';
import { Link, useNavigate } from 'react-router-dom';
import MentorRegistrationForm from './MentorRegistrationForm';
import CreateSessionModal from './CreateSessionModal';
import { getPublicIdentity } from '../../lib/hydrateIdentity';
import logger from '../../utils/logger';
import { idempotentConnect, acceptPending } from '../../utils/connections';
import { RequestStatusChip } from '../../lib/statusChips';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMenteeRequests, fetchMentorRequests } from '../../lib/queries/mentorship';
import { mapSupabaseErrorToToast } from '../../utils/mapSupabaseErrorToToast';
import { ensureDmThreadWith } from '../../api/dm'; // @deprecated - use useOpenMentorshipChat instead
import { useAvatars } from '../../hooks/useAvatar';
import {
  useCancelMentorshipRequest,
  useAcceptMentorshipRequest,
  useRejectMentorshipRequest,
  useToggleMentorAvailability,
} from '../../hooks/useMentorshipMutations';

// Small 3-row skeleton for lists
function ListSkeleton({ rows = 3 }) {
  return (
    <ul className="divide-y">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="py-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200" />
            <div className="flex-1">
              <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/4" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

// Cancel button with optimistic React Query update
function CancelButton({ requestId }) {
  const mutation = useCancelMentorshipRequest();
  return (
    <button
      className="btn-ocean-outline px-3 py-1.5 rounded"
      onClick={() =>
        mutation.mutate(requestId, {
          onSuccess: () => {
            toast.dismiss('rq-info');
            toast.success('Request cancelled', { id: 'rq-info' });
          },
        })
      }
      disabled={mutation.isLoading}
    >
      Cancel Request
    </button>
  );
}

export default function MyMentorship() {
  const { user, profile, fetchUserProfile, getUserRole } = useAuth();
  const role = getUserRole ? getUserRole() : undefined;
  const [mentorRow, setMentorRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  const [requestTab, setRequestTab] = useState('received'); // 'received' | 'sent'
  const navigate = useNavigate();
  // Mentee requests via React Query
  const menteeReqQuery = useQuery({
    queryKey: ['menteeRequests', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const q = await fetchMenteeRequests(user.id, {});
      const { data: rows, error } = await q;
      if (error) throw error;
      const hydrated = await Promise.all((rows || []).map(async (r) => ({
        ...r,
        mentor: await getPublicIdentity(r.mentor_id),
      })));
      return hydrated;
    },
    staleTime: 60_000,
  });
  const requests = menteeReqQuery.data || [];
  const reqLoading = menteeReqQuery.isLoading || menteeReqQuery.isFetching;

  // Mentor (received) requests via React Query
  const mentorReqQuery = useQuery({
    queryKey: ['mentorRequests', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const q = await fetchMentorRequests(user.id, {});
      const { data: rows, error } = await q;
      if (error) throw error;
      const hydrated = await Promise.all((rows || []).map(async (r) => ({
        ...r,
        mentee: await getPublicIdentity(r.mentee_id),
      })));
      return hydrated;
    },
    staleTime: 60_000,
  });
  const received = mentorReqQuery.data || [];
  const receivedLoading = mentorReqQuery.isLoading || mentorReqQuery.isFetching;
  const relationshipsQuery = useQuery({
    queryKey: ['myMentorshipRelationships', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_my_mentorship_relationships')
        .select('*');
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
  const relationships = relationshipsQuery.data || [];
  const relationshipsLoading = relationshipsQuery.isLoading || relationshipsQuery.isFetching;
  const [sessionModal, setSessionModal] = useState({ open: false, requestId: null, mentorId: null, menteeId: null });

  const participantIds = Array.from(new Set([
    ...(received || []).map((r) => r.mentee?.id || r.mentee_id).filter(Boolean),
    ...(requests || []).map((r) => r.mentor?.id || r.mentor_id).filter(Boolean),
  ]));

  const { avatarUrls } = useAvatars(participantIds, {
    useSignedUrls: true,
    autoFetch: participantIds.length > 0,
  });

  const acceptMutation = useAcceptMentorshipRequest();
  const rejectMutation = useRejectMentorshipRequest();
  const toggleAvailabilityMutation = useToggleMentorAvailability();

  const handleOpenChat = useCallback(async (req) => {
    try {
      if (!user?.id) {
        toast.error('You must be logged in to open chat.');
        return;
      }
      const otherUserId = user.id === req.mentor_id ? req.mentee_id : req.mentor_id;
      if (!otherUserId) {
        toast.error('Unable to determine conversation partner.');
        return;
      }
      const threadId = await ensureDmThreadWith(otherUserId);
      navigate(`/messages?threadId=${encodeURIComponent(threadId)}&source=mentorship&requestId=${encodeURIComponent(req.id)}`);
    } catch (e) {
      logger.error(e);
      toast.error('Could not open chat. Please try again.');
    }
  }, [user?.id, navigate]);

  useEffect(() => {
    const fetchMyMentor = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('mentors')
        .select(`*, applicant:profiles!mentors_user_id_fkey(full_name, avatar_url)`) 
        .eq('user_id', user.id)
        .maybeSingle();
      if (!error) setMentorRow(data);
      setLoading(false);
    };

    fetchMyMentor();
  }, [user, fetchUserProfile]);

  const activeRelationships = relationships.filter((r) => r && r.status === 'active');
  const pastRelationships = relationships.filter((r) => r && r.status !== 'active');

  // Read initial availability from profiles for the current user
  useEffect(() => {
    const readAvailability = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('is_available_for_mentorship')
        .eq('id', user.id)
        .maybeSingle();
      if (!error && data) {
        setIsAvailable(!!data.is_available_for_mentorship);
      } else if (profile && typeof profile.is_available_for_mentorship === 'boolean') {
        setIsAvailable(!!profile.is_available_for_mentorship);
      }
    };
    readAvailability();
  }, [user, profile]);

  // Manual refresh
  const refreshMenteeRequests = useCallback(() => {
    if (user?.id) queryClient.invalidateQueries({ queryKey: ['menteeRequests', user.id] });
  }, [queryClient, user?.id]);

  // Realtime for my requests (INSERT/UPDATE)
  useEffect(() => {
    if (!user?.id) return;
    const channelName = `mentee-requests-${user.id}`;
    onPostgresChangesOnce(
      channelName,
      `mentee-requests-insert-${user.id}`,
      { event: 'INSERT', schema: 'public', table: 'mentorship_requests', filter: `mentee_id=eq.${user.id}` },
      () => refreshMenteeRequests()
    );
    onPostgresChangesOnce(
      channelName,
      `mentee-requests-update-${user.id}`,
      { event: 'UPDATE', schema: 'public', table: 'mentorship_requests', filter: `mentee_id=eq.${user.id}` },
      () => refreshMenteeRequests()
    );
  }, [user, refreshMenteeRequests]);

  // Realtime for mentor received requests (INSERT/UPDATE)
  useEffect(() => {
    if (!user?.id) return;
    const channelName = `mentor-requests-${user.id}`;
    onPostgresChangesOnce(
      channelName,
      `mentor-requests-insert-${user.id}`,
      { event: 'INSERT', schema: 'public', table: 'mentorship_requests', filter: `mentor_id=eq.${user.id}` },
      () => queryClient.invalidateQueries({ queryKey: ['mentorRequests', user?.id] })
    );
    onPostgresChangesOnce(
      channelName,
      `mentor-requests-update-${user.id}`,
      { event: 'UPDATE', schema: 'public', table: 'mentorship_requests', filter: `mentor_id=eq.${user.id}` },
      () => queryClient.invalidateQueries({ queryKey: ['mentorRequests', user?.id] })
    );
  }, [user, queryClient]);

  // Accept/Reject handlers for mentor side
  const handleAccept = useCallback(async (req) => {
    try {
      await acceptMutation.mutateAsync(req.id);
      toast.success('Request accepted');
      // Ensure a connection exists so chat can start immediately
      try {
        // Try to accept if mentee already requested connection
        await acceptPending(user.id, req.mentee_id);
      } catch (_) { /* benign */ }
      try {
        // Otherwise send a request; DM will be available once mentee accepts
        await idempotentConnect(user.id, req.mentee_id);
      } catch (_) { /* benign */ }
      queryClient.invalidateQueries({ queryKey: ['mentorRequests', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['menteeRequests', user?.id] });
    } catch (e) {
      mapSupabaseErrorToToast(e, 'Failed to accept request');
    }
  }, [user?.id, acceptMutation, queryClient]);

  const handleReject = useCallback(async (id) => {
    try {
      await rejectMutation.mutateAsync(id);
      toast.success('Request rejected');
      queryClient.invalidateQueries({ queryKey: ['mentorRequests'] });
      queryClient.invalidateQueries({ queryKey: ['menteeRequests'] });
    } catch (e) {
      mapSupabaseErrorToToast(e, 'Failed to reject request');
    }
  }, [rejectMutation, queryClient]);

  const openSchedule = (req) => {
    setSessionModal({ open: true, requestId: req.id, mentorId: null, menteeId: null });
  };
  const closeSchedule = () => setSessionModal({ open: false, requestId: null, mentorId: null, menteeId: null });

  const statusChip = (status) => <RequestStatusChip status={status} />;

  const toggleAvailability = useCallback(async (next) => {
    if (!user) return;
    setIsSaving(true);
    // Optimistic UI update
    setIsAvailable(next);
    try {
      await toggleAvailabilityMutation.mutateAsync(next);
      // Refresh AuthContext state so the value persists across sessions, then toast once
      await fetchUserProfile(user.id);
      toast.success('Availability updated');

    } catch (e) {
      logger.error('Failed to update availability', e);
      toast.error('Failed to update availability');
      // Revert optimistic state
      setIsAvailable(!next);
    } finally {
      setIsSaving(false);
    }
  }, [user, toggleAvailabilityMutation, fetchUserProfile]);

  const compositeBadge = () => {
    const status = profile ? getAccountStatus(profile) : null;
    if (!status || status.code !== 'approved') return null;
    const st = mentorRow?.status;
    if (st === 'approved') return (
      <span className="ml-3 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved + Mentor</span>
    );
    return (
      <span className="ml-3 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Approved + Mentor Pending</span>
    );
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-semibold text-gray-800">My Mentorship</h1>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // No mentor profile yet → for students and non-mentors, show mentee view only (no registration form here)
  if (!mentorRow) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-semibold text-gray-800">My Mentorship</h1>
          <p className="text-sm text-gray-600 mt-1">Your mentorship requests and sessions as a mentee.</p>
        </div>

        {/* Requests panel (Received/Sent) */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-gray-800">Requests</h2>
            <div className="flex gap-2">
              <button
                className={`px-3 py-1.5 rounded text-sm ${requestTab === 'received' ? 'btn-ocean' : 'btn-ocean-outline'}`}
                onClick={() => setRequestTab('received')}
              >
                Received ({received.length})
              </button>
              <button
                className={`px-3 py-1.5 rounded text-sm ${requestTab === 'sent' ? 'btn-ocean' : 'btn-ocean-outline'}`}
                onClick={() => setRequestTab('sent')}
              >
                Sent ({requests.length})
              </button>
            </div>
          </div>

          {/* Received tab */}
          {requestTab === 'received' && (
            receivedLoading ? (
              <ListSkeleton rows={3} />
            ) : received.length === 0 ? (
              <p className="text-gray-600">No requests received.</p>
            ) : (
              <ul className="divide-y">
                {received.map((r) => (
                  <li key={r.id} className={`py-3 flex items-center justify-between ${r.status === 'rejected' ? 'opacity-70' : ''}`}>
                    <div className="flex items-center gap-3">
                      <img
                        src={avatarUrls[r.mentee?.id || r.mentee_id] || r.mentee?.avatar_url || '/default-avatar.svg'}
                        alt={r.mentee?.full_name || 'Mentee'}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{r.mentee?.full_name || 'Mentee'}</div>
                        <div className="text-sm text-gray-600">{new Date(r.created_at).toLocaleString()}</div>
                        <div className="mt-1">{statusChip(r.status)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.status === 'pending' && (
                        <>
                          <button onClick={() => handleAccept(r)} className="btn-ocean px-3 py-1.5 rounded">Accept</button>
                          <button onClick={() => handleReject(r.id)} className="btn-ocean-outline px-3 py-1.5 rounded">Reject</button>
                        </>
                      )}
                      {r.status === 'accepted' && (
                        <button
                          type="button"
                          onClick={() => handleOpenChat(r)}
                          className="btn-ocean px-3 py-1.5 rounded"
                        >
                          Go to Chat
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}

          {/* Sent tab */}
          {requestTab === 'sent' && (
            reqLoading ? (
              <ListSkeleton rows={3} />
            ) : requests.length === 0 ? (
              <p className="text-gray-600">No items yet.</p>
            ) : (
              <ul className="divide-y">
                {requests.map((r) => (
                  <li key={r.id} className={`py-3 flex items-center justify-between ${r.status === 'rejected' || r.status?.startsWith('cancelled') ? 'opacity-70' : ''}`} title={r.status === 'rejected' || (r.status && r.status.startsWith('cancelled')) ? 'This request is closed.' : ''}>
                    <div className="flex items-center gap-3">
                      <img
                        src={avatarUrls[r.mentor?.id || r.mentor_id] || r.mentor?.avatar_url || '/default-avatar.svg'}
                        alt={r.mentor?.full_name || 'Mentor'}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{r.mentor?.full_name || 'Mentor'}</div>
                        <div className="text-sm text-gray-600">{new Date(r.created_at).toLocaleString()}</div>
                        <div className="mt-1">{statusChip(r.status)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.status === 'accepted' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenChat(r)}
                            className="btn-ocean px-3 py-1.5 rounded"
                          >
                            Start Chat
                          </button>
                          <button onClick={() => openSchedule(r)} className="btn-ocean-outline px-3 py-1.5 rounded">Schedule Session</button>
                        </>
                      )}
                      {r.status === 'pending' && (
                        <CancelButton requestId={r.id} />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      </div>
    );
  }

  // Pending
  if (mentorRow.status === 'pending') {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <h1 className="text-2xl font-semibold text-gray-800">My Mentorship</h1>
            {compositeBadge()}
          </div>
          {/* Availability Switch */}
          <div className="mt-3 flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="toggle-checkbox h-5 w-10"
                checked={isAvailable}
                onChange={(e) => toggleAvailability(e.target.checked)}
                disabled={isSaving}
              />
              <span className="text-sm font-medium">Accepting mentees</span>
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {isAvailable
              ? "You’re visible in the Mentor directory and can receive new requests."
              : "You’re hidden from the Mentor directory and cannot receive new requests."}
          </p>
          <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm font-medium">Pending admin approval</div>
          <p className="mt-3 text-gray-600">Your mentor application has been submitted and is awaiting review.</p>
          <div className="mt-4">
            <Link to="/mentorship/become-mentor" className="btn-ocean-outline px-4 py-2 rounded">Edit & Resubmit</Link>
          </div>
        </div>

        {/* My Mentorships section for active/past relationships */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">My Mentorships</h2>
          {relationshipsLoading ? (
            <ListSkeleton rows={3} />
          ) : relationships.length === 0 ? (
            <p className="text-gray-600">You don't have any mentorships yet.</p>
          ) : (
            <>
              {activeRelationships.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Active</h3>
                  <ul className="divide-y">
                    {activeRelationships.map((r) => {
                      const amMentor = r.mentor_id === user.id;
                      const otherName = amMentor ? r.mentee_name || 'Mentee' : r.mentor_name || 'Mentor';
                      const otherId = amMentor ? r.mentee_id : r.mentor_id;
                      return (
                        <li key={r.id} className="py-3 flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{otherName}</div>
                            {r.start_date && (
                              <div className="text-xs text-gray-600">Since {new Date(r.start_date).toLocaleDateString()}</div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                if (!otherId) {
                                  toast.error('Unable to determine conversation partner.');
                                  return;
                                }
                                const threadId = await ensureDmThreadWith(otherId);
                                navigate(`/messages?threadId=${encodeURIComponent(threadId)}&source=mentorship&relationshipId=${encodeURIComponent(r.id)}`);
                              } catch (e) {
                                logger.error(e);
                                toast.error('Could not open chat. Please try again.');
                              }
                            }}
                            className="btn-ocean px-3 py-1.5 rounded"
                          >
                            Go to Chat
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {pastRelationships.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Past</h3>
                  <ul className="divide-y">
                    {pastRelationships.map((r) => {
                      const amMentor = r.mentor_id === user.id;
                      const otherName = amMentor ? r.mentee_name || 'Mentee' : r.mentor_name || 'Mentor';
                      return (
                        <li key={r.id} className="py-3 flex items-center justify-between opacity-75">
                          <div>
                            <div className="font-medium text-gray-900">{otherName}</div>
                            {r.start_date && (
                              <div className="text-xs text-gray-600">
                                {new Date(r.start_date).toLocaleDateString()} – {r.end_date ? new Date(r.end_date).toLocaleDateString() : 'ended'}
                              </div>
                            )}
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">{r.status}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // Rejected
  if (mentorRow.status === 'rejected') {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <h1 className="text-2xl font-semibold text-gray-800">My Mentorship</h1>
            {compositeBadge()}
          </div>
          {/* Availability Switch */}
          <div className="mt-3 flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="toggle-checkbox h-5 w-10"
                checked={isAvailable}
                onChange={(e) => toggleAvailability(e.target.checked)}
                disabled={isSaving}
              />
              <span className="text-sm font-medium">Accepting mentees</span>
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {isAvailable
              ? "You’re visible in the Mentor directory and can receive new requests."
              : "You’re hidden from the Mentor directory and cannot receive new requests."}
          </p>
          <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm font-medium">Rejected</div>
          <p className="mt-3 text-gray-600">Your mentor application was rejected. Please edit and resubmit your details.</p>
          <div className="mt-4">
            <Link to="/mentorship/become-mentor" className="btn-ocean-outline px-4 py-2 rounded">Edit & Resubmit</Link>
          </div>
        </div>
      </div>
    );
  }

  // Approved
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center">
          <h1 className="text-2xl font-semibold text-gray-800">My Mentorship</h1>
          {compositeBadge()}
        </div>
        {/* Availability Switch */}
        <div className="mt-3 flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="toggle-checkbox h-5 w-10"
              checked={isAvailable}
              onChange={(e) => toggleAvailability(e.target.checked)}
              disabled={isSaving}
            />
            <span className="text-sm font-medium">Accepting mentees</span>
          </label>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {isAvailable
            ? "You’re visible in the Mentor directory and can receive new requests."
            : "You’re hidden from the Mentor directory and cannot receive new requests."}
        </p>
        <div className="mt-4 flex items-start gap-4">
          {mentorRow.applicant?.id && (
            <img
              src={avatarUrls[mentorRow.applicant.id] || mentorRow.applicant.avatar_url || '/default-avatar.svg'}
              alt="avatar"
              className="w-16 h-16 rounded-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/default-avatar.svg';
              }}
            />
          )}
          <div>
            <div className="text-lg font-medium">{mentorRow.applicant?.full_name || 'My Mentor Profile'}</div>
            {Array.isArray(mentorRow.expertise) && mentorRow.expertise.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {mentorRow.expertise.map((x, i) => (
                  <span key={i} className="px-2 py-1 bg-ocean-100 text-ocean-800 rounded text-xs">{x}</span>
                ))}
              </div>
            )}
            {mentorRow.mentoring_preferences && (
              <div className="mt-2 text-sm text-gray-700">
                <div>Preferences:</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {mentorRow.mentoring_preferences.communication && (
                    <span className="px-2 py-1 bg-gray-100 rounded">Communication: {mentorRow.mentoring_preferences.communication}</span>
                  )}
                  {mentorRow.mentoring_preferences.format && (
                    <span className="px-2 py-1 bg-gray-100 rounded">Format: {mentorRow.mentoring_preferences.format}</span>
                  )}
                  {mentorRow.mentoring_preferences.duration && (
                    <span className="px-2 py-1 bg-gray-100 rounded">Duration: {mentorRow.mentoring_preferences.duration}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Requests panel (Received/Sent) */}
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-gray-800">Requests</h2>
            <div className="flex gap-2">
              <button
                className={`px-3 py-1.5 rounded text-sm ${requestTab === 'received' ? 'btn-ocean' : 'btn-ocean-outline'}`}
                onClick={() => setRequestTab('received')}
              >
                Received ({received.length})
              </button>
              <button
                className={`px-3 py-1.5 rounded text-sm ${requestTab === 'sent' ? 'btn-ocean' : 'btn-ocean-outline'}`}
                onClick={() => setRequestTab('sent')}
              >
                Sent ({requests.length})
              </button>
            </div>
          </div>

          {/* Received tab */}
          {requestTab === 'received' && (
            receivedLoading ? (
              <ListSkeleton rows={3} />
            ) : received.length === 0 ? (
              <p className="text-gray-600">No requests received.</p>
            ) : (
              <ul className="divide-y">
                {received.map((r) => (
                  <li key={r.id} className={`py-3 flex items-center justify-between ${r.status === 'rejected' ? 'opacity-70' : ''}`}>
                    <div className="flex items-center gap-3">
                      <img
                        src={avatarUrls[r.mentee?.id || r.mentee_id] || r.mentee?.avatar_url || '/default-avatar.svg'}
                        alt={r.mentee?.full_name || 'Mentee'}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/default-avatar.svg';
                        }}
                      />
                      <div>
                        <div className="font-medium text-gray-900">{r.mentee?.full_name || 'Mentee'}</div>
                        <div className="text-sm text-gray-600">{new Date(r.created_at).toLocaleString()}</div>
                        <div className="mt-1">{statusChip(r.status)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.status === 'pending' && (
                        <>
                          <button onClick={() => handleAccept(r)} className="btn-ocean px-3 py-1.5 rounded">Accept</button>
                          <button onClick={() => handleReject(r.id)} className="btn-ocean-outline px-3 py-1.5 rounded">Reject</button>
                        </>
                      )}
                      {r.status === 'accepted' && (
                        <Link to={`/messages?tab=chats&peer=${encodeURIComponent(r.mentee?.id || r.mentee_id)}`} className="btn-ocean px-3 py-1.5 rounded">Go to Chat</Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}

          {/* Sent tab */}
          {requestTab === 'sent' && (
            reqLoading ? (
              <ListSkeleton rows={3} />
            ) : requests.length === 0 ? (
              <p className="text-gray-600">No items yet.</p>
            ) : (
              <ul className="divide-y">
                {requests.map((r) => (
                  <li key={r.id} className={`py-3 flex items-center justify-between ${r.status === 'rejected' || r.status?.startsWith('cancelled') ? 'opacity-70' : ''}`} title={r.status === 'rejected' || (r.status && r.status.startsWith('cancelled')) ? 'This request is closed.' : ''}>
                    <div className="flex items-center gap-3">
                      <img
                        src={avatarUrls[r.mentor?.id || r.mentor_id] || r.mentor?.avatar_url || '/default-avatar.svg'}
                        alt={r.mentor?.full_name || 'Mentor'}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/default-avatar.svg';
                        }}
                      />
                      <div>
                        <div className="font-medium text-gray-900">{r.mentor?.full_name || 'Mentor'}</div>
                        <div className="text-sm text-gray-600">{new Date(r.created_at).toLocaleString()}</div>
                        <div className="mt-1">{statusChip(r.status)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.status === 'accepted' && (
                        <>
                          <Link to={`/messages?tab=chats&peer=${encodeURIComponent(r.mentor?.id || r.mentor_id)}`} className="btn-ocean px-3 py-1.5 rounded">Start Chat</Link>
                          <button onClick={() => openSchedule(r)} className="btn-ocean-outline px-3 py-1.5 rounded">Schedule Session</button>
                        </>
                      )}
                      {r.status === 'pending' && (
                        <CancelButton requestId={r.id} />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      </div>

      

      {/* Session Modal */}
      <CreateSessionModal
        open={sessionModal.open}
        onClose={closeSchedule}
        requestId={sessionModal.requestId}
      />
    </div>
  );
}
