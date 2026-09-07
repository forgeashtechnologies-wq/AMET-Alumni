# AMET Alumni — Reverse Engineering: Part 3 — Database Triggers

**Source:** Live production database
**Date:** 2026-09-07
**Total notification-producing triggers attached to tables:** 24

---

## 3.1 Trigger-to-Table Map (24 active notification triggers)

| # | Table | Trigger Name | Events | Timing | Function | Notification Types Produced |
|---|---|---|---|---|---|---|
| 1 | `connections` | `trg_connections_notify` | INSERT | AFTER | `connections_notify()` | `connection` |
| 2 | `connections` | `trg_notify_connection_accepted` | UPDATE | AFTER | `create_connection_notification()` | `connection` |
| 3 | `connections` | `trg_notify_connection_approved` | UPDATE (when status changes) | AFTER | `notify_connection_approved()` | `connection` |
| 4 | `connections` | `trg_notify_connection_request` | INSERT | AFTER | `create_connection_notification()` | `connection` |
| 5 | `dm_messages` | `trg_dm_message_notify` | INSERT | AFTER | `notify_dm_participants()` | `message` |
| 6 | `event_attendees` | `event_attendee_cancel_notify_trg` | DELETE | AFTER | `trg_event_attendee_cancel_notify()` | `event` |
| 7 | `event_attendees` | `event_attendee_invite_or_rsvp_ins_trg` | INSERT | AFTER | `trg_event_attendee_invite_or_rsvp_notify()` | `event` |
| 8 | `event_attendees` | `event_attendee_invite_or_rsvp_upd_trg` | UPDATE | AFTER | `trg_event_attendee_invite_or_rsvp_notify()` | `event` |
| 9 | `event_feedback` | `event_feedback_notify_trg` | INSERT | AFTER | `trg_event_feedback_notify()` | `event` |
| 10 | `event_rsvps` | `trg_notify_event_rsvp` | INSERT | AFTER | `notify_event_rsvp()` | `event` |
| 11 | `events` | `event_owner_admin_notify_trg` | UPDATE, DELETE | AFTER | `trg_event_owner_admin_notify()` | `event`, `event_updated` |
| 12 | `events` | `events_update_broadcast_trg` | UPDATE | AFTER | `trg_events_update_broadcast()` | `event` |
| 13 | `events` | `trg_notify_admins_event` | INSERT | AFTER | `notify_admins_on_event()` | `event_created` |
| 14 | `group_members` | `group_admin_risk_notify_trg` | INSERT, UPDATE, DELETE | AFTER | `group_admin_risk_notify()` | `group_admin_risk` |
| 15 | `group_memberships` | `group_memberships_pending_notify` | INSERT | AFTER | `group_membership_notify_pending()` | `group_join_request` |
| 16 | `group_post_reports` | `trg_notify_admins_on_gpr` | INSERT | AFTER | `notify_admins_on_group_post_report()` | `group` |
| 17 | `job_applications` | `trg_job_applications_notifications` | INSERT, UPDATE OF status | AFTER | `trg_job_applications_notifications()` | `application_status`, `job`, `job_applied` |
| 18 | `jobs` | `trg_jobs_notifications` | INSERT, UPDATE OF approval_status | AFTER | `trg_jobs_notifications()` | `alert`, `job`, `job_approved`, `job_posted` |
| 19 | `mentors` | `trg_notify_admin_new_mentor` | INSERT, UPDATE | AFTER | `notify_admin_new_mentor_request()` | `alert` |
| 20 | `mentors` | `trg_notify_requests` | UPDATE OF status (when status='rejected') | AFTER | `notify_requests_on_rejection()` | `mentorship` |
| 21 | `mentorship_relationships` | `trg_mentorship_relationships_notifications` | INSERT, UPDATE OF status | AFTER | `trg_mentorship_relationships_notifications()` | `mentorship` |
| 22 | `mentorship_requests` | `trg_notify_mentorship_request` | INSERT | AFTER | `notify_mentorship_request()` | `mentorship` |
| 23 | `mentorship_requests` | `trg_notify_on_request_update` | UPDATE OF status (when status changes) | AFTER | `notify_on_request_update()` | `mentorship` |
| 24 | `mentorship_requests` | `trg_notify_request_status_change` | UPDATE OF status (when status changes) | AFTER | `notify_request_status_change()` | `mentorship` |

---

## 3.2 Trigger-to-Notification-Type Matrix

| Notification Type | Produced By (Table → Trigger) |
|---|---|
| `system` | `profiles → admin_update_profile_approval` (not in the 24 above — it's on `profiles` table) |
| `connection` | `connections → trg_connections_notify`, `trg_notify_connection_accepted`, `trg_notify_connection_approved`, `trg_notify_connection_request` |
| `message` | `dm_messages → trg_dm_message_notify` |
| `chat_message` | (via `notify_chat_message` — not currently attached to any table) |
| `event` | `events → events_update_broadcast_trg`, `event_attendees → 3 triggers`, `event_feedback → 1 trigger`, `event_rsvps → 1 trigger` |
| `event_created` | `events → trg_notify_admins_event` |
| `event_updated` | `events → event_owner_admin_notify_trg` |
| `event_published` | (via `notify_event_approved_broadcast` — attached to `events`) |
| `job` | `jobs → trg_jobs_notifications`, `job_applications → trg_job_applications_notifications`, `process_job_alerts()` cron |
| `job_posted` | `jobs → trg_jobs_notifications` |
| `job_approved` | `jobs → trg_jobs_notifications` |
| `job_applied` | `job_applications → trg_job_applications_notifications` |
| `application_status` | `job_applications → trg_job_applications_notifications` |
| `mentorship` | `mentorship_relationships → trg_mentorship_relationships_notifications`, `mentorship_requests → 3 triggers`, `mentors → trg_notify_requests` |
| `group` | `group_post_reports → trg_notify_admins_on_gpr` |
| `group_join_request` | `group_memberships → group_memberships_pending_notify` |
| `group_admin_risk` | `group_members → group_admin_risk_notify_trg` |
| `group_membership_approved` | (via `create_group_notification_once` — called by application code) |
| `group_membership_rejected` | (via `create_group_notification_once` — called by application code) |
| `group_invite_received` | (via `create_group_notification` — called by application code) |
| `group_invite_accepted` | (via `create_group_notification` — called by application code) |
| `group_approved` | (via `create_group_notification` — called by application code) |
| `group_rejected` | (via `create_group_notification` — called by application code) |
| `group_deleted` | (via `create_group_notification` — called by application code) |
| `alert` | `mentors → trg_notify_admin_new_mentor` |
| `application` | (not currently produced by any trigger — type exists in CHECK constraint but no trigger creates it) |
| `resume` | (not currently produced by any trigger — type exists in CHECK constraint but no trigger creates it) |

---

## 3.3 Detailed Trigger Analysis

### Connections (4 triggers)

| Trigger | Event | Condition | Recipient | Type | Metadata |
|---|---|---|---|---|---|
| `trg_connections_notify` | INSERT | none | `recipient_id` | `connection` | `entity_type=connection, entity_id=<connection.id>` |
| `trg_notify_connection_accepted` | UPDATE | none | `recipient_id` | `connection` | `entity_type=connection, entity_id=<connection.id>` |
| `trg_notify_connection_approved` | UPDATE | `old.status IS DISTINCT FROM new.status` | `recipient_id` | `connection` | `recipient_id, entity_type=connection` |
| `trg_notify_connection_request` | INSERT | none | `recipient_id` | `connection` | `entity_type=connection, entity_id=<connection.id>, recipient_id` |

**Notable:** `trg_connections_notify` and `trg_notify_connection_request` both fire on INSERT and both create `connection` notifications. This may cause duplicate notifications for connection requests. The `connections_notify()` function and `create_connection_notification()` function may have different logic (one may notify the recipient, the other may notify the requester).

---

### Events (3 triggers on `events` table + 4 on related tables)

| Trigger | Table | Event | Recipient | Type | Notes |
|---|---|---|---|---|---|
| `trg_notify_admins_event` | events | INSERT | All admins | `event_created` | Notifies admins when a new event is created |
| `event_owner_admin_notify_trg` | events | UPDATE, DELETE | Event owner + admins | `event`, `event_updated` | Notifies owner and admins on event changes. Creates `event_updated` type with `metadata.entity_type=event, entity_id=<event.id>`. Does NOT set `metadata.audience` (defaults to NULL → 'user'). |
| `events_update_broadcast_trg` | events | UPDATE | Event attendees | `event` | Broadcasts event updates to all attendees |
| `event_attendee_invite_or_rsvp_ins_trg` | event_attendees | INSERT | Event owner | `event` | Notifies owner when someone is invited or RSVPs |
| `event_attendee_invite_or_rsvp_upd_trg` | event_attendees | UPDATE | Event owner | `event` | Notifies owner on RSVP status change |
| `event_attendee_cancel_notify_trg` | event_attendees | DELETE | Event owner | `event` | Notifies owner when attendee cancels |
| `event_feedback_notify_trg` | event_feedback | INSERT | Event owner | `event` | Notifies owner when feedback is submitted |
| `trg_notify_event_rsvp` | event_rsvps | INSERT | Event owner | `event` | Notifies owner on new RSVP |

**Notable:** `event_owner_admin_notify_trg` fires on both UPDATE and DELETE. On UPDATE, it creates `event_updated` notifications. This was the trigger that produced 327 `event_updated` notifications that were previously hidden because `event_updated` was missing from `is_bell_worthy()`'s general types array (now fixed).

---

### Jobs (1 trigger)

| Trigger | Event | Condition | Recipient | Types |
|---|---|---|---|---|
| `trg_jobs_notifications` | INSERT, UPDATE OF approval_status | none | Job creator/owner | `alert`, `job`, `job_approved`, `job_posted` |

**Logic:** Based on the `approval_status` transition:
- New job created → `job_posted` notification to job owner
- Job approved → `job_approved` notification to job owner
- Job rejected → `alert` notification to job owner
- Other changes → `job` notification to job owner

**Metadata:** `entity_id = new.id, entity_type = 'job'`

---

### Job Applications (1 trigger)

| Trigger | Event | Condition | Recipient | Types |
|---|---|---|---|---|
| `trg_job_applications_notifications` | INSERT, UPDATE OF status | none | Job applicant + job owner | `application_status`, `job`, `job_applied` |

**Logic:**
- New application submitted → `job_applied` notification to job owner
- Application status changed → `application_status` notification to applicant
- Other changes → `job` notification

**Metadata:** `entity_id = new.job_id, entity_type = 'job'`

---

### Direct Messages (1 trigger)

| Trigger | Event | Recipient | Type | Notes |
|---|---|---|---|---|
| `trg_dm_message_notify` | INSERT | All thread participants except sender | `message` | Uses `notify()` to create notification. Sets `link = '/messages?tab=chats'` and `metadata.thread_id = <thread_id>`. |

---

### Groups (2 triggers)

| Trigger | Table | Event | Recipient | Type |
|---|---|---|---|---|
| `group_admin_risk_notify_trg` | group_members | INSERT, UPDATE, DELETE | Group admins | `group_admin_risk` |
| `group_memberships_pending_notify` | group_memberships | INSERT | Group admins | `group_join_request` |

**Additional group notifications** are created via direct calls to `create_group_notification()` and `create_group_notification_once()` from application code (not triggers). These produce: `group_membership_approved`, `group_membership_rejected`, `group_invite_received`, `group_invite_accepted`, `group_approved`, `group_rejected`, `group_deleted`.

---

### Mentorship (5 triggers)

| Trigger | Table | Event | Condition | Type |
|---|---|---|---|---|
| `trg_mentorship_relationships_notifications` | mentorship_relationships | INSERT, UPDATE OF status | none | `mentorship` |
| `trg_notify_mentorship_request` | mentorship_requests | INSERT | none | `mentorship` |
| `trg_notify_on_request_update` | mentorship_requests | UPDATE OF status | `old.status IS DISTINCT FROM new.status` | `mentorship` |
| `trg_notify_request_status_change` | mentorship_requests | UPDATE OF status | `old.status IS DISTINCT FROM new.status` | `mentorship` |
| `trg_notify_requests` | mentors | UPDATE OF status | `new.status = 'rejected' AND old.status IS DISTINCT FROM 'rejected'` | `mentorship` |

**Notable:** `trg_notify_on_request_update` and `trg_notify_request_status_change` both fire on the same event (UPDATE OF status when status changes). This may produce duplicate mentorship notifications.

---

### Profiles (1 trigger — not in the 24 above)

| Trigger | Event | Condition | Recipient | Type |
|---|---|---|---|---|
| (on `profiles` table) | UPDATE | `old.approval_status IS DISTINCT FROM 'approved' AND new.approval_status = 'approved'` | Profile owner | `system` |

**Function:** `admin_update_profile_approval()` — creates a "Profile approved" system notification when an admin approves a user's profile.

---

### Notifications table itself (3 triggers)

| Trigger | Event | Timing | Function | Purpose |
|---|---|---|---|---|
| `notifications_audit_insert` | INSERT | AFTER | `fn_notifications_audit_insert()` | Creates audit row in `notification_audit` when type is `mentorship` or `job_applied` |
| `trg_notifications_ensure_recipient` | INSERT | BEFORE | `notifications_ensure_recipient()` | Validates that recipient_id is not null |
| `trg_notifications_timestamps` | INSERT, UPDATE | BEFORE | `set_timestamps()` | Auto-updates `updated_at` field |

---

## 3.4 Orphaned / Unattached Notification Functions

These functions exist in the DB but are NOT attached to any table trigger. They may be called by Edge Functions, application code, or may be dead code:

| Function | Likely Status |
|---|---|
| `notify_new_connection_request` | Dead code — superseded by `create_connection_notification` |
| `notify_new_message` | Dead code — superseded by `notify_dm_participants` |
| `notify_chat_message` | Dead code — superseded by `notify_dm_participants` |
| `notify_on_job_application` | Dead code — superseded by `trg_job_applications_notifications` |
| `notify_job_application` | Dead code — duplicate |
| `notify_job_application_submitted` | Dead code — duplicate |
| `notify_job_applied` | Dead code — duplicate |
| `notify_event` | Possibly called by Edge Function |
| `notify_interview_invite` | Possibly called by application code |
| `notify_profile_verification` | Possibly called by scheduled job or Edge Function |
| `notify_user` | Generic helper — called by application code |
| `notify_validated` | Possibly called by application code |
| `create_notification` (3 overloads) | Legacy — superseded by `notify()` |

---

## 3.5 All Other Triggers on Notification-Related Tables (non-notification)

These triggers exist on the same tables but do NOT produce notifications:

| Table | Trigger | Purpose |
|---|---|---|
| `connections` | `connections_ensure_thread_for_connection` | Creates DM thread when connection is accepted |
| `connections` | `connections_version_increment` | Version tracking |
| `connections` | `handle_updated_at_connections` | Auto-update `updated_at` |
| `connections` | `set_connections_timestamps` | Auto-set timestamps |
| `connections` | `set_connections_updated_at` | Auto-update `updated_at` (duplicate) |
| `connections` | `trg_activity_log_connections` | Activity log |
| `connections` | `trg_connection_change` | Log connection changes |
| `connections` | `trg_connections_enforce_status_transitions` | Enforce valid status transitions |
| `connections` | `trg_connections_enforce_transitions` | Same (duplicate) |
| `connections` | `trg_connections_fill_defaults` | Fill default values |
| `connections` | `trg_connections_prevent_new_if_blocked` | Prevent connections between blocked users |
| `connections` | `trg_connections_to_dm_thread` | Create DM thread on acceptance |
| `connections` | `trg_connections_to_thread` | Same (duplicate) |
| `connections` | `trg_connections_updated_at` | Auto-update `updated_at` (duplicate) |
| `dm_messages` | `trg_bump_last_message` | Update conversation's last message |
| `dm_messages` | `trg_touch_thread_after_message` | Touch thread timestamp |
| `dm_threads` | `trg_dm_threads_insert_participants` | Insert participants on thread creation |
| `events` | `handle_updated_at_events` | Auto-update `updated_at` |
| `events` | `trg_activity_log_events` | Activity log |
| `events` | `trg_enforce_event_admin_only_fields` | Enforce admin-only field access |
| `events` | `trg_events_set_owner` | Set event owner |
| `events` | `trg_events_updated_at` | Auto-update `updated_at` |
| `events` | `trg_sync_event_is_approved` | Sync approval status |
| `events` | `update_events_updated_at` | Auto-update `updated_at` (duplicate) |
| `groups` | `on_groups_update` | Auto-update `updated_at` |
| `groups` | `set_group_creator_as_admin` | Set creator as admin |
| `groups` | `trg_activity_log_groups` | Activity log |
| `groups` | `trg_groups_guard_moderation` | Guard moderation columns |
| `groups` | `trg_groups_set_created_by` | Set created_by |
| `groups` | `trg_groups_set_name_norm` | Normalize name |
| `groups` | `trg_groups_stamp_approval` | Stamp approval |
| `groups` | `trg_groups_sync_visibility` | Sync visibility |
| `job_alerts` | `trg_job_alerts_set_updated_at` | Auto-update `updated_at` |
| `job_alerts` | `trg_job_alerts_set_user_id` | Set user_id from auth.uid() |
| `job_alerts` | `update_job_alerts_updated_at` | Auto-update `updated_at` (duplicate) |
| `job_applications` | `ja_fill_resume_path` | Fill resume path |
| `job_applications` | `job_applications_version_increment` | Version tracking |
| `job_applications` | `trg_activity_log_job_applications` | Activity log |
| `job_applications` | `trg_block_quick_link_apps` | Block quick-link applications |
| `job_applications` | `trg_job_apps_updated_at` | Auto-update `updated_at` |
| `job_applications` | `trg_set_job_owner` | Set job owner |
| `jobs` | (10+ triggers) | Various validation, defaults, activity logging |
| `mentorship_requests` | (various) | Validation, timestamps |
| `profiles` | (various) | Validation, timestamps, approval handling |
