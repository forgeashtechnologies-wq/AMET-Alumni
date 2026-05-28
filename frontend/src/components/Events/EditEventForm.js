// DEPRECATED: Legacy MUI edit-event form, not used in current routing.
// Do not import or use this component without consulting the maintainer.
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Paper, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  FormHelperText,
  Grid,
  FormControlLabel,
  Checkbox,
  Snackbar,
  Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { parseISO } from 'date-fns';
import { formatInIST, mergeAndConvertToUTC, convertToUTCFromIST, displayIST } from '../../utils/timezone';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import { getFriendlyErrorMessage } from '../../utils/errors';

const EditEventForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '', // UI textarea bound to DB long_description
    event_type: 'workshop',
    start_date: new Date(),
    end_date: new Date(new Date().setHours(new Date().getHours() + 2)),
    location: '',
    max_attendees: 100,
    is_public: true,
    registration_required: true,
    registration_deadline: new Date(new Date().setDate(new Date().getDate() + 7)),
    additional_info: '',
    organizer_name: '',
    organizer_email: '',
    organizer_phone: ''
  });

  const eventTypes = [
    'workshop',
    'conference',
    'networking',
    'seminar',
    'webinar',
    'social',
    'other'
  ];

  useEffect(() => {
    if (!isAdmin) {
      navigate('/events', { replace: true, state: { error: 'You do not have permission to edit events' } });
      return;
    }
    
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error('Event not found');

        // Convert string dates to Date objects
        setFormData({
          ...data,
          // Ensure the textarea shows the long description if present
          description: data.long_description ?? data.description ?? '',
          organizer_name: data.organizer_name || '',
          organizer_email: data.organizer_email || '',
          organizer_phone: data.organizer_phone || '',
          start_date: parseISO(data.start_date),
          end_date: parseISO(data.end_date),
          registration_deadline: data.registration_deadline ? parseISO(data.registration_deadline) : null
        });
      } catch (err) {
        logger.error('Error fetching event:', err);
        setError(getFriendlyErrorMessage(err, 'Failed to load event'));
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id, isAdmin, navigate]);

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDateChange = (name) => (date) => {
    setFormData(prev => ({
      ...prev,
      [name]: date
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Use mergeAndConvertToUTC directly with Date objects
      // Since we're using DatePicker and TimePicker on the same field,
      // formData.start_date already includes both date and time
      const startUtc = mergeAndConvertToUTC(formData.start_date, formData.start_date);
      const endUtc = mergeAndConvertToUTC(formData.end_date, formData.end_date);
      const registrationDeadlineUTC = formData.registration_deadline ? 
        mergeAndConvertToUTC(formData.registration_deadline, formData.registration_deadline) : null;

      const { error: updateError } = await supabase
        .from('events')
        .update({
          title: formData.title,
          // Map UI description to DB long_description to match audit doc
          long_description: formData.description,
          event_type: formData.event_type,
          start_date: startUtc,
          end_date: endUtc,
          location: formData.location,
          max_attendees: formData.max_attendees,
          is_public: formData.is_public,
          registration_required: formData.registration_required,
          registration_deadline: registrationDeadlineUTC,
          additional_info: formData.additional_info,
          featured_image_url: formData.featured_image_url,
          organizer_name: formData.organizer_name,
          organizer_email: formData.organizer_email,
          organizer_phone: formData.organizer_phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;

      setSuccess('Event updated successfully!');
      setTimeout(() => navigate(`/events/${id}`), 1500);
    } catch (err) {
      logger.error('Error updating event:', err);
      setError(getFriendlyErrorMessage(err, 'Failed to update event'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <LoadingSpinner message="Loading event details..." />
    );
  }

  if (error) {
    return (
      <Paper elevation={0} sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error" gutterBottom>{error}</Typography>
        <Button 
          variant="outlined" 
          onClick={() => window.location.reload()}
          sx={{ mt: 2 }}
        >
          Try Again
        </Button>
      </Paper>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper elevation={3} sx={{ p: 4, maxWidth: 800, mx: 'auto', my: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Edit Event
        </Typography>
        
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Event Title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                variant="outlined"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                multiline
                rows={4}
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Organizer Name"
                name="organizer_name"
                value={formData.organizer_name}
                onChange={handleChange}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Organizer Email"
                name="organizer_email"
                type="email"
                value={formData.organizer_email}
                onChange={handleChange}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Organizer Phone"
                name="organizer_phone"
                value={formData.organizer_phone}
                onChange={handleChange}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Event Type</InputLabel>
                <Select
                  name="event_type"
                  value={formData.event_type}
                  onChange={handleChange}
                  label="Event Type"
                >
                  {eventTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                label="Location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                variant="outlined"
                placeholder="Physical location or online meeting link"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <DatePicker
                label="Start Date"
                value={formData.start_date}
                onChange={handleDateChange('start_date')}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TimePicker
                label="Start Time"
                value={formData.start_date}
                onChange={handleDateChange('start_date')}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <DatePicker
                label="End Date"
                value={formData.end_date}
                onChange={handleDateChange('end_date')}
                minDate={formData.start_date}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TimePicker
                label="End Time"
                value={formData.end_date}
                onChange={handleDateChange('end_date')}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <DatePicker
                label="Registration Deadline"
                value={formData.registration_deadline}
                onChange={handleDateChange('registration_deadline')}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    fullWidth 
                    helperText="Leave empty if registration is always open"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Maximum Attendees"
                name="max_attendees"
                value={formData.max_attendees}
                onChange={handleChange}
                variant="outlined"
                inputProps={{ min: 1 }}
                helperText="Leave empty for unlimited attendees"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Additional Information"
                name="additional_info"
                value={formData.additional_info || ''}
                onChange={handleChange}
                variant="outlined"
                helperText="Any extra details, requirements, or special instructions for attendees"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.is_public}
                    onChange={handleChange}
                    name="is_public"
                    color="primary"
                  />
                }
                label="Public Event (visible to everyone)"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.registration_required}
                    onChange={handleChange}
                    name="registration_required"
                    color="primary"
                  />
                }
                label="Requires Registration"
              />
            </Grid>

            <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => navigate(-1)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Update Event'}
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Success/Error Messages */}
        <Snackbar 
          open={!!success} 
          autoHideDuration={6000} 
          onClose={() => setSuccess('')}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setSuccess('')} severity="success" sx={{ width: '100%' }}>
            {success}
          </Alert>
        </Snackbar>

        <Snackbar 
          open={!!error} 
          autoHideDuration={6000} 
          onClose={() => setError('')}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
      </Paper>
    </LocalizationProvider>
  );
};

export default EditEventForm;
