export const IST_OFFSET = '+05:30';

export const parseDeadline = (deadline?: string | null): Date | null => {
  if (!deadline) return null;
  const s = String(deadline);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T23:59:59.999${IST_OFFSET}`);
  }
  return new Date(s);
};

export const isDeadlinePassed = (deadline?: string | null, now: Date = new Date()): boolean => {
  const d = parseDeadline(deadline);
  return d ? now.getTime() > d.getTime() : false;
};

export const isStatusActive = (job: any) => !job?.status || job?.status === 'active';
export const isApproved = (job: any) => job?.is_approved === true;
export const isActiveFlag = (job: any) => job?.is_active !== false;

export const isOpen = (job: any, now: Date = new Date()): boolean =>
  isStatusActive(job)
  && isApproved(job)
  && isActiveFlag(job)
  && !isDeadlinePassed(job?.deadline || job?.application_deadline || job?.expires_at, now);
