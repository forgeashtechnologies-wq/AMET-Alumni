# AMET Alumni Platform – Architecture & Security Audit

> **Scope & Methodology**  
> This report is based on the current codebase in this repo as of 2025-12-07: Supabase project (`supabase/` + `schema_51Dec.sql`), Edge Functions, React frontend (`frontend/`), archived FastAPI backend (`archive/backend/`), Docker/entrypoint, and Vercel config.  
> **ASSUMPTION:** The source-of-truth data and RLS are the live Supabase instance that roughly matches the committed schema/types. Any divergence in the live DB should be reviewed with the same checklist.

---

## 1. Application & Architecture Overview

### 1.1 Multi-tenant model & high-level architecture

- **Tenancy model**
  - Effectively **single-tenant per institution** (AMET), with **multi-role** users, not classic multi-tenant SaaS with `tenant_id`.
  - Roles: `alumni`, `student`, `employer`, `admin`, `super_admin` (plus internal flags & approval status).
  - Isolation is enforced primarily via **RLS on user/role/ownership**, not via `tenant_id`.

- **Architecture style**
  - **Frontend**: React SPA (Create React App) deployed via Vercel-like static hosting (see `frontend/package.json`, `vercel.json`).
  - **Data & auth**: Supabase (Postgres + Auth + Storage + Realtime) as primary backend.
  - **Serverless/Edge**: Supabase Edge Functions in `supabase/functions/`:
    - `set-role/` – securely sets user role via RPC `admin_set_user_role`.
    - `admin-invite-user/` – invites a user via Supabase Admin API.
  - **Archived backend**: `archive/backend/` contains a FastAPI app exposing `/api/*` (profiles, jobs, events, mentorship, groups). Entry scripts (`entrypoint.sh`, `backend_test.py`) indicate it may have been used in Dockerized deployments.
  - **Storage**: Supabase Storage buckets for avatars, resumes, cover letters, company logos, event images, etc., guarded by storage RLS policies.

- **Key components/services**
  - **React frontend** (SPA): routing in `frontend/src/App.js`, auth in `frontend/src/contexts/AuthContext.js`, Supabase client in `frontend/src/utils/supabase.js`.
  - **Supabase DB**: `public` schema with core tables:
    - Identity/profile: `profiles`, `user_roles`, `roles`, audit tables (`activity_logs`, `admin_actions`, `user_feedback`, etc.).
    - Community features: `groups`, `group_members`, `group_posts`, `messages`/DM equivalents, `mentors`, `mentee_profiles`, `mentorship_requests`, `mentorship_relationships`.
    - Events: `events`, `event_rsvps`, `event_attendees`, `event_feedback`.
    - Jobs: `job_postings` (or `jobs`), `job_applications`, `bookmarked_jobs`, `user_resumes`.
    - Catalogs/views: `v_degrees`, `v_degree_department_groups`, `v_profiles_directory_card`, `public_profiles_view`, etc.
  - **Supabase Auth**: email/password + OAuth; roles largely encoded in `profiles.role` and app metadata.
  - **Supabase Functions (SQL)**: multiple helper functions and RPCs, including admin helpers and `get_current_user_flags` for approval state.
  - **Supabase Storage**: buckets: `avatars`, `profile-images`, `company-logos`, `event-images`, `post_images`, `resumes`, `cover-letters`, `feedback_screenshots`, `message_attachments`, `group_avatars`, `bucket-name` (test bucket), etc., each with policies.

### 1.2 Third-party integrations & dependencies (high-level)

- **Core platform**
  - Supabase (Postgres, Auth, Storage, Realtime, Edge Functions).
  - FastAPI, Uvicorn (archived backend).
  - Redis, boto3, Google Pub/Sub, Kubernetes client, etc. are present in `requirements.txt` but not clearly wired into the current app; likely infra/ops tooling.

- **Frontend libraries**
  - React 18, React Router 7, React Query, React Table.
  - MUI, Radix UI, Tailwind CSS, Lucide icons.
  - Axios, date-fns, qrcode.react, etc.

- **Security/observability dependencies (Python)**
  - `python-json-logger`, `structlog`, `prometheus-client`, `pytest/pytest-cov`, `black`, `flake8`, `mypy` (available, not all wired into a visible CI pipeline).

### 1.3 Secrets management

- **Frontend**
  - `frontend/src/utils/supabase.js` uses `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_KEY` (anon key) from env.
  - **Issue (High)**: `vercel.json` commits **real Supabase anon key** in source control (`REACT_APP_SUPABASE_KEY`).
    - This is technically an anon key but still a credential that should be treated as sensitive (enforces RLS but can be abused for scraping, brute-force, traffic from unexpected origins).
    - No service-role keys are exposed client-side.

- **Backend / Edge Functions**
  - Edge functions (`set-role`, `admin-invite-user`) read `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from **environment variables** (good practice; not in repo).
  - Archived FastAPI backend (`archive/backend/dependencies.py`) expects `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_KEY` from `.env` (loaded via `dotenv`). Keys are **not stored in git** but there is risk of misconfigured deployment.

### 1.4 CI/CD, patching, dependency updates

- **CI/CD**
  - No GitHub Actions / GitLab CI configs found.
  - Deployment for frontend appears Vercel-style using `vercel.json` and `@vercel/static-build`.
  - No explicit pipeline for:
    - Automated lint/format (though black/flake8/mypy/pytest exist).
    - SAST / dependency scanning.
    - Automated DB migrations or RLS verification.

- **Patching & dependency updates**
  - Frontend deps are relatively recent (React 18.3, Supabase JS 2.50, React Router 7, Tailwind 3.4).
  - Backend deps (FastAPI, Uvicorn, Supabase Python) are also reasonably modern but may drift.
  - No documented process for periodic updates, CVE monitoring, or lockfile-based approvals.

### 1.5 Monitoring, logging, alerting, incident response

- **Frontend logging**
  - Central `logger` utility (`frontend/src/utils/logger.js`):
    - In **production**, all console output is disabled (defense in depth against PII leakage).
    - Dev logs are redacted for emails, UUIDs, bearer tokens, keys.
  - No integrated Sentry / PostHog / similar in codebase; comment suggests they may be added later.

- **Backend logging**
  - FastAPI server uses `logging.basicConfig` and logs on startup.
  - No custom structured logging in backend code (though `structlog` is available in deps).

- **Monitoring / alerting**
  - `prometheus-client` is present but no explicit instrumentation or scrape config in this repo.
  - No clear integration with external uptime or error monitoring platform.

- **Incident response**
  - No explicit incident-response runbook or config in repo.
  - Supabase itself provides backups, but restore / DR process is not documented here.

**Summary:** Architecture is reasonably modern and Supabase-centric, with good use of RLS and Edge Functions. Main gaps are: committed anon key in git, unclear retirement of legacy FastAPI API, and limited evidence of structured monitoring/alerting and formal CI/CD security gates.

---

## 2. Data Model & Database Security

### 2.1 RLS status & policies (overview)

Based on `schema_51Dec.sql` and `supabase/types/database.types.ts`:

- **RLS enabled**
  - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` is present for a wide range of `public.*` tables and for `storage.objects` and `storage.buckets`.
  - Policies are generally **PERMISSIVE** and attached to `public` or `authenticated` roles.

- **Policy patterns**
  - **Ownership-based**: `auth.uid()` = `user_id` / `profile_id` / `applicant_id` / `owner`.
  - **Role-based**: using `profiles.role`, `get_my_role()`, or `get_user_role(auth.uid())`, e.g. admins/super_admins can manage everything.
  - **Approval / status-based**: in some cases, flags/approval fields control visibility.
  - **Public read** where appropriate: e.g. public events listing, public avatars, public company logos.

- **Representative policies (from export)**
  - `user_roles`: 
    - **Admins can manage user roles** – `ALL` to `public` with `USING` clause ensuring `auth.uid()` is an admin.
    - **Users can view their own roles** – `SELECT` where `profile_id = auth.uid()`.
  - `mentors` / `mentee_profiles`:
    - Users can create/read/update their own profiles.
    - Admin-like users can view other mentee/mentor info.
  - `events`:
    - Public `SELECT` for published events (`Allow public read access to events`).
    - Admins can `ALL` (manage any event).
    - Authenticated owners can create/update/delete their own events subject to role checks.
  - `user_feedback`:
    - Insert allowed for all authenticated users.
    - Select/update restricted to super_admin or a specific developer UID.
  - `groups` / `group_members`:
    - Policy `Allow access if user is member of group` on `group_members` (select where `user_id = auth.uid()`).
    - Groups have additional helper functions like `is_member_of_group(id)` to allow non-private group visibility.
  - `user_resumes` / `resumes` storage bucket:
    - RLS ensures only owners can update/delete; **but** storage bucket has public `SELECT` policy (see below – high risk).

### 2.2 Storage buckets & RLS

From policy export (storage objects):

- **Positive patterns**
  - Uploads often constrained by bucket name and auth role, e.g.:
    - `Allow authenticated users to upload avatars` (bucket = `avatars`).
    - `Allow group admins to upload group avatars` (bucket = `group_avatars` and membership check via `group_members`).
  - Ownership checks for deleting/updating certain documents, e.g. resumes and cover letters require `auth.uid() = owner`.

- **High-risk storage policies**
  - `Resumes are publicly accessible` – `SELECT` to `public` where `bucket_id = 'resumes'`.
  - `Cover letters are publicly accessible` – similar public `SELECT` for `cover-letters`.
  - `Message attachment access policy` – `ALL` on `message_attachments` to `public` with only `bucket_id` check (no user/role). This likely allows **any** client with anon key to read, update, or delete attachments in that bucket.
  - Test bucket `bucket-name` has permissive INSERT/UPDATE/DELETE/SELECT policies and should be removed or locked.

> **Finding DB-1 (High)** – Public resumes/cover letters and message attachments  
> **Impact:** potential exposure of PII, CVs, cover letters, and possibly sensitive messaging content.  
> **Likelihood:** High if bucket URLs/paths are enumerable or guessed; the public policy allows listing/reading directly via Storage API.

### 2.3 Table-by-table summary (representative)

_This is not every table, but covers the primary user-facing and sensitive tables._

| Table | RLS | Typical Policies (who can SELECT/INSERT/UPDATE/DELETE) | Tenant/ownership enforcement | Sensitive columns protected? |
|-------|-----|----------------------------------------------------------|-------------------------------|------------------------------|
| `public.profiles` | Enabled | System can insert during registration; users update own; admins read/manage many | `id = auth.uid()` for self; admins via role functions | Contains PII (name, email, phone, job, location); accessible mostly via self + admin; directory views likely filtered via dedicated views. |
| `public.user_roles` | Enabled | Admins `ALL`; users select own | `profile_id = auth.uid()` for self; admins via `get_user_role` | Roles are sensitive; direct manipulation gated by admin RLS. |
| `public.roles` | Likely Enabled | Read by anyone or admin | Generally non-sensitive reference data | Low sensitivity. |
| `public.events` | Enabled | Public SELECT; admins `ALL`; creators can update/delete | Ownership field (`user_id`/`organizer_id`); admins override | Event metadata not highly sensitive, but RSVP data is. |
| `public.event_rsvps` | Enabled | Authenticated users view their own; admins view more | Filters on `user_id = auth.uid()` plus role-based | RSVP history is personal but fairly low criticality. |
| `public.job_postings` / `jobs` | Enabled | Employers/admins create/manage; users view; maybe some public | Ownership on `posted_by`; admins via role | Contains employer job data; moderate sensitivity. |
| `public.job_applications` | Enabled | Applicants can create/view own; employers/admins view for jobs they posted | `applicant_id = auth.uid()` and join-based checks | Contains resumes/cover letters metadata; PII. |
| `public.mentors` / `public.mentee_profiles` | Enabled | Users manage their own mentor/mentee profile; admins view | `user_id = auth.uid()`; admin override | Contains availability, mentoring topics; moderate sensitivity. |
| `public.groups`, `public.group_members`, `group_posts` | Enabled | Membership-based access; group admins have more power | `group_members.user_id = auth.uid()` and helper functions | Group content is semi-private; RLS is key to prevent IDOR. |
| `public.activity_logs`, `public.admin_actions` | Enabled | Likely restricted to admins | `profiles.role` checks | Contains audit trail; should stay admin-only. |
| `public.user_feedback` | Enabled | Insert for authenticated; select/update only for super_admin or specific dev UID | RLS uses `profiles.role` and specific UID | Contains user feedback; some privacy concerns but mostly admin-only. |

### 2.4 RPCs & SQL functions

From `database.types.ts` and RLS export:

- **Auth helpers**
  - `auth.jwt()`, `auth.uid()`, `auth.role()` are used extensively.
- **Role helpers**
  - `get_my_role()`, `get_user_role(auth.uid())` etc. used in policies to check `admin`/`super_admin` roles.
- **Approval helpers**
  - RPC `get_current_user_flags` returns approval flags used in frontend (`AuthContext`) to gate permissions.
- **Admin RPCs**
  - `admin_set_user_role` is invoked via edge function `set-role` using service role key.

**Security posture for RPCs**

- `set-role` uses **service role** and verifies the caller via JWT, then calls `admin_set_user_role(user_id: uuid, role: text)` with `user_id` derived from the verified token (not from client body) – good practice.
- **Note:** We don’t see the SQL body of `admin_set_user_role` in this snippet; the function must:
  - Validate that `role` is in the allowed enum (`alumni`, `student`, `employer`) and **forbid** escalation to `admin`/`super_admin`.
  - Enforce appropriate constraints (e.g. profile completeness, approvals) if necessary.

**Security definer functions**

- No obvious `SECURITY DEFINER` functions observed in the snippets; if any exist, they must:
  - Explicitly set `search_path` to `public`/`auth`/specific schemas only.
  - Validate `auth.uid()` and not trust raw parameters for user/role/tenant.

### 2.5 Constraints, FKs, indexes

- `database.types.ts` shows **Relationships** metadata for many tables, confirming the presence of **foreign keys**.
- There are multiple audit/backup tables (`backup_bad_conversations_20250905`, etc.) which are likely offline and not used in the app.
- Many critical entities (profiles, events, jobs, mentorship, group_members) clearly maintain integrity via FKs and referential relationships.
- Index and constraint coverage seems reasonable but was not exhaustively verified in this static view.

**Summary:** RLS is broadly enabled and structured around ownership and roles, but storage buckets have some overly broad policies and there is heavy reliance on app-level helper functions in RLS. No explicit tenant_id is present; this is role-based isolation, not multi-tenant SaaS isolation.

---

## 3. API / Backend Layer

### 3.1 Supabase Edge Functions

1. **`set-role` (`supabase/functions/set-role/index.ts`)**
   - **AuthN**: Requires Bearer JWT in `Authorization` header; verifies via `supabaseAdmin.auth.getUser(jwt)`.
   - **AuthZ**: Allows roles only from `{"alumni","student","employer"}`. Does **not** permit setting `admin`/`super_admin`.
   - **Inputs**: JSON body `{ role }`, validated; rejects invalid roles.
   - **Critical IDs**: `user_id` is derived from verified JWT, **not from client body** – good.
   - **Abuse protection**: No explicit rate limiting in function; relies on Supabase platform.
   - **Errors**: Returns structured JSON with status 400/401/403/500, without sensitive internals.
   - **CORS**: Uses shared `corsHeaders` with `Access-Control-Allow-Origin: *` (too broad for production; should be origin-restricted).

2. **`admin-invite-user` (`supabase/functions/admin-invite-user/index.ts`)**
   - **AuthN/AuthZ**:
     - Uses `SERVICE_ROLE_KEY` (server-side only) for supabase client.
     - **Currently does not verify** caller identity beyond HTTP method; comment suggests optional bearer guard but it is not implemented.
   - **Inputs**: `{ email, user_metadata }`; validates `email` presence and type.
   - **Critical IDs**: Uses Supabase Admin `inviteUserByEmail` with redirect to `PUBLIC_ORIGIN/auth/callback`.
   - **Abuse protection**: None visible (no rate limiting, no admin check), so if endpoint is public on the internet, any attacker could spam invites.

> **Finding API-1 (High)** – `admin-invite-user` edge function lacks authorization checks  
> **Impact:** If publicly reachable, anyone can trigger admin invite flows and spam/inject users.  
> **Likelihood:** Medium–High if function URL is not protected by network-level controls.

### 3.2 Archived FastAPI backend (`archive/backend/server.py`)

- **Status (ASSUMPTION):** Appears legacy. However, `entrypoint.sh` still references a FastAPI app at `/backend/server:app` and exposes port 8001, so in some deploys this **might still be running**.
- **Auth**
  - Depends on `get_current_user` in `dependencies.py` using HTTP Bearer tokens and Supabase verification.
  - Some endpoints are **public** (e.g. `/api/profiles`), intentionally exposing all profiles for directory usage.
- **Endpoints (representative)**
  - `/api/` – root message.
  - `/api/health` – DB connectivity.
  - `/api/register` + `/api/auth/register` – registration bridging Supabase Auth and `profiles`.
  - `/api/user` – returns current user’s data (protected).
  - `/api/profile`, `/api/profile` [PUT] – get/update profile using `user_id = current_user['id']`.
  - `/api/profiles` – **public** directory listing (`select * from profiles` without auth). This bypasses Supabase RLS and may leak PII.
  - `/api/events`, `/api/events/{id}`, `/api/events/{id}/register`, etc. – fully server-side, using `supabase.table("events")`. Requires auth on most routes.
  - `/api/jobs`, `/api/jobs/{id}`, `/api/jobs/{job_id}/apply`, `/api/jobs/{job_id}/applications` – job posting and application flows.
  - `/api/mentors`, `/api/mentorship-requests` – mentorship features.
- **Validation**
  - Uses Pydantic models (`LoginRequest`, `Profile`, `Event`, `Job`, `Message`, `Group`, etc.) for structure, but not for every endpoint (some accept plain `Dict[str, Any]`).
  - Limited schema/enum validation for strings beyond DB constraints.
- **Authorization**
  - Often correctly derives `current_user["id"]` from token and uses it as `posted_by`, `applicant_id`, `organizer_id`, etc.
  - Some directory-like endpoints (e.g. `/profiles`) are unauthenticated and bypass RLS; this is high risk if backend is live.

> **Finding API-2 (High)** – Legacy FastAPI `/api/profiles` exposes full profiles publicly  
> **Impact:** PII leakage (names, emails, graduation year, job details) without RLS.  
> **Likelihood:** Medium if backend is still reachable; low if fully retired.

### 3.3 Abuse protections

- No explicit rate limiting or throttling at the API/Edge level (e.g., no per-IP caps on registration, invites, login tests).
- Dependent on Supabase platform’s generic protection and any upstream WAF (not visible in repo).

### 3.4 Defense-in-depth

- Primary enforcement is via **Supabase RLS**; backend/edge functions usually derive `user_id` from token instead of trusting client.
- Where FastAPI is used, there is an additional app-level check `get_current_user` that validates JWT via Supabase.
- However, some endpoints intentionally bypass RLS to return raw tables (`/profiles`, some `events`, `jobs` reads), which weakens defense-in-depth.

---

## 4. Frontend / Client-Side Security

### 4.1 Secret handling

- Supabase client is initialized with URL + anon key from env variables – correct for client SDK.
- **Issue:** `vercel.json` contains hardcoded values for `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_KEY` **committed to git**.
  - While anon keys are designed for client-side use, best practice is to store environment variables in Vercel dashboard, not in repo.
  - If this repository is ever public or leaked, the key can be abused for scraping, high-volume traffic, or abuse of permissive RLS.

### 4.2 Data fetching

- Frontend mostly queries Supabase directly via JS client, e.g.:
  - `profiles` by `id = user.id` (for self profile).
  - Directory/data views via dedicated views (`v_profiles_directory_card`, etc.), minimizing exposure of raw sensitive columns.
- Query selectors often use `select('*')`. Some high-risk data (e.g. admin-only fields) are filtered at DB level (RLS + admin-only columns) and further sanitized via lists like `SAFE_PROFILE_FIELDS` for writes.

### 4.3 Auth / route protection

- **Global AuthContext** provides:
  - `user`, `profile`, `role` (derived from `profiles.role` + user metadata) with validation via `isRole` helper.
  - `approvalFlags` / `get_current_user_flags` integration.
  - Permission system: `hasPermission`, `hasAnyPermission`, `hasAllPermissions` over `BASE_PERMISSIONS` per role.
- **Routing (App.js)**
  - Uses `ProtectedRoute requiredPermission="..."` for most authenticated routes.
  - `RequireCompleteProfile` ensures critical profile fields exist before accessing core features.
  - Employers are redirected away from some routes (e.g. `/directory` → `/jobs`).
  - Public vs private routing is clear (e.g. `/login`, `/register`, `/auth/callback` are public; `/dashboard`, `/jobs`, `/events`, `/groups`, `/mentorship` require auth and appropriate permissions).

**Important:** UI gating is always backed by **Supabase RLS** on the data layer (e.g., employers cannot fetch resources they shouldn’t, since RLS checks `auth.uid()`, `profiles.role`, etc.).

### 4.4 Exposure of sensitive data

- Frontend components typically request only what they display; sensitive flags (e.g. admin status, approval flags) are accessed but not widely rendered.
- Directory cards derive minimal info from views like `v_profiles_directory_card` (degree, department, batch, company, position) instead of raw profiles, reducing PII leakage risk.

### 4.5 Error messages

- Edge/Backend errors are usually mapped into generic messages (`Internal error`, `Failed to set role`, etc.).
- No stack traces shown in UI; logs are suppressed in production build via `logger`.

**Summary:** Frontend security posture is generally good: no service keys, route-level protection, centralized auth/permissions, and logging redaction. Main gaps relate to the committed anon key, and reliance on RLS to cover any missed UI gates.

---

## 5. Logging, Monitoring, Auditing & Incident Response

### 5.1 Logging

- **DB-level**
  - Tables like `activity_log`, `activity_logs`, `admin_actions`, `user_feedback` capture user/admin actions and events.
  - Some tables track metadata (`details` JSON, `action`, `entity_type`, `entity_id`), giving a decent audit trail of key operations.

- **App-level**
  - Frontend uses `logger` with redaction, but no shipping of logs to central service.
  - FastAPI backend uses basic logging only.

### 5.2 Monitoring & alerting

- Prometheus client is available in backend deps but not wired into endpoints.
- No explicit metrics or health-check integration with alerts in this repo.
- No structured SLO/SLI definitions or dashboards.

### 5.3 Backups & restore

- Supabase manages database backups; `supabase/backups/` directory exists but is largely a placeholder.
- `schema_51Dec.sql` suggests manual schema dumps; this aids disaster recovery but not a full backup strategy.
- No automated restore test scripts or DR runbooks.

### 5.4 Incident response

- No documented IR procedure in repo (notification policy, key rotation, forced logout, forensic data handling, etc.).

**Summary:** You have some audit logging at the DB level, but monitoring/alerting and formal incident response documentation are largely missing from this repo.

---

## 6. Third-Party Dependencies & Integrations (Detail)

### 6.1 Services & SDKs

- **Supabase**: primary data/Auth/Storage backend (JS + Python clients, Edge functions).
- **FastAPI / Uvicorn**: HTTP API server (archived/legacy).
- **Redis, boto3, google-cloud-pubsub, kubernetes, paramiko, ghapi**: present in `requirements.txt` but not obviously used in current FastAPI code; likely internal tooling.
- **Email / SMS**: no direct SDKs like SendGrid, Mailgun, SES, or Twilio visible. User invites go through Supabase Auth email.
- **Analytics / tracking**: no Sentry/PostHog/Segment/Mixpanel/Plausible in frontend code.

### 6.2 Least privilege & credential storage

- Service-role keys and database credentials are taken from environment variables, not committed.
- Supabase anon key is committed; while it is low-privilege by design, policies on storage objects and some public RLS widen the blast radius.
- Edge functions use service role keys and must be treated as high-value secrets; they are in env only, which is correct.

### 6.3 Dependency vulnerability management

- No automated CVE scanning or dependency audit tooling wired into CI in this repo.
- JS and Python dependencies should be periodically audited via `npm audit`, `pip-audit` or Snyk/GitHub Dependabot.

---

## 7. Compliance & Data Governance

### 7.1 Likely regulatory scope (assumptive)

- Alumni/student/employer platform; likely stores **PII** (names, emails, phone numbers, education history, employment history, resumes, cover letters) and possibly some sensitive messages.
- **Relevant frameworks** (depending on region & customers):
  - GDPR (if EU residents), local data protection laws, possible SOC 2/ISO 27001 aspirations for SaaS maturity.
  - No direct payment processing visible; PCI isn’t in scope here.

### 7.2 Data inventory (from schema)

- **Core PII**
  - `profiles`: name, email, phone, graduation year, degree code, department id, job title, company, location, avatar URL.
  - `user_resumes` + storage `resumes` bucket: CV files.
  - `cover-letters` bucket: cover letter files.
  - `job_applications`: attachments, application content, status.
  - `mentors`, `mentee_profiles`: mentoring topics, availability, perhaps goals.
  - `messages` / `dm_threads` / `dm_messages` (if present in DB): conversation content.

- **Audit & meta**
  - `activity_logs`, `admin_actions`, `user_feedback` contain behavioral/meta data.

### 7.3 Retention, deletion, portability

- No explicit data-retention or deletion policies in code/docs.
- Deletion mechanisms:
  - Some tables likely use soft-delete patterns (not fully visible here) or manual delete endpoints.
  - Storage RLS allows owners to delete resumes/cover letters.
- Backups: no explicit policy for removing deleted users’ data from backups.

### 7.4 Consent & transparency

- Static pages for Terms of Service and Privacy Policy exist (`pages/TermsOfService`, `pages/PrivacyPolicy`).
- Consent flows (e.g. marketing opt-in, cookie banners) are not visible here.

**Summary:** PII is clearly present and reasonably segregated, but there’s no explicit data-retention, deletion, or portability policy codified in this repo. Public storage of resumes/cover letters is a major governance red flag.

---

## 8. Threat Modelling & Penetration Testing

### 8.1 Threat actors & goals

- **External attackers** – aim to exfiltrate PII (directory data, resumes, messages), abuse invites, spam, or deface content.
- **Malicious tenants/users** – attempt horizontal privilege escalation (view other users’ data, join private groups, see private job applications or mentorship data).
- **Insiders (admin/support)** – misuse of admin role to access data beyond necessity.

### 8.2 Critical assets

- PII in `profiles`, resumes, cover letters, job applications, mentorship relations, messages.
- Role & approval configs (`user_roles`, `profiles.role`, approvals) that govern access.
- Audit logs and admin actions.
- Supabase service role keys and Edge functions.

### 8.3 Attack surfaces

- **Public web app** (React) and direct Supabase PostgREST endpoints.
- **Supabase Storage** (buckets with public SELECT/ALL policies).
- **Supabase Edge Functions** (especially `admin-invite-user`, `set-role`).
- **Legacy FastAPI API** if still deployed.
- **CI/CD & secrets** (Vercel env, Supabase service-role keys).

### 8.4 Existing mitigations

- RLS on almost all data tables and storage.
- Role-based permissions in frontend tied to profile role and approval flags.
- Centralized logging suppression and redaction on frontend.
- Use of service-role keys only server-side (Edge/Backend).

### 8.5 Penetration testing & security testing

- No explicit references to StackHawk, Indusface, or SAST/DAST tools in this repo.
- Testing script `backend_test.py` focuses on basic endpoint reachability and 401/403 responses, not full security testing.

**Summary:** The main technical mitigations come from RLS and careful role/ownership checks. However, several high-impact attack paths remain (public storage buckets, possibly live legacy APIs, unguarded invite function, lack of systematic pen testing).

---

## 9. Risk Matrix & Prioritization

### 9.1 Risk scoring scale

- **Severity**:
  - **High** – direct PII exposure, auth bypass, privilege escalation, or long-lived secrets.
  - **Medium** – significant but bounded risk (metadata leaks, missing monitoring, etc.).
  - **Low** – hard-to-exploit or low-impact issues.
- **Likelihood**:
  - **High** – easy to exploit by unauthenticated/low-privilege attacker.
  - **Medium** – requires some knowledge, credentials, or specific conditions.
  - **Low** – hard to reach, requires chaining or insider capabilities.
- **Priority**:
  - **P0** – immediate fix before further feature work.
  - **P1** – near-term hardening.
  - **P2** – medium-term improvements / compliance work.

### 9.2 Risk matrix (key findings)

| ID | Risk | Severity | Likelihood | Priority | Notes |
|----|------|----------|------------|----------|-------|
| DB-1 | Resumes & cover letters publicly readable in Storage | High | High | P0 | Policies allow `SELECT` on `resumes` and `cover-letters` buckets to `public`. Any client with anon key can fetch CVs and cover letters. |
| DB-2 | Message attachments bucket grants ALL to public | High | High | P0 | `message_attachments` policy grants `ALL` to `public` with only bucket check. Exposes potential sensitive documents, and allows tampering/deletion. |
| API-1 | `admin-invite-user` Edge Function lacks auth | High | Medium–High | P0 | Anyone who discovers endpoint could mass-invite users, abuse resources, or run phishing-like flows. Must require admin JWT + RLS validation. |
| API-2 | Legacy FastAPI `/api/profiles` exposes all profiles | High | Medium | P0 (if live) / P2 (if fully retired) | Public endpoint lists profiles without RLS. If backend is live, this is a direct PII leak. If fully decommissioned, ensure infra reflects that (no container or DNS). |
| SE-1 | Supabase anon key committed to repo | Medium–High | High | P0 | While anon-only, combined with permissive storage policies raises impact. Repo exposure amplifies risk. Move to Vercel env, rotate key, review policies. |
| RLS-1 | Heavy reliance on helper functions in RLS | Medium | Medium | P1 | Functions like `get_user_role()` and `is_member_of_group()` are central to access control. Bugs or changes could widen access inadvertently. Need tests and change controls. |
| API-3 | Lack of rate limiting on sensitive edge/back endpoints | Medium | Medium | P1 | Registration, invites, role set, and job application APIs may be brute-forced or abused without throttling. |
| OBS-1 | Limited monitoring/alerting and incident runbook | Medium | Medium | P1 | Hard to detect anomalies, brute-force, scraping, or bucket abuse. Increases time-to-detect/contain. |
| GOV-1 | No explicit data-retention/deletion/backups policy | Medium | Low–Medium | P2 | May create regulatory risk (GDPR-style rights) and storage of data longer than required. |
| COMP-1 | No automated SAST/DAST/dependency scanning in CI | Medium | Medium | P2 | Increases chance of known-vulnerable libs / misconfig reaching prod unnoticed. |
| FE-1 | Very permissive CORS in Edge Functions | Low–Medium | Medium | P2 | `Access-Control-Allow-Origin: *` on Edge functions; combined with weak auth would be worse. Still advisable to restrict origins. |

---

## 10. Recommended Remediations

### 10.1 P0 – Immediate fixes

1. **Lock down Storage buckets** (DB-1, DB-2)
   - Change RLS policies on `storage.objects` for:
     - `resumes` and `cover-letters` buckets: remove public `SELECT`; use `SELECT/UPDATE/DELETE` only where `auth.uid() = owner` and enforce row-level checks on path if needed.
     - `message_attachments`: replace `ALL TO public` with:
       - `INSERT/SELECT/UPDATE/DELETE` to `authenticated` only, and enforce conditions tying attachments to message/participant IDs (via RPC or table join) instead of bucket-wide openness.
     - Remove or lock down `bucket-name` test bucket (or restrict to admin-only for debugging).

2. **Protect `admin-invite-user` Edge Function** (API-1)
   - Require **admin JWT** in `Authorization` header and validate via Supabase:
     - Derive `auth_user_id` from token.
     - Check `get_user_role(auth_user_id)` is `admin` or `super_admin` before calling `inviteUserByEmail`.
   - Optionally restrict by origin header (e.g. only from your frontend domain) and/or a shared secret header.
   - Implement basic rate limiting (IP-based, user-based, or via Supabase rate-limit features / external gateway). 

3. **Verify/decommission legacy FastAPI API** (API-2)
   - Confirm whether any deployment still serves `archive/backend/server.py`.
   - If not needed:
     - Remove it from Docker images and infra entrypoints (`entrypoint.sh`).
     - Ensure DNS and ingress do not expose these endpoints.
   - If needed for some flows, **lock it down**:
     - Make `/api/profiles` protected and implement pagination + RLS-like filtering (only directory-safe views, no raw `profiles` dump).
     - Align all endpoints with the same role/ownership checks as Supabase RLS.

4. **Rotate Supabase anon key & remove from repo** (SE-1)
   - Regenerate Supabase anon key.
   - Move `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_KEY` to **Vercel Project Environment Variables** (or similar), not `vercel.json`.
   - Remove/rotate any copies from git history if repo is ever public or has been shared externally.

### 10.2 P1 – Short-term hardening

5. **Formalize RLS tests & helper function contracts** (RLS-1)
   - For each core table (profiles, jobs, applications, groups, mentorship, messages):
     - Write SQL-based tests or scripts that simulate **different roles** and confirm RLS behavior.
     - Add a checklist/test harness to verify `get_my_role()`, `get_user_role()`, `is_member_of_group()`, `get_current_user_flags()` all behave as expected.

6. **Add rate limiting & abuse detection** (API-3, OBS-1)
   - Introduce:
     - Registration and login throttling (Supabase + frontend backoff; external WAF if available).
     - Rate limiting for `set-role`, invites, job applications, mentorship requests, and messaging.
   - Start logging suspicious patterns into `activity_logs` or a dedicated security log.

7. **Improve monitoring & alerting** (OBS-1)
   - Use `prometheus-client` and minimal custom metrics in backend/edge functions if they’re still in use.
   - Integrate with a monitoring platform (Grafana Cloud, Datadog, etc.) and set alerts on:
     - 5xx spikes.
     - Rate of invites/registrations.
     - Access denials and auth failures.

### 10.3 P2 – Medium-term improvements & compliance

8. **Add CI/CD security gates** (COMP-1)
   - Add pipeline steps for:
     - `npm audit` / `pnpm audit` and `pip-audit` or similar.
     - Lint + type checks + tests (`eslint`, `black`, `flake8`, `mypy`, `pytest`).
     - Optional SAST/DAST (StackHawk, OWASP ZAP, Snyk Code, etc.).

9. **Document data governance** (GOV-1)
   - Policy for:
     - Retention of profiles, resumes, job applications, mentorship records.
     - User data-export and deletion (including how to handle backups).
   - Implement user-facing flows where required (e.g., account deletion request path).

10. **Tighten CORS on Edge Functions** (FE-1)
    - Replace `Access-Control-Allow-Origin: "*"` with specific allowed origins (e.g., `https://app.yourdomain.com`).

11. **Consider long-term multi-tenant design (optional)**
    - If you ever extend this to multiple institutions, introduce `tenant_id` and enforce tenant isolation via RLS and `auth.jwt()` claims.

---

## 11. How to Operationalize This Audit

- **Quarterly security review**
  - Re-run RLS/policy checks directly on live DB.
  - Re-validate storage bucket policies and public access.
  - Verify legacy services & endpoints have not reappeared.

- **Penetration testing**
  - Combine automated DAST (e.g., StackHawk) with manual tests focused on:
    - Multi-role flows: alumni vs student vs employer vs admin vs super_admin.
    - Group membership and mentorship visibility.
    - Job application confidentiality.
    - Storage objects enumeration and access.

- **Security-by-default in development**
  - Enforce the global Security Contract in PR templates and code review:
    - Always ask: RLS? Ownership? Role? Tenant? Rate limiting? Secrets? Logging? Abuse?

---

## 12. Conclusion

Your platform has a strong foundation with Supabase RLS, role-based permissions in the frontend, and a clear separation between anon and service-role keys. The highest-impact issues are concentrated in:

- Overly permissive Supabase Storage policies (resumes, cover letters, message attachments).
- An unauthenticated admin invite Edge Function.
- Potentially still-exposed legacy FastAPI endpoints (especially `/api/profiles`).
- Committed anon key and absence of systematic CI/CD security gates.

Addressing the P0 items above will materially reduce your risk of PII leaks and abuse. The P1 and P2 improvements then move you toward a more robust, compliance-ready security posture.
