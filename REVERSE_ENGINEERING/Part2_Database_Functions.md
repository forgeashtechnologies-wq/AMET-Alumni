# AMET Alumni — Reverse Engineering: Part 2 — Database Functions

**Source:** Live production database
**Date:** 2026-09-07
**Total notification-related functions:** 95

---

## 2.1 Function Categories

| Category | Count | Purpose |
|---|---:|---|
| Notification creation (trigger functions) | 24 | Called by table triggers to create notifications |
| Notification creation (callable) | 8 | Called directly by app code or other functions |
| Notification reading (RPCs) | 6 | Fetch notifications and counts for display |
| Notification mutation (RPCs) | 3 | Mark read/unread/mark-all |
| Notification filtering | 3 | `is_bell_worthy`, `should_deliver_in_app`, `validate_notification_metadata` |
| Notification link derivation | 1 | `derive_notification_link` |
| User role helpers | 2 | `get_user_role` (2 overloads) |
| Job alert management | 4 | `create_job_alert`, `update_job_alert`, `process_job_alerts`, `check_job_alert_rate_limit` |
| Group notification helpers | 3 | `create_group_notification` (2 overloads), `create_group_notification_once` |
| Scheduled/notification batch | 5 | `notify_events_due_in_24h`, `notify_mentorship_sessions_due_in_2h`, `notify_unread_messages_summary`, `notify_profile_verification`, `cleanup_old_notifications` |
| Admin utilities | 3 | `purge_notifications_admin`, `admin_update_profile_approval`, `notify_admins_on_group_post_report` |
| Event-sourcing pipeline | 2 | `process_notification_event_mentorship_v1`, `trg_process_notification_event_mentorship` |
| Other/utility | 31 | Trigger functions for non-notification purposes (timestamps, audit, etc.) |

---

## 2.2 Core Notification Functions

### `notify(p_recipient_id, p_type, p_title, p_message, p_link, p_metadata)` — MAIN ENTRY POINT

```
Returns: uuid
Language: plpgsql
Security: SECURITY DEFINER
Search path: 'public', 'pg_temp'
```

**What it does:**
1. Generates a UUID for the notification
2. Calls `should_deliver_in_app(recipient_id, type)` — if `false`, returns NULL (no notification created)
3. Inserts into `notifications` with title (truncated to 200 chars) and message (truncated to 1000 chars)
4. On CHECK violation (invalid type), falls back to `type = 'system'` and stores original type in `metadata.original_type`
5. Returns the notification ID

**Who calls it:** Most trigger functions call `notify()` to create notifications. Some trigger functions insert directly into `notifications` (bypassing preference checks).

---

### `should_deliver_in_app(p_user_id, p_type)` — PREFERENCE GATE

```
Returns: boolean
Language: plpgsql
Stable
```

**What it does:**
1. Checks if `notification_preferences` table exists
2. Looks for an exact match: `user_id = p_user_id AND notification_type = p_type AND in_app_enabled = false` → returns `false`
3. Looks for a wildcard match: `user_id = p_user_id AND notification_type IN ('all', '*') AND in_app_enabled = false` → returns `false`
4. Otherwise returns `true` (default: deliver)

**Critical detail:** This is called by `notify()` at INSERT time. If a user disables a preference AFTER notifications are already created, those existing notifications remain in the DB. The `bell_notifications` view applies a SECOND preference filter at read time to handle this.

---

### `is_bell_worthy(p_role, p_type, p_metadata)` — BELL VISIBILITY GATE

```
Returns: boolean
Language: plpgsql
```

**What it does:**
1. Normalizes role (defaults to `'alumni'` if NULL/anon/user)
2. Normalizes type (defaults to `'system'`)
3. Extracts audience from metadata (defaults to `'user'`)
4. **Hard exclusion list:** `rsvp_confirmation`, `application_submitted`, `mentorship_reminder`, `generic_toast` → always `false`
5. **Admin audience + admin role:** Returns `true` for `alert`, `system`, `group_admin_risk`, `group_deleted`, `group_approved`, `group_rejected`
6. **General types** (visible to all roles): `connection`, `connection_request`, `message`, `chat_message`, `job`, `job_posted`, `job_approved`, `job_applied`, `application`, `application_status`, `event`, `event_created`, `event_published`, `event_updated`, `mentorship`, `system`, `alert`
7. **Group types** (visible to all roles): `group`, `group_join_request`, `group_membership_approved`, `group_membership_rejected`, `group_admin_risk`, `group_invite_received`, `group_invite_accepted`, `group_approved`, `group_rejected`, `group_deleted`
8. Returns `false` for anything not in the above lists

**Consumed by:** `bell_notifications` view, `admin_bell_notifications` view

---

### `derive_notification_link(p_type, p_metadata, p_link)` — LINK DERIVATION

```
Returns: text
Language: plpgsql
Immutable
```

**What it does:**
1. If `p_link` is provided and non-empty, returns it immediately
2. Extracts `entity_type`, `entity_id`, `group_id`, `relationship_id`, `status`, `thread_id` from metadata
3. **Message/chat_message:** `/messages?thread=<thread_id>` (or entity_id, or `/messages` fallback)
4. **Group_* types:** `/groups/<group_id>/manage` for `group_join_request` and `group_admin_risk`, `/groups/<group_id>` for others
5. **Mentorship:** `/mentorship?tab=mentee&highlightRelationshipId=<id>` if accepted, `/mentorship?tab=requests&sub=sent` if rejected/pending, `/mentorship` fallback
6. **Entity-based routing:** `job` → `/jobs/<id>`, `event` → `/events/<id>`, `application` → `/applications/<id>`, `connection` → `/network`, `group` → `/groups/<id>`, `profile` → `/profile/<id>`
7. Returns NULL if no match

**Consumed by:** `bell_notifications` view via `COALESCE(n.link, derive_notification_link(n.type, n.metadata, n.link))`

---

## 2.3 Notification Reading RPCs

### `get_notifications_paginated(p_limit, p_offset, p_is_read)`

```
Returns: SETOF bell_notifications
Language: sql
Security: SECURITY DEFINER
Default: p_limit=50, p_offset=0, p_is_read=NULL
```

**Query:** `SELECT * FROM bell_notifications WHERE recipient_id = auth.uid() AND (p_is_read IS NULL OR is_read = p_is_read) ORDER BY created_at DESC LIMIT LEAST(p_limit, 50) OFFSET p_offset`

**Used by frontend:** `fetchNotifications()` in `notifications.ts` → `useNotifications()` hook

---

### `get_unread_notification_count()`

```
Returns: bigint
Language: sql
Stable, SECURITY DEFINER
```

**Query:** `SELECT count(*) FROM bell_notifications WHERE recipient_id = auth.uid() AND is_read = false`

**Used by frontend:** `getBellUnreadCount()` in `notifications.ts` → `useBellUnreadCount()` hook → `Bell.tsx` badge

---

### `get_bell_unread_count()`

```
Returns: bigint
Language: plpgsql
SECURITY DEFINER
```

**Logic:** Same as `get_unread_notification_count` but wrapped in plpgsql with explicit `auth.uid()` check (returns 0 if NULL).

**Note:** This is a DUPLICATE of `get_unread_notification_count()`. The frontend calls `get_unread_notification_count`, not this one. This function exists but is not called by the frontend.

---

### `get_admin_unread_count()`

```
Returns: bigint
Language: plpgsql
SECURITY DEFINER
```

**Logic:**
1. Gets `auth.uid()` — returns 0 if NULL
2. Gets user role via `get_user_role(uid)`
3. Returns 0 if role is NOT `admin` or `super_admin`
4. Counts unread from `admin_bell_notifications` where `recipient_id = uid AND is_read = false`

**Used by frontend:** `getAdminUnreadCount()` in `notifications.ts` → `useAdminUnreadCount()` hook (but this hook is never imported by any component — dead code)

---

### `get_admin_notifications_paginated()` — DOES NOT EXIST

This function was expected but does not exist in the live DB. The admin notification fetching uses `fetchAdminNotifications()` which queries `admin_bell_notifications` view directly (not via RPC).

---

## 2.4 Notification Mutation RPCs

### `mark_notification_read(p_notification_id)`

```
Returns: void
Language: sql
SECURITY DEFINER
```

**Query:** `UPDATE notifications SET is_read = true, read_at = now() WHERE id = p_notification_id AND recipient_id = auth.uid()`

**Security:** SECURITY DEFINER bypasses RLS. The `recipient_id = auth.uid()` check ensures users can only mark their own notifications.

**Used by frontend:** `markOneRead(id)` in `notifications.ts` → `markOne()` in `useNotifications.ts`

---

### `mark_notification_unread(p_notification_id)`

```
Returns: void
Language: sql
SECURITY DEFINER
```

**Query:** `UPDATE notifications SET is_read = false, read_at = null WHERE id = p_notification_id AND recipient_id = auth.uid()`

**Used by frontend:** `markOneUnread(id)` in `notifications.ts` → `markOne()` in `useNotifications.ts`

---

### `mark_all_notifications_read()`

```
Returns: integer
Language: plpgsql
SECURITY DEFINER
```

**Logic:**
1. `UPDATE notifications SET is_read = true, read_at = now() WHERE recipient_id = auth.uid() AND is_read = false`
2. `GET DIAGNOSTICS v_count = ROW_COUNT`
3. Returns count of updated rows

**Used by frontend:** `markAllRead()` in `notifications.ts` → `markAll()` in `useNotifications.ts`

---

## 2.5 User Role Helpers

### `get_user_role()` — no args

```
Returns: text
Language: sql
Stable, SECURITY DEFINER
```

**Query:** Calls `get_user_role(auth.uid())`

---

### `get_user_role(p_user_id)` — with user ID

```
Returns: text
Language: sql
SECURITY DEFINER
```

**Logic:**
1. Looks up `profiles` table for the given user ID
2. Returns `'admin'` if `is_admin = true`
3. Returns `'alumni'` if `role IS NULL` or `role = 'user'`
4. Otherwise returns the role text

**Used by:** `is_bell_worthy()` (via `bell_notifications` view), `admin_bell_notifications` view, `get_admin_unread_count()`

---

## 2.6 Job Alert Functions

### `process_job_alerts()` — HOURLY CRON

```
Returns: integer
Language: plpgsql
SECURITY DEFINER
```

**Logic:**
1. Iterates all `job_alerts` where `is_active = true` AND frequency interval has elapsed
2. For each alert, finds matching jobs (created since `last_sent_at`) where:
   - `j.is_active = true AND j.is_approved = true AND j.is_rejected = false`
   - Job type matches (if alert specifies)
   - Experience level matches (if alert specifies)
   - Location ILIKE matches (if alert specifies)
   - Salary range overlaps (if alert specifies)
   - Keywords match in title or description (if alert specifies)
   - LIMIT 10 jobs per alert per run
3. For each matching job, inserts directly into `notifications` with `type = 'job'`, `link = '/jobs/<id>'`, `metadata = {job_id, alert_id}`, `module = 'jobs'`
4. Updates `job_alerts.last_sent_at = now()`
5. Returns total notification count

**Critical detail:** This function inserts DIRECTLY into `notifications`, bypassing `notify()` and therefore bypassing `should_deliver_in_app()`. Job alert notifications will be created even if the user has disabled job preferences. The `bell_notifications` view's second preference filter will hide them at read time, but they still accumulate in the DB.

**Scheduled by:** `pg_cron` job `process_job_alerts_hourly` — runs at minute 0 of every hour (`0 * * * *`)

---

### `create_job_alert(p_alert_name, p_keywords, p_location, p_job_type, p_experience_level, p_min_salary, p_max_salary, p_frequency, p_is_active)`

```
Returns: SETOF job_alerts
Security: NOT SECURITY DEFINER (relies on RLS)
```

**Used by frontend:** `JobAlerts.js` component

---

### `update_job_alert(p_id, p_alert_name, p_keywords, p_location, p_job_type, p_experience_level, p_min_salary, p_max_salary, p_frequency, p_is_active)`

```
Returns: SETOF job_alerts
Security: NOT SECURITY DEFINER (relies on RLS)
```

---

### `check_job_alert_rate_limit()` — SECURITY DEFINER

Rate limiting for job alert creation. Returns boolean.

---

## 2.7 Group Notification Helpers

### `create_group_notification(p_user_id, p_type, p_title, p_message, p_group_id, p_metadata)` — overload 1

```
Returns: uuid
SECURITY DEFINER
```

Creates a notification for a single user about a group event.

### `create_group_notification(p_recipient_id, p_type, p_title, p_message, p_group_id, p_link)` — overload 2

```
Returns: uuid
SECURITY DEFINER
```

Similar but with explicit link parameter.

### `create_group_notification_once(p_type, p_target_profile_id, p_group_id, p_subject_user_id, p_message, p_title, p_link, p_dedupe_seconds)`

```
Returns: void
SECURITY DEFINER
```

Creates a notification only if no similar notification exists within the dedupe window. Used to prevent notification spam for group events.

---

## 2.8 Scheduled / Batch Notification Functions

| Function | Returns | Purpose |
|---|---|---|
| `notify_events_due_in_24h()` | integer | Notifies users about events starting within 24 hours |
| `notify_mentorship_sessions_due_in_2h()` | integer | Notifies users about mentorship sessions starting within 2 hours |
| `notify_unread_messages_summary()` | void | Sends summary notifications for unread messages |
| `notify_profile_verification()` | void | Notifies users about profile verification status |
| `cleanup_old_notifications()` | bigint | Cleans up old notifications (age-based purge) |

**Note:** These functions exist in the DB but are NOT all scheduled via `pg_cron`. Only `process_job_alerts()` has a cron job. The others may be called by Edge Functions or manually.

---

## 2.9 Admin Utility Functions

### `purge_notifications_admin(p_user_id)`

```
Returns: integer
SECURITY DEFINER
```

Deletes all notifications for a specific user. Admin-only (implied by SECURITY DEFINER + name). Returns count of deleted rows.

### `admin_update_profile_approval()`

Trigger function that fires on UPDATE of `profiles.approval_status`. When approval transitions to `'approved'`, creates a `type = 'system'` notification for the user. Has a guard: only fires when `old.approval_status IS DISTINCT FROM 'approved' AND new.approval_status = 'approved'`.

### `notify_admins_on_group_post_report()`

Trigger function that fires on INSERT to `group_post_reports`. Notifies admins about new group post reports.

---

## 2.10 Event-Sourcing Pipeline (Mentorship)

### `process_notification_event_mentorship_v1(p_event_id)`

```
Returns: void
SECURITY DEFINER
```

Processes a `notification_events` row for mentorship. Generates the appropriate notification(s) based on the event type and metadata.

### `trg_process_notification_event_mentorship()`

Trigger function that fires on INSERT to `notification_events` and calls `process_notification_event_mentorship_v1(new.id)`.

---

## 2.11 Notification Validation

### `validate_notification_metadata(p_type, p_metadata)`

```
Returns: boolean
```

Validates that metadata contains required fields for the given notification type. Not currently enforced by any trigger or constraint — exists as a utility function.

---

## 2.12 Complete Function Inventory (95 functions)

| # | Function | Returns | SecDef | Type |
|---|---|---|---|---|
| 1 | `admin_update_profile_approval` | trigger | t | Trigger |
| 2 | `bump_conversation_last_message` | trigger | t | Trigger |
| 3 | `check_job_alert_rate_limit` | boolean | t | Callable |
| 4 | `cleanup_old_notifications` | bigint | t | Callable |
| 5 | `connections_notify` | trigger | t | Trigger |
| 6 | `create_connection_notification` | trigger | t | Trigger |
| 7 | `create_group_notification` (overload 1) | uuid | t | Callable |
| 8 | `create_group_notification` (overload 2) | uuid | t | Callable |
| 9 | `create_group_notification_once` | void | t | Callable |
| 10 | `create_job_alert` | SETOF job_alerts | f | Callable |
| 11 | `create_notification` (overload 1) | uuid | t | Callable |
| 12 | `create_notification` (overload 2) | uuid | t | Callable |
| 13 | `create_notification` (overload 3) | uuid | t | Callable |
| 14 | `derive_notification_link` | text | f | Callable |
| 15 | `dm_threads_insert_participants` | trigger | t | Trigger |
| 16 | `dm_threads_touch_after_message` | trigger | t | Trigger |
| 17 | `get_admin_unread_count` | bigint | t | RPC |
| 18 | `get_bell_unread_count` | bigint | t | RPC |
| 19 | `get_notifications_paginated` | SETOF bell_notifications | t | RPC |
| 20 | `get_unread_notification_count` | bigint | t | RPC |
| 21 | `get_user_role` (no args) | text | t | Helper |
| 22 | `get_user_role` (with user_id) | text | t | Helper |
| 23 | `group_admin_risk_notify` | trigger | t | Trigger |
| 24 | `group_membership_notify_pending` | trigger | t | Trigger |
| 25 | `is_bell_worthy` | boolean | f | Filter |
| 26 | `mark_all_notifications_read` | integer | t | RPC |
| 27 | `mark_notification_read` | void | t | RPC |
| 28 | `mark_notification_unread` | void | t | RPC |
| 29 | `notify` | uuid | t | Core |
| 30 | `notify_admin_new_mentor_request` | trigger | t | Trigger |
| 31 | `notify_admins_on_event` | trigger | t | Trigger |
| 32 | `notify_admins_on_group_post_report` | trigger | t | Trigger |
| 33 | `notify_chat_message` | trigger | t | Trigger |
| 34 | `notify_connection_approved` | trigger | t | Trigger |
| 35 | `notify_dm_participants` | trigger | t | Trigger |
| 36 | `notify_event` | trigger | t | Trigger |
| 37 | `notify_event_approved_broadcast` | trigger | t | Trigger |
| 38 | `notify_event_rsvp` | trigger | t | Trigger |
| 39 | `notify_events_due_in_24h` | integer | t | Scheduled |
| 40 | `notify_interview_invite` | trigger | t | Trigger |
| 41 | `notify_job_application` | trigger | t | Trigger |
| 42 | `notify_job_application_submitted` | trigger | t | Trigger |
| 43 | `notify_job_applied` | trigger | t | Trigger |
| 44 | `notify_mentorship_request` | trigger | t | Trigger |
| 45 | `notify_mentorship_sessions_due_in_2h` | integer | t | Scheduled |
| 46 | `notify_new_connection_request` | trigger | f | Trigger |
| 47 | `notify_new_message` | trigger | t | Trigger |
| 48 | `notify_on_job_application` | trigger | f | Trigger |
| 49 | `notify_on_request_update` | trigger | t | Trigger |
| 50 | `notify_profile_verification` | void | f | Scheduled |
| 51 | `notify_request_status_change` | trigger | t | Trigger |
| 52 | `notify_requests_on_rejection` | trigger | t | Trigger |
| 53 | `notify_unread_messages_summary` | void | t | Scheduled |
| 54 | `notify_user` | uuid | t | Callable |
| 55 | `notify_validated` | uuid | t | Callable |
| 56 | `process_job_alerts` | integer | t | Cron |
| 57 | `process_notification_event_mentorship_v1` | void | t | Callable |
| 58 | `purge_notifications_admin` | integer | t | Admin |
| 59 | `send_dm_message` (overload 1) | dm_messages | t | Callable |
| 60 | `send_dm_message` (overload 2) | uuid | t | Callable |
| 61 | `set_job_alerts_user_id` | trigger | f | Trigger |
| 62 | `should_deliver_in_app` | boolean | f | Filter |
| 63 | `sync_resume_profile_to_job_alert` | trigger | t | Trigger |
| 64 | `trg_event_attendee_cancel_notify` | trigger | t | Trigger |
| 65 | `trg_event_attendee_invite_or_rsvp_notify` | trigger | t | Trigger |
| 66 | `trg_event_feedback_notify` | trigger | t | Trigger |
| 67 | `trg_event_owner_admin_notify` | trigger | t | Trigger |
| 68 | `trg_job_applications_notifications` | trigger | t | Trigger |
| 69 | `trg_jobs_notifications` | trigger | t | Trigger |
| 70 | `trg_mentorship_relationships_notifications` | trigger | t | Trigger |
| 71 | `trg_mentorship_requests_notifications` | trigger | t | Trigger |
| 72 | `trg_process_notification_event_mentorship` | trigger | t | Trigger |
| 73 | `update_conversation_last_message` | trigger | t | Trigger |
| 74 | `update_conversation_last_message_at` | trigger | f | Trigger |
| 75 | `update_conversation_last_message_timestamp` | trigger | t | Trigger |
| 76 | `update_job_alert` | SETOF job_alerts | f | Callable |
| 77 | `validate_notification_metadata` | boolean | f | Utility |
| 78-95 | (timestamp/audit/utility triggers) | various | various | Various |

**SECURITY DEFINER count:** 67 out of 95 functions are SECURITY DEFINER (bypass RLS).
