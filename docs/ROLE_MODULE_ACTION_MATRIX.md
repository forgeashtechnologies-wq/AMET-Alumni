# Role × Module × Action Matrix

Legend:
- Roles (columns): **A** = alumni, **S** = student, **E** = employer, **AD** = admin, **SA** = super_admin.
- Values:
  - `✓` allowed  
  - `✓*` allowed with conditions (noted in **Notes** column)  
  - `—` not applicable / normally not used

---

## 1. Auth & Identity

| Action | A | S | E | AD | SA | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Register | ✓ | ✓ | ✓ | ✓ | ✓ | Role set via signup/metadata. |
| Login / Logout | ✓ | ✓ | ✓ | ✓ | ✓ | Standard Supabase auth. |
| View own profile | ✓ | ✓ | ✓ | ✓ | ✓ | `/profile`, profile drawer. |
| Edit own profile | ✓ | ✓ | ✓ | ✓ | ✓ | Fields limited by SAFE_PROFILE_FIELDS, RLS. |
| Change password | ✓ | ✓ | ✓ | ✓ | ✓ | `/update-password`. |
| Access Security settings | ✓ | ✓ | ✓ | ✓ | ✓ | `access:profile_settings` perm. |
| Be globally rejected | ✓* | ✓* | ✓* | — | — | Rejection page; then blocked from app. |

---

## 2. Dashboard

| Action | A | S | E | AD | SA | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| View unified dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | `access:dashboard`. |
| See own recent activity | ✓ | ✓ | ✓ | ✓ | ✓ | Filtered by actor_id. |

---

## 3. Directory & Profiles

| Action | A | S | E | AD | SA | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Browse alumni directory | ✓ | ✓ | ✗ | ✓ | ✓ | Employers redirected from `/directory` to `/jobs`. |
| View other alumni profile | ✓ | ✓ | ✗ | ✓ | ✓ | `view:alumni_directory`, RLS-backed view. |
| View employer public company profile | ✓ | ✓ | ✓ | ✓ | ✓ | `/companies/:id`, `PublicCompanyProfile`. |
| View own user profile page (`/profile/:userId`) | ✓ | ✓ | ✓ | ✓ | ✓ | RLS ensures only fields allowed. |

---

## 4. Jobs Module

### 4.1 Job discovery & applying

| Action | A | S | E | AD | SA | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| View job listings (`/jobs`) | ✓ | ✓ | ✓ | ✓ | ✓ | `view:jobs`. |
| View job details (`/jobs/:id`) | ✓ | ✓ | ✓ | ✓ | ✓ | `view:jobs`. |
| Apply to a job (in‑app) | ✓ | ✓ | ✗ | ✓* | ✓* | `apply:jobs`; admins mostly for support. |
| View own applications (`/jobs/applications`, `/my-applications`) | ✓ | ✓ | ✗ | ✓* | ✓* | `apply:jobs`. |

### 4.2 Job posting & management

| Action | A | S | E | AD | SA | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Access job posting UI | ✗ | ✗ | ✓* | ✓ | ✓ | `post:jobs` + ApprovedGuard `approved-employer`. |
| Post Quick Link job | ✗ | ✗ | ✓* | ✓ | ✓ | `PostJob` QuickLink flow; employer must be approved. |
| Post full in‑app job | ✗ | ✗ | ✓* | ✓ | ✓ | `JobPostingForm` path, same guards. |
| Edit own job (`/jobs/:id/edit`) | ✗ | ✗ | ✓* | ✓ | ✓ | Owner or admin; via RLS + `post:jobs`. |
| Pause / resume own job | ✗ | ✗ | ✓* | ✓ | ✓ | Only owner/admin (`ownerOrAdmin` check). |
| View applications for job | ✗ | ✗ | ✓* | ✓ | ✓ | `view:job_applications`, owner/admin via RLS + RPC. |
| Change application status | ✗ | ✗ | ✓* | ✓ | ✓ | `set_application_status` RPC; owner/admin only. |

---

## 5. Events Module

### 5.1 Browsing & visibility

| Action | A | S | E | AD | SA | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| View events list/detail | ✓ | ✓ | ✓ | ✓ | ✓ | `access:events`; non-admins see approved+published only. |
| View own registrations | ✓ | ✓ | ✓ | ✓ | ✓ | `/events/my-registrations`. |

### 5.2 Creation & moderation

| Action | A | S | E | AD | SA | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Create event | ✗ | ✗ | ✗ | ✓ | ✓ | `events:create`. |
| Edit event | ✗ | ✗ | ✗ | ✓ | ✓ | `events:create` + RLS on events. |
| Access moderation panel | ✗ | ✗ | ✗ | ✓ | ✓ | `/admin/events/moderation`, `access:all`. |
| Approve / reject events | ✗ | ✗ | ✗ | ✓ | ✓ | Via moderation panel RPCs. |
| View admin feedback reports | ✗ | ✗ | ✗ | ✓ | ✓ | `EventFeedbackReport`, `access:all`. |

### 5.3 RSVP & feedback

| Action | A | S | E | AD | SA | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| RSVP “going” to event | ✓* | ✓* | ✓* | ✓ | ✓ | A/S: only when approved; E: only for recruitment events; enforced by `EventDetail` + RLS. |
| Cancel RSVP | ✓ | ✓ | ✓ | ✓ | ✓ | Same constraints as above. |
| Submit event feedback | ✓ | ✓ | ✓ | ✓ | ✓ | Auth user; RLS ensures correct pairing with event. |

---

## 6. Groups Module

### 6.1 Discovery & access

| Action | A | S | E | AD | SA | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| View public groups | ✓ | ✓ | ✓ | ✓ | ✓ | RPC/view filtered by role & status. |
| View private group content | ✓* | ✓* | ✗ | ✓ | ✓ | Only members or site-admin; RLS + FE guard. |

### 6.2 Creation & membership

| Action | A | S | E | AD | SA | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Create group | ✓ | ✗ | ✗ | ✓ | ✓ | Via `create_group_and_add_admin`; employers blocked. |
| Join public, approved group | ✓* | ✓* | ✗ | ✓ | ✓ | A/S must be approved; employers blocked; admins can join. |
| Request join for private group | ✓* | ✓* | ✗ | ✓ | ✓ | Often via invites or join logic under RLS. |
| Leave group | ✓ | ✓ | ✗ | ✓ | ✓ | Last-admin guard enforced by FE+DB. |

### 6.3 Content & lifecycle

| Action | A | S | E | AD | SA | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Create post in group | ✓* | ✓* | ✗ | ✓ | ✓ | Must be member, approved; blocked when `is_admin_only_posts` or archived. |
| Comment in group | ✓* | ✓* | ✗ | ✓ | ✓ | Member-only; employers blocked. |
| Manage group members (promote/demote/remove) | ✗ | ✗ | ✗ | ✓ | ✓ | Via RPCs; group-admins and site-admins. |
| Approve/reject groups (platform-level) | ✗ | ✗ | ✗ | ✓ | ✓ | RPCs from admin dashboard. |
| Archive group | ✗ | ✗ | ✗ | ✓* | ✓* | Site-admin or group-admin; determined by RPC/RLS. |
| Delete group (hard delete) | ✗ | ✗ | ✗ | ✗ | ✓ | Super_admin only via `delete_group_secure`. |

---

## 7. Mentorship Module

| Action | A | S | E | AD | SA | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Access mentorship hub | ✓ | ✓ | ✗ | ✓ | ✓ | `request:mentorship`. |
| Browse mentors | ✓ | ✓ | ✗ | ✓ | ✓ | Directory of approved mentors. |
| Request mentorship | ✓* | ✓* | ✗ | ✓ | ✓ | Requires mentee role + fully-approved profile (`useApproval`). |
| Cancel own request | ✓ | ✓ | ✗ | ✓ | ✓ | RPC `mentorship_request_cancel`. |
| Accept/reject requests (as mentor) | ✓* | ✓* | ✗ | ✓ | ✓ | Mentor on that request or admin; RPC `mentorship_request_respond`. |
| Toggle mentor availability | ✓* | ✓* | ✗ | ✓ | ✓ | For users with mentor profile; RPC `mentorship_toggle_availability`. |
| Open mentorship DM chat | ✓* | ✓* | ✗ | ✓ | ✓ | `mentorship_open_chat` RPC: only participants in that relationship. |

---

## 8. Messaging / DM

| Action | A | S | E | AD | SA | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Open messaging UI (`/messages`) | ✓* | ✓* | ✓* | ✓ | ✓ | Requires `message:users` + complete profile. |
| Start DM via NewConversationModal | ✓* | ✓* | ✓* | ✓ | ✓ | Attempt allowed; success depends on connection/approval/RLS. |
| Start DM from AlumniProfileCard | ✓* | ✓* | ✓* | ✓ | ✓ | `get_or_create_conversation` RPC; same constraints. |
| Send DM in existing thread | ✓* | ✓* | ✓* | ✓ | ✓ | Only if: fully-approved + connected/mentorship + not blocked; enforced by RPC + ChatWindow gating. |

---

## 9. Notifications & Activity

| Action | A | S | E | AD | SA | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| View own notifications | ✓ | ✓ | ✓ | ✓ | ✓ | RLS: recipient_id / user_id. |
| View admin notifications/alerts | ✗ | ✗ | ✗ | ✓ | ✓ | Admin-only tables. |
| View activity logs | ✗ | ✗ | ✗ | ✓ | ✓ | `ActivityLogs`, `Analytics`, protected by `access:all`. |

---

## 10. Companies / Employer

| Action | A | S | E | AD | SA | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| View public company profile | ✓ | ✓ | ✓ | ✓ | ✓ | Public route. |
| Edit own company profile | ✗ | ✗ | ✓* | ✓ | ✓ | `manage:company_profile` + RLS; typically employer or admin. |

---

## 11. Admin

| Action | A | S | E | AD | SA | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| View admin analytics | ✗ | ✗ | ✗ | ✓ | ✓ | `access:all`. |
| Manage users & roles | ✗ | ✗ | ✗ | ✓* | ✓* | Via `UserManagement`, RLS ensures last-super-admin safety. |
| View/admin feedback reports | ✗ | ✗ | ✗ | ✓ | ✓ | `view:feedback_reports` / `access:all`. |
| Data verification dashboards | ✗ | ✗ | ✗ | ✓ | ✓ | Admin-only routes + RLS. |
