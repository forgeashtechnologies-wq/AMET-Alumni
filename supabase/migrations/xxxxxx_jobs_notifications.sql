---------------------------------------------------------------------------
-- 1) Job applications: notify job owner on new application and
--    notify applicant on status changes.
---------------------------------------------------------------------------

create or replace function public.trg_job_applications_notifications()
returns trigger
language plpgsql
security definer
set search_path = 'public','pg_temp'
as $$
declare
  v_job          public.jobs%rowtype;
  v_owner_id     uuid;
  v_title        text;
  v_message      text;
begin
  -- Guard: job_id must be present
  if (tg_op = 'INSERT' or tg_op = 'UPDATE') and new.job_id is null then
    return new;
  end if;

  -- Load job row once
  select *
  into v_job
  from public.jobs j
  where j.id = coalesce(new.job_id, old.job_id);

  if not found then
    return new;
  end if;

  v_owner_id := coalesce(v_job.created_by, v_job.posted_by, v_job.user_id);

  ------------------------------------------------------------------------
  -- Case A: New application submitted → notify job owner (job_applied)
  ------------------------------------------------------------------------
  if tg_op = 'INSERT' then
    if v_owner_id is null or v_owner_id = new.applicant_id then
      return new;
    end if;

    v_title := 'New application received';
    v_message := coalesce(v_job.title, 'Your job') || ' received a new application.';

    begin
      insert into public.notifications (
        title,
        message,
        type,
        module,
        recipient_id,
        subject_user_id,
        metadata
      )
      values (
        v_title,
        v_message,
        'job_applied',
        'jobs',
        v_owner_id,
        new.applicant_id,
        jsonb_build_object(
          'entity_id', new.job_id::text,
          'entity_type', 'job',
          'status', new.status,
          'original_type', 'job_applied'
        )
      );
    exception when others then
      -- Do not block primary write on notification failure
      null;
    end;

    return new;
  end if;

  ------------------------------------------------------------------------
  -- Case B: Application status changed → notify applicant (application_status)
  ------------------------------------------------------------------------
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.applicant_id is null then
      return new;
    end if;

    v_title := 'Application status updated';
    v_message := 'Your application''s status is now ' || coalesce(new.status, 'updated') || '.';

    begin
      insert into public.notifications (
        title,
        message,
        type,
        module,
        recipient_id,
        subject_user_id,
        metadata
      )
      values (
        v_title,
        v_message,
        'application_status',
        'jobs',
        new.applicant_id,
        null,
        jsonb_build_object(
          'entity_id', new.job_id::text,
          'entity_type', 'job',
          'status', new.status,
          'original_type', 'application_status'
        )
      );
    exception when others then
      null;
    end;
  end if;

  return new;
end;
$$;

-- Recreate trigger on job_applications
do $$
begin
  if exists (
    select 1 from pg_trigger
    where tgname = 'trg_job_applications_notifications'
      and tgrelid = 'public.job_applications'::regclass
  ) then
    drop trigger trg_job_applications_notifications on public.job_applications;
  end if;

  create trigger trg_job_applications_notifications
  after insert or update of status on public.job_applications
  for each row
  execute function public.trg_job_applications_notifications();
end;
$$;

---------------------------------------------------------------------------
-- 2) Jobs: notify job owner on job creation and on approval status change.
---------------------------------------------------------------------------

create or replace function public.trg_jobs_notifications()
returns trigger
language plpgsql
security definer
set search_path = 'public','pg_temp'
as $$
declare
  v_owner_id uuid;
  v_title    text;
  v_message  text;
begin
  v_owner_id := coalesce(new.created_by, new.posted_by, new.user_id);

  ----------------------------------------------------------------------
  -- Case A: New job inserted  notify owner (job_posted)
  ----------------------------------------------------------------------
  if tg_op = 'INSERT' then
    if v_owner_id is null then
      return new;
    end if;

    v_title := 'Job posted';
    v_message := coalesce(new.title, 'Your job') || ' has been created and is pending review.';

    begin
      insert into public.notifications (
        title,
        message,
        type,
        module,
        recipient_id,
        subject_user_id,
        metadata
      )
      values (
        v_title,
        v_message,
        'job_posted',
        'jobs',
        v_owner_id,
        null,
        jsonb_build_object(
          'entity_id', new.id::text,
          'entity_type', 'job',
          'status', new.approval_status::text,
          'original_type', 'job_posted'
        )
      );
    exception when others then
      null;
    end;

    -- Also notify admins that a new job has been posted and is pending review
    begin
      perform public.notify_admin(
        'alert',
        'New job posted',
        coalesce(new.title, 'New job') || ' was posted and is pending review.',
        '/admin/jobs',
        'info',
        'job',
        new.id,
        true,
        jsonb_build_object(
          'status', coalesce(new.approval_status::text, 'pending'),
          'original_type', 'job_posted'
        )
      );
    exception when others then
      null;
    end;

    return new;
  end if;

  ----------------------------------------------------------------------
  -- Case B: approval_status changed → notify owner (job_approved / job)
  ----------------------------------------------------------------------
  if tg_op = 'UPDATE' and new.approval_status is distinct from old.approval_status then
    if v_owner_id is null then
      return new;
    end if;

    if new.approval_status = 'approved' then
      v_title := 'Job approved';
      v_message := coalesce(new.title, 'Your job') || ' has been approved and is now visible to candidates.';

      begin
        insert into public.notifications (
          title,
          message,
          type,
          module,
          recipient_id,
          subject_user_id,
          metadata
        )
        values (
          v_title,
          v_message,
          'job_approved',
          'jobs',
          v_owner_id,
          null,
          jsonb_build_object(
            'entity_id', new.id::text,
            'entity_type', 'job',
            'status', new.approval_status::text,
            'original_type', 'job_approved'
          )
        );
      exception when others then
        null;
      end;
    elsif new.approval_status = 'rejected' then
      v_title := 'Job rejected';
      v_message := coalesce(new.title, 'Your job') || ' has been rejected by an administrator.';

      begin
        insert into public.notifications (
          title,
          message,
          type,
          module,
          recipient_id,
          subject_user_id,
          metadata
        )
        values (
          v_title,
          v_message,
          'job',
          'jobs',
          v_owner_id,
          null,
          jsonb_build_object(
            'entity_id', new.id::text,
            'entity_type', 'job',
            'status', new.approval_status::text,
            'original_type', 'job_approval'
          )
        );
      exception when others then
        null;
      end;
    else
      -- Other approval_status transitions (e.g. back to pending)
      v_title := 'Job status updated';
      v_message := coalesce(new.title, 'Your job') || ' approval status changed.';

      begin
        insert into public.notifications (
          title,
          message,
          type,
          module,
          recipient_id,
          subject_user_id,
          metadata
        )
        values (
          v_title,
          v_message,
          'job',
          'jobs',
          v_owner_id,
          null,
          jsonb_build_object(
            'entity_id', new.id::text,
            'entity_type', 'job',
            'status', new.approval_status::text,
            'original_type', 'job_approval'
          )
        );
      exception when others then
        null;
      end;
    end if;
  end if;

  return new;
end;
$$;

-- Recreate trigger on jobs
do $$
begin
  if exists (
    select 1 from pg_trigger
    where tgname = 'trg_jobs_notifications'
      and tgrelid = 'public.jobs'::regclass
  ) then
    drop trigger trg_jobs_notifications on public.jobs;
  end if;

  create trigger trg_jobs_notifications
  after insert or update of approval_status on public.jobs
  for each row
  execute function public.trg_jobs_notifications();
end;
$$;
