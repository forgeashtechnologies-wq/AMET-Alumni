import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Chip, 
  Grid, 
  CircularProgress, 
  Alert, 
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { acceptMentorshipRequest, rejectMentorshipRequest, mapMentorshipError } from '../../services/mentorship';

const MentorshipRequestsDashboard = () => {
  const { user, isAdmin, profile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [success, setSuccess] = useState('');
  // Rejection dialog and reason removed since there is no response_message column in DB
  const [myMentorStatus, setMyMentorStatus] = useState(null);

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line
  }, [user]);

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

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      if (isAdmin) {
        // Admins still see all requests directly from the base table for auditing purposes
        let query = supabase
          .from('mentorship_requests')
          .select('*')
          .order('created_at', { ascending: false });

        const { data: rows, error } = await query;
        if (error) throw error;

        const ids = Array.from(new Set((rows || []).flatMap(r => [r.mentor_id, r.mentee_id]).filter(Boolean)));
        let idMap = new Map();
        if (ids.length) {
          const { data: pubs } = await supabase
            .from('alumni_directory_public')
            .select('id, full_name, avatar_url')
            .in('id', ids);
          (pubs || []).forEach(p => idMap.set(p.id, p));
        }

        const hydrated = (rows || []).map(r => ({
          ...r,
          mentor: idMap.get(r.mentor_id) || { id: r.mentor_id, full_name: 'Mentor', avatar_url: null },
          mentee: idMap.get(r.mentee_id) || { id: r.mentee_id, full_name: 'Mentee', avatar_url: null }
        }));

        setRequests(hydrated);
      } else {
        // Non-admins: use role-aware views
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
          ...receivedRows.map((r) => ({
            id: r.id,
            status: r.status,
            created_at: r.created_at,
            mentor_id: r.mentor_id,
            mentee_id: r.mentee_id,
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
          ...sentRows.map((r) => ({
            id: r.id,
            status: r.status,
            created_at: r.created_at,
            mentor_id: r.mentor_id,
            mentee_id: r.mentee_id,
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
      }
    } catch (err) {
      logger.error('Failed to fetch requests:', err);
      setError('Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, status) => {
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      if (status === 'accepted') {
        await acceptMentorshipRequest(id);
      } else if (status === 'rejected') {
        await rejectMentorshipRequest(id);
      } else {
        throw new Error('Invalid status transition');
      }
      setSuccess(`Request ${status}`);
      fetchRequests();
    } catch (err) {
      logger.error('Error updating request:', err);
      const mapped = mapMentorshipError(err);
      setError(mapped.message || 'Failed to update request');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ mr: 2, fontWeight: 'bold' }}>Mentorship Requests</Typography>
        {(profile?.is_approved || profile?.approval_status === 'approved') && (
          <Chip
            size="small"
            label={myMentorStatus === 'approved' ? 'Approved + Mentor' : 'Approved + Mentor Pending'}
            color={myMentorStatus === 'approved' ? 'success' : 'warning'}
          />
        )}
      </Box>
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Grid container spacing={3}>
          {requests.length === 0 ? (
            <Typography sx={{ ml: 2 }}>No mentorship requests found.</Typography>
          ) : requests.map(req => (
            <Grid item xs={12} md={6} key={req.id}>
              <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  Mentor: <Link to={`/mentorship/profile/${req.mentor_id}`}>{req.mentor?.full_name}</Link>
                </Typography>
                <Typography variant="subtitle2">
                  Mentee: <Link to={`/mentorship/profile/${req.mentee_id}`}>{req.mentee?.full_name}</Link>
                </Typography>
                <Chip label={req.status} color={req.status === 'accepted' ? 'success' : req.status === 'pending' ? 'warning' : 'error'} sx={{ mt: 1, mb: 1 }} />
                <Typography variant="body2" color="textSecondary">
                  Requested at: {req.created_at ? new Date(req.created_at).toLocaleString() : '—'}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  {/* Admin or mentor controls for pending requests */}
                  {(isAdmin || user.id === req.mentor_id) && req.status === 'pending' && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button variant="contained" color="success" disabled={actionLoading} onClick={() => handleAction(req.id, 'accepted')}>Accept</Button>
                      <Button variant="outlined" color="error" disabled={actionLoading} onClick={() => handleAction(req.id, 'rejected')}>Reject</Button>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
      {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </Box>
  );
};

export default MentorshipRequestsDashboard;
