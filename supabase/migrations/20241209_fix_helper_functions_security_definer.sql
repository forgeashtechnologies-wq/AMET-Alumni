-- ============================================================================
-- FIX: Make helper functions SECURITY DEFINER to avoid RLS circular dependency
-- ============================================================================
-- Applied: 2024-12-09
--
-- Problem: RLS policies on group_members use helper functions like is_group_admin()
-- which themselves query group_members. Without SECURITY DEFINER, these inner
-- queries are also subject to RLS, creating a circular dependency that always
-- returns false, blocking all access.
--
-- Solution: Make all helper functions used in RLS policies SECURITY DEFINER
-- so they can bypass RLS when checking permissions.
-- ============================================================================

BEGIN;

-- is_group_admin - checks if user is admin of a specific group
CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT public.is_platform_admin(p_user_id)
      OR EXISTS (
        SELECT 1
        FROM public.group_members m
        WHERE m.group_id = p_group_id
          AND m.user_id  = p_user_id
          AND m.role     = 'admin'
          AND m.status   = 'active'
      );
$function$;

-- is_member_of_group - checks if user is a member of a group
CREATE OR REPLACE FUNCTION public.is_member_of_group(p_group_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members m
    WHERE m.group_id = p_group_id AND m.user_id = p_user_id
  );
$function$;

-- app_role_of - gets user's role from profiles
CREATE OR REPLACE FUNCTION public.app_role_of(p_user_id uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT COALESCE((SELECT p.role::text FROM public.profiles p WHERE p.id = p_user_id), 'alumni');
$function$;

-- is_platform_admin - checks if user is admin or super_admin
CREATE OR REPLACE FUNCTION public.is_platform_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT COALESCE(public.current_role_text(p_user_id) IN ('admin','super_admin'), false);
$function$;

-- is_employer - checks if user is an employer
CREATE OR REPLACE FUNCTION public.is_employer(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT COALESCE(public.app_role_of(p_user_id) = 'employer', false);
$function$;

-- fc_is_fully_approved - checks if user is fully approved
CREATE OR REPLACE FUNCTION public.fc_is_fully_approved(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT COALESCE(
    (SELECT p.approval_status = 'approved' OR COALESCE(p.is_approved, false) = true
     FROM public.profiles p
     WHERE p.id = p_user_id),
    false
  );
$function$;

-- current_role_text - gets user's role with fallback logic
CREATE OR REPLACE FUNCTION public.current_role_text(p_user_id uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
declare
  v_role text;
  id_col text;
  role_col text;
  has_is_active boolean;
  roles_table_exists boolean;
  sql text;
begin
  -- Does public.roles exist?
  select exists(
    select 1
    from information_schema.tables
    where table_schema='public' and table_name='roles'
  ) into roles_table_exists;

  if roles_table_exists then
    -- Pick the id column: profile_id or user_id
    select case
      when exists(
        select 1 from information_schema.columns
        where table_schema='public' and table_name='roles' and column_name='profile_id'
      ) then 'profile_id'
      when exists(
        select 1 from information_schema.columns
        where table_schema='public' and table_name='roles' and column_name='user_id'
      ) then 'user_id'
      else null
    end into id_col;

    -- Pick the text role column among common variants
    select case
      when exists(select 1 from information_schema.columns where table_schema='public' and table_name='roles' and column_name='role') then 'role'
      when exists(select 1 from information_schema.columns where table_schema='public' and table_name='roles' and column_name='role_name') then 'role_name'
      when exists(select 1 from information_schema.columns where table_schema='public' and table_name='roles' and column_name='role_type') then 'role_type'
      when exists(select 1 from information_schema.columns where table_schema='public' and table_name='roles' and column_name='role_key') then 'role_key'
      when exists(select 1 from information_schema.columns where table_schema='public' and table_name='roles' and column_name='system_role') then 'system_role'
      else null
    end into role_col;

    -- Is there an is_active column?
    select exists(
      select 1 from information_schema.columns
      where table_schema='public' and table_name='roles' and column_name='is_active'
    ) into has_is_active;

    -- If we found both columns, query roles dynamically
    if id_col is not null and role_col is not null then
      sql := format($q$
        select %1$I::text
        from public.roles
        where %2$I = $1 %3$s
        order by case %1$I
          when 'super_admin' then 1
          when 'admin' then 2
          when 'employer' then 3
          else 99
        end
        limit 1
      $q$,
      role_col, id_col,
      case when has_is_active then 'and coalesce(is_active, true)' else '' end);

      execute sql into v_role using p_user_id;
    end if;
  end if;

  -- Fallback: profiles.role (enum/text) → else 'alumni'
  if v_role is not null then
    return v_role;
  end if;

  return coalesce(
    (select p.role::text from public.profiles p where p.id = p_user_id and p.role is not null),
    'alumni'
  );
end
$function$;

-- can_read_group - checks if user can read group posts
CREATE OR REPLACE FUNCTION public.can_read_group(p_group_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT public.app_role_of(p_user_id) <> 'employer'
         AND ( (SELECT NOT g.is_private FROM public.groups g WHERE g.id = p_group_id)
               OR public.is_member_of_group(p_group_id, p_user_id) );
$function$;

-- can_view_group - checks if user can view group details
CREATE OR REPLACE FUNCTION public.can_view_group(p_group_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  WITH g AS (SELECT * FROM public.groups WHERE id = p_group_id)
  SELECT CASE
    WHEN public.is_platform_admin(p_user_id) THEN true
    WHEN public.is_employer(p_user_id) THEN false
    WHEN EXISTS (SELECT 1 FROM g WHERE is_private = false AND COALESCE(is_archived,false)=false AND COALESCE(is_approved,true)=true) THEN true
    ELSE public.is_member_of_group(p_group_id, p_user_id)
  END;
$function$;

-- can_post_group - checks if user can post in group
CREATE OR REPLACE FUNCTION public.can_post_group(p_group_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT CASE
    WHEN public.is_platform_admin(p_user_id) THEN true
    WHEN public.is_employer(p_user_id) THEN false
    WHEN EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = p_group_id
        AND COALESCE(g.is_archived,false)=false
        AND COALESCE(g.is_admin_only_posts,false)=true
    ) THEN public.is_group_admin(p_group_id, p_user_id)
    ELSE public.is_member_of_group(p_group_id, p_user_id)
  END;
$function$;

-- can_comment_group - checks if user can comment on group posts
CREATE OR REPLACE FUNCTION public.can_comment_group(p_group_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT CASE
    WHEN public.is_platform_admin(p_user_id) THEN true
    WHEN public.is_employer(p_user_id) THEN false
    ELSE public.is_member_of_group(p_group_id, p_user_id)
  END;
$function$;

COMMIT;
