import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useApproval } from '../../hooks/useApproval';
import { supabase } from '../../utils/supabase';
import { Box, Typography, Paper, TextField, Button, Alert, CircularProgress } from '@mui/material';

const JobApplyForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userRole, getUserRole } = useAuth();
  const { isApproved } = useApproval();
  const [resumeUrl, setResumeUrl] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    if (!user) {
      setError('You must be logged in to apply.');
      setLoading(false);
      return;
    }
    const role = userRole || (typeof getUserRole === 'function' ? getUserRole() : null);
    if (role === 'employer') {
      setError('Employers cannot apply to jobs from this portal.');
      setLoading(false);
      return;
    }
    if (!isApproved) {
      setError('Your account is pending approval. You can browse jobs but cannot apply until approved.');
      setLoading(false);
      return;
    }
    try {
      let uploadedResumeUrl = resumeUrl;
      if (file) {
        // Upload file to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const filePath = `resumes/${Date.now()}-${file.name}`;
        const { data, error: uploadError } = await supabase.storage.from('resumes').upload(filePath, file);
        if (uploadError) throw uploadError;
        uploadedResumeUrl = data.Key || data.path;
      }
      // Submit application
      const { error: insertError } = await supabase.from('job_applications').insert([
        {
          job_id: id,
          applicant_id: user.id,
          resume_url: uploadedResumeUrl,
          cover_letter: coverLetter
        }
      ]).select('*');
      if (insertError) throw insertError;
      setSuccess('Application submitted successfully!');
      setTimeout(() => navigate('/jobs'), 1500);
    } catch (err) {
      setError('Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', py: 4 }}>
      <Paper sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>Apply for this Job</Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            label="Resume URL (or upload below)"
            value={resumeUrl}
            onChange={e => setResumeUrl(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <Button variant="outlined" component="label" sx={{ mb: 2 }}>
            Upload Resume
            <input type="file" hidden onChange={handleFileChange} />
          </Button>
          {file && <Typography variant="body2">Selected file: {file.name}</Typography>}
          <TextField
            label="Cover Letter (optional)"
            value={coverLetter}
            onChange={e => setCoverLetter(e.target.value)}
            fullWidth
            multiline
            rows={4}
            sx={{ mb: 2 }}
          />
          <Button type="submit" variant="contained" color="primary" disabled={loading} fullWidth>
            {loading ? <CircularProgress size={24} /> : 'Submit Application'}
          </Button>
        </form>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
      </Paper>
    </Box>
  );
};

export default JobApplyForm;
