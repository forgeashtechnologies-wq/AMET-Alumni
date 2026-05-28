import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { Box, Typography, Paper, Avatar, Chip, Button, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { createMentorshipRequest, mapMentorshipError } from '../../services/mentorship';

const MentorshipProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [alreadyRequested, setAlreadyRequested] = useState(false);

  useEffect(() => {
    fetchProfile();
    if (user) checkIfRequested();
    // eslint-disable-next-line
  }, [id, user]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: pub, error } = await supabase
        .from('alumni_directory_public')
        .select('id, full_name, avatar_url, current_job_title, company_name, location_city, location_country')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!pub) {
        setError("This profile isn’t publicly visible.");
        setProfile(null);
      } else {
        setProfile(pub);
      }
    } catch (e) {
      setError("This profile isn’t publicly visible.");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const checkIfRequested = async () => {
    const { data } = await supabase
      .from('mentorship_requests')
      .select('*')
      .eq('mentor_id', id)
      .eq('mentee_id', user.id)
      .in('status', ['pending', 'accepted']);
    setAlreadyRequested(data && data.length > 0);
  };

  const handleRequestMentorship = async () => {
    setRequesting(true);
    setError('');
    setSuccess('');
    try {
      await createMentorshipRequest(id, { message: undefined, goals: undefined });
      setSuccess('Mentorship request sent!');
      setAlreadyRequested(true);
    } catch (err) {
      logger.error('Failed to send mentorship request:', err);
      const mapped = mapMentorshipError(err);
      setError(mapped.message || 'Failed to send request. Please try again later.');
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px"><CircularProgress /></Box>;
  }
  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }
  if (!profile) {
    return <Alert severity="info">This profile isn’t publicly visible.</Alert>;
  }

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', py: 4 }}>
      <Paper sx={{ p: 4, borderRadius: 2, display: 'flex', gap: 3, alignItems: 'center' }}>
        <Avatar src={profile.avatar_url || '/default-avatar.svg'} alt={profile.full_name || 'avatar'} sx={{ width: 96, height: 96 }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{profile.full_name || 'Alumni'}</Typography>
          <Typography variant="body1" color="textSecondary">
            {(profile.current_job_title || 'Maritime Professional')}
            {profile.company_name ? ` • ${profile.company_name}` : ''}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {[profile.location_city, profile.location_country].filter(Boolean).join(', ') || '—'}
          </Typography>
        </Box>
      </Paper>
      {/* CTA remains; visibility of mentor tools handled elsewhere */}
      {user && user.id !== profile.id && (
        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            disabled={alreadyRequested || requesting}
            onClick={handleRequestMentorship}
          >
            {alreadyRequested ? 'Request Pending or Accepted' : requesting ? 'Requesting...' : 'Request Mentorship'}
          </Button>
        </Box>
      )}
      {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </Box>
  );
};

export default MentorshipProfile;
