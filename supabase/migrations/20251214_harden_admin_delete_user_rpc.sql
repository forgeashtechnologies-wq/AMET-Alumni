-- Harden admin_delete_user_rpc: strict success criteria, revoke broad grants.
-- Security: remove anon/auth grants; keep definer authz checks.

-- Revoke permissive grants
REVOKE ALL ON FUNCTION public.admin_delete_user_rpc(uuid) FROM anon, authenticated;

-- Recreate with strict error handling
CREATE OR REPLACE FUNCTION public.admin_delete_user_rpc(target uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, vault, extensions
AS $$
DECLARE
  requester uuid := auth.uid();
  srv_key   text := (select decrypted_secret from vault.decrypted_secrets where name = 'service_role');
  base_url  text := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url');
  req_id    bigint;
  v_status  int;
  v_body    text;
  target_role text;
  super_admins_left int;
  avatar_path text;
  resume_paths text[];
BEGIN
  -- AuthZ
  IF requester IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = requester AND p.role IN ('admin','super_admin')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF target = requester THEN
    RAISE EXCEPTION 'cannot_delete_self' USING ERRCODE = '42501';
  END IF;

  SELECT role INTO target_role FROM public.profiles WHERE id = target;
  IF target_role IN ('admin','super_admin')
     AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = requester AND p.role = 'super_admin') THEN
    RAISE EXCEPTION 'only_super_admin_can_delete_admins' USING ERRCODE = '42501';
  END IF;
  IF target_role = 'super_admin' THEN
    SELECT count(*) INTO super_admins_left FROM public.profiles WHERE role = 'super_admin' AND id <> target;
    IF COALESCE(super_admins_left,0) = 0 THEN
      RAISE EXCEPTION 'cannot_delete_last_super_admin' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Optional storage cleanup
  BEGIN
    SELECT p.avatar_path INTO avatar_path FROM public.profiles p WHERE p.id = target;
  EXCEPTION WHEN undefined_column THEN NULL;
  END;
  BEGIN
    SELECT array_agg(file_path) INTO resume_paths FROM public.user_resumes WHERE user_id = target;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;
  IF avatar_path IS NOT NULL THEN
    PERFORM net.http_post(
      url     := base_url || '/storage/v1/object/avatars/remove',
      headers := jsonb_build_object('apikey',srv_key,'authorization','Bearer '||srv_key,'Content-Type','application/json'),
      body    := jsonb_build_array(jsonb_build_object('bucket','avatars','name',avatar_path))
    );
  END IF;
  IF resume_paths IS NOT NULL THEN
    PERFORM net.http_post(
      url     := base_url || '/storage/v1/object/resumes/remove',
      headers := jsonb_build_object('apikey',srv_key,'authorization','Bearer '||srv_key,'Content-Type','application/json'),
      body    := (SELECT jsonb_agg(jsonb_build_object('bucket','resumes','name',p)) FROM unnest(resume_paths) AS p)
    );
  END IF;

  -- Purge app data
  PERFORM public.purge_user_data(target);

  -- Delete Auth user
  req_id := net.http_delete(
    url     := base_url || '/auth/v1/admin/users/' || target::text,
    headers := jsonb_build_object('apikey',srv_key,'authorization','Bearer '||srv_key,'Content-Type','application/json')
  );

  PERFORM pg_sleep(0.2);
  FOR i IN 1..25 LOOP
    SELECT status_code, content INTO v_status, v_body FROM net._http_response WHERE id = req_id;
    EXIT WHEN v_status IS NOT NULL;
    PERFORM pg_sleep(0.2);
  END LOOP;

  IF v_status BETWEEN 200 AND 299 THEN
    RETURN jsonb_build_object('ok', true, 'status', v_status);
  ELSE
    RAISE EXCEPTION 'auth_delete_failed status=% body=%', v_status, v_body USING ERRCODE = 'P0001';
  END IF;
END;
$$;
