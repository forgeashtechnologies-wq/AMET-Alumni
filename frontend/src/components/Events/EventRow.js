import React from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  ListItem,
  ListItemAvatar,
  ListItemText,
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
 * EventRow Component - List view representation of an event
 * 
 * Displays event information in a horizontal list layout with:
 * - Thumbnail image
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
const EventRow = ({ 
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
  
  const locationShort = formatLocationShort(event.venue, event.address, event.event_type);
  const locationFull = formatLocation(event.venue, event.address, event.event_type);
  
  // Determine format chip label
  let formatLabel = 'In-person';
  if (event.event_type === 'virtual') formatLabel = 'Virtual';
  else if (event.event_type === 'hybrid') formatLabel = 'Hybrid';
  
  const handleRowClick = () => {
    onNavigateToDetail(event.id);
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
    <ListItem 
      alignItems="flex-start"
      sx={{ 
        py: 2,
        px: 2,
        cursor: 'pointer',
        '&:hover': { bgcolor: 'action.hover' }
      }}
      onClick={handleRowClick}
    >
      {/* Thumbnail */}
      <ListItemAvatar>
        <Box 
          sx={{ 
            width: 80, 
            height: 80, 
            borderRadius: 1,
            overflow: 'hidden',
            mr: 2
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
        </Box>
      </ListItemAvatar>
      
      {/* Middle: Event details */}
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography variant="h6" component="span" sx={{ fontWeight: 600, flexGrow: 1, pr: 2 }}>
              {event.title}
            </Typography>
            {isAdmin && (
              <Tooltip title={`Edit event: ${event.title}`} arrow>
                <IconButton 
                  size="small"
                  aria-label={`Edit event ${event.title}`}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                  onClick={handleEditClick}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        }
        secondary={
          <React.Fragment>
            {/* Status chips */}
            <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip 
                label={statusLabel} 
                color={statusColor} 
                size="small" 
                sx={{ fontSize: '0.7rem', fontWeight: 500 }} 
              />
              <Chip 
                label={formatLabel}
                variant="outlined"
                size="small"
                sx={{ fontSize: '0.7rem', borderColor: 'grey.400', color: 'text.secondary' }}
              />
              {isAdmin && approvalProps && approvalProps.label === 'Approved' && (
                <Tooltip title="Approved" arrow>
                  <CheckCircleIcon 
                    sx={{ 
                      fontSize: '1rem', 
                      color: 'success.main', 
                      alignSelf: 'center' 
                    }} 
                  />
                </Tooltip>
              )}
            </Box>
            
            {/* Date/time */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <CalendarIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              <Typography component="span" variant="body2" color="text.secondary">
                {format(startDateIST, 'EEE, MMM d, yyyy')} • {format(startDateIST, 'h:mm a')} IST
              </Typography>
            </Box>
            
            {/* Location */}
            <Tooltip title={locationFull} arrow placement="top">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <LocationIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                <Typography 
                  component="span" 
                  variant="body2" 
                  color="text.secondary"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {locationShort}
                </Typography>
              </Box>
            </Tooltip>
            
            {/* Attendees */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
              <PeopleIcon fontSize="small" sx={{ color: 'text.disabled' }} />
              <Typography variant="caption" color="text.disabled">
                {attendeesCount || 0} attending
              </Typography>
            </Box>
          </React.Fragment>
        }
      />
      
      {/* Right: CTA button */}
      <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
        <Button 
          variant="contained"
          size="small"
          color="primary"
          aria-label={`View details for ${event.title}`}
          sx={{ textTransform: 'none', fontWeight: 500 }}
          onClick={handleViewDetailsClick}
        >
          View details
        </Button>
      </Box>
    </ListItem>
  );
};

export default EventRow;
