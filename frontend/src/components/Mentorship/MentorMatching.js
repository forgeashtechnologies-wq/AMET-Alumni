import React from 'react';
import { Container, Typography, Paper, Box, Button } from '@mui/material';
import { Link } from 'react-router-dom';

const MentorMatching = () => {
  return (
    <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Mentor Matching (Temporarily Unavailable)
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          This page depends on fields and an edge function not present in the current database snapshot.
          Please use the Find Mentors tab in the Mentorship Program to browse approved mentors and send requests.
        </Typography>
        <Box>
          <Button component={Link} to="/mentorship" variant="contained">
            Go to Mentorship Program
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default MentorMatching;
