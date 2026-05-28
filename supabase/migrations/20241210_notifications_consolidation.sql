-- ============================================================================
-- NOTIFICATIONS SYSTEM CONSOLIDATION MIGRATION
-- Fixes gaps identified in notification system audit
-- ============================================================================

-- ============================================================================
-- 1. LEGACY TYPE MAPPING FUNCTION
-- Maps old notification types to canonical types for backwards compatibility
-- ============================================================================

CREATE OR REPLACE FUNCTION public.map_legacy_notification_type(p_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_type
    -- Legacy types -> canonical types
    WHEN 'new_message' THEN 'message'
    WHEN 'event_reminder' THEN 'event'
    WHEN 'job_alert' THEN 'job'
    WHEN 'mentorship_request' THEN 'mentorship'
    WHEN 'mentorship_request_created' THEN 'mentorship'
    WHEN 'mentorship_request_confirmation' THEN 'mentorship'
    WHEN 'mentorship_request_cancelled_by_user' THEN 'mentorship'
    WHEN 'connection_request' THEN 'connection'
    WHEN 'connection_accepted' THEN 'connection'
    -- Pass through canonical types unchanged
    ELSE p_type
  END;
$$;

COMMENT ON FUNCTION public.map_legacy_notification_type(text) IS 
'Maps legacy notification types to canonical types for backwards compatibility';

-- ============================================================================
-- 2. NOTIFICATION METADATA VALIDATION FUNCTION
-- Validates required metadata keys per notification type
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_notification_metadata(
  p_type text,
  p_metadata jsonb
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Group notifications require group_id
  IF p_type LIKE 'group_%' AND p_metadata->>'group_id' IS NULL THEN
    RAISE WARNING 'Notification type % should have group_id in metadata', p_type;
  END IF;
  
  -- Mentorship notifications should have relationship_id for accepted status
  IF p_type = 'mentorship' AND p_metadata->>'status' = 'accepted' 
     AND p_metadata->>'relationship_id' IS NULL THEN
    RAISE WARNING 'Accepted mentorship notification should have relationship_id';
  END IF;
  
  -- Entity-based notifications should have entity_type and entity_id
  IF p_type IN ('job', 'event', 'application') 
     AND (p_metadata->>'entity_id' IS NULL OR p_metadata->>'entity_type' IS NULL) THEN
    RAISE WARNING 'Notification type % should have entity_type and entity_id', p_type;
  END IF;
  
  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.validate_notification_metadata(text, jsonb) IS 
'Validates notification metadata has required keys per type (soft validation with warnings)';

-- ============================================================================
-- 3. ENHANCED NOTIFY FUNCTION WITH VALIDATION
-- Wraps notification creation with metadata validation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_validated(
  p_recipient_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_link text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_notification_id uuid;
  v_canonical_type text;
BEGIN
  -- Map legacy types to canonical
  v_canonical_type := public.map_legacy_notification_type(p_type);
  
  -- Validate metadata (soft validation)
  PERFORM public.validate_notification_metadata(v_canonical_type, p_metadata);
  
  -- Insert notification
  INSERT INTO public.notifications (
    recipient_id,
    type,
    title,
    message,
    link,
    metadata,
    is_read,
    created_at
  ) VALUES (
    p_recipient_id,
    v_canonical_type,
    p_title,
    p_message,
    p_link,
    p_metadata,
    false,
    now()
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

COMMENT ON FUNCTION public.notify_validated(uuid, text, text, text, text, jsonb) IS 
'Creates a notification with type mapping and metadata validation';

-- ============================================================================
-- 4. ENHANCED LINK DERIVATION FUNCTION (DB-side fallback)
-- Derives notification link from metadata when link field is null
-- ============================================================================

CREATE OR REPLACE FUNCTION public.derive_notification_link(
  p_type text,
  p_metadata jsonb,
  p_link text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_entity_type text;
  v_entity_id text;
  v_group_id text;
  v_relationship_id text;
  v_status text;
BEGIN
  -- Return explicit link if provided
  IF p_link IS NOT NULL AND p_link != '' THEN
    RETURN p_link;
  END IF;
  
  -- Extract common metadata fields
  v_entity_type := p_metadata->>'entity_type';
  v_entity_id := p_metadata->>'entity_id';
  v_group_id := p_metadata->>'group_id';
  v_relationship_id := p_metadata->>'relationship_id';
  v_status := p_metadata->>'status';
  
  -- Group notifications
  IF p_type LIKE 'group_%' AND v_group_id IS NOT NULL THEN
    IF p_type IN ('group_join_request', 'group_admin_risk') THEN
      RETURN '/groups/' || v_group_id || '/manage';
    END IF;
    RETURN '/groups/' || v_group_id;
  END IF;
  
  -- Mentorship notifications
  IF p_type = 'mentorship' THEN
    IF v_status = 'accepted' AND v_relationship_id IS NOT NULL THEN
      RETURN '/mentorship?tab=mentee&highlightRelationshipId=' || v_relationship_id;
    END IF;
    IF v_status IN ('rejected', 'pending') THEN
      RETURN '/mentorship?tab=requests&sub=sent';
    END IF;
    RETURN '/mentorship';
  END IF;
  
  -- Entity-based routing
  IF v_entity_type IS NOT NULL AND v_entity_id IS NOT NULL THEN
    CASE v_entity_type
      WHEN 'job' THEN RETURN '/jobs/' || v_entity_id;
      WHEN 'event' THEN RETURN '/events/' || v_entity_id;
      WHEN 'application' THEN RETURN '/applications/' || v_entity_id;
      WHEN 'connection' THEN RETURN '/network';
      WHEN 'group' THEN RETURN '/groups/' || v_entity_id;
      ELSE NULL;
    END CASE;
  END IF;
  
  -- Default fallback
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.derive_notification_link(text, jsonb, text) IS 
'Derives a notification link from metadata when explicit link is not provided';

-- ============================================================================
-- 5. DROP DEPENDENT FUNCTION FIRST, THEN VIEW, THEN RECREATE BOTH
-- ============================================================================

-- Drop the dependent function first
DROP FUNCTION IF EXISTS public.get_notifications_paginated(integer, integer, boolean);

-- Now drop the view
DROP VIEW IF EXISTS public.bell_notifications;

-- Recreate the view with derived links
CREATE VIEW public.bell_notifications AS
SELECT 
  n.id,
  n.recipient_id,
  n.type,
  n.title,
  n.message,
  COALESCE(n.link, public.derive_notification_link(n.type, n.metadata, n.link)) as link,
  n.metadata,
  n.is_read,
  n.read_at,
  n.created_at
FROM notifications n
LEFT JOIN notification_preferences p 
  ON p.user_id = n.recipient_id 
  AND p.notification_type = n.type
WHERE 
  COALESCE(p.in_app_enabled, true) = true
  AND NOT lower(COALESCE(n.title, '')) LIKE 'rsvp confirmed%'
  AND is_bell_worthy(get_user_role(n.recipient_id), n.type, n.metadata)
ORDER BY n.created_at DESC;

COMMENT ON VIEW public.bell_notifications IS 
'User notifications filtered by preferences with derived links. Used by get_notifications_paginated RPC.';

-- Recreate the paginated function
CREATE FUNCTION public.get_notifications_paginated(
  p_limit integer DEFAULT 12, 
  p_offset integer DEFAULT 0, 
  p_is_read boolean DEFAULT NULL
)
RETURNS SETOF bell_notifications
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT *
  FROM public.bell_notifications
  WHERE recipient_id = auth.uid()
    AND (p_is_read IS NULL OR is_read = p_is_read)
  ORDER BY created_at DESC
  LIMIT LEAST(p_limit, 50)
  OFFSET p_offset;
$$;

COMMENT ON FUNCTION public.get_notifications_paginated(integer, integer, boolean) IS 
'Returns paginated notifications for current user with optional read/unread filter';

-- ============================================================================
-- 6. CONSOLIDATED UNREAD COUNT RPC
-- Single source of truth for unread notification count
-- ============================================================================

-- Drop and recreate to ensure consistent behavior
DROP FUNCTION IF EXISTS public.get_unread_notification_count();

CREATE FUNCTION public.get_unread_notification_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Use bell_notifications view to respect preferences
  SELECT count(*)
  FROM public.bell_notifications
  WHERE recipient_id = auth.uid()
    AND is_read = false;
$$;

COMMENT ON FUNCTION public.get_unread_notification_count() IS 
'Returns unread notification count for current user, respecting notification preferences';

-- ============================================================================
-- 7. DEPRECATE OLD COUNT RPCS (keep for backwards compat but mark deprecated)
-- ============================================================================

COMMENT ON FUNCTION public.get_bell_unread_count() IS 
'@deprecated Use get_unread_notification_count() instead. Returns unread count from bell_notifications view.';

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.map_legacy_notification_type(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_notification_metadata(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_validated(uuid, text, text, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_notifications_paginated(integer, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.derive_notification_link(text, jsonb, text) TO authenticated;
GRANT SELECT ON public.bell_notifications TO authenticated;

-- ============================================================================
-- 9. CREATE INDEX FOR EFFICIENT UNREAD COUNT QUERIES
-- ============================================================================

-- Ensure index exists for efficient unread count queries
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread_bell
ON public.notifications (recipient_id, is_read, created_at DESC)
WHERE is_read = false;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
