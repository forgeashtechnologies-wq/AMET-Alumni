import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { Box, Typography, Paper, Button, Chip, Grid, CircularProgress, TextField, Divider, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, CheckCircle as ApproveIcon, ShieldCheck as VerifyIcon } from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import { toFriendlyToast } from '../../utils/errors';

const JobAdminPanel = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      if (!isMountedRef.current) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select('*, company:companies(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (isMountedRef.current) {
        setJobs(data || []);
      }
    } catch (err) {
      toFriendlyToast(toast, err, 'Failed to load jobs. Please try again.');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(search.toLowerCase()) ||
    (job.company && job.company.name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleApproveJob = async (jobId) => {
    try {
      const { error } = await supabase.rpc('admin_set_job_approval', {
        p_job_id: jobId,
        p_approved: true,
        p_rejected: false,
      });

      if (error) throw error;

      toast.success('Job approved successfully!');
      fetchJobs();
    } catch (err) {
      logger.error('Error approving job via admin_set_job_approval:', err);
      const msg = (err?.code === '42501' || err?.status === 403 || /RLS|permission|not allowed/i.test(err?.message || ''))
        ? 'You are not allowed to approve this job.'
        : 'Failed to approve job. Please try again.';
      toast.error(msg);
    }
  };

  const handleToggleVerification = async (job) => {
    try {
      const { error } = await supabase.rpc('admin_toggle_job_verification', {
        p_job_id: job.id,
        p_verified: !job.is_verified,
      });

      if (error) throw error;

      toast.success(job.is_verified ? 'Job un-verified successfully!' : 'Job verified successfully!');
      fetchJobs();
    } catch (err) {
      logger.error('Error toggling job verification via admin_toggle_job_verification:', err);
      const msg = (err?.code === '42501' || err?.status === 403 || /RLS|permission|not allowed/i.test(err?.message || ''))
        ? 'You are not allowed to verify this job.'
        : 'Failed to update verification status. Please try again.';
      toast.error(msg);
    }
  };

  const handleDelete = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job permanently?')) return;
    try {
      const { error } = await supabase.rpc('admin_delete_job', {
        p_job_id: jobId,
      });

      if (error) throw error;

      toast.success('Job deleted successfully!');
      fetchJobs();
    } catch (err) {
      logger.error('Error deleting job via admin_delete_job:', err);
      const msg = (err?.code === '42501' || err?.status === 403 || /RLS|permission|not allowed/i.test(err?.message || ''))
        ? 'You are not allowed to delete this job.'
        : 'Failed to delete job. Please try again.';
      toast.error(msg);
    }
  };

  const openEditDialog = (job) => {
    setSelectedJob(job);
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (updatedFields) => {
    const { error } = await supabase
      .from('jobs')
      .update(updatedFields)
      .eq('id', selectedJob.id);

    if (error) {
      toFriendlyToast(toast, error, 'Failed to update job. Please try again.');
    } else {
      toast.success('Job updated successfully!');
      setEditDialogOpen(false);
      fetchJobs();
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Job Management</Typography>
      <TextField
        label="Search Jobs"
        variant="outlined"
        fullWidth
        margin="normal"
        onChange={(e) => setSearch(e.target.value)}
      />
      <Grid container spacing={3}>
        {filteredJobs.map(job => (
          <Grid item xs={12} key={job.id}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">{job.title}</Typography>
              <Typography variant="subtitle1" color="text.secondary">{job.company?.name || 'N/A'}</Typography>
              <Box sx={{ my: 1 }}>
                <Chip label={job.is_approved ? 'Approved' : 'Pending Approval'} color={job.is_approved ? 'success' : 'warning'} size="small" />
                <Chip label={job.is_verified ? 'Verified' : 'Not Verified'} color={job.is_verified ? 'info' : 'default'} size="small" sx={{ ml: 1 }} />
                <Chip label={job.is_active ? 'Active' : 'Inactive'} color={job.is_active ? 'primary' : 'default'} size="small" sx={{ ml: 1 }} />
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                {!job.is_approved && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ApproveIcon />}
                    onClick={() => handleApproveJob(job.id)}
                  >
                    Approve
                  </Button>
                )}
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<VerifyIcon />}
                  onClick={() => handleToggleVerification(job)}
                >
                  {job.is_verified ? 'Un-verify' : 'Verify'}
                </Button>
                <Button variant="outlined" size="small" startIcon={<EditIcon />} onClick={() => openEditDialog(job)}>Edit</Button>
                <Button variant="outlined" size="small" color="error" startIcon={<DeleteIcon />} onClick={() => handleDelete(job.id)}>Delete</Button>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
      {selectedJob && (
        <EditJobDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          job={selectedJob}
          onSubmit={handleEditSubmit}
        />
      )}
    </Box>
  );
};

const EditJobDialog = ({ open, onClose, job, onSubmit }) => {
  const [fields, setFields] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (job) {
      setFields({
        title: job.title || '',
        location: job.location || '',
        job_type: job.job_type || 'full-time',
        description: job.description || '',
        requirements: job.requirements || '',
        salary_range: job.salary_range || '',
        application_url: job.application_url || '',
        deadline: job.deadline ? job.deadline.split('T')[0] : '',
      });
    }
  }, [job]);

  const handleChange = (e) => {
    setFields(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(fields);
    setLoading(false);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Edit Job: {job.title}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <TextField name="title" label="Job Title" value={fields.title} onChange={handleChange} fullWidth margin="normal" />
          <TextField name="location" label="Location" value={fields.location} onChange={handleChange} fullWidth margin="normal" />
          <TextField name="description" label="Description" value={fields.description} onChange={handleChange} multiline rows={4} fullWidth margin="normal" />
          <TextField name="requirements" label="Requirements" value={fields.requirements} onChange={handleChange} multiline rows={3} fullWidth margin="normal" />
          <TextField name="salary_range" label="Salary Range" value={fields.salary_range} onChange={handleChange} fullWidth margin="normal" />
          <TextField name="application_url" label="Application URL" value={fields.application_url} onChange={handleChange} fullWidth margin="normal" />
          <TextField name="deadline" label="Deadline" type="date" value={fields.deadline} onChange={handleChange} InputLabelProps={{ shrink: true }} fullWidth margin="normal" />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default JobAdminPanel;
