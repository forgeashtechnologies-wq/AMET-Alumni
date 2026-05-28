import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import EmployerGuard from '../Auth/EmployerGuard';
import logger from '../../utils/logger';
import toast from 'react-hot-toast';
import { toFriendlyToast, getFriendlyErrorMessage } from '../../utils/errors';
import {
  Box, TextField, Button, Typography, Paper, Grid,
  CircularProgress, MenuItem, Alert, Switch, FormControlLabel, Avatar
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { log } from '../../utils/log';
import { validateJobUrls } from '../../utils/validators';
import { toISODate } from '../../utils/dateClean';

const GuardReady = ({ onReady }) => {
  useEffect(() => { onReady && onReady(); }, [onReady]);
  return null;
};

const EditJob = () => {
  // Route param (supports legacy :jobId too)
  const params = useParams();
  const id = params.id ?? params.jobId;

  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin } = useAuth();

  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(false); // fetch loading
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  // Persist the job type (Quick vs In-App) from initial load to prevent mid-edit flips
  const [initialIsQuick, setInitialIsQuick] = useState(null);

  // just for coordinating when to start the fetch
  const [guardReady, setGuardReady] = useState(false);

  // Mount log
  useEffect(() => {
    log.group('[EDIT] mount', { routeId: id, path: location.pathname });
  }, [id, location.pathname]);

  const fetchJob = useCallback(async () => {
    if (!id) {
      setError('Missing job id in route.');
      return;
    }
    if (!user) {
      toast.error('You must be logged in to edit this job.');
      navigate('/login');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Snapshot session for visibility
      const { data: { session } } = await supabase.auth.getSession();
      log.group('[EDIT] session', {
        hasSession: !!session,
        userId: session?.user?.id,
        routeId: id,
        path: location.pathname
      });

      let data = null, err = null, status = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const t0 = performance.now();
        const resp = await supabase
          .from('jobs')
          .select(`
            id, title, company_name, location, job_type,
            description, requirements, skills, salary_range, application_url,
            contact_name, contact_email, contact_phone,
            external_url, apply_url, company_id, logo_url,
            education_requirements,
            posted_by, user_id, created_by, deadline, application_deadline,
            is_active, is_approved,
            company:companies(name, logo_url)
          `)
          .eq('id', id)
          .single();

        data = resp.data; err = resp.error; status = resp.status;
        log.group('[EDIT] fetch result', {
          status: resp.status,
          ms: +(performance.now() - t0).toFixed(1),
          error: err ? { code: err.code, message: err.message, details: err.details } : null,
          gotRow: !!data
        });

        if (!err && data) break; // success

        const st = err?.status ?? status ?? 0;
        if ([401, 403, 406].includes(st)) {
          await new Promise(r => setTimeout(r, 250));
          continue; // retry
        }
        break;
      }

      if (err || !data) {
        setError('This job either doesn’t exist or you don’t have permission to edit it.');
        setFormData(null);
        return;
      }

      log.group('[EDIT] owner check', {
        posted_by: data.posted_by,
        user_id: data.user_id,
        created_by: data.created_by,
        me: user?.id
      });

      setFormData({
        ...data,
        description: data.description || '',
        requirements: data.requirements || '',
        skillsText: Array.isArray(data.skills)
          ? data.skills.join(', ')
          : (data.skills || ''),
        education_requirements: Array.isArray(data.education_requirements) && data.education_requirements.length
          ? data.education_requirements[0]
          : '',
      });

      // Freeze the initial mode for the edit session
      const quick = Boolean((data?.application_url && String(data.application_url).trim()) || (data?.external_url && String(data.external_url).trim()));
      setInitialIsQuick(quick);

      const existingLogo = data?.logo_url || '';
      setLogoPreview(existingLogo);
      setLogoFile(null);
    } catch (e) {
      logger.error('Error fetching job:', e);
      setError(getFriendlyErrorMessage(e, 'Failed to load job data.'));
      setFormData(null);
    } finally {
      setLoading(false);
    }
  }, [id, user, navigate, location.pathname]);

  // Kick off the fetch only after the guard renders our child
  useEffect(() => {
    if (guardReady && !formData && !loading && !error) {
      fetchJob();
    }
  }, [guardReady, formData, loading, error, fetchJob]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // Optional job-specific logo upload (1MB limit, job-level only)
  const handleLogoChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Only PNG, JPG, GIF, SVG, or WebP files are allowed.');
      return;
    }

    const maxSize = 1 * 1024 * 1024; // 1MB
    if (file.size > maxSize) {
      toast.error('Your file is too large (max 1 MB). Please upload a smaller image.');
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const cleanField = useCallback((v) => {
    if (v === undefined || v === null) return null;
    if (typeof v !== 'string') return v;
    const t = v.trim();
    return t === '' ? null : t;
  }, []);

  const isQuick = useMemo(() => {
    // UI render mode is frozen from initial load to avoid data-loss from conditional sections disappearing mid-edit.
    if (initialIsQuick !== null) return initialIsQuick;
    const normApplicationUrl = cleanField(formData?.application_url);
    const normExternalUrl = cleanField(formData?.external_url);
    return !!(normApplicationUrl || normExternalUrl);
  }, [cleanField, formData?.application_url, formData?.external_url, initialIsQuick]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!id) {
      toast.error('Missing job ID.');
      return;
    }
    setIsSubmitting(true);

    // Optional job-specific logo upload
    let uploadedLogoUrl = formData?.logo_url || null;
    if (logoFile) {
      try {
        const cleanFileName = logoFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const fileName = `${user.id}/${Date.now()}_${cleanFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('company-logos')
          .upload(fileName, logoFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Failed to upload logo: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from('company-logos')
          .getPublicUrl(fileName);
        uploadedLogoUrl = urlData.publicUrl;
      } catch (err) {
        logger.error('Logo upload failed (edit job):', err);
        toast.error(`We could not upload the logo: ${err.message || 'Unknown error'}`);
        setIsSubmitting(false);
        return;
      }
    }

    const {
      title, company_name, location, job_type, description, requirements, skills,
      salary_range, application_url, contact_name, contact_email, contact_phone,
      external_url, apply_url, company_id, deadline, application_deadline, is_active,
      education_requirements,
    } = formData || {};

    // Normalize and enforce the DB constraint jobs_external_target_at_most_one
    // Only one of apply_url, application_url, external_url can be non-null
    const norm_apply_url = cleanField(apply_url);
    const norm_application_url = cleanField(application_url);
    const norm_external_url = cleanField(external_url);

    const urlError = validateJobUrls({
      application_url: norm_application_url,
      external_url: norm_external_url,
      apply_url: norm_apply_url,
    });
    if (urlError) {
      toast.error(urlError);
      setIsSubmitting(false);
      return;
    }

    // Company/logo sync disabled per request; keep job fields only
    const trimmedCompanyName = (company_name || '').trim() || null;
    const safeCompanyName = trimmedCompanyName ? trimmedCompanyName.slice(0, 23) : null;

    // Parse salary range into numeric min/max for proper display fields
    const parseSalaryRange = (val) => {
      const raw = typeof val === 'string' ? val : '';
      const nums = (raw.match(/\d+/g) || []).map(n => parseInt(n, 10)).filter(n => !Number.isNaN(n));
      if (nums.length >= 2) {
        const [a, b] = nums;
        const min = Math.min(a, b);
        const max = Math.max(a, b);
        return { min, max };
      }
      if (nums.length === 1) {
        // To satisfy min <= max constraints, set both to the single value
        return { min: nums[0], max: nums[0] };
      }
      return { min: null, max: null };
    };
    const { min: parsedSalaryMin, max: parsedSalaryMax } = parseSalaryRange(salary_range);

    let updateData;
    const edu = cleanField(education_requirements);

    if (isQuick) {
      // Minimal Quick Link update
      const isoDate = toISODate(String((application_deadline || deadline || '').toString()).trim());
      if (!title || !norm_application_url || !isoDate) {
        toast.error('For quick link jobs, title, external URL, and deadline are required.');
        setIsSubmitting(false);
        return;
      }
      updateData = {
        title,
        company_name: safeCompanyName,
        application_url: norm_application_url,
        external_url: null,
        apply_url: null,
        salary_range: cleanField(salary_range),
        salary_min: parsedSalaryMin,
        salary_max: parsedSalaryMax,
        deadline: isoDate,
        application_deadline: isoDate,
        contact_name: cleanField(contact_name),
        contact_email: cleanField(contact_email),
        contact_phone: cleanField(contact_phone),
        description: cleanField(description),
        logo_url: uploadedLogoUrl,
        education_requirements: edu ? [edu] : null,
      };
    } else {
      updateData = {
        title,
        company_name: safeCompanyName,
        location,
        job_type,
        description: cleanField(description),
        requirements: cleanField(requirements),
        skills,
        salary_range,
        salary_min: parsedSalaryMin,
        salary_max: parsedSalaryMax,
        application_url: norm_application_url,
        contact_name: cleanField(contact_name),
        contact_email: cleanField(contact_email),
        contact_phone: cleanField(contact_phone),
        external_url: null,
        apply_url: null,
        deadline: cleanField(deadline),
        application_deadline: null,
        logo_url: uploadedLogoUrl,
        education_requirements: edu ? [edu] : null,
      };
      // Prevent overposting: only admins can toggle is_active here
      if (isAdmin) {
        updateData.is_active = is_active;
      }
    }

    try {
      log.group('[EDIT] update submit', { id, payload: updateData });
      const t0 = performance.now();
      const { data: upd, error: upErr, status } = await supabase
        .from('jobs')
        .update({
          ...updateData,
        })
        .eq('id', id)
        .select('id')
        .single();

      log.group('[EDIT] update result', {
        status,
        ms: +(performance.now() - t0).toFixed(1),
        error: upErr ? { code: upErr.code, message: upErr.message, details: upErr.details } : null,
        updated: !!upd?.id
      });

      if (upErr) throw upErr;

      toast.success('Job updated successfully.');
      try {
        sessionStorage.setItem('jobsNeedsRefresh', '1');
      } catch (_) { /* non-blocking */ }
      navigate(`/jobs/${id}`);
    } catch (err) {
      logger.error('Error updating job:', err);
      toFriendlyToast(toast, err, 'Update failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // UI states:
  // 1) While guard isn’t ready yet OR first fetch pending → spinner
  // 2) After fetch: if error → error banner
  // 3) After fetch: if formData → form

  return (
    <EmployerGuard jobId={id /* non-strict so child always renders */}>
      {() => (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
          <GuardReady onReady={() => setGuardReady(true)} />

          {(loading || !guardReady || (!formData && !error)) && (
            <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', height:'50vh' }}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
              <Button variant="contained" onClick={() => navigate(-1)} startIcon={<ArrowBackIcon />}>
                Go Back
              </Button>
            </Box>
          )}

          {!loading && guardReady && formData && !error && (
            <>
              <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
                Back to Job Details
              </Button>

              <Paper sx={{ p: { xs: 2, sm: 4 }, borderRadius: 2, boxShadow: 3 }}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
                  Edit Job
                </Typography>

                <form onSubmit={handleSave}>
                  <Grid container spacing={3}>
                    {/* Quick Link minimal form */
                    /* Mode is frozen from initial load to avoid transient flips when editing URL fields */}
                    {(() => {
                      const quick = isQuick;
                      if (!quick) return null;
                      return (
                        <>
                          <Grid item xs={12}>
                            <TextField required fullWidth label="Job Title" name="title"
                              value={formData.title || ''} onChange={handleChange} disabled={isSubmitting} />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField fullWidth label="Company Name (Optional)" name="company_name"
                              value={formData.company_name || ''} onChange={handleChange} disabled={isSubmitting} />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField required fullWidth label="External Application URL (https:// or mailto:)" name="application_url"
                              value={formData.application_url || ''} onChange={handleChange} disabled={isSubmitting} />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField required type="date" fullWidth label="Deadline" name="application_deadline"
                              value={(formData.application_deadline || formData.deadline) ? new Date(formData.application_deadline || formData.deadline).toISOString().split('T')[0] : ''}
                              onChange={(e) => setFormData(p => ({ ...p, application_deadline: e.target.value }))}
                              InputLabelProps={{ shrink: true }} disabled={isSubmitting} />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField fullWidth multiline rows={3} label="Summary (Optional)" name="description"
                              value={formData.description || ''} onChange={handleChange} disabled={isSubmitting} />
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="subtitle1" gutterBottom>Job Logo (optional)</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar
                                src={logoPreview || formData.logo_url || ''}
                                alt="Job Logo Preview"
                                sx={{ width: 60, height: 60, border: '1px solid #ddd' }}
                              />
                              <Button variant="outlined" component="label" disabled={isSubmitting}>
                                Upload Job Logo
                                <input
                                  type="file"
                                  hidden
                                  accept="image/png, image/jpeg, image/jpg, image/gif, image/svg+xml, image/webp"
                                  onChange={handleLogoChange}
                                />
                              </Button>
                              {logoPreview && (
                                <Button
                                  size="small"
                                  onClick={() => {
                                    setLogoFile(null);
                                    setLogoPreview('');
                                  }}
                                  disabled={isSubmitting}
                                >
                                  Remove
                                </Button>
                              )}
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              This logo is stored only on this job and is not linked to any company profile.
                            </Typography>
                          </Grid>
                        </>
                      );
                    })()}

                    {/* In-App form (legacy) */}
                    {(() => {
                      const quick = isQuick;
                      if (quick) return null;
                      return (
                        <>
                          <Grid item xs={12}>
                            <TextField required fullWidth label="Job Title" name="title"
                              value={formData.title || ''} onChange={handleChange} disabled={isSubmitting} />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField select required fullWidth label="Job Type" name="job_type"
                              value={formData.job_type || 'Full-time'} onChange={handleChange} disabled={isSubmitting}>
                              <MenuItem value="Full-time">Full-time</MenuItem>
                              <MenuItem value="Part-time">Part-time</MenuItem>
                              <MenuItem value="Contract">Contract</MenuItem>
                              <MenuItem value="Internship">Internship</MenuItem>
                            </TextField>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField required fullWidth label="Location" name="location"
                              value={formData.location || ''} onChange={handleChange} disabled={isSubmitting} />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField required fullWidth multiline rows={4} label="Job Description" name="description"
                              value={formData.description || ''} onChange={handleChange} disabled={isSubmitting} />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              multiline
                              rows={2}
                              label="Key Skills (comma-separated)"
                              name="skills"
                              value={
                                typeof formData.skillsText === 'string'
                                  ? formData.skillsText
                                  : (Array.isArray(formData.skills)
                                      ? formData.skills.join(', ')
                                      : (formData.skills || ''))
                              }
                              onChange={(e) => {
                                const raw = e.target.value || '';
                                const parts = raw
                                  .split(/[\n,]+/)
                                  .map((s) => s.trim())
                                  .filter(Boolean);
                                setFormData(prev => ({
                                  ...prev,
                                  skillsText: raw,
                                  skills: parts,
                                }));
                              }}
                              disabled={isSubmitting}
                              helperText="Add important skills separated by commas (e.g., Navigation, Engine Maintenance, Leadership)"
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              multiline
                              rows={3}
                              label="Responsibilities"
                              name="requirements"
                              value={formData.requirements || ''}
                              onChange={handleChange}
                              disabled={isSubmitting}
                              helperText="Use bullet points (•) or newlines to separate qualifications"
                              sx={{
                                '& .MuiInputBase-input': { lineHeight: 1.5, fontSize: '1rem' },
                                '& textarea': { whiteSpace: 'pre-wrap', wordWrap: 'break-word' },
                              }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Salary Range" name="salary_range"
                              value={formData.salary_range || ''} onChange={handleChange} disabled={isSubmitting} />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField type="date" fullWidth label="Application Deadline" name="deadline"
                              value={formData.deadline ? new Date(formData.deadline).toISOString().split('T')[0] : ''}
                              onChange={handleChange} InputLabelProps={{ shrink: true }} disabled={isSubmitting} />
                          </Grid>
                          {/* HR / Company */}
                          <Grid item xs={12}>
                            <Typography variant="h6" sx={{ mb: 1, mt: 1 }}>HR Information</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              Provide the recruiter/HR contact and company details.
                            </Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <TextField fullWidth label="Company Name (Optional)" name="company_name"
                              value={formData.company_name || ''} onChange={handleChange} disabled={isSubmitting} />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <TextField fullWidth label="HR Contact Name" name="contact_name"
                              value={formData.contact_name || ''} onChange={handleChange} disabled={isSubmitting} />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <TextField fullWidth label="HR Contact Email" name="contact_email"
                              value={formData.contact_email || ''} onChange={handleChange} disabled={isSubmitting} />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <TextField fullWidth label="HR Contact Phone" name="contact_phone"
                              value={formData.contact_phone || ''} onChange={handleChange} disabled={isSubmitting} />
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="subtitle1" gutterBottom>Job Logo (optional)</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar
                                src={logoPreview || formData.logo_url || ''}
                                alt="Job Logo Preview"
                                sx={{ width: 60, height: 60, border: '1px solid #ddd' }}
                              />
                              <Button variant="outlined" component="label" disabled={isSubmitting}>
                                Upload Job Logo
                                <input
                                  type="file"
                                  hidden
                                  accept="image/png, image/jpeg, image/jpg, image/gif, image/svg+xml, image/webp"
                                  onChange={handleLogoChange}
                                />
                              </Button>
                              {logoPreview && (
                                <Button
                                  size="small"
                                  onClick={() => {
                                    setLogoFile(null);
                                    setLogoPreview('');
                                  }}
                                  disabled={isSubmitting}
                                >
                                  Remove
                                </Button>
                              )}
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              This logo is stored only on this job and is not linked to any company profile.
                            </Typography>
                          </Grid>
                        </>
                      );
                    })()}

                    <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
                      <Button variant="outlined" color="secondary"
                        onClick={() => navigate(`/jobs/${id}`)} disabled={isSubmitting}>
                        Cancel
                      </Button>
                      <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
                        {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Save Changes'}
                      </Button>
                    </Grid>
                  </Grid>
                </form>
              </Paper>
            </>
          )}
        </Box>
      )}
    </EmployerGuard>
  );
};

export default EditJob;
