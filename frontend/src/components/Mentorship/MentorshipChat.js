/**
 * @deprecated LEGACY COMPONENT - DO NOT USE IN NEW CODE
 * 
 * ⚠️ WARNING: This component is DEPRECATED and must not be used in new features.
 * 
 * All mentorship chat functionality has been migrated to the unified /messages system.
 * 
 * CORRECT APPROACH:
 * 1. Use `useOpenMentorshipChat` hook from hooks/useOpenMentorshipChat.js
 * 2. Call openChat(relationshipId) which uses the canonical mentorship_open_chat RPC
 * 3. User is navigated to /messages?conversationId=<id>&source=mentorship&relationshipId=<id>
 * 4. ChatWindow.js renders mentorship-aware UI with pills and banners
 * 
 * LEGACY ISSUES WITH THIS COMPONENT:
 * - Uses deprecated mentorship_messages table (not the canonical conversations/messages)
 * - Bypasses canonical RPCs (mentorship_open_chat)
 * - Does not integrate with unified DM system
 * - Missing proper RLS and ownership checks
 * 
 * This file is kept temporarily for reference only.
 * It will be removed in a future release.
 * 
 * DO NOT route to this component. DO NOT import it in new code.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase, onPostgresChangesOnce, checkConnectionStatus } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Box, TextField, Button, Paper, Typography, CircularProgress, Alert, AlertTitle } from '@mui/material';

/**
 * @deprecated Use useOpenMentorshipChat hook instead
 */
const MentorshipChat = () => {
  // Show deprecation warning in development
  useEffect(() => {
    logger.warn(
      '[DEPRECATED] MentorshipChat component is deprecated. ' +
      'Use useOpenMentorshipChat hook and /messages route instead.'
    );
  }, []);
  const { requestId } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [requestDetails, setRequestDetails] = useState(null);
  const [canSend, setCanSend] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const messagesEndRef = useRef(null);
  // Track component mount state
  const isMountedRef = useRef(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchRequestDetails = useCallback(async () => {
    try {
      // Load request regardless of status to allow read-only history
      const { data: req, error } = await supabase
        .from('mentorship_requests')
        .select('*')
        .eq('id', requestId)
        .maybeSingle();
      if (error || !req) {
        throw new Error('This chat is not available.');
      }

      // Participant check: only mentor or mentee may view
      if (user?.id !== req.mentor_id && user?.id !== req.mentee_id) {
        throw new Error('This chat is not available.');
      }

      // Determine if conversation is open for sending
      // Dual condition: mentorship active AND users connected
      let relationshipActive = false;
      const { data: rel } = await supabase
        .from('mentorship_relationships')
        .select('id, status')
        .eq('mentor_id', req.mentor_id)
        .eq('mentee_id', req.mentee_id)
        .in('status', ['active'])
        .limit(1);
      relationshipActive = Array.isArray(rel) && rel.length > 0;

      // Check connection status
      const connected = await checkConnectionStatus(user?.id, 
        user?.id === req.mentor_id ? req.mentee_id : req.mentor_id
      );
      setIsConnected(connected);

      // Both conditions must be true
      const allowed = (req.status === 'accepted') && relationshipActive && connected;
      setCanSend(allowed);

      // Hydrate identities from public directory view
      const ids = [req.mentor_id, req.mentee_id].filter(Boolean);
      let identities = {};
      if (ids.length) {
        const { data: pub } = await supabase
          .from('alumni_directory_public')
          .select('id, full_name, avatar_url')
          .in('id', ids);
        (pub || []).forEach(p => { identities[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url }; });
      }

      setRequestDetails({
        ...req,
        mentor: identities[req.mentor_id] || { full_name: 'Mentor', avatar_url: null },
        mentee: identities[req.mentee_id] || { full_name: 'Mentee', avatar_url: null }
      });
    } catch (error) {
      // Show minimal error but allow component to render a friendly message
      setRequestDetails(null);
    }
  }, [requestId, user?.id]);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mentorship_messages')
        .select('*')
        .eq('mentorship_request_id', requestId)
        .order('sent_at', { ascending: true });
      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      toast.error('Failed to load messages.');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchRequestDetails().then(() => {
        fetchMessages();
    });
  }, [fetchRequestDetails, fetchMessages]);

  // Handle new messages callback
  const handleNewMessage = useCallback((payload) => {
    if (!isMountedRef.current) return;
    setMessages((prevMessages) => [...prevMessages, payload.new]);
  }, []);

  // Set up realtime subscription
  useEffect(() => {
    if (!requestId) return;

    isMountedRef.current = true;

    onPostgresChangesOnce(
      `mentorship-chat-${requestId}`,
      `mentorship-messages-listener-${requestId}`,
      {
        event: 'INSERT',
        schema: 'public',
        table: 'mentorship_messages',
        filter: `mentorship_request_id=eq.${requestId}`,
      },
      handleNewMessage
    );

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
    };
  }, [requestId, handleNewMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !requestDetails) return;

    const message = {
      mentorship_request_id: requestId,
      sender_id: user.id,
      message: newMessage.trim(),
    };

    const { error } = await supabase.from('mentorship_messages').insert(message);

    if (error) {
      toast.error('Failed to send message: ' + error.message);
    } else {
      setNewMessage('');
    }
  };

  if (loading) return <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />;
  if (!requestDetails) return <Typography sx={{ textAlign: 'center', mt: 4 }}>This chat is not available.</Typography>;

  // Determine the other participant's profile from the request details
  const otherParty = user.id === requestDetails.mentor_id ? requestDetails.mentee : requestDetails.mentor;

  return (
    <Box sx={{ maxWidth: 800, margin: 'auto', mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ height: '75vh', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>
          <Typography variant="h6">Chat with {otherParty.full_name}</Typography>
        </Box>
        
        {/* Warning banner for disconnection */}
        {requestDetails.status === 'accepted' && !isConnected && (
          <Alert severity="warning" sx={{ borderRadius: 0 }}>
            <AlertTitle>Connection Required</AlertTitle>
            Your mentorship is active, but you are disconnected from {otherParty.full_name}. 
            You must reconnect to continue chatting. Message history is read-only.
          </Alert>
        )}
        
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, backgroundColor: '#fafafa' }}>
          {messages.map((msg) => (
            <Box key={msg.id} sx={{ mb: 2, display: 'flex', justifyContent: msg.sender_id === user.id ? 'flex-end' : 'flex-start' }}>
              <Paper sx={{ p: 1.5, borderRadius: '10px', backgroundColor: msg.sender_id === user.id ? '#1976d2' : '#e0e0e0', color: msg.sender_id === user.id ? 'white' : 'black' }}>
                {msg.pinned ? (
                  <Typography variant="caption" sx={{ display: 'block', opacity: 0.85, mb: 0.5 }}>
                    📌 Pinned
                  </Typography>
                ) : null}
                <Typography variant="body1">{msg.message}</Typography>
              </Paper>
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </Box>
        <Box component="form" onSubmit={handleSendMessage} sx={{ p: 2, borderTop: '1px solid #ddd', display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder={canSend ? 'Type a message...' : 'This conversation is closed.'}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={!canSend}
          />
          <Button type="submit" variant="contained" disabled={!canSend || !newMessage.trim()}>Send</Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default MentorshipChat;
