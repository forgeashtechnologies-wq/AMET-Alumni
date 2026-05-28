# Notifications System Architecture

## Overview

The notification system provides real-time notifications to users with support for:
- User notifications (connections, events, jobs, mentorship, groups, etc.)
- Admin notifications (system alerts, moderation actions)
- Notification preferences (per-type enable/disable)
- Pagination and filtering

## Architecture

### Database Layer

#### Tables
- `notifications` - Main notifications table with RLS
- `notification_preferences` - Per-user, per-type preferences
- `admin_notifications` - Admin-specific notifications

#### Views
- `bell_notifications` - User notifications filtered by preferences with derived links
- `admin_bell_notifications` - Admin notifications filtered by role and preferences
- `v_notification_prefs` - User notification preferences view

#### Key RPCs (Security Definer)
- `get_notifications_paginated(p_limit, p_offset, p_is_read)` - Paginated notifications
- `get_unread_notification_count()` - Unread count respecting preferences
- `mark_notification_read(p_notification_id)` - Mark single as read (ownership enforced)
- `mark_notification_unread(p_notification_id)` - Mark single as unread (ownership enforced)
- `mark_all_notifications_read()` - Mark all as read for current user
- `get_admin_unread_count()` - Admin unread count (admin role required)
- `notify_validated(...)` - Create notification with type mapping and validation

#### Security
- All RPCs enforce `recipient_id = auth.uid()` ownership
- Insert restricted to `service_role` via triggers/functions
- Admin views/RPCs check role via `get_user_role()` function
- RLS policies enforce read/update only for own notifications

### Frontend Layer

#### Canonical Files (Use These)
- `api/notifications.ts` - TypeScript API with types and functions
- `hooks/useNotifications.ts` - React Query hooks for notifications
- `components/Notifications/Bell.tsx` or `Bell.jsx` - Bell dropdown component
- `components/Notifications/NotificationsPage.js` - Full notifications page
- `components/Notifications/NotificationsPanel.tsx` or `.jsx` - Panel for bell dropdown
- `components/Notifications/NotificationItem.tsx` or `.jsx` - Single notification item

#### Deprecated Files (Do Not Use)
- `components/Notifications/NotificationBell.js` - Uses legacy direct table access
- `components/Notifications.js` (in components root) - Uses wrong column names
- `api/notifications.js` - Superseded by `.ts` version
- `hooks/useNotifications.js` - Re-exports from `.ts`, marked deprecated

### Data Flow

```
User Action → Bell.tsx → useBellUnreadCount() → get_unread_notification_count RPC
                      → useNotifications() → get_notifications_paginated RPC
                                          → bell_notifications view
                                          → notifications table (RLS filtered)
```

### Notification Types

Canonical types (defined in `api/notifications.ts`):
- `system` - System announcements
- `connection` - Connection requests/accepts
- `message` - Direct messages
- `event`, `event_created`, `event_published`, `event_updated` - Event notifications
- `job`, `job_posted`, `job_approved`, `job_applied` - Job notifications
- `application`, `application_status` - Job application notifications
- `mentorship` - Mentorship requests/updates
- `group`, `group_join_request`, `group_membership_approved`, etc. - Group notifications
- `alert` - General alerts

Legacy types are automatically mapped via `map_legacy_notification_type()` function.

### Metadata Contract

Each notification type expects specific metadata keys:

| Type | Required Metadata |
|------|------------------|
| `group_*` | `group_id` |
| `mentorship` (accepted) | `relationship_id`, `status` |
| `job`, `event`, `application` | `entity_type`, `entity_id` |
| Admin notifications | `audience: 'admin'`, `severity` |

### Link Derivation

Links are derived in order of priority:
1. Explicit `link` field if set
2. `derive_notification_link()` function based on type and metadata
3. Frontend `getNotificationLink()` as final fallback
4. `#` as safe default

### Realtime Updates

Subscriptions use Supabase Realtime:
```typescript
subscribeMyNotifications(userId, onChange) // User notifications
subscribeAdminNotifications(userId, onChange) // Admin notifications
```

Both invalidate React Query cache on changes.

### Adding New Notification Types

1. Add type to `CANONICAL_NOTIFICATION_TYPES` in `api/notifications.ts`
2. Update `derive_notification_link()` in both TS and SQL if needed
3. Create trigger/function to generate notifications (use `notify_validated()`)
4. Add icon mapping in `NotificationIcons.tsx` if needed
5. Update `is_bell_worthy()` function if type needs special visibility rules

### Testing Checklist

- [ ] Notifications appear in bell dropdown
- [ ] Unread count updates in real-time
- [ ] Mark as read/unread works
- [ ] Mark all as read works
- [ ] Pagination loads more items
- [ ] Notification preferences are respected
- [ ] Links navigate correctly
- [ ] Admin notifications only visible to admins
- [ ] Legacy notification types display correctly
