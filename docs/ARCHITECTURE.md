# System Architecture — AMET Alumni Portal

## Quick Overview

A multi-tenant alumni management platform with 5 user roles, 10 modules, and 74 features. Built on modern cloud infrastructure with zero-trust security (RLS at database level).

### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React | 18.3.1 |
| Routing | React Router | 7.5.1 |
| Styling | TailwindCSS + MUI | 3.4.17 + 5.18.0 |
| Data fetching | TanStack Query | 5.80.7 |
| Database | PostgreSQL (Supabase) | 15 |
| Auth | Supabase GoTrue | JWT |
| Storage | Supabase Storage | S3-compatible |
| Edge Runtime | Deno | TypeScript |
| Frontend Host | Vercel | Edge CDN |
| Backend Host | Supabase Cloud | Managed |

### Database Scale

| Metric | Count |
|--------|-------|
| Tables | 105 |
| Functions | 559 |
| Triggers | 777 |
| RLS Policies | 404 |
| Indexes | 470+ |

### Edge Functions
- **event-reminders** — SendGrid email reminders for upcoming events
- **mentor-matching** — AI matching via Groq llama3-8b-8192
- **send-feedback-notification** — Email on feedback submission

### Security Model
Authorization is enforced at THREE layers:
1. **Client-side guards** — UI hides restricted elements
2. **API permission checks** — Supabase SDK validates operations
3. **PostgreSQL RLS** — Database-level enforcement (source of truth)

### Storage Buckets
| Bucket | Privacy | Purpose |
|--------|---------|---------|
| avatars, profile-images | Public | Profile photos |
| resumes, cover-letters | Private | Career documents |
| message_attachments | Private | Conversation media |
| event-images | Public | Event banners |

---

# AMS‑AMET System Architecture Book

> **Scope**: This document captures the full architecture of the AMS‑AMET system as of this analysis – frontend, backend (Supabase), permissions, roles, and major flows – in one place.
>
> It is derived from the current codebase and our deep dive in this session. It is **descriptive, not prescriptive**: it documents how things actually work now.

---

## 0. High-Level Overview

### 0.1 Stack

- **Frontend**
  - React SPA using React Router.
  - Central auth/role/permission context in `AuthContext`.
  - Uses Supabase JS client directly for data and RPC calls.
  - React Query used for some modules (e.g., mentorship).

- **Backend**
  - Supabase (PostgreSQL + Auth + Storage + Edge Functions / RPCs).
  - Business logic in SQL functions (RPC), triggers, and **Row Level Security (RLS)** policies.
  - No separate custom Node API layer; frontend goes directly to Supabase.

- **Security / Permissions Model**
  - Primary roles: `alumni`, `student`, `employer`, `admin`, `super_admin`.
  - Frontend permissions:
    - BASE_PERMISSIONS in `AuthContext` (core app-wide permission tokens).
    - Additional module-level permissions (groups/mentorship) in `lib/permissions.js`.
    - Route-level gating via `ProtectedRoute`.
    - Per-user approval state via `useApproval` and Supabase RPCs.
  - DB-side enforcement:
    - Helper functions like `get_user_role`, `fc_is_fully_approved`, `is_site_admin`.
    - Extensive RLS policies per table.

---

## 1. Roles & Permissions

### 1.1 Primary Roles

These are values in `public.profiles.role` and are the backbone of RBAC:

- `alumni`
- `student`
- `employer`
- `admin`
- `super_admin`

There are also **derived statuses**, not primary roles but important flags:

- **Mentorship**: mentor / mentee (from mentorship tables & approval state).
- **isAdminLike**: helper meaning `role in ('admin','super_admin')`.
- **Approval flags** via `useApproval`: `isApproved`, `isPending`, `isRejected`, `isFullyApproved`, `isApprovedEmployer`, `isApprovedMentor`, etc.

### 1.2 Permission Token × Role Matrix

This table shows which base permission tokens each role has, based on `AuthContext.BASE_PERMISSIONS` and `lib/permissions`.

Legend:  
- **A** = alumni, **S** = student, **E** = employer, **AD** = admin, **SA** = super_admin.  
- `✓` = explicitly granted in code.  
- `✓*` = effectively granted via `access:all` (for AD / SA).

#### 1.2.1 Core App Permissions (AuthContext BASE_PERMISSIONS)

| Permission token | A | S | E | AD | SA | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `access:dashboard` | ✓ | ✓ | ✓ | ✓* | ✓* | A/S/E explicit; AD/SA via `access:all`. |
| `view:jobs` | ✓ | ✓ | ✓ | ✓* | ✓* | Job list & details. |
| `apply:jobs` | ✓ | ✓ |  | ✓* | ✓* | A/S explicit; admins mostly for support. |
| `post:jobs` |  |  | ✓ | ✓* | ✓* | Employers + admins. |
| `manage:jobs` |  |  | ✓ | ✓* | ✓* | Employer job tools. |
| `view:job_applications` |  |  | ✓ | ✓* | ✓* | Employer & admin owner views. |
| `manage:company_profile` |  |  | ✓ | ✓* | ✓* | Employers edit company details; admins can override. |
| `access:events` | ✓ | ✓ | ✓ | ✓ | ✓ | Everyone can access events module. |
| `events:create` |  |  |  | ✓ | ✓ | Admin + super_admin only. |
| `view:alumni_directory` | ✓ | ✓ |  | ✓* | ✓* | Employers are redirected away from directory. |
| `request:mentorship` | ✓ | ✓ |  | ✓* | ✓* | Mentees (A/S) + admins. |
| `become:mentor` | ✓ |  |  | ✓* | ✓* | Alumni mentor flows. |
| `manage:mentor_profile` | ✓ |  |  | ✓* | ✓* | Alumni mentor profile & slots. |
| `manage:mentee_requests` | ✓ |  |  | ✓* | ✓* | Mentors & admins managing requests. |
| `chat:mentees` | ✓ |  |  | ✓* | ✓* | Messaging with mentees (via DM). |
| `manage:mentoring_slots` | ✓ |  |  | ✓* | ✓* | Mentor capacity management. |
| `access:groups` | ✓ | ✓ |  | ✓* | ✓* | Groups module (employers redirected). |
| `message:users` | ✓ | ✓ | ✓ | ✓* | ✓* | Direct messaging; gated by approval & connection. |
| `access:profile_settings` | ✓ | ✓ | ✓ | ✓* | ✓* | Profile & settings screens. |
| `access:all` |  |  |  | ✓ | ✓ | Grants all other perms as wildcard. |
| `view:feedback_reports` |  |  |  | ✓* | ✓ | Super_admin explicit; admins via `access:all`. |

#### 1.2.2 Groups & Mentorship-Specific Permissions (`lib/permissions.js`)

These are used in addition to BASE_PERMISSIONS.

| Permission token | A | S | E | AD | SA | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `groups:create` | ✓ |  |  | ✓ | ✓ | Alumni + admins can create groups. |
| `groups:approve` |  |  |  | ✓ | ✓ | Admin + super_admin approve groups. |
| `mentorship:request` | ✓ | ✓ |  | ✓ | ✓ | Mirrors `request:mentorship`. |
| `mentorship:accept` |  |  |  | ✓ | ✓ | Admins/mentors in mentorship dashboards. |
| `mentorship:availability:update` |  |  |  | ✓ | ✓ | Admin-side overrides. |
| `mentors:approve` |  |  |  | ✓ | ✓ | Admin mentor approvals. |
| `mentors:reject` |  |  |  | ✓ | ✓ | Admin mentor rejections. |

The **full permission-token matrix** and **role × module × action matrix** are in:

- `archive/docs/role-module-action-matrix.md` – canonical reference.

---

## 2. Modules & High-Level Capabilities

At a high level, modules are:

1. Auth & Identity  
2. Dashboard  
3. Directory & Profiles  
4. Jobs  
5. Events  
6. Groups  
7. Mentorship  
8. Messaging / DM  
9. Notifications & Activity  
10. Companies / Employer  
11. Admin

The detailed **role × module × action matrix** for these modules is already captured in `role-module-action-matrix.md` and matches current behavior.

---

## 3. Frontend Architecture

### 3.1 App Shell, Routing & Layout

**File:** `frontend/src/App.js`

- Wraps app with:
  - `<Router>`
  - `<QueryClientProvider>` (React Query)
  - `<AuthProvider>` (AuthContext)
  - `<RealtimeProvider>` (Supabase realtime wiring)
  - `<NotificationProvider>` (in-app notifications)
  - `<AuthListener>` (sync auth state)

- `AppContent` uses `useAuth()` for:
  - `user`, `profile`, `loading`, `getUserRole`, `rejectionStatus`.
  - Handles:
    - **Post-login redirect**: if user becomes non-null on `/login` → `/dashboard`.
    - **Rejection**: if `rejectionStatus.isRejected` → only `/rejection` route is rendered.
    - **Loading**: full-page spinner while auth is initializing.

- Layout:
  - If authenticated and not rejected:
    - Left Navigation (`Navigation`) and top Header (`Header`).
    - Main content: routes rendered in `<main id="main-content">`.
  - If unauthenticated:
    - Public routes: home, login/register, legal pages, etc.

### 3.2 ProtectedRoute

**File:** `frontend/src/components/Auth/ProtectedRoute.js`

- Reads from `useAuth()`:
  - `isAuthenticated`, `loading`, `hasPermission`, `userRole`, `getUserRole`, `session`.

- Logic:
  - If `loading` → full-screen loading indicator.
  - If not authenticated → redirect to `/login` with `from` in state.
  - If `requireVerifiedEmail` and `session?.user?.email_confirmed_at` is null → `/access-denied`.
  - If `requireAdmin` and `!isAdminLike(userRole)` → `/access-denied`.
  - If `allowRoles` and `userRole` not in list → `/access-denied`.
  - Legacy/backward-compatibility:
    - If `requiredPermission` and `!hasPermission(requiredPermission)` → `/access-denied`.
    - If `isSuperAdminOnly` and `getUserRole() !== 'super_admin'` → `/access-denied`.

This is the **canonical route gate** for all authenticated features.

---

## 4. AuthContext in Detail

**File:** `frontend/src/contexts/AuthContext.js`

### 4.1 Stored State

- `user`: Supabase auth user (id, email, metadata, etc.).
- `profile`: row from `public.profiles` with extended fields (role, approval_status, academic/employer info).
- `session`: Supabase auth session.
- `loading`: whether auth is initializing / fetching profile.
- `approvalFlags`: snapshot from `get_current_user_flags` RPC or derived from `profile`.
- `rejectionStatus`: whether profile is rejected.
- `isAdmin`, `isAdminLike`: computed from role.
- `approvalStatus`, `isApproved`, `isRejected`, `isPending`, `isFullyApproved`.

### 4.2 Role Handling

- `getUserRole()`:
  - Prefer `profile.role` if valid (guarded by `isRole()` helper).
  - Else `user.user_metadata.role` if valid.
  - Default `'alumni'`.

- `userRole`: cached result of `getUserRole()`.
- `isAdmin = userRole === 'admin' || userRole === 'super_admin'`.
- `isAdminLike` and `isSuperAdmin` exposed in context.

### 4.3 Permissions

- `BASE_PERMISSIONS` map keyed by role.
- `derivePermissions(role, approvalFlags)` handles:
  - Rejected → empty set (except admin roles).
  - Pending → limited read-only set.
  - Approved → full base permissions for that role.

- `getEffectivePermissions()` returns the derived set for current user.
- `hasPermission(token)`:
  - If no token → `true`.
  - If `perms` includes `access:all` or the token → `true`.
- `hasAnyPermission(tokens[])` / `hasAllPermissions(tokens[])` also implemented.

This context is the **single source of truth for frontend roles & permissions**.

---

## 5. Major Frontend Modules – Deeper View

Below is a summary chapter per major module. For detailed action-level matrices, see `role-module-action-matrix.md`.

### 5.1 Jobs Module (Frontend)

**Key components**:

- `JobListingsPage`
- `JobDetails`
- `PostJob`, `PostJobWithLink`, `JobPostingForm`
- `EditJob`
- `ManageJobApplications`
- `JobAlerts`
- `JobApplication`, `ApplicationTracking`, `JobApplicationStatus`
- `ResumeUploadForm`

**Routing (from App.js)**:

- `/jobs` → `RequireCompleteProfile` + `ProtectedRoute requiredPermission="view:jobs"`.
- `/jobs/alerts` → `ProtectedRoute requiredPermission="view:jobs"`.
- `/jobs/post*` & `/jobs/create` → `ApprovedGuard require="approved-employer"` + `ProtectedRoute requiredPermission="post:jobs"`.
- `/jobs/applications*` & `/my-applications` → `ProtectedRoute requiredPermission="apply:jobs"`.
- `/jobs/:id` → `ProtectedRoute requiredPermission="view:jobs"`.
- `/jobs/:id/edit` & `/jobs/edit/:id` → `ProtectedRoute requiredPermission="post:jobs"`.
- `/jobs/:jobId/manage` & `/jobs/:id/applications` → `ProtectedRoute requiredPermission="view:job_applications"`.

**Important flows**:

- **JobListingsPage**:
  - Reads `userRole`, `hasPermission`, approval status.
  - Shows:
    - "My Applications" button for alumni/students.
    - "My Job Alerts" for everyone with `view:jobs`.
    - "Post a Job" button only if user logically can post (employer/admin) and is an approved employer.
  - Jobs list uses filters and search string in URL.

- **PostJob**:
  - Two posting flows:
    1. **Quick Link**: minimal fields + external application URL.
    2. **Full In-App Form**: full job description, skills, salary, deadlines.
  - Both enforce:
    - `isApprovedEmployer` or admin.
    - Company existence (lookup or create in `companies`).
    - Optional logo upload into `company-logos` storage and propagate to `companies.logo_url`.

- **EditJob**:
  - Loads job row from `jobs` (with company join) based on `id` route parameter.
  - Validates external URL constraints (only one of apply/application/external url; scheme checks).
  - If employer uploads a logo, updates `companies.logo_url` for `company_id`.
  - Admins can directly toggle `is_approved` and `is_active` fields; non-admins cannot.

- **ManageJobApplications**:
  - Validates user is owner (posted_by/user_id/created_by) or admin via RLS and explicit checks.
  - Uses RPC `get_applications_for_job_v2` with paging.
  - For each application:
    - Signs resume URLs from storage bucket (`resumes`) for owner view only.
    - Resolves applicant display name from `profiles` if necessary.
    - Allows status updates via `set_application_status` RPC.
    - Integrates DM and connections: employer can view profile, request connection, or DM candidate.

Jobs is a **fully role-aware module** where FE, RPCs, and RLS align tightly.

---

### 5.2 Events Module (Frontend)

**Key components**:

- `EventsPage`, `EventsList`, `EventDetail`
- `CreateEvent`, `EditEvent`
- `MyRegistrationsList`
- `EventFeedback`, `EventFeedbackDashboard`, `EventFeedbackReport`
- `EventModerationPanel`

**Routing**:

- `/events/*`, `/events/my-registrations` → `access:events`.
- `/events/edit/:id`, `/events/create`, `/events/new` → `events:create`.
- `/admin/events/:id/feedback`, `/admin/events/moderation` → `access:all`.

**Key logic**:

- Non-admin users see only approved + published events.
- Admins can create, edit, and moderate events.
- RSVP logic is role-sensitive:
  - Alumni/students: must be fully approved to RSVP "going".
  - Employers: may RSVP "going" only to recruitment events; otherwise blocked.
  - Admins/super_admins are allowed given RLS and FE logic.

Event feedback flows are RLS-backed and ensure pairing between attendee and event.

---

### 5.3 Groups Module (Frontend)

**Key components**:

- `GroupsPage`
- `GroupDetail`
- `GroupManage` (management for admins/group-admins)
- `AdminGroupsPage`
- Helper utilities: `api/groups.ts`, ACL utilities (`canJoinGroup`, `canPostToGroup`).

**Routing**:

- `/groups/*`:
  - If employer role → redirect to `/events`.
  - Else: `ProtectedRoute requiredPermission="access:groups"`.
- `/groups/:id/manage`:
  - Same employer redirect; then `access:groups` + `RequireGroupAdmin`.

**Key logic**:

- **Group creation**:
  - Uses RPC `create_group_and_add_admin` with `guardEmployers()`.
  - Alumni and admins can create; employers and students cannot.

- **Membership**:
  - `GroupDetail` loads membership & membership count.
  - `handleMembership` enforces:
    - Must be logged in.
    - `canJoinGroup(group, userRole, isMember)` (role-aware and alumni_only constraints).
    - Pending approval accounts can browse but not join.
    - Private groups: join disabled except invites; user sees clear messages.
    - Last-admin guard before leaving: uses `group_members` count with role='admin' and user filter.

- **Posts/comments**:
  - `handleCreatePost` and comments enforce that:
    - User is approved (`isUserApproved`).
    - User is member.
    - User is not employer.
    - `canPostToGroup` allows posting (not archived, admin-only when flagged).
  - Writes to `group_posts` and `group_comments` go through helper functions that call Supabase; RLS enforces ownership and membership.

- **Lifecycle**:
  - `AdminGroupsPage` uses RPCs:
    - `approveGroupRpc`, `rejectGroupRpc`, `archiveGroupRpc`, `deleteGroupRpc`.
  - Buttons (approve, reject, archive, delete) are visible only to `isAdmin`/`isSuperAdmin` per the page logic.

Groups is an example of **hybrid FE + RLS**: FE expresses intent (who should see buttons/joins/posts), RLS ensures safety.

---

### 5.4 Mentorship & Messaging

These modules are deeply integrated with approvals and connections; they rely heavily on Supabase RPCs and RLS.

- Mentorship uses a hub layout (`MentorshipLayout`) and multiple panels for the mentee/mentor lifecycle.
- Messaging uses DM threads and messages linked to connections and mentorship relationships.
- `mapMentorshipError` and `mapDmErrorToMessage` map backend errors into user-friendly reasons (e.g. not eligible, capacity reached, not connected, not approved).
- Chat windows (`ChatWindow`) compute `canSend` from approval and connection state and disable/annotate the DM input accordingly.

---

## 6. Backend & Database (Supabase)

This section summarizes the main database entities and RPCs per module, as inferred from the codebase and prior schema snapshots. It is not an exhaustive schema dump but captures **all key atoms** needed to reason about behavior and RLS.

### 6.1 Core Entities (Selected)

- Auth & Identity
  - `auth.users` – base auth identities.
  - `public.profiles` – app user profile; key columns:
    - `id` (UUID, PK, matches auth.user.id)
    - `role` (enum: `'alumni'|'student'|'employer'|'admin'|'super_admin'`)
    - personal fields (first/last name, full_name, email, phone, location, etc.)
    - academic (degree_code, department_id, graduation_year, etc.)
    - employer-specific (company_name, current_job_title, company_id, industry, etc.)
    - approval fields (`approval_status`, alumni_verification_status, is_approved)
    - `is_available_for_mentorship` and mentor-profile flags.

- Jobs
  - `jobs` – job postings. Fields include:
    - `id`, `title`, `company_name`, `location`, `job_type`, `description`, `requirements`, `skills`, `salary_range`, `salary_min`, `salary_max`.
    - External links: `application_url`, `external_url`, `apply_url`.
    - Ownership: `posted_by`, `user_id`, `created_by`, `company_id`.
    - Status flags: `is_approved`, `is_rejected`, `is_active`, `approval_status`, etc.
    - Deadlines: `deadline`, `application_deadline`.
  - `job_applications` – per-user applications:
    - `id`, `job_id`, `applicant_id`, `resume_url/resume_path`, `status`, timestamps.
  - `companies` – employer companies with `logo_url`, `name`, `created_by`.
  - `resume_profiles`, `user_resumes` – structured resumes & uploads.
  - `job_application_audit` – status transitions & actor details.

- Events
  - `events` – main event table with many fields for organizer info, category, pricing, approval and publishing.
  - `event_rsvps` / `event_attendees` – event participation records.
  - `event_feedback` – feedback per user/event.

- Groups
  - `groups` – group definition: `id`, `name`, `description`, `is_private`, `alumni_only`, `is_admin_only_posts`, `is_archived`, `is_approved`, `approval_status`, `is_rejected`, timestamps and audit fields.
  - `group_members` – membership: `group_id`, `user_id`, `role` (`admin`/`member`), `status`, timestamps.
  - `group_posts`, `group_comments` – content with `group_id`, `post_id`, `user_id`, `content`, etc.
  - `group_invitations`, `group_memberships` – invites and pending joins.
  - `group_audit_log`, `group_membership_audit`, `group_rate_limits` – moderation, auditing, rate-limits.

- Mentorship
  - `mentorship_requests` – `id`, `mentor_id`, `mentee_id`, `status`, message/goals, timestamps.
  - `mentorship_relationships` – active/ended relationships: `id`, `mentor_id`, `mentee_id`, `status`, `start_date`, `end_date`, `dm_thread_id`.
  - `mentors` – mentor profiles & statuses.

- Messaging / DM
  - `conversations` / DM-specific tables, normalized to:
    - `conversation_participants` (or equivalent join) linking users to conversation.
    - `messages` / `dm_messages` containing content.
  - Views:
    - `v_my_dm_threads` (or similar) – conversations visible to current user.

- Notifications & Admin
  - `notifications`, `notification_events`, `notification_audit_log`.
  - `activity_logs`, `activity_log`, `user_activity_logs`.
  - `admin_notifications`, `admin_actions`, `admin_deletion_audit_log`.

### 6.2 Key RPCs (Functions)

**Jobs**
- `get_applications_for_job_v2(p_job_id, p_limit, p_offset)` – returns applications for a job for the owner/admin.
- `set_application_status(p_application_id, p_status)` – status transitions with logging & RLS.

**Groups**
- `create_group_and_add_admin(...)` – create a group and its first admin member.
- `join_group(p_group_id)` – user join logic (alumni_only, employer restrictions, etc.).
- `leave_group(p_group_id)` – user leave logic with last-admin guard.
- `approve_group(p_group_id)` / `reject_group(p_group_id, p_reason)` – platform-level approval.
- `archive_group(p_group_id)` / `delete_group_secure(p_group_id)` – lifecycle and safe deletion.
- `approve_group_member`, `reject_group_member`, `set_member_role`, `remove_member` – membership moderation.

**Mentorship**
- `mentorship_request_create(p_mentor_id, p_message, p_goals)`.
- `mentorship_request_respond(p_request_id, p_new_status, p_reason)`.
- `mentorship_request_cancel(p_request_id)`.
- `mentorship_toggle_availability(p_next)`.
- `mentorship_open_chat(p_relationship_id)` – ensures DM thread for mentorship.

**Messaging / DM**
- `ensure_dm_thread_with(p_other)` – find/create DM thread for two users.
- `send_dm_message(p_thread_id, p_body)` – send DM; enforces participant + relationship rules.
- `dm_mark_thread_read(p_thread_id, p_user_id)` – mark as read.
- `user_block(p_other_user_id, p_reason)` – block across DM and relationships.

**Identity / Approval**
- `get_current_user_flags()` – provides `approval_status` and `is_fully_approved` flags to frontend.

### 6.3 Row-Level Security (RLS) – Patterns

- RLS is **enabled** on all sensitive tables like `profiles`, `jobs`, `job_applications`, `events`, `groups`, `group_members`, `mentorship_requests`, `mentorship_relationships`, DM tables, and most notification/audit tables.

Common RLS patterns:

- **Owner-only**: `where user_id = auth.uid()` or equivalent for user-owned tables.
- **Participant-only**: for DM threads/messages, only participants may read/write; enforced in views and RPCs.
- **Role-based**: `get_user_role(auth.uid()) IN ('admin','super_admin')` or `is_site_admin()` for admin-table access.
- **Approval-based**: `fc_is_fully_approved(auth.uid())` or equivalent gating sensitive operations (job posting, DM send, connection edges, etc.).
- **Multi-table**: join RLS rules for composite entities (e.g., job applications require both job-owner or applicant context).

RLS is the **ultimate authority**; frontend permissions and RPCs are designed to align with, not replace, these rules.

---

## 7. References

- **Role × Module × Action Matrix**:  
  `archive/docs/role-module-action-matrix.md`

- **This Architecture Book**:  
  `archive/docs/system-architecture-book.md`

These two documents together give you a 100–200% depth view of **who can do what, where, and how** in the AMS‑AMET system.
