import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, onPostgresChangesOnce } from '../../utils/supabase';
import logger from '../../utils/logger';
import { 
  Box, 
  Button, 
  Typography, 
  Grid, 
  Container,
  Paper,
  Divider,
  TextField,
  InputAdornment,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  List,
  Chip,
} from '@mui/material';
import LoadingSpinner from '../common/LoadingSpinner';
import { 
  Event as EventIcon, 
  CalendarToday as CalendarIcon,
  Search as SearchIcon,
  Add as AddIcon,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon
} from '@mui/icons-material';
import PriorityStrip from './PriorityStrip';
import EventCard from './EventCard';
import EventRow from './EventRow';
import { utcToZonedTime } from 'date-fns-tz';
import { useAuth } from '../../contexts/AuthContext';

const EventCalendar = lazy(() => import('./EventCalendar'));

// Category options for calendar view; values must align with EventCalendar filtering.
// TODO: DRY with EventCalendar category map if we move this to a shared config.
const CALENDAR_CATEGORY_OPTIONS = [
  { label: 'All categories', value: 'all' },
  { label: 'Networking', value: 'networking' },
  { label: 'Workshop', value: 'workshop' },
  { label: 'Seminar', value: 'seminar' },
  { label: 'Reunion', value: 'reunion' },
  { label: 'Sports', value: 'sports' },
  { label: 'Cultural', value: 'cultural' },
  { label: 'Career Development', value: 'career' },
  { label: 'Technical', value: 'technical' },
  { label: 'Social', value: 'social' },
  { label: 'Jobs', value: 'jobs' },
  // Fallback buckets used by older data / calendar normalization
  { label: 'Virtual', value: 'virtual' },
  { label: 'In-Person', value: 'in-person' },
  { label: 'Other', value: 'other' },
];

const EventsList = ({ isAdmin = false, eventsOverride, titleOverride, hideCreateButton = false }) => {
  const navigate = useNavigate();
  const { hasPermission, userRole } = useAuth();
  const canCreate = hasPermission('events:create') && userRole !== 'student';
  const showCreateButton = canCreate && !hideCreateButton;
  const [events, setEvents] = useState([]);
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [calendarEvents, setCalendarEvents] = useState([]); // normalized for calendar
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('upcoming');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list' or 'calendar'
  // Category filter (shared across grid, list and calendar views)
  const [activeCategory, setActiveCategory] = useState('all');

  const handleViewModeChange = useCallback((event, newViewMode) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  }, []);

  // Removed event-type and extra filters as per requirements
  
  // Simple ref to track component mount state
  const isMountedRef = useRef(true);

  // Load up to 8 featured events for the Priority Strip
  const fetchFeaturedEvents = async () => {
    try {
      if (!isMountedRef.current) return;
      setFeaturedLoading(true);
      let q = supabase
        .from('events')
        .select('id, title, start_date, end_date, featured_image_url, is_featured')
        .eq('is_featured', true)
        .order('is_featured', { ascending: false })
        .order('start_date', { ascending: true })
        .limit(8);

      if (!isAdmin) {
        q = q.eq('is_published', true).eq('approval_status', 'approved');
      }

      const { data, error } = await q;
      if (error) throw error;
      if (!isMountedRef.current) return;
      setFeaturedEvents(data || []);
    } catch (e) {
      logger.error('Error fetching featured events:', e);
      if (isMountedRef.current) {
        setFeaturedEvents([]);
      }
    } finally {
      if (isMountedRef.current) {
        setFeaturedLoading(false);
      }
    }
  };
  
  // Handle events updates
  const handleEventsUpdate = useCallback((payload) => {
    logger.log('Real-time change received for events:', payload);
    fetchEvents();
    fetchFeaturedEvents();
  }, []);
  
  // Handle attendance updates
  const handleAttendanceUpdate = useCallback((payload) => {
    logger.log('Real-time change received for event_attendees:', payload);
    fetchEvents();
  }, []);
  
  useEffect(() => {
    isMountedRef.current = true;

    // If a fixed events list is provided, skip Supabase fetching/subscriptions here
    if (Array.isArray(eventsOverride)) {
      const base = eventsOverride || [];
      setEvents(base);

      const istZone = 'Asia/Kolkata';
      const toIST = (iso) => utcToZonedTime(new Date(iso), istZone);
      const normalizeCategory = (category, eventType) => {
        const primary = (category || '').trim().toLowerCase();
        const fallback = (eventType || '').trim().toLowerCase();
        const buckets = [
          'networking',
          'workshop',
          'seminar',
          'reunion',
          'sports',
          'cultural',
          'career',
          'technical',
          'social',
        ];
        if (buckets.includes(primary)) return primary;
        if (buckets.includes(fallback)) return fallback;
        return 'other';
      };
      const buildLocation = (ev) => {
        const isVirtual = ev.is_virtual || (ev.event_type && ev.event_type.toLowerCase() === 'virtual');
        if (isVirtual) return 'Online Event';
        const parts = [ev.venue, ev.address].filter(Boolean);
        return parts.length ? parts.join(', ') : (ev.location || 'Location not specified');
      };

      const normalizedForCalendar = base.map(ev => {
        const isVirtual = !!(ev.is_virtual || (ev.event_type && ev.event_type.toLowerCase() === 'virtual'));
        const category = normalizeCategory(ev.category, ev.event_type);
        const start = ev.start_date ? toIST(ev.start_date) : new Date();
        const end = ev.end_date ? toIST(ev.end_date) : start;
        return {
          id: ev.id,
          title: ev.title,
          start,
          end,
          allDay: false,
          resource: {
            ...ev,
            type: isVirtual ? 'virtual' : 'in-person',
            category,
            location: buildLocation(ev),
            attendees: ev.attendees_count || 0,
          }
        };
      });

      setCalendarEvents(normalizedForCalendar);
      setLoading(false);

      return () => {
        isMountedRef.current = false;
      };
    }

    fetchFeaturedEvents();

    onPostgresChangesOnce(
      'events-list',
      'events-listener',
      { event: '*', schema: 'public', table: 'events' },
      handleEventsUpdate
    );

    onPostgresChangesOnce(
      'events-attendees-list',
      'attendees-listener',
      { event: '*', schema: 'public', table: 'event_attendees' },
      handleAttendanceUpdate
    );

    onPostgresChangesOnce(
      'events-rsvps-list',
      'rsvps-listener',
      { event: '*', schema: 'public', table: 'event_rsvps' },
      handleAttendanceUpdate
    );

    return () => {
      isMountedRef.current = false;
    };
  }, [handleEventsUpdate, handleAttendanceUpdate, eventsOverride]);

  // Refetch when sort selection or admin status changes (only when not using overrides)
  useEffect(() => {
    if (Array.isArray(eventsOverride)) return;
    fetchEvents();
  }, [sortBy, isAdmin, eventsOverride]);

  const fetchEvents = async () => {
    try {
      if (!isMountedRef.current) return;
      setLoading(true);
      setError('');

      const nowIso = new Date().toISOString();
      let query = supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          category,
          start_date,
          end_date,
          featured_image_url,
          is_virtual,
          event_type,
          venue,
          address,
          location,
          is_published,
          approval_status
        `);

      // Role gating (same for everyone except admins)
      if (!isAdmin) {
        query = query.eq('is_published', true).eq('approval_status', 'approved');
      }

      // Apply sort/filter mode
      if (sortBy === 'upcoming') {
        query = query
          .gt('start_date', nowIso)
          .order('start_date', { ascending: true });
      } else if (sortBy === 'closed') {
        // Closed if already ended, OR (no end_date AND start_date < now)
        query = query
          .or(`end_date.lt.${nowIso},and(end_date.is.null,start_date.lt.${nowIso})`)
          .order('end_date', { ascending: false, nullsFirst: true })
          .order('start_date', { ascending: false }); // tie-breaker
      } else {
        // oldest
        query = query.order('start_date', { ascending: true });
      }

      query = query.limit(500);

      const { data: eventsData, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      if (eventsData?.length) {
        const eventIds = eventsData.map(e => e.id);

        // Optional RPC-based counts
        let counts = {};
        try {
          const { data: rpcCounts, error: rpcErr } =
            await supabase.rpc('get_event_attendance_counts', { p_event_ids: eventIds });
          if (rpcErr) throw rpcErr;
          if (Array.isArray(rpcCounts)) {
            counts = rpcCounts.reduce((acc, r) => {
              acc[r.event_id] = r.total_attendees || 0;
              return acc;
            }, {});
          }
        } catch (e) {
          logger.warn('Counts RPC not available:', e?.message || e);
        }

        // Fallback: RSVPs
        try {
          const { data: rsvpData } = await supabase
            .from('event_rsvps')
            .select('event_id, attendance_status')
            .in('event_id', eventIds);

          if (Array.isArray(rsvpData)) {
            const goingSet = new Set(['going','attending','checked_in','attended']);
            const rsvpCounts = rsvpData.reduce((acc, r) => {
              const st = (r.attendance_status || '').toLowerCase();
              if (goingSet.has(st)) acc[r.event_id] = (acc[r.event_id] || 0) + 1;
              return acc;
            }, {});
            for (const id of eventIds) counts[id] = Math.max(counts[id] || 0, rsvpCounts[id] || 0);
          }
        } catch (e) {
          logger.warn('RSVP counts fallback failed:', e?.message || e);
        }

        // Fallback: attendees table
        try {
          const { data: attData } = await supabase
            .from('event_attendees')
            .select('event_id, attendance_status')
            .in('event_id', eventIds);

          if (Array.isArray(attData)) {
            const goingSet = new Set(['going','attending','checked_in','attended']);
            const attCounts = attData.reduce((acc, r) => {
              const st = (r.attendance_status || '').toLowerCase();
              if (goingSet.has(st)) acc[r.event_id] = (acc[r.event_id] || 0) + 1;
              return acc;
            }, {});
            for (const id of eventIds) counts[id] = Math.max(counts[id] || 0, attCounts[id] || 0);
          }
        } catch (e) {
          logger.warn('Attendees table fallback failed:', e?.message || e);
        }

        const eventsWithCounts = eventsData.map(ev => ({
          ...ev,
          attendees_count: counts[ev.id] || 0,
        }));

        // Calendar normalization (unchanged)
        const istZone = 'Asia/Kolkata';
        const normalizeCategory = (category, eventType) => {
          const primary = (category || '').trim().toLowerCase();
          const fallback = (eventType || '').trim().toLowerCase();
          const buckets = [
            'networking',
            'workshop',
            'seminar',
            'reunion',
            'sports',
            'cultural',
            'career',
            'technical',
            'social',
          ];
          if (buckets.includes(primary)) return primary;
          if (buckets.includes(fallback)) return fallback;
          return 'other';
        };
        const buildLocation = (ev) => {
          const isVirtual = ev.is_virtual || (ev.event_type && ev.event_type.toLowerCase() === 'virtual');
          if (isVirtual) return 'Online Event';
          const parts = [ev.venue, ev.address].filter(Boolean);
          return parts.length ? parts.join(', ') : (ev.location || 'Location not specified');
        };
        const toIST = (iso) => utcToZonedTime(new Date(iso), istZone);

        const normalizedForCalendar = eventsWithCounts.map(ev => {
          const isVirtual = !!(ev.is_virtual || (ev.event_type && ev.event_type.toLowerCase() === 'virtual'));
          const category = normalizeCategory(ev.category, ev.event_type);
          const start = toIST(ev.start_date);
          const end = toIST(ev.end_date || ev.start_date);
          return {
            id: ev.id,
            title: ev.title,
            start,
            end,
            allDay: false,
            resource: {
              ...ev,
              type: isVirtual ? 'virtual' : 'in-person',
              category,
              location: buildLocation(ev),
              attendees: ev.attendees_count || 0,
            }
          };
        });

        if (!isMountedRef.current) return;
        setEvents(eventsWithCounts);
        setCalendarEvents(normalizedForCalendar);
      } else {
        if (!isMountedRef.current) return;
        setEvents([]);
        setCalendarEvents([]);
      }
    } catch (err) {
      logger.error('Error fetching events:', err);
      if (isMountedRef.current) {
        setError('Failed to load events');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Process events with attendee counts for rendering
  const processEventsWithCounts = (eventsData) => {
    return eventsData.map(ev => ({
      ...ev,
      attendeesCount: ev.attendees_count || 0
    }));
  };

  // Filter and sort events for display
  const processedEvents = useMemo(() => {
    const q = searchTerm.toLowerCase();

    const filtered = events.filter(ev => {
      const matchesSearch = !q
        || ev.title?.toLowerCase().includes(q)
        || ev.description?.toLowerCase().includes(q)
        || ev.venue?.toLowerCase().includes(q)
        || ev.address?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (activeCategory === 'all') return true;

      const normalizedCategory = (ev.category || ev.event_type || '').toString().trim().toLowerCase();

      if (activeCategory === 'virtual') {
        return !!(ev.is_virtual || (ev.event_type && ev.event_type.toLowerCase() === 'virtual'));
      }
      if (activeCategory === 'in-person') {
        return !ev.is_virtual && (!ev.event_type || ev.event_type.toLowerCase() !== 'virtual');
      }

      return normalizedCategory === activeCategory;
    });

    const sorted = filtered.sort((a, b) => {
      if (sortBy === 'upcoming' || sortBy === 'oldest') {
        return new Date(a.start_date) - new Date(b.start_date);
      }
      // Closed: newest closed first; use end_date || start_date as the effective end
      const aEnd = new Date(a.end_date || a.start_date);
      const bEnd = new Date(b.end_date || b.start_date);
      return bEnd - aEnd;
    });

    return processEventsWithCounts(sorted);
  }, [events, searchTerm, sortBy, activeCategory]);

  if (loading) {
    return <LoadingSpinner message="Loading events..." />;
  }

  if (error) {
    return (
      <Paper elevation={0} sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
        <Button onClick={fetchEvents} variant="outlined" sx={{ mt: 2 }}>
          Retry
        </Button>
      </Paper>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          {titleOverride || 'Events'}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            aria-label="view mode"
          >
            <ToggleButton value="grid" aria-label="grid view">
              <ViewModuleIcon />
            </ToggleButton>
            <ToggleButton value="list" aria-label="list view">
              <ViewListIcon />
            </ToggleButton>
            <ToggleButton value="calendar" aria-label="calendar view">
              <CalendarIcon />
            </ToggleButton>
          </ToggleButtonGroup>
          {showCreateButton && (
            <Button
              onClick={() => navigate('/events/new')}
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
            >
              Create Event
            </Button>
          )}
        </Box>
      </Box>

      {/* Priority Strip */}
      <PriorityStrip events={featuredEvents} loading={featuredLoading} />

      {/* Filter and Search Controls */}
      <Paper elevation={0} sx={{ p: 2, mb: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search events by title, description, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="events-category-filter-label">Category</InputLabel>
              <Select
                labelId="events-category-filter-label"
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                label="Category"
              >
                {CALENDAR_CATEGORY_OPTIONS.filter((opt) => !['virtual','in-person'].includes(opt.value)).map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                label="Sort By"
              >
                <MenuItem value="oldest">By Oldest</MenuItem>
                <MenuItem value="upcoming">By Upcoming</MenuItem>
                <MenuItem value="closed">Closed/Expired Events</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Calendar: category chips for quick filter */}
        {viewMode === 'calendar' && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mr: 1 }}>
                Quick category filter
              </Typography>
              <Button
                size="small"
                variant="text"
                color="primary"
                onClick={() => setActiveCategory('all')}
              >
                Clear category
              </Button>
            </Box>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                maxHeight: { xs: '120px', sm: 'none' },
                overflowY: { xs: 'auto', sm: 'visible' },
                pb: 0.5,
              }}
            >
              {CALENDAR_CATEGORY_OPTIONS.map((category) => (
                <Chip
                  key={category.value}
                  label={category.label}
                  size="small"
                  onClick={() => setActiveCategory(category.value)}
                  color={activeCategory === category.value ? 'primary' : 'default'}
                  variant={activeCategory === category.value ? 'filled' : 'outlined'}
                />
              ))}
            </Box>
          </Box>
        )}
      </Paper>

      {processedEvents.length === 0 ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center' }}>
          <EventIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No events found
          </Typography>
          <Typography color="textSecondary" paragraph>
            {searchTerm ? 'Try adjusting your search'
              : 'Check back later for events'}
          </Typography>
          {searchTerm && (
            <Button 
              variant="outlined" 
              color="primary"
              onClick={() => setSearchTerm('')}
            >
              Clear all filters
            </Button>
          )}
        </Paper>
      ) : (
        <Box>
          {/* Grid View */}
          {viewMode === 'grid' && (
            <Grid container spacing={3}>
              {processedEvents.map((event) => (
                <Grid item xs={12} sm={6} md={4} key={event.id}>
                  <EventCard
                    event={event}
                    isAdmin={isAdmin}
                    attendeesCount={event.attendeesCount}
                    onNavigateToDetail={(id) => navigate(`/events/${id}`)}
                    onNavigateToEdit={(id) => navigate(`/events/${id}/edit`)}
                  />
                </Grid>
              ))}
            </Grid>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <List disablePadding>
                {processedEvents.map((event, index) => (
                  <React.Fragment key={event.id}>
                    <EventRow
                      event={event}
                      isAdmin={isAdmin}
                      attendeesCount={event.attendeesCount}
                      onNavigateToDetail={(id) => navigate(`/events/${id}`)}
                      onNavigateToEdit={(id) => navigate(`/events/${id}/edit`)}
                    />
                    {index < processedEvents.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )}

          {/* Calendar View */}
          {viewMode === 'calendar' && (
            <Suspense
              fallback={
                <Paper elevation={0} sx={{ p: 3, textAlign: 'center' }}>
                  <LoadingSpinner message="Loading calendar..." />
                </Paper>
              }
            >
              <EventCalendar 
                events={calendarEvents} 
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
              />
            </Suspense>
          )}
        </Box>
      )}
    </Container>
  );
};

export default EventsList;
