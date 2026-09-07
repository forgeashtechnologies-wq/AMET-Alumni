-- ============================================================================
-- RCA: Bell Icon Numbers Not Changing
-- ============================================================================
-- Run this in the Supabase SQL Editor to diagnose why the bell badge count
-- isn't updating. Each query checks one link in the chain.
-- ============================================================================

-- ============================================================================
-- CHECK 1: Is the `notifications` table in the Supabase Realtime publication?
-- ============================================================================
-- If the table is NOT in the publication, realtime subscriptions will subscribe
-- but never receive any events. The bell count will only update via polling
-- (every 60 seconds) or window focus — never in realtime.
--
-- EXPECTED: Should include 'notifications'
-- IF MISSING: Run the fix at the bottom of this file.

SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
ORDER BY tablename;

-- ============================================================================
-- CHECK 2: What does the live get_unread_notification_count RPC look like?
-- ============================================================================
-- Check if it's SECURITY DEFINER (bypasses RLS) or SECURITY INVOKER (subject to RLS)
-- and which column it uses for the count.

SELECT 
    p.proname AS function_name,
    p.secdef AS is_security_definer,
    pg_get_functiondef(p.oid) AS function_body
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'get_unread_notification_count';

-- ============================================================================
-- CHECK 3: What does the live get_notifications_paginated RPC look like?
-- ============================================================================

SELECT 
    p.proname AS function_name,
    p.secdef AS is_security_definer,
    pg_get_functiondef(p.oid) AS function_body
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'get_notifications_paginated';

-- ============================================================================
-- CHECK 4: Are there notifications with recipient_id IS NULL?
-- ============================================================================
-- If some notifications have user_id set but recipient_id IS NULL,
-- the RPC (which likely counts WHERE recipient_id = auth.uid()) will miss them.

SELECT 
    count(*) AS total_notifications,
    count(*) FILTER (WHERE recipient_id IS NOT NULL) AS with_recipient_id,
    count(*) FILTER (WHERE recipient_id IS NULL) AS without_recipient_id,
    count(*) FILTER (WHERE user_id IS NOT NULL) AS with_user_id,
    count(*) FILTER (WHERE user_id IS NOT NULL AND recipient_id IS NULL) AS user_id_only
FROM notifications;

-- ============================================================================
-- CHECK 5: Are there unread notifications for a specific user?
-- ============================================================================
-- Replace 'USER_UUID_HERE' with a real user ID to check if they have
-- unread notifications that should show in the bell.

SELECT 
    count(*) AS total_unread,
    count(*) FILTER (WHERE recipient_id IS NOT NULL) AS unread_with_recipient_id,
    count(*) FILTER (WHERE recipient_id IS NULL AND user_id IS NOT NULL) AS unread_with_user_id_only
FROM notifications 
WHERE is_read = false;
-- To check for a specific user, add:
-- AND (recipient_id = 'USER_UUID_HERE' OR user_id = 'USER_UUID_HERE');

-- ============================================================================
-- CHECK 6: What RLS policies exist on the notifications table?
-- ============================================================================

SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'notifications' 
  AND schemaname = 'public';

-- ============================================================================
-- CHECK 7: Does the bell_notifications view use recipient_id or user_id?
-- ============================================================================

SELECT 
    pg_get_viewdef('public.bell_notifications'::regclass, true) AS view_definition;

-- ============================================================================
-- CHECK 8: Check if mark_notification_read RPC exists and what it does
-- ============================================================================

SELECT 
    p.proname AS function_name,
    p.secdef AS is_security_definer,
    pg_get_functiondef(p.oid) AS function_body
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('mark_notification_read', 'mark_notification_unread', 'mark_all_notifications_read');

-- ============================================================================
-- FIXES (run if checks above reveal issues)
-- ============================================================================

-- FIX 1: Add notifications table to the realtime publication
-- This is the MOST LIKELY fix. Run this if CHECK 1 does not include 'notifications':
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- FIX 2: If the RPC is not SECURITY DEFINER, replace it (migration 001 does this)
-- Or run this minimal fix:
-- CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
-- RETURNS integer
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$
-- DECLARE v_count integer;
-- BEGIN
--     IF auth.uid() IS NULL THEN RETURN 0; END IF;
--     SELECT count(*) INTO v_count
--     FROM public.notifications
--     WHERE recipient_id = auth.uid() AND is_read = false;
--     RETURN v_count;
-- END;
-- $$;
-- GRANT EXECUTE ON FUNCTION public.get_unread_notification_count() TO authenticated;

-- FIX 3: If notifications have recipient_id IS NULL but user_id IS set,
-- backfill recipient_id from user_id:
-- UPDATE notifications SET recipient_id = user_id 
-- WHERE recipient_id IS NULL AND user_id IS NOT NULL;
