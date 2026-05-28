import React from 'react';
import { Box, Typography, Paper, Divider } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import SecurityPasswordForm from '../../components/Profile/SecurityPasswordForm';
import SecurityQuestionForm from '../../components/Profile/SecurityQuestionForm';

export default function Security() {
  const { user } = useAuth();

  if (!user) {
    return <div>Please log in to view security settings.</div>;
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Security Settings
      </Typography>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Password
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Change your password or set one if you signed up with OAuth only.
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <SecurityPasswordForm
          user={user}
          providers={user?.app_metadata?.providers || []}
        />
      </Paper>

      {/* Security Question for account recovery */}
      <Box sx={{ mt: 3 }}>
        <SecurityQuestionForm />
      </Box>

      {/* Future: Add 2FA toggle here */}
    </Box>
  );
}
