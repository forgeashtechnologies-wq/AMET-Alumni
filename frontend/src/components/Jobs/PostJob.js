import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';
import logger from '../../utils/logger';
import { useApproval } from '../../hooks/useApproval';
import { mapSupabaseErrorToToast } from '../../utils/mapSupabaseErrorToToast';
import { buildJobPayload } from '../../utils/jobPayloadBuilder';
import { toISODate } from '../../utils/dateClean';
import { isValidUrl, isValidEmail, validateJobUrls } from '../../utils/validators';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Paper,
  Grid,
  TextField,
  MenuItem,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Avatar,
  Divider
} from '@mui/material';
import {
  Work as WorkIcon,
  Description as DescriptionIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  AttachMoney as SalaryIcon
} from '@mui/icons-material';

const steps = ['Core Info', 'Job Content', 'Details & Contact'];

const PostJob = () => {
  const { user, profile, userRole, isAdmin } = useAuth();
  const { loading: apprLoading, isApprovedEmployer } = useApproval();

  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [publishIntent, setPublishIntent] = useState(false);
  // Optional job-specific logo (stored only on jobs.logo_url, not tied to companies)
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [showSelectionScreen, setShowSelectionScreen] = useState(true);
  const [postingType, setPostingType] = useState(null); // 'link' or 'form'

  useEffect(() => {
    // No employer-derived defaults; all company fields are user-entered.
  }, [profile]);

  const [formData, setFormData] = useState({
    title: '',
    company_name: '',
    location: '',
    job_type: 'Full-time',
    experience_level: 'Entry',
    department: '',
    industry: '',
    salary_min: '',
    salary_max: '',
    deadline: '',
    description: '',
    requirements: '',
    nice_to_have_skills: '', // Will be mapped to skills array
    contact_email: '', // Renamed from hiring_contact_email
    // New fields for education requirements and contact info
    education_requirements: '', // Minimum education required
    contact_name: '', // Hiring manager name
    contact_phone: '', // Hiring contact phone
    // Internal fields
    company_id: null,
    logo_url: '',
    // Quick Link specific (unified)
    application_url: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

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

  const validateStep = () => {
    const newErrors = {};
    if (activeStep === 0) { // Core Info validation
      if (!formData.title.trim()) newErrors.title = 'Job Title is required.';
      if (!formData.company_name.trim()) newErrors.company_name = 'Company Name is required.';
      if (!formData.location.trim()) newErrors.location = 'Location is required.';
      // Work Mode, Job Type, and Experience Level have defaults, but you could add validation if needed.
    }
    if (activeStep === steps.length - 1) { // Final step: Details & Contact
      if (!formData.description || !formData.description.trim()) {
        newErrors.description = 'A short job summary is required.';
      }
      if (!formData.contact_email || !formData.contact_email.trim()) {
        newErrors.contact_email = 'Contact email is required.';
      }
    }
    // No validation for step 1 (Job Content) or step 2 (Details & Contact) as fields are optional.
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const validateFullForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Job Title is required.';
    if (!formData.company_name.trim()) newErrors.company_name = 'Company Name is required.';
    if (!formData.location.trim()) newErrors.location = 'Location is required.';
    if (!formData.job_type) newErrors.job_type = 'Job Type is required.';
    if (!formData.description || !formData.description.trim()) newErrors.description = 'Job description is required.';
    if (!formData.contact_email || !formData.contact_email.trim()) {
      newErrors.contact_email = 'Contact email is required.';
    } else if (!isValidEmail(formData.contact_email)) {
      newErrors.contact_email = 'Enter a valid email.';
    }
    if (!formData.deadline || !String(formData.deadline).trim()) {
      newErrors.deadline = 'Application deadline is required.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleQuickLinkSubmit = async (e) => {
    e.preventDefault();
    if (!isApprovedEmployer && !isAdmin) { toast.error('Your employer profile is not yet approved. Please contact the administrator.'); return; }

    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Job Title is required.';
    if (!formData.application_url.trim()) {
      newErrors.application_url = 'Application URL is required.';
    } else if (!isValidUrl(formData.application_url, ['https', 'mailto'])) {
      newErrors.application_url = 'Please enter a valid URL (https:// or mailto:).';
    }
    if (!formData.deadline || !String(formData.deadline).trim()) {
      newErrors.deadline = 'Deadline is required.';
    }

    const urlError = validateJobUrls({ application_url: formData.application_url });
    if (urlError) {
      newErrors.application_url = urlError;
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error('Please fix the errors highlighted above.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        toast.error('Please log in to post a job.');
        return;
      }

      let logoUrl = null;
      const companyNameTrim = String(formData.company_name || '').trim();

      // Optional job logo upload (job-specific, not tied to any company)
      if (logoFile) {
        try {
          const cleanFileName = logoFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
          const fileName = `${session.user.id}/${Date.now()}_${cleanFileName}`;

          const { error: uploadError } = await supabase.storage
            .from('company-logos')
            .upload(fileName, logoFile, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            throw new Error(`Failed to upload logo: ${uploadError.message}`);
          }

          const { data: urlData } = supabase.storage
            .from('company-logos')
            .getPublicUrl(fileName);
          logoUrl = urlData.publicUrl;
        } catch (err) {
          logger.error('Logo upload failed (quick link):', err);
          toast.error(`We could not upload the logo: ${err.message || 'Unknown error'}`);
          setIsSubmitting(false);
          return;
        }
      }

      // Normalize date picker to YYYY-MM-DD
      const isoDate = toISODate(String(formData.deadline || '').trim());
      const insertPayload = {
        title: formData.title.trim(),
        company_name: companyNameTrim || null,
        application_url: formData.application_url.trim(),
        // Constraint requires application_deadline when using external URL
        deadline: isoDate,
        application_deadline: isoDate,
        // Optional job-specific logo URL
        logo_url: logoUrl || null,
        // Optional description if provided, but not required in this path
        description: formData.description?.trim() || null,
        status: 'active',
        is_active: true,
        is_approved: false,
        created_by: session.user.id,
        user_id: profile?.id || session.user.id,
      };
      const { error: jobError } = await supabase
        .from('jobs')
        .insert(insertPayload, { returning: 'minimal' });
      if (jobError) throw jobError;

      toast.success('Quick link job posted successfully.');
      navigate('/jobs');

    } catch (err) {
      logger.error('Error submitting Quick Link job:', err);
      const code = err?.code;
      const msg = String(err?.message || err?.details || '');
      if (code === '42501' || /row-level security/i.test(msg) || /fc_is_fully_approved/i.test(msg)) {
        toast.error('Your account must be an approved employer to post jobs. Please wait for admin approval or contact the administrator.');
      } else {
        mapSupabaseErrorToToast(err);
      }
    } finally {
      setPublishIntent(false);
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const submitter = e?.nativeEvent?.submitter;
    const isExplicitPublish = submitter && submitter.name === 'publish';
    logger.log('DEBUG handleSubmit', {
      activeStep,
      submitterName: submitter?.name,
      isExplicitPublish
    });
    // Prevent submission before final step; advance instead
    if (activeStep !== steps.length - 1) {
      handleNext();
      return;
    }
    // Only proceed on explicit Publish button click
    if (!isApprovedEmployer && !isAdmin) { toast.error('Your employer profile is not yet approved. Please contact the administrator.'); return; }

    if (!validateFullForm()) {
      toast.error('Please fix the highlighted errors.');
      return;
    }

    const { salary_min, salary_max, deadline } = formData;
    if (salary_min && salary_max && parseFloat(salary_min) > parseFloat(salary_max)) {
      toast.error('Minimum salary cannot be greater than maximum salary.');
      setErrors(prev => ({ ...prev, salary_min: 'Invalid range', salary_max: 'Invalid range' }));
      return;
    }

    if (deadline) {
      const today = new Date();
      const deadlineDate = new Date(deadline);
      today.setHours(0, 0, 0, 0); 
      if (deadlineDate < today) {
        toast.error('The application deadline cannot be in the past.');
        setErrors(prev => ({ ...prev, deadline: 'Date cannot be in the past' }));
        return;
      }
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      toast.error('Please log in to post a job.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Optional job-specific logo upload (job-level only)
      let jobLogoUrl = formData.logo_url || null;
      if (logoFile) {
        try {
          const cleanFileName = logoFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
          const fileName = `${session.user.id}/${Date.now()}_${cleanFileName}`;

          const { error: uploadError } = await supabase.storage
            .from('company-logos')
            .upload(fileName, logoFile, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            throw new Error(`Failed to upload logo: ${uploadError.message}`);
          }

          const { data: urlData } = supabase.storage
            .from('company-logos')
            .getPublicUrl(fileName);
          jobLogoUrl = urlData.publicUrl;
        } catch (err) {
          logger.error('Logo upload failed (full form):', err);
          toast.error(`We could not upload the logo: ${err.message || 'Unknown error'}`);
          setIsSubmitting(false);
          return;
        }
      }

      const payload = buildJobPayload({ ...formData, logo_url: jobLogoUrl }, 'form');
      // Enforce publish-ready status to trigger DB constraints (status='active')
      const insertPayload = {
        ...payload,
        status: 'active',
        is_approved: false,
        is_active: true,
        created_by: session.user.id,
        user_id: profile?.id || session.user.id,
      };
      logger.log("Submitting In-App job with payload:", insertPayload);
      const { data: newJob, error: jobError } = await supabase
        .from('jobs')
        .insert(insertPayload, { returning: 'representation' });
        
      if (jobError) {
        logger.error("Error creating job:", jobError);
        logger.error('Full job creation error:', JSON.stringify(jobError, null, 2));
        throw new Error(`Failed to create job: ${jobError.message || 'RLS/validation error'}`);
      }
      
      logger.log("Job created successfully");
      toast.success('Your job has been posted successfully.');

      const newJobId = Array.isArray(newJob) ? newJob[0]?.id : newJob?.id;
      if (newJobId) {
        navigate(`/jobs/${newJobId}`);
      } else {
        navigate('/jobs');
      }
    } catch (err) {
      logger.error('Error submitting job:', err);
      const code = err?.code;
      const msg = String(err?.message || err?.details || '');
      if (code === '42501' || /row-level security/i.test(msg) || /fc_is_fully_approved/i.test(msg)) {
        toast.error('Your account must be an approved employer to post jobs. Please wait for admin approval or contact the administrator.');
      } else {
        mapSupabaseErrorToToast(err);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0: 
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField required fullWidth name="title" label="Job Title" value={formData.title} onChange={handleChange} error={!!errors.title} helperText={errors.title} placeholder="e.g., Mechanical Engineer – Shipyard" />
            </Grid>
            <Grid item xs={12}>
              <TextField required fullWidth name="company_name" label="Company Name" value={formData.company_name} onChange={handleChange} error={!!errors.company_name} helperText={errors.company_name} />
            </Grid>
            <Grid item xs={12}>
              <TextField required fullWidth name="location" label="Location" value={formData.location} onChange={handleChange} error={!!errors.location} helperText={errors.location} placeholder="e.g., Mumbai, Maharashtra, India" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth required name="job_type" label="Job Type" value={formData.job_type} onChange={handleChange}>
                <MenuItem value="Full-time">Full-time</MenuItem>
                <MenuItem value="Part-time">Part-time</MenuItem>
                <MenuItem value="Contract">Contract</MenuItem>
                <MenuItem value="Internship">Internship</MenuItem>
                <MenuItem value="Temporary">Temporary</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth required name="experience_level" label="Experience Level" value={formData.experience_level} onChange={handleChange}>
                <MenuItem value="Entry">Entry</MenuItem>
                <MenuItem value="Mid">Mid-level</MenuItem>
                <MenuItem value="Senior">Senior</MenuItem>
                <MenuItem value="Director+">Director+</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        );
      case 1: 
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                name="description"
                label="Job Description"
                value={formData.description}
                onChange={handleChange}
                error={!!errors.description}
                helperText={errors.description || 'Add your required qualification inside the description.'}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={5} name="requirements" label="Responsibilities" value={formData.requirements} onChange={handleChange} placeholder="" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth name="nice_to_have_skills" label="Nice-to-have Skills (comma-separated)" value={formData.nice_to_have_skills} onChange={handleChange} placeholder="e.g., AutoCAD, Project Management" />
            </Grid>
          </Grid>
        );
      case 2: 
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth name="department" label="Department" value={formData.department} onChange={handleChange} placeholder="e.g., Marine Engineering" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth name="industry" label="Industry" value={formData.industry} onChange={handleChange} placeholder="e.g., Maritime" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth name="salary_min" label="Salary Minimum" type="number" value={formData.salary_min} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth name="salary_max" label="Salary Maximum" type="number" value={formData.salary_max} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="date" name="deadline" label="Application Deadline" value={formData.deadline} onChange={handleChange} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField 
                select 
                fullWidth 
                name="education_requirements" 
                label="Minimum Education Required" 
                value={formData.education_requirements} 
                onChange={handleChange}
              >
                <MenuItem value="">Not specified</MenuItem>
                <MenuItem value="other">High School</MenuItem>
                <MenuItem value="diploma">Diploma</MenuItem>
                <MenuItem value="bachelors">Bachelor's Degree</MenuItem>
                <MenuItem value="masters">Master's Degree</MenuItem>
                <MenuItem value="phd">Ph.D.</MenuItem>
                <MenuItem value="other">Professional Certification</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}><Typography variant="overline">Job Logo</Typography></Divider>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>Job Logo (optional)</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  src={logoPreview || formData.logo_url || ''}
                  alt="Job Logo Preview"
                  sx={{ width: 60, height: 60, border: '1px solid #ddd' }}
                />
                <Button variant="outlined" component="label">
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
                  >
                    Remove
                  </Button>
                )}
              </Box>
              <Typography variant="caption" color="text.secondary">
                This logo is stored only on this job post and is not linked to any company profile.
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}><Typography variant="overline">Contact Information</Typography></Divider>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth name="contact_name" label="Hiring Manager Name" value={formData.contact_name} onChange={handleChange} placeholder="e.g., John Smith" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth name="contact_email" type="email" label="Hiring Contact Email" value={formData.contact_email} onChange={handleChange} error={!!errors.contact_email} helperText={errors.contact_email} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth name="contact_phone" type="tel" label="Hiring Contact Phone" value={formData.contact_phone} onChange={handleChange} placeholder="e.g., +91 9876543210" />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                Contact information is for internal use and will only be shared with applicants when appropriate.
              </Typography>
            </Grid>
          </Grid>
        );
      default:
        return 'Unknown step';
    }
  };

  const getStepIcon = (step) => {
    const icons = {
      0: <WorkIcon />,
      1: <DescriptionIcon />,
      2: <BusinessIcon />
    };
    return icons[step] || <WorkIcon />;
  };

  // Handle option selection
  const handleOptionSelect = (type) => {
    setPostingType(type);
    setShowSelectionScreen(false);
    
    // Reset form for link posting type
    if (type === 'link') {
      setFormData(prev => ({
        ...prev,
        application_url: '',
        title: '',
        company_name: '' // Changed from company_id
      }));
    }
  };

  // Handle back to selection
  const handleBackToSelection = () => {
    setShowSelectionScreen(true);
    setPostingType(null);
    setActiveStep(0);
  };

  if (!apprLoading && !isApprovedEmployer && !isAdmin) {
    return (
      <div className="p-6 rounded-lg bg-gradient-to-br from-red-50 to-orange-50 text-red-700 border border-red-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Profile Approval Required</h3>
            <p className="text-red-600">Your employer profile needs to be approved before you can post jobs.</p>
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-sm">To get approved:</p>
          <ul className="text-sm space-y-1 ml-4">
            <li>• Complete your profile with company details</li>
            <li>• Contact our administrators for approval</li>
            <li>• Check your email for approval status updates</li>
          </ul>
          <div className="pt-2">
            <p className="text-sm font-medium">Need help? Contact us at:</p>
            <a href="mailto:admin@amet.edu" className="text-blue-600 hover:underline text-sm">admin@amet.edu</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: '#f4f6f8', // Changed background to a light grey
      py: 4
    }}>
      <Box sx={{ maxWidth: '900px', mx: 'auto', px: 2 }}>
        {/* Header Section */}
        <Card sx={{ 
          mb: 4, 
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Avatar sx={{ 
              width: 80, 
              height: 80, 
              mx: 'auto', 
              mb: 2,
              background: 'linear-gradient(45deg, #1976d2, #42a5f5)'
            }}>
              <WorkIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Typography variant="h4" component="h1" sx={{ 
              mb: 2, 
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {showSelectionScreen ? 'Post a Job' : 'Post a Job Opening'}
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              {showSelectionScreen ? 'Select a posting method' : 'Connect with talented maritime professionals'}
            </Typography>
            {!showSelectionScreen && (
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, alignItems: 'center' }}>
                <Chip 
                  label={postingType === 'link' ? 'Quick Link Post' : 'Full Job Form'}
                  color="primary"
                  sx={{ fontSize: '0.9rem', px: 2 }}
                />
                {postingType === 'form' && (
                  <Chip 
                    label={`Step ${activeStep + 1} of ${steps.length}`}
                    color="primary"
                    variant="outlined"
                    sx={{ fontSize: '0.9rem', px: 2 }}
                  />
                )}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Selection Screen or Progress Stepper */}
        {showSelectionScreen ? (
          <Card sx={{ 
            mb: 4,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" sx={{ mb: 4, textAlign: 'center', color: '#1976d2', fontWeight: 500 }}>
                How would you like to post your job?
              </Typography>
              
              <Grid container spacing={4}>
                {/* Quick Link Post Option */}
                <Grid item xs={12} md={6}>
                  <Card 
                    onClick={() => handleOptionSelect('link')} 
                    sx={{
                      cursor: 'pointer', 
                      p: 4, 
                      textAlign: 'center',
                      height: '100%',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)'
                      }
                    }}
                  >
                    <Avatar sx={{ width: 60, height: 60, mx: 'auto', mb: 2, bgcolor: '#3f51b5' }}>
                      <Typography variant="h5">1</Typography>
                    </Avatar>
                    <Typography variant="h6" gutterBottom>Quick Link Post</Typography>
                    <Divider sx={{ my: 2 }} />
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                      Simply provide a job title and link to an external application page
                    </Typography>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 2 }}>
                      <span>⏱️</span> Takes less than a minute
                    </Typography>
                  </Card>
                </Grid>

                {/* Full Form Post Option */}
                <Grid item xs={12} md={6}>
                  <Card 
                    onClick={() => handleOptionSelect('form')} 
                    sx={{
                      cursor: 'pointer', 
                      p: 4, 
                      textAlign: 'center',
                      height: '100%',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)'
                      }
                    }}
                  >
                    <Avatar sx={{ width: 60, height: 60, mx: 'auto', mb: 2, bgcolor: '#2196f3' }}>
                      <Typography variant="h5">2</Typography>
                    </Avatar>
                    <Typography variant="h6" gutterBottom>Complete Job Form</Typography>
                    <Divider sx={{ my: 2 }} />
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                      Create a detailed job posting with full information and employer details
                    </Typography>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 2 }}>
                      <span>📝</span> Comprehensive and professional
                    </Typography>
                  </Card>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ) : postingType === 'form' ? (
          <Card sx={{ 
            mb: 4,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Stepper activeStep={activeStep} alternativeLabel sx={{
                '& .MuiStepLabel-root .Mui-completed': {
                  color: '#1976d2'
                },
                '& .MuiStepLabel-root .Mui-active': {
                  color: '#42a5f5'
                }
              }}>
                {steps.map((label, index) => (
                  <Step key={label}>
                    <StepLabel 
                      StepIconComponent={() => (
                        <Avatar sx={{
                          width: 32,
                          height: 32,
                          bgcolor: activeStep >= index ? '#1976d2' : '#e0e0e0',
                          color: activeStep >= index ? 'white' : '#666'
                        }}>
                          {activeStep >= index ? getStepIcon(index) : index + 1}
                        </Avatar>
                      )}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 500, mt: 1 }}>
                        {label}
                      </Typography>
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
            </CardContent>
          </Card>
        ) : null}

        {/* Main Content */}
        {!showSelectionScreen && (
          <Card sx={{ 
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <CardContent sx={{ p: 4 }}>
              {postingType === 'link' ? (
                /* Quick Link Post Form */
                <form onSubmit={handleQuickLinkSubmit}>
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h5" sx={{ mb: 1, fontWeight: 'bold', color: '#1976d2' }}>
                      Post with a Link
                    </Typography>
                    <Typography variant="body1" color="text.secondary">Provide a job title, company, and a link to the external application page.</Typography>
                    <Divider sx={{ my: 2 }} />
                  </Box>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <TextField required fullWidth name="title" label="Job Title" value={formData.title} onChange={handleChange} error={!!errors.title} helperText={errors.title} />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth name="company_name" label="Company Name (Optional)" value={formData.company_name} onChange={handleChange} error={!!errors.company_name} helperText={errors.company_name} />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField required fullWidth type="url" name="application_url" label="Application URL" value={formData.application_url} onChange={handleChange} error={!!errors.application_url} helperText={errors.application_url} />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" gutterBottom>Company Logo (Optional)</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar
                          src={logoPreview || formData.logo_url || profile.logo_url || profile.avatar_url || ''}
                          alt="Company Logo Preview"
                          sx={{ width: 60, height: 60, border: '1px solid #ddd' }}
                        />
                        <Button variant="outlined" component="label">
                          Upload Company Logo
                          <input
                            type="file"
                            hidden
                            accept="image/png, image/jpeg, image/jpg, image/svg+xml"
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
                          >
                            Remove
                          </Button>
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Upload your official <strong>company logo</strong> (max 1 MB). This logo will be used for this company across all of
                        its jobs in the portal.
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        required
                        fullWidth
                        type="date"
                        name="deadline"
                        label="Deadline"
                        value={formData.deadline}
                        onChange={handleChange}
                        InputLabelProps={{ shrink: true }}
                        error={!!errors.deadline}
                        helperText={errors.deadline}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth multiline rows={3} name="description" label="Summary (Optional)" value={formData.description} onChange={handleChange} />
                    </Grid>
                  </Grid>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, pt: 3, borderTop: '1px solid #e0e0e0' }}>
                    <Button 
                      type="button"
                      onClick={handleBackToSelection}
                      size="large"
                      sx={{ 
                        px: 4,
                        py: 1.5,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontSize: '1rem'
                      }}
                    >
                      Back to Options
                    </Button>
                    
                    <Button 
                      variant="contained"
                      type="submit"
                      disabled={isSubmitting}
                      size="large"
                      sx={{ 
                        px: 4,
                        py: 1.5,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontSize: '1rem',
                        background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #1565c0, #1976d2)'
                        }
                      }}
                    >
                      {isSubmitting ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CircularProgress size={20} color="inherit" />
                          Publishing...
                        </Box>
                      ) : (
                        'Publish Quick Job Post'
                      )}
                    </Button>
                  </Box>
                </form>
              ) : (
                /* Full Job Post Form */
                <form
                  onSubmit={handleSubmit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                    }
                  }}
                >
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h5" sx={{ 
                      mb: 1, 
                      fontWeight: 'bold',
                      color: '#1976d2',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      {getStepIcon(activeStep)}
                      {steps[activeStep]}
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                  </Box>
                  
                  {getStepContent(activeStep)}
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, pt: 3, borderTop: '1px solid #e0e0e0' }}>
                    <Button 
                      type="button"
                      onClick={activeStep === 0 ? handleBackToSelection : handleBack} 
                      size="large"
                      sx={{ 
                        px: 4,
                        py: 1.5,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontSize: '1rem'
                      }}
                    >
                      {activeStep === 0 ? 'Back to Options' : 'Previous'}
                    </Button>
                    
                    {activeStep === steps.length - 1 ? (
                      <Button 
                        variant="contained" 
                        type="submit"
                        name="publish"
                        disabled={(() => {
                          const hasCore = formData.title.trim() && formData.company_name.trim() && formData.location.trim() && formData.job_type?.trim();
                          const hasFinal = (formData.description && formData.description.trim()) && (formData.contact_email && formData.contact_email.trim());
                          return isSubmitting || !(hasCore && hasFinal);
                        })()}
                        size="large"
                        sx={{ 
                          px: 4,
                          py: 1.5,
                          borderRadius: 2,
                          textTransform: 'none',
                          fontSize: '1rem',
                          background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                          '&:hover': {
                            background: 'linear-gradient(45deg, #1565c0, #1976d2)'
                          }
                        }}
                      >
                        {isSubmitting ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CircularProgress size={20} color="inherit" />
                            Publishing...
                          </Box>
                        ) : (
                          'Publish Job'
                        )}
                      </Button>
                    ) : (
                      <Button 
                        type="button"
                        variant="contained" 
                        onClick={handleNext}
                        size="large"
                        sx={{ 
                          px: 4,
                          py: 1.5,
                          borderRadius: 2,
                          textTransform: 'none',
                          fontSize: '1rem',
                          background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                          '&:hover': {
                            background: 'linear-gradient(45deg, #1565c0, #1976d2)'
                          }
                        }}
                      >
                        Next Step
                      </Button>
                    )}
                  </Box>
                </form>
              )}
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  );
};

export default PostJob;