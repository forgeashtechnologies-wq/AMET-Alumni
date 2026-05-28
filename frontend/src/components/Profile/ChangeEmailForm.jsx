import React, { useState } from 'react';
import { Box, TextField, Button, Alert } from '@mui/material';
import { supabase } from '../../utils/supabase';

export default function ChangeEmailForm({ currentEmail }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(''); setOk(''); setLoading(true);
    try {
      if (!email || email === currentEmail) {
        setError('Please enter a different email address.');
        return;
      }
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      setOk('Confirmation emails sent. Please confirm from both old and new addresses to complete the change.');
      setEmail('');
    } catch (err) {
      setError(err.message || 'Could not start email change.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={onSubmit} sx={{ maxWidth: 420 }}>
      <TextField
        type="email"
        label="New email address"
        fullWidth
        margin="normal"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={currentEmail || 'you@example.com'}
        required
      />
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      {ok && <Alert severity="success" sx={{ mt: 1 }}>{ok}</Alert>}
      <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={loading}>
        {loading ? 'Sending...' : 'Change Email'}
      </Button>
    </Box>
  );
}
