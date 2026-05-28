-- ============================================================================
-- GROUPS MODULE: RATE LIMITS (5/DAY) + SMALL RPCS FOR FLAGS/AVATAR
-- ============================================================================
-- - Adds shared helper increment_group_rate_limit(user, action_type)
-- - Enforces per-user max 5/day for:
--     * creating groups (create_group_and_add_admin)
--     * joining groups (join_group)
--     * sending invites (invite_member_by_email)
-- - Introduces small RPCs for group flags and avatar updates:
--     * set_group_admin_only_posts(p_group_id, p_on)
--     * set_group_alumni_only(p_group_id, p_on)
--     * update_group_avatar(p_group_id, p_url)
--
-- NOTE: Relies on existing table public.group_rate_limits with columns:
--   id uuid, user_id uuid, action_type text, window_start timestamptz, count int
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1) Helper: increment_group_rate_limit
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_group_rate_limit(
  p_action_type text,
  p_max_per_window integer,
  p_window_interval interval DEFAULT '1 day'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_now timestamptz := now();
  v_row public.group_rate_limits;
BEGIN
  IF auth.uid() IS NULL THEN
    -- If there is no authenticated user, treat as error for our use-cases
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Find existing row in current window for this user + action
  SELECT * INTO v_row
  FROM public.group_rate_limits
  WHERE user_id = auth.uid()
    AND action_type = p_action_type
    AND window_start >= v_now - p_window_interval
  ORDER BY window_start DESC
  LIMIT 1;

  IF v_row.id IS NULL THEN
    -- First action in this window
    INSERT INTO public.group_rate_limits (user_id, action_type, window_start, count)
    VALUES (auth.uid(), p_action_type, date_trunc('day', v_now), 1);
    RETURN;
  END IF;

  IF v_row.count >= p_max_per_window THEN
    RAISE EXCEPTION 'RATE_LIMIT: Too many % actions in this window', p_action_type
      USING ERRCODE = '42901';
  END IF;

  UPDATE public.group_rate_limits
  SET count = v_row.count + 1
  WHERE id = v_row.id;
END;
$function$;

-- ============================================================================
-- 2) Wire 5/day limits into create_group_and_add_admin, join_group, invite_member_by_email
-- ============================================================================

-- Recreate create_group_and_add_admin with rate-limit call
CREATE OR REPLACE FUNCTION public.create_group_and_add_admin(
  group_description text,
  group_is_private boolean,
  group_name text,
  group_tags text[]
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user_id  uuid := auth.uid();
  v_role     text;
  v_group_id uuid;
  v_admin    record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = '42501';
  END IF;

  -- Per-user group creation rate limit: 5 per day
  PERFORM public.increment_group_rate_limit('group_create', 5, '1 day');

  -- Resolve app-level role
  v_role := app_role_of(v_user_id);

  -- ONLY alumni / admin / super_admin can create groups (no students, no employers)
  IF v_role NOT IN ('alumni', 'admin', 'super_admin') THEN
    RAISE EXCEPTION 'Only alumni or admins can create groups'
      USING ERRCODE = '42501';
  END IF;

  -- Profile must be fully approved and not rejected
  IF NOT fc_is_fully_approved(v_user_id) OR app_profile_is_rejected() THEN
    RAISE EXCEPTION 'Profile is not approved to create groups'
      USING ERRCODE = '42501';
  END IF;

  -- Create group in pending state
  INSERT INTO public.groups (
    name,
    description,
    is_private,
    tags,
    created_by,
    is_approved,
    approval_status,
    is_rejected,
    alumni_only
  )
  VALUES (
    trim(group_name),
    coalesce(trim(group_description), ''),
    coalesce(group_is_private, false),
    coalesce(group_tags, ARRAY[]::text[]),
    v_user_id,
    false,
    'pending'::approval_status,
    false,
    false
  )
  RETURNING id INTO v_group_id;

  -- Notify site/admin users that a new group is pending approval
  FOR v_admin IN
    SELECT id
    FROM public.profiles
    WHERE role IN ('admin', 'super_admin')
  LOOP
    PERFORM public.create_group_notification_once(
      'group',
      v_admin.id,
      v_group_id,
      v_user_id,
      'New group "' || COALESCE(trim(group_name), 'this group') || '" is pending approval.',
      'New group pending approval',
      '/admin/groups/' || v_group_id::text,
      300
    );
  END LOOP;

  -- Add creator as admin member (idempotent)
  INSERT INTO public.group_members (group_id, user_id, role, joined_at)
  VALUES (v_group_id, v_user_id, 'admin', now())
  ON CONFLICT (group_id, user_id) DO UPDATE
    SET role      = EXCLUDED.role,
        joined_at = EXCLUDED.joined_at;

  RETURN v_group_id;
END;
$function$;

-- Recreate join_group with rate-limit call
CREATE OR REPLACE FUNCTION public.join_group(p_group_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_role    text;
  v_group   public.groups%ROWTYPE;
  v_existing_status text;
  v_group_id uuid := p_group_id; -- disambiguated local copy
BEGIN
  -- Must be authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = '42501';
  END IF;

  -- Per-user join rate limit: 5 per day
  PERFORM public.increment_group_rate_limit('group_join', 5, '1 day');

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
  WHERE id = v_group_id;

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
  WHERE group_members.group_id = v_group_id
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
    VALUES (v_group_id, v_user_id, 'member', 'pending', now())
    ON CONFLICT (group_id, user_id) DO UPDATE
      SET status = 'pending',
          joined_at = now();

    RETURN 'pending';
  END IF;

  -- Public, approved, non-archived: add membership as active member
  INSERT INTO public.group_members (group_id, user_id, role, status, joined_at)
  VALUES (v_group_id, v_user_id, 'member', 'active', now())
  ON CONFLICT (group_id, user_id) DO UPDATE
    SET status = 'active',
        joined_at = EXCLUDED.joined_at;

  RETURN 'active';
END;
$function$;

-- Recreate invite_member_by_email with rate-limit call
CREATE OR REPLACE FUNCTION public.invite_member_by_email(p_group_id uuid, p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_caller_id     uuid := auth.uid();
  v_caller_role   text;
  v_group         public.groups%ROWTYPE;
  v_invitee_prof  public.profiles%ROWTYPE;
  v_invitation_id uuid;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Per-user invite rate limit: 5 per day
  PERFORM public.increment_group_rate_limit('group_invite', 5, '1 day');

  -- Caller role
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
  IF v_caller_role = 'employer' THEN
    RAISE EXCEPTION 'Employers cannot send group invites';
  END IF;

  -- Group must exist and be active
  SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found';
  END IF;
  IF v_group.is_archived THEN
    RAISE EXCEPTION 'Cannot invite to archived group';
  END IF;
  IF v_group.approval_status IS NOT NULL AND v_group.approval_status <> 'approved' THEN
    RAISE EXCEPTION 'Cannot invite to unapproved group';
  END IF;

  -- Caller must already be a member
  IF NOT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = v_caller_id
  ) THEN
    RAISE EXCEPTION 'Only group members can send invites';
  END IF;

  -- Resolve invitee by email (if they already have an account)
  SELECT * INTO v_invitee_prof
  FROM public.profiles
  WHERE lower(email) = lower(p_email)
  LIMIT 1;

  -- Block employers as invitees
  IF FOUND AND v_invitee_prof.role = 'employer' THEN
    RAISE EXCEPTION 'Cannot invite employers to groups';
  END IF;

  -- Alumni-only restriction: block students
  IF FOUND AND v_group.alumni_only AND v_invitee_prof.role = 'student' THEN
    RAISE EXCEPTION 'This group is alumni-only. Students cannot be invited.';
  END IF;

  -- If user already member, no invite
  IF FOUND AND EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = v_invitee_prof.id
  ) THEN
    RAISE EXCEPTION 'User is already a member of this group';
  END IF;

  -- Create (or upsert) pending invite
  INSERT INTO public.group_invitations (
    group_id,
    inviter_id,
    invitee_id,
    invitee_email,
    status
  )
  VALUES (
    p_group_id,
    v_caller_id,
    CASE WHEN FOUND THEN v_invitee_prof.id ELSE NULL END,
    lower(p_email),
    'pending'
  )
  ON CONFLICT (group_id, invitee_id)
    WHERE invitee_id IS NOT NULL AND status = 'pending'
  DO UPDATE SET
    updated_at = now()
  RETURNING id INTO v_invitation_id;

  -- Notification only if invitee has an account
  IF FOUND THEN
    PERFORM create_group_notification(
      v_invitee_prof.id,
      'group',
      'Group Invitation',
      'You have been invited to join "' || v_group.name || '"',
      p_group_id,
      '/groups/' || p_group_id::text
    );
  END IF;

  RETURN v_invitation_id;
END;
$function$;

-- ============================================================================
-- 3) Small RPCs for flags and avatar (SECURITY INVOKER, rely on RLS)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_group_admin_only_posts(
  p_group_id uuid,
  p_on boolean
) RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path TO public
AS $function$
  UPDATE public.groups
  SET is_admin_only_posts = coalesce(p_on, false)
  WHERE id = p_group_id;
$function$;

CREATE OR REPLACE FUNCTION public.set_group_alumni_only(
  p_group_id uuid,
  p_on boolean
) RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path TO public
AS $function$
  UPDATE public.groups
  SET alumni_only = coalesce(p_on, false)
  WHERE id = p_group_id;
$function$;

CREATE OR REPLACE FUNCTION public.update_group_avatar(
  p_group_id uuid,
  p_url text
) RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path TO public
AS $function$
  UPDATE public.groups
  SET group_avatar_url = nullif(trim(p_url), ''),
      updated_at       = now()
  WHERE id = p_group_id;
$function$;

COMMIT;
