# AMET Alumni — Reverse Engineering: Part 5 — Frontend Architecture

**Source:** Frontend codebase (`frontend/src/`)
**Date:** 2026-09-07

---

## 5.1 Frontend File Map

### Core Notification Files

| File | Type | Purpose |
|---|---|---|
| `api/notifications.ts` | TypeScript | API layer — RPC calls, type definitions, link derivation |
| `api/notifications.js` | JavaScript | JS wrapper — re-exports from `.ts` file |
| `hooks/useNotifications.ts` | TypeScript | React Query hooks for user + admin notifications |
| `hooks/useNotifications.js` | JavaScript | Re-export: `export * from './useNotifications.ts'` |
| `hooks/useNotification.js` | JavaScript | Legacy toast notification hook (react-hot-toast) |
| `utils/notificationRealtime.ts` | TypeScript | Realtime subscription singleton |
| `components/Notifications/Bell.tsx` | TypeScript | Bell icon + badge + dropdown panel |
| `components/Notifications/NotificationsPanel.tsx` | TypeScript | Bell dropdown panel (list of recent notifications) |
| `components/Notifications/NotificationsPage.js` | JavaScript | Full notifications page (All/Unread/Read tabs) |
| `components/Notifications/NotificationItem.tsx` | TypeScript | Single notification row (icon, title, message, actions) |
| `components/Notifications/NotificationIcons.tsx` | TypeScript | Icon mapping by notification type |
| `pages/Settings/NotificationSettings.jsx` | JavaScript | User preference settings page |
| `components/common/NotificationCenter.js` | JavaScript | Toast notification provider (react-hot-toast wrapper) |
| `hooks/useGlobalBadges.js` | JavaScript | Global badge counts (unread messages + pending connections) |

### Files That Consume Notifications (indirectly)

| File | How It Uses Notifications |
|---|---|
| `components/Layout/Header.js` | Renders `<Bell />` component |
| `components/Jobs/JobAlerts.js` | Creates/edits/deletes job alerts via RPC |
| `App.js` | Route definitions include `/notifications` route |
| `components/Dashboard/AlumniDashboard.js` | May show notification summary |
| `components/Messages/ChatWindow.js` | Triggers message notifications via DM |
| `components/Events/EventDetail.js` | Triggers event notifications |
| `components/Groups/GroupDetail.js` | Triggers group notifications |
| `components/Groups/GroupsList.js` | Triggers group notifications |

---

## 5.2 API Layer (`api/notifications.ts`)

### Type Definitions

```typescript
export const CANONICAL_NOTIFICATION_TYPES = [
  'system', 'connection', 'message',
  'event', 'event_created', 'event_published', 'event_updated',
  'job', 'job_posted', 'job_approved', 'job_applied',
  'application', 'application_status',
  'mentorship',
  'group', 'group_join_request', 'group_membership_approved',
  'group_membership_rejected', 'group_admin_risk',
  'group_invite_received', 'group_invite_accepted',
  'group_approved', 'group_rejected', 'group_deleted',
  'alert',
] as const;

export type NotificationType = typeof CANONICAL_NOTIFICATION_TYPES[number];

export interface NotificationMetadata {
  audience?: 'user' | 'admin';
  severity?: 'critical' | 'warning' | 'info';
  entity_id?: string;
  entity_type?: 'job' | 'event' | 'mentorship' | 'connection' | 'application' | 'group' | 'profile';
  action_required?: boolean;
  relationship_id?: string;
  status?: string;
  original_type?: string;
  group_id?: string;
  tab?: string;
  mentor_user_id?: string;
  [key: string]: any;
}

export interface Notification {
  id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  metadata?: NotificationMetadata | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  sender_id?: string | null;
  event_id?: string | null;
}

export interface AdminNotification extends Notification {
  severity?: string;
  entity_type?: string;
  entity_id?: string;
  action_required?: boolean;
}

export type BellNotification = Notification; // alias
```

### Exported Functions

| Function | Signature | RPC Called | Purpose |
|---|---|---|---|
| `sanitizeNotificationLink(link)` | `(link?: string\|null) → string\|null` | none | Validates link is internal, safe, < 500 chars |
| `deriveNotificationLink(notification, userRole?)` | `(notification, userRole?) → string\|null` | none | Client-side link derivation (fallback for server-side) |
| `getNotificationLink(notification, userRole?)` | `(notification, userRole?) → string` | none | Gets sanitized link — returns `#` if none |
| `fetchNotifications(options)` | `(options) → Promise<Notification[]>` | `get_notifications_paginated` | Fetches paginated notifications |
| `markOneRead(id)` | `(id: string) → Promise<void>` | `mark_notification_read` | Marks one notification as read |
| `markOneUnread(id)` | `(id: string) → Promise<void>` | `mark_notification_unread` | Marks one notification as unread |
| `markAllRead()` | `() → Promise<void>` | `mark_all_notifications_read` | Marks all notifications as read |
| `getBellUnreadCount()` | `() → Promise<number>` | `get_unread_notification_count` | Gets unread count for bell badge |
| `subscribeMyNotifications(userId, onChange)` | `(userId, cb) → unsubscribe` | none | Realtime subscription helper |
| `fetchAdminNotifications(options)` | `(options) → Promise<AdminNotification[]>` | (direct view query) | Fetches admin notifications |
| `getAdminUnreadCount()` | `() → Promise<number>` | `get_admin_unread_count` | Gets admin unread count |
| `subscribeAdminNotifications(userId, onChange)` | `(userId, cb) → unsubscribe` | none | Admin realtime subscription |

### `fetchNotifications` Details

```typescript
export async function fetchNotifications(options: FetchNotificationsOptions = {}) {
  const { limit = 50, offset = 0, unreadOnly, readOnly } = options;
  
  // Get authenticated user
  const { data: auth } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Determine is_read filter
  let p_is_read: boolean | null = null;
  if (unreadOnly) p_is_read = false;
  if (readOnly) p_is_read = true;

  // Call RPC
  const { data, error } = await supabase.rpc('get_notifications_paginated', {
    p_limit: Math.min(limit, 50),
    p_offset: offset,
    p_is_read
  });

  if (error) throw error;
  return (data || []) as Notification[];
}
```

### `deriveNotificationLink` (client-side fallback)

Handles these types:
- `message` → `/messages?thread=<thread_id>` (or `/messages`)
- `group_*` → `/groups/<group_id>` or `/groups/<group_id>/manage`
- `mentorship` → `/mentorship?tab=...`
- `entity_type = 'job'` → `/jobs/<entity_id>`
- `entity_type = 'event'` → `/events/<entity_id>`
- `entity_type = 'application'` → `/applications/<entity_id>`
- `entity_type = 'connection'` → `/network`
- `entity_type = 'group'` → `/groups/<entity_id>`
- `entity_type = 'profile'` → `/profile/<entity_id>` (non-admin) or `/admin/users/<id>?tab=mentorship` (admin)

---

## 5.3 Hooks Layer (`hooks/useNotifications.ts`)

### `useNotifications(options)` — USER NOTIFICATIONS HOOK

**State:**
- `filterTab`: `'all' | 'unread' | 'read'` (default: `'all'`)
- `typeFilter`: `Set<string>` (in-memory type filter)
- `offset`: number (pagination offset)

**Queries:**
1. **Notifications list:** `useQuery(['notifications', userId, { offset, filterTab, ...options }])`
   - `queryFn`: `fetchNotifications({ limit: 50, offset, unreadOnly, readOnly })`
   - `staleTime`: 10 seconds
2. **Bell count (internal):** `useQuery(['bell-unread-count', userId])`
   - `queryFn`: `getBellUnreadCount()`
   - `staleTime`: 30 seconds (NOTE: this is a SEPARATE query from `useBellUnreadCount` — it's used internally for `unreadCount` in this hook)

**Realtime subscription:**
- Calls `subscribeToNotifications(userId, callback)`
- On any notification change: invalidates `['notifications', userId]` and `['bell-unread-count', userId]`

**Mutations:**

#### `markOne(id, toRead = true)`
1. **Optimistic update:** Updates all cached notification queries — sets `is_read` and `read_at` on the matching notification
2. **Optimistic bell count:** Updates `['bell-unread-count', userId]` cache by ±1
3. **RPC call:** `markOneRead(id)` or `markOneUnread(id)`
4. **On success:** Invalidates notification + bell count queries, force-refetches bell count
5. **On failure:** Rolls back all optimistic changes, logs error, re-throws

#### `markAll()`
1. **Optimistic bell count:** Sets `['bell-unread-count', userId]` to 0
2. **RPC call:** `markAllRead()`
3. **On success:** Invalidates + force-refetches bell count
4. **On failure:** Logs error, re-throws

#### `loadMore()`
- Increments `offset` by 12 (triggers refetch via query key change)
- NOTE: This is still exposed by the hook but no longer rendered in the UI after "Load more" removal

**Returns:**
```typescript
{
  items,           // BellNotification[] — filtered by typeFilter
  isLoading,       // boolean
  isFetching,      // boolean
  error,           // Error | null
  unreadCount,     // number — from bell count RPC, falls back to page-derived count
  filterTab,       // 'all' | 'unread' | 'read'
  setFilterTab,    // (tab) => void
  typeFilter,      // Set<string>
  toggleType,      // (type) => void
  loadMore,        // () => Promise<void>
  markOne,         // (id, toRead?) => Promise<void>
  markAll,         // () => Promise<void>
  notificationTypes, // string[]
  refetch,         // () => void
}
```

---

### `useBellUnreadCount()` — BELL BADGE HOOK

**Query:** `useQuery(['bell-unread-count', userId], getBellUnreadCount)`
- `staleTime`: 5 seconds
- `refetchOnWindowFocus`: true
- `refetchInterval`: 30 seconds (auto-refetch)

**Realtime:**
- Subscribes to `subscribeToNotifications(userId, callback)`
- On any notification change: invalidates + force-refetches `['bell-unread-count', userId]`

**Returns:** `{ count, isLoading, error, refetch }`

**Used by:**
- `Bell.tsx` — renders the bell badge with `count`
- `NotificationsPage.js` — renders "X unread" text with `count`

---

### `useAdminNotifications(options)` — ADMIN NOTIFICATIONS HOOK

**Status:** IMPLEMENTED BUT NEVER IMPORTED BY ANY COMPONENT (dead code)

**Logic:** Similar to `useNotifications` but:
- Only enabled for admin/super_admin roles
- Calls `fetchAdminNotifications()` instead of `fetchNotifications()`
- Uses `['admin-notifications', userId]` query key
- Has its own realtime subscription via `subscribeAdminNotifications()`
- 50-item cap on pagination

---

### `useAdminUnreadCount()` — ADMIN BELL BADGE HOOK

**Status:** IMPLEMENTED BUT NEVER IMPORTED BY ANY COMPONENT (dead code)

**Logic:** Similar to `useBellUnreadCount` but:
- Only enabled for admin/super_admin roles
- Calls `getAdminUnreadCount()` RPC
- Uses `['admin-unread-count', userId]` query key

---

## 5.4 Realtime Layer (`utils/notificationRealtime.ts`)

### Architecture: Singleton Pattern

```typescript
let channel: RealtimeChannel | null = null;
let currentUserId: string | null = null;
const listeners = new Set<Listener>();

function ensureChannel(userId: string) {
  if (channel && currentUserId === userId) return; // reuse existing
  cleanupChannel(); // clean up old channel
  currentUserId = userId;
  channel = supabase
    .channel(`notifications:${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'notifications',
      filter: `recipient_id=eq.${userId}`,
    }, (payload) => {
      listeners.forEach((cb) => cb(payload));
    })
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        cleanupChannel();
      }
    });
}

export function subscribeToNotifications(userId, cb) {
  listeners.add(cb);
  ensureChannel(userId);
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) cleanupChannel();
  };
}
```

**Key design decisions:**
1. **Singleton channel:** Only one realtime channel per user ID. Multiple hooks (useNotifications + useBellUnreadCount) share the same channel.
2. **Listener set:** Multiple callbacks can register on the same channel. When the last listener unsubscribes, the channel is cleaned up.
3. **Filter:** `recipient_id=eq.${userId}` — only receives changes for the current user's notifications.
4. **Error recovery:** On `CHANNEL_ERROR` or `TIMED_OUT`, the channel is cleaned up. The next `subscribeToNotifications` call will create a new channel.

**Who subscribes:**
- `useNotifications()` hook — invalidates notification list + bell count
- `useBellUnreadCount()` hook — invalidates + force-refetches bell count

**Result:** Both hooks share the same realtime channel. When a notification is inserted/updated/deleted, both hooks' callbacks fire, causing them to invalidate their respective queries.

---

## 5.5 Component Layer

### `Bell.tsx` — Bell Icon + Badge + Dropdown

**Location:** `components/Notifications/Bell.tsx`

**Props:** none

**Hooks used:**
- `useBellUnreadCount()` → `count`
- `useLocation()` → close panel on route change

**Behavior:**
1. Renders bell icon with unread count badge
2. Click toggles dropdown panel
3. Outside click closes panel
4. Route change closes panel
5. When count increases, shows a 2-second ping animation

**Renders:** `<NotificationsPanel onClose={...} />` when open

**Rendered by:** `components/Layout/Header.js` at line 134

---

### `NotificationsPanel.tsx` — Bell Dropdown

**Location:** `components/NotificationsPanel.tsx`

**Props:** `{ onClose: () => void }`

**Hooks used:**
- `useNotifications()` → `items, isLoading, error, markOne, markAll, refetch`

**Behavior:**
1. Shows "Notifications" header with "Mark all as read" button and close button
2. Loading state → spinner
3. Error state → error message + retry button
4. Empty state → "No notifications"
5. List state → renders `NotificationItem` for each notification
6. No "Load more" button (removed)
7. Shows up to 50 notifications (RPC limit)

**Renders:** `<NotificationItem n={n} onToggleRead={markOne} onNavigate={onClose} />` for each notification

---

### `NotificationsPage.js` — Full Notifications Page

**Location:** `components/Notifications/NotificationsPage.js`

**Props:** none (route component)

**Hooks used:**
- `useNotifications()` → `items, isLoading, isFetching, error, filterTab, setFilterTab, markOne, markAll, refetch`
- `useBellUnreadCount()` → `count` (for "X unread" display)
- `useAuth()` → `user, profile`
- `useAvatars()` → for connection request avatars
- Direct `supabase` queries for connection requests

**Behavior:**
1. **Connection Requests section:** Shows incoming + outgoing pending connection requests with Accept/Decline/Cancel buttons
2. **All Notifications section:**
   - Tab bar: All / Unread / Read
   - "Mark all as read" button
   - "X unread" count display
   - Notification list (up to 50 items)
   - No "Load more" button (removed)
3. Subscribes to `connections` table changes for real-time connection request updates
4. Does NOT subscribe to notification changes directly (handled by `useNotifications` hook)

**Renders:** `<NotificationItem n={notification} onToggleRead={markOne} />` for each notification

---

### `NotificationItem.tsx` — Single Notification Row

**Location:** `components/Notifications/NotificationItem.tsx`

**Props:** `{ n: Notification, onToggleRead?: (id, toRead?) => void, onNavigate?: () => void }`

**Hooks used:**
- `useNavigate()` → for routing on click
- `useAuth()` → `profile.role` for link derivation

**Behavior:**
1. Renders icon (from `iconForType`), type label, title, message, timestamp
2. Unread notifications have blue background and blue dot
3. Click on row:
   - If unread, calls `onToggleRead(n.id, true)` (marks as read)
   - Navigates to `safeLink` (derived from `getNotificationLink(n, userRole)`)
   - Calls `onNavigate()` (closes panel)
4. Checkmark button:
   - `stopPropagation()` — prevents row click
   - Calls `onToggleRead(n.id, !n.is_read)` — toggles read/unread
5. Keyboard accessible: Enter key triggers `open()`

**Link derivation:**
- Calls `getNotificationLink(n, userRole)` which:
  1. Tries `n.link` (from server, already sanitized)
  2. Falls back to `deriveNotificationLink(n, userRole)` (client-side)
  3. Returns `#` if no link available

---

### `NotificationIcons.tsx` — Icon Mapping

**Location:** `components/Notifications/NotificationIcons.tsx`

| Type(s) | Icon |
|---|---|
| `system` | `BellIcon` (or `UserIcon` if `metadata.original_type === 'profile'`) |
| `connection` | `UserGroupIcon` |
| `message` | `EnvelopeIcon` |
| `event`, `event_created`, `event_published`, `event_updated` | `CalendarIcon` |
| `job`, `job_posted`, `job_approved`, `job_applied` | `BriefcaseIcon` |
| `application`, `application_status` | `ClipboardDocumentCheckIcon` |
| `mentorship` | `AcademicCapIcon` |
| `group`, `group_join_request` | `UsersIcon` |
| `group_membership_approved` | `CheckCircleIcon` |
| `group_membership_rejected`, `group_admin_risk` | `ExclamationTriangleIcon` |
| `alert` | `ExclamationTriangleIcon` |
| default | `BellIcon` |

---

### `NotificationSettings.jsx` — Preferences Page

**Location:** `pages/Settings/NotificationSettings.jsx`

**Preference groups (6):**

| Group ID | Label | Types |
|---|---|---|
| `connections` | Connections & Networking | `connection`, `group`, `group_invite_received`, `group_invite_accepted`, `group_join_request`, `group_membership_approved`, `group_membership_rejected` |
| `messages` | Messages & Chat | `message` |
| `jobs` | Jobs & Applications | `job`, `job_posted`, `job_approved`, `job_applied`, `application`, `application_status` |
| `mentorship` | Mentorship | `mentorship` |
| `events` | Events | `event`, `event_created`, `event_published`, `event_updated` |
| `system_alerts` | System Alerts | `alert`, `system`, `group_admin_risk`, `group_approved`, `group_rejected`, `group_deleted` |

**Behavior:**
1. Loads preferences from `v_notification_prefs` view
2. Renders toggle switches for each group
3. On toggle, inserts/updates `notification_preferences` table directly via Supabase client
4. If no preference row exists, defaults to `true` (enabled)

---

### `NotificationCenter.js` — Toast System (SEPARATE FROM BELL)

**Location:** `components/common/NotificationCenter.js`

**Purpose:** Provides toast notifications via `react-hot-toast`. This is a COMPLETELY SEPARATE system from the bell/notification system.

**Functions:** `showSuccess(message)`, `showError(message)`, `showInfo(message)`

**Used by:** Various components for action feedback (e.g., "Profile saved", "Error uploading file")

---

### `useNotification.js` — Legacy Toast Hook

**Location:** `hooks/useNotification.js`

**Purpose:** Same as `NotificationCenter.js` — provides `showSuccess`, `showError`, `showInfo` via `react-hot-toast`. This is the hook version.

**Notable:** This has NOTHING to do with the bell notification system. The naming is confusing — `useNotification` (singular, toast) vs `useNotifications` (plural, bell).

---

### `useGlobalBadges.js` — Non-Notification Badges

**Location:** `hooks/useGlobalBadges.js`

**Purpose:** Tracks unread message count and pending connection requests count for badge display outside the notification bell.

**Returns:** `{ unreadMessages, pendingConnections, reload }`

**Notable:** This is a SEPARATE badge system from the notification bell. It tracks:
- Unread DM messages (via `fetchMyThreads()` API)
- Pending connection requests (via direct `connections` table count)

These badges appear on the Messages icon and Network icon in the header, NOT on the bell.

---

## 5.6 Query Key Map

| Query Key | Used By | Purpose |
|---|---|---|
| `['notifications', userId, { offset, filterTab, ...options }]` | `useNotifications()` | Notification list (paginated, filtered) |
| `['bell-unread-count', userId]` | `useBellUnreadCount()`, `useNotifications()` (internal) | Bell badge unread count |
| `['admin-notifications', userId, { offset, ...options }]` | `useAdminNotifications()` | Admin notification list (DEAD CODE) |
| `['admin-unread-count', userId]` | `useAdminUnreadCount()` | Admin bell badge count (DEAD CODE) |

**Invalidation points:**
- `markOne()` → invalidates `['notifications', userId]` + `['bell-unread-count', userId]` + force-refetches bell count
- `markAll()` → invalidates `['notifications', userId]` + `['bell-unread-count', userId]` + force-refetches bell count
- Realtime callback → invalidates `['notifications', userId]` + `['bell-unread-count', userId]` + force-refetches bell count

---

## 5.7 Supabase Client Configuration

```javascript
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 5  // Rate limit: 5 events per second
    },
  }
});

// Singleton guard against HMR/rehydration
if (window.__sb__) return window.__sb__;
window.__sb__ = client;
```

**Notable:**
- Singleton pattern prevents duplicate clients during React HMR
- Realtime rate limit of 5 events/second — if more than 5 notification changes happen in 1 second, some realtime events may be dropped
- Session persistence is enabled — user stays logged in across page refreshes
