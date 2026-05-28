import React, { useState, useEffect, useCallback } from 'react';
import { supabase, onPostgresChangesOnce } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getAccountStatus } from '../../utils/accountStatus';
import { toast } from 'react-hot-toast';
import logger from '../../utils/logger';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Typography, Paper, Box, Button, Chip, Tabs, Tab, CircularProgress } from '@mui/material';
import {
  acceptMentorshipRequest,
  rejectMentorshipRequest,
  cancelMentorshipRequest,
  mapMentorshipError,
} from '../../services/mentorship';
import { ensureDmThreadWith } from '../../api/dm';

const MentorshipStatus = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0); // 0 for received, 1 for sent
  const [myMentorStatus, setMyMentorStatus] = useState(null);

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [sentRes, receivedRes] = await Promise.all([
        supabase
          .from('v_my_mentorship_requests')
          .select('*')
          .eq('mentee_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('v_my_mentorship_dashboard')
          .select('*')
          .eq('mentor_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      if (sentRes.error) throw sentRes.error;
      if (receivedRes.error) throw receivedRes.error;

      const sentRows = sentRes.data || [];
      const receivedRows = receivedRes.data || [];

      const hydrated = [
        // Requests where current user is mentor (received)
        ...receivedRows.map((r) => ({
          id: r.id,
          status: r.status,
          created_at: r.created_at,
          mentor: {
            id: r.mentor_id,
            full_name: profile?.full_name || 'You',
            avatar_url: profile?.avatar_url || null,
          },
          mentee: {
            id: r.mentee_id,
            full_name: r.mentee_full_name || 'Mentee',
            avatar_url: r.mentee_avatar || null,
          },
        })),
        // Requests where current user is mentee (sent)
        ...sentRows.map((r) => ({
          id: r.id,
          status: r.status,
          created_at: r.created_at,
          mentor: {
            id: r.mentor_id,
            full_name: r.mentor_full_name || 'Mentor',
            avatar_url: r.mentor_avatar || null,
          },
          mentee: {
            id: r.mentee_id,
            full_name: profile?.full_name || 'You',
            avatar_url: profile?.avatar_url || null,
          },
        })),
      ];

      setRequests(hydrated);
    } catch (error) {
      toast.error('Failed to fetch mentorship requests: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Realtime updates: refresh when requests are inserted/updated for me
  useEffect(() => {
    if (!user?.id) return;
    const channelName = `mentorship-status-${user.id}`;
    onPostgresChangesOnce(
      channelName,
      `requests-insert-${user.id}`,
      { event: 'INSERT', schema: 'public', table: 'mentorship_requests', filter: `mentor_id=eq.${user.id}` },
      () => fetchRequests()
    );
    onPostgresChangesOnce(
      channelName,
      `requests-update-${user.id}`,
      { event: 'UPDATE', schema: 'public', table: 'mentorship_requests', filter: `mentor_id=eq.${user.id}` },
      () => fetchRequests()
    );
    onPostgresChangesOnce(
      channelName,
      `requests-update-mentee-${user.id}`,
      { event: 'UPDATE', schema: 'public', table: 'mentorship_requests', filter: `mentee_id=eq.${user.id}` },
      () => fetchRequests()
    );
  }, [user, fetchRequests]);

  useEffect(() => {
    const fetchMyMentorRow = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('mentors')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();
      setMyMentorStatus(data?.status || null);
    };
    fetchMyMentorRow();
  }, [user]);

  const handleUpdateStatus = async (requestId, newStatus) => {
    try {
      if (newStatus === 'accepted') {
        await acceptMentorshipRequest(requestId);
      } else if (newStatus === 'rejected') {
        await rejectMentorshipRequest(requestId);
      } else {
        throw new Error('Invalid status transition');
      }
      toast.success(`Request ${newStatus}.`);
      fetchRequests(); // Refresh the list
    } catch (error) {
      const mapped = mapMentorshipError(error);
      toast.error(`Failed to update request: ${mapped.message}`);
    }
  };

  const receivedRequests = requests.filter(r => r.mentor.id === user.id);
  const sentRequests = requests.filter(r => r.mentee.id === user.id);

  const renderRequestCard = (request, type) => {
    const isMentorView = type === 'received';
    const otherParty = isMentorView ? request.mentee : request.mentor;

    return (
      <Paper key={request.id} sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6">{otherParty.full_name}</Typography>
          <Typography variant="body2" color="text.secondary">{new Date(request.created_at).toLocaleDateString()}</Typography>
          <Chip label={request.status} size="small" color={request.status === 'pending' ? 'warning' : request.status === 'accepted' ? 'success' : 'error'} sx={{ mt: 1 }} />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isMentorView && request.status === 'pending' && (
            <>
              <Button variant="contained" color="success" onClick={() => handleUpdateStatus(request.id, 'accepted')}>Accept</Button>
              <Button variant="outlined" color="error" onClick={() => handleUpdateStatus(request.id, 'rejected')}>Reject</Button>
            </>
          )}
          {!isMentorView && request.status === 'pending' && (
            <Button
              variant="outlined"
              color="warning"
              onClick={async () => {
                try {
                  await cancelMentorshipRequest(request.id);
                  toast.success('Request withdrawn');
                  fetchRequests();
                } catch (e) {
                  const mapped = mapMentorshipError(e);
                  toast.error('Failed to withdraw request: ' + mapped.message);
                }
              }}
            >
              Withdraw
            </Button>
          )}
          {request.status === 'accepted' && (
            <Button
              variant="contained"
              color="primary"
              onClick={async () => {
                try {
                  const otherId = isMentorView ? request.mentee.id : request.mentor.id;
                  if (!otherId) {
                    toast.error('Unable to determine conversation partner.');
                    return;
                  }
                  const threadId = await ensureDmThreadWith(otherId);
                  navigate(`/messages?threadId=${encodeURIComponent(threadId)}&source=mentorship&requestId=${encodeURIComponent(request.id)}`);
                } catch (e) {
                  logger.error(e);
                  toast.error('Could not open chat. Please try again.');
                }
              }}
            >
              Go to Chat
            </Button>
          )}
        </Box>
      </Paper>
    );
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1" sx={{ mr: 2 }}>Mentorship Requests</Typography>
        {(() => {
          const status = profile ? getAccountStatus(profile) : null;
          if (!status || status.code !== 'approved') return null;
          return (
            <Chip
              size="small"
              label={myMentorStatus === 'approved' ? 'Approved + Mentor' : 'Approved + Mentor Pending'}
              color={myMentorStatus === 'approved' ? 'success' : 'warning'}
            />
          );
        })()}
      </Box>
      <Paper>
        <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)} centered>
          <Tab label={`Received (${receivedRequests.length})`} />
          <Tab label={`Sent (${sentRequests.length})`} />
        </Tabs>
        <Box sx={{ p: 3 }}>
          {loading ? <CircularProgress /> : (
            tab === 0 ? (
              receivedRequests.length > 0 ? receivedRequests.map(r => renderRequestCard(r, 'received')) : <Typography>No requests received.</Typography>
            ) : (
              sentRequests.length > 0 ? sentRequests.map(r => renderRequestCard(r, 'sent')) : <Typography>You haven't sent any requests.</Typography>
            )
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default MentorshipStatus;
