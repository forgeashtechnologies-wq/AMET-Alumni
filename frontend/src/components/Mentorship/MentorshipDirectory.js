import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { Link } from 'react-router-dom';

const MentorshipDirectory = () => {
  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', py: 6 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>Mentorship Directory</Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
          This page is temporarily disabled because it relied on profile fields not present in the current database snapshot.
          Please use the Mentorship Program to find approved mentors and send requests.
        </Typography>
        <Button component={Link} to="/mentorship" variant="contained">Go to Mentorship Program</Button>
      </Paper>
    </Box>
  );
};

export default MentorshipDirectory;
