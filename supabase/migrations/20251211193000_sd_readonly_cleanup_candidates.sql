-- Candidate cleanup of legacy read-only SECURITY DEFINER functions
-- Generated based on pg_stat_statements usage at the time of analysis.
--
-- IMPORTANT:
-- - These functions appear unused in recent query history but may still
--   be referenced by external tools, old dashboards, or ad-hoc SQL.
-- - Review references (grep in repo, Supabase RPC config, dashboards)
--   before running this migration in production.
--
-- Canonical, in-use functions (KEEP):
--   get_unread_notification_count()   -- bigint, used in bell counts
--   get_user_analytics()             -- jsonb, used for analytics
--
-- Legacy or overlapping variants (DROP CANDIDATES):

-- Unused unread-notifications counters (pluralized variants)
DROP FUNCTION IF EXISTS public.get_unread_notifications_count();
DROP FUNCTION IF EXISTS public.get_unread_notifications_count(uuid);

-- Unused unread-notifications-by-type variants
DROP FUNCTION IF EXISTS public.get_unread_notifications_count_by_type();
DROP FUNCTION IF EXISTS public.get_unread_notifications_count_by_type(text);

-- Old analytics implementation superseded by get_user_analytics()
DROP FUNCTION IF EXISTS public.get_user_analytics_old_109720();
