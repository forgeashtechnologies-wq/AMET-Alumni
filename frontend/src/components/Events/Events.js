// DEPRECATED: Legacy event listing UI, not used in current routing.
// Do not import or use this component without consulting the maintainer.
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { 
  CalendarIcon,
  MapPinIcon,
  UserGroupIcon,
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
  PlusIcon,
  VideoCameraIcon,
  BuildingOfficeIcon,
  PencilIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../../utils/supabase';
import { formatInIST } from '../../utils/timezone';
import { logActivity } from '../../utils/activityLogger';
import { useAuth } from '../../contexts/AuthContext';
import { useApproval } from '../../hooks/useApproval';
import { toast } from 'react-hot-toast';
import { toFriendlyToast } from '../../utils/errors';
import { computeEventTimelineFlags } from '../../utils/eventsStatus';

const Events = () => {
  const { user, isAdmin, userRole } = useAuth();
  const { isApproved } = useApproval();
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || 'upcoming'); // all | upcoming | past
  const [selectedEventType, setSelectedEventType] = useState(searchParams.get('type') || 'all');
  const [customEventType, setCustomEventType] = useState(searchParams.get('type') === 'other' ? (searchParams.get('other') || '') : '');
  const [selectedTags, setSelectedTags] = useState(
    (searchParams.get('tags') || '')
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
  );

  // List/pagination/sort
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRSVPs, setUserRSVPs] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [totalEvents, setTotalEvents] = useState(0);
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'start_date,desc');

  // Debounce search term -> searchQuery (250ms)
  useEffect(() => {
    const id = setTimeout(() => {
      setSearchQuery(searchTerm.trim());
    }, 250);
    return () => clearTimeout(id);
  }, [searchTerm]);

  // Initialize search from URL on first mount
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setSearchTerm(q);
      setSearchQuery(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set('status', selectedStatus);
    if (searchQuery) params.set('q', searchQuery); else params.delete('q');
    if (selectedEventType) params.set('type', selectedEventType);
    if (selectedEventType === 'other' && customEventType) params.set('other', customEventType); else params.delete('other');
    if (sortBy) params.set('sort', sortBy);
    if (selectedTags && selectedTags.length) params.set('tags', selectedTags.join(',')); else params.delete('tags');
    setSearchParams(params, { replace: true });
  }, [selectedStatus, searchQuery, selectedEventType, customEventType, sortBy, selectedTags]);

  // Log filter/view changes
  useEffect(() => {
    logActivity({
      action: 'events_list_view',
      meta: {
        status: selectedStatus,
        type: selectedEventType,
        other: selectedEventType === 'other' ? customEventType : null,
        sort: sortBy,
        q: searchQuery || null,
      }
    });
  }, [selectedStatus, selectedEventType, customEventType, sortBy, searchQuery]);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        let query = supabase
          .from('events')
          .select('*', { count: 'exact' });

        // Visibility rules
        if (!isAdmin) {
          query = query.eq('is_published', true).eq('approval_status', 'approved');
        }

        // Search across specific columns
        if (searchQuery) {
          const sq = searchQuery.replace(/%/g, '\\%').replace(/_/g, '\\_');
          query = query.or(
            `title.ilike.%${sq}%,short_description.ilike.%${sq}%,long_description.ilike.%${sq}%,location.ilike.%${sq}%`
          );
        }

        // Status time boundary using UTC
        const nowIso = new Date().toISOString();
        if (selectedStatus === 'upcoming') {
          query = query.gte('start_date', nowIso);
        } else if (selectedStatus === 'past') {
          query = query.lt('start_date', nowIso);
        }

        // Type filter
        if (selectedEventType !== 'all') {
          if (selectedEventType === 'other' && customEventType.trim()) {
            query = query.eq('event_type', customEventType.trim());
          } else if (selectedEventType !== 'other') {
            query = query.eq('event_type', selectedEventType);
          }
        }

        // Sorting
        const [sortField, sortOrder] = (sortBy || 'start_date,desc').split(',');
        query = query.order(sortField, { ascending: sortOrder === 'asc' });

        const { data, error, count } = await query.range(from, to);
        if (error) throw error;

        // Apply client-side tag filter (AND semantics) after fetch
        const raw = data || [];
        let filtered = raw;
        if (selectedTags.length) {
          filtered = raw.filter((e) => {
            const tags = Array.isArray(e.tags) ? e.tags.map((t) => String(t).toLowerCase()) : [];
            return selectedTags.every((t) => tags.includes(String(t).toLowerCase()));
          });
        }

        setEvents(filtered);
        setTotalEvents(selectedTags.length ? filtered.length : (count || 0));

        // User RSVPs for visible items
        if (user && data && data.length) {
          const eventIds = data.map((e) => e.id);
          const { data: rsvpData, error: rsvpError } = await supabase
            .from('event_attendees')
            .select('event_id, status')
            .eq('user_id', user.id)
            .in('event_id', eventIds);
          if (!rsvpError && rsvpData) {
            const rsvps = {};
            rsvpData.forEach((r) => { rsvps[r.event_id] = r.status; });
            setUserRSVPs(rsvps);
          }
        }
      } catch (error) {
        logger.error('Error fetching data:', error);
        toFriendlyToast(toast, error, 'Failed to fetch events. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [user, isAdmin, currentPage, itemsPerPage, searchQuery, selectedStatus, selectedEventType, customEventType, sortBy, selectedTags]);

  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'past', label: 'Past' },
  ];

  const eventTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'in-person', label: 'In-Person' },
    { value: 'virtual', label: 'Virtual' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'other', label: 'Other' },
  ];

  const totalPages = Math.ceil(totalEvents / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleRSVP = async (eventId) => {
    if (!user) {
      toast.error('Please sign in to RSVP for events');
      return;
    }

    if (!isApproved) {
      toast.error('Your account is pending approval. You can browse events but cannot RSVP until approved.');
      return;
    }

    const isRSVPed = userRSVPs[eventId] === 'registered';
    
    try {
      if (isRSVPed) {
        // Cancel RSVP
        const { error } = await supabase
          .from('event_attendees')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', user.id);
          
        if (error) throw error;
        
        setUserRSVPs(prev => {
          const newRSVPs = {...prev};
          delete newRSVPs[eventId];
          return newRSVPs;
        });
        
        toast.success('RSVP cancelled successfully');
        logActivity({ action: 'event_rsvp_cancel', meta: { event_id: eventId, status: 'cancelled' } });
      } else {
        // Create RSVP
        const { error } = await supabase
          .from('event_attendees')
          .upsert({
            event_id: eventId,
            user_id: user.id,
            status: 'registered'
          }, {
            onConflict: 'event_id,user_id'
          });
          
        if (error) throw error;
        
        setUserRSVPs(prev => ({
          ...prev,
          [eventId]: 'registered'
        }));
        
        toast.success('Successfully RSVP\'d to the event!');
        logActivity({ action: 'event_rsvp', meta: { event_id: eventId, status: 'registered' } });
      }
    } catch (error) {
      logger.error('Error updating RSVP:', error);
      toFriendlyToast(toast, error, 'Failed to update RSVP. Please try again.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'upcoming':
        return 'bg-green-100 text-green-800';
      case 'ongoing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getApprovalMeta = (approvalStatus, isPublished) => {
    if (!isPublished) {
      return { label: 'Draft', className: 'bg-yellow-100 text-yellow-800' };
    }
    switch (approvalStatus) {
      case 'approved':
        return { label: 'Approved', className: 'bg-green-100 text-green-800' };
      case 'pending':
        return { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' };
      case 'rejected':
        return { label: 'Rejected', className: 'bg-red-100 text-red-800' };
      default:
        return null;
    }
  };

  // Helper to format location short
  const formatLocationShort = (location, eventType) => {
    if (eventType === 'virtual') return 'Online Event';
    if (!location) return 'Location TBD';
    
    // Extract city from location if it has commas
    const parts = location.split(',').map(p => p.trim());
    if (parts.length > 1) {
      const city = parts[parts.length - 2] || parts[parts.length - 1];
      const venue = parts[0].length > 20 ? parts[0].substring(0, 20) + '...' : parts[0];
      return `${city} · ${venue}`;
    }
    return location.length > 30 ? location.substring(0, 30) + '...' : location;
  };

  const EventCard = ({ event }) => {
    const approval = getApprovalMeta(event.approval_status, event.is_published);
    const { eventStarted, eventEnded, statusLabel } = computeEventTimelineFlags(event);
    const isUpcoming = !eventStarted && !eventEnded;
    const locationShort = formatLocationShort(event.location, event.event_type);
    
    // Format chip label
    let formatLabel = 'In-person';
    if (event.event_type === 'virtual') formatLabel = 'Virtual';
    else if (event.event_type === 'hybrid') formatLabel = 'Hybrid';
    
    return (
    <article 
      className="glass-card rounded-lg overflow-hidden card-hover flex flex-col h-full"
      aria-label={`Event: ${event.title}`}
    >
      {/* Top Image Strip */}
      <div className="relative h-28 overflow-hidden">
        <img 
          src={event.image_url || 'https://placehold.co/600x400/0077b6/FFFFFF?text=Event'}
          alt={event.title}
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="p-5 flex flex-col flex-grow space-y-3">
        {/* Header Row: Title + Edit Icon (admin only) */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 text-lg leading-tight line-clamp-2 flex-grow">
            {event.title}
          </h3>
          {isAdmin && (
            <Link 
              to={`/events/${event.id}/edit`}
              className="flex-shrink-0 p-1 text-gray-500 hover:text-ocean-600 hover:bg-gray-100 rounded transition-colors"
              aria-label={`Edit event ${event.title}`}
              title={`Edit event: ${event.title}`}
            >
              <PencilIcon className="w-4 h-4" />
            </Link>
          )}
        </div>
        
        {/* Status Row: Max 2 chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
            isUpcoming ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {statusLabel}
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-normal border border-gray-300 text-gray-600">
            {formatLabel}
          </span>
          {/* Admin-only: subtle approved indicator */}
          {isAdmin && approval && approval.label === 'Approved' && (
            <CheckCircleIcon 
              className="w-4 h-4 text-green-600" 
              title="Approved"
            />
          )}
        </div>
        
        {/* Meta Row: Date & Time */}
        <div className="flex items-center text-sm text-gray-600">
          <CalendarIcon className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="font-medium">
            {formatInIST(event.start_date, 'EEE')} • {formatInIST(event.start_date, 'dd MMM yyyy')} • {formatInIST(event.start_date, 'h:mm a')}
          </span>
        </div>
        
        {/* Meta Row: Location */}
        <div className="flex items-center text-sm text-gray-600" title={event.location || 'Location TBD'}>
          <MapPinIcon className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="truncate">{locationShort}</span>
        </div>
        
        {/* Spacer */}
        <div className="flex-grow" />
        
        {/* Footer Row: Attendees + CTA */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center text-xs text-gray-400">
            <UserGroupIcon className="w-3.5 h-3.5 mr-1" />
            <span>{event.max_attendees || 0} attending</span>
          </div>
          <Link 
            to={`/events/${event.id}`}
            className="btn-ocean py-2 px-4 rounded-lg text-sm font-medium inline-block"
            aria-label={`View details for ${event.title}`}
          >
            View details
          </Link>
        </div>
      </div>
    </article>
  );
  };

  const EventListItem = ({ event }) => {
    const { eventStarted, eventEnded } = computeEventTimelineFlags(event);
    const isUpcoming = !eventStarted && !eventEnded;
    const approval = getApprovalMeta(event.approval_status, event.is_published);
    
    return (
      <div className="glass-card rounded-lg overflow-hidden card-hover flex">
        <img 
          src={event.image_url || 'https://placehold.co/400x300/0077b6/FFFFFF?text=Event'}
          alt={event.title}
          className="w-32 h-32 md:w-48 md:h-auto object-cover"
        />
        <div className="p-4 flex flex-col flex-1">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1 mr-4">
              <h3 className="font-semibold text-gray-900 text-lg line-clamp-2">{event.title}</h3>
              {isAdmin && approval && (
                <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${approval.className}`}>
                  {approval.label}
                </span>
              )}
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusBadge(isUpcoming ? 'upcoming' : 'completed')}`}>
              {isUpcoming ? 'Upcoming' : 'Completed'}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600">
            <div className="flex items-center">
              <CalendarIcon className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{formatInIST(event.start_date, 'MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center">
              <ClockIcon className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{formatInIST(event.start_date, 'h:mm a')}</span>
            </div>
            {event.location && (
              <div className="flex items-center col-span-2">
                {event.event_type === 'virtual' ? <VideoCameraIcon className="w-4 h-4 mr-2 flex-shrink-0" /> : <MapPinIcon className="w-4 h-4 mr-2 flex-shrink-0" />}
                <span className="truncate">{event.location}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-auto pt-3">
            <div className="flex flex-wrap gap-1">
              {event.tags && event.tags.slice(0, 2).map((tag, index) => (
                <span key={index} className="px-2 py-1 bg-ocean-100 text-ocean-800 rounded text-xs">{tag}</span>
              ))}
            </div>
            <div className="flex space-x-2 flex-shrink-0">
              <Link to={`/events/${event.id}`} className="btn-ocean-outline py-1 px-3 rounded text-sm">
                Details
              </Link>
              {isUpcoming && (
                <button 
                  onClick={() => handleRSVP(event.id)} 
                  disabled={!isApproved && !userRSVPs[event.id]}
                  className={`py-1 px-3 rounded text-sm font-medium ${
                    !isApproved && !userRSVPs[event.id] 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : userRSVPs[event.id] 
                        ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                        : 'btn-ocean'
                  }`}
                  title={!isApproved && !userRSVPs[event.id] ? 'Your account is pending approval' : ''}
                >
                  {userRSVPs[event.id] ? 'Cancel' : 'RSVP'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tag Filter */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {Array.from(
              new Set(
                (events || []).flatMap((e) => (Array.isArray(e.tags) ? e.tags : []))
              )
            )
              .sort((a, b) => String(a).localeCompare(String(b)))
              .map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => {
                      setCurrentPage(1);
                      setSelectedTags((prev) => {
                        const has = prev.includes(tag);
                        if (has) return prev.filter((t) => t !== tag);
                        return [...prev, tag];
                      });
                    }}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      active ? 'bg-ocean-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    aria-pressed={active}
                  >
                    {tag}
                  </button>
                );
              })}
            {selectedTags.length > 0 && (
              <button
                onClick={() => { setSelectedTags([]); setCurrentPage(1); }}
                className="ml-2 px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <main id="main-content" className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="glass-card rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Events</h1>
            <p className="text-gray-600">Discover and participate in alumni events</p>
          </div>
          {userRole !== 'student' && (
            <Link 
              to="/events/create" 
              className="btn-ocean px-4 py-2 rounded-lg flex items-center"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Create Event
            </Link>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="glass-card rounded-lg p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input w-full pl-10 pr-24 py-2 rounded-lg"
                placeholder="Search title, description, or location..."
                aria-label="Search events"
              />
              <button
                onClick={() => {
                  setCurrentPage(1);
                  setSearchQuery(searchTerm.trim());
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 btn-ocean px-3 py-1 rounded-md text-sm"
              >
                Search
              </button>
            </div>
          </div>
          
          {/* View Toggle */}
          <div className="flex border border-gray-300 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-ocean-500 text-white' : 'text-gray-600'}`}
            >
              <Squares2X2Icon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-ocean-500 text-white' : 'text-gray-600'}`}
            >
              <ListBulletIcon className="w-4 h-4" />
            </button>
          </div>

          <Link 
            to="/events/calendar" 
            className="btn-ocean-outline px-4 py-2 rounded-lg flex items-center"
          >
            <CalendarIcon className="w-4 h-4 mr-2" />
            Calendar View
          </Link>
        </div>

        {/* Status Filter */}
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Status</h3>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Event status filter">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setSelectedStatus(opt.value); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedStatus === opt.value ? 'bg-ocean-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                aria-pressed={selectedStatus === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Event Type Filters */}
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Event Format</h3>
          <div className="flex flex-wrap gap-2">
            {eventTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => {
                  setSelectedEventType(type.value);
                  if (type.value !== 'other') setCustomEventType('');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedEventType === type.value
                    ? 'bg-ocean-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type.label}
              </button>
            ))}
            {selectedEventType === 'other' && (
              <input
                type="text"
                value={customEventType}
                onChange={(e) => setCustomEventType(e.target.value)}
                placeholder="Specify type"
                className="form-input px-3 py-1 rounded text-sm"
                aria-label="Custom event type"
              />
            )}
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          Showing <span className="font-medium">{events.length}</span> of <span className="font-medium">{totalEvents}</span> events
        </p>
        <select 
          className="form-input px-3 py-1 rounded text-sm"
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="start_date,desc">Sort by Date (Recent)</option>
          <option value="start_date,asc">Sort by Date (Oldest)</option>
          <option value="title,asc">Sort by Title (A-Z)</option>
          <option value="title,desc">Sort by Title (Z-A)</option>
        </select>
      </div>

      {/* Events Grid/List */}
      {loading ? (
        <div className="text-center py-10" role="status" aria-live="polite">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" aria-hidden="true"></div>
          <p className="mt-4 text-gray-600">Loading events...</p>
        </div>
      ) : events.length > 0 ? (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
          : 'space-y-4'
        }>
          {events.map((event) => 
            viewMode === 'grid' 
              ? <EventCard key={event.id} event={event} />
              : <EventListItem key={event.id} event={event} />
          )}
        </div>
      ) : (
        <div className="text-center py-12 glass-card rounded-lg">
          <div className="w-16 h-16 bg-ocean-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarIcon className="w-8 h-8 text-ocean-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Events Found</h3>
          <p className="text-gray-600 mb-6">Try adjusting your search or filters.</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-4 mt-8">
          <button 
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Go to previous page"
            className="inline-flex items-center min-h-[44px] min-w-[44px] px-4 py-2 rounded-lg border-2 border-ocean-300 text-ocean-700 hover:bg-ocean-50 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 transition-colors duration-200"
          >
            Previous
          </button>
          
          <span aria-current="page" className="min-h-[44px] px-4 py-2 rounded-lg bg-ocean-600 text-white font-medium flex items-center">
            Page {currentPage} of {totalPages}
          </span>
          
          <button 
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Go to next page"
            className="inline-flex items-center min-h-[44px] min-w-[44px] px-4 py-2 rounded-lg border-2 border-ocean-300 text-ocean-700 hover:bg-ocean-50 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 transition-colors duration-200"
          >
            Next
          </button>
        </nav>
      )}
      </div>
    </main>
  );
};

export default Events;