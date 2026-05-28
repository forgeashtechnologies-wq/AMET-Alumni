# 📚 AMET Alumni Platform – The Complete Frontend Book

> **Version**: 1.0 | **Last Updated**: December 2024  
> **Purpose**: The definitive reference for every aspect of the AMET Alumni frontend system

---

# 📖 Table of Contents

## Part I: Foundation
- [1. Introduction & Philosophy](#1-introduction--philosophy)
- [2. Architecture Overview](#2-architecture-overview)
- [3. Technology Stack](#3-technology-stack)
- [4. Project Structure](#4-project-structure)

## Part II: Core Systems
- [5. Authentication & Identity](#5-authentication--identity)
- [6. Roles & Permissions](#6-roles--permissions)
- [7. Routing & Navigation](#7-routing--navigation)
- [8. State Management](#8-state-management)

## Part III: Feature Modules
- [9. Dashboard](#9-dashboard-module)
- [10. Directory](#10-directory-module)
- [11. Jobs](#11-jobs-module)
- [12. Events](#12-events-module)
- [13. Mentorship](#13-mentorship-module)
- [14. Groups](#14-groups-module)
- [15. Messages](#15-messages-module)
- [16. Admin](#16-admin-module)

## Part IV: Infrastructure
- [17. Custom Hooks](#17-custom-hooks)
- [18. API Layer](#18-api-layer)
- [19. Services](#19-services-layer)
- [20. Utilities](#20-utilities)

## Part V: UI/UX
- [21. Component Library](#21-component-library)
- [22. Design Patterns](#22-design-patterns)

## Part VI: Role Experiences
- [23. Alumni Experience](#23-alumni-experience)
- [24. Student Experience](#24-student-experience)
- [25. Employer Experience](#25-employer-experience)
- [26. Admin Experience](#26-admin-experience)

## Part VII: Reference
- [A. Complete Route Map](#appendix-a-complete-route-map)
- [B. Permission Matrix](#appendix-b-permission-matrix)
- [C. Component Inventory](#appendix-c-component-inventory)
- [D. Hook Reference](#appendix-d-hook-reference)

---

# Part I: Foundation

## 1. Introduction & Philosophy

### 1.1 What is AMET Alumni Platform?

A comprehensive **alumni engagement system** connecting:
- **Alumni** – Graduates staying connected with alma mater
- **Students** – Current students seeking mentorship/career guidance
- **Employers** – Companies recruiting from alumni/student pool
- **Administrators** – Staff managing platform and users

### 1.2 Core Design Principles

| Principle | Description |
|-----------|-------------|
| **Role-First** | Every feature considers user's role |
| **Security by Default** | Frontend guards + Backend RLS |
| **Mobile-First** | All layouts work on mobile |
| **Performance** | React Query caching, code splitting |
| **Modular** | Self-contained feature modules |

### 1.3 Mental Model

```
┌─────────────────────────────────────────────────┐
│              AMET Alumni Platform                │
├─────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────┐ │
│  │ Alumni  │ │ Student │ │Employer │ │ Admin │ │
│  │  Gate   │ │  Gate   │ │  Gate   │ │ Gate  │ │
│  └────┬────┘ └────┬────┘ └────┬────┘ └───┬───┘ │
│       └──────────┬┴──────────┬┴──────────┘     │
│                  ▼           ▼                  │
│  ┌───────────────────────────────────────────┐ │
│  │         Shared Features                    │ │
│  │  Dashboard │ Events │ Messages │ Profile  │ │
│  └───────────────────────────────────────────┘ │
│       │           │           │           │    │
│       ▼           ▼           ▼           ▼    │
│  Directory   Mentorship    Jobs       Admin    │
│   Groups     (Mentee)     Portal      Tools    │
└─────────────────────────────────────────────────┘
```

---

## 2. Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│                   React SPA                      │
│  ┌─────────────────────────────────────────┐   │
│  │               App.js                     │   │
│  │  Router → Query → Auth → Realtime       │   │
│  └─────────────────────────────────────────┘   │
│                      │                          │
│  ┌─────────────────────────────────────────┐   │
│  │             AppContent                   │   │
│  │  Navigation │ Header │ Main Content     │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│              Supabase Backend                    │
│  Auth │ Database (RLS) │ Storage │ Realtime    │
└─────────────────────────────────────────────────┘
```

### 2.2 Provider Hierarchy

```jsx
<BrowserRouter>              // 1. Routing
  <QueryClientProvider>      // 2. Data fetching
    <AuthProvider>           // 3. Authentication
      <RealtimeProvider>     // 4. Real-time
        <NotificationProvider> // 5. Notifications
          <AppContent />     // 6. Main app
        </NotificationProvider>
      </RealtimeProvider>
    </AuthProvider>
  </QueryClientProvider>
</BrowserRouter>
```

---

## 3. Technology Stack

### 3.1 Core Technologies

| Technology | Purpose |
|------------|---------|
| **React 18** | UI Framework |
| **React Router 6** | Client-side routing |
| **React Query 4** | Server state management |
| **Supabase JS 2** | Backend client |
| **Material-UI 5** | UI components |
| **Tailwind CSS 3** | Utility CSS |
| **React Hot Toast** | Notifications |

---

## 4. Project Structure

### 4.1 Directory Layout

```
frontend/src/
├── api/              # API layer (12 files)
├── components/       # React components (42 dirs)
│   ├── Admin/       ├── Auth/        ├── Companies/
│   ├── Dashboard/   ├── Directory/   ├── Events/
│   ├── Groups/      ├── Jobs/        ├── Landing/
│   ├── Layout/      ├── Mentorship/  ├── Messages/
│   ├── Networking/  ├── Notifications/├── Profile/
│   ├── common/      ├── forms/       ├── guards/
│   ├── shared/      └── ui/
├── constants/        # App constants (4 files)
├── contexts/         # React contexts (2 files)
├── hooks/            # Custom hooks (39 files)
├── lib/              # Library utilities (11 files)
├── pages/            # Page components (6 dirs)
├── routes/           # Route logic (1 file)
├── services/         # Business logic (11 files)
├── shared/           # Shared utilities
├── utils/            # Utility functions (58 files)
├── App.js            # Main app
└── index.js          # Entry point
```

---

# Part II: Core Systems

## 5. Authentication & Identity

### 5.1 AuthContext State

```javascript
// Exposed by useAuth()
{
  user,              // Supabase auth user
  profile,           // Extended profile data
  loading,           // Auth resolving?
  session,           // Current session
  getUserRole(),     // 'alumni'|'student'|'employer'|'admin'|'super_admin'
  hasPermission(k),  // Check permission
  isAdmin,           // Admin or super_admin?
  approvalFlags,     // { approvalStatus, isFullyApproved }
  rejectionStatus,   // { isRejected, reason }
  signIn(), signUp(), signOut(), updateProfile()
}
```

### 5.2 Profile Fields (User-Editable)

```javascript
const SAFE_PROFILE_FIELDS = [
  'id', 'email', 'full_name', 'first_name', 'last_name',
  'phone', 'graduation_year', 'expected_graduation_year',
  'degree_code', 'department_id', 'company_name',
  'current_job_title', 'location', 'avatar_url',
  'industry', 'company_size', 'company_website', 'role'
];
```

### 5.3 Auth Components

| Component | Route | Purpose |
|-----------|-------|---------|
| `Login` | `/login` | Email/password login |
| `EnhancedRegister` | `/register` | Multi-step registration |
| `ForgotPassword` | `/forgot-password` | Password reset |
| `UpdatePassword` | `/update-password` | Set new password |
| `AuthCallback` | `/auth/callback` | OAuth callback |
| `ProfileCompletion` | `/complete-profile` | Mandatory fields |
| `RejectionPage` | `/rejection` | Blocked user |
| `AccessDenied` | `/access-denied` | Permission denied |

---

## 6. Roles & Permissions

### 6.1 Role Definitions

```javascript
// src/lib/roles.js
export const ROLE_LABELS = {
  alumni: 'Alumni',
  student: 'Student',
  employer: 'Employer',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

export const isAdminLike = (r) => r === 'admin' || r === 'super_admin';
```

### 6.2 Base Permissions

```javascript
// src/contexts/AuthContext.js
const BASE_PERMISSIONS = {
  alumni: [
    'access:dashboard', 'view:jobs', 'apply:jobs', 'access:events',
    'view:alumni_directory', 'request:mentorship', 'become:mentor',
    'access:groups', 'message:users', 'access:profile_settings',
    'manage:mentor_profile', 'manage:mentee_requests',
    'chat:mentees', 'manage:mentoring_slots'
  ],
  student: [
    'access:dashboard', 'view:jobs', 'apply:jobs', 'access:events',
    'view:alumni_directory', 'request:mentorship', 'access:groups',
    'message:users', 'access:profile_settings'
  ],
  employer: [
    'access:dashboard', 'view:jobs', 'post:jobs', 'manage:jobs',
    'view:job_applications', 'manage:company_profile',
    'access:events', 'message:users', 'access:profile_settings'
  ],
  admin: ['access:all', 'access:events', 'events:create'],
  super_admin: ['access:all', 'access:events', 'events:create', 'view:feedback_reports']
};
```

### 6.3 Module Permissions

```javascript
// src/lib/permissions.js
export const PERMISSIONS = {
  super_admin: { 'groups:create': true, 'groups:approve': true, 'mentors:approve': true },
  admin: { 'groups:create': true, 'groups:approve': true, 'mentors:approve': true },
  alumni: { 'groups:create': true, 'groups:approve': false, 'mentorship:request': true },
  employer: { 'groups:create': false, 'groups:approve': false },
  student: { 'groups:create': false, 'mentorship:request': true }
};

export const can = (perm, role) => !!(PERMISSIONS?.[role]?.[perm]);
```

---

## 7. Routing & Navigation

### 7.1 Route Guards

| Guard | Purpose |
|-------|---------|
| `ProtectedRoute` | Permission-based access |
| `RequireCompleteProfile` | Mandatory profile fields |
| `ApprovedGuard` | Employer approval check |
| `AdminGate` | Admin role verification |
| `RequireGroupAdmin` | Group admin check |

### 7.2 Route Guard Usage

```jsx
// Permission-based
<ProtectedRoute requiredPermission="view:jobs">
  <JobListingsPage />
</ProtectedRoute>

// Role-based redirect
{getUserRole() === 'employer' 
  ? <Navigate to="/jobs" /> 
  : <DirectoryPage />}

// Approval-based
<ApprovedGuard require="approved-employer">
  <PostJob />
</ApprovedGuard>

// Admin-only
<ProtectedRoute requiredPermission="access:all">
  <AdminGate><Analytics /></AdminGate>
</ProtectedRoute>
```

---

## 8. State Management

### 8.1 State Strategy

| Type | Tool | Examples |
|------|------|----------|
| **Server State** | React Query | Jobs, events, profiles |
| **Global State** | Context | Auth, mobile nav |
| **Local State** | useState | Forms, UI toggles |
| **URL State** | Query params | Tabs, filters |

### 8.2 React Query Config

```javascript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});
```

---

# Part III: Feature Modules

## 9. Dashboard Module

**Location**: `src/components/Dashboard/`

### 9.1 Components
- `AlumniDashboard.js` – Main dashboard (ALL roles)
- `DashboardCard.js` – Reusable card
- `QuickStats.js` – Statistics
- `RecentActivity.js` – Activity feed
- `UpcomingEvents.js` – Event preview

### 9.2 Panels
| Panel | Description |
|-------|-------------|
| Quick Stats | Key metrics |
| Recent Activity | Last 5 activities |
| Upcoming Events | Next 3 events |
| Job Highlights | Featured jobs |
| Mentorship Status | Active mentorships |
| Quick Links | Navigation shortcuts |

---

## 10. Directory Module

**Location**: `src/components/Directory/`

### 10.1 Components
- `DirectoryPage.jsx` – Main entry
- `DirectoryGrid.jsx` – Grid layout
- `DirectoryCard.jsx` – Profile card
- `AlumniProfile.js` – Detailed view
- `ChipBar.jsx` – Filter chips
- `ContactInfo.jsx` – Contact display

### 10.2 Card Chips (5 Summary)
1. **Degree** – Degree label
2. **Department** – Department name
3. **Batch** – Graduation year
4. **Company** – Current company
5. **Position** – Job title

### 10.3 Connection States
| State | Description |
|-------|-------------|
| `none` | No relationship |
| `sent` | Request sent |
| `received` | Request received |
| `connected` | Mutual connection |

---

## 11. Jobs Module

**Location**: `src/components/Jobs/`

### 11.1 Components
- `JobListingsPage.js` – Main listings
- `JobCard.js` – Job card
- `JobDetails.js` – Job detail
- `JobApplication.js` – Apply form
- `JobApplicationStatus.js` – My applications
- `PostJob.js` – Post wizard
- `ManageJobApplications.js` – Manage applicants
- `JobAlerts.js` – Alert management

### 11.2 Application States
| State | Label |
|-------|-------|
| `submitted` | Submitted |
| `under_review` | Under Review |
| `shortlisted` | Shortlisted |
| `interviewing` | Interviewing |
| `offered` | Offered |
| `hired` | Hired |
| `rejected` | Rejected |

### 11.3 Role Flows
- **Candidate**: Browse → Apply → Track
- **Employer**: Post → Manage → Update Status
- **Admin**: View All → Moderate → Audit

---

## 12. Events Module

**Location**: `src/components/Events/`

### 12.1 Components
- `EventsList.js` – Event listing
- `EventCard.js` – Event card
- `EventDetail.js` – Event details
- `CreateEvent.js` – Create event
- `EditEvent.js` – Edit event
- `MyRegistrationsList.js` – User registrations
- `EventFeedback.js` – Feedback form
- `EventModerationPanel.jsx` – Moderation

### 12.2 Role Capabilities
| Role | View | Register | Create | Moderate |
|------|------|----------|--------|----------|
| Alumni | ✅ | ✅ | ❌ | ❌ |
| Student | ✅ | ✅ | ❌ | ❌ |
| Employer | ✅ | ✅ | ❌ | ❌ |
| Admin | ✅ | ✅ | ✅ | ✅ |

---

## 13. Mentorship Module

**Location**: `src/components/Mentorship/`

### 13.1 Components
- `MentorshipLayout.jsx` – Layout shell
- `MentorshipHub.jsx` – Central router
- `MentorshipTabs.jsx` – Tab navigation
- `MentorDirectory.js` – Mentor listing
- `MentorProfile.js` – Mentor profile
- `MentorSettings.js` – Mentor settings
- `BecomeMentorForm.js` – Mentor registration
- `RequestMentorshipButton.jsx` – Request CTA
- `MentorCapacityPill.jsx` – Capacity indicator
- `AdminMentorApprovals.js` – Admin approvals

### 13.2 URL Structure
```
/mentorship                    # Main hub
/mentorship?tab=find           # Find mentors
/mentorship?tab=requests       # My requests
/mentorship?tab=requests&sub=received  # Incoming
/mentorship?tab=mentee         # My mentors
/mentorship?tab=settings       # Settings
/mentorship/mentor/:id         # Mentor profile
```

### 13.3 Role Behavior
| Role | Mentee | Mentor | Admin Tools |
|------|--------|--------|-------------|
| Alumni | ✅ | ✅ (after approval) | ❌ |
| Student | ✅ | ❌ | ❌ |
| Admin | ✅ | ✅ | ✅ |

---

## 14. Groups Module

**Location**: `src/components/Groups/`

### 14.1 Components
- `GroupsList.js` – Group listing
- `GroupDetail.js` – Group detail
- `CreateGroup.js` – Create group
- `CommentsThread.jsx` – Discussion thread

### 14.2 Role Behavior
| Role | Browse | Join | Create | Moderate |
|------|--------|------|--------|----------|
| Alumni | ✅ | ✅ | ✅ | Own groups |
| Student | ✅ | ✅ (not alumni-only) | ❌ | ❌ |
| Employer | ❌ (redirected) | ❌ | ❌ | ❌ |
| Admin | ✅ | ✅ | ✅ | All groups |

---

## 15. Messages Module

**Location**: `src/components/Messages/`

### 15.1 Components
- `Messages.js` – Entry point
- `MessagingSystem.js` – Main system
- `ConversationList.js` – Thread list
- `ChatWindow.js` – Chat view
- `MessageBubble.js` – Message display
- `ConnectionsPanel.jsx` – Connections
- `NewConversationModal.js` – New chat

### 15.2 Sending Requirements
1. User must be **connected**
2. User must be **approved**
3. Connection must have `can_send: true`

---

## 16. Admin Module

**Location**: `src/components/Admin/`

### 16.1 Components
- `AdminSettings.js` – Settings hub
- `Analytics.js` – Analytics dashboard
- `ActivityLogs.js` – Activity logs
- `UserManagement.js` – User management
- `AdminUsersPage.js` – Users page
- `CSVImportExport.js` – Data import/export
- `DataVerificationDashboard.jsx` – Data verification
- `FeedbackReport.js` – Feedback reports
- `AdminMentorApprovals.js` – Mentor approvals

### 16.2 Admin Routes
| Route | Component | Access |
|-------|-----------|--------|
| `/admin/analytics` | Analytics | Admin |
| `/admin/users` | AdminUsersPage | Admin |
| `/admin/activity-logs` | ActivityLogs | Admin |
| `/admin/settings` | AdminSettings | Admin |
| `/admin/csv` | CSVImportExport | Admin |
| `/admin/mentor-approvals` | AdminMentorApprovals | Admin |
| `/admin/verify` | DataVerificationDashboard | Admin |
| `/admin/feedback` | FeedbackReport | Super Admin |

---

# Part IV: Infrastructure

## 17. Custom Hooks

### 17.1 Hook Inventory (39 hooks)

**Identity & Profiles**
- `useCurrentUser.js` – Current user data
- `useMyProfile.js` – Own profile with realtime
- `useProfileById.js` – Profile by ID
- `useAvatar.js` – Avatar handling
- `useSignedImage.js` – Signed image URLs

**Directory & Connections**
- `useDirectory.js` – Directory data
- `useDirectorySecure.js` – Secure directory
- `useConnections.js` – Connection management
- `useConnectionRel.js` – Connection relationship
- `useConnectionStatus.js` – Connection state
- `useConnectionsPanel.js` – Connections panel
- `useConnectionsRealtime.js` – Realtime connections
- `useRoleCounts.js` – Role statistics

**Academics**
- `useAcademicsCatalog.js` – Degrees/departments
- `useDegreePrograms.js` – Degree programs
- `useDepartments.js` – Departments

**Jobs & Events**
- `useOpenJobs.js` – Active jobs
- `useExpiredJobs.js` – Expired jobs
- `useJobsRealtime.js` – Realtime jobs
- `useEventData.js` – Event data

**Mentorship**
- `useMentorshipSummary.js` – Mentorship summary
- `useMentorshipRoleContext.js` – Role context
- `useMentorshipEligibility.js` – Eligibility check
- `useMentorshipMutations.js` – Mutations
- `useMentorshipBannerModel.js` – Banner logic
- `useOpenMentorshipChat.js` – Chat opener

**Notifications**
- `useNotification.js` – UI notifications
- `useNotifications.js` – Notification data
- `useRecentActivity.js` – Recent activity
- `useGlobalBadges.js` – Badge counts

**Admin**
- `useAdminUsersGrid.js` – Admin user grid
- `useApproval.js` – Approval handling

**Messaging**
- `useDmRealtime.js` – DM realtime

**Profile**
- `useProfileContact.js` – Contact info

---

## 18. API Layer

**Location**: `src/api/`

### 18.1 API Files (12 files)

| File | Purpose |
|------|---------|
| `admin.js` | Admin operations |
| `adminUsers.js` | User management |
| `comments.js` | Comments/threads |
| `dm.js` | Direct messaging |
| `groups.js` | Groups operations |
| `jobs.js` | Jobs operations |
| `mentorshipApi.js` | Mentorship operations |
| `notifications.js` | Notifications |
| `keys.ts` | API key config |

### 18.2 API Pattern

```javascript
// Standard API function
export const fetchJobsFeed = async (filters = {}) => {
  const { data, error } = await supabase
    .rpc('get_jobs_feed', { 
      user_filter: JSON.stringify(filters),
      limit: 20,
      offset: 0
    });
  
  if (error) throw error;
  return data;
};
```

---

## 19. Services Layer

**Location**: `src/services/`

### 19.1 Service Files (11 files)

| File | Purpose |
|------|---------|
| `profile.js` | Profile operations |
| `avatar.js` | Avatar handling |
| `directoryApi.js` | Directory helpers |
| `mentorship.js` | Mentorship logic |
| `mentors.js` | Mentor operations |
| `adminMentorship.js` | Admin mentorship |
| `socialLinks.js` | Social link handling |
| `socialLinks.validation.js` | Link validation |

---

## 20. Utilities

**Location**: `src/utils/`

### 20.1 Key Utilities (58 files)

| File | Purpose |
|------|---------|
| `supabase.js` | **Main Supabase client** |
| `connections.js` | Connection helpers |
| `jobs.js` | Job utilities |
| `roles.js` | Role utilities |
| `displayName.js` | Name formatting |
| `validators.js` | Input validation |
| `dateUtils.js` | Date formatting |
| `errors.js` | Error handling |
| `logger.js` | Logging |
| `acl.js` | Access control |
| `changeUserRole.js` | Role changes |
| `mentorshipStatus.js` | Status helpers |
| `applicationStatus.js` | App status |
| `jobNormalize.js` | Job normalization |
| `mapProfileForUI.js` | Profile mapping |

---

# Part V: UI/UX

## 21. Component Library

### 21.1 Common Components

**Location**: `src/components/common/`

| Component | Purpose |
|-----------|---------|
| `LoadingSpinner` | Loading indicator |
| `Logo` | Brand logo |
| `FeedbackWidget` | User feedback |
| `NotificationCenter` | Notifications |

### 21.2 UI Components

**Location**: `src/components/ui/`

Base UI building blocks for consistent styling.

### 21.3 Form Components

**Location**: `src/components/forms/`

Reusable form elements and patterns.

### 21.4 Guard Components

**Location**: `src/components/guards/`

| Component | Purpose |
|-----------|---------|
| `ApprovedGuard.jsx` | Approval check |

---

## 22. Design Patterns

### 22.1 Loading States

```jsx
// Skeleton loading
if (isLoading) return <ProfileSkeleton />;

// Spinner loading
if (isLoading) return <LoadingSpinner message="Loading..." />;
```

### 22.2 Error States

```jsx
// Error boundary
if (error) return <ErrorMessage error={error} retry={refetch} />;

// Toast notification
toast.error('Failed to save changes');
```

### 22.3 Empty States

```jsx
// Empty list
if (data.length === 0) {
  return (
    <EmptyState
      icon={<SearchIcon />}
      title="No results found"
      description="Try adjusting your filters"
      action={<Button onClick={clearFilters}>Clear Filters</Button>}
    />
  );
}
```

### 22.4 Responsive Layout

```jsx
// Mobile-first grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>
```

---

# Part VI: Role Experiences

## 23. Alumni Experience

### 23.1 Capabilities

| Feature | Access |
|---------|--------|
| Dashboard | ✅ Full |
| Directory | ✅ Full |
| Events | ✅ View, Register |
| Jobs | ✅ Browse, Apply |
| Mentorship | ✅ Mentee + Mentor |
| Groups | ✅ Browse, Join, Create |
| Messages | ✅ With connections |
| Admin | ❌ None |

### 23.2 Navigation Items
- Dashboard
- Alumni Directory
- Events
- Job Portal
- Mentorship
- Groups
- Messages

---

## 24. Student Experience

### 24.1 Capabilities

| Feature | Access |
|---------|--------|
| Dashboard | ✅ Full |
| Directory | ✅ Full |
| Events | ✅ View, Register |
| Jobs | ✅ Browse, Apply |
| Mentorship | ✅ Mentee only |
| Groups | ✅ Browse, Join (not alumni-only) |
| Messages | ✅ With connections |
| Admin | ❌ None |

### 24.2 Restrictions
- Cannot become mentor
- Cannot join alumni-only groups
- Cannot create groups

---

## 25. Employer Experience

### 25.1 Capabilities

| Feature | Access |
|---------|--------|
| Dashboard | ✅ Full |
| Directory | ❌ Redirected to Jobs |
| Events | ✅ View, Register |
| Jobs | ✅ Post, Manage |
| Mentorship | ❌ None |
| Groups | ❌ Redirected to Events |
| Messages | ✅ With connections |
| Admin | ❌ None |

### 25.2 Navigation Items
- Dashboard
- Events
- Job Portal
- Messages

---

## 26. Admin Experience

### 26.1 Capabilities

| Feature | Access |
|---------|--------|
| Dashboard | ✅ Full |
| Directory | ✅ Full + Admin filters |
| Events | ✅ Create, Edit, Moderate |
| Jobs | ✅ Full + Moderation |
| Mentorship | ✅ Full + Approvals |
| Groups | ✅ Full + Moderation |
| Messages | ✅ Full |
| Admin | ✅ Full |

### 26.2 Admin Tools
- User Management
- Analytics
- Activity Logs
- CSV Import/Export
- Mentor Approvals
- Data Verification
- Event Moderation

---

# Part VII: Reference

## Appendix A: Complete Route Map

### Public Routes
| Route | Component |
|-------|-----------|
| `/` | HomePage |
| `/login` | Login |
| `/register` | EnhancedRegister |
| `/forgot-password` | ForgotPassword |
| `/update-password` | UpdatePassword |
| `/auth/callback` | AuthCallback |
| `/about` | AboutPage |
| `/terms-of-service` | TermsOfService |
| `/privacy-policy` | PrivacyPolicy |
| `/help` | HelpCenter |
| `/contact` | ContactUs |

### Protected Routes
| Route | Component | Permission |
|-------|-----------|------------|
| `/dashboard` | AlumniDashboard | `access:dashboard` |
| `/profile` | Profile | `access:profile_settings` |
| `/profile/security` | Security | `access:profile_settings` |
| `/settings/notifications` | NotificationSettings | `access:profile_settings` |
| `/directory` | DirectoryPage | `view:alumni_directory` |
| `/directory/:id` | AlumniProfile | `view:alumni_directory` |
| `/profile/:userId` | UserProfilePage | `view:alumni_directory` |
| `/events/*` | EventsPage | `access:events` |
| `/events/my-registrations` | MyRegistrationsList | `access:events` |
| `/events/create` | CreateEvent | `events:create` |
| `/events/edit/:id` | EditEvent | `events:create` |
| `/jobs` | JobListingsPage | `view:jobs` |
| `/jobs/:id` | JobDetails | `view:jobs` |
| `/jobs/post` | PostJob | `post:jobs` |
| `/jobs/create` | JobPostingForm | `post:jobs` |
| `/jobs/:id/edit` | EditJob | `post:jobs` |
| `/jobs/:jobId/manage` | ManageJobApplications | `view:job_applications` |
| `/jobs/alerts` | JobAlerts | `view:jobs` |
| `/my-applications` | JobApplicationStatus | `apply:jobs` |
| `/mentorship` | MentorshipLayout | `request:mentorship` |
| `/mentorship/mentor/:id` | MentorProfile | `view:alumni_directory` |
| `/groups/*` | GroupsPage | `access:groups` |
| `/groups/:id/manage` | GroupManage | `access:groups` |
| `/messages` | Messages | `message:users` |
| `/notifications` | Notifications | Auth required |

### Admin Routes
| Route | Component | Permission |
|-------|-----------|------------|
| `/admin/analytics` | Analytics | `access:all` |
| `/admin/users` | AdminUsersPage | `access:all` |
| `/admin/activity-logs` | ActivityLogs | `access:all` |
| `/admin/settings` | AdminSettings | `access:all` |
| `/admin/csv` | CSVImportExport | `access:all` |
| `/admin/mentor-approvals` | AdminMentorApprovals | `access:all` |
| `/admin/verify` | DataVerificationDashboard | `access:all` |
| `/admin/feedback` | FeedbackReport | `view:feedback_reports` |
| `/admin/events/:id/feedback` | EventFeedbackReport | `access:all` |
| `/admin/events/moderation` | EventModerationPanel | `access:all` |

---

## Appendix B: Permission Matrix

### Role × Permission

| Permission | Alumni | Student | Employer | Admin | Super Admin |
|------------|--------|---------|----------|-------|-------------|
| `access:dashboard` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `view:jobs` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `apply:jobs` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `post:jobs` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `view:job_applications` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `access:events` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `events:create` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `view:alumni_directory` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `request:mentorship` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `become:mentor` | ✅ | ❌ | ❌ | ✅ | ✅ |
| `access:groups` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `message:users` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `access:profile_settings` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `access:all` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `view:feedback_reports` | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Appendix C: Component Inventory

### By Module

| Module | Components |
|--------|------------|
| Admin | 15+ components |
| Auth | 12 components |
| Dashboard | 5 components |
| Directory | 10 components |
| Events | 15 components |
| Groups | 5 components |
| Jobs | 20+ components |
| Mentorship | 25+ components |
| Messages | 8 components |
| Layout | 2 components |
| Common | 5+ components |

---

## Appendix D: Hook Reference

### Data Fetching Hooks

| Hook | Purpose | Returns |
|------|---------|---------|
| `useDirectory` | Directory data | `{ data, isLoading, error }` |
| `useOpenJobs` | Active jobs | `{ data, isLoading, error }` |
| `useEventData` | Event data | `{ data, isLoading, error }` |
| `useMentorshipSummary` | Mentorship state | `{ requests, relationships, mentorRow }` |
| `useConnections` | Connection data | `{ connections, pending, sent }` |
| `useNotifications` | Notifications | `{ notifications, unreadCount }` |

### State Hooks

| Hook | Purpose | Returns |
|------|---------|---------|
| `useApproval` | Approval state | `{ isApproved, isPending, isRejected }` |
| `useConnectionStatus` | Connection state | `{ status, canMessage }` |
| `useMentorshipRoleContext` | Role context | `{ isMentor, isMentee, isDualRole }` |

### Utility Hooks

| Hook | Purpose | Returns |
|------|---------|---------|
| `useAvatar` | Avatar URL | `{ avatarUrl, isLoading }` |
| `useSignedImage` | Signed URL | `{ signedUrl, isLoading }` |
| `useAcademicsCatalog` | Degrees/depts | `{ degrees, departments }` |

---

# 📝 Summary

This Frontend Book provides comprehensive documentation of the AMET Alumni Platform frontend, covering:

1. **Foundation** – Philosophy, architecture, tech stack, structure
2. **Core Systems** – Auth, roles, routing, state management
3. **Feature Modules** – All 8 major modules with components and flows
4. **Infrastructure** – 39 hooks, 12 API files, 11 services, 58 utilities
5. **UI/UX** – Component library and design patterns
6. **Role Experiences** – Detailed per-role capabilities
7. **Reference** – Complete route map, permission matrix, inventories

**Total Codebase Stats:**
- **Components**: 42 directories, 150+ files
- **Hooks**: 39 custom hooks
- **API Files**: 12 files
- **Services**: 11 files
- **Utilities**: 58 files
- **Routes**: 50+ routes
- **Roles**: 5 roles
- **Permissions**: 15+ permission keys

---
Got it — I’ll turn everything you’ve given me into **one consolidated “book”** with **no intentional repetition** and a clean structure.

I’ll treat this as your **Alumni Platform Product & Role Bible** – something you can drop into a single markdown/doc file.

---

# AMET Alumni Platform – Product, Roles & Frontend Bible

## PART 0 – INTRO & EXECUTIVE SUMMARIES

### 0.1 Product Overview

The AMET Alumni Platform is a **multi-module SaaS** for:

* Alumni & student engagement
* Events & reunions
* Jobs & career support
* Groups & communities
* Mentorship (students + alumni)
* Admin & multi-tenant governance

It runs as a **React SPA** on top of **Supabase (Postgres + Auth + RLS + Edge Functions)**, with a strict focus on:

* Role-based access (`student`, `alumni`, `employer`, `admin`, `super_admin`)
* Multi-tenant isolation
* Strong RLS & secure Edge Functions
* Consistent, predictable frontend permissions and UX

---

### 0.2 Global 10-Line CEO Summary (Admin & Roles)

1. **Problem** → Admin & super_admin flows span registration, profiles, directory, events, jobs, groups, messaging, mentorship, and multitenancy, but guarantees are scattered across frontend, Edge Functions, and SQL.
2. **Users** → Platform super_admins, tenant admins (campus admins), college admins, and normal alumni/employers affected by mis-gated admin features.
3. **Need** → A single, correct, and secure contract for what each role can see/do in each module, and how that maps to roles, permissions, RLS, and multitenancy.
4. **Why Now** → Multitenancy + God-mode migrations exist; the app is near-production. Any role leak or invite/role elevation bug is now a serious risk.
5. **Solution** → Normalize behavior around `app_role_enum` + `BASE_PERMISSIONS`, `ProtectedRoute`, `AdminGate`, admin-only RPCs, strict RLS, and DB-level last-super_admin safeguards.
6. **Architecture** → React SPA with `AuthContext`-derived role & permissions, `TenantProvider` + feature flags, and Supabase Postgres with RLS & Edge Functions (`set-role`, `admin-invite-user`, `admin_set_user_role`, `multitenancy_*`).
7. **Value** → Predictable UX, safer tenant isolation, fewer accidental leaks in directory/jobs/events, and a solid base for analytics, moderation, and approval tooling.
8. **Risks** → Any unauthenticated Edge Function using service role, any frontend-only last_super_admin protection, and any admin gate relying only on `access:all`.
9. **Metrics** → Non-admin hits on admin routes (target: 0), invite call success/bounce counts, role-change frequency, RLS violation incidents, and 403 patterns on guarded RPCs.
10. **Next Steps** → Harden DB safeguards (invites + role changes), audit admin RPCs/views for tenant + role enforcement, and keep this contract in sync between FE constants and SQL.

---

### 0.3 Role-Focused CEO Summaries

#### Student Role – 10-Line Summary

1. **Problem** → Student flows touch registration, profile, directory, groups, events, jobs, messaging, and mentorship; rules & protections must be consistent and secure.
2. **Users** → Students, admins approving them, and external roles interacting with them (alumni, employers, mentors).
3. **Need** → Clear boundaries: what students can see/do versus alumni/employers/admins, plus approval & mentorship eligibility gates.
4. **Why Now** → Role logic grew organically; FE guards and RLS can drift, causing leaks, broken UX, or security gaps.
5. **Solution** → Canonical student capability matrix, shared helpers, and DB-backed enforcement via RLS & RPCs.
6. **Architecture** → `public.profiles.role = 'student'` plus approval + eligibility flags, used in `AuthContext`, hooks, and RLS.
7. **Value** → Smooth student journey with strong guardrails and no accidental exposure.
8. **Risks** → Frontend-only restrictions, inconsistent defaults for missing `role`, partial approval logic in specific modules.
9. **Metrics** → Time-to-first meaningful action, approval throughput, error/rejection rates, unauthorized-action attempts, mentorship engagement.
10. **Next Steps** → Centralize student helpers, align each module, and harden DB/RLS so FE is never the only gate.

#### Alumni Role – 10-Line Summary

1. **Problem** → Alumni are the backbone of value (jobs, mentoring, events, groups), but their capabilities across states (pending/approved/rejected) aren’t captured in one spec.
2. **Users** → Alumni themselves, students, employers, admins, and super_admins.
3. **Need** → A clear Alumni Capability Matrix per approval state and per module.
4. **Why Now** → Multi-module growth makes role drift and RLS misalignment likely.
5. **Solution** → Single alumni contract covering registration → profile → directory → jobs → events → groups → messaging → mentorship → admin interactions.
6. **Architecture** → `role='alumni'` in profiles + approval flags, used in `AuthContext.BASE_PERMISSIONS.alumni`, `derivePermissions`, RLS, and RPCs.
7. **Value** → Reliable alumni journeys, safe mentorship, and trusted employer interactions.
8. **Risks** → Messaging/mentorship abuse, IDOR or cross-tenant leaks, or role escalation.
9. **Metrics** → Alumni activation, 30-day engagement, mentorship conversions, abuse reports, 403/429 telemetry.
10. **Next Steps** → Implement and test the Alumni Capability Matrix, add RLS/constraint checks, and build an alumni e2e regression suite.

---

## PART 1 – GLOBAL ARCHITECTURE

### 1.1 Tech Stack

* **Frontend**: React SPA
* **State / Data**: React Query, `AuthContext`, `TenantProvider`, module-specific hooks
* **Backend**: Supabase Postgres, Auth, Storage, Realtime
* **Security**:

  * RLS on tenant + role for all sensitive tables
  * Edge Functions with service role but explicit auth + role checks
  * Role / approval semantics encoded in DB functions + enums

### 1.2 Core Concepts

* **Roles**:

  * `student`
  * `alumni`
  * `employer`
  * `admin` (tenant admin)
  * `super_admin` (platform admin)
* **Approval / status flags** (per profile / module):

  * Account: `pending`, `approved`, `rejected` / `blocked`
  * Mentorship: `approved-mentor`, `approved-mentee`, etc.
* **Multitenancy**:

  * Tenants, tenant members, platform tenants
  * Feature flags per tenant (`features`, `tenant_feature_flags`)
  * RLS includes `tenant_id` on all domain tables

---

## PART 2 – FRONTEND SYSTEM OVERVIEW

### 2.1 Context & Permissions

* **`AuthContext`** is the single FE source of truth for:

  * `currentUser` & profile
  * `role` (from profile)
  * Approval flags, mentorship eligibility, etc.
  * `BASE_PERMISSIONS` per role
  * `derivePermissions()` → role + approval → effective permissions

* **Route Guards**:

  * `ProtectedRoute`

    * Props: `requireAdmin`, `allowRoles`, `requiredPermission`, `isSuperAdminOnly`
  * `AdminGate`

    * Extra admin check for sensitive analytics or management pages
  * `RequireCompleteProfile`
  * `FeatureGuard` (per-module feature flags)

### 2.2 Main Modules / Routes

See routes once here; later sections will reference them instead of repeating.

* **Auth & Onboarding**
  `/login`, `/register`, `/forgot-password`, `/update-password`, `/auth/callback`, `/complete-profile`, `/rejection`, `/access-denied`

* **Static / Marketing**
  `/`, `/home`, `/about`, `/terms-of-service`, `/privacy-policy`, `/help`, `/contact`

* **Dashboard**
  `/dashboard` → `AlumniDashboard` (used for all roles; content adapts)

* **Profile & Settings**
  `/profile`, `/profile/security`, `/settings/notifications`

* **Directory & People**
  `/directory`, `/directory/:id`, `/profile/:userId`

* **Events**
  `/events/*`, `/events/my-registrations`, `/events/edit/:id`, `/events/create`, `/events/new`, `/admin/events/moderation`, `/admin/events/:id/feedback`

* **Jobs / Employers**
  Candidate/general routes, employer posting routes, company routes (all under `/jobs*`, `/companies/:id`, `/company/edit`)

* **Groups**
  `/groups/*`, `/groups/:id/manage`

* **Messaging & Notifications**
  `/messages`, `/notifications`

* **Mentorship**
  `/mentorship`, `/mentorship/mentor/:id`, plus helper redirects into the main layout

* **Admin & Platform**
  `/admin/analytics`, `/admin/users`, `/admin/activity-logs`, `/admin/settings`, `/admin/tenants(+/legacy)`, `/admin/csv`, `/admin/mentor-approvals`, `/admin/verify`, `/admin/feedback`

---

## PART 3 – ROLE & CAPABILITY MATRIX (SINGLE SOURCE)

> This section centralizes **all role × module capabilities** so later chapters can point here instead of re-stating.

### 3.1 Global Role Definitions

* **Student**

  * Primary consumers (events, groups, jobs, mentorship as mentee).
  * Cannot create events, cannot join alumni-only groups, cannot be mentors, cannot access admin.
* **Alumni**

  * Full network members: directory, jobs, events, groups, messaging, mentorship as mentee and/or mentor.
  * Cannot access admin or tenants; cannot self-elevate to employer/admin/super_admin.
* **Employer**

  * Job posters and event partners.
  * Limited visibility into directory; redirected away from groups.
* **Admin** (tenant/campus level)

  * User approvals, mentor approvals, analytics, data verification.
  * Full tenant-scoped visibility & management.
* **Super Admin** (platform level)

  * Everything admin has, plus tenant management and platform settings.
  * Only role that can manage platform tenants and feature flags globally.

### 3.2 High-Level Capability Overview (Condensed)

(Each cell is the intended behavior; details per module in next part.)

| Module / Action         | Student         | Alumni             | Employer           | Admin               | Super Admin          |
| ----------------------- | --------------- | ------------------ | ------------------ | ------------------- | -------------------- |
| Register                | ✅ self          | ✅ self             | ✅ self             | via DB/elevation    | via DB/elevation     |
| Dashboard               | ✅               | ✅                  | ✅                  | ✅ (+ admin cards)   | ✅ (+ platform cards) |
| Edit own profile        | ✅               | ✅                  | ✅                  | ✅ (own + via tools) | ✅ (own + via tools)  |
| Directory access        | ✅               | ✅                  | ❌ (blocked)        | ✅ (tenant)          | ✅ (cross-tenant)     |
| Create events           | ❌               | maybe (if allowed) | maybe (if allowed) | ✅ (tenant)          | ✅                    |
| Apply to jobs           | ✅               | ✅                  | rare               | ✅ (test)            | ✅ (test)             |
| Post jobs               | ❌               | ❌                  | ✅                  | ✅ (override)        | ✅                    |
| Groups module           | ✅ (limited)     | ✅                  | ↪ `/events`        | ✅                   | ✅                    |
| Mentorship hub          | ✅ (mentee only) | ✅ (mentor/mentee)  | ❌ (typically)      | ✅ (oversight)       | ✅ (platform view)    |
| Messaging               | ✅ (if enabled)  | ✅ (if enabled)     | ✅ (if enabled)     | ✅                   | ✅                    |
| Admin routes `/admin/*` | ❌               | ❌                  | ❌                  | ✅                   | ✅                    |
| Tenant management       | ❌               | ❌                  | ❌                  | ❌                   | ✅                    |

This table is the master; student / alumni chapters later **reference** it rather than repeat.

---

## PART 4 – MODULE-BY-MODULE PRODUCT SPECS

Each module: **Purpose → Primary roles → Key flows → Role rules → UX principles**.

### 4.1 Registration & Onboarding

* **Purpose**
  Capture core identity and role (student, alumni, employer) safely and completely.

* **Key Flows**

  * Multi-step `EnhancedRegister` (role selection → personal info → role-specific fields).
  * Email verification and optional admin approval.
  * Profile completion before unlocking full features.

* **Role Rules**

  * Student: must provide degree, department, expected graduation year, optional student ID.
  * Alumni: provide academic + employment info.
  * Employer: provide company + role details.
  * Admin / super_admin: never sign up via public UI; elevated via DB + platform admin email triggers.

* **UX Principles**

  * No progress if academic catalogs aren’t loaded (to avoid invalid choices).
  * Clear errors and toasts; no silent failures.
  * Obvious next steps on first login (complete profile or wait for approval).

---

### 4.2 Profile & Identity

* **Purpose**
  Single profile that powers directory, jobs, mentorship, and messaging.

* **Flows**

  * `/profile` to view/edit all role-appropriate fields.
  * Security & notification settings in adjacent routes.
  * Profile completion gating for some modules.

* **Role Rules**

  * All roles can edit their own profile; none can edit `role` via UI.
  * Admins may see many profiles via admin tools but edit them carefully.
  * Student-specific fields (expected graduation year, student ID).
  * Alumni-specific fields (grad year, current job/company).
  * Employer-specific fields (company profile).

* **UX**

  * Everything collected in registration must appear here.
  * No mysterious “hidden” data; transparent mapping.
  * Clear validation and save feedback.

---

### 4.3 Directory

* **Purpose**
  Searchable people directory that respects role and tenant boundaries.

* **Flows**

  * `/directory` lists users using secure RPCs.
  * `/directory/:id` and `/profile/:userId` show detailed profiles.
  * Connection requests & messaging/mentorship CTAs from profile cards.

* **Role Rules**

  * Students & alumni: full directory experience within their tenant.
  * Employers: blocked by design with clear AccessDenied.
  * Admins/super_admins: see enriched metrics & filters but still tenant/RLS safe.

* **UX**

  * Clear chips for degree, department, batch, company, position.
  * Distinct empty states: no results vs no data vs no permission.
  * Employers see a friendly explanation, not a broken page.

---

### 4.4 Events

* **Purpose**
  Manage and attend campus and alumni events.

* **Flows**

  * Event browse (`/events/*`), detail, RSVP, and "My Registrations".
  * Create/edit events (where allowed).
  * Admin moderation and feedback reports.

* **Role Rules**

  * Students: view + RSVP only; never create events.
  * Alumni: view + RSVP; create/edit only if permissions exist.
  * Employers: participate, possibly host events if configured.
  * Admins: full tenant control; super_admins: cross-tenant oversight.

* **UX**

  * Tag events by audience type (Alumni-only, Student, Employer, Mixed).
  * Clean “My Registrations” view.
  * Friendly gating for unauthorized event actions.

---

### 4.5 Jobs & Career

* **Purpose**
  Connect students/alumni to opportunities; allow employers to post/manage jobs.

* **Flows**

  * Job listing, detail, apply, and “My Applications.”
  * Employer job posting and candidate management.
  * Company profiles for employers.

* **Role Rules**

  * Students & alumni: job seekers; can apply but not post.
  * Employers: posters; can manage their postings and applicants.
  * Admin / super_admin: oversight and debugging flows.

* **UX**

  * Separate candidate vs employer flows; avoid confusion.
  * Deep-link friendly (app routes handle unauthenticated/blocked gracefully).
  * Clear application statuses.

---

### 4.6 Groups & Communities

* **Purpose**
  Provide thematic communities for students and alumni.

* **Flows**

  * Group discovery, join/leave, and participation.
  * Group admin management.

* **Role Rules**

  * Students: can join groups except alumni-only; cannot create groups by default.
  * Alumni: normal group members; selected alumni may be group admins.
  * Employers: redirected to events.
  * Admin / super_admin: full control.

* **UX**

  * Alumni-only groups clearly labeled.
  * Explicit toasts/messages when students are blocked from alumni-only groups.
  * Obvious entry to group management for admins.

---

### 4.7 Messaging

* **Purpose**
  Direct communication between users (students, alumni, employers, mentors).

* **Flows**

  * `/messages` route: conversation list + chat window.
  * Compose, read, mark as seen.

* **Role Rules**

  * Almost all roles can message peers where allowed, subject to feature flags.
  * Admins/super_admins may have limited special views for support/moderation (implemented carefully and auditable).

* **UX**

  * First-time empty state is clear.
  * Rate limits and blocks are explained, not hidden.
  * No confusion between connection/mentorship messaging and pure DMs.

---

### 4.8 Mentorship

* **Purpose**
  Structured mentor–mentee relationships across students & alumni.

* **Flows**

  * `/mentorship` hub: browse mentors, manage requests, manage relationships, mentor settings.
  * Mentor availability toggles and profile.
  * Mentee request lifecycle (pending → accepted → active → closed).

* **Role Rules**

  * Students: mentees only; cannot become mentors.
  * Alumni: may act as mentee and/or mentor based on eligibility flags.
  * Employers: typically excluded.
  * Admin/super_admin: oversight and moderation.

* **UX**

  * Clear segmentation between mentor and mentee surfaces.
  * Banners explain eligibility and approval status.
  * Requests and relationships have clear statuses and actions.

---

### 4.9 Admin & Platform Management

* **Purpose**
  Safely operate the platform: approvals, role changes, analytics, tenants, feature flags.

* **Flows**

  * `/admin/users` – user management & approvals.
  * `/admin/mentor-approvals` – mentor eligibility.
  * `/admin/analytics`, `/admin/verify`, `/admin/activity-logs`, `/admin/feedback`.
  * `/admin/tenants` & feature flags (super_admin only).
  * CSV import/export under admin.

* **Role Rules**

  * Only `admin` or `super_admin` can access `/admin/*`.
  * `super_admin` required for tenant management.
  * Last super_admin cannot be demoted or removed.

* **UX**

  * Non-admins hitting admin routes see AccessDenied with clear copy.
  * Admin UIs separate tenant-level vs platform-level actions.
  * Confirmations around destructive operations.

---

## PART 5 – ADMIN & SUPER_ADMIN CONTRACT

This section consolidates **all admin/super_admin behavior** (you no longer need separate scattered docs).

### 5.1 Multi-Persona Deep Scan (Condensed)

For admin/super_admin we retain the *essence*, not the repetition:

* **Product PM** → cares about clear admin vs super_admin vs tenant_admin boundaries.
* **Business / Founder** → cares about data quality, God-mode misuse, audit trails.
* **UX / UX Writer** → cares about consistent access-denied UX and clear reasons (role vs approval vs feature vs tenant).
* **Frontend Lead** → cares about `AuthContext`, `BASE_PERMISSIONS`, `ProtectedRoute`, `AdminGate`, and avoiding duplicated role logic.
* **Backend/API Lead** → cares about `set-role`, `admin-invite-user`, `admin_set_user_role`, multitenancy RPCs; all mutations going through hardened functions.
* **DB / RLS / AppSec** → cares about `app_role_enum`, `platform_admin_emails`, last_super_admin safeguard, RLS on tenants and domain tables.
* **QA / SRE / Support** → cares about regression matrices, incident diagnostics, admin logs, and safe manual repair tools.

The detailed bullets from your earlier multi-persona scan are conceptually mapped here; each persona’s concerns are preserved without restating each sentence.

---

### 5.2 Gap Matrix (Admin-Focused)

Key gaps and resolutions (no duplication of per-role matrices):

* **Product** → No single written Admin Contract
  → This book **is** that contract; keep it in version control and sync with code.

* **UX** → Inconsistent access-denied UX
  → Standardize on `AccessDenied` page with reason codes (role/feature/approval).

* **FE** → Some admin gating uses only `requiredPermission="access:all"`
  → All `/admin/*` must use `requireAdmin` + optional `isSuperAdminOnly`.

* **Backend / API** → `admin-invite-user` previously unauthenticated
  → MUST: require JWT and enforce admin/super_admin checks plus tenant scope.

* **DB** → Last super_admin guard only on FE
  → MUST: enforce DB-level check in `admin_set_user_role` and any role-change path.

* **RLS & Security** → Edge Functions run with service role
  → MUST: treat them as untrusted entry points; implement strict auth/role/tenant validation and rate limiting.

* **QA** → No automated matrix for route-level access by role/tenant/approval
  → Use the QA matrix in Part 9 as baseline for tests.

---

## PART 6 – STUDENT ROLE CONTRACT

Here we **don’t repeat** the global matrix; we only describe what is *unique* and *critical* to students, pointing to other parts when needed.

### 6.1 Student Rules (Summary)

* **Core truths**:

  * Student role is set at registration and stored in `public.profiles.role`.
  * Students can:

    * Complete and edit their own student profile.
    * View directory, groups, events, jobs, and mentorship hub.
    * Apply to jobs, RSVP to events, join non-alumni-only groups, and act as mentees in mentorship.
  * Students cannot:

    * Create events or groups (by default).
    * Join alumni-only groups.
    * Act as mentors.
    * Access any `/admin/*` routes.
  * All student writes must be bound to `auth.uid()` and `tenant_id` at DB/RLS level.

### 6.2 Student UX & Flows (Non-repeated Highlights)

* **Registration** → student-specific form; must validate expected graduation year and academic selections.
* **Dashboard** → banners for approval state; first-time CTAs to complete profile and explore opportunities.
* **Groups** → explicit “Alumni-only” labels + clear toasts when blocked.
* **Mentorship** → banners clarifying mentee-only nature and how to become eligible.
* **Error Handling** → RLS 403s and RPC denials must surface as “You’re not allowed because you’re a student / not approved yet,” not generic failure.

### 6.3 Student Security & RLS Essentials

* RLS conditions for student-facing tables must always:

  * Compare `user_id` / `mentee_id` / `profile_id` with `auth.uid()`.
  * Prevent student creation of events, alumni-only group memberships, admin records.
* RPCs accepting IDs must treat client-supplied IDs as untrusted; check them against `auth.uid()` and role.

---

## PART 7 – ALUMNI ROLE CONTRACT

Same pattern: **only the alumni-specific essentials**, referencing global tables.

### 7.1 Alumni Rules (Summary)

* Alumni are the **default full participants** in the network:

  * See directory (within tenant), jobs, events, groups, messaging, mentorship.
  * Can act as mentors (if approved) and/or mentees.
  * Cannot access admin or tenant management.
  * Cannot self-elevate role; only admins/super_admins can change roles.

* Approval states:

  * **Pending** → restricted actions, read-heavy.
  * **Approved** → full set of alumni capabilities.
  * **Rejected/blocked** → redirected to `/rejection` and blocked from core modules.

### 7.2 Alumni UX Highlights

* Dashboard surfaces alumni-specific:

  * Jobs panel
  * Events panel
  * Groups & community CTAs
  * Mentorship (offer or request)
* Banners convey:

  * Approval status
  * Mentorship eligibility (mentor/mentee)
* Directory & profiles present alumni chips and allow connection/messaging/mentorship actions where permitted.

### 7.3 Alumni Security Essentials

* Alumni must never:

  * Mutate their `role` or `approval_status`.
  * Access other tenants’ data.
  * See sensitive student/employer data beyond intended design.
* Messaging & mentorship endpoints must rate-limit alumni usage and support moderation workflows.

---

## PART 8 – ROUTES, SUB-FEATURES & CROSS-REFERENCE

To avoid repetition, we centralize the mapping once.

### 8.1 76 Frontend Sub-Features → Modules

You already had a numbered list of ~76 frontend sub-features; we keep the **mapping logic**:

* Auth & Onboarding → sub-features 1–11
* Dashboard → 12–19
* Profile & Settings → 20–25
* Directory → 26–32
* Events → 33–38
* Jobs → 39–45
* Groups → 46–51
* Messaging → 52–58
* Mentorship → 59–67
* Admin & Platform → 68–76

The detailed per-role marking (V/L/A/–) is contained in **the single matrix in Part 3**, which we don’t repeat here.

### 8.2 Route Inventory (Summary Only)

We summarized all primary routes in Part 2; only add that:

* Each route is tied to:

  * A component
  * Expected access by role (see QA matrix)
  * Feature flags / tenant flags as needed

---

## PART 9 – QA & TEST MATRICES

### 9.1 Route × Role × Expected Result

We keep the matrix you had but **only once**, not repeated:

* `/dashboard` → 200 for all logged-in roles.
* `/profile` → 200 (own profile) for all roles.
* `/directory` → 200 for student/alumni/admin/super_admin; redirect or AccessDenied for employer.
* `/events/create` → AccessDenied for student; 200 where proper permissions exist.
* `/jobs/post` → 200 for employers; AccessDenied for student/alumni.
* `/groups/*` → 200 for student/alumni/admin/super_admin; redirect for employer.
* `/mentorship` → 200 for student/alumni/admin/super_admin; blocked/disabled for employer.
* `/admin/*` → AccessDenied for non-admins; 200 for admin/super_admin; `/admin/tenants*` super_admin only.

QA strategy:

* For each route:

  * Assert behavior for each role (200 vs redirect vs AccessDenied) matches this contract.
  * Add regression tests for new routes as they appear.

---

## PART 10 – SECURITY, RLS & EDGE FUNCTIONS

### 10.1 Edge Functions

Key ones:

* `set-role`

  * Receives Bearer JWT; uses service role internally but must bind changes to `auth.uid()` and allowed target roles.
  * Self-service only; never used for admin’s role changes on others.

* `admin-invite-user`

  * Must:

    * Require Authorization header with valid JWT.
    * Check `is_platform_admin()` or tenant admin for that tenant.
    * Enforce tenant scoping for invites.
    * Be rate-limited and logged.

* Any future admin functions:

  * Must never rely on the frontend alone; must verify:

    * Authenticated user.
    * Role (admin/super_admin).
    * Tenant ownership.
    * Last super_admin guard where relevant.

### 10.2 DB & RLS Principles

* Every user-owned or tenant-owned row:

  * Has `tenant_id` and relevant `user_id`.
  * RLS restricts `USING` and `WITH CHECK` by both.

* Role changes:

  * Go through dedicated RPC(s) that:

    * Enforce allowed transitions.
    * Implement last_super_admin protection in SQL.
    * Log all actions for audit.

* Constraints:

  * Unique and FK constraints for connections, mentorship, group_members, job_applications.
  * CHECK constraints for enums and valid year ranges.

---

## PART 11 – FIX LIST & SHIP GATE

### 11.1 Must-Fix Before Broad Production

* Harden all admin Edge Functions with auth + role + tenant checks.
* Implement DB-level last_super_admin safeguard.
* Split or harden `admin_set_user_role` for self-serve vs admin-serve flows.
* Audit RLS and RPCs for all domain tables (events, jobs, groups, mentorship, messaging, directory).
* Implement per-route QA checks from Part 9.

### 11.2 Should / Could

* Standardize AccessDenied UX and copy.
* Add structured logging and dashboards for admin actions.
* Add anti-abuse (rate limits, blocking workflows) to messaging and mentorship.
* Add per-tenant analytics on role and module usage.

---

## PART 12 – HOW TO USE THIS BOOK

* **Frontend dev** → use:

  * Parts 2, 3, 4, 8, 9 to know routes, components, and permissions.
* **Backend / DB** → use:

  * Parts 1, 3, 5, 6, 7, 10, 11 to map RLS, RPCs, and migration work.
* **Product / UX** → use:

  * Parts 0, 3, 4, 5, 6, 7 to reason about journeys and constraints.
* **QA** → use:

  * Parts 3, 8, 9, 11 to build end-to-end test plans.
* **Founder / Ops** → use:

  * Parts 0, 1, 5, 11 to understand risks and readiness.

---

If you want, next step I can:

* Output this as **pure markdown only** (no commentary), ready to paste into `docs/PLATFORM_ROLE_BIBLE.md`, or
* Create a smaller **“Admin Contract only”** version derived from this book for your admin team.


*This document is the single source of truth for the AMET Alumni frontend system.*
