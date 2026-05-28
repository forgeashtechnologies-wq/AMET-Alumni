// DEPRECATED: Legacy MUI create-event form, not used in current routing.
// Do not import or use this component without consulting the maintainer.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { mergeAndConvertToUTC } from '../../utils/timezone';
import { getFriendlyErrorMessage } from '../../utils/errors';

const CreateEventForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    short_description: '',
    organizer_name: '',
    organizer_email: '',
    organizer_phone: '',
    category: '',
    event_type: 'workshop',
    tags: [],
    venue_name: '',
    address: '',
    location: '',
    is_virtual: false,
    virtual_link: '',
    start_date: new Date(),
    start_time: new Date(),
    end_date: new Date(new Date().setDate(new Date().getDate() + 1)),
    end_time: new Date(new Date().setHours(new Date().getHours() + 2)),
    max_attendees: 100,
    is_public: true,
    registration_required: true,
    registration_deadline: new Date(new Date().setDate(new Date().getDate() + 7)),
    cover_image_url: '',
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

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    if (name === 'tags') {
      setFormData(prev => ({ ...prev, tags: value.split(',').map(tag => tag.trim()) }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleDateChange = (name) => (date) => {
    setFormData(prev => ({
      ...prev,
      [name]: date
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('You must be logged in to create an event.');

      // Use the timezone utility to merge date/time and convert to UTC
      const startDateUTC = mergeAndConvertToUTC(formData.start_date, formData.start_time);
      const endDateUTC = mergeAndConvertToUTC(formData.end_date, formData.end_time);
      // Registration deadline only has a date part, so we pass it for both arguments to set time to midnight.
      const registrationDeadlineUTC = formData.registration_deadline ? mergeAndConvertToUTC(formData.registration_deadline, new Date(0)) : null;

      const eventData = {
        ...formData,
        start_date: startDateUTC,
        end_date: endDateUTC,
        registration_deadline: registrationDeadlineUTC,
        organizer_id: user.id,
        creator_id: user.id,
        created_by: user.id,
        tags: Array.isArray(formData.tags) ? formData.tags : formData.tags.split(',').map(t => t.trim()),
      };

      // Remove frontend-only state properties that are not in the DB schema
      delete eventData.start_time;
      delete eventData.end_time;
      delete eventData.location;

      const finalEventData = eventData;

      // Align field names with DB schema
      if (finalEventData.venue_name) {
        finalEventData.venue = finalEventData.venue_name;
        delete finalEventData.venue_name;
      }

      const { data, error: insertError } = await supabase
        .rpc('create_new_event', { p_event: finalEventData });

      if (insertError) throw insertError;

      setSuccess('Event created successfully!');
      setTimeout(() => navigate(`/events/${data?.id || ''}`), 1500);
    } catch (err) {
      logger.error('Error creating event:', err);
      setError(getFriendlyErrorMessage(err, 'Unable to create event. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper elevation={3} sx={{ p: 4, maxWidth: 800, mx: 'auto', my: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Create New Event
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

            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Organizer Information</Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                required
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
                required
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

            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Event Details</Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Short Description"
                name="short_description"
                value={formData.short_description}
                onChange={handleChange}
                variant="outlined"
                helperText="A brief, catchy summary for event listings."
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                variant="outlined"
                helperText="e.g., Technology, Healthcare, Arts"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Tags"
                name="tags"
                value={formData.tags.join(', ')}
                onChange={handleChange}
                variant="outlined"
                helperText="Comma-separated keywords, e.g., AI, Startups, Design"
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
                fullWidth
                label="Venue Name"
                name="venue_name"
                value={formData.venue_name}
                onChange={handleChange}
                variant="outlined"
                placeholder="e.g., Grand Hyatt Hotel"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                variant="outlined"
                placeholder="Street, City, State, Zip Code"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.is_virtual}
                    onChange={handleChange}
                    name="is_virtual"
                  />
                }
                label="This is a virtual event"
              />
            </Grid>

            {formData.is_virtual && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Virtual Link"
                  name="virtual_link"
                  value={formData.virtual_link}
                  onChange={handleChange}
                  variant="outlined"
                  placeholder="e.g., Zoom, Google Meet link"
                />
              </Grid>
            )}

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
              <TextField
                fullWidth
                type="number"
                label="Maximum Attendees"
                name="max_attendees"
                value={formData.max_attendees}
                onChange={handleChange}
                variant="outlined"
                inputProps={{ min: 1 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <DatePicker
                label="Registration Deadline"
                value={formData.registration_deadline}
                onChange={handleDateChange('registration_deadline')}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>

            <Grid item xs={12}>
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

            <Grid item xs={12}>
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

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Cover Image URL"
                name="cover_image_url"
                value={formData.cover_image_url}
                onChange={handleChange}
                variant="outlined"
                helperText="URL for the main event image."
              />
            </Grid>

            <Grid item xs={12} sx={{ mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={loading}
                fullWidth
              >
                {loading ? 'Creating Event...' : 'Create Event'}
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

export default CreateEventForm;
