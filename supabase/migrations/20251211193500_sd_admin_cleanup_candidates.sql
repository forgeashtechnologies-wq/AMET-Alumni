-- SECURITY DEFINER admin/bypass cleanup candidates for AMS-AMET
--
-- IMPORTANT:
-- - These functions are not referenced by the current frontend/backend code
--   and had zero calls in recent pg_stat_statements telemetry.
-- - They appear to be legacy admin utilities / prototypes for approvals,
--   role management, and permissions reporting.
-- - Review and apply in a controlled window; this only shrinks the admin SD
--   surface and does not alter core flows.
--
-- All drops are idempotent.

-- 1) Legacy job/admin listing & user logins helpers
DROP FUNCTION IF EXISTS public.admin_list_jobs_pending(_limit integer, _offset integer);
DROP FUNCTION IF EXISTS public.admin_list_user_logins();

-- 2) Generic admin logging and delete-request helpers
DROP FUNCTION IF EXISTS public.admin_log_action(
  p_admin_id uuid,
  p_action_type text,
  p_target_type text,
  p_target_id uuid,
  p_description text,
  p_before jsonb,
  p_after jsonb,
  p_reason text
);

DROP FUNCTION IF EXISTS public.admin_request_user_delete(target uuid);

-- 3) Super-admin / role & approval prototypes
DROP FUNCTION IF EXISTS public.admin_revoke_super_admin(target_user_id uuid, new_role text);

DROP FUNCTION IF EXISTS public.admin_set_approval(
  tname text,
  row_id uuid,
  new_status approval_status,
  note text
);

DROP FUNCTION IF EXISTS public.admin_set_profile_approval(
  p_profile_id uuid,
  p_status profile_approval_status,
  p_reason text
);

DROP FUNCTION IF EXISTS public.admin_set_role(p_user uuid, p_role text);

DROP FUNCTION IF EXISTS public.admin_set_roles(p_user_ids uuid[], p_role app_role_enum);

-- 4) Unused permission-reporting helper
DROP FUNCTION IF EXISTS public.get_user_permissions_bypass_rls(profile_uuid uuid);
