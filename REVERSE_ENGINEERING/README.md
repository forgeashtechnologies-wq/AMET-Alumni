# AMET Alumni — Complete Reverse Engineering: Bell & Notification System

**Source:** Live production database (Supabase) + frontend codebase
**Date:** 2026-09-07
**Method:** Direct DB introspection via psql + source code analysis

---

## Document Index

This reverse-engineering document is split into 6 parts for readability:

| Part | File | Content | Lines |
|---|---|---|---:|
| **Part 1** | `Part1_Database_Schema.md` | All 8 tables, 24 columns, 11 constraints, 28 indexes, 3 enums, live data distribution | 332 |
| **Part 2** | `Part2_Database_Functions.md` | All 95 functions with signatures, categories, security, and complete inventory | 495 |
| **Part 3** | `Part3_Database_Triggers.md` | All 24 active triggers, trigger-to-type matrix, orphaned functions, non-notification triggers | 261 |
| **Part 4** | `Part4_Views_RLS_Realtime.md` | 5 views, RLS policies on all 8 tables, realtime publication, cron jobs, grants, dependency graph | 314 |
| **Part 5** | `Part5_Frontend_Architecture.md` | All 14 frontend files, 4 hooks, 12 API functions, 7 components, query keys, realtime singleton | 549 |
| **Part 6** | `Part6_Lifecycle_DataFlow.md` | 10-stage lifecycle, 6 data flow diagrams, role access matrix, complete type→trigger→view→bell matrix, 12 architectural issues | 491 |

---

## Quick Reference

### Database Objects

| Object Type | Count |
|---|---:|
| Tables | 8 |
| Views | 5 |
| Functions | 95 |
| Active triggers | 24 |
| RLS policies | 39 (across 8 tables) |
| Indexes | 28 (on notifications alone) |
| Enum types | 3 |
| Cron jobs | 2 |
| CHECK constraints | 3 (on notifications) |
| FK constraints | 6 (on notifications, 3 are duplicates) |

### Frontend Objects

| Object Type | Count |
|---|---:|
| Notification components | 7 |
| Notification hooks | 4 (2 active, 2 dead code) |
| API functions | 12 |
| Query keys | 4 (2 active, 2 dead code) |
| Realtime channels | 1 (singleton) |
| Type definitions | 4 interfaces, 1 type, 1 const array |

### Live Data

| Metric | Value |
|---|---:|
| Total notifications | 1,340 |
| Total unread | 811 |
| Unread visible in bell | 689 |
| Admin-audience notifications | 59 |
| Notification types in use | 18 of 26 allowed |
| Users with unread notifications | 236 |

---

## Key Findings

1. **The system is large and mostly functional** — 95 functions, 24 triggers, 8 tables, 5 views all work together to produce, filter, deliver, and display notifications across 5 user roles.

2. **Schema drift is significant** — duplicate FKs, overlapping indexes, overlapping RLS policies, stale enums, legacy columns, and dead code indicate multiple migration passes without cleanup.

3. **Two preference enforcement layers** — `should_deliver_in_app()` at insert time (via `notify()`) and `bell_notifications` view at read time. Direct inserts (e.g., `process_job_alerts()`) bypass the first layer.

4. **Admin bell is fully implemented but not wired** — `useAdminNotifications` and `useAdminUnreadCount` hooks exist but are never imported by any component. The admin bell view and RPC exist but are dead code in the frontend.

5. **Realtime works but has a rate limit** — 5 events/second. Mark-all-as-read on a user with hundreds of unread notifications may drop some realtime events, but forced refetch mitigates this.

6. **12+ orphaned functions** — notification functions that exist but are not attached to any trigger and not called by any code. These are likely from earlier implementations that were superseded.

7. **Duplicate trigger functions** — at least 2 pairs of triggers fire on the same event for the same table, potentially producing duplicate notifications (mentorship_requests and connections).

8. **The `is_bell_visible` column is vestigial** — it has an index but is not consistently populated and is not used by the `bell_notifications` view (which uses `is_bell_worthy()` function instead).
