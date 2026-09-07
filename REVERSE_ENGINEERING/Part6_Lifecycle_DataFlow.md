# AMET Alumni — Reverse Engineering: Part 6 — End-to-End Lifecycle & Data Flow

**Source:** Live production database + frontend codebase
**Date:** 2026-09-07

---

## 6.1 Complete Notification Lifecycle (10 Stages)

```
STAGE 1: TRIGGER EVENT
    User action or system event occurs on a table with a notification trigger
    ↓
STAGE 2: TRIGGER FIRES
    AFTER INSERT/UPDATE/DELETE trigger on the table calls a trigger function
    ↓
STAGE 3: NOTIFICATION CREATION
    Trigger function calls notify() or inserts directly into notifications table
    ↓
STAGE 4: PREFERENCE CHECK (at insert time)
    notify() calls should_deliver_in_app() — if false, notification is NOT created
    (Direct inserts bypass this check — e.g., process_job_alerts())
    ↓
STAGE 5: STORAGE
    Notification row is stored in public.notifications table
    (trg_notifications_timestamps sets updated_at, notifications_audit_insert may create audit row)
    ↓
STAGE 6: REALTIME BROADCAST
    Postgres sends a change event to Supabase Realtime (notifications is in the publication)
    Frontend receives the event via subscribeToNotifications() singleton channel
    ↓
STAGE 7: READ-TIME FILTERING
    When frontend requests notifications, RPC calls bell_notifications view which:
    a) LEFT JOINs notification_preferences (second preference check)
    b) Filters by is_bell_worthy() (role + type + audience)
    c) Excludes "rsvp confirmed%" titles
    d) Derives link via COALESCE(n.link, derive_notification_link())
    ↓
STAGE 8: DISPLAY
    Frontend renders notifications in:
    a) Bell badge (count from get_unread_notification_count RPC)
    b) Bell dropdown panel (list from get_notifications_paginated RPC)
    c) Notifications page (same RPC, with All/Unread/Read tabs)
    ↓
STAGE 9: USER ACTION
    User clicks notification → markOne(id, true) is called
    → Optimistic UI update (bell count -1, notification marked read)
    → RPC: mark_notification_read(id) → UPDATE notifications SET is_read=true WHERE id=? AND recipient_id=auth.uid()
    → Force-refetch bell count
    → Navigate to notification link
    ↓
STAGE 10: REALTIME SYNC
    The UPDATE in stage 9 triggers a realtime event
    → subscribeToNotifications() callback fires
    → Invalidates + force-refetches bell count query
    → UI syncs with server state
```

---

## 6.2 Data Flow Diagram — User Bell

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DATABASE (Supabase)                         │
│                                                                     │
│  ┌──────────────┐    ┌──────────────────┐    ┌───────────────────┐  │
│  │  Trigger on  │───▶│  Trigger Function │───▶│  notify() or     │  │
│  │  table (e.g. │    │  (e.g.           │    │  direct INSERT   │  │
│  │  jobs,       │    │  trg_jobs_       │    │  into            │  │
│  │  connections,│    │  notifications)  │    │  notifications   │  │
│  │  events...)  │    │                  │    │                  │  │
│  └──────────────┘    └──────────────────┘    └────────┬─────────┘  │
│                                                       │            │
│                                                       ▼            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              notifications (table, 24 columns)              │   │
│  │  id | recipient_id | type | title | message | link |        │   │
│  │  is_read | metadata | created_at | sender_id | event_id ... │   │
│  │                                                             │   │
│  │  RLS: 12 policies (self-read, self-update, admin-all)       │   │
│  │  Indexes: 28 (heavy, with duplicates)                       │   │
│  │  Triggers: 3 (audit, ensure_recipient, timestamps)          │   │
│  │  Realtime: YES (in supabase_realtime publication)           │   │
│  └─────────────────────┬───────────────────────────────────────┘   │
│                        │                                            │
│                        ▼                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │           bell_notifications (VIEW)                         │   │
│  │                                                             │   │
│  │  SELECT n.*, COALESCE(n.link, derive_notification_link())   │   │
│  │  FROM notifications n                                       │   │
│  │  LEFT JOIN notification_preferences p                       │   │
│  │    ON p.user_id = n.recipient_id                            │   │
│  │   AND p.notification_type = n.type                          │   │
│  │  WHERE COALESCE(p.in_app_enabled, true) = true              │   │
│  │    AND NOT lower(n.title) LIKE 'rsvp confirmed%'            │   │
│  │    AND is_bell_worthy(get_user_role(n.recipient_id),        │   │
│  │                        n.type, n.metadata)                  │   │
│  └─────────────────────┬───────────────────────────────────────┘   │
│                        │                                            │
│           ┌────────────┴────────────┐                               │
│           ▼                         ▼                               │
│  ┌──────────────────┐    ┌──────────────────────────┐              │
│  │ get_notifications│    │ get_unread_notification  │              │
│  │ _paginated()     │    │ _count()                 │              │
│  │ RPC              │    │ RPC                      │              │
│  │ Returns: SETOF   │    │ Returns: bigint          │              │
│  │ bell_notifications│   │                          │              │
│  │ Limit: 50        │    │                          │              │
│  └────────┬─────────┘    └───────────┬──────────────┘              │
│           │                          │                              │
└───────────┼──────────────────────────┼──────────────────────────────┘
            │                          │
            │ REST API (PostgREST)     │ REST API (PostgREST)
            ▼                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                             │
│                                                                     │
│  ┌──────────────────┐    ┌──────────────────────────────┐          │
│  │ fetchNotifications│   │ getBellUnreadCount()         │          │
│  │ (api/notifications│   │ (api/notifications.ts)       │          │
│  │ .ts)              │   │ Calls: get_unread_notification│          │
│  │ Calls: get_notif  │   │ _count RPC                   │          │
│  │ ications_paginated│   │                              │          │
│  └────────┬─────────┘    └───────────┬──────────────────┘          │
│           │                          │                              │
│           ▼                          ▼                              │
│  ┌──────────────────┐    ┌──────────────────────────────┐          │
│  │ useNotifications()│   │ useBellUnreadCount()         │          │
│  │ (hook)            │   │ (hook)                        │          │
│  │ Query key:        │   │ Query key:                    │          │
│  │ ['notifications', │   │ ['bell-unread-count', userId] │          │
│  │  userId, {...}]   │   │                               │          │
│  │                   │   │ staleTime: 5s                 │          │
│  │ staleTime: 10s    │   │ refetchInterval: 30s          │          │
│  └────────┬─────────┘    └───────────┬──────────────────┘          │
│           │                          │                              │
│           ▼                          ▼                              │
│  ┌──────────────────┐    ┌──────────────────────────────┐          │
│  │NotificationsPanel│    │ Bell.tsx                     │          │
│  │ .tsx              │   │ Renders badge with count      │          │
│  │ Renders list      │   │                              │          │
│  └──────────────────┘    └──────────────────────────────┘          │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │          Realtime (utils/notificationRealtime.ts)        │      │
│  │                                                          │      │
│  │  Singleton channel: `notifications:${userId}`            │      │
│  │  Filter: recipient_id=eq.${userId}                       │      │
│  │  Listeners: useNotifications + useBellUnreadCount        │      │
│  │  On event: invalidate + force-refetch queries            │      │
│  └──────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6.3 Data Flow — Mark-as-Read

```
USER CLICKS NOTIFICATION
    │
    ▼
NotificationItem.open()
    │
    ├─ If unread: onToggleRead(n.id, true) → markOne(id, true)
    │
    ├─ Navigate to safeLink
    │
    └─ onNavigate() → close panel
         │
         ▼
    useNotifications.markOne(id, true)
         │
         ├─ STEP 1: Optimistic update (synchronous, before RPC)
         │   ├─ Update all cached ['notifications', userId] queries:
         │   │   set is_read=true, read_at=now for notification id
         │   ├─ Update ['bell-unread-count', userId] cache:
         │   │   decrement by 1
         │   └─ UI updates INSTANTLY (bell count -1, notification marked read)
         │
         ├─ STEP 2: RPC call (async)
         │   └─ markOneRead(id) → supabase.rpc('mark_notification_read', { p_notification_id: id })
         │       │
         │       ▼
         │   DATABASE: UPDATE notifications SET is_read=true, read_at=now()
         │             WHERE id = p_notification_id AND recipient_id = auth.uid()
         │       │
         │       ├─ If recipient_id matches: 1 row updated
         │       ├─ If recipient_id doesn't match: 0 rows updated (silent no-op)
         │       └─ Trigger: trg_notifications_timestamps (updates updated_at)
         │             │
         │             ▼
         │       REALTIME: Postgres sends UPDATE event to Supabase Realtime
         │             │
         │             ▼
         │       Frontend: subscribeToNotifications callback fires
         │             ├─ invalidate ['notifications', userId]
         │             ├─ invalidate ['bell-unread-count', userId]
         │             └─ refetch ['bell-unread-count', userId]
         │
         ├─ STEP 3: On RPC success
         │   ├─ invalidate ['notifications', userId]
         │   ├─ invalidate ['bell-unread-count', userId]
         │   └─ refetch ['bell-unread-count', userId] (forced)
         │
         └─ STEP 4: On RPC failure
             ├─ Roll back optimistic notification list changes
             ├─ Roll back optimistic bell count
             ├─ Log error
             └─ Re-throw error
```

---

## 6.4 Data Flow — Mark All as Read

```
USER CLICKS "Mark all as read"
    │
    ▼
useNotifications.markAll()
    │
    ├─ STEP 1: Optimistic bell count = 0
    │
    ├─ STEP 2: RPC call
    │   └─ markAllRead() → supabase.rpc('mark_all_notifications_read')
    │       │
    │       ▼
    │   DATABASE: UPDATE notifications SET is_read=true, read_at=now()
    │             WHERE recipient_id = auth.uid() AND is_read = false
    │             → Returns count of updated rows
    │       │
    │       ▼
    │   REALTIME: Multiple UPDATE events sent (one per notification)
    │       │
    │       ▼
    │   Frontend: subscribeToNotifications callback fires for each event
    │       └─ refetch bell count (will return 0)
    │
    └─ STEP 3: On success
        ├─ invalidate ['notifications', userId]
        ├─ invalidate ['bell-unread-count', userId]
        └─ refetch ['bell-unread-count', userId] (forced)
```

---

## 6.5 Data Flow — New Notification Arrives (Realtime)

```
DATABASE: Trigger fires → notify() or direct INSERT → notifications row created
    │
    ▼
REALTIME: Postgres sends INSERT event to Supabase Realtime
    │  (filtered by recipient_id=eq.${userId})
    ▼
FRONTEND: notificationRealtime.ts singleton channel receives event
    │
    ├─ All registered listeners are called with the payload
    │
    ├─ useNotifications listener:
    │   ├─ invalidate ['notifications', userId] → triggers refetch of notification list
    │   └─ invalidate ['bell-unread-count', userId] → marks bell count as stale
    │
    └─ useBellUnreadCount listener:
        ├─ invalidate ['bell-unread-count', userId]
        └─ refetch ['bell-unread-count', userId] → fetches new count from DB
            │
            ▼
        Bell.tsx: count changes → badge updates
            │
            ├─ If count increased: show 2-second ping animation
            └─ Update badge number
```

---

## 6.6 Data Flow — Notification Preference Toggle

```
USER TOGGLES PREFERENCE IN SETTINGS
    │
    ▼
NotificationSettings.jsx
    │
    ├─ Direct Supabase client write:
    │   supabase.from('notification_preferences').upsert({
    │     user_id, notification_type, in_app_enabled, ...
    │   })
    │
    ▼
DATABASE: notification_preferences row updated/inserted
    │
    ├─ NO realtime event (notification_preferences NOT in realtime publication)
    │
    ├─ IMMEDIATE EFFECT: Future notify() calls check should_deliver_in_app()
    │   → New notifications of disabled types will NOT be created
    │
    └─ READ-TIME EFFECT: bell_notifications view LEFT JOINs notification_preferences
        → Existing notifications of disabled types will NOT appear in bell
        → Bell count decreases (if disabled types had unread notifications)
    │
    ▼
FRONTEND: No automatic refresh
    │
    └─ User must navigate away and back, or wait for refetchInterval (30s for bell count)
       → Bell count will eventually update to reflect preference change
       → Notification list will eventually update (staleTime: 10s)
```

---

## 6.7 Data Flow — Job Alert Matching

```
HOURLY CRON: process_job_alerts_hourly (0 * * * *)
    │
    ▼
DATABASE: process_job_alerts() function executes
    │
    ├─ Iterates all job_alerts WHERE is_active = true AND frequency interval elapsed
    │
    ├─ For each alert:
    │   ├─ Find matching jobs created since last_sent_at:
    │   │   WHERE j.is_active = true AND j.is_approved = true
    │   │     AND j.is_rejected = false
    │   │     AND j.created_at > last_sent_at
    │   │     AND (job_type matches OR is NULL)
    │   │     AND (experience_level matches OR is NULL)
    │   │     AND (location ILIKE matches OR is NULL)
    │   │     AND (salary range overlaps OR is NULL)
    │   │     AND (keywords match in title/description OR is NULL)
    │   │     LIMIT 10
    │   │
    │   ├─ For each matching job:
    │   │   INSERT INTO notifications (
    │   │     recipient_id = alert.user_id,
    │   │     type = 'job',
    │   │     title = 'New job matching your alert: ' || alert_name,
    │   │     message = 'New job posted: ' || job.title || ' at ' || company,
    │   │     link = '/jobs/' || job.id,
    │   │     metadata = { job_id, alert_id },
    │   │     module = 'jobs'
    │   │   )
    │   │   NOTE: Bypasses notify() and should_deliver_in_app()
    │   │   → Notification created even if user disabled job preferences
    │   │   → bell_notifications view will filter it out at read time if preference is off
    │   │
    │   └─ UPDATE job_alerts SET last_sent_at = now() WHERE id = alert.id
    │
    └─ Returns total notification count
    │
    ▼
REALTIME: INSERT events sent to recipients
    │
    ▼
FRONTEND: Bell count updates via realtime subscription
```

---

## 6.8 Role-Based Access Matrix

| Action | alumni | student | employer | admin | super_admin |
|---|---|---|---|---|---|
| View own notifications | YES | YES | YES | YES | YES |
| View all notifications | NO | NO | NO | YES | YES |
| Mark own notification read | YES | YES | YES | YES | YES |
| Mark own notification unread | YES | YES | YES | YES | YES |
| Mark all own notifications read | YES | YES | YES | YES | YES |
| Mark another user's notification read | NO | NO | NO | NO | NO |
| Delete notifications | NO | NO | NO | YES | YES |
| View admin bell | NO | NO | NO | YES | YES |
| View notification audit log | NO | NO | NO | YES | YES |
| View notification stats | NO | NO | NO | YES | YES |
| Manage notification preferences (own) | YES | YES | YES | YES | YES |
| Manage notification preferences (others) | NO | NO | NO | YES | YES |
| Create job alerts (own) | YES | YES | YES | YES | YES |
| View job alerts (own) | YES | YES | YES | YES | YES |
| View all job alerts | NO | NO | NO | YES | YES |
| Delete job alerts (own) | YES | YES | YES | YES | YES |
| Delete job alerts (others) | NO | NO | NO | YES | YES |

**Note:** The mark-read RPCs enforce `recipient_id = auth.uid()` regardless of role. Even admins cannot mark another user's notifications as read via the RPC. They can delete them via direct table access (RLS policy allows admin DELETE).

---

## 6.9 Notification Type → Module → Trigger → View → Bell Path (Complete Matrix)

| Type | Module | Trigger Table | Trigger Function | In bell_notifications? | In admin_bell_notifications? | Link Derivation |
|---|---|---|---|---|---|---|
| `system` | system | profiles | `admin_update_profile_approval` | YES (general) | Only if audience=admin | None (uses explicit link) |
| `connection` | system | connections | `create_connection_notification` | YES (general) | Only if audience=admin | `/network` |
| `message` | dm | dm_messages | `notify_dm_participants` | YES (general) | Only if audience=admin | `/messages?thread=<id>` |
| `event` | events | events/event_attendees/event_feedback/event_rsvps | various | YES (general) | Only if audience=admin | `/events/<entity_id>` |
| `event_created` | events | events | `notify_admins_on_event` | YES (general) | Only if audience=admin | `/events/<entity_id>` |
| `event_updated` | events | events | `trg_event_owner_admin_notify` | YES (general) | Only if audience=admin | `/events/<entity_id>` |
| `event_published` | events | events | `notify_event_approved_broadcast` | YES (general) | Only if audience=admin | `/events/<entity_id>` |
| `job` | jobs | jobs/job_applications/cron | `trg_jobs_notifications` / `process_job_alerts` | YES (general) | Only if audience=admin | `/jobs/<entity_id>` |
| `job_posted` | jobs | jobs | `trg_jobs_notifications` | YES (general) | Only if audience=admin | `/jobs/<entity_id>` |
| `job_approved` | jobs | jobs | `trg_jobs_notifications` | YES (general) | Only if audience=admin | `/jobs/<entity_id>` |
| `job_applied` | jobs | job_applications | `trg_job_applications_notifications` | YES (general) | Only if audience=admin | `/jobs/<entity_id>` |
| `application` | jobs | (no trigger) | (none) | YES (general) | Only if audience=admin | `/applications/<entity_id>` |
| `application_status` | jobs | job_applications | `trg_job_applications_notifications` | YES (general) | Only if audience=admin | `/jobs/<entity_id>` |
| `mentorship` | mentorship | mentorship_relationships/requests/mentors | various | YES (general) | Only if audience=admin | `/mentorship?tab=...` |
| `group` | groups | group_post_reports | `notify_admins_on_group_post_report` | YES (group) | Only if audience=admin | `/groups/<group_id>` |
| `group_join_request` | groups | group_memberships | `group_membership_notify_pending` | YES (group) | Only if audience=admin | `/groups/<group_id>/manage` |
| `group_membership_approved` | groups | (app code) | `create_group_notification_once` | YES (group) | Only if audience=admin | `/groups/<group_id>` |
| `group_membership_rejected` | groups | (app code) | `create_group_notification_once` | YES (group) | Only if audience=admin | `/groups/<group_id>` |
| `group_admin_risk` | groups | group_members | `group_admin_risk_notify` | YES (group) | YES (if audience=admin) | `/groups/<group_id>/manage` |
| `group_invite_received` | groups | (app code) | `create_group_notification` | YES (group) | Only if audience=admin | `/groups/<group_id>` |
| `group_invite_accepted` | groups | (app code) | `create_group_notification` | YES (group) | Only if audience=admin | `/groups/<group_id>` |
| `group_approved` | groups | (app code) | `create_group_notification` | YES (group) | YES (if audience=admin) | `/groups/<group_id>` |
| `group_rejected` | groups | (app code) | `create_group_notification` | YES (group) | YES (if audience=admin) | `/groups/<group_id>` |
| `group_deleted` | groups | (app code) | `create_group_notification` | YES (group) | YES (if audience=admin) | `/groups/<group_id>` |
| `alert` | system | mentors | `notify_admin_new_mentor_request` | YES (general) | YES (if audience=admin) | None |
| `resume` | system | (no trigger) | (none) | NO (not in is_bell_worthy) | NO | None |

---

## 6.10 Identified Architectural Issues

### Issue 1: Duplicate Foreign Keys
The `notifications` table has 3 duplicate FK constraints on `recipient_id` from different migration runs. Harmless but indicates schema drift.

### Issue 2: Overlapping Indexes
28 indexes on `notifications`, with 4+ partial indexes for "unread by recipient" with slightly different column combinations. This wastes storage and slows down writes.

### Issue 3: Overlapping RLS Policies
12 RLS policies on `notifications`, with 3 SELECT policies and 3 UPDATE policies that do the same thing. The `user_id` column-based policies may not work since `user_id` is often NULL.

### Issue 4: Direct INSERTs Bypassing Preference Check
`process_job_alerts()` inserts directly into `notifications`, bypassing `notify()` and `should_deliver_in_app()`. Job alert notifications are created even if the user has disabled job preferences. The `bell_notifications` view filters them at read time, but they accumulate in the DB.

### Issue 5: Duplicate Trigger Functions
- `trg_notify_on_request_update` and `trg_notify_request_status_change` both fire on the same event (UPDATE OF status when status changes) on `mentorship_requests`
- `trg_connections_notify` and `trg_notify_connection_request` both fire on INSERT to `connections`
- These may produce duplicate notifications

### Issue 6: Dead Code
- `useAdminNotifications()` hook — implemented but never imported
- `useAdminUnreadCount()` hook — implemented but never imported
- `subscribeAdminNotifications()` function — implemented but never called
- `admin_notifications` table — legacy, not consumed by current bell system
- 12+ orphaned notification functions not attached to any trigger

### Issue 7: Stale Enum
`notification_type_enum` is missing 11 types that exist in the CHECK constraint. The enum is used by `notification_events` but not by `notifications`.

### Issue 8: Schema Drift in job_alerts
22 columns including both legacy array fields (`job_titles`, `industries`, `locations`, `job_types`) and newer scalar fields (`job_type`, `location`, `experience_level`). The cron job uses scalar fields; arrays are vestigial.

### Issue 9: No Realtime for Preferences
`notification_preferences` is NOT in the realtime publication. When a user toggles a preference, the bell count doesn't update immediately — it waits for the next `refetchInterval` (30 seconds) or `staleTime` expiry (5 seconds).

### Issue 10: is_bell_visible Column Inconsistently Set
The `notifications` table has an `is_bell_visible` column with a dedicated index, but it's not consistently populated by all trigger functions. The `bell_notifications` view uses `is_bell_worthy()` function instead, making this column and its index unused.

### Issue 11: get_bell_unread_count vs get_unread_notification_count
Two functions do the same thing. The frontend calls `get_unread_notification_count`. `get_bell_unread_count` exists but is not called by the frontend.

### Issue 12: Realtime Rate Limit
The Supabase client is configured with `eventsPerSecond: 5`. If more than 5 notification changes happen in 1 second (e.g., mark-all-as-read updating hundreds of rows), some realtime events may be dropped. The forced refetch in `markOne` and `markAll` mitigates this.

---

## 6.11 Summary Statistics

| Metric | Value |
|---|---:|
| Notification-related tables | 8 |
| Notification-related views | 5 |
| Notification-related functions | 95 |
| Active notification triggers | 24 |
| Notification types (CHECK constraint) | 26 |
| Notification types (canonical frontend) | 25 |
| Notification types (actually produced) | 18 |
| RLS policies on notifications table | 12 |
| Indexes on notifications table | 28 |
| Enum types | 3 |
| Cron jobs | 2 |
| Frontend notification components | 7 |
| Frontend notification hooks | 4 (2 active, 2 dead code) |
| Frontend notification API functions | 12 |
| Total notifications in DB | 1,340 |
| Total unread | 811 |
| Total visible in bell | 1,340 |
| Total unread visible in bell | 689 |
| Admin-audience notifications | 59 |
