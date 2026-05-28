import { useState, useMemo } from 'react';
import { Box, TextField, Button, Alert } from '@mui/material';
import { supabase } from '../../utils/supabase';
import { validatePassword } from '../../utils/passwordPolicy';
import { log } from '../../utils/log';

export default function SecurityPasswordForm({ user, providers = [] }) {
  const isOAuthOnly = useMemo(() => {
    const p = (providers || user?.app_metadata?.providers || []);
    const hasEmailPassword = p.includes('email');
    const hasOAuth = p.some(x => x !== 'email');
    return hasOAuth && !hasEmailPassword; // show "Set password" variant
  }, [providers, user]);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError(''); setOk('');

    // Basic matches
    if (next !== confirm) return setError('New passwords do not match.');
    const policy = validatePassword(next, user?.email);
    if (!policy.ok) return setError(policy.message);

    setLoading(true);
    try {
      // If the user has a password, re-authenticate to be safe
      if (!isOAuthOnly) {
        const email = user?.email;
        const { error: reauthErr } = await supabase.auth.signInWithPassword({ email, password: current });
        if (reauthErr) throw new Error('Current password is incorrect.');
      }

      const { error: updErr } = await supabase.auth.updateUser({ password: next });
      if (updErr) throw updErr;

      setOk(isOAuthOnly ? 'Password has been set.' : 'Password changed successfully.');
      setCurrent(''); setNext(''); setConfirm('');

      // Sign out after password change for security (optional)
      if (!isOAuthOnly) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      log('password-change', err);
      setError(err.message || 'Could not update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 420 }}>
      {!isOAuthOnly && (
        <TextField
          type="password" label="Current password" fullWidth margin="normal"
          value={current} onChange={e => setCurrent(e.target.value)}
          required
        />
      )}
      <TextField
        type="password" label={isOAuthOnly ? 'New password' : 'New password'} fullWidth margin="normal"
        value={next} onChange={e => setNext(e.target.value)}
        required
      />
      <TextField
        type="password" label="Confirm new password" fullWidth margin="normal"
        value={confirm} onChange={e => setConfirm(e.target.value)}
        required
      />
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      {ok && <Alert severity="success" sx={{ mt: 1 }}>{ok}</Alert>}
      <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={loading}>
        {isOAuthOnly ? 'Set Password' : 'Change Password'}
      </Button>
    </Box>
  );
}
