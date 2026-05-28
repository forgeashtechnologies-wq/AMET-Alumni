-- Prevent students from becoming mentors and harden mentorship enrollment.
begin;

-- 1) Remove existing student mentors.
delete from public.mentors m
using public.profiles p
where p.id = m.user_id
  and lower(p.role::text) = 'student';

-- 2) Enforce guard via trigger (check constraints cannot reference other tables).
drop trigger if exists trg_prevent_student_mentors on public.mentors;
drop function if exists public.prevent_student_mentor();

create or replace function public.prevent_student_mentor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select lower(role::text) into v_role
  from public.profiles
  where id = new.user_id;

  if v_role is null then
    raise exception 'profile_missing';
  end if;

  if v_role = 'student' then
    raise exception 'students_cannot_be_mentors';
  end if;

  return new;
end;
$$;

create trigger trg_prevent_student_mentors
before insert or update on public.mentors
for each row
execute function public.prevent_student_mentor();

-- 3) Tighten RLS policies to ensure only non-students can insert/update their mentor profile.
drop policy if exists "Allow users to create their own mentor profile" on public.mentors;
drop policy if exists "Allow individual user to create their own mentor profile" on public.mentors;
drop policy if exists "Allow users to update their own mentor profile" on public.mentors;
drop policy if exists "Allow individual user to update their own mentor profile" on public.mentors;
drop policy if exists mentors_insert_non_student on public.mentors;
drop policy if exists mentors_update_non_student on public.mentors;

create policy mentors_insert_non_student
  on public.mentors
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) <> 'student'
    )
  );

create policy mentors_update_non_student
  on public.mentors
  for update
  to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) <> 'student'
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) <> 'student'
    )
  );

-- 4) Admin RPC guard to reject student targets.
create or replace function public.admin_update_mentor_status(
  p_user_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := lower(coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', ''));
  v_target_role text;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  if p_status is null or p_status = '' then
    raise exception 'p_status is required';
  end if;

  if v_role not in ('admin', 'super_admin') then
    raise exception 'not_authorized';
  end if;

  select lower(role::text) into v_target_role
  from public.profiles
  where id = p_user_id;

  if v_target_role is null then
    raise exception 'profile_not_found';
  end if;

  if v_target_role = 'student' then
    raise exception 'students_cannot_be_mentors';
  end if;

  update public.profiles
     set mentor_status = lower(p_status),
         updated_at = now()
   where id = p_user_id;

  if not found then
    raise exception 'profile_not_found';
  end if;
end;
$$;

-- 5) Replace direct PostgREST writes with RPC enforcing role rules.
drop function if exists public.save_mentor_profile();

create or replace function public.save_mentor_profile(
  p_mentoring_capacity_hours_per_month integer,
  p_expertise text[],
  p_mentoring_preferences jsonb,
  p_mentoring_experience_years integer,
  p_mentoring_statement text,
  p_max_mentees integer,
  p_mentoring_experience_description text
) returns public.mentors
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_existing public.mentors%rowtype;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select lower(role::text) into v_role
  from public.profiles
  where id = v_user_id;

  if v_role is null then
    raise exception 'profile_missing';
  end if;

  if v_role = 'student' then
    raise exception 'students_cannot_be_mentors';
  end if;

  select * into v_existing from public.mentors where user_id = v_user_id;

  if v_existing.user_id is null then
    insert into public.mentors (
      user_id,
      mentoring_capacity_hours_per_month,
      expertise,
      mentoring_preferences,
      mentoring_experience_years,
      mentoring_statement,
      max_mentees,
      mentoring_experience_description,
      status
    )
    values (
      v_user_id,
      p_mentoring_capacity_hours_per_month,
      p_expertise,
      p_mentoring_preferences,
      p_mentoring_experience_years,
      p_mentoring_statement,
      p_max_mentees,
      p_mentoring_experience_description,
      'pending'
    )
    returning * into v_existing;
  else
    update public.mentors
       set mentoring_capacity_hours_per_month = coalesce(p_mentoring_capacity_hours_per_month, mentoring_capacity_hours_per_month),
           expertise = coalesce(p_expertise, expertise),
           mentoring_preferences = coalesce(p_mentoring_preferences, mentoring_preferences),
           mentoring_experience_years = coalesce(p_mentoring_experience_years, mentoring_experience_years),
           mentoring_statement = coalesce(p_mentoring_statement, mentoring_statement),
           max_mentees = coalesce(p_max_mentees, max_mentees),
           mentoring_experience_description = coalesce(p_mentoring_experience_description, mentoring_experience_description),
           status = case when status = 'rejected' then 'pending' else status end,
           updated_at = now()
     where user_id = v_user_id
     returning * into v_existing;
  end if;

  return v_existing;
end;
$$;

commit;
