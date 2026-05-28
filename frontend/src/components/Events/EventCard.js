import React from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import ImageWithFallback from '../common/ImageWithFallback';
import { parseISO, format } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { computeEventTimelineFlags } from '../../utils/eventsStatus';

/**
 * EventCard Component - Grid view representation of an event
 * 
 * Displays event information in a card layout with:
 * - Featured image strip
 * - Title with optional admin edit button
 * - Status and format chips
 * - Date/time and location metadata
 * - Attendee count and primary CTA
 * 
 * @param {Object} props
 * @param {Object} props.event - Event data from Supabase
 * @param {boolean} props.isAdmin - Whether current user is admin
 * @param {number} props.attendeesCount - Number of attendees
 * @param {Function} props.onNavigateToDetail - Callback to navigate to event detail
 * @param {Function} props.onNavigateToEdit - Callback to navigate to event edit (admin only)
 */
const EventCard = ({ 
  event, 
  isAdmin = false, 
  attendeesCount = 0,
  onNavigateToDetail,
  onNavigateToEdit
}) => {
  // Compute event status
  const { statusLabel } = computeEventTimelineFlags(event);
  
  // Status color mapping
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'happening now':
        return 'success';
      case 'upcoming':
        return 'info';
      case 'past':
        return 'default';
      default:
        return 'primary';
    }
  };
  
  // Approval status for admin
  const getApprovalChipProps = (approvalStatus, isPublished) => {
    if (!isPublished) {
      return { label: 'Draft', color: 'warning' };
    }
    switch ((approvalStatus || '').toLowerCase()) {
      case 'approved':
        return { label: 'Approved', color: 'success' };
      case 'pending':
        return { label: 'Pending', color: 'warning' };
      case 'rejected':
        return { label: 'Rejected', color: 'error' };
      default:
        return null;
    }
  };
  
  // Format location for display
  const formatLocationShort = (venue, address, eventType) => {
    if (eventType === 'virtual') return 'Online Event';
    if (venue && venue.toLowerCase() === 'online') return 'Online Event';
    
    let city = '';
    if (address) {
      const parts = address.split(',').map(p => p.trim());
      city = parts.length > 1 ? parts[parts.length - 2] || parts[parts.length - 1] : parts[0];
    }
    
    const shortVenue = venue ? (venue.length > 20 ? venue.substring(0, 20) + '...' : venue) : '';
    
    if (city && shortVenue) return `${city} · ${shortVenue}`;
    if (city) return city;
    if (shortVenue) return shortVenue;
    return eventType === 'hybrid' ? 'Hybrid Event' : 'Location TBD';
  };
  
  const formatLocation = (venue, address, eventType) => {
    if (eventType === 'virtual') return 'Online Event';
    if (venue && venue.toLowerCase() === 'online') return 'Online Event';
    if (venue && address) return `${venue}, ${address}`;
    return venue || address || (eventType === 'hybrid' ? 'Hybrid Event' : 'Location not specified');
  };
  
  // Derived data
  const statusColor = getStatusColor(statusLabel);
  const approvalProps = isAdmin ? getApprovalChipProps(event.approval_status, event.is_published) : null;
  
  // Format date/time in IST
  const istZone = 'Asia/Kolkata';
  const startDateIST = utcToZonedTime(parseISO(event.start_date), istZone);
  const dateStr = format(startDateIST, 'EEE');
  const dayStr = format(startDateIST, 'dd MMM yyyy');
  const timeStr = format(startDateIST, 'h:mm a');
  
  const locationShort = formatLocationShort(event.venue, event.address, event.event_type);
  const locationFull = formatLocation(event.venue, event.address, event.event_type);
  
  // Determine format chip label
  let formatLabel = 'In-person';
  if (event.event_type === 'virtual') formatLabel = 'Virtual';
  else if (event.event_type === 'hybrid') formatLabel = 'Hybrid';
  
  const handleCardClick = (e) => {
    // Don't navigate if clicking on buttons or links
    if (!e.target.closest('button') && !e.target.closest('a[href*="edit"]')) {
      onNavigateToDetail(event.id);
    }
  };
  
  const handleEditClick = (e) => {
    e.stopPropagation();
    onNavigateToEdit(event.id);
  };
  
  const handleViewDetailsClick = (e) => {
    e.stopPropagation();
    onNavigateToDetail(event.id);
  };
  
  return (
    <Card 
      component="article"
      aria-label={`Event: ${event.title}`}
      elevation={1} 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 2,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
      onClick={handleCardClick}
    >
      {/* Image cover with 16:9 aspect ratio and overlayed status chips */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          overflow: 'hidden',
          borderRadius: '8px 8px 0 0',
        }}
      >
        <ImageWithFallback
          src={event.featured_image_url}
          alt={event.title}
          className="w-full h-full"
          placeholderSrc="/default-avatar.svg"
          emptyMessage=""
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
        />

        {/* Bottom gradient overlay with status / format / approval */}
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: { xs: '40%', md: '35%' },
            background: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0))',
            display: 'flex',
            alignItems: 'flex-end',
            px: 1.5,
            pb: 1.25,
          }}
        >
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip 
              label={statusLabel} 
              color={statusColor} 
              size="small"
              sx={{ fontWeight: 500, fontSize: '0.75rem' }}
            />
            <Chip 
              label={formatLabel}
              variant="outlined"
              size="small"
              sx={{ 
                fontWeight: 400, 
                fontSize: '0.75rem',
                borderColor: 'rgba(255,255,255,0.7)',
                color: 'rgba(255,255,255,0.85)'
              }}
            />
            {isAdmin && approvalProps && approvalProps.label === 'Approved' && (
              <Tooltip title="Approved" arrow>
                <CheckCircleIcon 
                  sx={{ 
                    fontSize: '1rem', 
                    color: 'success.main',
                    opacity: 0.9,
                  }} 
                />
              </Tooltip>
            )}
          </Box>
        </Box>
      </Box>
      
      <CardContent
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          px: { xs: 2, md: 2.5 },
          pt: { xs: 1.75, md: 2 },
          pb: { xs: 2, md: 2.5 },
          gap: 1.25,
        }}
      >
        {/* Header Row: Title + Edit Icon (admin only) */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <Typography 
            variant="h6" 
            component="h3" 
            sx={{ 
              fontWeight: 600, 
              fontSize: '1.2rem',
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flexGrow: 1
            }}
          >
            {event.title}
          </Typography>
          {isAdmin && (
            <Tooltip title={`Edit event: ${event.title}`} arrow>
              <IconButton 
                size="small"
                aria-label={`Edit event ${event.title}`}
                sx={{ 
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main', bgcolor: 'action.hover' }
                }}
                onClick={handleEditClick}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Meta Row: Date & Time */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary' }}>
          <CalendarIcon sx={{ fontSize: '1rem' }} />
          <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
            {dateStr} • {dayStr} • {timeStr} IST
          </Typography>
        </Box>

        {/* Meta Row: Location */}
        <Tooltip title={locationFull} arrow placement="top">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary' }}>
            <LocationIcon sx={{ fontSize: '1rem' }} />
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: '0.875rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {locationShort}
            </Typography>
          </Box>
        </Tooltip>

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Footer Row: Attendees + CTA */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.disabled' }}>
            <PeopleIcon sx={{ fontSize: '0.875rem' }} />
            <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
              {attendeesCount || 0} attending
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {/* Show "Give Feedback" button for past events the user attended */}
            {statusLabel.toLowerCase() === 'past' && event.user_rsvp_status && (
              <Button 
                size="medium"
                variant="outlined"
                color="secondary"
                aria-label={`Give feedback for ${event.title}`}
                sx={{ 
                  textTransform: 'none',
                  fontWeight: 500,
                  px: 2,
                  minHeight: 36
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `/events/${event.id}/feedback`;
                }}
              >
                Feedback
              </Button>
            )}
            <Button 
              size="medium"
              variant="contained"
              color="primary"
              aria-label={`View details for ${event.title}`}
              sx={{ 
                textTransform: 'none',
                fontWeight: 500,
                px: 2.5,
                minHeight: 36
              }}
              onClick={handleViewDetailsClick}
            >
              View details
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default EventCard;
