---------------------------------------------------------------------------
-- Events: notifications for lifecycle actions
-- - RSVP confirmation + cancellation
-- - Feedback submitted
-- - Event edited / deleted (owner + admins)
-- - Event approved broadcast to all active users
--
-- NOTE: This migration is designed to align with existing notifications
--       patterns and RLS. It uses the public.notify() helper, which
--       enforces delivery rules and inserts into public.notifications.
---------------------------------------------------------------------------

--------------------------------------------------------------------------
-- 1) Fix RSVP confirmation trigger to use attendance_status
---------------------------------------------------------------------------

create or replace function public.trg_event_attendee_invite_or_rsvp_notify()
returns trigger
language plpgsql
security definer
set search_path = 'public','pg_temp'
as $$
declare
  v_user   uuid := nullif(to_jsonb(new)->>'user_id','')::uuid;
  v_eid    uuid := nullif(to_jsonb(new)->>'event_id','')::uuid;
  v_status text := coalesce(nullif(to_jsonb(new)->>'attendance_status',''),'registered');
  v_title  text;
  v_msg    text;
begin
  if v_user is null then
    return new;
  end if;

  if v_status = 'invited' then
    v_title := 'Event invitation';
    v_msg   := 'You have been invited to an event.';
  elsif v_status in ('registered','going','checked_in','attending') then
    -- Default path when a user RSVPs or confirms attendance
    v_title := 'RSVP confirmed';
    v_msg   := 'You are registered for the event.';
  else
    -- For other statuses, do nothing here
    return new;
  end if;

  perform public.notify(
    v_user,
    'event',
    v_title,
    v_msg,
    case when v_eid is not null then '/events/' || v_eid::text else null end,
    jsonb_build_object(
      'entity_type', 'event',
      'entity_id',   coalesce(v_eid::text, ''),
      'status',      v_status
    )
  );

  return new;
end;
$$;


---------------------------------------------------------------------------
-- 2) RSVP cancellation → notify the attendee
---------------------------------------------------------------------------

create or replace function public.trg_event_attendee_cancel_notify()
returns trigger
language plpgsql
security definer
set search_path = 'public','pg_temp'
as $$
declare
  v_user uuid := nullif(to_jsonb(old)->>'user_id','')::uuid;
  v_eid  uuid := nullif(to_jsonb(old)->>'event_id','')::uuid;
begin
  if v_user is null then
    return old;
  end if;

  perform public.notify(
    v_user,
    'event',
    'RSVP cancelled',
    'You have cancelled your RSVP for this event.',
    case when v_eid is not null then '/events/' || v_eid::text else null end,
    jsonb_build_object(
      'entity_type', 'event',
      'entity_id',   coalesce(v_eid::text, ''),
      'status',      'cancelled'
    )
  );

  return old;
end;
$$;


do $$
begin
  if exists (
    select 1 from pg_trigger
    where tgname = 'event_attendee_cancel_notify_trg'
      and tgrelid = 'public.event_attendees'::regclass
  ) then
    drop trigger event_attendee_cancel_notify_trg on public.event_attendees;
  end if;

  create trigger event_attendee_cancel_notify_trg
  after delete on public.event_attendees
  for each row
  execute function public.trg_event_attendee_cancel_notify();
end;
$$;


---------------------------------------------------------------------------
-- 3) Feedback submitted → notify event owner/organizer
---------------------------------------------------------------------------

create or replace function public.trg_event_feedback_notify()
returns trigger
language plpgsql
security definer
set search_path = 'public','pg_temp'
as $$
declare
  v_owner_id     uuid;
  v_event_title  text;
  v_attendee_name text;
begin
  if new.event_id is null or new.user_id is null then
    return new;
  end if;

  -- Resolve event owner / organizer and title
  select
    coalesce(e.organizer_id, e.created_by, e.creator_id, e.user_id),
    e.title
  into v_owner_id, v_event_title
  from public.events e
  where e.id = new.event_id;

  if v_owner_id is null then
    return new;
  end if;

  -- Resolve attendee display name
  select coalesce(
           p.full_name,
           nullif(trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')), '')
         )
  into v_attendee_name
  from public.profiles p
  where p.id = new.user_id;

  perform public.notify(
    v_owner_id,
    'event',
    'New event feedback received',
    coalesce(v_attendee_name, 'An attendee') ||
      ' submitted feedback for "' || coalesce(v_event_title, 'this event') || '".',
    '/admin/events/' || new.event_id::text || '/feedback',
    jsonb_build_object(
      'entity_type',  'event',
      'entity_id',    new.event_id::text,
      'attendee_id',  new.user_id::text,
      'feedback_id',  new.id::text
    )
  );

  return new;
end;
$$;


do $$
begin
  if exists (
    select 1 from pg_trigger
    where tgname = 'event_feedback_notify_trg'
      and tgrelid = 'public.event_feedback'::regclass
  ) then
    drop trigger event_feedback_notify_trg on public.event_feedback;
  end if;

  create trigger event_feedback_notify_trg
  after insert on public.event_feedback
  for each row
  execute function public.trg_event_feedback_notify();
end;
$$;


---------------------------------------------------------------------------
-- 4) Event edited / deleted → notify owner + admins
---------------------------------------------------------------------------

create or replace function public.trg_event_owner_admin_notify()
returns trigger
language plpgsql
security definer
set search_path = 'public','pg_temp'
as $$
declare
  v_event_id     uuid;
  v_event_title  text;
  v_owner_id     uuid;
  v_actor_id     uuid;
  admin_rec      record;
  v_is_update    boolean := (tg_op = 'UPDATE');
  v_is_delete    boolean := (tg_op = 'DELETE');
  v_title_owner  text;
  v_msg_owner    text;
  v_title_admin  text;
  v_msg_admin    text;
begin
  if v_is_update then
    v_event_id    := new.id;
    v_event_title := coalesce(new.title, old.title, 'Event');
  else
    v_event_id    := old.id;
    v_event_title := coalesce(old.title, 'Event');
  end if;

  -- Resolve owner from OLD row (more stable across UPDATE/DELETE)
  select coalesce(old.organizer_id, old.created_by, old.creator_id, old.user_id)
  into v_owner_id;

  v_actor_id := nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;

  -- For UPDATE, skip if no meaningful business change
  if v_is_update then
    if new.title           is not distinct from old.title and
       new.start_date      is not distinct from old.start_date and
       new.end_date        is not distinct from old.end_date and
       new.status          is not distinct from old.status and
       new.is_published    is not distinct from old.is_published and
       new.approval_status is not distinct from old.approval_status and
       new.location        is not distinct from old.location and
       new.venue           is not distinct from old.venue then
      return new;
    end if;
  end if;

  -- Owner notification
  if v_owner_id is not null then
    if v_is_update then
      v_title_owner := 'Your event was updated';
      v_msg_owner   := 'Your event "' || v_event_title || '" has been updated.';
    else
      v_title_owner := 'Your event was deleted';
      v_msg_owner   := 'Your event "' || v_event_title || '" has been deleted or cancelled.';
    end if;

    perform public.notify(
      v_owner_id,
      'event_updated',
      v_title_owner,
      v_msg_owner,
      case when not v_is_delete then '/events/' || v_event_id::text else '/events' end,
      jsonb_build_object(
        'entity_type', 'event',
        'entity_id',   v_event_id::text,
        'op',          tg_op
      )
    );
  end if;

  -- Admin notifications
  if v_is_update then
    v_title_admin := 'Event updated';
    v_msg_admin   := 'Event "' || v_event_title || '" was updated.';
  else
    v_title_admin := 'Event deleted';
    v_msg_admin   := 'Event "' || v_event_title || '" was deleted or cancelled.';
  end if;

  for admin_rec in
    select id
    from public.profiles
    where (is_admin = true or role in ('admin','super_admin'))
      and coalesce(is_deleted, false) = false
  loop
    perform public.notify(
      admin_rec.id,
      'event_updated',
      v_title_admin,
      v_msg_admin,
      case when not v_is_delete then '/events/' || v_event_id::text else '/events' end,
      jsonb_build_object(
        'entity_type', 'event',
        'entity_id',   v_event_id::text,
        'op',          tg_op
      )
    );
  end loop;

  if v_is_update then
    return new;
  else
    return old;
  end if;
end;
$$;


do $$
begin
  if exists (
    select 1 from pg_trigger
    where tgname = 'event_owner_admin_notify_trg'
      and tgrelid = 'public.events'::regclass
  ) then
    drop trigger event_owner_admin_notify_trg on public.events;
  end if;

  create trigger event_owner_admin_notify_trg
  after update or delete on public.events
  for each row
  execute function public.trg_event_owner_admin_notify();
end;
$$;


---------------------------------------------------------------------------
-- 5) Event approved → broadcast to all active, non-deleted users
---------------------------------------------------------------------------

create or replace function public.notify_event_approved_broadcast(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = 'public','pg_temp'
as $$
declare
  v_event_title text;
  prof_rec      record;
begin
  select e.title
  into v_event_title
  from public.events e
  where e.id = p_event_id;

  if not found then
    return;
  end if;

  for prof_rec in
    select id
    from public.profiles
    where coalesce(is_deleted, false) = false
      and coalesce(is_active, true) = true
  loop
    perform public.notify(
      prof_rec.id,
      'event_created',
      'New event published',
      'Event "' || coalesce(v_event_title,'New event') || '" has been approved and is now available.',
      '/events/' || p_event_id::text,
      jsonb_build_object(
        'entity_type', 'event',
        'entity_id',   p_event_id::text,
        'event_title', v_event_title,
        'original_type', 'event_created'
      )
    );
  end loop;
end;
$$;


-- Extend approve_event() to invoke the broadcast helper

create or replace function public.approve_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  -- 1) Update the event
  update public.events
  set approval_status = 'approved',
      approved_at     = now()
  where id = p_event_id;

  -- 2) Resolve the moderation record
  update public.content_approvals
  set decision   = 'approved',
      resolved_at = now(),
      resolved_by = auth.uid()
  where content_type = 'event'
    and content_id   = p_event_id
    and resolved_at is null;

  -- 3) Broadcast to all active users
  perform public.notify_event_approved_broadcast(p_event_id);
end;
$$;
