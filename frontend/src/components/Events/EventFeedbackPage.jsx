/**
 * EventFeedbackPage - Standalone page for submitting event feedback
 * Wraps EventFeedbackForm with event context and navigation
 */
import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useEvent, useMyRsvp, useEventComputedFlags } from '../../hooks/useEventData';
import { useAuth } from '../../contexts/AuthContext';
import EventFeedbackForm from './EventFeedbackForm';
import LoadingSpinner from '../common/LoadingSpinner';

export default function EventFeedbackPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { data: event, isLoading: eventLoading } = useEvent(id);
  const { data: myRsvp, isLoading: rsvpLoading } = useMyRsvp(id);
  const { eventEnded } = useEventComputedFlags(event);
  
  const isLoading = eventLoading || rsvpLoading;
  
  // Check if user is an attendee
  const rsvpStatus = myRsvp?.attendance_status?.toLowerCase() || '';
  const isAttendee = ['going', 'attended', 'checked_in', 'attending'].includes(rsvpStatus);
  
  if (isLoading) {
    return <LoadingSpinner message="Loading event..." />;
  }
  
  if (!event) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Event Not Found</h2>
          <p className="text-red-600 mb-4">The event you're looking for doesn't exist or has been removed.</p>
          <Link to="/events" className="text-ocean-600 hover:underline">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">Login Required</h2>
          <p className="text-yellow-600 mb-4">Please log in to submit feedback for this event.</p>
          <Link to="/login" state={{ from: `/events/${id}/feedback` }} className="text-ocean-600 hover:underline">
            Log in
          </Link>
        </div>
      </div>
    );
  }
  
  if (!isAttendee) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">Feedback Restricted</h2>
          <p className="text-yellow-600 mb-4">Only attendees who registered for this event can submit feedback.</p>
          <Link to={`/events/${id}`} className="text-ocean-600 hover:underline">
            View Event Details
          </Link>
        </div>
      </div>
    );
  }
  
  if (!eventEnded) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">Feedback Not Yet Available</h2>
          <p className="text-blue-600 mb-4">Feedback can only be submitted after the event has ended.</p>
          <Link to={`/events/${id}`} className="text-ocean-600 hover:underline">
            View Event Details
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Back navigation */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 mb-6 px-3 py-2 rounded-lg text-ocean-600 hover:bg-ocean-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 transition-colors"
      >
        <ArrowLeftIcon className="w-5 h-5" />
        <span className="text-sm font-medium">Back</span>
      </button>
      
      {/* Event header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{event.title}</h1>
        <p className="text-gray-600">Share your feedback to help us improve future events</p>
      </div>
      
      {/* Feedback form */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <EventFeedbackForm
          eventId={id}
          eventTitle={event.title}
          onSuccess={() => {
            // Navigate back to event detail after successful submission
            setTimeout(() => navigate(`/events/${id}`), 2000);
          }}
        />
      </div>
    </div>
  );
}
