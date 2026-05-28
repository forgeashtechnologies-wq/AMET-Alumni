-- ============================================================================
-- GROUPS MODULE: CLEAN-SLATE RLS CONSOLIDATION
-- ============================================================================
-- Applied: 2024-12-09
-- 
-- This migration retired legacy/redundant RLS policies and kept only the
-- canonical, minimal set that correctly enforces permissions.
--
-- BEFORE: 50+ overlapping policies across 5 tables
-- AFTER:  28 clean, non-overlapping policies
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1) GROUPS TABLE: Consolidate SELECT/INSERT/UPDATE policies
-- ============================================================================

-- DROP legacy/redundant SELECT policies (keep block_rejected_on_groups as RESTRICTIVE)
DROP POLICY IF EXISTS groups_select_admin ON public.groups;
DROP POLICY IF EXISTS groups_select_archived ON public.groups;
DROP POLICY IF EXISTS groups_select_only_non_rejected ON public.groups;
DROP POLICY IF EXISTS groups_select_role_aware ON public.groups;

-- KEEP groups_select_non_employer as the canonical SELECT policy

-- DROP legacy/redundant INSERT policies
DROP POLICY IF EXISTS groups_insert ON public.groups;
DROP POLICY IF EXISTS groups_insert_no_employers ON public.groups;

-- KEEP g_insert_creator as the canonical INSERT policy

-- DROP legacy/redundant UPDATE policies
DROP POLICY IF EXISTS groups_update ON public.groups;
DROP POLICY IF EXISTS groups_update_admin ON public.groups;
DROP POLICY IF EXISTS groups_update_owner ON public.groups;

-- KEEP g_update_admin as the canonical UPDATE policy

-- ============================================================================
-- 2) GROUP_MEMBERS TABLE: Consolidate SELECT/INSERT/DELETE policies
-- ============================================================================

-- DROP legacy/redundant SELECT policies
DROP POLICY IF EXISTS "Users can view their memberships" ON public.group_members;
DROP POLICY IF EXISTS gm_select_admin ON public.group_members;

-- KEEP gm_select_group_admin as the canonical SELECT policy
-- Add a self-view policy for users to see their own memberships
DROP POLICY IF EXISTS gm_select_self ON public.group_members;
CREATE POLICY gm_select_self
ON public.group_members
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- DROP legacy/redundant INSERT policies
DROP POLICY IF EXISTS gm_insert ON public.group_members;
DROP POLICY IF EXISTS gm_insert_creator ON public.group_members;
DROP POLICY IF EXISTS gm_self_join_public ON public.group_members;
DROP POLICY IF EXISTS group_members_admin_add ON public.group_members;
DROP POLICY IF EXISTS group_members_self_join_public ON public.group_members;

-- KEEP gm_insert_by_admin as the canonical INSERT policy for admin adds
-- Add a clean self-join policy for public groups
DROP POLICY IF EXISTS gm_insert_self_public ON public.group_members;
CREATE POLICY gm_insert_self_public
ON public.group_members
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND NOT is_employer(auth.uid())
  AND fc_is_fully_approved(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_id
      AND g.is_private = false
      AND g.is_approved = true
      AND g.is_archived = false
  )
);

-- DROP legacy/redundant DELETE policies
DROP POLICY IF EXISTS group_members_leave ON public.group_members;

-- KEEP gm_self_leave as the canonical DELETE policy for self-leave
-- Add admin removal policy
DROP POLICY IF EXISTS gm_delete_admin ON public.group_members;
CREATE POLICY gm_delete_admin
ON public.group_members
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  is_group_admin(group_id, auth.uid())
  OR is_platform_admin(auth.uid())
);

-- ============================================================================
-- 3) GROUP_MEMBERSHIPS TABLE: Consolidate policies
-- ============================================================================

-- DROP legacy/redundant SELECT policies
DROP POLICY IF EXISTS group_memberships_select_self ON public.group_memberships;

-- KEEP gms_select_self_or_admin as the canonical SELECT policy

-- DROP legacy/redundant INSERT policies
DROP POLICY IF EXISTS group_memberships_insert_self ON public.group_memberships;

-- KEEP gms_insert_self as the canonical INSERT policy

-- ============================================================================
-- 4) GROUP_POSTS TABLE: Already clean, no changes needed
-- ============================================================================

-- ============================================================================
-- 5) GROUP_COMMENTS TABLE: Consolidate policies
-- ============================================================================

-- DROP legacy/redundant SELECT policies
DROP POLICY IF EXISTS group_comments_select ON public.group_comments;
DROP POLICY IF EXISTS group_comments_select_role_aware ON public.group_comments;

-- KEEP gc_select as the canonical SELECT policy

-- DROP legacy/redundant INSERT policies
DROP POLICY IF EXISTS group_comments_insert ON public.group_comments;

-- KEEP gc_insert as the canonical INSERT policy

-- DROP legacy/redundant UPDATE policies
DROP POLICY IF EXISTS group_comments_update ON public.group_comments;
DROP POLICY IF EXISTS group_comments_update_own ON public.group_comments;

-- KEEP gc_update_own and gc_update_admin as canonical UPDATE policies

-- DROP legacy/redundant DELETE policies
DROP POLICY IF EXISTS group_comments_delete_own ON public.group_comments;

-- KEEP gc_delete_own and gc_delete_admin as canonical DELETE policies

-- ============================================================================
-- 6) DROP REDUNDANT INDEXES (only non-constraint indexes)
-- ============================================================================

-- group_members: drop redundant non-constraint indexes
DROP INDEX IF EXISTS public.idx_group_members_group;
DROP INDEX IF EXISTS public.idx_group_members_group_id;
DROP INDEX IF EXISTS public.idx_group_members_user;
DROP INDEX IF EXISTS public.idx_group_members_user_id;

-- group_posts: keep only one (group_id, created_at DESC) index
DROP INDEX IF EXISTS public.idx_group_posts_gid_created_at;
DROP INDEX IF EXISTS public.idx_group_posts_group_created;

-- group_comments: drop redundant indexes (keep the _created_at versions)
DROP INDEX IF EXISTS public.idx_group_comments_author_id;
DROP INDEX IF EXISTS public.idx_group_comments_post_id;

COMMIT;

-- ============================================================================
-- FINAL STATE: 28 POLICIES (down from 50+)
-- ============================================================================
-- 
-- groups (4 policies):
--   - block_rejected_on_groups (ALL, RESTRICTIVE)
--   - groups_delete_super_admin_only (DELETE)
--   - g_insert_creator (INSERT)
--   - groups_select_non_employer (SELECT)
--   - g_update_admin (UPDATE)
--
-- group_members (7 policies):
--   - block_rejected_on_group_members (ALL, RESTRICTIVE)
--   - gm_delete_admin (DELETE)
--   - gm_self_leave (DELETE)
--   - gm_insert_by_admin (INSERT)
--   - gm_insert_self_public (INSERT)
--   - gm_select_group_admin (SELECT)
--   - gm_select_self (SELECT)
--
-- group_memberships (4 policies):
--   - gms_delete_self_or_admin (DELETE)
--   - gms_insert_self (INSERT)
--   - gms_select_self_or_admin (SELECT)
--   - gms_update_admin (UPDATE)
--
-- group_posts (6 policies):
--   - gp_delete_admin (DELETE)
--   - gp_delete_own (DELETE)
--   - gp_insert (INSERT)
--   - gp_select (SELECT)
--   - gp_update_admin (UPDATE)
--   - gp_update_own (UPDATE)
--
-- group_comments (6 policies):
--   - gc_delete_admin (DELETE)
--   - gc_delete_own (DELETE)
--   - gc_insert (INSERT)
--   - gc_select (SELECT)
--   - gc_update_admin (UPDATE)
--   - gc_update_own (UPDATE)
-- ============================================================================
