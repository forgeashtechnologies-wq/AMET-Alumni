-- Migration: Add admin_delete_event RPC for super_admin to hard-delete events
-- This RPC performs authorization checks and cascade deletes related data

CREATE OR REPLACE FUNCTION public.admin_delete_event(p_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_event record;
BEGIN
  -- Must be authenticated
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = '28000';
  END IF;

  -- Only super_admin can delete events
  SELECT role INTO v_caller_role
  FROM public.profiles
  WHERE id = v_caller_id;

  IF v_caller_role IS NULL OR v_caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super admins can delete events'
      USING ERRCODE = '42501';
  END IF;

  -- Verify event exists
  SELECT id, title, created_by INTO v_event
  FROM public.events
  WHERE id = p_event_id;

  IF v_event.id IS NULL THEN
    RAISE EXCEPTION 'Event not found'
      USING ERRCODE = 'P0002';
  END IF;

  -- Log the deletion in admin_actions before deleting
  INSERT INTO public.admin_actions (
    admin_id,
    action_type,
    target_type,
    target_id,
    description,
    metadata
  ) VALUES (
    v_caller_id,
    'delete_event',
    'event',
    p_event_id,
    'Admin permanently deleted event',
    jsonb_build_object(
      'event_title', v_event.title,
      'created_by', v_event.created_by
    )
  );

  -- Delete related data (cascade should handle most, but be explicit)
  -- Delete event RSVPs
  DELETE FROM public.event_rsvps WHERE event_id = p_event_id;
  
  -- Delete event-group associations
  DELETE FROM public.event_groups WHERE event_id = p_event_id;
  
  -- Delete event feedback if table exists
  BEGIN
    DELETE FROM public.event_feedback WHERE event_id = p_event_id;
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip
    NULL;
  END;

  -- Delete event comments if table exists
  BEGIN
    DELETE FROM public.event_comments WHERE event_id = p_event_id;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- Finally delete the event itself
  DELETE FROM public.events WHERE id = p_event_id;
END;
$$;

-- Grant execute to authenticated users (RPC will enforce super_admin check)
GRANT EXECUTE ON FUNCTION public.admin_delete_event(uuid) TO authenticated;

COMMENT ON FUNCTION public.admin_delete_event(uuid) IS 
'Hard-delete an event and all related data. Super admin only.';
