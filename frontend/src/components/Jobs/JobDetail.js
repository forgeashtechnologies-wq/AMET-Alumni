import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { Box, Typography, Paper, Chip, Button, Divider, CircularProgress, Alert } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchJob();
  }, [id]);

  const fetchJob = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      setJob(data);
    } catch (err) {
      setError('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this job?')) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setSuccess('Job deleted successfully');
      setTimeout(() => navigate('/jobs'), 1200);
    } catch (err) {
      setError('Failed to delete job');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px"><CircularProgress /></Box>;
  }
  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }
  if (!job) {
    return <Alert severity="info">Job not found.</Alert>;
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', py: 4 }}>
      <Button component={Link} to="/jobs" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>Back to Jobs</Button>
      <Paper sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>{job.title}</Typography>
        <Typography variant="h6" color="primary" sx={{ mb: 1 }}>{job.company}</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          {job.location && <Chip label={job.location} size="small" />}
          {job.type && <Chip label={job.type} size="small" color="info" />}
          {(job.salary_display_inr || job.salary_range) && (
            <Chip label={job.salary_display_inr || job.salary_range} size="small" color="success" />
          )}
        </Box>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>Posted on {new Date(job.created_at).toLocaleDateString()}</Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography sx={{ mb: 2 }}>{job.description}</Typography>
        {job.requirements && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Qualification:</Typography>
            <Typography variant="body2">{job.requirements}</Typography>
          </Box>
        )}
        {job.apply_url ? (
          <Button href={job.apply_url} target="_blank" rel="noopener" variant="contained" color="primary" sx={{ mt: 2 }}>Apply Externally</Button>
        ) : (
          <Button component={Link} to={`/jobs/${job.id}/apply`} variant="contained" color="primary" sx={{ mt: 2 }}>Apply Now</Button>
        )}
        {isAdmin && (
          <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
            <Button component={Link} to={`/jobs/${job.id}/edit`} variant="outlined" startIcon={<EditIcon />}>Edit</Button>
            <Button onClick={handleDelete} variant="outlined" color="error" startIcon={<DeleteIcon />}>Delete</Button>
          </Box>
        )}
        {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
      </Paper>
    </Box>
  );
};

export default JobDetail;
