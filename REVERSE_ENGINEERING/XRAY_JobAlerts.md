# Module X-Ray Card: Job Alerts

**Module:** Job Alerts  
**Artifact:** PLAYBOOK_MODULE_XRAY (ec852f8e-30f1-4612-b982-7e641ccaf74f)  
**Date:** 2026-09-07  
**Status:** FROZEN (post-correction)

---

## L1: Actions

| # | Action | Handler | File:Line | Roles |
|---|---|---|---|---|
| 1 | Create job alert | `create_job_alert()` RPC | `services/jobService.js:336` | alumni, employer, student, admin, super_admin |
| 2 | Update job alert | `update_job_alert()` RPC | `services/jobService.js:372` | Same (owner only) |
| 3 | Delete job alert | `delete_job_alert()` RPC | `services/jobService.js:432` | Same (owner only) |
| 4 | Toggle alert active/paused | `update_job_alert()` RPC (partial) | `components/Jobs/JobAlerts.js:259` | Same (owner only) |
| 5 | View alert list | `job_alerts` table SELECT | `services/jobService.js:16` | Same |
| 6 | View performance stats | `get_alert_performance_stats()` RPC | `services/jobService.js:489` | Same |
| 7 | Match alerts to jobs (cron) | `process_job_alerts()` | `cron.job #3` | System (hourly) |
| 8 | Navigate to alerts page | Route `/jobs/alerts` | `App.js:252` | `view:jobs` permission |

## L2: Logics (Business Rules)

| # | Logic | Enforcement | File:Line / DB |
|---|---|---|---|
| 1 | Max 10 alerts per user | `check_job_alert_rate_limit()` — `count(*) < 10` | DB function |
| 2 | Alert name unique per user | `job_alerts_user_alert_name_key` UNIQUE index | DB index |
| 3 | Max 50 keywords per alert | `create_job_alert()` — `array_length > 50` check | DB function |
| 4 | Min salary ≤ Max salary | `create_job_alert()` — validation check | DB function + frontend `JobAlerts.js:170` |
| 5 | Alert name max 100 chars | `create_job_alert()` — `left(v_alert_name, 100)` | DB function |
| 6 | Only active alerts match | `process_job_alerts()` — `WHERE is_active = true` | DB function |
| 7 | Only approved jobs match | `process_job_alerts()` — `j.is_approved = true` | DB function |
| 8 | Frequency-based scheduling | daily/weekly/biweekly/monthly intervals | DB function |
| 9 | Max 10 jobs per alert per run | `LIMIT 10` in inner loop | DB function |
| 10 | Preference enforcement | `notify()` calls `should_deliver_in_app()` | DB function |

## L3: UI Controls

| Control | Component:Line | API Call | Roles |
|---|---|---|---|
| "Create Alert" button | `JobAlerts.js:315` | Opens modal | All with `view:jobs` |
| Create/Edit modal form | `JobAlerts.js:508` | `createJobAlert()` / `updateJobAlert()` | All |
| Alert name input | `JobAlerts.js:520` | — | All |
| Keywords input (tag-style) | `JobAlerts.js:535` | — | All |
| Location input | `JobAlerts.js:550` | — | All |
| Job type select | `JobAlerts.js:555` | — | All |
| Experience level select | `JobAlerts.js:565` | — | All |
| Min salary input | `JobAlerts.js:575` | — | All |
| Max salary input | `JobAlerts.js:585` | — | All |
| Frequency select | `JobAlerts.js:595` | — | All |
| Active checkbox | `JobAlerts.js:610` | — | All |
| Save/Update button | `JobAlerts.js:620` | Submit form | All |
| Cancel button | `JobAlerts.js:640` | Close modal | All |
| Toggle switch (active/paused) | `JobAlerts.js:470` | `updateJobAlert(id, {is_active})` | All (owner) |
| Edit pencil | `JobAlerts.js:485` | Opens edit modal | All (owner) |
| Delete trash | `JobAlerts.js:495` | `deleteJobAlert(id)` | All (owner) |
| Stats cards (3) | `JobAlerts.js:345` | `fetchAlertPerformanceStats()` | All |
| "My Job Alerts" link | `JobListingsPage.js:1480` | Navigate to `/jobs/alerts` | All with `view:jobs` |
| "Create Job Alert" link (empty state) | `JobListingsPage.js:1703` | Navigate to `/jobs/alerts` | All with `view:jobs` |

## L4: Data Model

### `job_alerts` table (15 columns after fix)

| Column | Type | Nullable | Default | Purpose |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | PK |
| `user_id` | uuid | NO | | Owner (set by trigger from `auth.uid()`) |
| `alert_name` | text | NO | | User-given name (UNIQUE per user) |
| `keywords` | text[] | YES | | Keywords to match in title/description |
| `location` | text | YES | | Location filter (ILIKE) |
| `job_type` | text | YES | | Job type filter (exact match) |
| `experience_level` | text | YES | | Experience level filter (exact match) |
| `min_salary` | integer | YES | | Minimum salary filter |
| `max_salary` | integer | YES | | Maximum salary filter |
| `frequency` | text | NO | | daily/weekly/biweekly/monthly |
| `is_active` | boolean | NO | `true` | Active toggle |
| `created_at` | timestamptz | NO | `now()` | Creation time |
| `updated_at` | timestamptz | YES | `now()` | Last update (auto) |
| `last_sent_at` | timestamptz | YES | | Last time a notification was actually sent |
| `last_checked_at` | timestamptz | YES | | Last time the cron checked for matches (always advances) |

### Indexes (5)

| Index | Type | Purpose |
|---|---|---|
| `job_alerts_pkey` | UNIQUE btree | PK |
| `job_alerts_user_alert_name_key` | UNIQUE btree | Name uniqueness per user |
| `job_alerts_user_active_idx` | btree | Active alerts by user |
| `job_alerts_keywords_gin_idx` | GIN | Keyword array search |
| `idx_job_alerts_active_checked` | btree | Cron query (active + last_checked_at) |

### RLS Policies (4)

| Policy | Cmd | Condition |
|---|---|---|
| `job_alerts_select_v2` | SELECT | `user_id = auth.uid() OR admin` |
| `job_alerts_insert_v2` | INSERT | `user_id = auth.uid()` (with_check) |
| `job_alerts_update_v2` | UPDATE | `user_id = auth.uid()` |
| `job_alerts_delete_v2` | DELETE | `user_id = auth.uid() OR admin` |

### Triggers (3)

| Trigger | Event | Function | Purpose |
|---|---|---|---|
| `trg_job_alerts_set_updated_at` | BEFORE UPDATE | `set_updated_at()` | Auto-update `updated_at` |
| `trg_job_alerts_set_user_id` | BEFORE INSERT | `set_job_alerts_user_id()` | Set `user_id` from `auth.uid()` |
| `update_job_alerts_updated_at` | BEFORE UPDATE | `update_updated_at_column()` | Auto-update `updated_at` (duplicate) |

### Cron Job

| Schedule | Command | Active |
|---|---|---|
| `0 * * * *` (hourly) | `SELECT public.process_job_alerts();` | true |

## L5: Workflows

### Create Alert
1. User navigates to `/jobs/alerts`
2. Clicks "Create Alert"
3. Fills form (name, keywords, location, job type, experience, salary, frequency)
4. Clicks "Save"
5. Frontend calls `createJobAlert(alertData)` → `create_job_alert` RPC
6. RPC checks rate limit (max 10), validates fields, inserts into `job_alerts`
7. Frontend refreshes alert list

### Cron Matching
1. Hourly cron fires `process_job_alerts()`
2. Iterates active alerts where frequency interval has elapsed (using `last_checked_at`)
3. For each alert, finds matching jobs created since `last_checked_at`
4. For each match, calls `notify()` (respects preferences)
5. If notification created: `last_sent_at = now()`, `last_checked_at = now()`
6. If no notification created (preferences disabled): only `last_checked_at = now()`
7. Returns total notification count

### Toggle Alert
1. User clicks toggle switch
2. Frontend calls `updateJobAlert(id, { is_active: !current })`
3. RPC updates `is_active` column
4. If deactivated: alert stops matching in cron
5. If reactivated: alert resumes matching from `last_checked_at`

## Role Matrix

| Action | alumni | student | employer | admin | super_admin |
|---|---|---|---|---|---|
| View own alerts | YES | YES | YES | YES | YES |
| Create alert | YES | YES | YES | YES | YES |
| Update own alert | YES | YES | YES | YES | YES |
| Delete own alert | YES | YES | YES | YES | YES |
| View all users' alerts | NO | NO | NO | YES | YES |
| Delete others' alerts | NO | NO | NO | YES | YES |
| View admin alert panel | NO | NO | NO | NO | NO (not implemented) |

## Defects Found and Fixed

| # | Defect Class | Severity | Description | Fix |
|---|---|---|---|---|
| 1 | Broken Lifecycle | High | `process_job_alerts()` updated `last_sent_at` even when `notify()` returned NULL (preferences disabled). This permanently skipped matching jobs — they would never be matched again even if preferences were re-enabled. | Split watermark: `last_checked_at` (always advances) + `last_sent_at` (only advances when notifs sent). Matching uses `last_checked_at`. |
| 2 | Lying UI | Medium | `get_alert_performance_stats` used `approval_status = 'approved'` while `process_job_alerts` used `is_approved = true`. Both were consistent today but could diverge. | Rewrote `get_alert_performance_stats` to use `is_approved = true` (same as cron). |
| 3 | Lying UI | Medium | "Jobs Found This Week" stat counted ALL matching jobs since alert creation, not just this week. | Rewrote function to count jobs from last 7 days for `jobs_this_week` + added `total_matches` for all-time count. |
| 4 | Missing Cascade | Medium | When a job was deleted, job-alert notifications referencing it via `/jobs/<id>` would 404. No cleanup existed. | Added `trg_cleanup_job_alert_notifications` trigger on `jobs` DELETE that removes notifications with `metadata->>'job_id' = OLD.id AND metadata->>'alert_id' IS NOT NULL`. |
| 5 | Dead Logic | Low | Migration `001_job_alert_delivery_engine.sql` defines `job_alert_notifications` dedup table, `process_job_alert(p_job_id uuid)` (singular, trigger-based), and triggers on `jobs` table — NONE exist in live DB. Migration was never applied. | Marked migration as SUPERSEDED with warning header. Live DB uses cron-based `process_job_alerts()` with watermark dedup. |

## Defects Documented as Intentional

| # | Item | Reason |
|---|---|---|
| 1 | No real-time job alert matching (only hourly cron) | Design choice — cron-based matching is simpler and avoids trigger storms on bulk job imports. Up to 1 hour delay is acceptable. |
| 2 | `LIMIT 10` per alert per cron run | Prevents notification floods when many jobs are approved at once. Excess jobs are skipped (watermark advances). Acceptable for current scale (4 approved jobs). |
| 3 | No admin panel for job alerts | Not in scope — admins can view/delete via direct DB access or Supabase studio. |
| 4 | `job_alerts` not in realtime publication | User-initiated changes don't need realtime — the user sees their changes immediately. |
| 5 | Duplicate `updated_at` triggers (2 triggers doing the same thing) | Harmless — both set `updated_at = now()`. Cleanup is cosmetic. |

## Live Data Summary

| Metric | Value |
|---|---|
| Total alerts | 11 |
| Active alerts | 11 |
| Inactive alerts | 0 |
| Approved jobs in system | 4 |
| Job alert notifications created | 1 |
| Users with job preferences disabled | 0 |
| Cron schedule | Hourly |
| Max alerts per user | 10 |
