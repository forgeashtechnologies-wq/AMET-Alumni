import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../utils/supabase';
import logger from '../../utils/logger';
import { format, parseISO } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { ArrowLeft, Edit, Trash2, Calendar, Clock, MapPin, Tag, Users, CheckCircle, BarChart2, Star } from 'lucide-react';
import SocialShareButtons from '../common/SocialShareButtons';
import ImageWithFallback from '../common/ImageWithFallback';
import { useEvent, useMyRsvp, useMyFeedback, useOrganizer, useEventComputedFlags } from '../../hooks/useEventData';
import { useAuth } from '../../contexts/AuthContext';
import { useApproval } from '../../hooks/useApproval';
import { downloadCSV } from '../../utils/csv';
import { toast } from 'react-hot-toast';

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAdmin, getUserRole } = useAuth();
  const userRole = typeof getUserRole === 'function' ? getUserRole() : null;
  const { isApproved } = useApproval();
  const isMountedRef = useRef(true);
  const istZone = 'Asia/Kolkata';
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Data fetching with React Query
  const { data: event, isLoading } = useEvent(id);
  const { data: myRsvp, refetch: refetchRsvp } = useMyRsvp(id);
  const { data: myFeedback, refetch: refetchFeedback } = useMyFeedback(id);
  const { data: organizer } = useOrganizer(id);
  
  // Local state
  const [error, setError] = useState('');
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showRsvpSuccess, setShowRsvpSuccess] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [attendees, setAttendees] = useState([]);
  const [attendeesOpen, setAttendeesOpen] = useState(false);
  const [rsvpBanner, setRsvpBanner] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [exportingVolunteers, setExportingVolunteers] = useState(false);
  const [volunteerInterest, setVolunteerInterest] = useState(false);
  const [volunteerSaving, setVolunteerSaving] = useState(false);
  
  useEffect(() => {
    if (!showImageModal) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowImageModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showImageModal]);
  
  // Computed values
  const { startISO, endISO, eventStarted, eventEnded } = useEventComputedFlags(event);
  const rsvpStatusVal = myRsvp?.attendance_status?.toLowerCase() || '';
  const iAmAttendee = ['going', 'attended', 'checked_in', 'attending'].includes(rsvpStatusVal);
  const canShowFeedback = eventEnded && iAmAttendee && !myFeedback;
  const isOrganizerOrAdmin = user?.id === event?.organizer_id || !!isAdmin;

  const eventStatus = useMemo(() => {
    if (!startISO || !endISO) {
      return { text: 'Date TBD', color: 'bg-gray-400' };
    }
    if (eventEnded) {
      return { text: 'Past', color: 'bg-red-500' };
    }
    if (eventStarted) {
      return { text: 'Ongoing', color: 'bg-green-500' };
    }
    return { text: 'Upcoming', color: 'bg-blue-500' };
  }, [startISO, endISO, eventEnded, eventStarted]);

  const eventDateLabel = useMemo(() => {
    if (!event?.start_date) {
      return 'Date not available';
    }
    const startDateIST = utcToZonedTime(parseISO(event.start_date), istZone);
    return format(startDateIST, 'EEEE, MMMM d, yyyy');
  }, [event?.start_date, istZone]);

  const eventTimeLabel = useMemo(() => {
    if (!event?.start_date) {
      // Preserve previous behavior: "Time not available" followed by end time if present
      let label = 'Time not available';
      if (event?.end_date) {
        const endDateIST = utcToZonedTime(parseISO(event.end_date), istZone);
        label += ` - ${format(endDateIST, 'h:mm a')}`;
      }
      return label;
    }

    const startDateIST = utcToZonedTime(parseISO(event.start_date), istZone);
    let label = format(startDateIST, 'h:mm a');

    if (event?.end_date) {
      const endDateIST = utcToZonedTime(parseISO(event.end_date), istZone);
      label += ` - ${format(endDateIST, 'h:mm a')}`;
    }

    return label;
  }, [event?.start_date, event?.end_date, istZone]);

  useEffect(() => {
    setVolunteerInterest(!!myRsvp?.wants_to_volunteer);
  }, [myRsvp?.wants_to_volunteer]);

  const upsertVolunteerRecord = useCallback(
    async (status, wantsVolunteer) => {
      if (!user?.id || !event?.id) return;
      const { error } = await supabase
        .from('event_rsvps')
        .upsert(
          {
            event_id: event.id,
            user_id: user.id,
            attendance_status: status,
            wants_to_volunteer: wantsVolunteer,
          },
          { onConflict: 'event_id,user_id' }
        );
      if (error) throw error;
    },
    [event?.id, user?.id]
  );

  const handleExportVolunteers = useCallback(async () => {
    if (!event?.id) return;
    setExportingVolunteers(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_event_volunteers', { p_event_id: event.id });
      if (error) throw error;
      const rows = Array.isArray(data) ? data : (data ? [data].flat() : []);
      if (!rows || rows.length === 0) {
        toast.success('No volunteers have signed up yet.');
        return;
      }
      const normalized = rows.map((row, index) => ({
        '#': index + 1,
        name: row.full_name || 'Unknown',
        email: row.email || '',
        phone: row.phone || '',
        rsvp_status: row.rsvp_status || '',
        volunteered_at: row.rsvp_created_at || '',
      }));
      downloadCSV(`event-${event.id}-volunteers.csv`, normalized);
      toast.success('Volunteer list downloaded.');
    } catch (err) {
      logger.error('Failed to export volunteers', err);
      toast.error('Failed to export volunteers');
    } finally {
      setExportingVolunteers(false);
    }
  }, [event?.id]);

  const isVirtualEvent = useMemo(() => {
    if (!event) return false;
    if (event.event_type === 'virtual' || event.event_type === 'hybrid') return true;
    if (typeof event.is_virtual === 'boolean') return event.is_virtual;
    return false;
  }, [event]);

  // Realtime subscription for RSVP changes
  useEffect(() => {
    if (!id || !user?.id) return;
    
    const channel = supabase
      .channel(`event_attendees:${id}:${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'event_attendees',
        filter: `event_id=eq.${id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['myRsvp', id] });
      })
      .subscribe();
      
    return () => {
      try { supabase.removeChannel(channel); } 
      catch (e) { logger.warn('Failed to remove channel:', e); }
    };
  }, [id, user?.id, queryClient]);
  
  // Hide success message if event has ended
  useEffect(() => {
    if (eventEnded) {
      setShowRsvpSuccess(false);
    }
  }, [eventEnded]);

  // Fetch attendees when component mounts or RSVP status changes
  useEffect(() => {
    const fetchAttendees = async () => {
      if (!id) return;
      
      try {
        const { data, error } = await supabase
          .from('event_attendees')
          .select(`
            id,
            user_id,
            attendance_status,
            profiles:profiles(
              id,
              full_name,
              first_name,
              last_name,
              avatar_url,
              role,
              current_position
            )
          `)
          .eq('event_id', id)
          .eq('attendance_status', 'going');
          
        if (error) throw error;
        let rows = data || [];
        const missing = rows.filter(r => !r.profiles && r.user_id).map(r => r.user_id);
        if (missing.length > 0) {
          const { data: profs, error: pErr } = await supabase
            .from('profiles')
            .select('id, full_name, first_name, last_name, avatar_url, role, current_position')
            .in('id', Array.from(new Set(missing)));
          if (!pErr && Array.isArray(profs)) {
            const pMap = new Map(profs.map(p => [p.id, p]));
            rows = rows.map(r => (r.profiles ? r : { ...r, profiles: pMap.get(r.user_id) || null }));
          }
        }
        if (!isMountedRef.current) return;
        setAttendees(rows);
      } catch (err) {
        logger.error('Error fetching attendees:', err);
        if (!isMountedRef.current) return;
        setError('Failed to load attendees');
      }
    };
    
    fetchAttendees();
    
    // Set up realtime subscription
    const channel = supabase
      .channel(`event-attendees-${id}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'event_attendees', 
          filter: `event_id=eq.${id}` 
        }, 
        () => {
          fetchAttendees();
          refetchRsvp();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [id, refetchRsvp]);

  // Update RSVP banner based on attendance and event status
  useEffect(() => {
    setRsvpBanner(iAmAttendee && !eventStarted);
  }, [iAmAttendee, eventStarted]);

  const normalizedAttendees = useMemo(() => {
    return (attendees || [])
      .filter((a) => a && (a.user_id || a.profiles))
      .map((attendee) => {
        const profile = attendee.profiles || {};
        const profileId = attendee.user_id || profile.id;
        const name =
          profile.full_name ||
          [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
          'Attendee';
        const role = profile.role || profile.current_position || '';
        const avatar = profile.avatar_url;

        return {
          id: attendee.id,
          profileId,
          name,
          role,
          avatar,
        };
      });
  }, [attendees]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    setLoading(true);
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) {
      logger.error('Error deleting event:', error);
      const msg = String(error.message || '');
      if (!isMountedRef.current) return;
      if (msg.toLowerCase().includes('permission denied')) {
        setError('You do not have permission to delete this event.');
      } else {
        setError('Failed to delete event.');
      }
      setLoading(false);
    } else {
      if (!isMountedRef.current) return;
      navigate('/events');
    }
  };

  const handleAttend = async () => {
    if (!user) return setShowLoginPrompt(true);
    
    setRsvpLoading(true);
    try {
      const row = { 
        event_id: id, 
        user_id: user.id, 
        attendance_status: 'going' 
      };
      
      const { error } = await supabase
        .from('event_attendees')
        .upsert(row, { onConflict: 'event_id,user_id' });
        
      if (error) throw error;
      await upsertVolunteerRecord('going', volunteerInterest);
      
      setShowRsvpSuccess(true);
      await refetchRsvp();
    } catch (err) {
      logger.error('Error during RSVP:', err);
      const msg = String(err?.message || '');
      if (msg.toLowerCase().includes('permission denied')) {
        setError('You do not have permission to register for this event.');
      } else {
        setError('Failed to process your registration. Please try again.');
      }
    } finally {
      setRsvpLoading(false);
    }
  };
  
  // Update RSVP status
  const updateRsvpStatus = async (status) => {
    if (!user) return setShowLoginPrompt(true);
    
    if (!isApproved && status === 'going') {
      setError('Your account is pending approval. You can browse events but cannot register until approved.');
      return;
    }
    
    setRsvpLoading(true);
    try {
      if (status === 'going') {
        const { error } = await supabase
          .from('event_attendees')
          .upsert(
            { 
              event_id: id, 
              user_id: user.id, 
              attendance_status: 'going' 
            },
            { onConflict: 'event_id,user_id' }
          );
        if (error) throw error;
        await upsertVolunteerRecord('going', volunteerInterest);
        if (!isMountedRef.current) return;
        setShowRsvpSuccess(true);
        setRsvpBanner(true);
      } else {
        const { error } = await supabase
          .from('event_attendees')
          .delete()
          .eq('event_id', id)
          .eq('user_id', user.id);
        if (error) throw error;
        await upsertVolunteerRecord('not_going', false);
        setVolunteerInterest(false);
        if (!isMountedRef.current) return;
        setShowRsvpSuccess(false);
        setRsvpBanner(false);
      }
      await refetchRsvp();
    } catch (err) {
      logger.error('Error updating RSVP:', err);
      const msg = String(err?.message || '');
      if (isMountedRef.current) {
        if (msg.toLowerCase().includes('permission denied')) {
          setError('You do not have permission to change your registration for this event.');
        } else {
          setError(`Failed to ${status === 'going' ? 'register for' : 'cancel registration for'} this event.`);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setRsvpLoading(false);
      }
    }
  };

  // Handle RSVP action
  const handleRsvp = (status) => {
    return () => updateRsvpStatus(status);
  };

  const handleVolunteerChange = async (checked) => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    if (!iAmAttendee) {
      toast.error('Please RSVP before volunteering.');
      return;
    }
    setVolunteerSaving(true);
    try {
      await upsertVolunteerRecord('going', checked);
      await refetchRsvp();
      setVolunteerInterest(checked);
      toast.success(checked ? 'Volunteer preference saved' : 'Volunteer preference removed');
    } catch (err) {
      logger.error('Failed to update volunteer status', err);
      toast.error('Unable to update volunteer preference');
    } finally {
      setVolunteerSaving(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!user) return setShowLoginPrompt(true);
    
    // Don't submit if no rating is provided
    if (!feedbackRating) {
      setError('Please provide a rating before submitting feedback.');
      return;
    }
    
    setRsvpLoading(true);
    try {
      const payload = {
        event_id: id,
        user_id: user.id,
        rating: Math.round(Number(feedbackRating)),
        comments: feedbackComment,
      };
      
      // Upsert fallback when unique constraint may be missing on (event_id,user_id)
      const { data: existing, error: selErr } = await supabase
        .from('event_feedback')
        .select('id')
        .eq('event_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (selErr) throw selErr;
      if (existing?.id) {
        const { error: updErr } = await supabase
          .from('event_feedback')
          .update({ rating: payload.rating, comments: payload.comments })
          .eq('id', existing.id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase
          .from('event_feedback')
          .insert(payload);
        if (insErr) throw insErr;
      }
      
      // Reset form and show success state
      if (!isMountedRef.current) return;
      setFeedbackSubmitted(true);
      setFeedbackRating(0);
      setFeedbackComment('');
      
      // Refresh feedback data
      await refetchFeedback();
      
    } catch (err) {
      logger.error('Error submitting feedback:', err?.message || err, err);
      const msg = String(err?.message || '');
      if (isMountedRef.current) {
        if (msg.toLowerCase().includes('permission denied')) {
          setError('You do not have permission to submit feedback for this event.');
        } else {
          setError('Failed to submit your feedback. Please try again.');
        }
      }
    } finally {
      if (isMountedRef.current) {
        setRsvpLoading(false);
      }
    }
  };

  const submitFeedback = async ({ rating, comment }) => {
    if (!user) return setShowLoginPrompt(true);
    
    setRsvpLoading(true);
    try {
      const payload = {
        event_id: id,
        user_id: user.id,
        rating: Math.round(Number(rating)),
        comments: comment,
      };
      
      const { data: existing2, error: selErr2 } = await supabase
        .from('event_feedback')
        .select('id')
        .eq('event_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (selErr2) throw selErr2;
      if (existing2?.id) {
        const { error: updErr2 } = await supabase
          .from('event_feedback')
          .update({ rating: payload.rating, comments: payload.comments })
          .eq('id', existing2.id);
        if (updErr2) throw updErr2;
      } else {
        const { error: insErr2 } = await supabase
          .from('event_feedback')
          .insert(payload);
        if (insErr2) throw insErr2;
      }
      
      if (!isMountedRef.current) return;
      setFeedbackSubmitted(true);
      await refetchFeedback();
    } catch (err) {
      logger.error('Error submitting feedback:', err);
      const msg = String(err?.message || '');
      if (isMountedRef.current) {
        if (msg.toLowerCase().includes('permission denied')) {
          setError('You do not have permission to submit feedback for this event.');
        } else {
          setError('Failed to submit your feedback. Please try again.');
        }
      }
    } finally {
      if (isMountedRef.current) {
        setRsvpLoading(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (showLoginPrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="mt-3 text-xl font-medium text-gray-900">Authentication Required</h2>
          <p className="mt-2 text-gray-600">You need to be logged in to view this event.</p>
          <div className="mt-6">
            <Link
              to="/login"
              state={{ from: window.location.pathname }}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Log in
            </Link>
            <p className="mt-3 text-sm text-gray-500">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) return <div className="text-center p-4 text-red-500 bg-red-100 rounded-md">Error: {error}</div>;
  if (!event) return <div className="text-center p-4">Event not found.</div>;

  const canViewFeedback = eventEnded || event.status === 'completed';
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareTitle = event.title || '';

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto p-4 md:p-6">
        <Link to="/events" className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to All Events
        </Link>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <button
            type="button"
            className="w-full h-48 md:h-64 cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
            onClick={() => event.featured_image_url && setShowImageModal(true)}
          >
            <ImageWithFallback
              src={event.featured_image_url}
              alt={event.title}
              className="w-full h-full object-cover"
              placeholderSrc="/default-avatar.svg"
              emptyMessage="Event image to be uploaded"
            />
          </button>
          <div className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start mb-2">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2 sm:mb-0">{event.title}</h1>
                <p className="text-lg text-gray-500 mt-1">{event.short_description}</p>
                {event.organizer_name && <p className="text-md text-gray-600 mt-2">by {event.organizer_name}</p>}
              </div>
              <span className={`px-3 py-1 text-sm font-semibold text-white rounded-full ${eventStatus.color} flex-shrink-0 mt-2 sm:mt-0`}>
                {eventStatus.text}
              </span>
            </div>

            <div className="mt-4">
              <SocialShareButtons url={shareUrl} title={shareTitle} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              {/* Event Info */}
              <div className="md:col-span-2 space-y-4">
                <p className="text-gray-600 whitespace-pre-wrap">{event.description}</p>
                <div className="flex items-center text-gray-600 mb-2">
                  <Calendar className="w-5 h-5 mr-3 text-blue-500"/>
                  <span>
                    {eventDateLabel}
                  </span>
                </div>
                <div className="flex items-center text-gray-600 mb-2">
                  <Clock className="w-5 h-5 mr-3 text-blue-500"/>
                  <span>
                    {eventTimeLabel}
                  </span>
                </div>

                {isVirtualEvent && event.virtual_link ? (
                  <div className="flex items-center text-gray-600 mb-2">
                    <MapPin className="w-5 h-5 mr-3 text-green-500"/>
                    <a
                      href={event.virtual_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Join Virtual Event
                    </a>
                  </div>
                ) : ((event.venue || event.address) && (
                  <div className="flex items-start text-gray-600 mb-2">
                    <MapPin className="w-5 h-5 mr-3 text-red-500 mt-0.5"/>
                    <div>
                      {event.venue && <div className="mb-1">{event.venue}</div>}
                      {event.address && <div className="text-sm text-gray-700">{event.address}</div>}
                    </div>
                  </div>
                ))}

                {event.category && <div className="flex items-center text-gray-600 mb-2"><BarChart2 className="w-5 h-5 mr-3 text-purple-500"/><span>Category: {event.category}</span></div>}

                {event.tags && event.tags.length > 0 && (
                  <div className="flex items-center text-gray-600 flex-wrap">
                    <Tag className="w-5 h-5 mr-3 text-gray-500"/>
                    {event.tags.map(tag => (
                      <Link 
                        to={`/events?tag=${encodeURIComponent(tag)}`} 
                        key={tag} 
                        className="bg-gray-200 text-gray-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full hover:bg-blue-100 hover:text-blue-800 cursor-pointer transition-colors"
                      >
                        {tag}
                      </Link>
                    ))}
                  </div>
                )}

                {event.sponsor_info && (
                  <div className="bg-gray-50 border rounded-lg p-4 text-gray-700">
                    <h3 className="text-base font-semibold text-gray-900 mb-2">Sponsors &amp; Partners</h3>
                    <p className="text-sm whitespace-pre-line break-words">
                      {event.sponsor_info}
                    </p>
                  </div>
                )}
              </div>

              {/* RSVP & Admin */}
              <div className="md:col-span-1 space-y-4">
                {(organizer || event.organizer_name || event.organizer_email || event.organizer_phone) && (
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <h3 className="font-bold text-lg mb-3">Organizer</h3>
                    <div className="flex items-center gap-3">
                      <img
                        src={(organizer?.avatar_url) || '/default-avatar.svg'}
                        alt={(organizer?.name) || 'Organizer'}
                        className="w-10 h-10 rounded-full"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/default-avatar.svg';
                        }}
                      />
                      <div>
                        {(organizer?.name || event.organizer_name) && <div className="font-medium text-gray-800">{organizer?.name || event.organizer_name}</div>}
                        {organizer?.company_name && <div className="text-sm text-gray-500">{organizer.company_name}</div>}
                        {organizer?.current_location && <div className="text-sm text-gray-500">{organizer.current_location}</div>}
                        {organizer?.graduation_year && <div className="text-xs text-gray-400">Batch of {organizer.graduation_year}</div>}
                      </div>
                    </div>
                    <div className="mt-3 space-y-1">
                      {(organizer?.email || event.organizer_email) && <a className="text-sm text-blue-600 hover:underline" href={`mailto:${organizer?.email || event.organizer_email}`}>{organizer?.email || event.organizer_email}</a>}
                      {(organizer?.phone || event.organizer_phone) && <a className="block text-sm text-blue-600 hover:underline" href={`tel:${organizer?.phone || event.organizer_phone}`}>{organizer?.phone || event.organizer_phone}</a>}
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 p-4 rounded-lg border">
                  <h3 className="font-bold text-lg mb-3 text-center">Register for this event</h3>
                  {error && <div className="text-center p-2 mb-3 bg-red-100 text-red-700 rounded">{error}</div>}
                  {rsvpBanner && (
                    <div className="mb-3 rounded-md border p-3 bg-blue-50 text-blue-800 text-center">
                    Your attendance is confirmed!
                    </div>
                  )}
                  {eventEnded ? (
                    <div className="text-center text-gray-500">Event ended</div>
                  ) : iAmAttendee && !eventStarted ? (
                    <div className="text-center">
                      <div className="flex items-center justify-center text-green-600 font-semibold mb-2">
                        <CheckCircle className="w-5 h-5 mr-2"/> You are going!
                      </div>
                      <button 
                        onClick={handleRsvp('not_going')} 
                        disabled={rsvpLoading} 
                        className="text-sm text-red-500 hover:underline"
                      >
                        Cancel registration
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={handleRsvp('going')} 
                      disabled={rsvpLoading || eventStarted} 
                      className="inline-flex items-center justify-center w-full min-h-[44px] px-4 rounded-lg bg-gradient-to-b from-ocean-500 to-ocean-600 text-white font-bold hover:from-ocean-600 hover:to-ocean-700 transition-[colors,opacity,transform,shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 disabled:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {rsvpLoading ? 'Processing...' : 'Attend Event'}
                    </button>
                  )}
                  <div className="mt-4 pt-4 border-t text-left">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 text-ocean-600 border-gray-300 rounded focus:ring-ocean-500"
                        checked={volunteerInterest}
                        onChange={(e) => handleVolunteerChange(e.target.checked)}
                        disabled={volunteerSaving || rsvpLoading || showLoginPrompt || !isApproved}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Volunteer to help at this event</p>
                        <p className="text-xs text-gray-500">
                          We’ll share your name, email, and phone with the organizer so they can coordinate tasks.
                        </p>
                      </div>
                    </label>
                    {volunteerInterest && (
                      <p className="mt-2 text-sm text-green-600">
                        You have volunteered for this event.
                      </p>
                    )}
                  </div>
                  {canShowFeedback && !feedbackSubmitted && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-bold text-md mb-2 text-center">How was your experience?</h4>
                      <Link
                        to={`/events/${id}/feedback`}
                        className="flex items-center justify-center w-full min-h-[44px] px-4 rounded-lg bg-gradient-to-b from-ocean-500 to-ocean-600 text-white font-bold hover:from-ocean-600 hover:to-ocean-700 transition-[colors,opacity,transform,shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
                      >
                        <Star className="w-4 h-4 mr-2" /> Give Detailed Feedback
                      </Link>
                      <p className="text-xs text-gray-500 text-center mt-2">Share your experience to help us improve future events</p>
                    </div>
                  )}
                  {(feedbackSubmitted || myFeedback) && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="text-center text-green-600 font-semibold mb-2">
                        Thank you for your feedback!
                      </div>
                      <Link
                        to={`/events/${id}/feedback`}
                        className="text-sm text-ocean-600 hover:underline block text-center"
                      >
                        View your feedback
                      </Link>
                    </div>
                  )}
                </div>

                {isOrganizerOrAdmin && (
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <h3 className="font-bold text-lg mb-3 text-center">Admin Actions</h3>
                    <div className="flex flex-col space-y-2">
                      <Link to={`/events/edit/${id}`} className="flex items-center justify-center w-full bg-yellow-500 text-white font-bold py-2 px-4 rounded hover:bg-yellow-600 transition duration-200">
                        <Edit className="w-4 h-4 mr-2"/> Edit
                      </Link>
                      <button onClick={handleDelete} disabled={loading} className="flex items-center justify-center w-full bg-red-600 text-white font-bold py-2 px-4 rounded hover:bg-red-700 disabled:bg-gray-400 transition duration-200">
                        <Trash2 className="w-4 h-4 mr-2"/> Delete
                      </button>
                      <button
                        type="button"
                        onClick={handleExportVolunteers}
                        disabled={exportingVolunteers}
                        className="flex items-center justify-center w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded hover:bg-indigo-700 disabled:bg-gray-400 transition duration-200"
                      >
                        {exportingVolunteers ? 'Exporting Volunteers…' : 'Download volunteers (CSV)'}
                      </button>
                      {canViewFeedback ? (
                        <Link to={`/admin/events/${id}/feedback`} className="flex items-center justify-center w-full min-h-[44px] px-4 rounded-lg bg-gradient-to-b from-ocean-500 to-ocean-600 text-white font-bold hover:from-ocean-600 hover:to-ocean-700 transition-[colors,opacity,transform,shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2">
                          <BarChart2 className="w-4 h-4 mr-2"/> View Feedback
                        </Link>
                      ) : (
                        <button aria-disabled className="flex items-center justify-center w-full bg-gray-300 text-gray-600 font-bold py-2 px-4 rounded cursor-not-allowed" title="Feedback available after event ends">
                          <BarChart2 className="w-4 h-4 mr-2"/> View Feedback
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center"><Users className="w-6 h-6 mr-3"/>Attendees ({attendees.length})</h3>
                <button onClick={() => setAttendeesOpen(true)} className="btn-ocean px-4 py-2 rounded-lg">View Attendees</button>
              </div>
              {attendees.length === 0 && (
                <p className="text-gray-500">No attendees yet. Be the first to register!</p>
              )}
            </div>

            {/* Image Modal */}
            {showImageModal && (
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Full size event image"
                className="fixed inset-0 z-40 flex items-center justify-center"
              >
                <div
                  className="absolute inset-0 bg-black bg-opacity-70"
                  onClick={() => setShowImageModal(false)}
                />
                <div className="relative max-w-5xl max-h-[90vh] mx-4 flex flex-col">
                  <button
                    type="button"
                    onClick={() => setShowImageModal(false)}
                    className="self-end mb-2 text-white/80 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full"
                    aria-label="Close image preview"
                  >
                    ✕
                  </button>
                  <div className="bg-black rounded-lg overflow-hidden shadow-2xl flex-1 flex items-center justify-center">
                    <img
                      src={event.featured_image_url}
                      alt={event.title}
                      className="max-h-[80vh] w-auto object-contain"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Attendees Modal */}
            {attendeesOpen && (
              <div role="dialog" aria-modal="true" aria-labelledby="attendees-title" className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setAttendeesOpen(false)}></div>
                <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 id="attendees-title" className="text-xl font-semibold">Attendees ({attendees.length})</h4>
                    <button onClick={() => setAttendeesOpen(false)} className="text-gray-600 hover:text-gray-900" aria-label="Close attendees list">✕</button>
                  </div>
                  {attendees.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-auto">
                      {normalizedAttendees.map((attendee) => (
                        <Link
                          to={attendee.profileId ? `/profile/${attendee.profileId}` : '#'}
                          key={attendee.id}
                          className="flex items-center gap-3 p-2 rounded hover:bg-gray-50"
                        >
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100">
                            <ImageWithFallback
                              src={attendee.avatar}
                              alt={attendee.name}
                              className="w-12 h-12"
                              placeholderSrc="/default-avatar.svg"
                              emptyMessage="Profile image to be uploaded"
                            />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-gray-800">{attendee.name}</p>
                            {attendee.role && <p className="text-xs text-gray-500">{attendee.role}</p>}
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No attendees yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
