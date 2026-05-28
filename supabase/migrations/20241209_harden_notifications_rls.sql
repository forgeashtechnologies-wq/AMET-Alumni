-- Harden RLS and insert policies on public.notifications
-- Ensures notifications are only visible to their recipients and inserts come from service role

DO $$
BEGIN
  -- Skip if table does not exist
  IF to_regclass('public.notifications') IS NULL THEN
    RAISE NOTICE 'Table public.notifications does not exist, skipping RLS hardening.';
    RETURN;
  END IF;

  -- Enable RLS (idempotent)
  ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

  -- Drop legacy/over-broad policies if they exist
  BEGIN
    DROP POLICY IF EXISTS "realtime: notifications" ON public.notifications;
  EXCEPTION WHEN undefined_object THEN
    -- ignore
  END;

  BEGIN
    DROP POLICY IF EXISTS notifications_select_policy ON public.notifications;
  EXCEPTION WHEN undefined_object THEN
    -- ignore
  END;

  BEGIN
    DROP POLICY IF EXISTS notifications_update_policy ON public.notifications;
  EXCEPTION WHEN undefined_object THEN
    -- ignore
  END;

  BEGIN
    DROP POLICY IF EXISTS notifications_insert_policy ON public.notifications;
  EXCEPTION WHEN undefined_object THEN
    -- ignore
  END;

  -- Drop newer ownership-based policies if they already exist (idempotent re-run)
  BEGIN
    DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
  EXCEPTION WHEN undefined_object THEN
    -- ignore
  END;

  BEGIN
    DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
  EXCEPTION WHEN undefined_object THEN
    -- ignore
  END;

  BEGIN
    DROP POLICY IF EXISTS notifications_insert_service_only ON public.notifications;
  EXCEPTION WHEN undefined_object THEN
    -- ignore
  END;

  -- Ownership-based SELECT policy: users can see only their own notifications
  CREATE POLICY notifications_select_own
    ON public.notifications
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (
      auth.uid() = recipient_id
      OR auth.uid() = profile_id
    );

  -- Ownership-based UPDATE policy: users can update (e.g. mark read) only their own notifications
  CREATE POLICY notifications_update_own
    ON public.notifications
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING (
      auth.uid() = recipient_id
      OR auth.uid() = profile_id
    );

  -- Insert policy: only service_role is allowed to insert notifications directly
  -- (application code should use trusted SQL functions/triggers running as service_role)
  CREATE POLICY notifications_insert_service_only
    ON public.notifications
    AS PERMISSIVE
    FOR INSERT
    TO service_role
    WITH CHECK (true);
END
$$;
