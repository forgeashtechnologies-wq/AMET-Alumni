# AMET Alumni Frontend – Complete Architecture & Role-Based Flow Report

## 1. High‑Level Overview

- **App type**  
  - Single Page Application (SPA) built with **React**.
  - Uses **React Router** for routing.
  - Uses **React Query** (`@tanstack/react-query`) for data fetching/caching.
  - Uses **Supabase client** via `utils/supabase` as the API layer.
  - Uses **react-hot-toast** for notifications.
- **Main concepts**
  - Authenticated app with **role‑based navigation and permissions**.
  - Central **dashboard** plus feature modules:
    - Alumni Directory  
    - Events  
    - Jobs  
    - Mentorship  
    - Groups  
    - Messages  
    - Admin tools (analytics, user management, verification, etc.)

---

## 2. Entry Point & Global Layout

### 2.1 `src/index.js`

- Boots the React app:
  - Renders `<App />` into `#root`.
  - Wraps with `React.StrictMode`.
  - Wraps with `MobileNavProvider` (for responsive sidebar/menu).
- In production, silences `console.*` calls for a cleaner log surface.

### 2.2 `src/App.js`

- Top‑level composition:
  - Wraps the app with:
    - `BrowserRouter` (`<Router>`)
    - `QueryClientProvider` (React Query)
    - `AuthProvider` (authentication & roles)
    - `RealtimeProvider` (Supabase realtime)
    - `NotificationProvider` (in‑app notifications)
    - `AuthListener` (listens to auth state changes)
    - `FeedbackWidget` (user feedback)
    - `Toaster` (toast notifications)

- Defines **`AppContent`**, which:
  - Reads `user`, `profile`, `loading`, `getUserRole`, and `rejectionStatus` from `useAuth`.
  - Handles:
    - **Post‑login redirect** from `/login` to `/dashboard`.
    - A **loading screen** while auth state is resolving.
    - A **rejected state** where a dedicated `RejectionPage` is shown with no navigation.

- Layout when **logged in**:
  - Left: `<Navigation />` (sidebar + mobile drawer)
  - Top: `<Header />` (user menu, notifications, tagline)
  - Center: `<main id="main-content">` with a `<Routes>` switch.

- Layout when **logged out**:
  - Minimal routes:
    - `/`, `/home` → Landing `HomePage`
    - `/login`, `/register`
    - `/forgot-password`, `/update-password`, `/auth/callback`
    - Public pages: `/about`, `/terms-of-service`, `/privacy-policy`, `/help`, `/contact`
    - Any app feature route (e.g., `/directory`, `/events`, `/jobs`, `/mentorship`) redirects to `/login`.

---

## 3. Navigation & Header (UX Shell)

### 3.1 `components/Layout/Navigation.js`

- **Desktop sidebar** (left) + **mobile slide‑in panel**:
  - Uses `useAuth` to:
    - Know current role (`getUserRole`).
    - Check permissions (`hasPermission`).
  - Menu items (role/permission filtered):
    - Dashboard  
    - Alumni Directory (hidden for employers)  
    - Events  
    - Job Portal  
    - Mentorship  
    - Groups (hidden for employers)  
    - Messages  
  - Bottom section:
    - Profile Settings
    - Admin Settings (if admin)
    - Logout button

- **Active item highlighting**:
  - `isActive(path)` returns true if current path is the item or a subpath.
  - Applies specific CSS classes for active vs hover.

- **Mobile nav**:
  - Driven by `useMobileNav` (open/close state).
  - Covers full screen with a dimmed backdrop.
  - Same items as desktop, but in a vertical list.

### 3.2 `components/Layout/Header.js`

- Right‑side **user menu**:
  - Uses `useCurrentUserIdentity()` for:
    - Display name
    - Avatar URL
  - Shows:
    - User name  
    - Email  
    - Role label (Alumni, Student, Employer, Admin, Super Admin)
  - Dropdown menu:
    - Link: “Your Profile”
    - Button: “Sign out”

- Center **tagline**:
  - “Connecting Mariners Since 1993”
  - Animated wave line underneath (CSS keyframe animation).

- Left side:
  - Mobile “hamburger” button toggles the sidebar on small screens.

---

## 4. Routing & Major Pages

All authenticated routes live in `<Routes>` inside `AppContent` (when `user` is truthy).

### 4.1 Core App Routes

- **Dashboard**
  - `GET /dashboard`
  - Component: `AlumniDashboard`
  - Wrapped by:
    - `RequireCompleteProfile` (ensures required profile data)
    - `ProtectedRoute` with `requiredPermission="access:dashboard"`

- **Profile & Settings**
  - `/profile` – Profile settings form.  
  - `/profile/security` – Security page (password, auth settings).  
  - `/settings/notifications` – Notification preferences.

- **Static policy & info pages**
  - `/terms-of-service`, `/privacy-policy`, `/help`, `/contact`.

### 4.2 Directory

- **Entry**
  - `/directory` – Main alumni directory.
    - Employers are auto‑redirected to `/jobs`.
    - Wrapped by `RequireCompleteProfile` + `ProtectedRoute("view:alumni_directory")`.
  - `/directory/:id` – Individual alumni profile view.
  - `/profile/:userId` – Profile page for a user (directory‑linked).

- **UX highlights**
  - Rich filters (graduation year, degree, department, job title, location).
  - Search term (debounced).
  - Contact/connect status (sent, received, connected).
  - Pagination & sorting (e.g., by full_name).

### 4.3 Jobs

- **Browsing & alerts**
  - `/jobs` – Job listings (cards with filters & search).  
  - `/jobs/:id` – Job detail page.  
  - `/jobs/alerts` – Job alerts page.  
  - `/my-applications` – Overview of a user’s job applications.

- **Posting (employers)**
  - `/jobs/post`, `/jobs/post/select`, `/jobs/post/link`, `/jobs/create` – Different entry points/forms for posting.
  - `/jobs/:id/edit` / `/jobs/edit/:id` – Edit a job (canonical + legacy route).
  - `/jobs/:jobId/manage`, `/jobs/:id/applications` – Manage applications for a specific job.

- **Flows**
  - **Candidate**:
    - Visit `/jobs` → filter → open job → apply → success → redirected to applications list.
  - **Employer**:
    - From dashboard or nav → “Job Portal” → post/manage jobs → see applicants list and statuses.

### 4.4 Events

- **Routing**
  - `/events/*` – Routes defined by `EventsPage`:
    - `/events` – Events list (with admin-specific options).
    - `/events/new` – Create new event (admins).
    - `/events/:id` – Event detail.
    - `/events/:id/edit` – Edit event (admins).
    - `/events/:id/feedback` – Submit feedback form (logged‑in users).
    - `/events/:id/feedback-dashboard` – Feedback dashboard (role‑gated).
  - `/events/my-registrations` – User’s event registrations list.

- **Flows**
  - **User**:
    - See upcoming events → register → attend → leave feedback.
    - Check “My Registrations” for reminders/tracking.
  - **Admin**:
    - Create/edit events.
    - Review feedback & moderation dashboards.

### 4.5 Groups

- **Entry**
  - `/groups/*` – Groups list & details via `GroupsPage`.
  - `/groups/:id/manage` – Management page for group admins.

- **UX / role behavior**
  - Employers are redirected away from groups to events.
  - Inside `GroupsPage`:
    - `/groups` – Groups list (browse + join).
    - `/groups/new` – Create group (only if allowed by role/permission).
    - `/groups/:id` – Group detail with posts/members/etc.

### 4.6 Mentorship

Mentorship is a full module with its own layout.

- **Canonical hub**
  - `/mentorship` – `MentorshipLayout`
    - Internal tabs controlled by query params (e.g. `?tab=find`, `?tab=requests&sub=sent`).
    - Protected by `ProtectedRoute("request:mentorship")`.

- **Legacy redirects (for old URLs)**
  - `/mentorship/find` → `/mentorship?tab=find`  
  - `/mentorship/my-requests` → `/mentorship?tab=requests&sub=sent`  
  - `/mentorship/requests-to-me` → `/mentorship?tab=requests&sub=received`  
  - `/mentorship/me` → `/mentorship?tab=mentee`, etc.

- **Standalone routes**
  - `/mentorship/mentor/:id` – Public mentor profile card view.
  - `/mentorship/become-mentor`, `/mentorship/become-mentee`, `/mentorship/mentor-settings` – All redirect into settings tab of the hub.

- **Key flows**
  - **Find a mentor**:
    - `/mentorship` (tab `find`) → search & filter mentors → view profile → send mentorship request.
  - **Manage incoming requests (mentor)**:
    - `/mentorship` (tab `requests`, `sub=received`) → see incoming requests → accept/decline.
  - **Track active mentorships**:
    - `/mentorship` (tab `mentee`) → see current mentor, access chat, see history.
  - **Configure mentor/mentee profile**:
    - `/mentorship?tab=settings` → manage availability, capacity, preferences.

### 4.7 Messages

- **Route**
  - `/messages` – Component `Messages` (full messaging UI).
  - Protected by:
    - `RequireCompleteProfile`
    - `ProtectedRoute("message:users")`

- **UX**
  - Conversation list on the left.
  - Chat window on the right.
  - Integration with profile identities (names, avatars).
  - Mentorship chat respects relationship/permissions (read‑only if relationship closed).

### 4.8 Notifications & Admin

- **Notifications**
  - `/notifications` – Notifications list.
  - Bell icon in header shows count and opens notifications UI.

- **Admin**
  - `/admin/analytics` – Analytics dashboard.  
  - `/admin/users` – User management.  
  - `/admin/activity-logs` – Activity log viewer.  
  - `/admin/settings` – Admin settings hub.  
  - `/admin/csv` – CSV import/export.  
  - `/admin/events/:id/feedback` – Event feedback report.  
  - `/admin/mentor-approvals` – Mentor approvals queue.  
  - `/admin/verify` – Data verification dashboard.  
  - `/admin/feedback` – Feedback report.

---

## 5. Auth, Permissions & Guarding (Frontend View Layer)

### 5.1 `AuthProvider` & `useAuth`

- Provides:
  - `user` – Authenticated user object.
  - `profile` – Profile data.
  - `userRole` / `getUserRole()` – Normalized role.
  - `hasPermission(permissionKey)` – For feature gating.
  - `isAdmin` – Admin or super_admin convenience flag.
  - `rejectionStatus` / `approvalStatus` – For gating rejected/pending users.

### 5.2 Route Guards

- **`ProtectedRoute`**
  - Wraps a route element.
  - If user lacks `requiredPermission`, redirects to `/access-denied` or similar.

- **`RequireCompleteProfile`**
  - Ensures user has filled mandatory profile fields before using core app.
  - If incomplete, redirects to `/complete-profile`.

- **`ApprovedGuard`**
  - Used for employer‑only flows like job posting.
  - Ensures the user is approved as an employer before rendering the content.

---

## 6. Key UX Patterns & UI Conventions

- **Layout**
  - Sidebar navigation + top header.
  - Main content scrolls separately (`#main-content`).
  - Consistent padding `p-4/5/6` and background gradient for main area.

- **Responsive design**
  - Desktop: fixed sidebar, full header.
  - Mobile: hamburger menu + slide-in sidebar, stacked content.

- **Forms & error states**
  - Use toast notifications for success/error.
  - Many forms are multi‑step (e.g., registration, profile completion).
  - Errors are surfaced via both inline messages and toasts (UX friendly).

- **Loading states**
  - Global app uses a centered `LoadingSpinner` while auth is loading.
  - Individual pages and lists typically show skeletons or spinners per component.

- **Empty states**
  - Directory, jobs, events, and mentorship lists show:
    - Helpful explanation.
    - Next best actions (e.g., “Create first job”, “Broaden your filters”).

- **Role‑aware UX**
  - Employers:
    - See jobs as primary; directory/groups are hidden or redirected.
  - Alumni & Students:
    - See directory, mentorship, groups prominently.
  - Admin:
    - Get additional admin entry points and controls embedded in regular screens.

---

## 7. Feature Flow Summaries (User Journeys)

### 7.1 New User → Onboarded Member

1. Visit `/` → sees `HomePage`.
2. Click “Register” → `/register` (EnhancedRegister).
3. Complete required fields → account created.
4. After login, redirected to `/dashboard`.
5. If profile incomplete → redirected to `/complete-profile` until done.
6. Once complete, has access to Directory, Events, Jobs, Mentorship, etc., according to role.

### 7.2 Alumni → Directory → Connection

1. Open `/directory` from sidebar.
2. Use search, filters, role tabs.
3. Click on a profile card → `/directory/:id` or `/profile/:userId`.
4. See biography, academics, work info, social links.
5. Use connection/request actions (frontend triggers) to connect.

### 7.3 Employer → Jobs

1. Employer logs in and is approved.
2. Navigation surfaces “Job Portal”; employer routed away from alumni‑only sections.
3. At `/jobs` → can browse all jobs they posted; use posting links:
   - “Post Job”, “Post With Link”, “Create Listing”.
4. Manage applicants from `/jobs/:id/manage`.

### 7.4 Mentorship – Mentee

1. Go to `/mentorship?tab=find`.
2. Search/filter mentors.
3. Click mentor card → detailed mentor profile.
4. Send mentorship request.
5. Track status under `/mentorship?tab=requests&sub=sent`.
6. Once accepted, active mentorship appears under `/mentorship?tab=mentee`, with link to chat.

### 7.5 Mentorship – Mentor

1. Configure mentor profile + availability in `/mentorship?tab=settings&mode=mentor`.
2. Check incoming requests in `/mentorship?tab=requests&sub=received`.
3. Accept/decline requests.
4. Once accepted, mentorship relationship appears in dashboard and mentorship tab.

---

## 8. How to Reuse / Extend This Frontend

- **As a template**
  - Reuse:
    - Layout shell (`Navigation`, `Header`, `MobileNavContext`).
    - Route structures from `App.js`.
    - Patterns from Directory, Jobs, Events, Mentorship modules.
  - Replace branding:
    - Logos (`public/default-avatar.svg`, `Logo` component).
    - Text like “AMET Alumni” and the tagline.

- **To swap backends later**
  - Keep component structure and flows.
  - Replace implementations in:
    - `utils/supabase`
    - `api/` and `services/` modules
  - Maintain the same frontend contracts (props, hooks) to minimize rework.

---

## 9. Module Deep Dives with Role-Based Flow Summaries

This section goes deeper into the major frontend modules, their key components, hooks, UX responsibilities, and explicit role-based flows for Alumni, Students, Admins, Super Admins, and Employers. It remains **frontend-only** and treats backend/schema as a black box.

### 9.1 Auth & Identity Module

**Key directories / files**

- `contexts/AuthContext.js`
- `components/Auth/`
  - `Login.js`, `LoginOtp.js`, `TwoFactorAuth.js`
  - `EnhancedRegister.js`, `Register.js`, `RoleSelection.jsx`
  - `Profile.js`, `ProfileCompletion.jsx`, `ProfileResume.js`
  - `ForgotPassword.js`, `UpdatePassword.js`
  - `AuthListener.js`, `AuthCallback.js`
  - `ProtectedRoute.js`, `EmployerGuard.js`, `RequireCompleteProfile.jsx`
  - `RejectionPage.js`, `AccessDenied.js`

**Responsibilities & UX**

- Centralizes **authentication state** and **user profile**:
  - `AuthContext` exposes `user`, `profile`, `userRole`, `hasPermission`, `rejectionStatus`, etc.
  - Normalizes roles (alumni, student, employer, admin, super_admin) for consistent UI behavior.
- **Login & security flows**:
  - `Login.js` handles primary email/password login.
  - `LoginOtp.js` and `TwoFactorAuth.js` implement OTP/2FA UX, including code entry and error handling.
  - `ForgotPassword.js` and `UpdatePassword.js` handle reset flows with confirmation toasts.
- **Registration & onboarding**:
  - `EnhancedRegister.js` is the primary multi‑step registration experience.
    - Collects personal, academic, and professional details.
    - Aligns with the global rule: any data collected here is editable in Profile.
  - `RoleSelection.jsx` lets users choose between alumni, student, employer, etc., driving later UX.
  - `ProfileCompletion.jsx` enforces mandatory fields post‑signup.
- **Profile UX**:
  - `Profile.js` is the main profile settings screen.
  - `ProfileResume.js` manages resume uploads from the user’s perspective.
- **Guards & access control (frontend)**:
  - `ProtectedRoute.js` gates routes by permission key (e.g., `view:jobs`).
  - `RequireCompleteProfile.jsx` redirects users to `/complete-profile` until required fields are present.
  - `EmployerGuard.js` / `ApprovedGuard` ensure only approved employers see job‑posting UI.
  - `RejectionPage.js` provides a dedicated UX for rejected users: minimal shell, clear status.

**Typical user journeys**

- **Login** → `Login` → success → `AuthContext` updates → `AppContent` redirects to `/dashboard`.
- **New user** → `EnhancedRegister` → `ProfileCompletion` if needed → full app access.
- **Rejected user** → `AuthContext` marks `isRejected` → `AppContent` renders only `RejectionPage`.

---

### 9.2 Directory Module

**Key directories / files**

- `components/Directory/`
  - `DirectoryPage.jsx` – entry point for `/directory`.
  - `DirectoryGrid.jsx`, `DirectoryCard.jsx`, `DirectoryCardSplit.jsx`, `ProfileCard.jsx`.
  - `AlumniDirectory.js`, `AlumniCard.js`, `AlumniListItem.js`.
  - `AlumniProfile.js` – detailed view for `/directory/:id`.
  - `ChipBar.jsx`, `ActionRow.jsx` – quick filter/actions.
  - `ContactInfo.jsx`, `LockedContactInfo.jsx`, `ShareProfileModal.jsx`.
- Hooks & services
  - `hooks/useDirectorySecure.js`, `hooks/useDirectory.js`.
  - `hooks/useConnectionsRealtime.js`, `hooks/useConnectionStatus.js`, `hooks/useRoleCounts.js`.
  - `services/directoryApi.js`.

**Responsibilities & UX**

- Acts as the **alumni / students / employers directory** UI:
  - Supports search, filters (graduation year, department, degree, job title, location).
  - Distinguishes between alumni, students, and employers for listing.
  - Integrates **connection relationship state** (sent, received, connected) into list UI.
- **DirectoryPage.jsx** orchestrates:
  - Scroll reset and page layout when entering the directory.
  - Reads the current user (`supabase.auth.getUser()` view‑side) for local decisions.
  - Uses `useDirectorySecure` for consistent, role‑aware and paginated datasets.
  - Keeps internal state for:
    - Search term (with debounce).
    - Current page, page size, total count.
    - Sort order (`full_name,asc` by default).
    - Filters object with multiple dimensions.
- **Relationship UX**:
  - `useConnectionsRealtime` and `useConnectionStatus` allow cards to show dynamic badges like:
    - “Connected”, “Request sent”, “Incoming request”, etc.
  - `ChipBar.jsx` drives quick chip filters (All, Received, Sent, Connected) on top of the base dataset.
- **Profile detail UX** (`AlumniProfile.js`):
  - Rich profile layout with summary, academics, work, social links, and contact blocks.
  - Uses `ContactInfo` vs `LockedContactInfo` to reflect visibility rules.
  - Provides share actions via `ShareProfileModal`.

**Typical user journeys**

- Browse: `/directory` → scroll/paginate → apply filters → open profile.
- Connect: `/directory` → filter/search → open profile → trigger connection action → see status update via connection hooks.
- Share: open colleague profile → use “Share Profile” modal to copy a link or share within app.

---

### 9.3 Jobs Module

The Jobs module provides a full **job marketplace** experience for Alumni, Students, Employers, Admins, and Super Admins.

#### 9.3.1 Key directories / files

- `components/Jobs/`
  - **Listing & browsing**
    - `JobListingsPage.js` – main jobs landing page for `/jobs`.
    - `JobsList.js`, `JobListing.js` – list wrappers.
    - `JobCard.js/tsx`, `JobCard.jsx` – card layouts for each job.
    - `JobsFilterBar.jsx` – search and filter controls.
  - **Details & in-app views**
    - `JobDetails.js` / `JobDetail.js` – main detail pages for `/jobs/:id`.
    - `JobDetailsInApp.jsx`, `JobDetailsQuickLink.jsx/tsx` – variants for in-app vs external (quick-link) jobs.
  - **Applications (candidate side)**
    - `JobApplication.js`, `JobApplicationForm.js`, `JobApplyForm.js` – apply flows (form inputs, resume upload, etc.).
    - `ApplicationTracking.js` – per-job tracking for candidate.
    - `JobApplicationStatus.js` – global “My Job Applications” view (`/my-applications`).
  - **Employer & admin surfaces**
    - `PostJob.js`, `PostJobSelection.js`, `PostJobWithLink.js` – wizard for creating a job (link vs full form).
    - `JobPostingForm.js` – simpler posting form used by `/jobs/create`.
    - `ManageJobApplications.js` – owner/admin view of applications for a specific job (`/jobs/:jobId/manage` or `/jobs/:id/applications`).
    - `JobAdminPanel.js` – extra controls embedded on job details (visibility, moderation).
  - **Supporting UX**
    - `JobAlerts.js` – job alert management at `/jobs/alerts`.
    - `BookmarkButton.js`, `BookmarkedJobs.js`, `PinButton.js` – bookmarking and pinning.
    - `ResumeUploadForm.js` – upload & manage candidate resumes.
- APIs & hooks
  - `api/jobs.js` – feed and job fetch APIs (`fetchJobsFeed`, `fetchJobById`, `fetchExpiredJobsAdmin`, `fetchMyExpiredJobs`).
  - Hooks: `useOpenJobs.js`, `useExpiredJobs.js`, `useJobsRealtime.js` for realtime updates and admin/employer feeds.

#### 9.3.2 Routes and Permissions

Key job-related routes are configured in `App.js`:

- **Candidate-facing**
  - `/jobs` – `JobListingsPage`, behind `RequireCompleteProfile` + `ProtectedRoute("view:jobs")`.
  - `/jobs/:id` – detailed job view (`JobDetails`) behind `ProtectedRoute("view:jobs")`.
  - `/my-applications` – `JobApplicationStatus` behind `ProtectedRoute("apply:jobs")`.
  - `/jobs/applications` and `/jobs/applications/:id` – `ApplicationTracking` behind `ProtectedRoute("apply:jobs")`.
  - `/jobs/alerts` – `JobAlerts` behind `ProtectedRoute("view:jobs")`.
- **Employer-facing** (posting / managing)
  - `/jobs/post`, `/jobs/post/select`, `/jobs/post/link`, `/jobs/create`
    - Wrapped in `ApprovedGuard require="approved-employer"` and `ProtectedRoute("post:jobs")`.
    - Lead to `PostJob`, `PostJobSelection`, `PostJobWithLink`, `JobPostingForm` respectively.
  - `/jobs/:id/edit`, `/jobs/edit/:id` – `EditJob` behind `ProtectedRoute("post:jobs")`.
  - `/jobs/:jobId/manage`, `/jobs/:id/applications` – `ManageJobApplications` behind `ProtectedRoute("view:job_applications")`.
- **Redirect helpers**
  - `/jobs/:jobId/apply` → redirects to `/jobs/:jobId` (apply handled inline).
  - `/jobs/:jobId/application-success` → redirects to `/jobs/applications`.

Permissions on the frontend are consistent:

- `view:jobs` → can see listings and details.
- `apply:jobs` → can apply and view own application status.
- `post:jobs` → can create/edit jobs.
- `view:job_applications` → can see job applications for jobs they own (plus admins).

#### 9.3.3 Candidate Flows (Alumni, Students)

From the Jobs module’s perspective, **Alumni** and **Students** behave the same as candidates; differences are mostly in branding and approval conditions handled elsewhere.

**Entry:**

- From sidebar **Job Portal**, or from dashboard widgets → `/jobs`.
- Gated by `RequireCompleteProfile` and `ProtectedRoute("view:jobs")`.

**Searching and browsing (`JobListingsPage.js`)**

- `JobListingsPage` orchestrates:
  - Initial feed (via `v_jobs_feed_inr` or RPCs) and optional realtime updates (`useJobsRealtime`).
  - Search bar (keywords, location).
  - Filter side panel: job type, department, experience level, location, industry, salary range, posted date.
  - Layout toggle (grid vs list), pinned jobs, bookmarked jobs.
  - Per-card actions:
    - **View details** → `/jobs/:id`.
    - **Bookmark** → toggles bookmark via `toggleBookmarkRPC`, `BookmarkButton` state.
    - **Ask employer** → triggers connection + opens Messages (`requestConnectionForJob` + `/messages?peer=<employerId>&job=<jobId>`).

**Viewing details and applying**

- `JobDetails.js` shows:
  - Full description, responsibilities, requirements, salary, location, job type.
  - Company name + logo (from `getJobCompanyName`, `getJobLogoUrl`).
  - Application state, computed by `computeJobApplyState`:
    - Already applied, internal form active, external quick-link, or closed.
  - For candidates:
    - **Apply (in-app)** → opens `ApplyDialog` / `JobApplicationForm` for internal applications.
    - **Apply externally** → prompts confirmation and opens external URL in new tab.
    - **Application submitted** / **Applications closed** → read-only badges when appropriate.

**Tracking applications**

- **Per-job tracking:**
  - `ApplicationTracking.js` lets candidates see the progress of applications for a specific job.
- **Global tracking (`/my-applications`)**
  - `JobApplicationStatus.js` loads `job_applications` for the current user and joins job data.
  - Shows:
    - Job title, company.
    - Date applied.
    - Status badge using `normalizeStatus`, `STATUS_LABEL`, and `STATUS_BADGE_CLASS`.
    - Link to view job details, and if available, a signed URL to view uploaded resume.

**Job alerts (`/jobs/alerts`)**

- `JobAlerts.js` provides:
  - List of existing alerts per user.
  - A form to create/edit alerts:
    - Keywords, location, job type, experience level, salary range, frequency (daily/weekly/biweekly/monthly), active toggle.
  - Alerts are stored in `job_alerts` and control when users receive notification emails/in-app alerts for new matching jobs.

**Alumni vs Students**

- Frontend flows for browsing and applying are identical; any policy differences (e.g., which jobs are visible to students) are handled by backend/RLS.

#### 9.3.4 Employer Flows

Employers are users with `userRole === 'employer'` and `ApprovedGuard` passing as `approved-employer`.

**Entry & gating**

-- To **post or manage jobs**, they must:
  - Pass `ApprovedGuard require="approved-employer"`.
  - Have `post:jobs` and/or `view:job_applications` permissions.

**Posting a job (multi-step wizard)**

- `/jobs/post/select` → `PostJobSelection` – lets employers choose between:
  - **Quick link**: an external URL only.
  - **Full form**: rich job posting with all fields.

- `/jobs/post/link` and `/jobs/post` within `PostJob.js`:
  - Wizard with steps **Core Info → Job Content → Details & Contact**.
  - Validates title, company name, location, summary, and contact details.
  - Supports optional logo upload with type/size validation.
  - Uses `buildJobPayload` + Supabase client to submit a job posting payload.

- `/jobs/create` → `JobPostingForm.js` (simpler variant):
  - Manual vs import-from-link modes (toggle using MUI `ToggleButtonGroup`).
  - **Import from link** (demo): simulate an extraction from an external URL and pre-fill fields.
  - Manual post form:
    - Select verified company.
    - Job title, location, job type.
    - Description + requirements.
    - Salary range, deadline.
    - Application URL / email.
  - On submit: inserts a job row (through backend API) and shows success/error via toasts.

**Managing existing jobs and applications**

- In `JobListingsPage`, for jobs owned by the current employer:
  - Shows **Manage Applications** CTA that links to `/jobs/:id/applications` or `/jobs/:jobId/manage`.
  - May also surface **Edit Job** links via `JobAdminPanel` / dedicated edit routes.

- `ManageJobApplications.js` provides:
  - Paginated table of applications for a job, using `get_applications_for_job_v2` RPC.
  - Columns:
    - Applicant identity (name, degree, batch, current role).
    - Contact info, resume status (with signed URL view where available).
    - Application status (Submitted, Under Review, Shortlisted, Interviewing, Offered, Hired, Rejected) with a `<select>` control.
  - Actions:
    - Update status (with saving indicators).
    - View applicant directory profile.
    - Message applicant (if connected) or **Request Connection** (uses `idempotentConnect`, `getLatestEdge`) then route to Messages.

**Expired jobs**

- Employers (and admins) can use:
  - `fetchMyExpiredJobs` and `fetchExpiredJobsAdmin` via hooks (`useExpiredJobs`) to load expired postings.
  - UI surfaces (not fully shown above) use these to manage and possibly re-open or copy expired jobs.

#### 9.3.5 Admin and Super Admin Flows

Admins and Super Admins interact with Jobs in two ways:

1. **As regular users** (candidate or employer):
   - They follow the same candidate or employer paths as above when they apply for jobs or post jobs under their own accounts.

2. **As platform controllers**:
   - Their extra powers come from permissions like `access:all` and job-related admin views.

**Visibility & moderation**

- Admins and Super Admins:
  - Can see **Manage Applications** for any job (subject to backend/RLS) because `ManageJobApplications` relaxes ownership checks when `isAdmin` is true.
  - Can view expired jobs feed via `fetchExpiredJobsAdmin` to audit the marketplace.
  - Use `JobAdminPanel.js` to:
    - Control visibility / feature status.
    - Access moderation-related toggles (e.g., mark as verified, flag content).

**Role comparison**

- **Admin vs Super Admin** (from frontend’s POV):
  - Both can access `/admin/…` analytics, logs, and job verification tools.
  - Super Admin may see additional toggles and more powerful controls; the distinction is primarily in permission checks (`isAdmin` vs `userRole === 'super_admin'`).

#### 9.3.6 Role Summary – Jobs Portal

- **Alumni (candidate)**
  - Can browse jobs (`/jobs`), view details (`/jobs/:id`), create alerts, apply, and track their own applications (`/my-applications`, `/jobs/applications`).
  - Cannot post jobs unless also an employer.

- **Student (candidate)**
  - Same frontend flows as Alumni for searching and applying.
  - Any restrictions on which jobs they see are enforced backend-side.

- **Employer**
  - Can browse jobs like candidates.
  - Additionally, when approved and granted `post:jobs` / `view:job_applications`:
    - Can create jobs via `/jobs/post/*` and `/jobs/create`.
    - Can edit their jobs.
    - Can view and manage applications for their jobs (`/jobs/:jobId/manage`).

- **Admin**
  - Can act as candidate or employer personally.
  - Plus, can see and manage applications for more jobs (not just their own) where allowed by RLS.
  - Access to admin analytics and verification flows (outside this module) for job quality control.

- **Super Admin**
  - Same as Admin, with highest-level permissions.
  - Can use admin tools to audit all jobs, applications, and expired jobs via shared components and `jobs` APIs.

---

### 9.4 Events Module

**Key directories / files**

- `components/Events/`
  - High-level pages: `Events.js`, `EventsList.js`, `EventCard.js`.
  - Event details: `EventDetail.js`, `EventDetails.js`.
  - Creation & editing: `CreateEvent.js`, `CreateEventForm.js`, `EditEvent.js`, `EditEventForm.js`.
  - Calendar views: `EventCalendar.js`, `EventCalendarOverrides.css`.
  - Feedback: `EventFeedback.js`, `EventFeedbackDashboard.js`, `EventFeedbackDashboard.css`.
  - Moderation: `EventModerationPanel.jsx`.
  - Registrations: `MyRegistrationsList.js`, `EventRow.js`, `PriorityStrip.js`.
- Route wrapper
  - `pages/EventsPage.js` wires sub‑routes for `/events/*`.

**Responsibilities & UX**

- **Events list & discovery**:
  - `EventsList.js` shows upcoming and past events, often grouped with visual priority strips.
  - Users can open `EventCard` entries to see full details.
- **Event detail UX**:
  - `EventDetail.js` surfaces agenda, speakers, location, and registration CTA.
  - Shows registration state (registered / waitlisted / not registered) and post‑event actions (like “Leave Feedback”).
- **Creation & editing**:
  - `CreateEventForm.js` and `EditEventForm.js` reuse most fields with variations for new vs edit.
  - Admin‑only routes ensure non‑admins never see these forms.
- **Feedback & moderation**:
  - `EventFeedback.js` gives attendees a structured way to submit feedback.
  - `EventFeedbackDashboard.js` collates feedback for event owners/admins.
  - `EventModerationPanel.jsx` surfaces flags, approvals, and moderation actions.
- **Registrations UX**:
  - `MyRegistrationsList.js` provides a compact dashboard of events a user is registered for, often linked from the dashboard and notifications.

**Typical user journeys**

- End user: `/events` → inspect events → register → later visit `/events/my-registrations` → leave feedback from detail page.
- Admin: `/events/new` or `/events/:id/edit` → manage event metadata → review feedback & moderation panels as events run.

---

#### 9.4.1 Role Summary – Events Module

- **Alumni**
  - See **Events** in the sidebar if they have `access:events`.
  - On `/events` (`EventsList`):
    - Browse upcoming and past events, often grouped with priority strips.
    - Filter/search (by type, date ranges, categories – as configured in `EventsList`).
    - Open `/events/:id` (`EventDetail`) to see agenda, speakers, location, and registration CTA.
  - As attendees:
    - Can register for events (RLS/permissions enforce capacity and eligibility).
    - After attending, can leave feedback via `/events/:id/feedback` (`EventFeedback`).
    - See their registrations at `/events/my-registrations` (`MyRegistrationsList`) for reminders and quick access.

- **Students**
  - Frontend behavior largely mirrors Alumni, assuming they also have `access:events`.
  - Can:
    - Discover events in `/events`.
    - Register, attend, and leave feedback, subject to backend visibility rules.
  - Any restrictions (e.g., alumni-only events) are enforced backend-side; the UI simply reflects whether CTAs are available.

- **Admin**
  - As users:
    - Same flows as Alumni/Students for discovering and registering for events.
  - As controllers:
    - Can **create and edit events** via:
      - `/events/new` → `CreateEvent`/`CreateEventForm`.
      - `/events/:id/edit` → `EditEvent`/`EditEventForm`.
    - Use **event feedback and moderation tools**:
      - `/events/:id/feedback-dashboard` → `EventFeedbackDashboard` for aggregated feedback.
      - `/admin/events/moderation` → `EventModerationPanel` for reviewing flagged content, visibility, and approvals.
    - Can access admin-specific reports like `/admin/events/:id/feedback` (also wired to `EventFeedbackReport`).

- **Super Admin**
  - In most UIs, behaves like Admin with broader permissions (`access:all`).
  - Typically can:
    - View all events across tenants/roles.
    - Override or adjust configurations in moderation and feedback dashboards.
  - Frontend treats them as `isAdmin` for showing event-creation and moderation entry points; exact scope is governed by backend permissions.

- **Employers**
  - Employers see **Events** in the sidebar; they are redirected **from** Groups to Events in `App.js`.
  - As users:
    - Can browse events and register/attend where allowed.
    - May host or sponsor events depending on backend rules; from the frontend’s perspective, this is driven by event ownership/permissions returned by APIs.
  - Employers do **not** get a separate employer-only Events UI; they share the same `EventsList`/`EventDetail` components, with behavior controlled by permissions and event metadata.

---

### 9.5 Mentorship Module

The Mentorship module is a **mini-application inside the app** that handles the full lifecycle of mentor–mentee relationships, with role-aware UX and a canonical hub at `/mentorship`.

#### 9.5.1 Key directories / files

- `components/Mentorship/`
  - **Layout & tabs**
    - `MentorshipLayout.jsx` – top-level layout shell for `/mentorship` (header, banners, tabs, content container).
    - `MentorshipHub.jsx` – central router that reads query params and decides which panel to show.
    - `MentorshipTabs.jsx` – role-aware tab navigation using `?tab=…` instead of nested routes.
  - **Dashboards & status**
    - `MentorshipDashboard.js` – legacy/auxiliary dashboard view.
    - `MentorshipStatus.js`, `MentorshipStatusBanner.jsx`, `MentorshipStatusBannerStrip.jsx`, `MentorshipStatusChip.jsx` – small status components that summarize where the user is in the mentorship funnel (e.g., “Pending approval”, “Active mentee”, “Mentor capacity reached”).
    - `MyMentorship.js` – legacy all-in-one page (kept for reference; new flows should use hub + panels).
  - **Directory & discovery**
    - `MentorDirectory.js`, `MentorshipDirectory.js` – list views of mentors.
    - `RequestMentorshipButton.jsx` – dynamic CTA component for sending/cancelling requests based on current relationship state.
    - `MentorCapacityPill.jsx` – small UI badge showing how many mentees a mentor is currently handling vs capacity.
  - **Profiles & settings**
    - `MentorProfile.js` – public/semipublic mentor profile view (skills, experience, preferences).
    - `MentorSettings.js` – settings for mentors (availability, capacity, topics, bio).
    - `BecomeMentorForm.js` – guided form for users who want to become mentors.
    - `MenteeRegistrationForm.js`, `MentorRegistrationForm.js` – separate role-specific profile forms.
  - **Requests & approvals**
    - `MentorshipRequestsDashboard.js` – dashboard for reviewing requests (admin + mentor-focused variant).
    - `AdminMentorApprovals.js` – admin-facing queue for approving mentor applications.
  - **Sessions & scheduling**
    - `CreateSessionModal.js` – dialog for scheduling a mentorship session.
    - `SessionScheduler.js` – form UX for dates, times, and notes.
    - `SessionsCalendar.js` – calendar-style visualization for upcoming/past sessions.
  - **Communication surfaces**
    - `MentorContactPanel.js` – contextual contact entry point for a given mentor.
    - `MentorshipChat.js` – legacy component (deprecated) replaced by the unified `/messages` system.
- Mentorship pages (`src/pages/mentorship/`)
  - `FindMentorsPage.jsx` – dedicated mentee view for searching mentors.
  - `MyRequestsPage.jsx` – mentee-sent requests overview.
  - `RequestsToMePage.jsx` – mentor inbox for incoming requests.
  - `MyMentorshipPage.jsx` – mentee-centric view of active mentorships.
- Hooks & API
  - Hooks: `useMentorshipSummary.js`, `useMentorshipRoleContext.js/ts`, `useMentorshipEligibility.js`, `useMentorshipMutations.js/ts`, `useMentorshipBannerModel.js/ts`, `useOpenMentorshipChat.js`.
  - API/services: `api/mentorshipApi.js/ts`, `services/mentorship.js/ts`, `services/mentors.js`.

#### 9.5.2 Layout, Tabs, and Role Context

- **URL structure**
  - Main entry: `/mentorship`.
  - State is encoded in **query params**, not separate routes:
    - `tab` – which panel is active (`find`, `mentee`, `mentor`, `requests`, `settings`).
    - `sub` – sub-mode for the Requests tab (e.g., `sent`, `received`).
    - `mode` – mode for Settings (e.g., `mentee`, `mentor`).
    - `highlightRequestId`, `highlightRelationshipId` – optional context for banners/focus.

- **`MentorshipLayout.jsx`**
  - Provides a consistent shell:
    - Header: title and short description.
    - Status banners: `MentorshipStatusBannerStrip` sits under the header and uses hooks to show relevant banners.
    - Tab bar: `MentorshipTabs` lives under banners and is always visible.
    - Content container: a centered column where `MentorshipHub` renders the active panel.

- **`MentorshipTabs.jsx`**
  - Uses `useMentorshipRoleContext()` to determine which tabs to show:
    - Mentee-only: `Find Mentors`, `My Mentors`, `My Requests`, `Settings (mentee)`.
    - Mentor-only: `My Mentees`, `Requests (received)`, `Settings (mentor)`.
    - Dual-role: shows both sides (`Find Mentors`, `My Mentors`, `My Mentees`, `Requests`, `Settings`).
  - Clicking a tab updates the query string and navigates to `/mentorship?tab=…` (with optional `sub`/`mode`).
  - Uses accessible tab semantics (`role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`).

- **`MentorshipHub.jsx`**
  - Reads `tab`, `sub`, `mode`, and highlight params from URL.
  - Uses `useMentorshipRoleContext()` to compute a **role-aware default tab** if none is provided:
    - Dual-role: prefer `requests` if there are outstanding requests, else `mentee`.
    - Mentor-only: default to `mentor` (My Mentees).
    - Mentee-only: if no active mentors or requests, default to `find`; otherwise `mentee`.
  - Switches to one of the panel components:
    - `FindMentorsPanel` – mentee discovery.
    - `MyMentorsPanel` – list of current mentors for the user.
    - `MyMenteesPanel` – list of mentees when user is a mentor.
    - `RequestsPanel` – shows incoming or outgoing requests based on `sub`.
    - `MentorshipSettingsPanel` – profile/availability settings, using `mode` to switch between mentee/mentor views.

#### 9.5.3 Core Flows – Mentee Side

- **Discover and filter mentors**
  - `FindMentorsPage.jsx` (and `FindMentorsPanel`) fetches a curated list of mentors.
  - UX includes:
    - Search box (by mentor name, organization, title).
    - Toggle to show only mentors who are currently accepting mentees and have capacity (uses `MentorCapacityPill` and backend flags).
    - Each mentor card shows:
      - Name, role, organization.
      - Areas of expertise and preferences.
      - Capacity state (e.g., spots left, full).

- **Requesting mentorship**
  - `RequestMentorshipButton.jsx` decides the correct CTA label per mentor:
    - `Request mentorship`, `Request pending`, `Mentorship active`, `Request rejected`, etc.
  - When sending a request, it:
    - Calls a mutation hook that in turn calls `createMentorshipRequest` in `mentorshipApi`.
    - Uses `useMentorshipSummary` to enforce the **max 5 pending requests** rule client-side and show friendly error messages.

- **Tracking requests and relationships**
  - `useMentorshipSummary.js` centralizes lightweight state:
    - `requests` – mentee’s outgoing requests (id, status, mentor_id, etc.).
    - `relationships` – active/past mentorship relationships.
    - `mentorRow` – if the current user is a registered mentor.
  - Derived flags: `hasAnyActiveMentor`, `hasAnyOutgoingRequests`, `pendingRequestCount`, `hasReachedRequestLimit`.
  - `MyRequestsPage.jsx` and parts of `RequestsPanel` show:
    - List of mentors requested, statuses, and created times.
    - Actions such as cancel (when pending), with toasts for success/failure.

- **Active mentorship overview**
  - `MyMentorshipPage.jsx` (and `MyMentorsPanel`) use `relationships` to show:
    - Current mentor(s) with basic info and status chips.
    - Links to open chat or schedule sessions for a given relationship.

#### 9.5.4 Core Flows – Mentor Side

- **Becoming a mentor**
  - `BecomeMentorForm.js` and `MentorRegistrationForm.js` collect:
    - Headline/bio, experience, domains of expertise.
    - Preferred mentee types (students, early-career, switching careers, etc.).
    - Availability and capacity (max mentees).
  - Once submitted, mentor status appears in banners and in `MentorshipRequestsDashboard`.

- **Managing incoming requests**
  - `RequestsToMePage.jsx` uses `v_my_mentorship_dashboard` (viewed via Supabase from the frontend) to load:
    - All mentorship requests where the current user is the mentor.
    - Status, mentee identity, created time.
  - Allows:
    - **Accept** – via `mentorship_request_respond` RPC, then shows success toast and refreshes list.
    - **Decline** – same RPC with a `rejected` status; prompts for confirmation.
  - Handles capacity errors (e.g., maximum mentees reached) with clear toasts.

- **Managing mentees and sessions**
  - `MyMenteesPanel` shows active mentees with quick links to:
    - Open chat (via `useOpenMentorshipChat`).
    - Schedule a new session (`CreateSessionModal`).
    - View session history (`SessionsCalendar`).
  - `MentorSettings.js` lets mentors:
    - Toggle availability (`is_available_for_mentorship`).
    - Adjust capacity and refine their profile.

#### 9.5.5 Requests, Relationships, and Status Banners

- **Requests**
  - Frontend always treats mentorship requests as **pending state machines**:
    - Pending → Accepted → Active relationship created.
    - Pending → Rejected.
    - Pending → Cancelled by mentee/system.
  - `MentorshipStatusChip`, `MentorshipStatusBanner`, and `MentorshipStatusBannerStrip` use data from `useMentorshipSummary` and other hooks to:
    - Show banners like “You have 3 pending mentorship requests” or “Your mentor application is under review”.
    - Highlight blockers such as request limit or missing mentor profile info.

- **Relationships**
  - `useMentorshipSummary` exposes `relationships` with `status` fields, which drive:
    - Whether “End mentorship” actions appear.
    - Whether the chat and session scheduler are enabled.
  - `mentorshipApi.respondToMentorshipRequest` returns a `relationshipId` when a request is accepted, which is used to open chat or attach sessions.

#### 9.5.6 Chat Integration (Unified Messages System)

- **Canonical approach**
  - New mentorship chat UX does **not** use `MentorshipChat.js` directly.
  - Instead, components call `useOpenMentorshipChat` → `openMentorshipChat(relationshipId)` in `mentorshipApi`.
  - On success, the user is navigated to:
    - `/messages?conversationId=<id>&source=mentorship&relationshipId=<id>`.
  - `ChatWindow.js` in the Messages module renders the conversation and uses the `source` and `relationshipId` to:
    - Show mentorship-aware banners and pills.
    - Respect mentorship status when deciding if messages can be sent.

- **Legacy components**
  - `MentorshipChat.js` and `MyMentorship.js` are explicitly marked as **deprecated** in comments:
    - They use older tables and direct DM helpers.
    - They are kept for reference only and should not be used in new flows.

#### 9.5.7 Hooks and State Model

- **`useMentorshipSummary`**
  - Single source of truth for **mentee-side summary state**.
  - Used by:
    - Banners (`MentorshipStatusBanner*`).
    - Request CTAs (`RequestMentorshipButton`).
    - Mentee dashboard views.
  - Provides:
    - Raw collections: `requests`, `relationships`, `mentorRow`.
    - Derived flags: `hasAnyOutgoingRequests`, `hasAnyActiveMentor`, `hasMentorProfile`, `isApprovedMentor`, `pendingRequestCount`, `hasReachedRequestLimit`.

- **`useMentorshipRoleContext`**
  - Encapsulates **role classification** for the mentorship module:
    - Is the user a mentor, mentee, both, or neither yet?
    - Are there pending mentor approvals?
  - Drives which tabs appear and which default tab is selected.

- **`useMentorshipMutations`**
  - Thin wrapper hooks around `mentorshipApi` operations for use with React Query style patterns:
    - Create/cancel requests.
    - Accept/reject requests.
    - Toggle mentor availability.
    - End mentorship relationships.

- **`useMentorshipBannerModel`**
  - Derives which banners should be displayed based on:
    - Approval states.
    - Request/relationship counts.
    - Role context.

- **`useOpenMentorshipChat`**
  - Small hook that calls `openMentorshipChat(relationshipId)` and performs navigation.
  - Centralizes error handling (e.g., if conversation cannot be opened for safety reasons).

#### 9.5.8 Edge Cases and UX Safeguards

- **Request limits**
  - Mentees are limited (front-end) to 5 pending requests; additional requests surface a friendly error and CTA to manage existing requests.

- **Capacity**
  - Mentors can define max mentee capacity; when full, the UI
    - Hides or disables “Request mentorship” actions.
    - Surfaces capacity messages in badges and status banners.

- **Role changes**
  - Moving from mentee-only to dual-role is supported by the flexible tab model: becoming a mentor simply adds mentor tabs without removing mentee tabs.

- **Chat gating**
  - Even with an existing relationship, chat can be disabled if:
    - Relationship is no longer active (ended/expired).
    - Safety tools like block/disconnect are in effect.
  - In these cases, the UI shows read-only history or guidance instead of an input box.

- **Legacy UIs**
  - Legacy components are deliberately annotated with big `@deprecated` banners in comments to avoid accidental reuse.
  - New work should be built on **MentorshipLayout + MentorshipHub + panels + mentorshipApi + hooks**.

#### 9.5.9 Role Summary – Mentorship Portal

- **Alumni**
  - Default behavior: Alumni are primarily **mentees** and can access Mentorship if they have `request:mentorship`.
  - As mentees:
    - Tabs: `Find Mentors`, `My Mentors`, `My Requests`, `Settings (mentee)`.
    - Flow: `/mentorship?tab=find` → discover mentors → send requests → track in `My Requests` → active mentorships appear in `My Mentors` with chat + sessions.
  - As mentors (once they apply and are approved):
    - Tabs expand to dual‑role: add `My Mentees` + `Requests` + combined Settings.
    - Flow: `/mentorship?tab=settings&mode=mentor` → complete mentor profile → incoming requests appear in `Requests` (`sub=received`) → accept/decline → manage mentees + sessions.

- **Students**
  - Frontend behavior is the same as Alumni in mentee mode.
  - Students usually appear only as mentees:
    - `Find Mentors` lists mostly alumni/employer mentors.
    - Request/limit, tracking, and banner logic are identical (`useMentorshipSummary`, `useMentorshipRoleContext`).
  - If a Student is ever allowed to become a mentor (via backend rules), they become dual‑role and get the same mentor tabs and flows as Alumni mentors.

- **Admin**
  - As a **user** inside `/mentorship`:
    - Follows the same mentee/mentor or dual‑role patterns as Alumni/Students depending on their own mentorship setup.
  - As a **platform controller**:
    - Uses `AdminMentorApprovals` (route: `/admin/mentor-approvals`) to review and approve mentor applications.
    - Uses `MentorshipRequestsDashboard` to audit and act on mentorship requests across the system (not just their own):
      - See all requests with mentor/mentee identities.
      - Accept/reject requests (subject to backend rules), with clear status chips and toasts.
    - Can thus unblock or enforce mentorship flows globally.

- **Super Admin**
  - In `/mentorship`, behaves like Admin + any mentee/mentor roles they have personally.
  - With higher‑level permissions (`access:all`), they typically:
    - See all admin mentorship tools.
    - Have the broadest scope for approvals and request handling in `AdminMentorApprovals` and `MentorshipRequestsDashboard`.
  - Frontend components treat Super Admins as `isAdmin` for gating UI, with finer distinctions handled via permissions if needed.

- **Employers**
  - Navigation only surfaces Mentorship if an employer has `request:mentorship` permission; otherwise the **Mentorship** entry won’t appear.
  - By default, employers are focused on the Jobs/Companies areas and typically **do not** participate in mentorship.
  - If an employer account is explicitly given mentorship permissions, the mentorship UX follows the same mentee/mentor/dual‑role logic as Alumni:
    - They can request mentorship or become mentors based on how `useMentorshipRoleContext` classifies them.
  - Any policy distinctions (e.g., restricting employers from certain mentorship roles) are enforced on the backend and reflected through which tabs, banners, and actions become available.

---

### 9.6 Groups & Networking Module

**Key directories / files**

- `components/Groups/`
  - `GroupsList.js` – main list of groups.
  - `GroupDetail.js` – group detail page with members and posts.
  - `CreateGroup.js` – in‑module group creation.
  - `CommentsThread.jsx` – reusable comments thread inside groups.
- `components/Networking/`
  - `CreateGroup.js`, `CreateGroupForm.js` – networking‑flavoured group creation.
  - `GroupDetails.js` – networking group detail (used by older/parallel flows).
- API & hooks
  - `api/groups.js/ts` – group‑related network calls.

**Responsibilities & UX**

- Provides a **community groups** experience:
  - Browse visible groups.
  - View group information and updates in `GroupDetail`/`GroupDetails`.
  - Join or leave groups (CTAs usually appear near the header and/or member list).
- **Role‑aware behavior**:
  - Employers are redirected away from `/groups` to `/events` from `App.js`.
  - Permissions (e.g., `access:groups`, `groups:create`) determine whether the user can see/create groups.
- **Comments & engagement**:
  - `CommentsThread.jsx` offers threaded discussion within group contexts, including posting comments, reactions, and basic moderation UI elements.

**Typical user journeys**

- Discover groups: `/groups` → browse topical/departmental groups → open a group → join.
- Interact: once in a group, use comment threads and updates to stay engaged with other alumni.

---

#### 9.6.1 Role Summary – Groups Module

- **Alumni**
  - See **Groups** in the sidebar if they have `access:groups`.
  - On `/groups` (`GroupsList`):
    - Can search, filter by privacy (All/Public/Private), filter by membership (All/Joined/Created), and by tags.
    - Can join **public, approved** groups immediately (`joinGroup` RPC → active membership).
    - For **private** groups, the CTA becomes `Request to join` (pending request state via `group_memberships`).
    - Alumni may see special tags like `alumni-only`; they can join those groups (students may be blocked).
  - Can **create groups** when `canCreateGroup(userRole)` is true (alumni/admin/super_admin):
    - `/groups/new` → `CreateGroup` → name, description, tags, privacy, optional avatar.
    - New groups may appear as pending until approved (indicated by status chips in `GroupCard`).
  - Inside a group (`/groups/:id`, `GroupDetail`):
    - If member: can read posts, engage with comment threads (`CommentsThread`), and see member list.
    - If group admin/creator: can edit group details, upload avatar, manage members (promote/demote, remove), and moderate posts.

- **Students**
  - Same basic browsing/joining flow as Alumni if they have `access:groups`.
  - `GroupsList` specifically checks for:
    - `userRole === 'student'` and an `alumni-only` tag → CTA becomes `Alumni only`, disabled.
  - So students:
    - Can discover and join general groups.
    - Are **blocked** from groups tagged as alumni-only.
  - Group creation for students depends on backend/ACL via `canCreateGroup(userRole)`; if disabled, `CreateGroup` redirects back with an error toast.

- **Admin**
  - As a **user**:
    - Same as Alumni/Student in terms of discovery and membership.
    - Typically allowed to create groups via `canCreateGroup('admin')`.
  - As a **platform controller**:
    - `GroupsList` receives `canManageAllGroups` (derived from admin permissions) and:
      - Shows additional moderation states on cards (Approved / Pending / Rejected / Archived).
      - Allows admins to see and manage more groups (even those they did not create), subject to RLS.
    - In `GroupDetail`, admins can:
      - Edit group metadata (name, description, tags, privacy, admin-only posts, archived state).
      - Approve/reject groups (via `approveGroup` and related APIs) or archive/unarchive.
      - Manage memberships (approve join requests, change member roles, remove members).

- **Super Admin**
  - Behaves like Admin in the UI but with the broadest permissions (`access:all`).
  - Typically has full visibility into **all** groups and memberships.
  - Can use the same components (`GroupsList`, `GroupDetail`, `api/groups`) to:
    - Approve or reject new groups.
    - Enforce global policies (e.g., archive problematic groups, toggle admin-only posts, lock down membership).
  - Frontend treats them as `isAdmin` for gating; finer-grained authority is defined by permissions from `useAuth`/ACL utilities.

- **Employers**
  - **Navigation and routing are deliberately restrictive**:
    - `Navigation` hides **Groups** for `userRole === 'employer'`.
    - In `App.js`, employers hitting `/groups/*` get redirected to `/events`.
  - Result: employers **cannot** browse, join, or create groups from the normal UI.
  - Any future exceptions (e.g., employer-only groups) would require relaxing these frontend guards and matching backend rules.

---

### 9.7 Messages Module

**Key directories / files**

- `components/Messages/`
  - High-level: `Messages.js` (shell that composes the pieces), `MessagingSystem.js`.
  - Lists & layout: `ConversationList.js`, `ConnectionsPanel.jsx`, `ConnectionManager.js`.
  - Chat window: `ChatWindow.js`, `MessageBubble.js`, `MessageWrapper.js`.
  - Modals: `NewConversationModal.js`.
- API & hooks
  - `api/dm.js` – direct messaging API wrapper.
  - `hooks/useDmRealtime.js`, `hooks/useOpenMentorshipChat.js`, `hooks/useConnections.js`, `hooks/useConnectionsRealtime.js`.

**Responsibilities & UX**

- Implements a **two‑pane messaging experience**:
  - Left: conversation list (recent messages, unread counts, filters for connections/mentors, etc.).
  - Right: detailed chat view (`ChatWindow`) with message bubbles, timestamps, and typing/ sending UX.
- **Conversation lifecycle**:
  - `NewConversationModal` allows starting a new conversation from a directory/connection context.
  - `ConnectionsPanel` focuses on discovering who you can message (e.g., connections eligible for DM).
- **Realtime & state**:
  - `useDmRealtime` hooks into push updates for new messages.
  - `useConnectionsRealtime` keeps connections panel in sync with requests/acceptances.
- **Mentorship integration**:
  - Mentorship conversations are often surfaced inside `MentorshipChat` but share UX patterns with `Messages`.
  - Chat sending is conditioned on mentorship status when in mentorship‑specific rooms.

**Typical user journeys**

- Existing connection: `/messages` → pick a conversation → send a message, see it appear in real‑time.
- New conversation: trigger “Message” from profile/directory → `NewConversationModal` → start DM → conversation appears in list.

---

#### 9.7.1 Role Summary – Messages/DM Module

- **Alumni**
  - See **Messages** in the sidebar if they have `message:users` permission.
  - On `/messages` (`MessagingSystem`):
    - Two tabs: **Chats** and **Connections** (with badge for pending received requests).
    - In **Chats**, `ConversationList` shows threads with a green dot when `can_send` is true (connected).
    - Can open any thread; if not connected, a yellow banner prompts to connect before sending.
    - Can start new conversations via directory “Message” actions, which resolve/create a DM thread via `ensureDmThreadWith`.
  - Sending is gated by:
    - Account approval (`isFullyApproved` via `useAuth`).
    - Connection status (`can_send` from `v_my_dm_threads` or connection edge).
  - Alumni can receive and respond to messages from any connected peer (students, employers, admins).

- **Students**
  - Frontend behavior mirrors Alumni for messaging if they have `message:users`.
  - Can discover and open conversations; the same connection/approval gates apply.
  - Any policy differences (e.g., who can initiate with students) are enforced by backend/RLS; UI reflects available CTAs.

- **Admin**
  - As users:
    - Same conversation list and chat UX as Alumni/Students.
    - Can message any connected peer, including employers and students.
  - As controllers:
    - No distinct admin-only messaging UI in the current frontend; they use the same `MessagingSystem`.
    - May see additional context (e.g., admin notes or system messages) if the backend injects them into `dm_messages` or thread metadata.
  - Admins are not exempt from the connection/approval gates unless backend rules grant them.

- **Super Admin**
  - Uses the same `MessagingSystem` as other roles.
  - May have broader visibility into threads if backend RLS exposes more data to `access:all`.
  - Frontend treats them as `isAdmin` for permission checks; no special messaging UI is present.

- **Employers**
  - See **Messages** in the sidebar; they are redirected from Groups to Events, but Messages remain available.
  - Can:
    - Browse their conversations and chat with connected users (alumni, students, admins).
    - Receive connection requests and accept/decline them via the ChatWindow banner.
    - Start conversations via directory “Message” actions, subject to connection rules.
  - Sending is also gated by `isFullyApproved` (employer approval) and connection status.
  - Employers do not have a separate employer-only messaging UI; they share `ConversationList`/`ChatWindow` with all roles.

---

### 9.8 Admin Module

**Key directories / files**

- `components/Admin/`
  - Settings & dashboard: `AdminSettings.js`, `Dashboard.js`, `AppSettings.js`, `SuperAdminPanel.js`.
  - Users & roles: `UserManagement.js`, `UserApprovalDashboard.js`, `UserDetailsModal.js`, `EditUserModal.js`, `RejectUserModal.js`, `RoleManagement.js`, `RoleManagement.fix.js`, `PermissionsManagement.js`, `users/` subfolder.
  - Content & jobs: `ContentApproval.js`, `ContentDetailsModal.js`, `JobVerification.js`, `JobApplicationReview.js`.
  - Analytics & logs: `Analytics.js`, `ActivityLogs.js`.
  - CSV & data: `CSVImportExport.js`, `CSVExport.js`, `DataVerificationDashboard.jsx`.
  - Security & quality: `SecurityCheck.jsx`, `AdminActions.js`.
- Hooks & API
  - `api/admin.js`, `api/adminUsers.js`.
  - `hooks/useAdminUsersGrid.js`, `hooks/useNotifications.ts/js` (for admin alerts).

**Responsibilities & UX**

- Provides **administrative surfaces** without exposing raw backend details:
  - User and role management: approve/reject users, change roles, review user details.
  - Content and job moderation: approve group posts, events, jobs, and other user‑generated items.
  - Monitoring: view analytics, activity logs, and various dashboards.
  - Data operations: CSV import/export, data verification, quality and security checks.
- **Guarded access**:
  - `AdminGate.js` is used in routes to ensure only admins/super_admins enter admin UIs.
  - Many components assume `hasPermission('access:all')` or similarly privileged keys.

**Typical user journeys**

- Platform admin: open `/admin/settings` or `/admin/analytics` → adjust configurations → review analytics & activity logs.
- Moderator: use `ContentApproval` / `JobVerification` / `MentorsTab` to approve or reject user content and role upgrades.

---

### 9.9 Shared Hooks, APIs, and Services

**Hooks (`src/hooks/`)**

- **Identity & profiles**: `useCurrentUser.js`, `useMyProfile.js`, `useProfileById.js`, `useAvatar.js`, `useSignedImage.js`.
- **Directory & connections**: `useDirectory.js`, `useDirectorySecure.js`, `useConnections.js`, `useConnectionRel.js`, `useConnectionStatus.js`, `useConnectionsPanel.js`, `useConnectionsRealtime.js`, `useRoleCounts.js`.
- **Academics & metadata**: `useAcademicsCatalog.js/ts`, `useDegreePrograms.js`, `useDepartments.js`.
- **Jobs & events**: `useOpenJobs.js`, `useExpiredJobs.js`, `useEventData.js`, `useJobsRealtime.js`.
- **Mentorship**: `useMentorshipSummary.js`, `useMentorshipRoleContext.js/ts`, `useMentorshipEligibility.js`, `useMentorshipMutations.js/ts`, `useMentorshipBannerModel.js/ts`, `useOpenMentorshipChat.js`.
- **Notifications & activity**: `useNotification.js` (UI‑level), `useNotifications.js/ts`, `useRecentActivity.js`, `useGlobalBadges.js`.
- **Admin**: `useAdminUsersGrid.js` for tabular admin user views.

These hooks encapsulate **frontend data access patterns** so that components work mostly with domain‑level objects (profile, job, event, connection) rather than raw API calls.

**APIs (`src/api/`)**

- `admin.js`, `adminUsers.js` – admin operations.
- `comments.js` – comments/threads.
- `dm.js` – direct messaging.
- `groups.js/ts` – groups.
- `jobs.js` – jobs.
- `mentorshipApi.js/ts` – mentorship.
- `notifications.js/ts` – notifications.
- `keys.ts` – API key routing/config structure (frontend‑safe, non‑secret).

These modules sit on top of `utils/supabase` and centralize the **frontend’s contract** with external data, making it easier to swap out the backend later.

**Services (`src/services/`)**

- `profile.js`, `avatar.js` – profile and avatar utilities for the logged‑in user.
- `directoryApi.js` – directory-specific helpers.
- `mentors.js`, `mentorship.js/ts`, `adminMentorship.js` – structured mentorship operations.
- `socialLinks.js/ts`, `socialLinks.validation.js` – social link normalization and validation.

These services provide **higher‑level business operations** to components and hooks, helping keep views declarative (e.g., “update my profile”, “get mentors for current mentee”) rather than constructing low‑level queries in components.

---

### 9.10 How to Use This Deep Dive in Practice

- **As a new developer**: start with sections 1–7 for orientation, then use section 9 to jump directly into the module you are working on.
- **When adding features**: find the closest existing module and extend its components, hooks, and API/service layer rather than creating isolated patterns.
- **When swapping backends**: keep sections 9.9 (hooks/APIs/services) as the integration layer; change only those while keeping module UIs stable.

---

## 10. Role-Based Flow Summary (All Modules)

### 10.1 Alumni

- **Directory**: Full browse/search/connect capabilities; can view and initiate connections with students, alumni, employers (subject to privacy/RLS).
- **Events**: Can view, register for, attend, and leave feedback for events; cannot create events unless also admin.
- **Jobs**: Can browse, apply, track applications, and set alerts; cannot post jobs unless also employer.
- **Mentorship**: Primarily acts as mentee; can discover mentors, send requests, track active mentorships, and chat; can become mentor after approval.
- **Groups**: Can browse, join (including alumni-only groups), create groups, and moderate groups they administer.
- **Messages**: Can send/receive messages with any connected peer; must be connected and approved to send.
- **Admin**: If also admin/super_admin, gains admin tools and moderation capabilities.

### 10.2 Students

- **Directory**: Similar to alumni but with student-specific fields (expected graduation year, student ID); can connect with alumni and peers.
- **Events**: Can view, register, attend, and leave feedback; cannot create events.
- **Jobs**: Can browse and apply; cannot post jobs.
- **Mentorship**: Acts as mentee only; cannot become mentor unless explicitly allowed by backend.
- **Groups**: Can browse and join general groups; blocked from alumni-only groups; may or may not create groups depending on backend policy.
- **Messages**: Same as alumni; must be connected and approved to send.
- **Admin**: Typically no admin access unless explicitly granted admin role.

### 10.3 Employers

- **Directory**: Can browse alumni/student directory; auto-redirected from directory to jobs in some flows.
- **Events**: Can view, register, attend, and leave feedback; redirected from groups to events.
- **Jobs**: Can browse, post jobs (if approved), manage applications, and view applicants; cannot apply for jobs as candidates.
- **Mentorship**: Generally not involved; may participate if explicitly granted mentorship permissions.
- **Groups**: Explicitly blocked from groups; redirected to events.
- **Messages**: Can message connected users (alumni, students, admins); must be connected and approved.
- **Admin**: Typically no admin access unless explicitly granted admin role.

### 10.4 Admin

- **Directory**: Enhanced view with additional counts/filters; can approve/reject users and manage directory content.
- **Events**: Can create, edit, moderate events; access feedback and moderation dashboards.
- **Jobs**: Can view and manage applications for jobs they own; may have broader moderation capabilities depending on permissions.
- **Mentorship**: Can approve mentor applications; can view and act on mentorship requests across the system.
- **Groups**: Can create groups; can approve/reject groups, manage memberships, and moderate content.
- **Messages**: Same messaging UX as other roles; no special admin-only messaging UI.
- **Admin**: Full access to admin tools: user management, analytics, logs, data operations, settings.

### 10.5 Super Admin

- **Directory**: Same as admin with potentially broader visibility across tenants.
- **Events**: Same as admin with platform-wide event management capabilities.
- **Jobs**: Same as admin with ability to audit all jobs and applications.
- **Mentorship**: Same as admin with broadest scope for approvals and system-wide mentorship oversight.
- **Groups**: Same as admin with full visibility into all groups and ability to enforce global policies.
- **Messages**: Same as admin; may have broader visibility into conversations.
- **Admin**: Highest-level access: tenant management, platform settings, global configurations, and ability to manage other admins.

---

## 11. Security & Permission Model

### 11.1 Frontend Permission System

- **Roles**: `alumni`, `student`, `employer`, `admin`, `super_admin` stored in `public.profiles.role`.
- **Permissions**: Derived from `BASE_PERMISSIONS` in `AuthContext`; role-based keys like `access:dashboard`, `view:jobs`, `message:users`, etc.
- **Guards**: `ProtectedRoute`, `RequireCompleteProfile`, `ApprovedGuard`, `AdminGate` enforce permission checks at route level.
- **UI Gating**: Components use `hasPermission`, `getUserRole`, and `isAdmin` flags to conditionally render features.

### 11.2 Connection & Messaging Security

- **Connection Required**: Messaging requires users to be connected (`can_send` flag from `v_my_dm_threads` or connection edge).
- **Approval Gates**: Users must be `isFullyApproved` to send messages; pending/rejected users have read-only access.
- **Thread Isolation**: Users can only see conversations where they are participants; enforced by RLS and frontend checks.

### 11.3 Role-Based Feature Restrictions

- **Employers**: Blocked from Directory and Groups; redirected to Jobs and Events respectively.
- **Students**: Blocked from alumni-only groups; cannot become mentors unless explicitly allowed.
- **Admin/Super Admin**: Access to admin tools; moderation capabilities across modules.

### 11.4 Multitenancy Considerations

- **Tenant Isolation**: Frontend respects tenant-scoped data via RLS and backend permissions.
- **Feature Flags**: Tenant-specific features controlled via `tenant_feature_flags` and `TenantProvider`.
- **Cross-Tenant Protection**: Admin tools enforce tenant boundaries; super_admin can override where appropriate.

---

## 12. Development Guidelines

### 12.1 Adding New Features

1. **Identify the closest module** (Directory, Jobs, Events, Mentorship, Groups, Messages, Admin).
2. **Extend existing components, hooks, and API/service layers** rather than creating isolated patterns.
3. **Follow role-based permission patterns** using `hasPermission` and appropriate guards.
4. **Maintain consistent UX patterns** for loading states, error handling, and empty states.

### 12.2 Role-Based Development

- **Always consider role implications** when adding new features.
- **Use `useAuth` and permission helpers** to conditionally show/hide functionality.
- **Test across all roles** (Alumni, Student, Employer, Admin, Super Admin) to ensure proper gating.

### 12.3 Security Best Practices

- **Never rely solely on frontend checks**; ensure backend RLS and RPCs enforce the same restrictions.
- **Use connection/approval gates** for sensitive operations like messaging and mentorship requests.
- **Validate all user inputs** and sanitize data before API calls.

### 12.4 Code Organization

- **Keep components focused** on specific UI responsibilities.
- **Centralize business logic** in hooks and services.
- **Maintain consistent API contracts** through the `api/` layer.

---

## 13. Conclusion

This comprehensive report provides a complete overview of the AMET Alumni frontend architecture, UX flows, and role-based behaviors across all modules. The frontend is built as a role-gated React SPA with consistent patterns for authentication, permissions, and module-specific functionality. Each module (Directory, Jobs, Events, Mentorship, Groups, Messages, Admin) has been documented with its components, hooks, APIs, and explicit role-based flows for Alumni, Students, Employers, Admins, and Super Admins.

The architecture supports:
- **Scalable role-based access control** with clear separation between user types
- **Consistent UX patterns** across all modules
- **Real-time capabilities** through Supabase integration
- **Modular design** that facilitates maintenance and future enhancements
- **Security-conscious implementation** with both frontend and backend enforcement

This documentation serves as a comprehensive reference for developers, product managers, and stakeholders working with the AMET Alumni platform frontend.
