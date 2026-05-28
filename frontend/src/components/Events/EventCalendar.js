import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { useNavigate } from 'react-router-dom';
import logger from '../../utils/logger';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
// Calendar-specific overrides to align react-big-calendar overlay with MUI Paper look
import './EventCalendarOverrides.css';
import { 
  Paper, 
  Box, 
  Typography, 
  Button, 
  Grid,
  ButtonGroup,
  IconButton,
  Tooltip,
  Collapse,
  useTheme
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  LocationOn as LocationOnIcon,
  People as PeopleIcon,
  Public as PublicIcon
} from '@mui/icons-material';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const EventCalendar = ({ events, activeCategory = 'all', onCategoryChange }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [legendOpen, setLegendOpen] = useState(false);

  const formatLocation = (venue, address) => {
    if (venue && venue.toLowerCase() === 'online') return 'Online Event';
    if (venue && address) return `${venue}, ${address}`;
    return venue || address || 'Location not specified';
  };

  const eventTypeColors = {
    workshop: theme.palette.success.main,
    conference: theme.palette.primary.main,
    networking: theme.palette.secondary.main,
    seminar: theme.palette.warning.main,
    webinar: theme.palette.info.main,
    social: theme.palette.error.main,
    other: theme.palette.grey[500],
  };

  const categories = [
    { label: 'All', value: 'all', color: theme.palette.grey[700] },
    { label: 'Virtual', value: 'virtual', color: theme.palette.info.dark },
    { label: 'In-Person', value: 'in-person', color: theme.palette.success.dark },
    ...Object.keys(eventTypeColors).map(type => ({
      label: type.charAt(0).toUpperCase() + type.slice(1),
      value: type,
      color: eventTypeColors[type],
    })),
  ];

  // Accept pre-normalized calendar events from container
  const baseEvents = useMemo(() => Array.isArray(events) ? events : [], [events]);

  // Filter events based on active category from parent (EventsList)
  useEffect(() => {
    if (activeCategory === 'all') {
      setFilteredEvents(baseEvents);
    } else if (activeCategory === 'virtual' || activeCategory === 'in-person') {
      setFilteredEvents(baseEvents.filter(e => e.resource?.type === activeCategory));
    } else {
      setFilteredEvents(baseEvents.filter(e => e.resource?.category === activeCategory));
    }
  }, [baseEvents, activeCategory]);

  const handleNavigate = (newDate) => {
    setDate(newDate);
  };

  const handleView = (newView) => {
    setView(newView);
  };

  const handleSelectEvent = (event) => {
    const targetId = event?.id || event?.resource?.id;
    if (targetId) navigate(`/events/${targetId}`);
  };

  // Custom styling for events based on their category
  const eventStyleGetter = (event) => {
    let backgroundColor = theme.palette.primary.main; // Default color
    
    const category = categories.find(c => c.value === event.resource.category);
    if (category) {
      backgroundColor = category.color;
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
        transition: 'all 0.2s ease',
      }
    };
  };

  // Custom event component
  const EventComponent = ({ event }) => (
    <Tooltip title={`${event.title} - ${event.resource.location}`}>
      <Box sx={{ p: 0.5, overflow: 'hidden' }}>
        <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
          {event.title}
        </Typography>
        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', fontSize: '0.7rem' }}>
          {event.resource.type === 'virtual' ? 
            <PublicIcon fontSize="inherit" sx={{ mr: 0.5 }} /> : 
            <LocationOnIcon fontSize="inherit" sx={{ mr: 0.5 }} />}
          <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {event.resource.location}
          </span>
        </Typography>
      </Box>
    </Tooltip>
  );

  // Handle navigation errors by wrapping the default navigation with error handling
  const handleSafeNavigate = (action) => {
    try {
      if (action === 'PREV') {
        // Move back one unit (month/week/day depending on current view)
        const newDate = new Date(date);
        if (view === 'month') {
          newDate.setMonth(date.getMonth() - 1);
        } else if (view === 'week') {
          newDate.setDate(date.getDate() - 7);
        } else if (view === 'day') {
          newDate.setDate(date.getDate() - 1);
        }
        setDate(newDate);
      } else if (action === 'NEXT') {
        // Move forward one unit
        const newDate = new Date(date);
        if (view === 'month') {
          newDate.setMonth(date.getMonth() + 1);
        } else if (view === 'week') {
          newDate.setDate(date.getDate() + 7);
        } else if (view === 'day') {
          newDate.setDate(date.getDate() + 1);
        }
        setDate(newDate);
      } else if (action === 'TODAY') {
        // Return to today
        setDate(new Date());
      }
    } catch (e) {
      logger.error('Error in calendar navigation:', e);
      // Fallback to today's date if there's an error
      setDate(new Date());
    }
  };
  
  // Custom toolbar component with improved responsiveness
  const CustomToolbar = ({ label, onView, view }) => (
    <Box role="toolbar" aria-label="Calendar toolbar" sx={{ 
      display: 'flex', 
      flexDirection: { xs: 'column', md: 'row' }, 
      justifyContent: 'space-between', 
      alignItems: { xs: 'flex-start', md: 'center' },
      mb: 2,
      gap: 2,
      position: 'relative',
      zIndex: 1
    }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        gap: 1,
        width: { xs: '100%', md: 'auto' }
      }}>
        <Typography variant="h6" component="span" sx={{ mb: { xs: 1, sm: 0 }}}>
          {label}
        </Typography>
        <ButtonGroup 
          size="small" 
          variant="outlined"
          role="group"
          aria-label="Calendar navigation"
          sx={{ 
            ml: { sm: 2 },
            width: { xs: '100%', sm: 'auto' }
          }}
        >
          <Tooltip title="Previous">
            <IconButton onClick={() => handleSafeNavigate('PREV')} aria-label="Previous">
              <ChevronLeftIcon />
            </IconButton>
          </Tooltip>
          <Button 
            onClick={() => handleSafeNavigate('TODAY')}
            sx={{ 
              px: 2,
              flexGrow: { xs: 1, sm: 0 }
            }}
          >
            Today
          </Button>
          <Tooltip title="Next">
            <IconButton onClick={() => handleSafeNavigate('NEXT')} aria-label="Next">
              <ChevronRightIcon />
            </IconButton>
          </Tooltip>
        </ButtonGroup>
      </Box>
      
      <Box sx={{ 
        width: { xs: '100%', md: 'auto' },
        overflowX: { xs: 'auto', md: 'visible' },
        pb: { xs: 1, md: 0 }
      }}>
        <ButtonGroup 
          size="small" 
          variant="outlined"
          role="group"
          aria-label="Change calendar view"
          sx={{ 
            width: { xs: '100%', sm: 'auto' },
            '& .MuiButton-root': {
              flex: { xs: 1, sm: 'inherit' }
            }
          }}
        >
          {['month', 'week', 'day'].map(viewName => (
            <Button 
              key={viewName}
              onClick={() => onView(viewName)}
              variant={view === viewName ? 'contained' : 'outlined'}
              color={view === viewName ? 'primary' : 'inherit'}
              aria-label={`${viewName} view`}
              aria-pressed={view === viewName}
            >
              {viewName.charAt(0).toUpperCase() + viewName.slice(1)}
            </Button>
          ))}
        </ButtonGroup>
      </Box>
    </Box>
  );

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, md: 2 },
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <Box sx={{ position: 'relative', pointerEvents: 'auto' }}>
        <Calendar
            localizer={localizer}
            events={filteredEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ 
              height: 'clamp(420px, 80vh, 720px)',
            }}
            date={date}
            view={view}
            views={['month','week','day']}
            onNavigate={date => setDate(date)}
            onView={handleView}
            onDoubleClickEvent={handleSelectEvent}
            eventPropGetter={eventStyleGetter}
            components={{
              event: EventComponent,
              toolbar: CustomToolbar
            }}
            onSelectEvent={handleSelectEvent}
            popup
            formats={{
              timeGutterFormat: 'HH:mm',
              eventTimeRangeFormat: ({start, end}) => {
                return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
              },
              dayHeaderFormat: (date) => {
                // More compact format on small screens
                const isMobile = window.innerWidth < 600;
                return format(date, isMobile ? 'MMM d' : 'EEEE, MMMM d');
              }
            }}
            messages={{
              today: 'Today',
              previous: 'Back',
              next: 'Next',
              month: 'Month',
              week: 'Week', 
              day: 'Day',
              date: 'Date',
              time: 'Time',
              event: 'Event',
              noEventsInRange: 'No events in this range.'
            }}
        />
      </Box>

      {/* Compact stats row below calendar */}
      <Box sx={{ mt: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Box sx={{ p: 1.5, borderRadius: 2, textAlign: 'center' }}>
              <CalendarIcon sx={{ fontSize: 32, color: 'primary.main', mb: 0.5 }} />
              <Typography variant="h5" color="primary.main">{filteredEvents.length}</Typography>
              <Typography variant="body2" color="text.secondary">Total Events</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ p: 1.5, borderRadius: 2, textAlign: 'center' }}>
              <PeopleIcon sx={{ fontSize: 32, color: 'success.main', mb: 0.5 }} />
              <Typography variant="h5" color="success.main">
                {filteredEvents.reduce((sum, event) => sum + (event.resource?.attendees || 0), 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">Total Attendees</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ p: 1.5, borderRadius: 2, textAlign: 'center' }}>
              <PublicIcon sx={{ fontSize: 32, color: 'info.main', mb: 0.5 }} />
              <Typography variant="h5" color="info.main">
                {filteredEvents.filter(e => e.resource?.type === 'virtual').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">Virtual Events</Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Collapsible legend for category colors */}
      <Box sx={{ mt: 1.5 }}>
        <Button
          size="small"
          variant="text"
          color="primary"
          onClick={() => setLegendOpen((open) => !open)}
        >
          {legendOpen ? 'Hide category legend ▲' : 'Show category legend ▼'}
        </Button>
        <Collapse in={legendOpen} timeout="auto" unmountOnExit>
          <Box sx={{ mt: 1.5 }}>
            <Grid container spacing={2}>
              {categories.filter(c => c.value !== 'all').map((category) => (
                <Grid item xs={6} sm={4} md={3} lg={2} key={category.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 16, height: 16, borderRadius: 1, bgcolor: category.color }} />
                    <Typography variant="body2">{category.label}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Collapse>
      </Box>
    </Paper>
  );
};

export default EventCalendar;