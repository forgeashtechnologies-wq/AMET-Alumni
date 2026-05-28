import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, onPostgresChangesOnce } from '../../utils/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import {
  CalendarIcon,
  ClockIcon,
  VideoCameraIcon,
  MapPinIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const SessionsCalendar = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming', 'past', 'all'
  const { user } = useAuth();
  const [isMentorAvailable, setIsMentorAvailable] = useState(true);
  const [hasFutureAvailability, setHasFutureAvailability] = useState(true);
  const [isCurrentUserMentor, setIsCurrentUserMentor] = useState(false);
  // Track component mount state
  const isMountedRef = useRef(true);
  
  // Handle session updates
  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);

      // Read sessions with mentorship request IDs and user IDs only
      const { data: rows, error } = await supabase
        .from('mentorship_sessions')
        .select(`
          *,
          mentorship_request:mentorship_request_id (
            id,
            mentor_id,
            mentee_id
          )
        `)
        .order('scheduled_time', { ascending: true });

      if (error) throw error;

      const mentorIds = Array.from(new Set((rows || []).map(r => r.mentorship_request?.mentor_id).filter(Boolean)));
      const menteeIds = Array.from(new Set((rows || []).map(r => r.mentorship_request?.mentee_id).filter(Boolean)));
      const ids = Array.from(new Set([...mentorIds, ...menteeIds]));

      let idMap = new Map();
      if (ids.length) {
        const { data: pubs } = await supabase
          .from('alumni_directory_public')
          .select('id, full_name, avatar_url')
          .in('id', ids);
        (pubs || []).forEach(p => idMap.set(p.id, p));
      }

      const hydrated = (rows || []).map(r => ({
        ...r,
        mentorship_request: r.mentorship_request ? {
          ...r.mentorship_request,
          mentor: idMap.get(r.mentorship_request.mentor_id) || { id: r.mentorship_request.mentor_id, full_name: 'Mentor', avatar_url: null },
          mentee: idMap.get(r.mentorship_request.mentee_id) || { id: r.mentorship_request.mentee_id, full_name: 'Mentee', avatar_url: null }
        } : null
      }));

      setSessions(hydrated);
    } catch (error) {
      logger.error('Error fetching mentorship sessions:', error);
      toast.error('Failed to load mentorship sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle session updates
  const handleSessionUpdate = useCallback((payload) => {
    if (!isMountedRef.current) return;
    logger.log('Realtime session update:', payload);
    fetchSessions(); // Refresh sessions when there are changes
  }, [fetchSessions]);
  
  useEffect(() => {
    if (!user) return;

    isMountedRef.current = true;
    fetchSessions();
    // Also fetch mentor availability hints
    (async () => {
      try {
        // Is current user a mentor?
        const { data: mentorRow } = await supabase
          .from('mentors')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();
        setIsCurrentUserMentor(!!mentorRow);

        if (mentorRow) {
          // Read global toggle from profiles
          const { data: prof } = await supabase
            .from('profiles')
            .select('is_available_for_mentorship')
            .eq('id', user.id)
            .maybeSingle();
          const available = !!(prof && prof.is_available_for_mentorship);
          setIsMentorAvailable(available);

          // If available, check mentor_availability for future rows
          const today = new Date();
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth() + 1).padStart(2, '0');
          const dd = String(today.getDate()).padStart(2, '0');
          const todayStr = `${yyyy}-${mm}-${dd}`;

          const { data: availRows } = await supabase
            .from('mentor_availability')
            .select('id')
            .eq('mentor_id', user.id)
            .gte('date', todayStr)
            .limit(1);
          setHasFutureAvailability(!!(availRows && availRows.length > 0));
        } else {
          setIsMentorAvailable(true);
          setHasFutureAvailability(true);
        }
      } catch (e) {
        logger.warn('Availability banner checks failed', e);
      }
    })();

    onPostgresChangesOnce(
      'mentorship_sessions_changes',
      'sessions-listener',
      {
        event: '*',
        schema: 'public',
        table: 'mentorship_sessions',
      },
      handleSessionUpdate
    );

    return () => {
      isMountedRef.current = false;
    };
  }, [user, fetchSessions, handleSessionUpdate]);
  
  const updateSessionStatus = async (sessionId, newStatus) => {
    try {
      const { error } = await supabase
        .from('mentorship_sessions')
        .update({ status: newStatus })
        .eq('id', sessionId);
        
      if (error) throw error;
      
      // Update local state
      setSessions(prevSessions => 
        prevSessions.map(session => 
          session.id === sessionId ? { ...session, status: newStatus } : session
        )
      );
      
      toast.success(`Session marked as ${newStatus}`);
    } catch (error) {
      logger.error(`Error updating session to ${newStatus}:`, error);
      toast.error('Failed to update session status');
    }
  };
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const isPastByEndTime = (scheduledTime, durationMinutes) => {
    const start = new Date(scheduledTime);
    const end = new Date(start.getTime() + (parseInt(durationMinutes || 0, 10) * 60 * 1000));
    return end < new Date();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Availability banners (non-blocking) */}
      {isCurrentUserMentor && !isMentorAvailable && (
        <div className="mb-3 p-3 rounded border border-yellow-300 bg-yellow-50 text-yellow-800 text-sm">
          You are unavailable. Turn availability ON in <strong>My Mentorship</strong> to publish bookable time.
        </div>
      )}
      {isCurrentUserMentor && isMentorAvailable && !hasFutureAvailability && (
        <div className="mb-3 p-3 rounded border border-blue-200 bg-blue-50 text-blue-800 text-sm">
          No upcoming slots. Add availability in <strong>My Mentorship</strong> to let mentees book time.
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Mentorship Sessions</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'upcoming'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'past'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Past
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={fetchSessions}
            className="px-3 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-md"
            title="Refresh sessions"
          >
            <ArrowPathIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-10">
          <CalendarIcon className="w-16 h-16 mx-auto text-gray-400" />
          <p className="mt-2 text-gray-500">
            {activeTab === 'upcoming'
              ? 'No upcoming mentorship sessions scheduled.'
              : activeTab === 'past'
              ? 'No past mentorship sessions found.'
              : 'No mentorship sessions found.'}
          </p>
          <p className="mt-1 text-gray-500">
            Use the scheduler to book new mentorship sessions.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions
            .filter((session) => {
              const isPast = isPastByEndTime(session.scheduled_time, session.duration_minutes);
              if (activeTab === 'upcoming') return !isPast;
              if (activeTab === 'past') return isPast;
              return true;
            })
            .map((session) => {
            const mentorProfile = session.mentorship_request?.mentor;
            const menteeProfile = session.mentorship_request?.mentee;
            const isPast = isPastByEndTime(session.scheduled_time, session.duration_minutes);
            
            return (
              <div 
                key={session.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                  <div className="flex items-center mb-2 md:mb-0 font-medium text-lg">Session</div>
                  
                  <div className="flex items-center">
                    <CalendarIcon className="w-5 h-5 text-gray-500 mr-1" />
                    <span className="font-medium">
                      {formatDate(session.scheduled_time)}
                    </span>
                    <span className="mx-2 text-gray-500">•</span>
                    <ClockIcon className="w-5 h-5 text-gray-500 mr-1" />
                    <span>
                      {formatTime(session.scheduled_time)} ({session.duration_minutes} min)
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Mentor</p>
                    <div className="flex items-center">
                      <img
                        src={mentorProfile?.avatar_url || '/default-avatar.svg'}
                        alt={mentorProfile?.full_name || 'Mentor'}
                        className="w-8 h-8 rounded-full mr-2"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/default-avatar.svg';
                        }}
                      />
                      <span>{mentorProfile?.full_name || 'Unknown'}</span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Mentee</p>
                    <div className="flex items-center">
                      <img
                        src={menteeProfile?.avatar_url || '/default-avatar.svg'}
                        alt={menteeProfile?.full_name || 'Mentee'}
                        className="w-8 h-8 rounded-full mr-2"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/default-avatar.svg';
                        }}
                      />
                      <span>{menteeProfile?.full_name || 'Unknown'}</span>
                    </div>
                  </div>
                </div>
                
                {/* Meeting details */}
                <div className="mt-4 border-t pt-3">
                  {session.meeting_url && (
                    <div className="mb-2">
                      <p className="text-sm text-gray-500 mb-1">Meeting Link</p>
                      <a
                        href={session.meeting_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {session.meeting_url}
                      </a>
                    </div>
                  )}
                  
                  {session.notes && (
                    <div className="mb-2">
                      <p className="text-sm text-gray-500 mb-1">Notes</p>
                      <p className="text-sm">{session.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SessionsCalendar;
