-- Remaining FK index hardening for AMS-AMET (live)
-- Safe, idempotent: all indexes use IF NOT EXISTS.

-- clarification_requests
CREATE INDEX IF NOT EXISTS idx_clarification_requests_user
  ON public.clarification_requests (user_id);

-- csv_import_history
CREATE INDEX IF NOT EXISTS idx_csv_import_history_user
  ON public.csv_import_history (user_id);

-- event_groups
CREATE INDEX IF NOT EXISTS idx_event_groups_created_by
  ON public.event_groups (created_by);

-- events (creator/reviewer)
CREATE INDEX IF NOT EXISTS idx_events_created_by
  ON public.events (created_by);

CREATE INDEX IF NOT EXISTS idx_events_creator_id
  ON public.events (creator_id);

CREATE INDEX IF NOT EXISTS idx_events_reviewed_by
  ON public.events (reviewed_by);

-- group invitations / content
CREATE INDEX IF NOT EXISTS idx_group_invitations_inviter_id
  ON public.group_invitations (inviter_id);

CREATE INDEX IF NOT EXISTS idx_group_post_reports_reporter_id
  ON public.group_post_reports (reporter_id);

CREATE INDEX IF NOT EXISTS idx_group_posts_parent_post_id
  ON public.group_posts (parent_post_id);

-- groups moderation
CREATE INDEX IF NOT EXISTS idx_groups_approved_by
  ON public.groups (approved_by);

CREATE INDEX IF NOT EXISTS idx_groups_reviewed_by
  ON public.groups (reviewed_by);

-- job applications audit
CREATE INDEX IF NOT EXISTS idx_job_application_audit_application_id
  ON public.job_application_audit (application_id);

CREATE INDEX IF NOT EXISTS idx_job_application_audit_job_id
  ON public.job_application_audit (job_id);

-- jobs moderation and ownership
CREATE INDEX IF NOT EXISTS idx_jobs_reviewed_by
  ON public.jobs (reviewed_by);

CREATE INDEX IF NOT EXISTS idx_jobs_user_id
  ON public.jobs (user_id);

-- mentor profiles
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_user_id
  ON public.mentor_profiles (user_id);

-- mentorship feedback & messages
CREATE INDEX IF NOT EXISTS idx_mentorship_feedback_request_id
  ON public.mentorship_feedback (mentorship_request_id);

CREATE INDEX IF NOT EXISTS idx_mentorship_feedback_submitted_by
  ON public.mentorship_feedback (submitted_by);

CREATE INDEX IF NOT EXISTS idx_mentorship_messages_request_id
  ON public.mentorship_messages (mentorship_request_id);

CREATE INDEX IF NOT EXISTS idx_mentorship_messages_sender_id
  ON public.mentorship_messages (sender_id);

-- notification events
CREATE INDEX IF NOT EXISTS idx_notification_events_actor_profile_id
  ON public.notification_events (actor_profile_id);

-- profiles admin actions
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_by
  ON public.profiles (deleted_by);

CREATE INDEX IF NOT EXISTS idx_profiles_verification_reviewed_by
  ON public.profiles (verification_reviewed_by);

-- resources
CREATE INDEX IF NOT EXISTS idx_resources_created_by
  ON public.resources (created_by);

-- system alerts
CREATE INDEX IF NOT EXISTS idx_system_alerts_resolved_by
  ON public.system_alerts (resolved_by);

-- user_feedback
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id
  ON public.user_feedback (user_id);
