-- Enable and define strict per-user RLS on public.notification_preferences
-- Ensures each user can only see and modify their own notification preferences

DO $$
BEGIN
  -- Skip if table does not exist
  IF to_regclass('public.notification_preferences') IS NULL THEN
    RAISE NOTICE 'Table public.notification_preferences does not exist, skipping RLS hardening.';
    RETURN;
  END IF;

  -- Enable RLS (idempotent)
  ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

  -- Drop any existing policies to avoid conflicts
  BEGIN
    DROP POLICY IF EXISTS notification_prefs_select ON public.notification_preferences;
  EXCEPTION WHEN undefined_object THEN
    -- ignore
  END;

  BEGIN
    DROP POLICY IF EXISTS notification_prefs_upsert ON public.notification_preferences;
  EXCEPTION WHEN undefined_object THEN
    -- ignore
  END;

  -- Also drop newer *_own policies if they already exist (idempotent re-run)
  BEGIN
    DROP POLICY IF EXISTS notification_prefs_select_own ON public.notification_preferences;
  EXCEPTION WHEN undefined_object THEN
    -- ignore
  END;

  BEGIN
    DROP POLICY IF EXISTS notification_prefs_insert_own ON public.notification_preferences;
  EXCEPTION WHEN undefined_object THEN
    -- ignore
  END;

  BEGIN
    DROP POLICY IF EXISTS notification_prefs_update_own ON public.notification_preferences;
  EXCEPTION WHEN undefined_object THEN
    -- ignore
  END;

  -- Per-user SELECT: users may read only their own preferences
  CREATE POLICY notification_prefs_select_own
    ON public.notification_preferences
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (auth.uid() = user_id);

  -- Per-user INSERT: users may create only their own preferences
  CREATE POLICY notification_prefs_insert_own
    ON public.notification_preferences
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK (auth.uid() = user_id);

  -- Per-user UPDATE: users may update only their own preferences
  CREATE POLICY notification_prefs_update_own
    ON public.notification_preferences
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- No DELETE policy is defined, so clients cannot delete preferences rows directly
END
$$;
