-- Adds responded_at column for tracking invitation acceptance/rejection timestamps
begin;

alter table public.group_invitations
  add column if not exists responded_at timestamptz;

commit;
