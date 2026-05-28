import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Container, Typography, Paper, Button, Grid, Box, Tabs, Tab } from '@mui/material';
import SessionScheduler from './SessionScheduler';
import SessionsCalendar from './SessionsCalendar';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';

const MentorshipDashboard = () => {
  const { user, profile, getUserRole } = useAuth();
  const role = getUserRole();
  const [activeTab, setActiveTab] = useState(0);
  const [isApprovedMentor, setIsApprovedMentor] = useState(false);

  // Route guard: only approved mentors can view this dashboard
  useEffect(() => {
    let ignore = false;
    const check = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('mentors')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();
      const approved = !!(data && data.status === 'approved');
      if (!ignore) setIsApprovedMentor(approved);
      if (!approved) {
        toast.error('Mentor tools are available after your mentor profile is approved.');
        window.location.replace('/mentorship');
      }
    };
    check();
    return () => { ignore = true; };
  }, [user]);

  // This is a placeholder. In a real app, you'd fetch mentorship-specific data.
  const isMentor = profile?.is_mentor;
  const isMentee = profile?.is_mentee;
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Mentorship Dashboard
      </Typography>
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6">Welcome, {profile?.full_name || user?.email}!</Typography>
        <Typography color="text.secondary">Here you can manage your mentorship activities.</Typography>
      </Paper>

      <Grid container spacing={3}>
        {/* Actions for all users */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography variant="h6" gutterBottom>Find a Mentor</Typography>
            <Typography sx={{ flexGrow: 1 }}>Browse our directory or use our matching tool to find the perfect mentor.</Typography>
            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Button component={Link} to="/mentorship/directory" variant="outlined" sx={{ flex: 1 }}>
                Browse Directory
              </Button>
              <Button component={Link} to="/mentorship/matching" variant="contained" sx={{ flex: 1 }}>
                Find a Match
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Action to become a mentor */}
        {!isMentor && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Typography variant="h6" gutterBottom>Become a Mentor</Typography>
              <Typography sx={{ flexGrow: 1 }}>Share your knowledge and experience with the next generation of professionals.</Typography>
              <Button component={Link} to="/mentorship/become-mentor" variant="contained" sx={{ mt: 2 }}>
                Register as Mentor
              </Button>
            </Paper>
          </Grid>
        )}

        {/* Manage Requests for both Mentors and Mentees */}
        {(isMentor || isMentee) && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Typography variant="h6" gutterBottom>Manage Mentorships</Typography>
              <Typography sx={{ flexGrow: 1 }}>View and respond to mentorship requests, and track your ongoing mentorships.</Typography>
              <Button component={Link} to="/mentorship/requests" variant="contained" sx={{ mt: 2 }}>
                Manage Requests
              </Button>
            </Paper>
          </Grid>
        )}


      </Grid>
      
      {/* Session Scheduling Section - Only visible if user is a mentor or mentee */}
      {(isMentor || isMentee) && (
        <Paper sx={{ p: 3, mt: 4 }}>
          <Typography variant="h5" gutterBottom>Mentorship Sessions</Typography>
          <Typography color="text.secondary" paragraph>
            Schedule, manage, and track your mentorship sessions. You can book new sessions or view your upcoming and past sessions.
          </Typography>
          
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab label="Schedule New Session" />
              <Tab label="My Sessions" />
            </Tabs>
          </Box>
          
          {activeTab === 0 && (
            <Box sx={{ py: 2 }}>
              <SessionScheduler />
            </Box>
          )}
          
          {activeTab === 1 && (
            <Box sx={{ py: 2 }}>
              <SessionsCalendar />
            </Box>
          )}
        </Paper>
      )}
    </Container>
  );
};

export default MentorshipDashboard;
