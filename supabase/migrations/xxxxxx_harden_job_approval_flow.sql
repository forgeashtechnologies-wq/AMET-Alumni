do $$
begin
  ---------------------------------------------------------------------------
  -- 1) Harden jobs approval columns: prevent non-admins from self-approving
  --    or setting approval_status / flags directly.
  ---------------------------------------------------------------------------
  create or replace function public.protect_jobs_admin_columns()
  returns trigger
  language plpgsql
  as $$
  declare
    v_role text;
  begin
    v_role := public.current_role_text();

    if coalesce(v_role, '') not in ('admin','super_admin') then
      if TG_OP = 'INSERT' then
        if coalesce(NEW.is_approved, false)
           or coalesce(NEW.is_rejected, false)
           or NEW.approval_status is distinct from 'pending'::public.approval_status
           or NEW.reviewed_by is not null
           or NEW.reviewed_at is not null
        then
          raise exception 'Admin fields on jobs are read-only for non-admins';
        end if;
      else
        -- UPDATE
        if (NEW.is_approved is distinct from OLD.is_approved)
           or (coalesce(NEW.is_rejected,false) is distinct from coalesce(OLD.is_rejected,false))
           or (NEW.reviewed_by is distinct from OLD.reviewed_by)
           or (NEW.reviewed_at is distinct from OLD.reviewed_at)
           or (NEW.approval_status is distinct from OLD.approval_status)
        then
          raise exception 'Admin fields on jobs are read-only for non-admins';
        end if;
      end if;
    end if;

    return NEW;
  end;
  $$;

  -- Recreate trigger to cover both INSERT and UPDATE.
  if exists (
    select 1 from pg_trigger
    where tgname = 'trg_protect_jobs_admin_columns'
      and tgrelid = 'public.jobs'::regclass
  ) then
    drop trigger trg_protect_jobs_admin_columns on public.jobs;
  end if;

  create trigger trg_protect_jobs_admin_columns
  before insert or update on public.jobs
  for each row
  execute function public.protect_jobs_admin_columns();

  ---------------------------------------------------------------------------
  -- 2) Align admin_set_job_approval with approval_status and sync flags
  --    via jobs_sync_flags_from_status trigger.
  ---------------------------------------------------------------------------

  -- Wrapper: 3-arg version forwards to 4-arg canonical implementation.
  create or replace function public.admin_set_job_approval(
    p_job_id   uuid,
    p_approved boolean,
    p_rejected boolean default false
  )
  returns void
  language sql
  security definer
  set search_path = 'public','pg_temp'
  as $$
    select public.admin_set_job_approval(p_job_id, p_approved, p_rejected, null::text);
  $$;

  -- Canonical implementation with reason + approval_status update.
  create or replace function public.admin_set_job_approval(
    p_job_id   uuid,
    p_approved boolean,
    p_rejected boolean default false,
    p_reason   text default null
  )
  returns void
  language plpgsql
  security definer
  set search_path = 'public','pg_temp'
  as $$
  declare
    v_uid           uuid := auth.uid();
    v_role          text := get_user_role(v_uid);
    v_old_status    public.approval_status;
    v_new_status    public.approval_status;
  begin
    if v_role not in ('admin','super_admin') then
      raise exception 'Not allowed'
        using errcode = '42501';
    end if;

    if p_approved and p_rejected then
      raise exception 'Job cannot be both approved and rejected';
    end if;

    select approval_status
    into v_old_status
    from public.jobs
    where id = p_job_id
    for update;

    if not found then
      raise exception 'Job not found'
        using errcode = 'P0001';
    end if;

    if p_approved and not p_rejected then
      v_new_status := 'approved';
    elsif p_rejected then
      v_new_status := 'rejected';
    else
      v_new_status := 'pending';
    end if;

    update public.jobs
    set
      approval_status = v_new_status,
      -- is_approved / is_rejected are derived by jobs_sync_flags_from_status
      is_active = case
                    when v_new_status = 'approved'
                      then coalesce(is_active, true)
                    else false
                  end,
      reviewed_by = v_uid,
      reviewed_at = now()
    where id = p_job_id;

    insert into public.activity_logs (id, profile_id, action, entity_type, entity_id, details)
    values (
      uuid_generate_v4(),
      v_uid,
      'job_approval',
      'job',
      p_job_id::text,
      jsonb_build_object(
        'approved',            p_approved,
        'rejected',            p_rejected,
        'old_approval_status', v_old_status,
        'new_approval_status', v_new_status,
        'reason',              p_reason
      )
    );
  end;
  $$;

  ---------------------------------------------------------------------------
  -- 3) Ensure protect_jobs_admin_columns is trigger-only.
  ---------------------------------------------------------------------------
  revoke all on function public.protect_jobs_admin_columns() from public;
  revoke all on function public.protect_jobs_admin_columns() from anon;
  revoke all on function public.protect_jobs_admin_columns() from authenticated;
  -- service_role / postgres keep implicit rights.
end;
$$;
