-- Index cleanup round 2 for AMS-AMET
-- Focus: remaining duplicate indexes flagged by Supabase advisors.
-- NOTE: Run during a low-traffic window; this migration may briefly lock affected tables.

-----------------------------
-- events
-----------------------------
-- is_published: keep idx_events_is_published
DROP INDEX IF EXISTS public.events_is_published_idx;

-- organizer_id: keep idx_events_organizer_id
DROP INDEX IF EXISTS public.events_organizer_id_idx;

-- start_date: keep idx_events_start_date
DROP INDEX IF EXISTS public.events_start_date_idx;
DROP INDEX IF EXISTS public.idx_events_start;

-----------------------------
-- group_comments
-----------------------------
-- post_id + created_at: keep idx_group_comments_post_created_at
DROP INDEX IF EXISTS public.idx_group_comments_post;

-----------------------------
-- group_members
-----------------------------
-- Keep group_members_pkey as the single canonical unique on (group_id, user_id)
ALTER TABLE public.group_members
  DROP CONSTRAINT IF EXISTS group_members_group_user_unique;
DROP INDEX IF EXISTS public.idx_group_members_group_user;
DROP INDEX IF EXISTS public.ix_group_members_group_user;
DROP INDEX IF EXISTS public.uq_group_members_gid_uid;
DROP INDEX IF EXISTS public.uq_group_members_group_user;
DROP INDEX IF EXISTS public.uq_group_members_pair;

-----------------------------
-- group_memberships
-----------------------------
-- Keep group_memberships_group_id_user_id_key as the single unique on (group_id, user_id)
ALTER TABLE public.group_memberships
  DROP CONSTRAINT IF EXISTS group_memberships_group_user_unique;
DROP INDEX IF EXISTS public.ix_group_memberships_group_user;
DROP INDEX IF EXISTS public.uq_group_memberships_gid_uid;

-----------------------------
-- jobs
-----------------------------
-- company: keep idx_jobs_company_id
DROP INDEX IF EXISTS public.idx_jobs_company;

-- is_active + is_approved: keep idx_jobs_is_active_approved
DROP INDEX IF EXISTS public.idx_jobs_active_approved;

-- location: keep idx_jobs_location_ilike
DROP INDEX IF EXISTS public.idx_jobs_loc;

-- open_at + close_at: keep idx_jobs_open_close_at
DROP INDEX IF EXISTS public.idx_jobs_open_close;

-----------------------------
-- mentors
-----------------------------
-- Keep ux_mentors_user_id as the single unique(user_id)
DROP INDEX IF EXISTS public.idx_mentors_user_id_unique;
ALTER TABLE public.mentors
  DROP CONSTRAINT IF EXISTS mentors_user_id_key;
DROP INDEX IF EXISTS public.mentors_user_id_uidx;
ALTER TABLE public.mentors
  DROP CONSTRAINT IF EXISTS mentors_user_unique;

-----------------------------
-- mentorship_relationships
-----------------------------
-- Active relationships with end_date IS NULL: keep ux_mentorship_relationships_active
DROP INDEX IF EXISTS public.idx_mentorship_relationships_active_unique;
DROP INDEX IF EXISTS public.mentorship_relationships_mentor_mentee_active_uidx;
DROP INDEX IF EXISTS public.mentorship_relationships_unique_active;

-- Active relationships without end_date condition: keep ux_mentorship_relationships_active_pair
DROP INDEX IF EXISTS public.idx_mentorship_relationships_unique_active;

-----------------------------
-- mentorship_requests
-----------------------------
-- mentor_id + mentee_id + status: keep idx_mentorship_requests_parties_status
DROP INDEX IF EXISTS public.idx_mentorship_requests_user;
