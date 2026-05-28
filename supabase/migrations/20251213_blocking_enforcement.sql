-- ============================================================================
-- BLOCKING ENFORCEMENT MIGRATION
-- Immediate cascades + RLS/RPC blocking (no 30-day deletion)
-- Date: 2025-12-13
-- ============================================================================

-- ============================================================================
-- 1. PROFILE BLOCK FIELDS + INDEXES
-- ============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS blocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS blocked_reason text;

-- Index for admin queries on blocked users
CREATE INDEX IF NOT EXISTS idx_profiles_blocked
  ON profiles(blocked_at) WHERE is_active = false;

-- Index for fast is_user_blocked() lookups
CREATE INDEX IF NOT EXISTS idx_profiles_id_active
  ON profiles(id, is_active);

-- ============================================================================
-- 2. AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS blocked_user_actions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('block', 'unblock')),
  performed_by uuid NOT NULL REFERENCES profiles(id),
  actions_taken jsonb NOT NULL,
  performed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blocked_actions_user
  ON blocked_user_actions_log(user_id, performed_at DESC);

-- RLS for audit log (admin only)
ALTER TABLE blocked_user_actions_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_blocked_actions" ON blocked_user_actions_log;
CREATE POLICY "admin_read_blocked_actions"
  ON blocked_user_actions_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================================================
-- 3. HELPER FUNCTION: is_user_blocked
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_user_blocked(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(NOT is_active, false)
  FROM profiles
  WHERE id = uid;
$$;

-- ============================================================================
-- 4. ADMIN BLOCK USER RPC (IMMEDIATE CASCADES)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_block_user(
  target_user_id uuid,
  reason text DEFAULT 'Policy violation'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  withdrawn_count int := 0;
  cancelled_mentorship_count int := 0;
  removed_organizer_count int := 0;
  cancelled_connections_count int := 0;
  result jsonb;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501';
  END IF;

  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE='P0002';
  END IF;

  -- Check if user is already blocked
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = target_user_id 
    AND is_active = false
  ) THEN
    RAISE EXCEPTION 'User is already blocked' USING ERRCODE='23505';
  END IF;

  -- Block the user
  UPDATE profiles
  SET 
    is_active = false,
    blocked_at = now(),
    blocked_reason = reason
  WHERE id = target_user_id;

  -- 1. Withdraw all active job applications
  WITH withdrawn AS (
    UPDATE job_applications
    SET 
      status = 'withdrawn',
      updated_at = now()
    WHERE 
      applicant_id = target_user_id
      AND status IN ('pending', 'under_review', 'shortlisted', 'interview')
    RETURNING *
  )
  SELECT count(*) INTO withdrawn_count FROM withdrawn;

  -- 2. Cancel all active mentorship relationships
  WITH cancelled AS (
    UPDATE mentorship_relationships
    SET 
      status = 'ended',
      ended_at = now()
    WHERE 
      (mentor_id = target_user_id OR mentee_id = target_user_id)
      AND status = 'active'
    RETURNING *
  )
  SELECT count(*) INTO cancelled_mentorship_count FROM cancelled;

  -- 3. Remove from event organizer roles (set to NULL)
  WITH removed_organizer AS (
    UPDATE events
    SET 
      organizer_id = NULL,
      updated_at = now()
    WHERE organizer_id = target_user_id
    RETURNING *
  )
  SELECT count(*) INTO removed_organizer_count FROM removed_organizer;

  -- 4. Cancel pending connection requests they sent
  WITH cancelled_conn AS (
    UPDATE connections
    SET 
      status = 'cancelled',
      updated_at = now()
    WHERE 
      requester_id = target_user_id
      AND status = 'pending'
    RETURNING *
  )
  SELECT count(*) INTO cancelled_connections_count FROM cancelled_conn;

  -- Build result summary
  result := jsonb_build_object(
    'user_id', target_user_id,
    'blocked_at', now(),
    'blocked_by', auth.uid(),
    'reason', reason,
    'actions', jsonb_build_object(
      'applications_withdrawn', withdrawn_count,
      'mentorship_relationships_cancelled', cancelled_mentorship_count,
      'removed_as_organizer', removed_organizer_count,
      'connections_cancelled', cancelled_connections_count
    )
  );

  -- Log the action
  INSERT INTO blocked_user_actions_log (user_id, action_type, performed_by, actions_taken)
  VALUES (target_user_id, 'block', auth.uid(), result->'actions');

  -- Log to activity_events
  INSERT INTO activity_events (
    actor_id, category, action_code, action_label,
    entity_type, entity_id, metadata
  ) VALUES (
    auth.uid(), 'admin', 'user_blocked', 'User blocked by admin',
    'profile', target_user_id, result
  );

  RETURN result;
END;
$$;

-- ============================================================================
-- 5. ADMIN UNBLOCK USER RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_unblock_user(
  target_user_id uuid,
  unblock_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  was_blocked_at timestamptz;
  result jsonb;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501';
  END IF;

  -- Get original block time
  SELECT blocked_at INTO was_blocked_at
  FROM profiles
  WHERE id = target_user_id;

  IF was_blocked_at IS NULL THEN
    RAISE EXCEPTION 'User is not currently blocked' USING ERRCODE='23503';
  END IF;

  -- Unblock the user
  UPDATE profiles
  SET 
    is_active = true,
    blocked_at = NULL,
    blocked_reason = NULL
  WHERE id = target_user_id;

  -- Build result
  result := jsonb_build_object(
    'user_id', target_user_id,
    'was_blocked_at', was_blocked_at,
    'unblocked_at', now(),
    'unblocked_by', auth.uid(),
    'note', COALESCE(unblock_note, 'No note provided'),
    'message', 'User can now perform actions. Previously cancelled applications/sessions remain cancelled.'
  );

  -- Log the action
  INSERT INTO blocked_user_actions_log (user_id, action_type, performed_by, actions_taken)
  VALUES (target_user_id, 'unblock', auth.uid(), result);

  -- Log to activity_events
  INSERT INTO activity_events (
    actor_id, category, action_code, action_label,
    entity_type, entity_id, metadata
  ) VALUES (
    auth.uid(), 'admin', 'user_unblocked', 'User unblocked by admin',
    'profile', target_user_id, result
  );

  RETURN result;
END;
$$;

-- ============================================================================
-- 6. RLS POLICIES: BLOCK WRITES FROM BLOCKED USERS
-- ============================================================================

-- Event RSVPs
DROP POLICY IF EXISTS "block_rsvp_inserts_from_blocked_users" ON event_rsvps;
CREATE POLICY "block_rsvp_inserts_from_blocked_users"
  ON event_rsvps FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_user_blocked(auth.uid()));
DROP POLICY IF EXISTS "block_rsvp_updates_from_blocked_users" ON event_rsvps;
CREATE POLICY "block_rsvp_updates_from_blocked_users"
  ON event_rsvps FOR UPDATE TO authenticated
  USING (NOT public.is_user_blocked(auth.uid()));
DROP POLICY IF EXISTS "block_rsvp_deletes_from_blocked_users" ON event_rsvps;
CREATE POLICY "block_rsvp_deletes_from_blocked_users"
  ON event_rsvps FOR DELETE TO authenticated
  USING (NOT public.is_user_blocked(auth.uid()));

-- Job Applications
DROP POLICY IF EXISTS "block_application_inserts_from_blocked_users" ON job_applications;
CREATE POLICY "block_application_inserts_from_blocked_users"
  ON job_applications FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_user_blocked(auth.uid()));
DROP POLICY IF EXISTS "block_application_updates_from_blocked_users" ON job_applications;
CREATE POLICY "block_application_updates_from_blocked_users"
  ON job_applications FOR UPDATE TO authenticated
  USING (NOT public.is_user_blocked(auth.uid()));

-- Messages
DROP POLICY IF EXISTS "block_message_inserts_from_blocked_users" ON messages;
CREATE POLICY "block_message_inserts_from_blocked_users"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_user_blocked(auth.uid()));
DROP POLICY IF EXISTS "block_message_deletes_from_blocked_users" ON messages;
CREATE POLICY "block_message_deletes_from_blocked_users"
  ON messages FOR DELETE TO authenticated
  USING (NOT public.is_user_blocked(auth.uid()));

-- Connections
DROP POLICY IF EXISTS "block_connection_inserts_from_blocked_users" ON connections;
CREATE POLICY "block_connection_inserts_from_blocked_users"
  ON connections FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_user_blocked(auth.uid()));
DROP POLICY IF EXISTS "block_connection_updates_from_blocked_users" ON connections;
CREATE POLICY "block_connection_updates_from_blocked_users"
  ON connections FOR UPDATE TO authenticated
  USING (NOT public.is_user_blocked(auth.uid()));

-- Mentorship Requests
DROP POLICY IF EXISTS "block_mentorship_request_inserts_from_blocked_users" ON mentorship_requests;
CREATE POLICY "block_mentorship_request_inserts_from_blocked_users"
  ON mentorship_requests FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_user_blocked(auth.uid()));
DROP POLICY IF EXISTS "block_mentorship_request_updates_from_blocked_users" ON mentorship_requests;
CREATE POLICY "block_mentorship_request_updates_from_blocked_users"
  ON mentorship_requests FOR UPDATE TO authenticated
  USING (NOT public.is_user_blocked(auth.uid()));

-- Group Members
DROP POLICY IF EXISTS "block_group_join_from_blocked_users" ON group_members;
CREATE POLICY "block_group_join_from_blocked_users"
  ON group_members FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_user_blocked(auth.uid()));
DROP POLICY IF EXISTS "block_group_member_updates_from_blocked_users" ON group_members;
CREATE POLICY "block_group_member_updates_from_blocked_users"
  ON group_members FOR UPDATE TO authenticated
  USING (NOT public.is_user_blocked(auth.uid()));

-- Group Posts
DROP POLICY IF EXISTS "block_group_post_inserts_from_blocked_users" ON group_posts;
CREATE POLICY "block_group_post_inserts_from_blocked_users"
  ON group_posts FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_user_blocked(auth.uid()));
DROP POLICY IF EXISTS "block_group_post_updates_from_blocked_users" ON group_posts;
CREATE POLICY "block_group_post_updates_from_blocked_users"
  ON group_posts FOR UPDATE TO authenticated
  USING (NOT public.is_user_blocked(auth.uid()));
DROP POLICY IF EXISTS "block_group_post_deletes_from_blocked_users" ON group_posts;
CREATE POLICY "block_group_post_deletes_from_blocked_users"
  ON group_posts FOR DELETE TO authenticated
  USING (NOT public.is_user_blocked(auth.uid()));

-- Group Comments
DROP POLICY IF EXISTS "block_group_comment_inserts_from_blocked_users" ON group_comments;
CREATE POLICY "block_group_comment_inserts_from_blocked_users"
  ON group_comments FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_user_blocked(auth.uid()));
DROP POLICY IF EXISTS "block_group_comment_updates_from_blocked_users" ON group_comments;
CREATE POLICY "block_group_comment_updates_from_blocked_users"
  ON group_comments FOR UPDATE TO authenticated
  USING (NOT public.is_user_blocked(auth.uid()));
DROP POLICY IF EXISTS "block_group_comment_deletes_from_blocked_users" ON group_comments;
CREATE POLICY "block_group_comment_deletes_from_blocked_users"
  ON group_comments FOR DELETE TO authenticated
  USING (NOT public.is_user_blocked(auth.uid()));

-- Event Feedback
DROP POLICY IF EXISTS "block_event_feedback_inserts_from_blocked_users" ON event_feedback;
CREATE POLICY "block_event_feedback_inserts_from_blocked_users"
  ON event_feedback FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_user_blocked(auth.uid()));
DROP POLICY IF EXISTS "block_event_feedback_updates_from_blocked_users" ON event_feedback;
CREATE POLICY "block_event_feedback_updates_from_blocked_users"
  ON event_feedback FOR UPDATE TO authenticated
  USING (NOT public.is_user_blocked(auth.uid()));

-- Events (creating/editing)
DROP POLICY IF EXISTS "block_event_inserts_from_blocked_users" ON events;
CREATE POLICY "block_event_inserts_from_blocked_users"
  ON events FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_user_blocked(auth.uid()));
DROP POLICY IF EXISTS "block_event_updates_from_blocked_users" ON events;
CREATE POLICY "block_event_updates_from_blocked_users"
  ON events FOR UPDATE TO authenticated
  USING (NOT public.is_user_blocked(auth.uid()));

-- Jobs (posting/editing)
DROP POLICY IF EXISTS "block_job_inserts_from_blocked_users" ON jobs;
CREATE POLICY "block_job_inserts_from_blocked_users"
  ON jobs FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_user_blocked(auth.uid()));
DROP POLICY IF EXISTS "block_job_updates_from_blocked_users" ON jobs;
CREATE POLICY "block_job_updates_from_blocked_users"
  ON jobs FOR UPDATE TO authenticated
  USING (NOT public.is_user_blocked(auth.uid()));

-- Groups (creating)
DROP POLICY IF EXISTS "block_group_inserts_from_blocked_users" ON groups;
CREATE POLICY "block_group_inserts_from_blocked_users"
  ON groups FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_user_blocked(auth.uid()));
DROP POLICY IF EXISTS "block_group_updates_from_blocked_users" ON groups;
CREATE POLICY "block_group_updates_from_blocked_users"
  ON groups FOR UPDATE TO authenticated
  USING (NOT public.is_user_blocked(auth.uid()));

-- ============================================================================
-- 7. GRANT EXECUTE
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.is_user_blocked(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_block_user(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unblock_user(uuid, text) TO authenticated;

-- ============================================================================
-- DONE
-- ============================================================================
