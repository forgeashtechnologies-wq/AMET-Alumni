import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import useJobsRealtime from '../../hooks/useJobsRealtime';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  MapPinIcon,
  BriefcaseIcon,
  ClockIcon,
  ShareIcon,
  PlusIcon,
  BellIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { CircularProgress } from '@mui/material';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { coalesceAppUrl, isQuickLink, getJobLogoUrl, getJobCompanyName, getSourceType, computeJobApplyState, normalizeJob } from '../../utils/jobs';
import { toggleJobVisibility } from '../../services/jobService';
import { sanitizeJobDescription } from '../../utils/sanitize';
import { mapJobError } from '../../utils/jobErrors';
import logger from '../../utils/logger';
import { useApproval } from '../../hooks/useApproval';
import { getApplicantsCount } from '../../utils/applicants';
import { requestConnectionForJob } from '../../utils/connections';
import toast from 'react-hot-toast';
import { useNotification } from '../common/NotificationCenter';
import { shareJob } from '../../utils/share';
import BookmarkButton from './BookmarkButton';
import { toggleBookmarkRPC } from '../../utils/bookmarks';
import ApplyDialog from './ApplyDialog';
import { getAppliedJobIdsForCurrentUser } from '../../utils/jobApplications';

/* ---------- Helpers ---------- */
const timeAgo = (date) => {
  if (!date) return '';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  return Math.floor(seconds) + ' seconds ago';
};

const filterOptions = {
  jobType: [
    { value: 'all', label: 'All Job Types' },
    { value: 'full-time', label: 'Full-Time' },
    { value: 'part-time', label: 'Part-Time' },
    { value: 'contract', label: 'Contract' },
    { value: 'internship', label: 'Internship' },
    { value: 'temporary', label: 'Temporary' },
  ],
  experience: [
    { value: 'all', label: 'All Experience Levels' },
    { value: 'entry', label: 'Entry Level' },
    { value: 'mid', label: 'Mid Level' },
    { value: 'senior', label: 'Senior Level' },
    { value: 'director+', label: 'Director+' },
  ],
  salaryRange: [
    { value: 'all', label: 'All Salary Ranges' },
    { value: '0-300000', label: 'Up to 3L' },
    { value: '300000-600000', label: '3L to 6L' },
    { value: '600000-1000000', label: '6L to 10L' },
    { value: '1000000-1500000', label: '10L to 15L' },
    { value: '1500000-', label: 'Above 15L' },
  ],
  postedWithin: [
    { value: 'all', label: 'Anytime' },
    { value: '1', label: 'Today' },
    { value: '7', label: 'Last Week' },
    { value: '30', label: 'Last Month' },
    { value: '90', label: 'Last 3 Months' },
  ],
};

const resolveJobLogo = (row) =>
  row?.logo_url ??
  row?.logoUrl ??
  row?.company_logo_url ??
  row?.companyLogoUrl ??
  row?.job_logo_url ??
  null;

/* ---------- Small subcomponents that need the bookmark state passed in ---------- */
// Format a date in Asia/Kolkata as dd MMM yyyy
const formatKolkata = (iso) => {
  try {
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(iso));
  } catch (_) { return new Date(iso).toLocaleDateString(); }
};

// Consider date-only deadlines as end-of-day Asia/Kolkata time for closing logic
const isDeadlinePassed = (isoLike) => {
  if (!isoLike) return false;
  try {
    const s = String(isoLike);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      // Treat as end-of-day IST
      const ist = new Date(`${s}T23:59:59.999+05:30`);
      return ist < new Date();
    }
    const d = new Date(s);
    // If explicit midnight time, also treat as end-of-day IST to avoid early close
    if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const ist = new Date(`${yyyy}-${mm}-${dd}T23:59:59.999+05:30`);
      return ist < new Date();
    }
    return d < new Date();
  } catch {
    return false;
  }
};

const getJobStatusMeta = (job, { isAdmin = false, isEmployer = false } = {}) => {
  const approved = job?.is_approved === true;
  const rejected = job?.is_rejected === true;
  const active = job?.is_active === true;

  // Rejected always wins
  if (rejected) {
    return { label: 'Rejected', tone: 'danger' };
  }

  // Pending approval (not approved yet, regardless of visibility)
  if (!approved) {
    return { label: 'Pending approval', tone: 'warning' };
  }

  // Approved but active vs paused
  if (approved && active) {
    return { label: 'Live', tone: 'success' };
  }

  if (approved && !active) {
    return { label: 'Paused', tone: 'muted' };
  }

  // Fallback
  return { label: 'Pending approval', tone: 'warning' };
};

const StatusBadge = ({ job, isAdmin, isEmployer }) => {
  const { label, tone } = getJobStatusMeta(job, { isAdmin, isEmployer });

  const toneClasses = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    muted: 'bg-slate-50 text-slate-600 border-slate-200',
  }[tone] || 'bg-slate-50 text-slate-600 border-slate-200';

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses}`}>
      {label}
    </span>
  );
};

const JobCard = ({ job, handleBookmark, isBookmarked, onSkillClick, hasApplied = false, onApplied, showMatchExplanation = false }) => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const employerId = job?.posted_by || job?.user_id || job?.created_by || job?.employer_id;
  const isOwner = !!(user?.id && (
    [job?.created_by, job?.posted_by, job?.user_id, job?.employer_id, job?.__auth_user_id].some(v => v === user.id)
    || job?.is_owner === true
  ));
  const isApplicantRole = ['alumni', 'student'].includes(userRole);
  const [localIsActive, setLocalIsActive] = useState(job?.is_active ?? true);
  useEffect(() => {
    setLocalIsActive(job?.is_active ?? true);
  }, [job?.id, job?.is_active]);

  const jobView = useMemo(() => ({ ...job, is_active: localIsActive }), [job, localIsActive]);
  const applyState = computeJobApplyState(jobView);
  const quick = applyState.isQuickLink;
  const { canApplyInApp, canApplyExternally, isClosed } = applyState;
  const ownerOrAdmin = isOwner || ['admin', 'super_admin'].includes(userRole);
  const pauseJob = async () => {
    if (localIsActive === false) return;
    try {
      const result = await toggleJobVisibility(job.id, false);
      if (!result.success) {
        throw new Error(result.error || 'Failed to pause listing');
      }
      setLocalIsActive(false);
      if (job) job.is_active = false;
      toast.success('Listing paused.');
    } catch (e) {
      logger.error('Pause listing failed', e);
      toast.error(mapJobError(e));
    }
  };

  const resumeJob = async () => {
    if (localIsActive === true || job?.is_active == null) return;
    try {
      const result = await toggleJobVisibility(job.id, true);
      if (!result.success) {
        throw new Error(result.error || 'Failed to resume listing');
      }
      setLocalIsActive(true);
      if (job) job.is_active = true;
      toast.success('Listing resumed.');
    } catch (e) {
      logger.error('Resume listing failed', e);
      toast.error(mapJobError(e));
    }
  };
  

  const [applyOpen, setApplyOpen] = useState(false);
  const [visibilityDialog, setVisibilityDialog] = useState({ open: false, mode: null });
  const href = coalesceAppUrl(job);
  const titleTrim = (job.title || '').trim();
  const companyNameRaw = (getJobCompanyName(job) || '').trim();
  const showCompanyName = !!companyNameRaw && companyNameRaw !== titleTrim;
  const descTrim = (job.description || '').trim();
  const matchKeywords = Array.isArray(job.matched_on)
    ? job.matched_on.filter(Boolean).map(k => String(k).trim()).filter(Boolean)
    : [];
  const showDescription = !!descTrim;
  const coalescedDeadline = jobView?.deadline || jobView?.application_deadline || null;

  const rejected = job?.is_rejected === true;
  const isPaused = localIsActive === false && !rejected;
  const canToggleVisibility = ownerOrAdmin && !rejected;

  if (!job) return null;
  return (
    <div className="group relative bg-white rounded-2xl shadow-sm hover:shadow-md transition-[box-shadow,border-color] duration-200 border border-gray-200/80 hover:border-ocean-200 h-full flex flex-col">
      <div className="flex items-start justify-between mb-3 px-5 pt-5 pb-3">
          <div className="flex items-center flex-1 gap-3">
            <div className="w-12 h-12 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center overflow-hidden">
              {getJobLogoUrl(job) ? (
                <img
                  src={getJobLogoUrl(job)}
                  alt={getJobCompanyName(job) || 'Company logo'}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              ) : (
                <span className="text-[10px] text-gray-400 text-center px-1 leading-tight">
                  Logo
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 text-[15px] line-clamp-2" title={job.title}>{job.title}</h3>
            </div>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            {showCompanyName && (
              <Link to={`/companies/${job.company_id}`} className="text-ocean-600 font-medium hover:underline text-xs truncate">
                {companyNameRaw}
              </Link>
            )}
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] flex-shrink-0 bg-slate-50 text-slate-600 border border-slate-200">
              {quick ? 'Quick link' : 'In-app'}
            </span>
            {showMatchExplanation && matchKeywords.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-ocean-50 text-ocean-700 border border-ocean-200">
                🎓{' '}
                <span className="truncate max-w-[140px]" title={`Matched keywords: ${matchKeywords.join(', ')}`}>
                  {matchKeywords.slice(0, 3).join(', ')}{matchKeywords.length > 3 ? '…' : ''}
                </span>
              </span>
            )}
          </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
          <StatusBadge
            job={job}
            isAdmin={['admin', 'super_admin'].includes(userRole)}
            isEmployer={userRole === 'employer'}
          />
          <div className="flex items-center gap-1">
            <button onClick={() => shareJob(job)} className="inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2" aria-label="Share job">
              <ShareIcon className="w-4 h-4 text-gray-500" />
            </button>

            <BookmarkButton
              jobId={job.id}
              isBookmarked={isBookmarked}
              handleBookmark={handleBookmark}
            />
          </div>
          {canToggleVisibility && (
            <button
              onClick={() =>
                setVisibilityDialog({
                  open: true,
                  mode: isPaused ? 'resume' : 'pause',
                })
              }
              className="inline-flex items-center justify-center h-7 px-2 rounded-full border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white/80"
              title={isPaused ? 'Resume listing' : 'Pause listing'}
            >
              {isPaused ? 'Resume listing' : 'Pause listing'}
            </button>
          )}
        </div>
      </div>

      <p className="text-gray-700 text-sm mb-2 px-5 line-clamp-4">{showDescription ? sanitizeJobDescription(descTrim) : 'No description provided.'}</p>
      {quick && (
        <div className="px-5 mb-4">
          <p className="text-xs text-gray-500">
            External listing. You will be redirected to the employer's site to apply.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4 px-5 text-sm">
        {!!job.location && (
          <div className="flex items-center text-gray-700">
            <MapPinIcon className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">{job.location}</span>
          </div>
        )}
        {!!job.job_type && (
          <div className="flex items-center text-gray-700">
            <BriefcaseIcon className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="capitalize truncate">{job.job_type}</span>
          </div>
        )}
        {!!job.experience_level && (
          <div className="flex items-center text-gray-700">
            <ClockIcon className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="capitalize truncate">{job.experience_level}</span>
          </div>
        )}
        {(job?.salary_display_inr || job?.salary_range || (job?.salary_min != null && job?.salary_max != null)) && (
          <div className="flex items-center text-gray-700 col-span-2">
            <CurrencyDollarIcon className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>
              {job?.salary_display_inr ||
               job?.salary_range ||
               (job?.salary_min != null && job?.salary_max != null
                 ? `₹${Number(job.salary_min).toLocaleString('en-IN')} – ₹${Number(job.salary_max).toLocaleString('en-IN')}`
                 : job?.salary_min != null
                   ? `₹${Number(job.salary_min).toLocaleString('en-IN')}+`
                   : `Up to ₹${Number(job?.salary_max).toLocaleString('en-IN')}`)
              }
            </span>
          </div>
        )}
        {coalescedDeadline && (
          <div className="flex items-center text-gray-700 col-span-2">
            <CalendarIcon className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>Deadline: {formatKolkata(coalescedDeadline)}</span>
          </div>
        )}
      </div>

      {(() => {
        const raw = job.skills;
        const arr = Array.isArray(raw)
          ? raw
          : typeof raw === 'string'
            ? raw.split(',').map((s) => s.trim()).filter(Boolean)
            : [];
        if (!arr.length) return null;
        return (
          <div className="px-5 mb-3">
            <p className="text-xs font-medium text-gray-500 mb-1">Skills required</p>
            <div className="flex flex-wrap gap-1">
              {arr.slice(0, 5).map((skill, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSkillClick && onSkillClick(skill)}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-ocean-50 text-ocean-700 border border-ocean-100 hover:bg-ocean-100 hover:border-ocean-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ocean-500"
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="mt-auto border-t border-gray-100 pt-4 px-5 pb-5">
        <div className="flex justify-between items-center mb-3">
          {(() => { const count = getApplicantsCount(job); return (count !== null && count > 0) ? (
            <span className="text-sm text-gray-600">{count} applicant{count === 1 ? '' : 's'}</span>
          ) : <span />; })()}
        </div>
        <div className="space-y-2">
          {isApplicantRole && employerId && !isOwner && (
            <button
              onClick={async () => {
                try { await requestConnectionForJob(job.id, employerId, user?.id); } catch (error) {
                  logger.error('Failed to request connection:', error);
                  toast.error('Connection request failed. Please try again.');
                }
                navigate(`/messages?peer=${employerId}&job=${job.id}`);
              }}
              className="w-full inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg border-2 border-ocean-600 text-ocean-600 hover:bg-ocean-600 hover:text-white text-sm transition-[colors,opacity,transform,shadow] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
            >
              Ask employer
            </button>
          )}
          <Link to={`/jobs/${job.id}`} className="w-full inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg btn-ocean-outline text-sm">View details</Link>
          {quick ? (
            canApplyExternally ? (
              <button
                onClick={() => { const url = href; if (!url) return; const ok = window.confirm("External listing. You will be redirected to the employer's site to apply. Continue?"); if (ok) window.open(url, '_blank', 'noopener'); }}
                aria-label="Apply on employer site"
                className="w-full inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-gradient-to-b from-ocean-500 to-ocean-600 text-white text-sm hover:from-ocean-600 hover:to-ocean-700 transition-[colors,opacity,transform,shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white/80"
              >
                Click here to apply
              </button>
            ) : (
              <button disabled className="w-full inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg border-2 border-gray-200 text-gray-400 text-sm cursor-not-allowed">Applications closed</button>
            )
          ) : (userRole === 'employer' && isOwner) || (['admin', 'super_admin'].includes(userRole)) ? (
            <Link to={`/jobs/${job.id}/applications`} className="w-full inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-gradient-to-b from-ocean-500 to-ocean-600 text-white text-sm hover:from-ocean-600 hover:to-ocean-700 transition-[colors,opacity,transform,shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white/80">Manage applications</Link>
          ) : (userRole === 'employer' && !isOwner) ? (
            !isClosed ? (
              <button
                type="button"
                className="w-full inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-gradient-to-b from-ocean-500 to-ocean-600 text-white text-sm hover:from-ocean-600 hover:to-ocean-700 transition-[colors,opacity,transform,shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
                aria-label="Accepting applications"
                aria-disabled="true"
              >
                Accepting applications
              </button>
            ) : (
              <button
                type="button"
                className="w-full inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg border-2 border-gray-200 text-gray-500 text-sm cursor-not-allowed"
                aria-label="Applications closed"
                aria-disabled="true"
              >
                Applications closed
              </button>
            )
          ) : hasApplied ? (
            <button disabled className="w-full inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg border-2 border-gray-200 text-gray-400 text-sm cursor-not-allowed">Application submitted</button>
          ) : canApplyInApp ? (
            <button
              onClick={() => setApplyOpen(true)}
              className="w-full inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-gradient-to-b from-ocean-500 to-ocean-600 text-white text-sm hover:from-ocean-600 hover:to-ocean-700 transition-[colors,opacity,transform,shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white/80"
            >
              Apply now
            </button>
          ) : (
            <button disabled className="w-full inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg border-2 border-gray-200 text-gray-400 text-sm cursor-not-allowed">Applications closed</button>
          )}
          {!quick && (
            <ApplyDialog
              open={applyOpen}
              onClose={() => setApplyOpen(false)}
              jobId={job.id}
              deadline={coalescedDeadline}
              onSuccess={() => { if (onApplied) onApplied(job.id); }}
            />
          )}
          
        </div>
      </div>

      {visibilityDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {visibilityDialog.mode === 'pause'
                ? 'Pause this listing?'
                : 'Resume this listing?'}
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              {visibilityDialog.mode === 'pause'
                ? 'Applicants will no longer see Apply on this listing.'
                : 'This listing will become visible again to eligible candidates.'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setVisibilityDialog({ open: false, mode: null })}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const mode = visibilityDialog.mode;
                  setVisibilityDialog({ open: false, mode: null });
                  if (mode === 'pause') {
                    await pauseJob();
                  } else if (mode === 'resume') {
                    await resumeJob();
                  }
                }}
                className="px-4 py-2 rounded-lg bg-ocean-600 text-white text-sm font-medium hover:bg-ocean-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
              >
                {visibilityDialog.mode === 'pause' ? 'Pause listing' : 'Resume listing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const JobListItem = ({ job, handleBookmark, isBookmarked, onSkillClick, hasApplied = false, onApplied, showMatchExplanation = false }) => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const employerId = job?.posted_by || job?.user_id || job?.created_by || job?.employer_id;
  const isOwner = !!(user?.id && (
    [job?.created_by, job?.posted_by, job?.user_id, job?.employer_id, job?.__auth_user_id].some(v => v === user.id)
    || job?.is_owner === true
  ));
  const applyState = computeJobApplyState(job);
  const quick = applyState.isQuickLink;
  const { canApplyInApp, canApplyExternally, isClosed } = applyState;
  const matchKeywords = Array.isArray(job.matched_on)
    ? job.matched_on.filter(Boolean).map(k => String(k).trim()).filter(Boolean)
    : [];
  const ownerOrAdmin = isOwner || ['admin', 'super_admin'].includes(userRole);
  const pauseJob = async () => {
    if (job?.is_active === false) return;
    try {
      const result = await toggleJobVisibility(job.id, false);
      if (!result.success) {
        throw new Error(result.error || 'Failed to pause listing');
      }
      toast.success('Listing paused.');
    } catch (e) {
      logger.error('Pause listing failed', e);
      toast.error(mapJobError(e));
    }
  };

  const resumeJob = async () => {
    if (job?.is_active === true || job?.is_active == null) return;
    try {
      const result = await toggleJobVisibility(job.id, true);
      if (!result.success) {
        throw new Error(result.error || 'Failed to resume listing');
      }
      toast.success('Listing resumed.');
    } catch (e) {
      logger.error('Resume listing failed', e);
      toast.error(mapJobError(e));
    }
  };
  const [applyOpen, setApplyOpen] = useState(false);
  const [visibilityDialog, setVisibilityDialog] = useState({ open: false, mode: null });

  const coalescedDeadline = job?.deadline || job?.application_deadline || null;
  const rejected = job?.is_rejected === true;
  const isPaused = job?.is_active === false && !rejected;
  const canToggleVisibility = ownerOrAdmin && !rejected;

  if (!job) return null;
  return (
    <div className="glass-card rounded-lg p-4 hover:shadow-lg transition-shadow flex flex-col sm:flex-row items-start gap-4 border border-transparent min-h-[140px]">
      <div className="w-12 h-12 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0">
        {getJobLogoUrl(job) ? (
          <img
            src={getJobLogoUrl(job)}
            alt={getJobCompanyName(job) || 'Company logo'}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        ) : (
          <span className="text-[10px] text-gray-400 text-center px-1 leading-tight">
            Logo
          </span>
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link to={`/jobs/${job.id}`} className="text-lg font-bold text-gray-900 hover:text-ocean-600 transition-colors duration-200 line-clamp-1" title={job.title}>
              {job.title}
            </Link>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-slate-50 text-slate-600 border border-slate-200">
              {quick ? 'Quick link' : 'In-app'}
            </span>
          </div>
          <StatusBadge
            job={job}
            isAdmin={['admin', 'super_admin'].includes(userRole)}
            isEmployer={userRole === 'employer'}
          />
        </div>
        <div className="flex items-center gap-1 mb-2">
          {(() => { const cn = (getJobCompanyName(job) || '').trim(); return (cn && cn !== (job.title || '').trim()) ? (
            <Link to={`/companies/${job.company_id}`} className="text-ocean-600 font-medium hover:underline">{cn}</Link>
          ) : null; })()}
        </div>
        <p className="text-gray-600 text-sm mt-2 mb-2 line-clamp-2">{(() => { const d = (job.description || '').trim(); return d ? `${d.slice(0, 160)}...` : 'No description provided.'; })()}</p>
        {quick && (
          <p className="text-xs text-gray-500 mb-3">External listing. You will be redirected to the employer's site to apply.</p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
          {!!job.location && (
            <span className="inline-flex items-center gap-1">
              <MapPinIcon className="w-4 h-4" />
              {job.location}
            </span>
          )}
          {!!job.job_type && (
            <span className="inline-flex items-center gap-1">
              <BriefcaseIcon className="w-4 h-4" />
              {job.job_type}
            </span>
          )}
          {showMatchExplanation && matchKeywords.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-ocean-50 text-ocean-700 border border-ocean-200" title={`Matched keywords: ${matchKeywords.join(', ')}`}>
              🎓 {matchKeywords.slice(0, 2).join(', ')}{matchKeywords.length > 2 ? '…' : ''}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mt-2">
          {(job?.salary_display_inr || job?.salary_range || (job?.salary_min != null && job?.salary_max != null)) && (
            <span className="inline-flex items-center gap-1">
              <CurrencyDollarIcon className="w-4 h-4" />
              {job?.salary_display_inr ||
                job?.salary_range ||
                (job?.salary_min != null && job?.salary_max != null
                  ? `₹${Number(job.salary_min).toLocaleString('en-IN')} – ₹${Number(job.salary_max).toLocaleString('en-IN')}`
                  : job?.salary_min != null
                    ? `₹${Number(job.salary_min).toLocaleString('en-IN')}+`
                    : `Up to ₹${Number(job?.salary_max).toLocaleString('en-IN')}`)}
            </span>
          )}
          {coalescedDeadline && (
            <span className="inline-flex items-center gap-1">
              <CalendarIcon className="w-4 h-4" />
              Deadline: {formatKolkata(coalescedDeadline)}
            </span>
          )}
        </div>
        {(() => {
          const raw = job.skills;
          const arr = Array.isArray(raw)
            ? raw
            : typeof raw === 'string'
              ? raw.split(',').map((s) => s.trim()).filter(Boolean)
              : [];
          if (!arr.length) return null;
          return (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-500 mb-1">Skills required</p>
              <div className="flex flex-wrap gap-1">
                {arr.slice(0, 5).map((skill, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSkillClick && onSkillClick(skill)}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-ocean-50 text-ocean-800 border border-ocean-100 hover:bg-ocean-100 hover:border-ocean-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ocean-500"
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
      <div className="flex flex-col items-end justify-between self-stretch pt-2 sm:pt-0">
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center">
            <button onClick={() => shareJob(job)} className="p-2 rounded-full hover:bg-gray-100" aria-label="Share job">
              <ShareIcon className="w-5 h-5 text-gray-500" />
            </button>
            <BookmarkButton jobId={job.id} isBookmarked={isBookmarked} handleBookmark={handleBookmark} />
          </div>
          {canToggleVisibility && (
            <button
              onClick={() =>
                setVisibilityDialog({
                  open: true,
                  mode: isPaused ? 'resume' : 'pause',
                })
              }
              className="mt-0.5 inline-flex items-center justify-center h-8 px-2 rounded-full border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              title={isPaused ? 'Resume listing' : 'Pause listing'}
            >
              {isPaused ? 'Resume listing' : 'Pause listing'}
            </button>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          {employerId && !isOwner && (
            <button
              className="btn-secondary-outline px-4 py-2 rounded-lg text-sm"
              onClick={async () => {
                try { await requestConnectionForJob(job.id, employerId, user?.id); } catch (error) { logger.error('Failed to request connection:', error); }
                navigate(`/messages?peer=${employerId}&job=${job.id}`);
              }}
            >
              Ask employer
            </button>
          )}
          <Link to={`/jobs/${job.id}`} className="btn-ocean-outline px-4 py-2 rounded-lg text-sm">View details</Link>
          {(isOwner || ['admin', 'super_admin'].includes(userRole)) ? (
            <Link to={`/jobs/${job.id}/applications`} className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-gradient-to-b from-ocean-500 to-ocean-600 text-white text-sm hover:from-ocean-600 hover:to-ocean-700 transition-[colors,opacity,transform,shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white/80">Manage applications</Link>
          ) : (userRole === 'employer' && !isOwner) ? (
            !isClosed ? (
              <button
                type="button"
                className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-gradient-to-b from-ocean-500 to-ocean-600 text-white text-sm hover:from-ocean-600 hover:to-ocean-700 transition-[colors,opacity,transform,shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
                aria-label="Accepting applications"
                aria-disabled="true"
              >
                Accepting applications
              </button>
            ) : (
              <button
                type="button"
                className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg border-2 border-gray-200 text-gray-500 text-sm cursor-not-allowed"
                aria-label="Applications closed"
                aria-disabled="true"
              >
                Applications closed
              </button>
            )
          ) : quick ? (
            canApplyExternally ? (
              <button
                className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-gradient-to-b from-ocean-500 to-ocean-600 text-white text-sm hover:from-ocean-600 hover:to-ocean-700 transition-[colors,opacity,transform,shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white/80"
                onClick={() => { const url = coalesceAppUrl(job); if (!url) return; const ok = window.confirm("External listing. You will be redirected to the employer's site to apply. Continue?"); if (ok) window.open(url, '_blank', 'noopener'); }}
                aria-label="Apply on employer site"
              >
                Apply on employer site
              </button>
            ) : (
              <button disabled className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg border-2 border-gray-200 text-gray-400 text-sm cursor-not-allowed">Applications closed</button>
            )
          ) : hasApplied ? (
            <button disabled className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg border-2 border-gray-200 text-gray-400 text-sm cursor-not-allowed">Application submitted</button>
          ) : canApplyInApp ? (
            <button
              className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-gradient-to-b from-ocean-500 to-ocean-600 text-white text-sm hover:from-ocean-600 hover:to-ocean-700 transition-[colors,opacity,transform,shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white/80"
              onClick={() => setApplyOpen(true)}
            >
              Apply now
            </button>
          ) : (
            <button disabled className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg border-2 border-gray-200 text-gray-400 text-sm cursor-not-allowed">Applications closed</button>
          )}
          {!quick && (
            <ApplyDialog
              open={applyOpen}
              onClose={() => setApplyOpen(false)}
              jobId={job.id}
              deadline={coalescedDeadline}
              onSuccess={() => { if (onApplied) onApplied(job.id); }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const JobListingsPage = () => {
  const { user, loading: authLoading, userRole } = useAuth();
  const { loading: apprLoading, isApprovedEmployer } = useApproval();
  const navigateJob = useNavigate();
  const goPostJob = () => {
    const isAdminLocal = ['admin', 'super_admin'].includes(userRole);
    if (!isApprovedEmployer && !isAdminLocal) {
      toast.error('Your employer profile is not approved. Please contact the admin to get approved.');
      return;
    }
    navigateJob('/jobs/post');
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const notification = useNotification();
  const [viewMode, setViewMode] = useState(searchParams.get('view') || 'grid');
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [filters, setFilters] = useState({
    jobType: searchParams.get('jobType') || 'all',
    experience: searchParams.get('experience') || 'all',
    salaryRange: searchParams.get('salaryRange') || 'all',
    postedWithin: searchParams.get('postedWithin') || 'all',
  });
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [pageSize, setPageSize] = useState(12);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'created_at,desc');
  const [bookmarkedJobs, setBookmarkedJobs] = useState([]);
  const [appliedJobIds, setAppliedJobIds] = useState([]);
  const rawSourceQS = searchParams.get('source') || 'all';
  const canonicalSource = rawSourceQS === 'quick' ? 'quick_link' : rawSourceQS === 'internal' ? 'in_app' : rawSourceQS;
  const [sourceFilter, setSourceFilter] = useState(['quick_link', 'in_app'].includes(canonicalSource) ? canonicalSource : 'all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState(() => {
    const statusParam = (searchParams.get('status') || '').toLowerCase();
    return ['admin', 'super_admin', 'employer'].includes(userRole) && statusParam ? statusParam : 'all';
  }); // all | live | paused
  const [approvalFilter, setApprovalFilter] = useState(searchParams.get('approval') || 'all');
  const [matchMyEducation, setMatchMyEducation] = useState(searchParams.get('matchEducation') === 'true');

  const fetchController = useRef(null);
  const filtersRef = useRef(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const bookmarkedSet = useMemo(() => new Set(bookmarkedJobs || []), [bookmarkedJobs]);
  const appliedSet = useMemo(() => new Set(appliedJobIds || []), [appliedJobIds]);

  useEffect(() => {
    if (!user?.id) {
      setBookmarkedJobs([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: ids, error: idsErr } = await supabase
        .from('job_bookmarks')
        .select('job_id')
        .eq('user_id', user.id);
      if (!cancelled && !idsErr) {
        setBookmarkedJobs((ids || []).map(r => r.job_id));
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const toggleFilters = useCallback(() => {
    setFiltersOpen((prev) => {
      const next = !prev;
      if (next) {
        // Opening: scroll and focus the first filter control
        setTimeout(() => {
          try {
            if (filtersRef.current) {
              filtersRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
              const firstSelect = filtersRef.current.querySelector('select');
              if (firstSelect) firstSelect.focus();
            }
          } catch (_) { /* noop */ }
        }, 0);
      }
      return next;
    });
  }, []);

  const statusFilterAllowed = useMemo(() => ['employer', 'admin', 'super_admin'].includes(userRole), [userRole]);
  const statusFilterOptions = useMemo(() => {
    if (!statusFilterAllowed) {
      return [
        { value: 'all', label: 'All statuses' },
        { value: 'live', label: 'Live' },
        { value: 'paused', label: 'Paused' },
      ];
    }
    if (['admin', 'super_admin'].includes(userRole)) {
      return [
        { value: 'all', label: 'All statuses' },
        { value: 'live', label: 'Live' },
        { value: 'paused', label: 'Paused' },
        { value: 'pending', label: 'Pending approval' },
        { value: 'disabled', label: 'Disabled' },
        { value: 'rejected', label: 'Rejected' },
      ];
    }
    return [
      { value: 'all', label: 'All statuses' },
      { value: 'live', label: 'Live' },
      { value: 'paused', label: 'Paused' },
    ];
  }, [statusFilterAllowed, userRole]);

  useEffect(() => {
    if (!statusFilterAllowed) {
      if (statusFilter !== 'all') setStatusFilter('all');
      return;
    }
    const qsStatus = (searchParams.get('status') || 'all').toLowerCase();
    if (qsStatus !== statusFilter) {
      setStatusFilter(qsStatus);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilterAllowed, searchParams]);

  const fetchJobs = useCallback(async () => {
    if (fetchController.current) fetchController.current.abort();
    fetchController.current = new AbortController();

    setLoading(true);
    if (process.env.NODE_ENV !== 'production') {
      logger.log('Fetching jobs with filters:', { searchQuery, sortBy, currentPage });
    }

    const [sortCol, sortDir] = (sortBy || 'created_at,desc').split(',');
    const isEmployer = userRole === 'employer';
    const isAdmin = ['admin', 'super_admin'].includes(userRole);
    const effectiveStatus = statusFilterAllowed ? statusFilter : 'all';

    let data = null; let error = null;

    if (isAdmin) {
      // Admins query the jobs table directly; RLS already grants them full visibility.
      let q = supabase
        .from('jobs')
        .select('*, companies(name, logo_url)', { count: 'exact' });

      if (searchQuery && String(searchQuery).trim()) {
        const s = String(searchQuery).trim();
        q = q.or(`title.ilike.%${s}%,location.ilike.%${s}%,company_name.ilike.%${s}%`);
      }

      const ascending = (sortDir || 'desc').toLowerCase() === 'asc';
      q = q.order(sortCol || 'created_at', { ascending });
      q = q.range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      const resp = await q;
      if (resp.error) {
        error = resp.error;
      } else {
        data = { items: resp.data || [], total_count: resp.count || 0 };
      }
    } else if (isEmployer) {
      if (approvalFilter && approvalFilter !== 'all') {
        // Employer wants specific status: fetch from base table with ownership + approval predicates
        let q = supabase
          .from('jobs')
          .select('*, companies(name, logo_url)', { count: 'exact' })
          .or(`posted_by.eq.${user?.id},user_id.eq.${user?.id},created_by.eq.${user?.id}`);

        if (approvalFilter === 'approved') {
          // Explicitly approved and active
          q = q.eq('is_approved', true).eq('is_active', true).neq('is_rejected', true);
        }
        if (approvalFilter === 'pending') {
          // Not approved, not rejected, and active (awaiting review)
          q = q
            .neq('is_approved', true)
            .or('is_rejected.is.null,is_rejected.eq.false')
            .eq('is_active', true);
        }
        if (approvalFilter === 'disabled') {
          // Manually disabled by owner/admin (inactive but not rejected)
          q = q
            .eq('is_active', false)
            .or('is_rejected.is.null,is_rejected.eq.false');
        }
        if (approvalFilter === 'rejected') {
          // Explicitly rejected by admin
          q = q.eq('is_rejected', true);
        }

        if (filters.jobType && filters.jobType !== 'all') q = q.eq('job_type', filters.jobType);
        if (filters.experience && filters.experience !== 'all') q = q.eq('experience_level', filters.experience);

        if (filters.salaryRange && filters.salaryRange !== 'all') {
          const [minStr, maxStr] = String(filters.salaryRange).split('-');
          const sMin = minStr ? parseInt(minStr, 10) : null;
          const sMax = maxStr ? (maxStr === '' ? null : parseInt(maxStr, 10)) : null;
          if (sMin !== null) q = q.gte('salary_max', sMin);
          if (sMax !== null) q = q.lte('salary_min', sMax);
        }

        if (filters.postedWithin && filters.postedWithin !== 'all') {
          const days = parseInt(filters.postedWithin, 10);
          if (!Number.isNaN(days)) q = q.gte('created_at', new Date(Date.now() - days * 86400000).toISOString());
        }

        if (searchQuery && String(searchQuery).trim()) {
          const s = String(searchQuery).trim();
          q = q.or(`title.ilike.%${s}%,location.ilike.%${s}%`);
        }

        const ascending = (sortDir || 'desc').toLowerCase() === 'asc';
        q = q.order(sortCol || 'created_at', { ascending });
        q = q.range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

        const resp = await q;
        if (resp.error) {
          error = resp.error;
        } else {
          data = { items: resp.data || [], total_count: resp.count || 0 };
        }
      } else {
        ({ data, error } = await supabase.rpc('get_my_posted_jobs', {
          p_search_query: searchQuery || null,
          p_sort_by: sortCol || 'created_at',
          p_sort_order: (sortDir || 'desc').toLowerCase(),
          p_limit: pageSize,
          p_offset: (currentPage - 1) * pageSize,
        }));
        // Backfill description if RPC omits it
        if (!error && Array.isArray(data) && data.length > 0) {
          try {
            const ids = data.map(r => r.id).filter(Boolean);
            if (ids.length > 0) {
              const { data: descRows, error: descErr } = await supabase
                .from('jobs')
                .select('id, description, skills')
                .in('id', ids);
              if (!descErr && Array.isArray(descRows)) {
                const descMap = new Map(descRows.map(r => [r.id, (r.description ?? null)]));
                const skillsMap = new Map(descRows.map(r => [r.id, (r.skills ?? null)]));
                data = data.map(r => ({
                  ...r,
                  description: r.description ?? descMap.get(r.id) ?? null,
                  skills: r.skills ?? skillsMap.get(r.id) ?? null,
                }));
              }
            }
          } catch (_) { /* noop */ }
        }
      }
    } else {
      // Public/non-employer: prefer server-side v5 for accurate counts and paging
      const jobTypeParam = (filters.jobType && filters.jobType !== 'all') ? filters.jobType : null;
      const expParam = (filters.experience && filters.experience !== 'all') ? filters.experience : null;
      const industryParam = null;
      let salaryMin = null, salaryMax = null;
      if (filters.salaryRange && filters.salaryRange !== 'all') {
        const [minStr, maxStr] = String(filters.salaryRange).split('-');
        salaryMin = minStr ? parseInt(minStr, 10) : null;
        salaryMax = maxStr ? (maxStr === '' ? null : parseInt(maxStr, 10)) : null;
      }
      const postedSince = (filters.postedWithin && filters.postedWithin !== 'all') ? parseInt(filters.postedWithin, 10) : null;

      // Use education-matching RPC if matchMyEducation is enabled
      if (matchMyEducation && ['alumni', 'student'].includes(userRole)) {
        ({ data, error } = await supabase.rpc('search_jobs_with_education', {
          p_search_query: searchQuery || null,
          p_sort_by: sortCol || 'created_at',
          p_sort_order: (sortDir || 'desc').toLowerCase(),
          p_limit: pageSize,
          p_offset: (currentPage - 1) * pageSize,
          p_job_type: jobTypeParam,
          p_experience_level: expParam,
          p_salary_min: salaryMin,
          p_salary_max: salaryMax,
          p_posted_since_days: postedSince,
          p_match_my_education: true,
        }));
        // The RPC returns either array or {items,total_count}; normalize
        if (!error && Array.isArray(data)) {
          data = { items: data, total_count: data.length };
        }
      } else {
        ({ data, error } = await supabase.rpc('get_jobs_public_v5', {
          p_search_query: searchQuery || null,
          p_sort_by: sortCol || 'created_at',
          p_sort_order: (sortDir || 'desc').toLowerCase(),
          p_limit: pageSize,
          p_offset: (currentPage - 1) * pageSize,
          p_job_type: jobTypeParam,
          p_experience_level: expParam,
          p_industry: industryParam,
          p_salary_min: salaryMin,
          p_salary_max: salaryMax,
          p_posted_since_days: postedSince,
        }));
      }
      // Fallback ONLY if RPC errors; allow empty results to reflect strict filters (e.g., Pending/Rejected)
      if (error) {
        logger.warn('RPC get_jobs_public_v5 failed, falling back to v_jobs_feed_inr view');
        const { data: viewData, error: viewError } = await supabase
          .from('v_jobs_feed_inr')
          .select('*')
          .order(sortCol, { ascending: sortDir === 'asc' })
          .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
        if (viewError) {
          error = viewError;
        } else {
          data = { items: viewData, total_count: viewData.length };
          error = null;
        }
      }
    }

    if (error) {
      logger.error('Error fetching jobs via RPC:', error);
      toast.error('Failed to fetch jobs.');
      setJobs([]);
      setTotalJobs(0);
      setLoading(false);
      return;
    }

    // Normalize rows (support RPC returning array or {items,total_count})
    let rows = [];
    let totalCount = 0;
    if (!isEmployer) {
      const rawItems = Array.isArray(data) ? data : (data?.items ?? []);
      rows = rawItems.map(j => {
        // Force job-level only: do not inherit company fallbacks
        const explicitCompanyName = j?.company_name ? String(j.company_name).trim() : '';
        const explicitLogo = resolveJobLogo(j);
        const appUrl = coalesceAppUrl(j);
        const computedSource = getSourceType({ ...j, application_url: appUrl });
        const normalized = {
          ...j,
          company_name: explicitCompanyName || null,
          companies: { name: null, logo_url: null }, // prevent any company fallback
          logo_url: explicitLogo || null,
          company_logo_url: explicitLogo || null,
          application_url: appUrl,
          source_type: j?.source_type ?? computedSource,
          description: (
            j?.description ?? j?.job_description ?? j?.summary ?? j?.content_summary ??
            j?.details ?? j?.full_description ?? j?.description_text ?? j?.content ?? null
          ),
        };
        if (!normalized.description && process.env.NODE_ENV !== 'production') {
          try { logger.debug('[Jobs] Missing description keys:', Object.keys(j).slice(0, 12)); } catch (_) { void 0; }
        }
        return normalized;
      });
      totalCount = (Array.isArray(data) ? (data?.[0]?.total_count ?? rawItems.length) : (data?.total_count ?? 0));
    } else {
      rows = (data || []).map(j => {
        const explicitCompanyName = j?.company_name ? String(j.company_name).trim() : '';
        const explicitLogo = resolveJobLogo(j);
        const appUrl = coalesceAppUrl(j);
        const computedSource = getSourceType({ ...j, application_url: appUrl });
        return {
          ...j,
          company_name: explicitCompanyName || null,
          companies: { name: null, logo_url: null }, // prevent any company fallback
          company_logo_url: explicitLogo || null,
          logo_url: explicitLogo || null,
          application_url: appUrl,
          source_type: j?.source_type ?? computedSource,
          description: j?.description ?? j?.job_description ?? j?.summary ?? j?.content_summary ?? null,
        };
      });
      const showingCount = jobs.length;
      totalCount = rows.length;
    }

    // Annotate ownership for toggle controls
    const authId = user?.id || null;
    rows = rows.map((job) => ({
      ...job,
      __auth_user_id: job.__auth_user_id ?? authId ?? null,
      is_owner: !!(authId && [job.created_by, job.posted_by, job.user_id, job.employer_id, job.__auth_user_id].some((v) => v === authId)),
    }));

    // Unique/safety
    let uniqueRows = Array.from(new Map(rows.map(job => [job.id, job])).values());
    const serverFilteredByDepartment = false;

    // Client filters (until server supports all)
    const matchesFilters = (j) => {
      const approved = j.is_approved === true;
      const rejected = j.is_rejected === true;
      const activeFlag = j.is_active !== false;
      const statusActive = (j.status || '').toLowerCase() === 'active';

      // Apply approval / moderation filter for all users
      if (approvalFilter === 'approved') {
        if (!(approved && activeFlag && !rejected)) return false;
      }
      if (approvalFilter === 'pending') {
        if (!(activeFlag && !approved && !rejected)) return false;
      }
      if (approvalFilter === 'disabled') {
        if (!(j.is_active === false && !rejected)) return false;
      }
      if (approvalFilter === 'rejected') {
        if (!rejected) return false;
      }
      
      // For non-employers, only show jobs whose status is 'active' and approved/active flags
      if (!isEmployer && !isAdmin && approvalFilter === 'all') {
        if (!(approved && activeFlag && statusActive)) return false;
      }
      // Hide expired jobs (deadline passed) for alumni/students (non-employer, non-admin)
      if (!isEmployer && !(['admin', 'super_admin'].includes(userRole))) {
        if (j.application_deadline && new Date(j.application_deadline) < new Date()) return false;
      }
      
      // Apply source filter
      if (sourceFilter !== 'all') {
        const st = getSourceType(j);
        if (sourceFilter === 'quick_link' && st !== 'quick_link') return false;
        if (sourceFilter === 'in_app' && st !== 'in_app') return false;
      }
      if (filters.jobType !== 'all' && (j.job_type || '').toLowerCase() !== filters.jobType) return false;
      if (filters.experience !== 'all' && (j.experience_level || '').toLowerCase() !== filters.experience) return false;
      if (filters.salaryRange !== 'all') {
        const [minStr, maxStr] = filters.salaryRange.split('-');
        const min = minStr ? parseInt(minStr, 10) : 0;
        const max = maxStr ? parseInt(maxStr, 10) : Infinity;
        const smin = j.salary_min || 0;
        const smax = j.salary_max || 0;
        const anyInRange = (smin >= min && smin <= max) || (smax >= min && smax <= max) || (smin <= min && smax >= max);
        if (!anyInRange) return false;
      }
      if (filters.postedWithin !== 'all') {
        const days = parseInt(filters.postedWithin, 10);
        const created = j.created_at ? new Date(j.created_at) : null;
        if (!created) return false;
        const diffDays = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > days) return false;
      }
      return true;
    };
    uniqueRows = uniqueRows.filter(matchesFilters);

    // Set counts
    setTotalJobs(totalCount);
    setTotalPages(Math.max(1, Math.ceil(totalCount / pageSize)));

    setJobs(uniqueRows);
    setLoading(false);
  }, [searchQuery, sortBy, currentPage, user, userRole, pageSize, filters.experience, filters.jobType, filters.postedWithin, filters.salaryRange, sourceFilter, approvalFilter, matchMyEducation, statusFilter, statusFilterAllowed]);

  useEffect(() => {
    if (!user?.id || !jobs.length || !bookmarkedJobs.length) return;
    const idSet = new Set(bookmarkedJobs);
    setJobs(prev => {
      if (!prev.length) return prev;
      return [...prev].sort((a, b) => {
        const aB = idSet.has(a.id), bB = idSet.has(b.id);
        if (aB && !bB) return -1;
        if (!aB && bB) return 1;
        return 0;
      });
    });
  }, [user?.id, jobs.length, bookmarkedJobs]);

  useEffect(() => {
    if (!user?.id || !['alumni', 'student'].includes(userRole)) {
      setAppliedJobIds([]);
      return;
    }
    if (!jobs.length) {
      setAppliedJobIds([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const ids = jobs.map(j => j.id).filter(Boolean);
        if (!ids.length) {
          if (!cancelled) setAppliedJobIds([]);
          return;
        }
        const appliedIds = await getAppliedJobIdsForCurrentUser(ids);
        if (!cancelled) setAppliedJobIds(appliedIds || []);
      } catch (_) {
        if (!cancelled) setAppliedJobIds([]);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, userRole, jobs]);

  // Realtime
  const handleRealtimeJobChange = useCallback((payload) => {
    const { eventType } = payload;
    // To keep paging, filters, and counts consistent, only auto-refresh on first page.
    // For other pages, just show a toast and let the user refresh manually.
    if (currentPage !== 1) {
      if (eventType === 'INSERT') {
        toast('A new job has been posted. Refresh to see the latest listings.', { icon: 'ℹ️' });
      } else if (eventType === 'UPDATE') {
        toast('A job listing has been updated. Refresh to see the latest details.', { icon: 'ℹ️' });
      } else if (eventType === 'DELETE') {
        toast('A job listing has been removed. Refresh to update the list.', { icon: 'ℹ️' });
      }
      return;
    }

    // On first page, re-run the main fetch so results stay aligned with filters/sort.
    fetchJobs();
    try { sessionStorage.removeItem('jobsNeedsRefresh'); } catch (_) { /* noop */ }
  }, [user?.id]);

  useJobsRealtime({
    userId: user?.id,
    onJobs: handleRealtimeJobChange,
    onBookmarks: (data) => {
      // No-op placeholder to satisfy signature; bookmark realtime not used here
      return data;
    },
  });

  // Sync URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (searchQuery) params.set('q', searchQuery); else params.delete('q');
    Object.entries(filters).forEach(([k, v]) => { if (v && v !== 'all') params.set(k, v); else params.delete(k); });
    if (sourceFilter && sourceFilter !== 'all') params.set('source', sourceFilter); else params.delete('source');
    if (matchMyEducation) params.set('matchEducation', 'true'); else params.delete('matchEducation');
    params.set('page', String(currentPage));
    params.set('sort', sortBy);
    if (['admin', 'super_admin', 'employer'].includes(userRole)) {
      if (approvalFilter && approvalFilter !== 'all') params.set('approval', approvalFilter); else params.delete('approval');
    } else {
      params.delete('approval');
    }
    if (statusFilterAllowed) {
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter); else params.delete('status');
    } else {
      params.delete('status');
    }
    if (viewMode) params.set('view', viewMode);
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filters, currentPage, sortBy, approvalFilter, viewMode, sourceFilter, matchMyEducation, statusFilter, statusFilterAllowed]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => { setSearchQuery(searchTerm); setCurrentPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // If an edit set the refresh flag, refetch once on mount and clear it
  useEffect(() => {
    const needs = (() => {
      try { return sessionStorage.getItem('jobsNeedsRefresh'); } catch (_) { return null; }
    })();
    if (needs) {
      fetchJobs();
      try { sessionStorage.removeItem('jobsNeedsRefresh'); } catch (_) { /* noop */ }
    }
  }, [fetchJobs]);

  // Refresh when window/tab regains focus or visibility (helps after editing a job)
  useEffect(() => {
    const handleFocus = () => fetchJobs();
    const handleVisibility = () => { if (document.visibilityState === 'visible') fetchJobs(); };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchJobs]);

  /* ---------- FIXED: Optimistic toggle that doesn’t rely on feed flags ---------- */
  const handleBookmark = async (jobId) => {
    if (!user) {
      notification.showWarning('Please login to bookmark jobs');
      return;
    }

    const wasBookmarked = bookmarkedJobs.includes(jobId);

    // Cap before adding
    if (!wasBookmarked && bookmarkedJobs.length >= 3) {
      toast.error('You can only bookmark up to 3 jobs.');
      return;
    }

    // Optimistic update
    setBookmarkedJobs(prev => (wasBookmarked ? prev.filter(id => id !== jobId) : [...prev, jobId]));

    try {
      const nowBookmarked = await toggleBookmarkRPC(supabase, jobId);
      // Ensure state matches server outcome
      setBookmarkedJobs(prev => (nowBookmarked ? Array.from(new Set([...prev, jobId])) : prev.filter(id => id !== jobId)));
      toast.success(nowBookmarked ? 'Job bookmarked!' : 'Bookmark removed');
    } catch (e) {
      logger.error('Error bookmarking job:', e);
      // Revert optimistic change
      setBookmarkedJobs(prev => (wasBookmarked ? Array.from(new Set([...prev, jobId])) : prev.filter(id => id !== jobId)));
      notification.showError(`Failed to update bookmark: ${e.message}`);
    }
  };

  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
    setCurrentPage(1);
    
    // Update URL parameters
    const newSearchParams = new URLSearchParams(searchParams);
    
    // Update the specific filter in URL
    if (value === 'all') {
      newSearchParams.delete(filterType);
    } else {
      newSearchParams.set(filterType, value);
    }
    
    // Always reset to page 1 when filters change
    newSearchParams.set('page', '1');
    
    // Update URL without causing a page reload
    setSearchParams(newSearchParams);
  };
  const paginate = (pageNumber) => { setCurrentPage(pageNumber); };
  const handleRefresh = async () => { setIsRefreshing(true); await fetchJobs(); setIsRefreshing(false); toast.success('Job listings have been refreshed!'); };

  const handleSkillClick = (skill) => {
    const s = (skill || '').trim();
    if (!s) return;
    setSearchTerm(s);
    setSearchQuery(s);
    setCurrentPage(1);
    fetchJobs(true);
  };

  const statusFilteredJobs = useMemo(() => {
    const effectiveStatus = statusFilterAllowed ? statusFilter : 'all';
    return jobs.filter((j) => {
      if (effectiveStatus === 'all') return true;
      const active = j?.is_active !== false;
      const approved = j?.is_approved === true;
      const rejected = j?.is_rejected === true;
      const pending = !approved && !rejected;
      if (effectiveStatus === 'live') return active && approved && !rejected;
      if (effectiveStatus === 'paused') return !active && !rejected;
      if (effectiveStatus === 'pending') return pending;
      if (effectiveStatus === 'disabled') return !active && !rejected;
      if (effectiveStatus === 'rejected') return rejected;
      return true;
    });
  }, [jobs, statusFilter, statusFilterAllowed, userRole]);
  const displayedJobs = statusFilteredJobs;

  const canPostJob = ['employer', 'admin', 'super_admin'].includes(userRole);

  const handleApplied = useCallback((jobId) => {
    setAppliedJobIds(prev => (prev.includes(jobId) ? prev : [...prev, jobId]));
  }, []);

  if (authLoading) {
    return (<div className="flex justify-center items-center h-screen"><CircularProgress /></div>);
  }

  // UX: only show the skeleton grid when we truly have no jobs yet.
  // If we already have jobs on screen and a fast refetch happens (filters/page/refresh),
  // keep the existing list visible instead of flashing the skeleton.
  const showSkeleton = loading && jobs.length === 0;

  return (
    <main id="main-content" className="p-4 md:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900">Find Your Next Opportunity</h1>
          </div>
          <p className="text-gray-600 mt-1">Showing {jobs.length} of {totalJobs} jobs</p>
          {matchMyEducation && ['alumni','student'].includes(userRole) && (
            <p className="text-xs text-ocean-700 font-medium mt-1 flex items-center gap-1">
              🎓 Showing jobs matched to your education (description & responsibilities)
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2 md:space-x-4 mt-4 md:mt-0 flex-wrap">
          {['alumni','student'].includes(userRole) && (
            <Link to="/my-applications" className="btn-secondary-outline text-sm">
              <DocumentTextIcon className="w-4 h-4 mr-2" />
              My Applications
            </Link>
          )}
          <Link to="/jobs/alerts" className="btn-secondary-outline text-sm">
            <BellIcon className="w-4 h-4 mr-2" />
            My Job Alerts
          </Link>
          {canPostJob && (
            <div className="relative group">
              <button 
                onClick={goPostJob} 
                disabled={apprLoading || !isApprovedEmployer} 
                aria-disabled={apprLoading || !isApprovedEmployer} 
                className={"btn-primary text-sm inline-flex items-center " + ((apprLoading || !isApprovedEmployer) ? 'opacity-60 cursor-not-allowed' : '')}
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Post a Job
              </button>
              {!isApprovedEmployer && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  Your employer profile is not approved. Please contact the admin.
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, location, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label="Clear search"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          <button onClick={toggleFilters} aria-label="Toggle filters" aria-expanded={filtersOpen} aria-controls="job-filters" className="btn-ocean-outline px-4 py-2 rounded-lg text-sm w-full md:w-auto flex items-center justify-center min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2">
            <FunnelIcon className="w-4 h-4 mr-2" />
            {filtersOpen ? 'Hide Filters' : 'Filters'}
          </button>
        </div>
      </div>

      {filtersOpen && (
      <div id="job-filters" ref={filtersRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {Object.entries(filterOptions).map(([key, options]) => (
          <select
            key={key}
            value={filters[key]}
            onChange={(e) => handleFilterChange(key, e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
          >
            {options.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
          </select>
        ))}
        {statusFilterAllowed && (
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            aria-label="Status filter"
          >
            {statusFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
        <button
          onClick={() => {
            setSearchTerm('');
            setSearchQuery('');
            setFilters({ jobType: 'all', experience: 'all', salaryRange: 'all', postedWithin: 'all' });
            setApprovalFilter('all');
            setStatusFilter('all');
            setMatchMyEducation(false);
            setSortBy('created_at,desc');
            setCurrentPage(1);
          }}
          className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg border-2 border-ocean-600 text-ocean-600 hover:bg-ocean-600 hover:text-white text-sm transition-[colors,opacity,transform,shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
          aria-label="Reset filters"
        >
          Reset Filters
        </button>
        {/* Match My Education toggle - only for alumni/students */}
        {['alumni', 'student'].includes(userRole) && (
          <label className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm cursor-pointer hover:bg-ocean-50 transition-colors">
            <input
              type="checkbox"
              checked={matchMyEducation}
              onChange={(e) => { setMatchMyEducation(e.target.checked); setCurrentPage(1); }}
              className="h-4 w-4 text-ocean-600 border-gray-300 rounded focus:ring-ocean-500"
            />
            <span className="text-gray-700">Match my education</span>
          </label>
        )}
        {['admin', 'super_admin', 'employer'].includes(userRole) && (
          <div className="col-span-full mt-1 text-xs text-gray-500">
            <span className="font-semibold">Status legend:</span>{' '}
            <span className="font-medium text-emerald-700">Live</span> – visible to students & alumni, accepting applications;{' '}
            <span className="font-medium text-amber-700">Pending approval</span> – waiting for admin review;{' '}
            <span className="font-medium text-slate-700">Paused</span> – hidden from students, you can resume anytime;{' '}
            <span className="font-medium text-rose-700">Rejected</span> – not visible, contact admin to re‑submit.
          </div>
        )}
      </div>
      )}

      {/* View + Sort */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-1 bg-gray-200 p-1 rounded-lg">
          <button onClick={() => setViewMode('grid')} className={`inline-flex items-center justify-center w-[44px] h-[44px] p-0 rounded-lg text-sm ${viewMode === 'grid' ? 'bg-white shadow' : 'text-gray-600'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2`}>
            <Squares2X2Icon className="w-5 h-5" />
          </button>
          <button onClick={() => setViewMode('list')} className={`inline-flex items-center justify-center w-[44px] h-[44px] p-0 rounded-lg text-sm ${viewMode === 'list' ? 'bg-white shadow' : 'text-gray-600'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2`}>
            <ListBulletIcon className="w-5 h-5" />
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`inline-flex items-center justify-center w-[44px] h-[44px] p-0 rounded-lg text-sm ${isRefreshing ? 'opacity-50 cursor-not-allowed' : 'text-gray-600 hover:bg-white hover:shadow'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2`}
            title="Refresh job listings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0M2.985 19.644L6.166 16.46m11.668-11.668h-4.992v.001M21.015 4.356v4.992m0 0h-4.992m4.992 0l-3.181-3.183a8.25 8.25 0 00-11.664 0M21.015 4.356L17.834 7.54z" />
            </svg>
          </button>
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500">
          <option value="created_at,desc">Sort by Newest</option>
          <option value="created_at,asc">Sort by Oldest</option>
          <option value="deadline,asc">Deadline (Soonest)</option>
          <option value="deadline,desc">Deadline (Latest)</option>
          <option value="title,asc">Title (A-Z)</option>
          <option value="title,desc">Title (Z-A)</option>
        </select>
      </div>

      {/* Jobs */}
      {showSkeleton ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card rounded-lg p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="h-6 bg-ocean-100 rounded-lg w-3/4"></div>
                  <div className="h-4 bg-ocean-100 rounded-lg w-1/2"></div>
                </div>
                <div className="h-8 w-8 bg-ocean-100 rounded-full"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-ocean-100 rounded-lg w-full"></div>
                <div className="h-4 bg-ocean-100 rounded-lg w-5/6"></div>
              </div>
              <div className="flex gap-2">
                <div className="h-6 bg-ocean-100 rounded-full w-16"></div>
                <div className="h-6 bg-ocean-100 rounded-full w-20"></div>
              </div>
            </div>
          ))}
        </div>
      ) : displayedJobs.length > 0 ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' : 'space-y-4'}>
          {displayedJobs.map((job) => (
            viewMode === 'grid' ? (
              <JobCard
                key={job.id}
                job={job}
                handleBookmark={handleBookmark}
                isBookmarked={bookmarkedSet.has(job.id)}
                onSkillClick={handleSkillClick}
                hasApplied={appliedSet.has(job.id)}
                onApplied={handleApplied}
              />
            ) : (
              <JobListItem
                key={job.id}
                job={job}
                handleBookmark={handleBookmark}
                isBookmarked={bookmarkedSet.has(job.id)}
                onSkillClick={handleSkillClick}
                hasApplied={appliedSet.has(job.id)}
                onApplied={handleApplied}
              />
            )
          ))}
        </div>
      ) : (
        <div className="text-center py-12 glass-card rounded-lg">
          <div className="w-16 h-16 bg-ocean-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <MagnifyingGlassIcon className="w-8 h-8 text-ocean-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Jobs Found</h3>
          <p className="text-gray-600 mb-6">
            {matchMyEducation
              ? 'No jobs match your education right now. Try turning off “Match my education” or clearing filters.'
              : 'Try adjusting your search or filters.'}
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => {
                setSearchTerm('');
                setSearchQuery('');
                setFilters({ jobType: 'all', experience: 'all', salaryRange: 'all', postedWithin: 'all' });
                setCurrentPage(1);
                notification.showInfo('All filters cleared');
              }}
              className="btn-ocean-outline px-4 py-2 rounded-lg text-sm"
            >
              Clear all filters
            </button>
            <Link to="/jobs/alerts" className="btn-ocean px-4 py-2 rounded-lg text-sm flex items-center">
              <BellIcon className="w-4 h-4 mr-2" />
              Create Job Alert
            </Link>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Go to previous page"
            className="inline-flex items-center min-h-[44px] min-w-[44px] px-4 py-2 rounded-lg border-2 border-ocean-300 text-ocean-700 hover:bg-ocean-50 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 transition-colors duration-200"
          >
            Previous
          </button>

          <span aria-current="page" className="min-h-[44px] px-4 py-2 rounded-lg bg-ocean-600 text-white font-medium flex items-center">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Go to next page"
            className="inline-flex items-center min-h-[44px] min-w-[44px] px-4 py-2 rounded-lg border-2 border-ocean-300 text-ocean-700 hover:bg-ocean-50 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 transition-colors duration-200"
          >
            Next
          </button>
        </nav>
      )}
      </div>
    </main>
  );
};

export { JobCard };
export default JobListingsPage;