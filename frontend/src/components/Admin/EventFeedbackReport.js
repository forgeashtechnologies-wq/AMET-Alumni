import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { ArrowLeft, Star, MessageSquare, Download } from 'lucide-react';
import logger from '../../utils/logger';
import { format, parseISO } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

const EventFeedbackReport = () => {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFeedbackData = useCallback(async () => {
    try {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('title')
        .eq('id', id)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Pull detailed fields and join profile; order latest first
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('event_feedback')
        .select(`
          id,
          user_id,
          event_id,
          created_at,
          updated_at,
          rsvp_status,
          overall_rating,
          content_rating,
          speakers_rating,
          logistics_rating,
          venue_rating,
          communication_rating,
          worked_well,
          could_improve,
          future_suggestions,
          interest_level,
          comments,
          comment,
          profiles:user_id(full_name, avatar_url)
        `)
        .eq('event_id', id)
        .order('created_at', { ascending: false });
      
      if (feedbackError) throw feedbackError;
      let rows = feedbackData || [];

      // Backfill RSVP status for legacy rows without rsvp_status
      const missing = rows.filter(r => !r.rsvp_status).map(r => r.user_id);
      if (missing.length > 0) {
        const { data: att } = await supabase
          .from('event_attendees')
          .select('user_id, attendance_status')
          .eq('event_id', id)
          .in('user_id', Array.from(new Set(missing)));
        const { data: rsvps } = await supabase
          .from('event_rsvps')
          .select('user_id, attendance_status')
          .eq('event_id', id)
          .in('user_id', Array.from(new Set(missing)));
        const map = new Map();
        (att || []).forEach(a => map.set(a.user_id, a.attendance_status));
        (rsvps || []).forEach(r => { if (!map.has(r.user_id)) map.set(r.user_id, r.attendance_status); });
        rows = rows.map(r => (r.rsvp_status ? r : { ...r, rsvp_status: map.get(r.user_id) || null }));
      }

      setFeedback(rows);

    } catch (err) {
      logger.error("Error fetching feedback data:", err);
      setError('Failed to fetch feedback data.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchFeedbackData();
  }, [fetchFeedbackData]);

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-center p-4 text-red-500">{error}</div>;

  return (
    <div className="container mx-auto p-6">
      <Link to={`/events/${id}`} className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Event
      </Link>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Feedback for {event?.title}</h1>
          <p className="text-lg text-gray-600">A total of {feedback.length} feedback entries received.</p>
        </div>
        <button
          onClick={async () => {
            try {
              const { data, error } = await supabase.rpc('admin_get_event_feedback_csv', { p_event_id: id });
              if (error) throw error;
              const blob = new Blob([data || ''], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `event_${id}_feedback.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            } catch (e) {
              logger.error('CSV export failed', e);
              alert('Failed to export CSV');
            }
          }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-ocean-600 text-white hover:bg-ocean-700"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>
      <div className="h-4" />

      <div className="space-y-4">
        {feedback.length > 0 ? (
          feedback.map((item) => {
            const overall = Number(item.overall_rating) || 0;
            const istZone = 'Asia/Kolkata';
            const createdAt = item.created_at
              ? format(utcToZonedTime(parseISO(item.created_at), istZone), 'MMM d, yyyy • h:mm a')
              : null;
            const primaryComment = item.worked_well || item.comments || item.comment || '';
            return (
              <div key={item.id} className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <img
                      src={item.profiles?.avatar_url || `https://api.dicebear.com/6.x/initials/svg?seed=${encodeURIComponent(item.profiles?.full_name || 'A')}`}
                      alt={item.profiles?.full_name}
                      className="w-10 h-10 rounded-full mr-3"
                    />
                    <div>
                      <div className="font-semibold leading-tight">{item.profiles?.full_name || 'Anonymous'}</div>
                      {createdAt && <div className="text-xs text-gray-400">{createdAt} IST</div>}
                    </div>
                  </div>
                  {item.interest_level && (
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">Interest: {item.interest_level.replace('_',' ')}</span>
                  )}
                </div>

                {/* Overall rating */}
                <div className="flex items-center my-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-5 h-5 ${i < overall ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" />
                  ))}
                  <span className="ml-2 text-gray-600">({overall}/5)</span>
                </div>

                {/* Category ratings */}
                <div className="flex flex-wrap gap-2 text-xs text-gray-700 mt-2">
                  {item.content_rating != null && (<span className="px-2 py-1 bg-gray-100 rounded">Content: {item.content_rating}/5</span>)}
                  {item.speakers_rating != null && (<span className="px-2 py-1 bg-gray-100 rounded">Speakers: {item.speakers_rating}/5</span>)}
                  {item.logistics_rating != null && (<span className="px-2 py-1 bg-gray-100 rounded">Logistics: {item.logistics_rating}/5</span>)}
                  {item.venue_rating != null && (<span className="px-2 py-1 bg-gray-100 rounded">Venue: {item.venue_rating}/5</span>)}
                  {item.communication_rating != null && (<span className="px-2 py-1 bg-gray-100 rounded">Communication: {item.communication_rating}/5</span>)}
                </div>

                {/* Text feedback */}
                {primaryComment && (
                  <div className="mt-3 text-gray-800">
                    <div className="flex items-center gap-2 mb-1 text-gray-600 text-sm"><MessageSquare className="w-4 h-4"/> What worked well</div>
                    <p className="pl-1 whitespace-pre-wrap">{item.worked_well}</p>
                  </div>
                )}
                {item.could_improve && (
                  <div className="mt-3 text-gray-800">
                    <div className="flex items-center gap-2 mb-1 text-gray-600 text-sm"><MessageSquare className="w-4 h-4"/> What could be improved</div>
                    <p className="pl-1 whitespace-pre-wrap">{item.could_improve}</p>
                  </div>
                )}
                {item.future_suggestions && (
                  <div className="mt-3 text-gray-800">
                    <div className="flex items-center gap-2 mb-1 text-gray-600 text-sm"><MessageSquare className="w-4 h-4"/> Suggestions for future events</div>
                    <p className="pl-1 whitespace-pre-wrap">{item.future_suggestions}</p>
                  </div>
                )}

                {/* Legacy comments fallbacks */}
                {!item.worked_well && (item.comments || item.comment) && (
                  <div className="mt-3 text-gray-800">
                    <div className="flex items-center gap-2 mb-1 text-gray-600 text-sm"><MessageSquare className="w-4 h-4"/> Comment</div>
                    <p className="pl-1 whitespace-pre-wrap">{item.comments || item.comment}</p>
                  </div>
                )}

                {/* RSVP Status & footer */}
                <div className="mt-3 text-xs text-gray-500">RSVP Status: {item.rsvp_status || '—'}</div>
              </div>
            );
          })
        ) : (
          <p>No feedback has been submitted for this event yet.</p>
        )}
      </div>
    </div>
  );
};

export default EventFeedbackReport;
