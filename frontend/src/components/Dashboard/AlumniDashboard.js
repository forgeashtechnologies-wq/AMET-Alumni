import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApproval } from '../../hooks/useApproval';
import { useNotification } from '../../hooks/useNotification'; // Import useAuth
import { Link, useLocation, useNavigate } from 'react-router-dom';
// Removed legacy useRecentActivity in favor of self-contained ActivitiesWidget
import { supabase } from '../../utils/supabase'; // Updated Supabase client import
import toast from 'react-hot-toast'; // For error notifications
import logger from '../../utils/logger';
import MyGroupsWidget from './MyGroupsWidget';
import { WelcomeGuide, QuickActions } from './WelcomeGuide';
import { 
  UsersIcon, 
  CalendarIcon, 
  BriefcaseIcon,
  AcademicCapIcon,
  ChatBubbleLeftRightIcon,
  ArrowTrendingUpIcon,
  DocumentIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';


// Minimal loading spinner for initial page load
const PageLoadingSpinner = ({ message = 'Loading dashboard...' }) => (
  <div className="flex items-center justify-center min-h-[300px]" role="status" aria-live="polite">
    <div className="flex flex-col items-center gap-3">
      <div className="spinner spinner-lg" aria-hidden="true" />
      <p className="text-sm text-gray-500 font-medium">{message}</p>
      <span className="sr-only">Loading dashboard content...</span>
    </div>
  </div>
);

// Helper function to format relative time (simplified)
const formatRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} days ago`;
};

// Helper function to format event date and time
const formatEventDateTime = (dateString, timeString) => {
  const date = new Date(dateString);
  if (timeString) {
    const [hours, minutes] = timeString.split(':');
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Removed legacy renderActivityTitle; ActivitiesWidget handles its own copy

const AlumniDashboard = () => {
  const { showInfo } = useNotification();
  const { user, profile, loading: authLoading, userRole, getUserRole, approvalStatus: authApprovalStatus, isFullyApproved } = useAuth();
  const { loading: approvalLoading, isPending, approvalStatus, isAdminLike, approvalFlags } = useApproval();
  const location = useLocation();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    personalConnections: 0,
    totalAlumni: 0,
    upcomingEventsCount: 0,
    jobOpportunitiesCount: 0,
    unreadMessagesCount: 0,
    recentActivities: [],
    upcomingEventsList: [],
    jobRecommendationsList: [],
  });
  const [loading, setLoading] = useState(true);
  const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email || 'Alumni';
  const hasFetched = useRef(false);
  const role = userRole || (profile?.role || (typeof getUserRole === 'function' ? getUserRole() : 'alumni'));
  const isEmployer = role === 'employer';
  const isStudent = role === 'student';
  const isAdmin = role === 'admin' || role === 'super_admin';
  const effectiveApprovalStatus = authApprovalStatus || approvalFlags?.approvalStatus || approvalStatus;
  const isTrulyPending = effectiveApprovalStatus === 'pending';
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Recent Activity now fully handled by <ActivitiesWidget />

  // Improved promiseWithTimeout with retry capability
  const promiseWithTimeout = useCallback((promise, ms, maxRetries = 2, timeoutError = new Error('Request timed out')) => {
    // First check if the input is a promise
    if (!promise || typeof promise.then !== 'function') {
      logger.error('Invalid promise passed to promiseWithTimeout:', promise);
      return Promise.resolve(promise); // Return a resolved promise with the value
    }
    
    // Function to create a timeout promise
    const createTimeout = () => new Promise((_, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        reject(timeoutError);
      }, ms);
    });
    
    // Function to attempt the promise with timeout and retry logic
    const attemptWithRetry = (retriesLeft) => {
      // Log retries
      if (maxRetries - retriesLeft > 0) {
        logger.log(`Retrying API call, attempt ${maxRetries - retriesLeft + 1} of ${maxRetries + 1}`);
      }
      
      return Promise.race([
        // Add catch handler safely to the promise to avoid unhandled rejections
        promise.then(result => result, err => {
          // If we have retries left and this is a network error or 429 (too many requests)
          if (retriesLeft > 0 && (err.message?.includes('network') || err.status === 429)) {
            logger.warn('Request failed, retrying...', err);
            // Exponential backoff - wait longer for each retry
            const backoffTime = 1000 * Math.pow(2, maxRetries - retriesLeft);
            return new Promise(resolve => {
              setTimeout(() => resolve(attemptWithRetry(retriesLeft - 1)), backoffTime);
            });
          }
          logger.error('Promise error:', err);
          throw err;
        }),
        createTimeout()
      ]);
    };
    
    return attemptWithRetry(maxRetries);
  }, []);

  const fetchConnectionsCount = useCallback(async (userId) => {
    if (!userId) return 0;
    try {
      const { count, error } = await supabase
        .from('connections')
        .select('id', { count: 'exact', head: true })
        .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
        .eq('status', 'accepted');

      if (error) {
        throw error;
      }
      return count || 0;
    } catch (error) {
      logger.error('Error counting connections:', error);
      return 0;
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;
    logger.log('AlumniDashboard: fetchDashboardData started.');
    if (!isMountedRef.current) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('get_dashboard_summary_for_user', {
        p_user_id: user.id,
      });

      if (error) {
        logger.error('Error fetching dashboard summary:', error);
        toast.error('Failed to load dashboard data. Please try again.');
        return;
      }

      if (!data) {
        logger.warn('Dashboard summary RPC returned no data');
        return;
      }

      const counts = data.counts || {};

      if (isMountedRef.current) {
        setDashboardData(prev => ({
          ...prev,
          totalAlumni: counts.total_alumni ?? 0,
          personalConnections: counts.my_connections ?? 0,
          upcomingEventsCount: counts.upcoming_events ?? 0,
          jobOpportunitiesCount: counts.active_jobs ?? 0,
          unreadMessagesCount: counts.unread_messages ?? 0,
          upcomingEventsList: Array.isArray(data.upcoming_events_list) ? data.upcoming_events_list : [],
          jobRecommendationsList: Array.isArray(data.recommended_jobs_list) ? data.recommended_jobs_list : [],
        }));
      }
    } catch (error) {
      logger.error('Error fetching dashboard data:', error);
      if (error.message && error.message.includes('timeout')) {
        toast.error('Dashboard data is taking longer than expected to load. Some features may be limited.');
      } else if (error.message && error.message.includes('network')) {
        toast.error('Network issue detected. Please check your connection and try again.');
      } else {
        toast.error('Failed to load some dashboard data. Please try refreshing the page.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [user?.id]);

  const checkEventReminders = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const lastCheck = localStorage.getItem(`lastEventCheck_${userId}`);
      const now = new Date();
      if (lastCheck && now.toDateString() === new Date(lastCheck).toDateString()) {
        return;
      }

      const { data: registrations, error: regError } = await supabase
        .from('event_attendees')
        .select('event_id')
        .eq('attendee_id', userId);

      if (regError) throw regError;
      if (!registrations || registrations.length === 0) {
        return;
      }

      const eventIds = registrations.map(reg => reg.event_id);

      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, title, start_date, start_time')
        .in('id', eventIds);

      if (eventsError) throw eventsError;

      const upcomingEvents = events.filter(event => {
        if (!event) return false;
        const eventDate = new Date(`${event.start_date}T${event.start_time || '00:00:00'}`);
        const diffHours = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        return diffHours > 0 && diffHours <= 24;
      });

      if (upcomingEvents.length > 0) {
        const eventTitles = upcomingEvents.map(e => e.title).join(', ');
        const message = `Reminder: You have upcoming events within 24 hours: ${eventTitles}.`;
        showInfo(message, {
          duration: 10000,
          onClick: () => navigate('/events/my-registrations'),
          className: 'cursor-pointer',
        });
      }

      localStorage.setItem(`lastEventCheck_${userId}`, now.toISOString());
    } catch (error) {
      logger.error('Error checking event reminders:', error);
    }
  }, [showInfo, navigate]);

  useEffect(() => {
    if (user?.id && !authLoading && !hasFetched.current) {
      hasFetched.current = true;
      fetchDashboardData();
      checkEventReminders(user.id);
    } else if (!authLoading) {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [user?.id, authLoading, fetchDashboardData, checkEventReminders]);

  useEffect(() => {
    if (location.state?.showToast) {
      toast.success(location.state.message);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  if (authLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <PageLoadingSpinner message="Loading your dashboard..." />
        </div>
      </div>
    );
  }

  return (
    <main id="main-content" className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Welcome back, {userName}!</h1>
        
        {/* Browse-only banner for pending, not-fully-approved users */}
        {!approvalLoading && approvalFlags && userRole !== 'employer' && !isAdminLike && isTrulyPending && !isFullyApproved && (
          <div className="mb-6 alert alert-warning" role="alert">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-semibold text-amber-800">Account Pending Approval</h3>
                <p className="mt-1 text-sm text-amber-700">
                  Your account is under review. You can browse the platform, but some actions are disabled until approval.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Welcome Guide for first-time users - helps reduce cognitive load */}
        <WelcomeGuide className="mb-6" />

        {/* Quick Actions - simplified primary actions (max 3) */}
        <QuickActions className="mb-6 md:hidden" />

        {loading ? (
          <div className="flex items-center justify-center py-8 mb-6" role="status">
            <div className="spinner spinner-md" aria-hidden="true" />
            <span className="sr-only">Loading stats...</span>
          </div>
        ) : (
          <React.Fragment>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 page-enter">
              {/* Total Alumni */}
              <div className="glass-card p-4 flex items-center">
                <div className="bg-ocean-100 rounded-full p-3 mr-4">
                  <UsersIcon className="w-6 h-6 text-ocean-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Alumni</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardData.totalAlumni}
                  </p>
                </div>
              </div>

              {/* Upcoming Events */}
              <div className="glass-card p-4 flex items-center">
                <div className="bg-green-100 rounded-full p-3 mr-4">
                  <CalendarIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Upcoming Events</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardData.upcomingEventsCount}</p>
                </div>
              </div>

              {/* Job Opportunities */}
              <div className="glass-card p-4 flex items-center">
                <div className="bg-orange-100 rounded-full p-3 mr-4">
                  <BriefcaseIcon className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Job Opportunities</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardData.jobOpportunitiesCount}</p>
                </div>
              </div>

              {/* Personal Connections */}
              <div className="glass-card p-4 flex items-center">
                <div className="bg-purple-100 rounded-full p-3 mr-4">
                  <UsersIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Connections</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardData.personalConnections}</p>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Left Column: Widgets */}
              <div className="lg:col-span-2 space-y-6">
                {/* My Groups - Widget */}
                <MyGroupsWidget />
              </div>

              {/* Right Column: Upcoming Events and Job Recommendations */}
              <div className="space-y-6">
                {/* Upcoming Events */}
                <div className="glass-card rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h3>
                  <div className="space-y-3">
                    {dashboardData.upcomingEventsList.length > 0 ? dashboardData.upcomingEventsList.map((event) => (
                      <Link to={`/events/${event.id}`} key={event.id} className="block p-3 bg-blue-50 rounded-lg hover:bg-blue-100">
                        <h4 className="font-medium text-gray-900 text-sm">{event.title}</h4>
                        <p className="text-xs text-gray-600">{event.location}</p>
                        <p className="text-xs text-blue-600 font-medium">{formatEventDateTime(event.start_date, event.start_time)}</p>
                      </Link>
                    )) : 
                    <div className="text-center py-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CalendarIcon className="w-6 h-6 text-blue-400" />
                      </div>
                      <h4 className="text-md font-semibold text-gray-700">No Upcoming Events</h4>
                      <p className="text-sm text-gray-500 mt-1">Check the events page for new listings.</p>
                    </div>}
                  </div>
                  <div className="mt-4">
                    <Link 
                      to="/events" 
                      className="btn-ocean-outline w-full py-2 px-4 rounded-lg text-center block text-sm"
                    >
                      View All Events
                    </Link>
                  </div>
                </div>

                {/* Job Recommendations */}
                {!isEmployer && (
                <div className="glass-card rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Jobs</h3>
                  <div className="space-y-3">
                    {dashboardData.jobRecommendationsList.length > 0 ? dashboardData.jobRecommendationsList.map((job) => (
                      <Link to={`/jobs/${job.id}`} key={job.id} className="block p-3 bg-green-50 rounded-lg hover:bg-green-100">
                        <h4 className="font-medium text-gray-900 text-sm">{job.title}</h4>
                        <p className="text-xs text-gray-600">{job.company_name} - {job.location}</p>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-xs text-green-600 font-medium">{job.salary_range || 'Not specified'}</p>
                          <p className="text-xs text-gray-500">{formatRelativeTime(job.created_at)}</p>
                        </div>
                      </Link>
                    )) :                   <div className="text-center py-4">
                      <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <BriefcaseIcon className="w-6 h-6 text-green-400" />
                      </div>
                      <h4 className="text-md font-semibold text-gray-700">No Recommended Jobs</h4>
                      <p className="text-sm text-gray-500 mt-1">Explore the job portal for opportunities.</p>
                    </div>}
                  </div>
                  <div className="mt-4 flex flex-col space-y-2">
                    <Link 
                      to="/jobs" 
                      className="btn-ocean-outline w-full py-2 px-4 rounded-lg text-center block text-sm"
                    >
                      Browse All Jobs
                    </Link>
                    <Link 
                      to="/my-applications" 
                      className="text-ocean-600 hover:text-ocean-800 text-center block text-sm"
                    >
                      View My Applications
                    </Link>
                  </div>
                </div>
                )}

                
              </div>
            </div>
          </React.Fragment>
        )}
      </div> {/* This closes the main grid <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"> */}
      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/directory" className="glass-card rounded-lg p-4 text-center card-hover">
          <UsersIcon className="w-8 h-8 text-ocean-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-900">Find Alumni</p>
        </Link>
        {!isStudent && (
          <Link to="/events/create" className="glass-card rounded-lg p-4 text-center card-hover">
            <CalendarIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Create Event</p>
          </Link>
        )}

        <Link to="/my-applications" className="glass-card rounded-lg p-4 text-center card-hover">
          <ClipboardDocumentCheckIcon className="w-8 h-8 text-orange-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-900">My Applications</p>
        </Link>
        <Link to="/mentorship" className="glass-card rounded-lg p-4 text-center card-hover">
          <AcademicCapIcon className="w-8 h-8 text-purple-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-900">Find Mentor</p>
        </Link>
        <Link to="/groups" className="glass-card rounded-lg p-4 text-center card-hover">
          <ChatBubbleLeftRightIcon className="w-8 h-8 text-orange-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-900">Join Groups</p>
        </Link>
        {isAdmin && (
          <Link
            to="/admin/mentor-approvals"
            className="glass-card rounded-lg p-4 text-center card-hover border border-ocean-200 bg-ocean-50/60"
          >
            <AcademicCapIcon className="w-8 h-8 text-ocean-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-900">Mentorship Admin</p>
            <p className="mt-1 text-xs text-gray-600">Review & approve mentors</p>
          </Link>
        )}
      </div>
    </main>
  );
};

export default AlumniDashboard;