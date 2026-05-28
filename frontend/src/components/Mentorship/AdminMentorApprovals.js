import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getAccountStatus } from '../../utils/accountStatus';
import { Box, Paper, Typography, Avatar, Button, Chip, CircularProgress, Alert, Divider } from '@mui/material';
import { adminUpdateMentorStatus } from '../../services/adminMentorship';
import { toast } from 'react-hot-toast';

const AdminMentorApprovals = () => {
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState([]);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase
        .from('mentors')
        .select(`
          *,
          applicant:profiles!mentors_user_id_fkey (id, full_name, role, avatar_url, is_approved, approval_status)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setPending(data || []);
    } catch (e) {
      setError('Failed to load pending mentor approvals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const [mutatingId, setMutatingId] = useState(null);

  const handleDecision = async (userId, decision) => {
    setMutatingId(`${userId}:${decision}`);
    try {
      await adminUpdateMentorStatus(userId, decision);
      toast.success(`Mentor status set to ${decision}.`);
      fetchPending();
    } catch (e) {
      const friendlyMessage = e?.message || 'Unknown error while updating mentor status';
      setError(`Failed to update mentor status: ${friendlyMessage}`);
      toast.error(`Unable to update mentor status: ${friendlyMessage}`);
    } finally {
      setMutatingId(null);
    }
  };

  const alumniRequests = pending.filter(p => (p.applicant?.role || 'alumni') !== 'admin' && (p.applicant?.role || 'alumni') !== 'super_admin');
  const adminRequests = pending.filter(p => (p.applicant?.role || '') === 'admin' || (p.applicant?.role || '') === 'super_admin');

  // Admins can approve all mentor applications, including applicants whose current role is admin.
  const canApproveAdminQueue = userRole === 'admin' || userRole === 'super_admin';
  const canApproveAlumniQueue = userRole === 'admin' || userRole === 'super_admin';

  const renderCard = (row, canApprove) => {
    const status = row.applicant ? getAccountStatus(row.applicant) : null;
    const profileApproved = !!status && status.code === 'approved';
    return (
      <Paper key={row.id} sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar src={row.applicant?.avatar_url} alt={row.applicant?.full_name} />
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">{row.applicant?.full_name || 'Unknown'}</Typography>
            <Typography variant="body2" color="text.secondary">Role: {row.applicant?.role || 'alumni'}</Typography>
            {profileApproved && (
              <Chip size="small" sx={{ mt: 0.5 }} label={row.status === 'approved' ? 'Approved + Mentor' : 'Approved + Mentor Pending'} color={row.status === 'approved' ? 'success' : 'warning'} />
            )}
            {Array.isArray(row.expertise) && row.expertise.length > 0 && (
              <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {row.expertise.slice(0, 5).map((x, i) => (
                  <Chip key={i} size="small" label={x} />
                ))}
              </Box>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            color="success"
            disabled={!canApprove || mutatingId !== null}
            onClick={() => handleDecision(row.applicant?.id, 'approved')}
          >
            {mutatingId === `${row.applicant?.id}:approved` ? 'Saving...' : 'Approve'}
          </Button>
          <Button
            variant="outlined"
            color="error"
            disabled={!canApprove || mutatingId !== null}
            onClick={() => handleDecision(row.applicant?.id, 'rejected')}
          >
            {mutatingId === `${row.applicant?.id}:rejected` ? 'Saving...' : 'Reject'}
          </Button>
        </Box>
      </Paper>
    );
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', py: 3 }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>Mentor Approvals</Typography>

      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Alumni Mentor Requests</Typography>
      {alumniRequests.length === 0 ? (
        <Typography color="text.secondary">No pending alumni mentor requests.</Typography>
      ) : (
        alumniRequests.map((row) => renderCard(row, canApproveAlumniQueue))
      )}

      <Divider sx={{ my: 3 }} />

      {canApproveAdminQueue && (
        <>
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Admin Mentor Requests</Typography>
          {adminRequests.length === 0 ? (
            <Typography color="text.secondary">No pending admin mentor requests.</Typography>
          ) : (
            adminRequests.map((row) => renderCard(row, canApproveAdminQueue))
          )}
        </>
      )}
    </Box>
  );
};

export default AdminMentorApprovals;
