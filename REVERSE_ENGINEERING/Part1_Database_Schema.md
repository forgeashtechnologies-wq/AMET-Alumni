# AMET Alumni — Reverse Engineering: Part 1 — Database Schema

**Source:** Live production database (Supabase pooler)
**Date:** 2026-09-07
**Method:** Direct introspection of live DB via `psql`

---

## 1.1 Notification-Related Tables (8 total)

| Table | Columns | Purpose |
|---|---:|---|
| `notifications` | 24 | Main notification store — every notification ever created |
| `notification_preferences` | 9 | Per-user per-type preference toggles (in_app, email, push) |
| `notification_events` | 10 | Event-sourcing table for notification generation (mentorship v1) |
| `notification_audit` | 6 | Audit trail for specific notification types (mentorship, job_applied) |
| `notification_audit_log` | 9 | Delivery audit log (recipient, type, sent_via, success, error) |
| `admin_notifications` | 9 | Legacy admin notification table (separate from `notifications`) |
| `system_alerts` | 9 | System-wide alert table (admin-managed) |
| `job_alerts` | 22 | User job alert subscriptions (keywords, location, salary, frequency) |

---

## 1.2 `notifications` Table — Full Schema (24 columns)

| Column | Data Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `title` | text | YES | | Notification title (max 200 chars enforced by `notify()`) |
| `message` | text | NO | | Notification body (max 1000 chars enforced by `notify()`) |
| `link` | text | YES | | Internal routing link (validated by 2 CHECK constraints) |
| `is_read` | boolean | YES | `false` | Read status |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |
| `updated_at` | timestamptz | YES | `now()` | Last update timestamp (auto-updated by trigger) |
| `type` | text | NO | `'system'` | Notification type (validated by CHECK constraint) |
| `recipient_id` | uuid | NO | | Recipient user (FK to `profiles.id`, ON DELETE CASCADE) |
| `sender_id` | uuid | YES | | Sender user (FK to `profiles.id`, ON DELETE SET NULL) |
| `event_id` | uuid | YES | | Related event (FK to `events.id`, ON DELETE SET NULL) |
| `profile_id` | uuid | YES | | Related profile (FK to `profiles.id`, ON DELETE CASCADE) |
| `read_at` | timestamptz | YES | | When the notification was marked read |
| `user_id` | uuid | YES | | Legacy/alternate user reference (used by some RLS policies) |
| `metadata` | jsonb | NO | `'{}'` | Structured metadata (entity_type, entity_id, audience, severity, etc.) |
| `body` | text | YES | | Alternate body field (unused by frontend) |
| `module` | `notification_module` enum | NO | `'system'` | Module classification |
| `type_enum` | `notification_type_enum` | YES | | Alternate typed classification (nullable) |
| `idempotency_key` | text | YES | | Deduplication key (UNIQUE index) |
| `audience` | `notification_audience_enum` | YES | `'user'` | Audience classification (`user` or `admin`) |
| `tenant_id` | uuid | YES | | Multi-tenant support (nullable, unused in practice) |
| `is_bell_visible` | boolean | YES | | Pre-computed bell visibility flag (indexed but not always set) |
| `group_id` | uuid | YES | | Related group (used for group membership dedup) |
| `subject_user_id` | uuid | YES | | The user who is the subject of the notification |

---

## 1.3 `notifications` Table — Constraints (11)

| Constraint | Type | Definition |
|---|---|---|
| `notifications_pkey` | PRIMARY KEY | `(id)` |
| `chk_notifications_type` | CHECK | `type IN ('system','connection','message','event','event_created','event_published','event_updated','job','job_posted','job_approved','job_applied','application','application_status','mentorship','group','group_join_request','group_membership_approved','group_membership_rejected','group_admin_risk','group_invite_received','group_invite_accepted','group_approved','group_rejected','group_deleted','resume','alert')` |
| `chk_notifications_link_format` | CHECK | `link IS NULL OR link ~ '^/[A-Za-z0-9_./?&=%:-]*$'` |
| `notifications_link_internal_only` | CHECK | `link IS NULL OR (link ~ '^/[^/].*$' AND link NOT LIKE '% %' AND length(link) <= 500)` |
| `fk_notification_recipient` | FOREIGN KEY | `recipient_id → profiles(id) ON DELETE CASCADE` |
| `fk_notification_sender` | FOREIGN KEY | `sender_id → profiles(id) ON DELETE SET NULL` |
| `fk_notifications_recipient` | FOREIGN KEY | `recipient_id → profiles(id) ON DELETE CASCADE` (duplicate) |
| `fk_notifications_sender` | FOREIGN KEY | `sender_id → profiles(id) ON DELETE SET NULL` (duplicate) |
| `fk_notification_event` | FOREIGN KEY | `event_id → events(id) ON DELETE SET NULL` |
| `notifications_profile_id_fkey` | FOREIGN KEY | `profile_id → profiles(id) ON DELETE CASCADE` |
| `notifications_recipient_fk` | FOREIGN KEY | `recipient_id → profiles(id) ON DELETE CASCADE` (duplicate) |

**Notable:** There are 3 duplicate FK constraints on `recipient_id` (from different migration runs). They are functionally identical and harmless but indicate schema drift.

---

## 1.4 `notifications` Table — Indexes (28)

| Index | Type | Purpose |
|---|---|---|
| `notifications_pkey` | UNIQUE btree | Primary key |
| `idx_notifications_idempotency` | UNIQUE btree | Dedup by `idempotency_key` |
| `idx_notifications_idempotency_key` | UNIQUE btree | Dedup by `idempotency_key` WHERE NOT NULL (partial duplicate) |
| `notifications_unique_membership_approved` | UNIQUE btree | Dedup for group membership approved (`profile_id, type, group_id`) |
| `idx_notifications_recipient_id` | btree | Lookup by recipient |
| `idx_notifications_recipient_created_at` | btree | Recipient + time ordering |
| `idx_notifications_recipient_unread` | btree | Recipient + unread (partial: `is_read = false`) |
| `idx_notifications_unread` | btree | Recipient + is_read (partial: `is_read = false`) |
| `idx_notifications_unread_per_user` | btree | Recipient + type (partial: `is_read = false`) |
| `idx_notifications_recipient_unread_bell` | btree | Recipient + is_read + time (partial: `is_read = false`) |
| `idx_notifications_inbox` | btree | Recipient + is_read + time |
| `notifications_recipient_isread_idx` | btree | Recipient + is_read |
| `notifications_is_read_idx` | btree | is_read only |
| `idx_notifications_user_audience` | btree | Recipient + type + time (partial: `audience = 'user' AND is_read = false`) |
| `idx_notifications_admin_audience` | btree | Recipient + time (partial: `audience = 'admin' AND is_read = false`) |
| `idx_notifications_bell_visible` | btree | Recipient + is_bell_visible + time (partial: `is_bell_visible = true`) |
| `idx_notifications_recipient_module_created` | btree | Recipient + module + time |
| `idx_notifications_module_type` | btree | module + type |
| `idx_notifications_type` | btree | type only |
| `idx_notifications_type_created_at` | btree | type + time |
| `idx_notifications_metadata_gin` | GIN | JSONB metadata search |
| `idx_notifications_event_id` | btree | event_id lookup |
| `idx_notifications_profile_id` | btree | profile_id lookup |
| `idx_notifications_sender_id` | btree | sender_id lookup |
| `idx_notifications_user_id` | btree | user_id lookup |
| `idx_notifications_user_read` | btree | user_id + read_at |
| `idx_notifications_tenant` | btree | tenant_id (partial: NOT NULL) |
| `notifications_created_at_idx` | btree | created_at only |

**Notable:** 28 indexes is heavy. There are overlapping indexes (e.g., 4+ partial indexes for "unread by recipient" with slightly different column combinations). This indicates multiple migration passes added indexes without cleaning up prior ones. The `idx_notifications_bell_visible` index exists but `is_bell_visible` is often NULL (not consistently populated), making it less useful than `bell_notifications` view filtering.

---

## 1.5 `notification_preferences` Table — Full Schema (9 columns)

| Column | Data Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | YES | | User whose preference this is |
| `notification_type` | text | NO | | Notification type this preference applies to |
| `email_enabled` | boolean | YES | `true` | Email delivery toggle |
| `push_enabled` | boolean | YES | `true` | Push delivery toggle |
| `in_app_enabled` | boolean | YES | `true` | In-app/bell delivery toggle |
| `created_at` | timestamptz | YES | `now()` | |
| `updated_at` | timestamptz | YES | `now()` | |
| `tenant_id` | uuid | YES | | Multi-tenant (unused) |

**How it's used:**
- `should_deliver_in_app(user_id, type)` checks this table BEFORE inserting a notification via `notify()`
- `bell_notifications` view LEFT JOINs this table and filters `COALESCE(p.in_app_enabled, true) = true`
- If no preference row exists, defaults to `true` (allow all)
- Frontend `NotificationSettings.jsx` writes to this table via direct Supabase client inserts/updates

---

## 1.6 `notification_events` Table — Full Schema (10 columns)

| Column | Data Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `event_type` | `notification_type_enum` | NO | | Type of event |
| `module` | `notification_module` | NO | | Module classification |
| `actor_profile_id` | uuid | NO | | Who triggered the event |
| `entity_table` | text | NO | | Table the event relates to |
| `entity_id` | uuid | NO | | Entity ID in that table |
| `metadata` | jsonb | NO | `'{}'` | Event metadata |
| `idempotency_key` | text | YES | | Dedup key |
| `created_at` | timestamptz | NO | `now()` | |
| `processed_at` | timestamptz | YES | | When the event was processed |

**How it's used:** This is an event-sourcing table for the mentorship notification pipeline. `trg_process_notification_event_mentorship` fires on INSERT to this table and calls `process_notification_event_mentorship_v1(event_id)` which generates the actual notification(s).

---

## 1.7 `notification_audit` Table — Full Schema (6 columns)

| Column | Data Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `notification_id` | uuid | NO | | Related notification |
| `created_by` | uuid | YES | | Who created the audit entry |
| `created_at` | timestamptz | NO | `now()` | |
| `event_type` | text | NO | | Audit event type |
| `metadata` | jsonb | NO | `'{}'` | Audit metadata |

**How it's used:** The `notifications_audit_insert` trigger fires AFTER INSERT on `notifications` when `type IN ('mentorship', 'job_applied')` and inserts a row here.

---

## 1.8 `notification_audit_log` Table — Full Schema (9 columns)

| Column | Data Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `notification_id` | uuid | YES | | Related notification |
| `recipient_id` | uuid | NO | | Recipient |
| `notification_type` | text | NO | | Type |
| `sent_via` | array | YES | | Delivery channels (e.g., `['in_app', 'email']`) |
| `success` | boolean | NO | `true` | Delivery success |
| `error_message` | text | YES | | Error if failed |
| `metadata` | jsonb | YES | `'{}'` | |
| `created_at` | timestamptz | NO | `now()` | |

**How it's used:** Delivery audit trail. Admin-only RLS. Used for debugging notification delivery failures.

---

## 1.9 `admin_notifications` Table — Full Schema (9 columns)

| Column | Data Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `created_at` | timestamptz | NO | `now()` | |
| `notification_type` | text | NO | `'event_created'` | Type |
| `entity_type` | text | NO | | Entity type (job, event, etc.) |
| `entity_id` | uuid | YES | | Entity ID |
| `message` | text | YES | | Message |
| `created_by` | uuid | YES | | Creator |
| `is_read` | boolean | NO | `false` | Read status |
| `tenant_id` | uuid | YES | | Multi-tenant |

**How it's used:** This is a LEGACY table that predates the `notifications` table's `audience = 'admin'` mechanism. It is NOT consumed by the current bell system. The `admin_bell_notifications` VIEW reads from `notifications` (not this table). This table has its own RLS policies (admin-only) but is effectively dead code.

---

## 1.10 `system_alerts` Table — Full Schema (9 columns)

| Column | Data Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `alert_type` | text | NO | | Alert type |
| `title` | text | NO | | Alert title |
| `message` | text | NO | | Alert message |
| `is_resolved` | boolean | YES | `false` | Resolution status |
| `resolved_by` | uuid | YES | | Who resolved it |
| `resolved_at` | timestamptz | YES | | When resolved |
| `metadata` | jsonb | YES | `'{}'` | |
| `created_at` | timestamptz | YES | `now()` | |

**How it's used:** Admin-managed system alerts. RLS is admin-only (`is_site_admin()`). Not directly connected to the notification bell system.

---

## 1.11 `job_alerts` Table — Full Schema (22 columns)

| Column | Data Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `user_id` | uuid | NO | | Owner |
| `alert_name` | text | NO | | User-given name |
| `job_titles` | array | YES | | Job titles to match (legacy) |
| `industries` | array | YES | | Industries to match (legacy) |
| `locations` | array | YES | | Locations to match (legacy) |
| `job_types` | array | YES | | Job types to match (legacy) |
| `min_salary` | integer | YES | | Minimum salary |
| `keywords` | array | YES | | Keywords to match in title/description |
| `frequency` | text | NO | | `daily`, `weekly`, `biweekly`, `monthly` |
| `is_active` | boolean | NO | `true` | Active toggle |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | YES | `now()` | |
| `job_type` | text | YES | | Single job type (newer field) |
| `location` | text | YES | | Single location (newer field) |
| `max_salary` | integer | YES | | Maximum salary |
| `experience_level` | text | YES | | Experience level |
| `desired_roles` | array | YES | | Desired roles (unused by cron) |
| `desired_industries` | array | YES | | Desired industries (unused by cron) |
| `alert_frequency` | text | YES | | Alternate frequency field (unused by cron) |
| `name` | text | YES | | Alternate name field (unused by cron) |
| `last_sent_at` | timestamptz | YES | | Last time `process_job_alerts` sent matches |

**How it's used:**
- `process_job_alerts()` (hourly cron) iterates active alerts, finds matching jobs created since `last_sent_at`, inserts `type='job'` notifications, and updates `last_sent_at`
- Frontend `JobAlerts.js` component creates/edits/deletes alerts via `create_job_alert()` and `update_job_alert()` RPCs
- RLS: user can CRUD their own alerts; admins can view/delete all

**Schema drift note:** The table has both legacy array fields (`job_titles`, `industries`, `locations`, `job_types`) and newer scalar fields (`job_type`, `location`, `experience_level`). The cron job uses the scalar fields, not the arrays. The arrays are vestigial from an earlier schema.

---

## 1.12 ENUM Types (3)

### `notification_audience_enum`
| Value | Usage |
|---|---|
| `user` | Default audience — visible in user bell |
| `admin` | Admin audience — visible only in admin bell |

### `notification_module`
| Value | Usage |
|---|---|
| `jobs` | Job-related notifications |
| `events` | Event-related notifications |
| `mentorship` | Mentorship-related notifications |
| `groups` | Group-related notifications |
| `dm` | Direct message notifications |
| `system` | System notifications (default) |

### `notification_type_enum`
| Values (23) |
|---|
| `system`, `event`, `message`, `connection`, `job`, `job_delete_request`, `group`, `group_join_request`, `group_membership_approved`, `group_membership_rejected`, `group_admin_risk`, `group_invite_received`, `group_invite_accepted`, `group_approved`, `group_rejected`, `group_deleted` |

**Notable:** This enum is used by `notification_events.event_type` but NOT by `notifications.type` (which uses a text column with a CHECK constraint). The enum is missing several types that exist in the CHECK constraint (`event_created`, `event_published`, `event_updated`, `job_posted`, `job_approved`, `job_applied`, `application`, `application_status`, `mentorship`, `resume`, `alert`). This indicates the enum is stale and the system migrated to text+CHECK for flexibility.

---

## 1.13 Live Data Distribution

### By Module
| Module | Count |
|---|---:|
| `system` | 943 |
| `events` | 205 |
| `jobs` | 153 |
| `mentorship` | 39 |

### By Audience (metadata->>'audience')
| Audience | Count |
|---|---:|
| NULL (defaults to 'user') | 899 |
| `user` | 382 |
| `admin` | 59 |

### By Type (top 18)
| Type | Total | Unread |
|---|---:|---:|
| `event_updated` | 327 | 180 |
| `system` | 266 | 236 |
| `event` | 156 | 73 |
| `event_created` | 143 | 76 |
| `job_posted` | 60 | 44 |
| `message` | 60 | 40 |
| `alert` | 59 | 26 |
| `connection` | 50 | 35 |
| `group` | 43 | 17 |
| `job_approved` | 40 | 26 |
| `mentorship` | 39 | 15 |
| `job_applied` | 38 | 20 |
| `group_admin_risk` | 36 | 11 |
| `job` | 10 | 9 |
| `application_status` | 5 | 3 |
| `group_join_request` | 4 | 0 |
| `group_invite_received` | 3 | 0 |
| `group_membership_approved` | 1 | 0 |

### Totals
| Metric | Value |
|---|---:|
| Total notifications in DB | 1,340 |
| Total unread | 811 |
| Total visible in bell (after fixes) | 1,340 |
| Total unread visible in bell | 689 |
| Admin-audience notifications | 59 |
| Admin-audience unread | 26 |
