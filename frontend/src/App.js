import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RealtimeProvider } from './utils/supabase';
import { Toaster } from 'react-hot-toast';
import './App.css';
import logger from './utils/logger';

// Context
import { useAuth, AuthProvider } from './contexts/AuthContext';

// Common Components
import Logo from './components/common/Logo';

// Home Page
import HomePage from './components/Landing/HomePage';

// Notifications Component - Use NotificationsPage (canonical) instead of legacy Notifications.js
import NotificationsPage from './components/Notifications/NotificationsPage';
import { NotificationProvider } from './components/common/NotificationCenter';
import FeedbackWidget from './components/common/FeedbackWidget';

// Layout Components
import Navigation from './components/Layout/Navigation';
import Header from './components/Layout/Header';
import EditEvent from './components/Events/EditEvent';
import CreateEvent from './components/Events/CreateEvent';
import EventFeedbackReport from './components/Admin/EventFeedbackReport';
import EventFeedbackPage from './components/Events/EventFeedbackPage';
import MyRegistrationsList from './components/Events/MyRegistrationsList';

import AuthListener from './components/Auth/AuthListener';
import Login from './components/Auth/Login';
import EnhancedRegister from './components/Auth/EnhancedRegister';
import Profile from './components/Auth/Profile';
import ForgotPassword from './components/Auth/ForgotPassword';
import UpdatePassword from './components/Auth/UpdatePassword';
import AuthCallback from './components/Auth/AuthCallback';
import LoadingSpinner from './components/common/LoadingSpinner';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import AccessDenied from './components/Auth/AccessDenied';
import RejectionPage from './components/Auth/RejectionPage';

// Dashboard Components
import AlumniDashboard from './components/Dashboard/AlumniDashboard';
// Always use the production dashboard for all roles


// Feature Components
import DirectoryPage from './components/Directory/DirectoryPage';
import ProfileCompletion from './components/Auth/ProfileCompletion';
import AlumniProfile from './components/Directory/AlumniProfile';
import EventsPage from './pages/EventsPage';
import GroupsPage from './pages/GroupsPage';
import GroupManage from './pages/GroupManage';
import RequireGroupAdmin from './routes/RequireGroupAdmin';
import JobListingsPage from './components/Jobs/JobListingsPage';
import JobDetails from './components/Jobs/JobDetails';
import BookmarkedJobs from './components/Jobs/BookmarkedJobs';
import UserProfilePage from './pages/UserProfilePage';
import CompanyProfile from './components/Companies/CompanyProfile';
import PublicCompanyProfile from './components/Companies/PublicCompanyProfile';
import CSVImportExport from './components/Admin/CSVImportExport';
import EditCompanyProfile from './components/Companies/EditCompanyProfile';
import MentorRegistrationForm from './components/Mentorship/MentorRegistrationForm';
import PostJob from './components/Jobs/PostJob';
import PostJobSelection from './components/Jobs/PostJobSelection';
import PostJobWithLink from './components/Jobs/PostJobWithLink';
import JobAlerts from './components/Jobs/JobAlerts';
import Messages from './components/Messages/Messages';
import ResumeUploadForm from './components/Jobs/ResumeUploadForm';
// REMOVED: JobApplication - legacy direct-insert component, use ApplyDialog via JobDetailsInApp instead
import ApplicationTracking from './components/Jobs/ApplicationTracking';
import EditJob from './components/Jobs/EditJob';
import Mentorship from './components/Mentorship/Mentorship';
// New mentorship module components
import MentorshipLayout from './components/Mentorship/MentorshipLayout';
import FindMentorsPage from './pages/mentorship/FindMentorsPage';
import MyRequestsPage from './pages/mentorship/MyRequestsPage';
import RequestsToMePage from './pages/mentorship/RequestsToMePage';
import MyMentorshipPage from './pages/mentorship/MyMentorshipPage';
// import NetworkingGroups from './components/Networking/NetworkingGroups';
// import NetworkingGroupsDirectory from './components/NetworkingGroups/NetworkingGroupsDirectory';
// import NetworkingGroupDetail from './components/NetworkingGroups/NetworkingGroupDetail';
import BecomeMentorForm from './components/Mentorship/BecomeMentorForm';
import MentorProfile from './components/Mentorship/MentorProfile';
import MentorSettings from './components/Mentorship/MentorSettings';
import Analytics from './components/Admin/Analytics';
import AdminGate from './components/Admin/AdminGate';
import UserManagement from './components/Admin/UserManagement';

import AdminSettings from './components/Admin/AdminSettings';
import AdminUsersPage from './components/Admin/users/AdminUsersPage';
import FeedbackReport from './components/Admin/FeedbackReport';
import ActivityLogs from './components/Admin/ActivityLogs';
import EventModerationPanel from './components/Events/EventModerationPanel';
import MenteeRegistrationForm from './components/Mentorship/MenteeRegistrationForm';
import JobApplicationStatus from './components/Jobs/JobApplicationStatus';
import ManageJobApplications from './components/Jobs/ManageJobApplications';
import MentorshipStatus from './components/Mentorship/MentorshipStatus';
import ApprovedGuard from './components/guards/ApprovedGuard.jsx';
import AdminMentorApprovals from './components/Mentorship/AdminMentorApprovals.js';
import DataVerificationDashboard from './components/Admin/DataVerificationDashboard.jsx';
import DataTools from './components/Admin/DataTools.jsx';
import AdminGroupsPage from './pages/AdminGroupsPage';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import AboutPage from './pages/AboutPage';
import Security from './pages/Profile/Security';
import RequireCompleteProfile from './components/Auth/RequireCompleteProfile.jsx';
import MyMentorship from './components/Mentorship/MyMentorship.js';
import HelpCenter from './pages/HelpCenter';
import MentorshipInfo from './pages/MentorshipInfo';
import BlockedUserBanner from './components/common/BlockedUserBanner';
import ContactUs from './pages/ContactUs';
import NotificationSettings from './pages/Settings/NotificationSettings';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

// Parameter-aware redirect for legacy /jobs/:jobId/apply route
// Redirects to job details page since in-app applications are handled via ApplyDialog
const JobApplyRedirect = () => {
  const { jobId } = useParams();
  return <Navigate to={`/jobs/${jobId}`} replace />;
};

function AppContent() {
  const { user, profile, loading, getUserRole, rejectionStatus, isReadOnlyAccount, isBlocked } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // This effect handles the crucial post-login redirect.
  // When the `user` object becomes available (meaning login was successful and context is updated)
  // and the user is still on the login page, we programmatically redirect them.
  useEffect(() => {
    if (user && location.pathname === '/login') {
      logger.info('User authenticated, redirect to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [user, location.pathname, navigate]);

  // Simple logging of app state
  useEffect(() => {
    logger.info('App state changed');
  }, [loading, user, profile, getUserRole]);

  // Onboarding retired: no gating redirects here
  useEffect(() => {
    // No-op
  }, []);


  const lastPathRef = React.useRef(null);
  const getDashboardComponent = () => {
    // Force Production Dashboard for all roles
    const nextPath = window.location.pathname;
    if (lastPathRef.current !== nextPath) {
      logger.info('DEBUG DASHBOARD SELECTION');
      lastPathRef.current = nextPath;
    }
    return <AlumniDashboard user={profile || user} />;
  };

  // Check if user is rejected - if so, we'll only render the RejectionPage
  const { isRejected } = rejectionStatus;
  const showReadOnlyBanner = !loading && !!profile && isReadOnlyAccount;

  // Special handling for rejection page - no navigation, header or main app
  if (user && isRejected) {
    return (
      <Routes>
        <Route path="*" element={<Navigate to="/rejection" />} />
        <Route path="/rejection" element={<RejectionPage />} />
      </Routes>
    );
  }

  // If loading, show a minimal spinner and wait for auth to resolve
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ocean-50 to-ocean-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner spinner-lg" aria-hidden="true" />
          <p className="text-sm text-gray-600 font-medium">Initializing...</p>
        </div>
      </div>
    );
  }

  // After loading, render routes based on user authentication
  return user ? (
    <div className="flex vh-100dvh safe-top safe-bottom bg-ocean-50">
      {/* Skip link for keyboard users - a11y */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      {/* Blocked user banner - fixed at top */}
      <BlockedUserBanner />
      <Navigation user={profile || user} />
      <div className={`flex-1 flex flex-col overflow-hidden min-w-0 ${isBlocked ? 'pt-16' : ''}`}>
        <Header user={profile || user} />
        <main 
          id="main-content" 
          className="flex-1 overflow-x-hidden overflow-y-auto bg-gradient-to-br from-ocean-50 to-ocean-100 p-4 sm:p-5 md:p-6 lg:p-8"
          role="main"
          aria-label="Main content"
          tabIndex={-1}
        >
          {showReadOnlyBanner && !isBlocked && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Your account is currently in read-only mode. You can view your past activity but cannot perform new actions. Contact your administrator for more information.
            </div>
          )}
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/complete-profile" element={<ProfileCompletion />} />
            <Route path="/dashboard" element={
              <RequireCompleteProfile>
                <ProtectedRoute requiredPermission="access:dashboard">{getDashboardComponent()}</ProtectedRoute>
              </RequireCompleteProfile>
            } />
            <Route path="/profile" element={<RequireCompleteProfile><ProtectedRoute requiredPermission="access:profile_settings"><Profile user={profile || user} /></ProtectedRoute></RequireCompleteProfile>} />
            {/* Security settings and password management */}
            <Route path="/profile/security" element={<ProtectedRoute requiredPermission="access:profile_settings"><Security /></ProtectedRoute>} />
            <Route path="/settings/notifications" element={<ProtectedRoute requiredPermission="access:profile_settings"><NotificationSettings /></ProtectedRoute>} />
            {/* Allow password update page for logged-in users too (e.g., via header button) */}
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/companies/:id" element={<PublicCompanyProfile />} />
            <Route path="/company/edit" element={<ProtectedRoute requiredPermission="manage:company_profile"><EditCompanyProfile user={profile || user} /></ProtectedRoute>} />
            <Route path="/events/*" element={<RequireCompleteProfile><ProtectedRoute requiredPermission="access:events"><EventsPage /></ProtectedRoute></RequireCompleteProfile>} />
            <Route path="/events/my-registrations" element={<RequireCompleteProfile><ProtectedRoute requiredPermission="access:events"><MyRegistrationsList /></ProtectedRoute></RequireCompleteProfile>} />
            <Route path="/events/edit/:id" element={<ProtectedRoute requiredPermission="events:create"><EditEvent /></ProtectedRoute>} />
            <Route path="/events/create" element={<ProtectedRoute requiredPermission="events:create"><CreateEvent /></ProtectedRoute>} />
            <Route path="/events/new" element={<ProtectedRoute requiredPermission="events:create"><CreateEvent /></ProtectedRoute>} />
            <Route path="/events/:id/feedback" element={<ProtectedRoute requiredPermission="access:events"><EventFeedbackPage /></ProtectedRoute>} />
            <Route path="/admin/events/:id/feedback" element={<ProtectedRoute requiredPermission="access:all"><EventFeedbackReport /></ProtectedRoute>} />
            <Route path="/admin/events/moderation" element={<ProtectedRoute requiredPermission="access:all"><EventModerationPanel /></ProtectedRoute>} />
            <Route path="/jobs" element={<RequireCompleteProfile><ProtectedRoute requiredPermission="view:jobs"><JobListingsPage /></ProtectedRoute></RequireCompleteProfile>} />
            <Route path="/jobs/alerts" element={<ProtectedRoute requiredPermission="view:jobs"><JobAlerts /></ProtectedRoute>} />
            <Route path="/jobs/post" element={<ApprovedGuard require="approved-employer" skeleton={<div/>}><ProtectedRoute requiredPermission="post:jobs"><PostJob /></ProtectedRoute></ApprovedGuard>} />
            <Route path="/jobs/post/select" element={<ApprovedGuard require="approved-employer" skeleton={<div/>}><ProtectedRoute requiredPermission="post:jobs"><PostJobSelection /></ProtectedRoute></ApprovedGuard>} />
            <Route path="/jobs/post/link" element={<ApprovedGuard require="approved-employer" skeleton={<div/>}><ProtectedRoute requiredPermission="post:jobs"><PostJobWithLink /></ProtectedRoute></ApprovedGuard>} />
            {/* Legacy create route now redirects to canonical PostJob */}
            <Route path="/jobs/create" element={<Navigate to="/jobs/post" replace />} />
            <Route path="/jobs/applications" element={<ProtectedRoute requiredPermission="apply:jobs"><ApplicationTracking /></ProtectedRoute>} />
            <Route path="/jobs/applications/:id" element={<ProtectedRoute requiredPermission="apply:jobs"><ApplicationTracking /></ProtectedRoute>} />
            <Route path="/jobs/:jobId/apply" element={<JobApplyRedirect />} />
            <Route path="/jobs/:jobId/application-success" element={<Navigate to="/jobs/applications" />} />
            <Route path="/jobs/:id" element={<ProtectedRoute requiredPermission="view:jobs"><JobDetails /></ProtectedRoute>} />
            {/* Support canonical edit route used by details components */}
            <Route path="/jobs/:id/edit" element={<ProtectedRoute requiredPermission="post:jobs"><EditJob /></ProtectedRoute>} />
            {/* Backward-compat legacy edit route */}
            <Route path="/jobs/edit/:id" element={<ProtectedRoute requiredPermission="post:jobs"><EditJob /></ProtectedRoute>} />

            <Route path="/jobs/:jobId/manage" element={<ProtectedRoute requiredPermission="view:job_applications"><ManageJobApplications /></ProtectedRoute>} />
            <Route path="/jobs/:id/applications" element={<ProtectedRoute requiredPermission="view:job_applications"><ManageJobApplications /></ProtectedRoute>} />
            <Route path="/my-applications" element={<ProtectedRoute requiredPermission="apply:jobs"><JobApplicationStatus /></ProtectedRoute>} />
            <Route
              path="/jobs/:jobId/applicants/:id"
              element={
                <ProtectedRoute>
                  <AlumniProfile />
                </ProtectedRoute>
              }
            />
            <Route path="/profile/:userId" element={<RequireCompleteProfile><ProtectedRoute requiredPermission="view:alumni_directory"><UserProfilePage /></ProtectedRoute></RequireCompleteProfile>} />
            <Route
              path="/directory"
              element={
                // Redirect employers away from Directory to Jobs
                getUserRole() === 'employer'
                  ? <Navigate to="/jobs" replace />
                  : (
                    <RequireCompleteProfile>
                      <ProtectedRoute requiredPermission="view:alumni_directory">
                        <DirectoryPage />
                      </ProtectedRoute>
                    </RequireCompleteProfile>
                  )
              }
            />
            <Route path="/directory-actions" element={<Navigate to="/directory" replace />} />
            <Route
              path="/directory/:id"
              element={
                <RequireCompleteProfile>
                  <ProtectedRoute requiredPermission="view:alumni_directory">
                    <AlumniProfile />
                  </ProtectedRoute>
                </RequireCompleteProfile>
              }
            />
            
            <Route path="/notifications" element={<NotificationsPage />} />
            
            {/* Mentorship Module - Canonical UUX-∞ Atomic Structure */}
            {/* Canonical route: single hub with query params */}
            <Route 
              path="/mentorship" 
              element={
                <ProtectedRoute requiredPermission="request:mentorship">
                  <MentorshipLayout />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/mentorship/info" 
              element={
                <ProtectedRoute requiredPermission="request:mentorship">
                  <MentorshipInfo />
                </ProtectedRoute>
              } 
            />
            
            {/* Legacy route redirects - maintain backwards compatibility */}
            <Route path="/mentorship/find" element={<Navigate to="/mentorship?tab=find" replace />} />
            <Route path="/mentorship/my-requests" element={<Navigate to="/mentorship?tab=requests&sub=sent" replace />} />
            <Route path="/mentorship/requests-to-me" element={<Navigate to="/mentorship?tab=requests&sub=received" replace />} />
            <Route path="/mentorship/requests" element={<Navigate to="/mentorship?tab=requests&sub=sent" replace />} />
            <Route path="/mentorship/me" element={<Navigate to="/mentorship?tab=mentee" replace />} />
            <Route path="/mentorship/my-mentorships" element={<Navigate to="/mentorship?tab=mentee" replace />} />
            
            {/* Standalone mentor profile routes (outside hub) */}
            <Route path="/mentorship/become-mentor" element={<Navigate to="/mentorship?tab=settings&mode=mentor" replace />} />
            <Route path="/mentorship/become-mentee" element={<Navigate to="/mentorship?tab=settings&mode=mentee" replace />} />
            <Route path="/mentorship/mentor/:id" element={<ProtectedRoute requiredPermission="view:alumni_directory"><MentorProfile /></ProtectedRoute>} />
            <Route path="/mentorship/mentor-settings" element={<Navigate to="/mentorship?tab=settings&mode=mentor" replace />} />
            <Route
              path="/groups/*"
              element={
                getUserRole() === 'employer'
                  ? <Navigate to="/events" replace />
                  : (
                      <ProtectedRoute requiredPermission="access:groups">
                        <GroupsPage />
                      </ProtectedRoute>
                    )
              }
            />
            <Route
              path="/groups/:id/manage"
              element={
                getUserRole() === 'employer'
                  ? <Navigate to="/events" replace />
                  : (
                      <ProtectedRoute requiredPermission="access:groups">
                        <RequireGroupAdmin>
                          <GroupManage />
                        </RequireGroupAdmin>
                      </ProtectedRoute>
                    )
              }
            />
            <Route path="/messages" element={<RequireCompleteProfile><ProtectedRoute requiredPermission="message:users"><Messages /></ProtectedRoute></RequireCompleteProfile>} />
            {/* Notifications route defined above - removed duplicate */}
            <Route path="/admin/analytics" element={<ProtectedRoute requiredPermission="access:all"><AdminGate><Analytics /></AdminGate></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute requiredPermission="access:all"><AdminUsersPage /></ProtectedRoute>} />
            <Route path="/admin/activity-logs" element={<ProtectedRoute requiredPermission="access:all"><ActivityLogs /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute requiredPermission="access:all"><AdminSettings /></ProtectedRoute>} />
            <Route path="/admin/csv" element={<ProtectedRoute requiredPermission="access:all"><CSVImportExport /></ProtectedRoute>} />
            <Route path="/admin/data-tools" element={<ProtectedRoute requiredPermission="access:all"><DataTools /></ProtectedRoute>} />
            <Route path="/admin/events/:id/feedback" element={<ProtectedRoute requiredPermission="access:all"><EventFeedbackReport /></ProtectedRoute>} />
            <Route path="/admin/mentor-approvals" element={<ProtectedRoute requiredPermission="access:all"><AdminMentorApprovals /></ProtectedRoute>} />
            <Route path="/admin/verify" element={<ProtectedRoute requiredPermission="access:all"><DataVerificationDashboard /></ProtectedRoute>} />
            <Route path="/admin/groups" element={<ProtectedRoute requiredPermission="access:all"><AdminGroupsPage /></ProtectedRoute>} />
            <Route path="/admin/feedback" element={<ProtectedRoute requiredPermission="view:feedback_reports"><FeedbackReport /></ProtectedRoute>} />
            <Route path="/rejection" element={<RejectionPage />} />
            <Route path="/access-denied" element={<AccessDenied />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </main>
      </div>
    </div>
  ) : (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/register" element={<EnhancedRegister />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/help" element={<HelpCenter />} />
      <Route path="/contact" element={<ContactUs />} />
      {/* Legacy networking group routes removed; use /groups instead */}
      <Route path="/update-password" element={<UpdatePassword />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/directory" element={<Navigate to="/login" />} />
      <Route path="/events" element={<Navigate to="/login" replace />} />
      <Route path="/events/*" element={<Navigate to="/login" replace />} />
      <Route path="/jobs" element={<Navigate to="/login" replace />} />
      <Route path="/jobs/*" element={<Navigate to="/login" replace />} />
      <Route path="/mentorship" element={<Navigate to="/login" replace />} />
      <Route path="/mentorship/*" element={<Navigate to="/login" replace />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RealtimeProvider>
            <NotificationProvider>
              <AuthListener />
              <AppContent />
              <FeedbackWidget />
              <Toaster 
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#fff',
                    color: '#333',
                  },
                  success: {
                    style: {
                      background: '#e6f7e6',
                      border: '1px solid #c3e6cb',
                    },
                  },
                  error: {
                    style: {
                      background: '#f8d7da',
                      border: '1px solid #f5c6cb',
                    },
                    duration: 5000,
                  },
                }}
              />
            </NotificationProvider>
          </RealtimeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </Router>
  );
}

export default App;
