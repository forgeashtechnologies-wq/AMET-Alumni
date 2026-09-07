# AMET Alumni — Reverse Engineering: Part 4 — Views, RLS & Realtime

**Source:** Live production database
**Date:** 2026-09-07

---

## 4.1 Views (5 notification-related views)

### `bell_notifications` — USER BELL VIEW

```sql
SELECT n.id, n.recipient_id, n.type, n.title, n.message,
       COALESCE(n.link, derive_notification_link(n.type, n.metadata, n.link)) AS link,
       n.metadata, n.is_read, n.read_at, n.created_at, n.sender_id, n.event_id
FROM notifications n
LEFT JOIN notification_preferences p 
  ON p.user_id = n.recipient_id AND p.notification_type = n.type
WHERE COALESCE(p.in_app_enabled, true) = true
  AND NOT lower(COALESCE(n.title, '')) LIKE 'rsvp confirmed%'
  AND is_bell_worthy(get_user_role(n.recipient_id), n.type, n.metadata)
ORDER BY n.created_at DESC
```

**Columns (12):** `id, recipient_id, type, title, message, link, metadata, is_read, read_at, created_at, sender_id, event_id`

**Filtering layers (3):**
1. **Preference filter:** LEFT JOIN `notification_preferences` — excludes types where `in_app_enabled = false`
2. **Title filter:** Excludes notifications with title starting with "rsvp confirmed" (case-insensitive)
3. **Bell-worthiness filter:** `is_bell_worthy(role, type, metadata)` — role-based + type-based + audience-based filtering

**Link derivation:** `COALESCE(n.link, derive_notification_link(...))` — uses explicit link if set, falls back to server-side derivation

**Consumed by:**
- `get_notifications_paginated()` — `SELECT * FROM bell_notifications WHERE recipient_id = auth.uid()`
- `get_unread_notification_count()` — `SELECT count(*) FROM bell_notifications WHERE recipient_id = auth.uid() AND is_read = false`
- `get_bell_unread_count()` — same as above but in plpgsql wrapper

---

### `admin_bell_notifications` — ADMIN BELL VIEW

```sql
SELECT n.id, n.recipient_id, n.type, n.title, n.message, n.link, n.metadata,
       n.is_read, n.read_at, n.created_at,
       n.metadata->>'severity' AS severity,
       n.metadata->>'entity_type' AS entity_type,
       n.metadata->>'entity_id' AS entity_id,
       (n.metadata->>'action_required')::boolean AS action_required
FROM notifications n
LEFT JOIN notification_preferences p 
  ON p.user_id = n.recipient_id AND p.notification_type = n.type
WHERE n.metadata->>'audience' = 'admin'
  AND COALESCE(p.in_app_enabled, true) = true
  AND is_bell_worthy(get_user_role(n.recipient_id), n.type, n.metadata)
  AND get_user_role(n.recipient_id) IN ('admin', 'super_admin')
ORDER BY 
  CASE n.metadata->>'severity'
    WHEN 'critical' THEN 1
    WHEN 'warning' THEN 2
    ELSE 3
  END, n.created_at DESC
```

**Columns (14):** Same as `bell_notifications` + `severity`, `entity_type`, `entity_id`, `action_required`

**Filtering layers (4):**
1. **Audience filter:** `metadata->>'audience' = 'admin'` — only admin-audience notifications
2. **Preference filter:** Same as bell_notifications
3. **Bell-worthiness filter:** Same
4. **Role filter:** Recipient must be admin or super_admin

**Sorting:** By severity (critical → warning → info), then by created_at DESC

**Consumed by:**
- `get_admin_unread_count()` — `SELECT count(*) FROM admin_bell_notifications WHERE recipient_id = uid AND is_read = false`
- Frontend `fetchAdminNotifications()` queries this view directly (not via RPC)

**Notable:** This view does NOT use `COALESCE(n.link, derive_notification_link(...))` — it returns the raw `n.link`. Admin notifications must have links set at insert time.

---

### `notification_stats` — ANALYTICS VIEW

```sql
SELECT type,
       count(*) AS total_sent,
       count(*) FILTER (WHERE is_read = true) AS read_count,
       count(*) FILTER (WHERE is_read = false) AS unread_count,
       round(avg(EXTRACT(epoch FROM read_at - created_at))) AS avg_read_time_seconds,
       max(created_at) AS last_sent_at
FROM notifications
GROUP BY type
```

**Purpose:** Analytics dashboard data. No RLS filter — shows ALL notifications across ALL users. Should only be accessible to admins.

---

### `v_notification_prefs` — PREFERENCES VIEW

```sql
SELECT user_id, notification_type AS type, in_app_enabled, email_enabled, push_enabled, updated_at
FROM notification_preferences
```

**Purpose:** Simplified view of notification preferences. Used by frontend `NotificationSettings.jsx` to load preferences.

---

### `vw_job_alerts` — JOB ALERTS VIEW

```sql
SELECT id, user_id, alert_name, keywords, location, job_type, experience_level,
       min_salary, max_salary, frequency, is_active, created_at, updated_at, last_sent_at
FROM job_alerts
```

**Purpose:** Simplified view of job alerts. Excludes legacy array fields.

---

## 4.2 RLS Policies

### `notifications` table (12 policies)

RLS is **ENABLED** but not FORCED.

| Policy | Command | Condition | Notes |
|---|---|---|---|
| `Users can view their own notifications` | SELECT | `recipient_id = auth.uid()` | Basic self-access |
| `Users read own notifications` | SELECT | `recipient_id = auth.uid()` | Duplicate |
| `notifications_select_own` | SELECT | `user_id = auth.uid()` | Uses `user_id` column (legacy) |
| `notifications_select_self_or_admin` | SELECT | `recipient_id = auth.uid() OR fc_is_admin() OR fc_is_super_admin()` | Admin override |
| `Users can update their own notifications` | UPDATE | `recipient_id = auth.uid()` | Basic self-update |
| `Users update own notifications` | UPDATE | `recipient_id = auth.uid()` | Duplicate |
| `notifications_update_own` | UPDATE | `user_id = auth.uid()` | Uses `user_id` column (legacy) |
| `notifications_update_self_or_admin` | UPDATE | `recipient_id = auth.uid() OR fc_is_admin() OR fc_is_super_admin()` | Admin override |
| `notifications_delete_admin_only` | DELETE | `fc_is_admin() OR fc_is_super_admin()` | Admin-only deletion |
| `notifications_insert_service` | INSERT | (no condition) | Service role only (implied) |
| `notifications_insert_service_only` | INSERT | (no condition) | Duplicate |
| `notifications_insert_via_function` | INSERT | (no condition) | For SECURITY DEFINER functions |

**Notable issues:**
- 3 SELECT policies overlap (any one would suffice)
- 3 UPDATE policies overlap
- 3 INSERT policies overlap
- `notifications_select_own` and `notifications_update_own` use `user_id` column which is often NULL (the main column is `recipient_id`). These policies may not work as intended.
- All mark-read RPCs are SECURITY DEFINER, so they bypass RLS entirely. The RLS policies are for direct table access (which the frontend doesn't do for mutations).

---

### `notification_preferences` table (10 policies)

RLS is **ENABLED**.

| Policy | Command | Condition |
|---|---|---|
| `Users can manage their own preferences` | ALL | `user_id = auth.uid()` |
| `Users manage own preferences` | ALL | `user_id = auth.uid()` |
| `notification_preferences_own` | ALL | `user_id = auth.uid()` |
| `notification_prefs_select_own` | SELECT | `user_id = auth.uid()` |
| `notification_prefs_select_self_or_admin` | SELECT | `user_id = auth.uid() OR fc_is_admin() OR fc_is_super_admin()` |
| `notification_prefs_insert_own` | INSERT | (no condition) |
| `notification_prefs_insert_self_or_admin` | INSERT | `user_id = auth.uid() OR fc_is_admin() OR fc_is_super_admin()` |
| `notification_prefs_update_own` | UPDATE | `user_id = auth.uid()` |
| `notification_prefs_update_self_or_admin` | UPDATE | `user_id = auth.uid() OR fc_is_admin() OR fc_is_super_admin()` |
| `notification_prefs_delete_self_or_admin` | DELETE | `user_id = auth.uid() OR fc_is_admin() OR fc_is_super_admin()` |

**Notable:** 3 "ALL" policies that do the same thing. Frontend `NotificationSettings.jsx` writes directly to this table (not via RPC), so RLS policies here are actively used.

---

### `notification_events` table (3 policies)

| Policy | Command | Condition |
|---|---|---|
| `notification_events_admin_read` | SELECT | `app_is_admin()` |
| `notification_events_no_modify` | ALL | `false` (denies all) |
| `notification_events_service_insert` | ALL | `true` (allows all — for service role) |

**Notable:** `notification_events_no_modify` with `false` condition denies ALL operations for non-service roles. Only service role (which bypasses RLS) can insert. Admins can read.

---

### `notification_audit` table (3 policies)

| Policy | Command | Condition |
|---|---|---|
| `notification_audit_admin_read` | SELECT | `app_is_admin()` |
| `notification_audit_internal_insert` | INSERT | (no condition) |
| `notification_audit_no_modify` | ALL | `false` (denies all) |

---

### `notification_audit_log` table (1 policy)

| Policy | Command | Condition |
|---|---|---|
| `Admins can view notification audit log` | SELECT | Admin check via profiles table |

---

### `admin_notifications` table (6 policies)

| Policy | Command | Condition |
|---|---|---|
| `Admins can view admin notifications` | SELECT | Admin check via profiles |
| `Admins read admin notifications` | SELECT | Same (duplicate) |
| `Service role can insert admin notifications` | INSERT | (no condition) |
| `admin_notifications_admin_only` | ALL | `app_is_admin()` |
| `admin_notifications_select_admins` | SELECT | `get_user_role(auth.uid()) IN ('admin', 'super_admin')` |
| `admin_notifications_update_admins` | UPDATE | `get_user_role(auth.uid()) IN ('admin', 'super_admin')` |

**Notable:** This is the LEGACY `admin_notifications` table. It has RLS but is not consumed by the current bell system (which uses `admin_bell_notifications` view over `notifications` table).

---

### `system_alerts` table (1 policy)

| Policy | Command | Condition |
|---|---|---|
| `Admins can manage system alerts` | ALL | `is_site_admin()` |

---

### `job_alerts` table (4 policies)

| Policy | Command | Condition |
|---|---|---|
| `job_alerts_select_v2` | SELECT | `user_id = auth.uid() OR fc_is_admin() OR fc_is_super_admin()` |
| `job_alerts_insert_v2` | INSERT | (no condition — user creates their own) |
| `job_alerts_update_v2` | UPDATE | `user_id = auth.uid()` |
| `job_alerts_delete_v2` | DELETE | `user_id = auth.uid() OR fc_is_admin() OR fc_is_super_admin()` |

---

## 4.3 Realtime Publication

### Tables in `supabase_realtime` publication (notification-related)

| Table | In Publication? |
|---|---|
| `notifications` | YES |
| `notification_preferences` | NO |
| `notification_events` | NO |
| `notification_audit` | NO |
| `notification_audit_log` | NO |
| `admin_notifications` | NO |
| `system_alerts` | NO |
| `job_alerts` | NO |

**Only `notifications` is in the realtime publication.** This means:
- Frontend can subscribe to INSERT/UPDATE/DELETE on `notifications` filtered by `recipient_id`
- Changes to `notification_preferences` do NOT trigger realtime updates (the frontend must manually refetch)
- Changes to `job_alerts` do NOT trigger realtime updates

---

## 4.4 Cron Jobs (2 total)

| Job ID | Schedule | Command | Active | Job Name |
|---|---|---|---|---|
| 2 | `30 21 * * *` (daily at 9:30 PM) | `DELETE FROM dm_messages WHERE created_at < now() - interval '30 days'` | true | `purge_old_dm_messages` |
| 3 | `0 * * * *` (every hour at minute 0) | `SELECT public.process_job_alerts();` | true | `process_job_alerts_hourly` |

**Notable:**
- `process_job_alerts` runs hourly and matches active alerts against newly approved jobs
- `purge_old_dm_messages` runs daily and deletes messages older than 30 days
- There are NO cron jobs for `notify_events_due_in_24h`, `notify_mentorship_sessions_due_in_2h`, `notify_unread_messages_summary`, or `cleanup_old_notifications`. These functions exist but are not scheduled. They may be called by Edge Functions or may be dead code.

---

## 4.5 Grants on Notification Functions

| Function | Granted To |
|---|---|
| `mark_notification_read` | PUBLIC, anon, authenticated, postgres, service_role |
| `mark_notification_unread` | PUBLIC, anon, authenticated, postgres, service_role |
| `mark_all_notifications_read` | authenticated, postgres, service_role |
| `get_unread_notification_count` | PUBLIC, anon, authenticated, postgres, service_role |
| `get_notifications_paginated` | authenticated, postgres, service_role |
| `get_bell_unread_count` | (not explicitly granted — relies on PUBLIC default) |
| `get_admin_unread_count` | (not explicitly granted — relies on PUBLIC default) |

**Notable:** `mark_notification_read` and `mark_notification_unread` are granted to `anon` and `PUBLIC`. This is not a security risk because the functions check `recipient_id = auth.uid()` internally, and `auth.uid()` returns NULL for anon users (so the UPDATE affects 0 rows).

---

## 4.6 Dependency Graph

```
notifications (table)
├── bell_notifications (view)
│   ├── is_bell_worthy() (function)
│   │   └── get_user_role() (function)
│   ├── derive_notification_link() (function)
│   └── notification_preferences (table, LEFT JOIN)
├── admin_bell_notifications (view)
│   ├── is_bell_worthy() (function)
│   ├── get_user_role() (function)
│   └── notification_preferences (table, LEFT JOIN)
├── notification_stats (view)
├── get_notifications_paginated() → bell_notifications
├── get_unread_notification_count() → bell_notifications
├── get_bell_unread_count() → bell_notifications
├── get_admin_unread_count() → admin_bell_notifications
├── mark_notification_read() → notifications (direct UPDATE)
├── mark_notification_unread() → notifications (direct UPDATE)
├── mark_all_notifications_read() → notifications (direct UPDATE)
├── notify() → should_deliver_in_app() → notification_preferences
├── process_job_alerts() → notifications (direct INSERT, bypasses notify())
└── 24 triggers on 10 tables → notify() or direct INSERT
```
