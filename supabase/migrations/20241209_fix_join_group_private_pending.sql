-- ============================================================================
-- Migration: Fix join_group RPC to create pending membership for private groups
-- ============================================================================
-- Problem: join_group returns 'invite_only' for private groups but doesn't
-- create any DB record. This means:
--   1. User sees "Join request sent" but nothing is saved
--   2. Admin's "Pending Join Requests" list is empty
--   3. The approval flow is broken
--
-- Solution: For private groups, insert a row into group_members with
-- status='pending' and return 'pending' so the frontend knows the request
-- was recorded.
-- ============================================================================

-- Drop and recreate the join_group function with the fix
-- NOTE: The legacy function returned json; we need to drop it before
-- changing the return type to text.
DROP FUNCTION IF EXISTS public.join_group(uuid);

CREATE OR REPLACE FUNCTION public.join_group(group_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_role    text;
  v_group   public.groups%ROWTYPE;
  v_existing_status text;
BEGIN
  -- Must be authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = '42501';
  END IF;

  v_role := app_role_of(v_user_id);

  -- Employers can never join any groups
  IF v_role = 'employer' THEN
    RAISE EXCEPTION 'Employers cannot join groups'
      USING ERRCODE = '42501';
  END IF;

  -- Profile must be fully approved and not rejected
  IF NOT fc_is_fully_approved(v_user_id) OR app_profile_is_rejected() THEN
    RAISE EXCEPTION 'Your profile must be approved before joining groups'
      USING ERRCODE = '42501';
  END IF;

  -- Load group and enforce lifecycle rules
  SELECT *
  INTO v_group
  FROM public.groups
  WHERE id = group_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_group.is_archived THEN
    RAISE EXCEPTION 'Group is archived and cannot be joined'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT v_group.is_approved OR v_group.approval_status <> 'approved'::approval_status THEN
    RAISE EXCEPTION 'Group is not approved for joining'
      USING ERRCODE = 'P0001';
  END IF;

  -- Alumni-only rule: students cannot join
  IF v_group.alumni_only = TRUE AND v_role = 'student' THEN
    RAISE EXCEPTION 'This group is for alumni only'
      USING ERRCODE = '42501';
  END IF;

  -- Check if user already has a membership row
  SELECT status INTO v_existing_status
  FROM public.group_members
  WHERE group_members.group_id = join_group.group_id
    AND user_id = v_user_id;

  IF FOUND THEN
    -- Already a member or already pending
    IF v_existing_status = 'active' THEN
      RETURN 'active';
    ELSIF v_existing_status = 'pending' THEN
      RETURN 'pending';
    END IF;
  END IF;

  -- Private groups: create a PENDING membership request
  IF v_group.is_private THEN
    INSERT INTO public.group_members (group_id, user_id, role, status, joined_at)
    VALUES (group_id, v_user_id, 'member', 'pending', now())
    ON CONFLICT (group_id, user_id) DO UPDATE
      SET status = 'pending',
          joined_at = now();

    RETURN 'pending';
  END IF;

  -- Public, approved, non-archived: add membership as active member
  INSERT INTO public.group_members (group_id, user_id, role, status, joined_at)
  VALUES (group_id, v_user_id, 'member', 'active', now())
  ON CONFLICT (group_id, user_id) DO UPDATE
    SET status = 'active',
        joined_at = EXCLUDED.joined_at;

  RETURN 'active';
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.join_group(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_group(uuid) TO anon;

COMMENT ON FUNCTION public.join_group(uuid) IS 
'Join a group. For public groups, creates active membership immediately. 
For private groups, creates a pending membership request that must be approved by a group admin.
Returns: ''active'' | ''pending''';
