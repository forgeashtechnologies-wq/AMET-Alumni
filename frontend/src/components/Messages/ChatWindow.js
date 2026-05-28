import logger from '../../utils/logger';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase, createThread, checkConnectionStatus } from '../../utils/supabase';
import { useLocation, useNavigate } from 'react-router-dom';
import { idempotentConnect, getLatestEdge, acceptPending, declinePending, cancelPending } from '../../utils/connections';
import { 
  PaperAirplaneIcon, 
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  UserPlusIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import MessageBubble from './MessageBubble';
import { format } from 'date-fns';
import { getDisconnectCooldown, clearDisconnectCooldown, formatCooldownTime } from '../../utils/ui';
import AvatarComponent from '../common/Avatar';
import { useDmRealtime } from '../../hooks/useDmRealtime';
import { useAvatar } from '../../hooks/useAvatar';
import { ensureDmThreadWith, sendDmMessage, mapDmErrorToMessage, fetchThreadMessages } from '../../api/dm';
import { useProfileById } from '../../hooks/useProfileById';
import { useAuth } from '../../contexts/AuthContext';

const ChatWindow = ({ thread, currentUser, onMessageSent, onConnectionAccepted, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [otherProfile, setOtherProfile] = useState(null);
  const [activeThread, setActiveThread] = useState(thread || null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { profile: otherUserProfile } = useProfileById(activeThread?.other_user_id);
  const { isFullyApproved, approvalStatus, isBlocked, userRole } = useAuth();

  const { avatarUrl: peerAvatarUrl } = useAvatar(activeThread?.other_user_id, {
    useSignedUrl: true,
    autoFetch: !!activeThread?.other_user_id,
  });

  // Context from query string (job/event/mentorship)
  const qs = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const ctxJobId = qs.get('job');
  const ctxEventId = qs.get('event');
  const ctxSource = qs.get('source');
  const ctxRelationshipId = qs.get('relationshipId');
  const isMentorshipContext = ctxSource === 'mentorship' && ctxRelationshipId;
  
  // Mentorship relationship state (if applicable)
  const [mentorshipRelationship, setMentorshipRelationship] = useState(null);

  // Fetch mentorship relationship if in mentorship context
  useEffect(() => {
    if (!isMentorshipContext || !ctxRelationshipId) {
      setMentorshipRelationship(null);
      return;
    }
    
    const fetchRelationship = async () => {
      try {
        const { data, error } = await supabase
          .from('mentorship_relationships')
          .select('id, status, mentor_id, mentee_id, start_date, end_date')
          .eq('id', ctxRelationshipId)
          .maybeSingle();
        
        if (!error && data) {
          setMentorshipRelationship(data);
        }
      } catch (err) {
        logger.error('Error fetching mentorship relationship:', err);
      }
    };
    
    fetchRelationship();
  }, [isMentorshipContext, ctxRelationshipId]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const [edge, setEdge] = useState(null);
  const [localAccepted, setLocalAccepted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [cooldownEnd, setCooldownEnd] = useState(null);
  const [cooldownTimer, setCooldownTimer] = useState(null);
  const sendingMessageRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // canSendDerived = expanded/optimistic version of activeThread.can_send.
  // Backend still enforces public.are_connected, so this only affects UX, not security.
  const fromThread = !!(activeThread && activeThread.can_send);  // view / green-dot source
  const fromLocalAccept = !!localAccepted;                        // optimistic, after accept click
  const edgeAccepted = edge && edge.status === 'accepted';        // latest connection row
  const fromRPC = !!isConnected;                                  // result of RPC-based status check
  const canSendDerived = fromThread || fromLocalAccept || !!edgeAccepted || fromRPC;
  const canSendByApproval = !!isFullyApproved && !isBlocked;
  const canSend = canSendByApproval && canSendDerived;

  // Keep local activeThread in sync and ensure dm_threads exists
  useEffect(() => {
    let cancelled = false;
    const ensureThread = async () => {
      try {
        if (!currentUser) return;
        if (!thread) { setActiveThread(null); return; }
        // If we have a thread_id, validate it exists in dm_threads
        if (thread.thread_id) {
          const { data: th } = await supabase
            .from('dm_threads')
            .select('id')
            .eq('id', thread.thread_id)
            .maybeSingle();
          if (th) { if (!cancelled && isMountedRef.current) setActiveThread(thread); return; }
        }
        // If missing or invalid thread_id but we have other_user_id, try to create/resolve
        if (thread.other_user_id) {
          try { await createThread(currentUser.id, thread.other_user_id); } catch(_) { /* ignore */ }
          const { data: resolved } = await supabase
            .from('v_my_dm_threads')
            .select('*')
            .eq('other_user_id', thread.other_user_id)
            .maybeSingle();
          if (!cancelled && isMountedRef.current) setActiveThread(resolved || { other_user_id: thread.other_user_id });
        } else {
          if (!cancelled && isMountedRef.current) setActiveThread(thread);
        }
      } catch (_) {
        if (!cancelled && isMountedRef.current) setActiveThread(thread);
      }
    };
    ensureThread();
    return () => { cancelled = true; };
  }, [thread?.thread_id, thread?.other_user_id, currentUser?.id]);

  useEffect(() => {
    if (!currentUser) return;

    // If we have a thread id, reset state, load messages, and mark the thread as read
    if (activeThread?.thread_id) {
      const threadId = activeThread.thread_id;
      const load = async () => {
        if (!isMountedRef.current) return;
        setLoading(true);
        try {
          // Reset UI to reflect new selection immediately
          if (isMountedRef.current) {
            setMessages([]);
            setOtherProfile(null);
          }
          const { data: pub } = await supabase
            .from('alumni_directory_public')
            .select('id, full_name, avatar_url, current_job_title, company_name, location_city, location_country')
            .eq('id', activeThread.other_user_id)
            .maybeSingle();
          if (pub && isMountedRef.current) {
            setOtherProfile({
              id: pub.id,
              full_name: pub.full_name,
              avatar_url: pub.avatar_url,
              job_title: pub.current_job_title,
              company: pub.company_name,
              location: [pub.location_city, pub.location_country].filter(Boolean).join(', ')
            });
          }

          const sinceISO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const msgs = await fetchThreadMessages(threadId, { since: sinceISO });
          if (isMountedRef.current) {
            setMessages(Array.isArray(msgs) ? msgs : []);
          }

          // Mark this thread as read for the current user so unread counts clear
          try {
            await supabase.rpc('dm_mark_thread_read', {
              p_thread_id: threadId,
              p_user_id: currentUser.id,
            });
          } catch (markErr) {
            logger.warn('Failed to mark DM thread as read', markErr);
          }
        } catch (err) {
          logger.error('Error loading thread:', err);
          toast.error('Failed to load messages.');
        } finally {
          if (isMountedRef.current) {
            setLoading(false);
          }
        }
      };

      load();
    }

    // If deep-linked with only other_user_id, load that user's public profile for header
    if (activeThread?.other_user_id && !activeThread?.thread_id) {
      (async () => {
        try {
          const { data: pub } = await supabase
            .from('alumni_directory_public')
            .select('id, full_name, avatar_url, current_job_title, company_name, location_city, location_country')
            .eq('id', activeThread.other_user_id)
            .maybeSingle();
          if (pub) {
            setOtherProfile({
              id: pub.id,
              full_name: pub.full_name,
              avatar_url: pub.avatar_url,
              job_title: pub.current_job_title,
              company: pub.company_name,
              location: [pub.location_city, pub.location_country].filter(Boolean).join(', ')
            });
          }
        } catch (_) {
          // benign: ignore if profile fetch fails
        }
      })();
    }
  }, [activeThread?.thread_id, activeThread?.other_user_id, currentUser?.id]);

  useDmRealtime(
    activeThread?.thread_id || null,
    useCallback((row) => {
      setMessages((prev) => {
        if (row?.client_id && prev.some((m) => m.client_id === row.client_id)) {
          return prev.map((m) => (m.client_id === row.client_id ? row : m));
        }
        if (prev.some((m) => m.id === row.id)) return prev;
        return [...prev, row];
      });
    }, [])
  );

  // Check connection status
  const checkConnection = useCallback(async () => {
    if (!currentUser?.id || !activeThread?.other_user_id) {
      if (isMountedRef.current) {
        setIsConnected(false);
      }
      return;
    }
    if (!isMountedRef.current) return;
    setCheckingConnection(true);
    try {
      const connected = await checkConnectionStatus(currentUser.id, activeThread.other_user_id);
      if (isMountedRef.current) {
        setIsConnected(connected);
        if (!connected) {
          const cooldown = getDisconnectCooldown(activeThread.other_user_id);
          setCooldownEnd(cooldown);
        } else {
          clearDisconnectCooldown(activeThread.other_user_id);
          setCooldownEnd(null);
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      logger.warn('Failed to check connection status', err);
      if (isMountedRef.current) {
        setIsConnected(false);
      }
    } finally {
      if (isMountedRef.current) {
        setCheckingConnection(false);
      }
    }
  }, [currentUser?.id, activeThread?.other_user_id]);

  // Load current connection edge between users and subscribe to changes (kept same UI behavior)
  useEffect(() => {
    const loadEdge = async () => {
      if (!currentUser?.id || !activeThread?.other_user_id) return;
      try {
        const e = await getLatestEdge(currentUser.id, activeThread.other_user_id);
        if (isMountedRef.current) {
          setEdge(e);
        }
        await checkConnection();
      } catch (err) {
        // eslint-disable-next-line no-console
        logger.warn('Failed to load connection edge', err);
      }
    };
    loadEdge();
  }, [currentUser?.id, activeThread?.other_user_id, checkConnection]);

  const handleSendMessage = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (isSending || sendingMessageRef.current) return;
    if (!newMessage.trim() || !currentUser || !activeThread?.thread_id) return;
    if (isBlocked) {
      toast.error('Your account is restricted and cannot send messages');
      return;
    }
    if (!isFullyApproved) {
      toast.error(
        approvalStatus === 'pending'
          ? 'Your account is pending approval. You can read messages but cannot send new ones yet.'
          : 'You are not allowed to send messages yet.'
      );
      return;
    }
    if (!canSendDerived) {
      toast.error('You must be connected to send messages.');
      return;
    }

    try {
      setIsSending(true);
      sendingMessageRef.current = true;

      const toSend = newMessage.trim();
      // Clear form immediately; rely on realtime delivery
      setNewMessage('');

      try {
        await sendDmMessage(activeThread.thread_id, toSend);
      } catch (err) {
        logger.error('send_dm_message error', err);
        // If not a participant, try to ensure the thread then retry once
        if (err?.message && /Not a participant/i.test(err.message) && activeThread?.other_user_id) {
          try {
            const ensuredId = await ensureDmThreadWith(activeThread.other_user_id);
            if (ensuredId && ensuredId !== activeThread.thread_id) {
              const { data: found } = await supabase
                .from('v_my_dm_threads')
                .select('*')
                .eq('thread_id', ensuredId)
                .maybeSingle();
              if (found) setActiveThread(found);
            }
            await sendDmMessage(ensuredId || activeThread.thread_id, toSend);
          } catch (retryErr) {
            logger.error('retry send_dm_message error', retryErr);
            toast.error(mapDmErrorToMessage(retryErr));
            return;
          }
        } else {
          toast.error(mapDmErrorToMessage(err));
          return;
        }
      }

      if (typeof onMessageSent === 'function') {
        try { onMessageSent(); } catch (_) { /* no-op */ }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      logger.error('Error sending message:', err);
      toast.error(mapDmErrorToMessage(err));
    } finally {
      setIsSending(false);
      sendingMessageRef.current = false;
    }
  };

  const formatMessageDate = (dateString) => {
    const date = new Date(dateString);
    return format(date, 'h:mm a');
  };

  // Cooldown timer effect
  useEffect(() => {
    if (!cooldownEnd) {
      setCooldownTimer(null);
      return;
    }
    const updateTimer = () => {
      const now = Date.now();
      if (now >= cooldownEnd) {
        setCooldownEnd(null);
        setCooldownTimer(null);
        clearDisconnectCooldown(activeThread?.other_user_id);
      } else {
        setCooldownTimer(formatCooldownTime(cooldownEnd));
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [cooldownEnd, activeThread?.other_user_id]);

  const handleReconnect = async () => {
    if (!currentUser?.id || !activeThread?.other_user_id || isReconnecting || cooldownEnd || !isFullyApproved) return;
    if (!isMountedRef.current) return;
    setIsReconnecting(true);
    try {
      await idempotentConnect(currentUser.id, activeThread.other_user_id);
      toast.success('Connection request sent');
      await Promise.all([
        checkConnection(),
        (async () => {
          const { data: updated } = await supabase
            .from('v_my_dm_threads')
            .select('*')
            .eq('other_user_id', activeThread.other_user_id)
            .maybeSingle();
          if (updated && isMountedRef.current) setActiveThread(updated);
        })()
      ]);
    } catch (err) {
      // eslint-disable-next-line no-console
      logger.error('Failed to reconnect:', err);
      toast.error('Failed to send connection request');
    } finally {
      if (isMountedRef.current) {
        setIsReconnecting(false);
      }
    }
  };

  const displayName = (
    otherProfile?.full_name ||
    otherUserProfile?.full_name ||
    activeThread?.other_user_name ||
    ''
  ).trim();
  const headerAvatarUrl = peerAvatarUrl || otherUserProfile?.avatar_url || otherProfile?.avatar_url || null;

  if (!activeThread?.thread_id && activeThread?.other_user_id) {
    // Show header for the selected peer even if the DM thread is not created yet
    return (
      <div className="flex-1 flex flex-col bg-white">
        {(otherProfile || displayName) && (
          <div className="bg-white border-b border-gray-200 p-4 flex items-center sticky top-0 z-10">
            <div className="flex items-center space-x-3">
              {/* Mobile back */}
              <button
                type="button"
                onClick={() => onBack && onBack()}
                className="md:hidden mr-1 p-2 rounded-lg hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
                aria-label="Back to conversations"
              >
                <ArrowLeftIcon className="w-5 h-5 text-gray-700" />
              </button>
              <AvatarComponent src={headerAvatarUrl} alt={displayName || 'Contact'} size={40} />
              <div>
                <h3 className="text-lg font-medium text-gray-900">{displayName || 'Conversation'}</h3>
                {(otherProfile?.job_title || otherProfile?.company) && (
                  <p className="text-sm text-gray-500">
                    {[otherProfile?.job_title, otherProfile?.company].filter(Boolean).join(' at ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty messages area */}
        <div className="flex-1 p-4 flex items-center justify-center">
          <div className="text-center">
            <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500">No conversation yet. The thread will appear once a connection is established.</p>
          </div>
        </div>

        {/* Connection banner without thread */}
        {!canSendDerived && (
          <div className="p-2 bg-yellow-50 border-t border-yellow-200">
            <div className="px-2 text-yellow-800 text-sm font-medium">Connection required to send messages.</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0">
      {/* Header with recipient info */}
      {(otherProfile || displayName) && (
        <div className="bg-white border-b border-gray-200 p-4 flex items-center sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            {/* Mobile back */}
            <button
              type="button"
              onClick={() => onBack && onBack()}
              className="md:hidden mr-1 p-2 rounded-lg hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
              aria-label="Back to conversations"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-700" />
            </button>
            <AvatarComponent src={headerAvatarUrl} alt={displayName || 'Contact'} size={40} />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-medium text-gray-900 flex flex-col sm:flex-row sm:items-center sm:gap-3">
                  <span className="truncate">
                    {activeThread.other_user_full_name || otherProfile?.full_name || displayName || 'User'}
                  </span>
                  {(
                    activeThread.other_user_role !== 'employer' ||
                    !['alumni', 'student', 'admin', 'super_admin'].includes(userRole)
                  ) && (
                    <button
                      type="button"
                      className="text-sm text-ocean-600 hover:text-ocean-700 font-medium"
                      onClick={() => {
                        if (activeThread.other_user_role === 'employer') {
                          navigate(`/companies/${activeThread.other_user_id}`);
                        } else {
                          navigate(`/profile/${activeThread.other_user_id}`);
                        }
                      }}
                    >
                      {activeThread.other_user_role === 'employer' ? 'View Company' : 'View Profile'}
                    </button>
                  )}
                </h3>
                {isMentorshipContext && mentorshipRelationship && (
                  <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
                    Mentorship · {currentUser?.id === mentorshipRelationship.mentor_id ? 'Your Mentee' : 'Your Mentor'}
                  </span>
                )}
              </div>
              {activeThread.other_user_role === 'employer' ? (
                <p className="text-sm text-gray-500">
                  {activeThread.other_user_company || otherProfile?.company || 'Company'}
                </p>
              ) : (
                (otherProfile?.job_title || otherProfile?.company) && (
                  <p className="text-sm text-gray-500">
                    {[otherProfile?.job_title, otherProfile?.company]
                      .filter(Boolean)
                      .join(' at ')}
                  </p>
                )
              )}
              {/* Context chips */}
              {(ctxJobId || ctxEventId) && (
                <div className="mt-1 flex items-center gap-2">
                  {ctxJobId && (
                    <button onClick={() => navigate(`/jobs/${ctxJobId}`)} className="px-2 py-0.5 rounded-full bg-ocean-50 text-ocean-700 text-xs border border-ocean-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2">Job: {ctxJobId}</button>
                  )}
                  {ctxEventId && (
                    <button onClick={() => navigate(`/events/${ctxEventId}`)} className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs border border-green-200">Event: {ctxEventId}</button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mentorship ended banner */}
      {isMentorshipContext && mentorshipRelationship && mentorshipRelationship.status !== 'active' && (
        <div className="bg-blue-50 border-b border-blue-200 p-3">
          <div className="flex items-start gap-2 px-2">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1 text-sm">
              <p className="font-medium text-blue-900">
                {mentorshipRelationship.status === 'ended_by_system' 
                  ? 'This mentorship was ended by the platform'
                  : mentorshipRelationship.status === 'completed'
                  ? 'This mentorship has been completed'
                  : 'This mentorship has ended'}
              </p>
              <p className="text-blue-700 mt-1">
                You can still view past messages, but this mentorship is no longer active.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages - with aria-live for screen reader announcements */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4"
        role="log"
        aria-label="Message history"
        aria-live="polite"
        aria-relevant="additions"
      >
        {loading ? (
          <div className="flex justify-center items-center h-full" role="status" aria-label="Loading messages">
            <div className="text-center">
              <div className="spinner spinner-lg mx-auto mb-3" aria-hidden="true"></div>
              <p className="text-gray-500">Loading messages...</p>
            </div>
          </div>
        ) : messages.length > 0 ? (
          <>
            {/* Screen reader announcement for new messages */}
            <div className="sr-only" aria-live="assertive" aria-atomic="true">
              {messages.length > 0 && `${messages.length} messages in conversation`}
            </div>
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={{ ...message, content: message.content ?? message.body }}
                isOwn={message.sender_id === currentUser?.id}
                timestamp={formatMessageDate(message.created_at)}
                readStatus={false}
                aria-label={`Message ${index + 1} of ${messages.length}`}
              />
            ))}
            <div ref={messagesEndRef} aria-hidden="true" />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center" role="status">
            <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-300 mb-3" aria-hidden="true" />
            <p className="text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        )}
      </div>

      {/* Connection banners */}
      {!canSendDerived && activeThread?.thread_id && (
        <div 
          className="p-3 bg-yellow-50 border-t border-yellow-200"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-center gap-3 px-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1">
              {edge?.status === 'pending' && edge.recipient_id === currentUser?.id ? (
                <div className="flex items-center justify-between">
                  <div className="text-yellow-800 text-sm font-medium">This user requested to connect.</div>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700"
                      onClick={async () => {
                        try {
                          await acceptPending(currentUser.id, activeThread.other_user_id);
                          setLocalAccepted(true);
                          // Optimistically update parent's threads state for instant green dot
                          if (onConnectionAccepted) {
                            onConnectionAccepted(activeThread.other_user_id);
                          }
                          await checkConnection();
                          toast.success('Connection accepted');
                        } catch (err) {
                          // eslint-disable-next-line no-console
                          logger.error(err);
                        }
                      }}
                      aria-label="Accept connection request"
                    >Accept</button>
                    <button
                      className="px-3 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700"
                      onClick={async () => {
                        try {
                          await declinePending(currentUser.id, activeThread.other_user_id);
                          toast('Request rejected');
                        } catch (err) {
                          // eslint-disable-next-line no-console
                          logger.error(err);
                        }
                      }}
                      aria-label="Reject connection request"
                    >Reject</button>
                  </div>
                </div>
              ) : edge?.status === 'pending' && edge.requester_id === currentUser?.id ? (
                <div className="flex items-center justify-between">
                  <div className="text-yellow-800 text-sm font-medium">Connection request pending approval.</div>
                  <button
                    className="px-3 py-1 text-xs rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                    onClick={async () => {
                      try {
                        await cancelPending(currentUser.id, activeThread.other_user_id);
                        await checkConnection();
                        toast('Request canceled');
                      } catch (err) {
                        // eslint-disable-next-line no-console
                        logger.error(err);
                      }
                    }}
                    aria-label="Cancel connection request"
                  >Cancel Request</button>
                </div>
              ) : edge?.status === 'removed' || edge?.status === 'declined' || !isConnected ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-yellow-800 text-sm font-medium">You are disconnected from this user.</div>
                    <div className="text-yellow-700 text-xs mt-0.5">Message history is read-only. Reconnect to continue messaging.</div>
                  </div>
                  <button
                    className="px-3 py-1.5 text-sm rounded bg-ocean-600 text-white hover:bg-ocean-700 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleReconnect}
                    disabled={isReconnecting || !!cooldownEnd || !isFullyApproved}
                    aria-label={
                      !isFullyApproved
                        ? 'Pending approval – cannot reconnect yet'
                        : cooldownEnd
                          ? `Reconnect available in ${cooldownTimer}`
                          : 'Reconnect with this user'
                    }
                    title={
                      !isFullyApproved
                        ? 'Your account is pending approval. You can browse but cannot send new connection requests yet.'
                        : cooldownEnd
                          ? `You can reconnect in ${cooldownTimer}`
                          : ''
                    }
                  >
                    <UserPlusIcon className="w-4 h-4" aria-hidden="true" />
                    {!isFullyApproved
                      ? 'Pending approval – cannot reconnect'
                      : isReconnecting
                        ? 'Sending...'
                        : cooldownEnd
                          ? `Wait ${cooldownTimer}`
                          : 'Reconnect'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="text-yellow-800 text-sm font-medium">Connection required to send messages.</div>
                  <button
                    className="px-3 py-1.5 text-sm rounded bg-ocean-600 text-white hover:bg-ocean-700 flex items-center gap-1.5"
                    onClick={handleReconnect}
                    disabled={!isFullyApproved}
                    aria-label={
                      !isFullyApproved
                        ? 'Pending approval – cannot send connection request'
                        : 'Request connection'
                    }
                  >
                    <UserPlusIcon className="w-4 h-4" aria-hidden="true" />
                    {isFullyApproved ? 'Request Connection' : 'Pending approval'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-white sticky bottom-0 safe-bottom">
        <form 
          onSubmit={(e) => { e.preventDefault(); if (!isSending) handleSendMessage(e); }} 
          className="flex items-end space-x-2"
          aria-label="Send a message"
        >
          <div className="flex-1">
            <label htmlFor="message-input" className="sr-only">
              Type your message
            </label>
            <div className="relative">
              <textarea
                id="message-input"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && canSend) {
                    e.preventDefault();
                    if (!isSending) handleSendMessage(e);
                  }
                }}
                className={`form-input w-full py-3 rounded-lg resize-none ${!canSend ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                rows="1"
                placeholder={
                  !isFullyApproved
                    ? 'Messaging is locked until your account is approved.'
                    : canSendDerived
                      ? 'Type a message...'
                      : 'Cannot send messages - connection required'
                }
                disabled={!canSend}
                aria-describedby={!canSend ? 'message-input-help' : undefined}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim() || !canSend || isSending}
            aria-label={isSending ? 'Sending message...' : 'Send message'}
            aria-busy={isSending}
            title={
              !isFullyApproved
                ? 'Your account must be approved before you can send messages.'
                : !canSendDerived
                  ? 'Send a connection request to start messaging.'
                  : ''
            }
            className="btn-ocean p-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed tap-target"
          >
            {isSending ? (
              <div className="spinner spinner-sm" aria-hidden="true" />
            ) : (
              <PaperAirplaneIcon className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </form>
        
        {/* Status announcement for screen readers */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {isSending && 'Sending message...'}
        </div>
        {!isFullyApproved && (
          <p className="mt-1 text-xs text-yellow-700" role="note">
            {approvalStatus === 'pending'
              ? 'Your account is pending approval. You can read messages but cannot send new ones yet.'
              : 'You are not allowed to send new messages yet. Please contact an administrator.'}
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;
