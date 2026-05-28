import React, { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  IconButton,
  Skeleton,
  Typography
} from '@mui/material';
import ImageWithFallback from '../common/ImageWithFallback';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { parseISO, format } from 'date-fns';

function statusFromDates(startISO, endISO) {
  const now = new Date();
  const start = new Date(startISO);
  const end = new Date(endISO || startISO);
  if (now < start) return 'Upcoming';
  if (now > end) return 'Closed';
  return 'Ongoing';
}

export default function PriorityStrip({ events = [], loading = false }) {
  const trackRef = useRef(null);
  const hasEvents = (events || []).length > 0;

  const content = useMemo(() => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} sx={{ minWidth: 240, borderRadius: 2 }}>
              <Skeleton variant="rectangular" height={120} />
              <Box sx={{ p: 2 }}>
                <Skeleton width="60%" />
                <Skeleton width="40%" />
              </Box>
            </Card>
          ))}
        </Box>
      );
    }
    if (!hasEvents) return null;

    return (
      <Box sx={{ position: 'relative' }}>
        <Box
          ref={trackRef}
          sx={{
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            scrollBehavior: 'smooth',
            pb: 1,
          }}
        >
          {events.slice(0, 8).map(ev => (
            <Card key={ev.id} sx={{ minWidth: { xs: 200, sm: 240, md: 260 }, borderRadius: 2, flex: '0 0 auto' }}>
              <CardActionArea component={Link} to={`/events/${ev.id}`}>
                <Box sx={{ height: { xs: 120, sm: 140 } }}>
                  <ImageWithFallback
                    src={ev.featured_image_url}
                    alt={ev.title}
                    className="w-full h-full"
                    placeholderSrc="/default-avatar.svg"
                    emptyMessage="Event image to be uploaded"
                  />
                </Box>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Chip label="Priority" size="small" color="warning" />
                    <Chip label={statusFromDates(ev.start_date, ev.end_date)} size="small" />
                  </Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {format(parseISO(ev.start_date), 'MMM d, yyyy')}
                  </Typography>
                  <Typography variant="h6" noWrap title={ev.title}>
                    {ev.title}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
        {/* Desktop scroll arrows */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, position: 'absolute', inset: 0, pointerEvents: 'none', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton size="small" sx={{ pointerEvents: 'auto', bgcolor: 'background.paper', ml: -1, '&:hover': { bgcolor: 'background.paper' } }} onClick={() => { if (trackRef.current) trackRef.current.scrollLeft -= 280; }}>
            <ChevronLeft />
          </IconButton>
          <IconButton size="small" sx={{ pointerEvents: 'auto', bgcolor: 'background.paper', mr: -1, '&:hover': { bgcolor: 'background.paper' } }} onClick={() => { if (trackRef.current) trackRef.current.scrollLeft += 280; }}>
            <ChevronRight />
          </IconButton>
        </Box>
      </Box>
    );
  }, [events, loading]);

  if (!loading && !hasEvents) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
        Priority
      </Typography>
      {content}
    </Box>
  );
}
