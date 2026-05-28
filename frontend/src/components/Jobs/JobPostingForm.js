import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Button, Typography, Paper, Grid, CircularProgress, MenuItem, Alert, ToggleButtonGroup, ToggleButton } from '@mui/material';
import logger from '../../utils/logger';
import { toast } from 'react-hot-toast';
import LinkIcon from '@mui/icons-material/Link';
import DescriptionIcon from '@mui/icons-material/Description';
import { toFriendlyToast } from '../../utils/errors';

const JobPostingForm = () => {
  const { user, profile, userRole } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [entryMode, setEntryMode] = useState('manual'); // 'manual' or 'link'
  const [jobLink, setJobLink] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [linkError, setLinkError] = useState('');

  const [formData, setFormData] = useState({
    company_id: '',
    title: '',
    location: '',
    job_type: 'Full-time',
    description: '',
    requirements: '',
    salary_range: '',
    application_url: '',
    deadline: '',
  });

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('companies').select('id, name').eq('is_verified', true);
      if (error) throw error;
      setCompanies(data || []);
    } catch (err) {
      setError('Failed to load companies. Please try again.');
      toast.error('Failed to load companies.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEntryModeChange = (event, newMode) => {
    if (newMode !== null) {
      setEntryMode(newMode);
    }
  };

  const handleJobImport = async () => {
    if (!jobLink) {
      setLinkError('Please enter a valid job URL.');
      return;
    }
    setIsImporting(true);
    setLinkError('');
    toast.loading('Extracting job details...');

    // --- Placeholder for job extraction logic ---
    // In a real application, you would call a backend service here.
    // Example: const { data, error } = await supabase.functions.invoke('scrape-job', { body: { url: jobLink } });
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay

    try {
      // Simulate successful extraction
      const extractedData = {
        title: 'Software Engineer (from Link)',
        location: 'Remote',
        description: 'This description was automatically extracted from the provided link.',
        requirements: 'React, Node.js, and a passion for learning.',
        application_url: jobLink,
      };
      setFormData(prev => ({ ...prev, ...extractedData }));
      toast.dismiss();
      toast.success('Job details extracted! Please review and complete the form.');
      setEntryMode('manual'); // Switch to manual form for review
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to extract job details. Please enter them manually.');
      setLinkError('Could not extract details from this link. Please try another or enter manually.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to post a job.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const deadline = formData.deadline
        ? (() => {
            const d = new Date(formData.deadline);
            return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
          })()
        : null;

      // If employer, ensure the selected company's logo is set from profile DP when missing
      if (userRole === 'employer' && formData.company_id) {
        try {
          const { data: comp, error: compErr } = await supabase
            .from('companies')
            .select('id, logo_url')
            .eq('id', formData.company_id)
            .maybeSingle();
          if (!compErr && comp && (!comp.logo_url || comp.logo_url.trim() === '')) {
            const inferredLogo = profile?.logo_url || profile?.avatar_url || '';
            if (inferredLogo) {
              await supabase
                .from('companies')
                .update({ logo_url: inferredLogo })
                .eq('id', comp.id);
            }
          }
        } catch (e) {
          // Non-fatal; proceed with job insert even if logo update fails
          logger.warn('Company logo inference skipped:', e?.message || e);
        }
      }

      const { error: jobError } = await supabase.from('jobs').insert([{
        ...formData,
        deadline,
        user_id: user.id,
        created_by: user.id,
        is_approved: false, // Jobs are not auto-approved
        is_verified: false, // Jobs are not auto-verified
        is_active: true, // Job is active upon creation
      }], { returning: 'minimal' });

      if (jobError) throw jobError;

      toast.success('Job submitted for approval!');
      navigate('/jobs');
    } catch (err) {
      setError('Failed to post job. Please check your input and try again.');
      toFriendlyToast(toast, err, 'Failed to post job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Paper sx={{ p: 4, borderRadius: 2, boxShadow: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
          Post a New Job
        </Typography>

        <ToggleButtonGroup
          value={entryMode}
          exclusive
          onChange={handleEntryModeChange}
          aria-label="job entry mode"
          sx={{ mb: 4 }}
        >
          <ToggleButton value="manual" aria-label="manual entry">
            <DescriptionIcon sx={{ mr: 1 }} />
            Manual Entry
          </ToggleButton>
          <ToggleButton value="link" aria-label="import from link">
            <LinkIcon sx={{ mr: 1 }} />
            Import from Link
          </ToggleButton>
        </ToggleButtonGroup>

        {entryMode === 'link' ? (
          <Box>
            <Typography sx={{ mb: 1 }}>Quickly share a job opportunity by providing a direct link.</Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm>
                <TextField
                  fullWidth
                  label="Job Posting URL"
                  variant="outlined"
                  value={jobLink}
                  onChange={(e) => setJobLink(e.target.value)}
                  error={!!linkError}
                  helperText={linkError}
                />
              </Grid>
              <Grid item xs={12} sm="auto">
                <Button
                  variant="contained"
                  onClick={handleJobImport}
                  disabled={isImporting}
                  sx={{ py: 1.5, px: 4, width: { xs: '100%', sm: 'auto' } }}
                >
                  {isImporting ? <CircularProgress size={24} /> : 'Import Job'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        ) : (
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  select required fullWidth label="Company" name="company_id" value={formData.company_id} onChange={handleChange} disabled={isSubmitting}
                  helperText="Select a verified company. If not listed, contact admin."
                >
                  {companies.map((company) => (
                    <MenuItem key={company.id} value={company.id}>
                      {company.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField required fullWidth label="Job Title" name="title" value={formData.title} onChange={handleChange} disabled={isSubmitting} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField required fullWidth label="Location" name="location" value={formData.location} onChange={handleChange} disabled={isSubmitting} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select required fullWidth label="Job Type" name="job_type" value={formData.job_type} onChange={handleChange} disabled={isSubmitting}>
                  <MenuItem value="Full-time">Full-time</MenuItem>
                  <MenuItem value="Part-time">Part-time</MenuItem>
                  <MenuItem value="Contract">Contract</MenuItem>
                  <MenuItem value="Internship">Internship</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField required fullWidth multiline rows={4} label="Job Description" name="description" value={formData.description} onChange={handleChange} disabled={isSubmitting} />
              </Grid>
              <Grid item xs={12}>
                <TextField required fullWidth multiline rows={3} label="Qualifications" name="requirements" value={formData.requirements} onChange={handleChange} disabled={isSubmitting} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Salary Range (e.g., $80k - $120k)" name="salary_range" value={formData.salary_range} onChange={handleChange} disabled={isSubmitting} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField type="date" fullWidth label="Application Deadline" name="deadline" value={formData.deadline} onChange={handleChange} InputLabelProps={{ shrink: true }} disabled={isSubmitting} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Application URL or Email" name="application_url" value={formData.application_url} onChange={handleChange} disabled={isSubmitting} />
              </Grid>
              <Grid item xs={12}>
                <Button type="submit" variant="contained" color="primary" disabled={isSubmitting} fullWidth sx={{ py: 1.5, textTransform: 'none', fontSize: '1rem' }}>
                  {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Submit for Approval'}
                </Button>
              </Grid>
            </Grid>
          </form>
        )}
      </Paper>
    </Box>
  );
};

export default JobPostingForm;
