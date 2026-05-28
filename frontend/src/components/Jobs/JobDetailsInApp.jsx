import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useApproval } from '../../hooks/useApproval';
import { hasOverviewData, coalesceAppUrl, computeJobApplyState, getJobLogoUrl, getJobCompanyName } from '../../utils/jobs';
import logger from '../../utils/logger';
import { getApplicantsCount } from '../../utils/applicants';
import { requestConnectionForJob } from '../../utils/connections';
import toast from 'react-hot-toast'; // Assuming you have react-hot-toast installed
import ApplyDialog from './ApplyDialog';
import { handleBlockedUserError } from '../../utils/blockedUserError';
import { hasApplied as hasAppliedHelper } from '../../utils/jobApplications';
import ImageWithFallback from '../common/ImageWithFallback';

export default function JobDetailsInApp({ job, companyName, companyLogo, isOwner, isAdmin }) {
  const { user, userRole, isBlocked } = useAuth();
  const { isApproved } = useApproval();
  const navigate = useNavigate();
  const canEdit = isOwner || isAdmin;
  const employerId = job?.posted_by || job?.user_id || job?.created_by;
  const [applyOpen, setApplyOpen] = useState(false);
  const [applied, setApplied] = useState(false);
  const coalescedDeadline = job?.deadline || job?.application_deadline || null;
  const applyState = computeJobApplyState(job);
  const { canApplyInApp, isClosed, disabledReason } = applyState;
  const formatKolkata = (iso) => {
    try {
      return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(iso));
    } catch (_) { return new Date(iso).toLocaleDateString(); }
  };
  const isEmployer = userRole === 'employer';
  const isEmployerOwner = isEmployer && (job?.created_by === user?.id || job?.posted_by === user?.id);

  useEffect(() => {
    let mounted = true;
    if (user?.id && job?.id) {
      hasAppliedHelper(job.id).then(v => { if (mounted) setApplied(Boolean(v)); });
    }
    return () => { mounted = false; };
  }, [user?.id, job?.id]);

  // Unified display helpers for logo/name (enforce 23-char max for display)
  const resolvedCompanyName = useMemo(() => {
    const baseName = companyName || getJobCompanyName(job);
    const name = baseName || '';
    return name.length > 23 ? name.slice(0, 23) : name;
  }, [companyName, job]);
  const resolvedLogo = useMemo(() => (companyLogo || getJobLogoUrl(job) || ''), [companyLogo, job]);

  if (!job) return null;

  // Helper functions to handle string or array fields
  const getListFromField = (field) => {
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') return field.split('\n').map(item => item.trim()).filter(item => item);
    return [];
  };

  const responsibilities = getListFromField(job.responsibilities);
  const requirements = getListFromField(job.requirements);
  const benefits = getListFromField(job.benefits);
  const niceToHaveSkills = Array.isArray(job.nice_to_have_skills) ? job.nice_to_have_skills : (job.preferredQualifications || []);
  const skills = Array.isArray(job.skills) ? job.skills : [];

  return (
    <div className="max-w-6xl mx-auto px-4 pb-12">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-ocean-600 hover:bg-ocean-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 transition-colors"
        aria-label="Go back to previous page"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="text-sm font-medium">Back</span>
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
            <ImageWithFallback
              src={resolvedLogo}
              alt={resolvedCompanyName || 'Company'}
              className="w-12 h-12"
              imgClassName="w-full h-full object-contain"
              placeholderSrc="/default-avatar.svg"
              emptyMessage="Employer logo to be uploaded"
            />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900">{job.title}</h1>
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                In-app
              </span>
            </div>
            {!!resolvedCompanyName && (
              <div className="mt-1 text-ocean-600 font-medium">{resolvedCompanyName}</div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {canEdit && (
              <Link to={`/jobs/${job.id}/edit`} className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50">
                Edit job
              </Link>
            )}
            {isEmployerOwner || (['admin', 'super_admin'].includes(userRole)) ? (
              <Link to={`/jobs/${job.id}/applications`} className="px-3 py-2 rounded-lg bg-ocean-600 text-white hover:bg-ocean-700 text-sm">
                Manage applications
              </Link>
            ) : (
              <>
                {user?.id && employerId && user.id !== employerId && (
                  <button
                    onClick={async () => {
                      if (isBlocked) {
                        toast.error('Your account is restricted and cannot perform this action');
                        return;
                      }
                      try {
                        await requestConnectionForJob(job.id, employerId, user?.id);
                        navigate(`/messages?peer=${employerId}&job=${job.id}`);
                      } catch (error) {
                        if (!handleBlockedUserError(error)) {
                          logger.error('Failed to request connection:', error);
                          toast.error('Connection request failed. Please try again.');
                        }
                      }
                    }}
                    disabled={isBlocked}
                    className={`px-3 py-2 rounded-lg border text-sm ${isBlocked ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                  >
                    Connect with employer
                  </button>
                )}
                {/* In-app apply controls (non-owner viewers only) */}
                {applied ? (
                  <button disabled className="px-3 py-2 rounded-lg border text-sm text-gray-400 cursor-not-allowed">Application submitted</button>
                ) : !isApproved ? (
                  <button
                    disabled
                    className="px-3 py-2 rounded-lg border text-sm text-gray-400 cursor-not-allowed"
                    title="Your account is pending approval"
                  >
                    Awaiting approval
                  </button>
                ) : isEmployer ? (
                  <button
                    type="button"
                    className="px-3 py-2 rounded-lg border text-sm text-gray-400 cursor-not-allowed"
                    aria-disabled="true"
                  >
                    {isClosed ? 'Applications closed' : 'Accepting applications'}
                  </button>
                ) : canApplyInApp ? (
                  <button
                    onClick={() => {
                      if (isBlocked) {
                        toast.error('Your account is restricted and cannot perform this action');
                        return;
                      }
                      setApplyOpen(true);
                    }}
                    disabled={isBlocked}
                    className={`px-3 py-2 rounded-lg text-sm ${isBlocked ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-ocean-600 text-white hover:bg-ocean-700'}`}
                  >
                    Apply now
                  </button>
                ) : (
                  <button disabled className="px-3 py-2 rounded-lg border text-sm text-gray-400 cursor-not-allowed">Applications closed</button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Minimal meta: Deadline only if present */}
        {coalescedDeadline && (
          <div className="mt-4 text-xs text-gray-500">
            Deadline: {formatKolkata(coalescedDeadline)}
          </div>
        )}
      </div>

      {/* Layout: description + overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Summary/Description */}
          {(job.description || job.summary) && (
            <div className="bg-white rounded-2xl shadow-sm border p-6 job-content">
              <h2 className="text-lg font-semibold mb-4">Job description</h2>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-left">
                {job.description || job.summary}
              </p>
            </div>
          )}

          <style>{`
            .job-content {
              text-align: left !important;
            }
            .job-content p,
            .job-content ul,
            .job-content ol,
            .job-content li {
              text-align: left !important;
              margin: 0;
            }
            .job-content ul,
            .job-content ol {
              list-style-position: inside;
              padding-left: 0;
            }
            .job-content li {
              font-size: 1rem;
              line-height: 1.5;
              margin-bottom: 0.5rem;
            }
            .job-content h1,
            .job-content h2,
            .job-content h3,
            .job-content h4,
            .job-content h5,
            .job-content h6 {
              font-size: 1rem;
              font-weight: 600;
              margin: 0;
            }
            /* Requirements bullets styling */
            .job-requirements ul,
            .job-requirements ol { list-style: disc; margin-left: 1.25rem; padding-left: 1.25rem; text-align: left; }
            .job-requirements li { margin: 0.25rem 0; }
          `}</style>

          {skills.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-2">Key skills</h2>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, index) => (
                  <span key={index} className="px-3 py-1 bg-ocean-100 text-ocean-800 rounded-full text-sm">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Responsibilities */}
          {responsibilities.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border p-6 job-content job-requirements">
              <h2 className="text-lg font-semibold mb-4">Responsibilities</h2>
              <ul className="list-disc list-inside space-y-2 text-left">
                {responsibilities.map((responsibility, index) => (
                  <li key={index} className="text-gray-700 text-base leading-relaxed">
                    {responsibility}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Qualifications */}
          {requirements.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border p-6 job-content job-requirements">
              <h2 className="text-lg font-semibold mb-4">Responsibilities</h2>
              <ul className="list-disc list-inside space-y-2 text-left">
                {requirements.map((requirement, index) => (
                  <li key={index} className="text-gray-700 text-base leading-relaxed">
                    {requirement}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Nice-to-have Skills */}
          {niceToHaveSkills.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-2">Nice-to-have skills</h2>
              <div className="flex flex-wrap gap-2">
                {niceToHaveSkills.map((skill, index) => (
                  <span key={index} className="px-3 py-1 bg-ocean-100 text-ocean-800 rounded-full text-sm">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Benefits */}
          {benefits.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-2">Benefits and perks</h2>
              <ul className="space-y-2">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-500 mr-3 mt-1 text-lg">✓</span>
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* About the Company */}
          {(job.about_the_company || job.companyInfo?.description) && (
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-2">About the company</h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {job.about_the_company || job.companyInfo?.description}
              </p>
            </div>
          )}

          {/* Apply Dialog */}
          {!isOwner && !coalesceAppUrl(job) && (
            <ApplyDialog open={applyOpen} onClose={() => setApplyOpen(false)} jobId={job.id} deadline={coalescedDeadline} onSuccess={() => setApplied(true)} />
          )}
          {(!canApplyInApp && !applied && !isEmployer && disabledReason) && (
            <p className="mt-2 text-xs text-gray-500 text-right max-w-xs ml-auto">
              {disabledReason}
            </p>
          )}
        </div>

        {/* Overview (render only if something to show) */}
        {hasOverviewData(job) && (
          <aside className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="text-base font-semibold mb-3">Job overview</h3>
            <ul className="text-sm text-gray-700 space-y-2">
              {job?.industry && <li><span className="text-gray-500">Industry:</span> {job.industry}</li>}
              {job?.department && <li><span className="text-gray-500">Department:</span> {job.department}</li>}
              {job?.location && <li><span className="text-gray-500">Location:</span> {job.location}</li>}
              {job?.job_type && <li><span className="text-gray-500">Job type:</span> {job.job_type}</li>}
              {job?.experience_level && <li><span className="text-gray-500">Experience level:</span> {job.experience_level}</li>}
              {job?.work_mode && <li><span className="text-gray-500">Work mode:</span> {job.work_mode}</li>}
              {(job?.salary_display_inr || job?.salary_range || job?.salary_min != null || job?.salary_max != null) && (
                <li>
                  <span className="text-gray-500">Salary:</span>{' '}
                  {job?.salary_display_inr || job?.salary_range || (
                    job?.salary_min != null && job?.salary_max != null
                      ? `₹${Number(job.salary_min).toLocaleString('en-IN')} - ₹${Number(job.salary_max).toLocaleString('en-IN')}`
                      : job?.salary_min != null
                        ? `₹${Number(job.salary_min).toLocaleString('en-IN')}+`
                        : `Up to ₹${Number(job?.salary_max).toLocaleString('en-IN')}`
                  )}
                </li>
              )}
              {coalescedDeadline && <li><span className="text-gray-500">Deadline:</span> {formatKolkata(coalescedDeadline)}</li>}
              {(() => { const c = getApplicantsCount(job); return c !== null ? (<li><span className="text-gray-500">Applicants:</span> {c}</li>) : null; })()}
            </ul>

            {/* Contact Info */}
            {(job?.contact_name || job?.contact_email || job?.contact_phone) && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">HR Contact</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  {job?.contact_name && <li><span className="text-gray-500">Name:</span> {job.contact_name}</li>}
                  {job?.contact_email && (
                    <li>
                      <span className="text-gray-500">Email:</span>{' '}
                      <a href={`mailto:${job.contact_email}`} className="text-ocean-600 hover:underline">{job.contact_email}</a>
                    </li>
                  )}
                  {job?.contact_phone && (
                    <li>
                      <span className="text-gray-500">Phone:</span>{' '}
                      <a href={`tel:${job.contact_phone}`} className="text-ocean-600 hover:underline">{job.contact_phone}</a>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
