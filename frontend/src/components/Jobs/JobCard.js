import React, { useMemo, useState, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isQuickLink, coalesceAppUrl, getJobLogoUrl, getJobCompanyName, getJobLocation } from '../../utils/jobs';
import { getApplicantsCount } from '../../utils/applicants';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { requestConnectionForJob } from '../../utils/connections';
import { supabase } from '../../utils/supabase';
import { ShareIcon, BookmarkIcon, MapPinIcon, BriefcaseIcon, ClockIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import { toggleBookmarkRPC } from '../../utils/bookmarks';
import { shareJob } from '../../utils/share';
import ImageWithFallback from '../common/ImageWithFallback';

function JobCard({ job }) {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const employerId = job?.posted_by || job?.user_id || null;
  const isStudent = ['alumni', 'student'].includes(userRole);
  const isOwner = user?.id === employerId;

  const companyName = useMemo(() => {
    const name = getJobCompanyName(job);
    if (!name) return '';
    return name.length > 23 ? name.slice(0, 23) : name;
  }, [job]);
  const companyLogo = useMemo(() => getJobLogoUrl(job), [job]);
  const isQuick = isQuickLink(job) || job?.source_type === 'quick_link';
  const externalUrl = useMemo(() => coalesceAppUrl(job), [job]);
  const [isBookmarked, setIsBookmarked] = useState(Boolean(job?.is_bookmarked));
  const bookmarkedJobs = useMemo(() => user?.bookmarked_jobs || [], [user]);
  const location = useMemo(() => getJobLocation(job), [job]);

  const salaryText = useMemo(() => {
    if (job?.salary_display_inr) return job.salary_display_inr;
    const min = job?.salary_min;
    const max = job?.salary_max;
    if (min && max) {
      return `₹${Number(min).toLocaleString('en-IN')} - ₹${Number(max).toLocaleString('en-IN')}`;
    }
    if (min != null) return `₹${Number(min).toLocaleString('en-IN')}+`;
    if (max != null) return `Up to ₹${Number(max).toLocaleString('en-IN')}`;
    if (job?.salary_range) {
      const sr = String(job.salary_range).trim();
      return sr.replace(/^USD\s*/i, '₹ ');
    }
    return null;
  }, [job]);

  const skills = useMemo(() => {
    const fromSkills = Array.isArray(job.skills)
      ? job.skills
      : typeof job.skills === 'string'
        ? job.skills.split(',').map(s => s.trim()).filter(Boolean)
        : [];
    const fromNice = Array.isArray(job.nice_to_have_skills)
      ? job.nice_to_have_skills
      : typeof job.nice_to_have_skills === 'string'
        ? job.nice_to_have_skills.split(',').map(s => s.trim()).filter(Boolean)
        : [];
    return (fromSkills.length ? fromSkills : fromNice).slice(0, 4);
  }, [job]);

  const applicantsCount = useMemo(() => getApplicantsCount(job), [job]);
  
  // Accessibility: stable IDs for title and description associations
  const titleId = useMemo(() => `job-title-${job?.id}`, [job?.id]);
  const descId = useMemo(() => `job-desc-${job?.id}`, [job?.id]);

  const toggleBookmark = async () => {
    if (!user?.id) {
      toast.error('Please login to bookmark jobs.');
      return;
    }
    try {
      if (!isBookmarked && bookmarkedJobs && bookmarkedJobs.length >= 3) {
        toast.error('You can only bookmark up to 3 jobs.');
        return;
      }
      const nowBookmarked = await toggleBookmarkRPC(supabase, job.id);
      setIsBookmarked(nowBookmarked);
      toast.success(nowBookmarked ? 'Job bookmarked' : 'Bookmark removed');
    } catch (e) {
      console.error('Bookmark error:', e);
      toast.error('Failed to update bookmark');
    }
  };

  return (
    <article
      className="group relative rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"
      role="article"
      aria-labelledby={titleId}
      aria-describedby={descId}
      data-component="job-card"
    >
      {/* Live status indicator bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />
      
      <div className="p-5">
        {/* Header Section */}
        <div className="flex gap-4 mb-4">
          {/* Title & Company */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 id={titleId} className="font-semibold text-gray-900 text-base leading-tight">
                <Link
                  to={`/jobs/${job.id}`}
                  className="hover:text-blue-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm line-clamp-2"
                  aria-label={`View details for ${job?.title || 'job'}`}
                >
                  {job.title}
                </Link>
              </h3>
              
              {/* Action buttons */}
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => shareJob(job)}
                  type="button"
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 inline-flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  aria-label="Share job"
                >
                  <ShareIcon className="w-4 h-4 text-gray-500" />
                </button>
                <button
                  onClick={toggleBookmark}
                  type="button"
                  className={`w-8 h-8 rounded-lg inline-flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isBookmarked 
                      ? 'bg-blue-50 hover:bg-blue-100' 
                      : 'hover:bg-gray-100'
                  }`}
                  aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                >
                  {isBookmarked ? (
                    <BookmarkSolidIcon className="w-4 h-4 text-blue-600" />
                  ) : (
                    <BookmarkIcon className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            {companyName && (
              <p className="text-sm text-gray-600 font-medium mb-2 truncate">
                {companyName}
              </p>
            )}

            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                isQuick 
                  ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {isQuick ? '🔗 Quick Link' : '📱 In-App'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                ● Live
              </span>
              {applicantsCount !== null && applicantsCount > 0 && (
                <span className="text-[11px] text-gray-500" aria-label={`${applicantsCount} ${applicantsCount === 1 ? 'applicant' : 'applicants'}`}>
                  {applicantsCount} {applicantsCount === 1 ? 'applicant' : 'applicants'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <p id={descId} className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
          {job.description || 'No description provided.'}
        </p>

        {/* Skills */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {skills.map((skill, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200"
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {/* Job Details Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mb-4 text-sm">
          {location && (
            <div className="flex items-center text-gray-600">
              <MapPinIcon className="w-4 h-4 mr-1.5 text-gray-400 shrink-0" />
              <span className="truncate">{location}</span>
            </div>
          )}
          {job.job_type && (
            <div className="flex items-center text-gray-600">
              <BriefcaseIcon className="w-4 h-4 mr-1.5 text-gray-400 shrink-0" />
              <span className="capitalize truncate">{job.job_type}</span>
            </div>
          )}
          {job.experience_level && (
            <div className="flex items-center text-gray-600">
              <ClockIcon className="w-4 h-4 mr-1.5 text-gray-400 shrink-0" />
              <span className="capitalize truncate">{job.experience_level}</span>
            </div>
          )}
          {salaryText && (
            <div className="flex items-center text-gray-600 font-medium">
              <span className="truncate">💰 {salaryText}</span>
            </div>
          )}
          {job.application_deadline && (
            <div className="flex items-center text-gray-600 col-span-2">
              <CalendarIcon className="w-4 h-4 mr-1.5 text-gray-400 shrink-0" />
              <time
                className="text-xs"
                dateTime={new Date(job.application_deadline).toISOString()}
                title={new Date(job.application_deadline).toLocaleString()}
              >
                Deadline: {new Date(job.application_deadline).toLocaleDateString()}
              </time>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
          <Link 
            className="flex-1 min-w-[120px] px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" 
            to={`/jobs/${job.id}`}
            aria-label={`Open job details for ${job?.title || 'job'}`}
          >
            View Details
          </Link>

          {isQuick ? (
            <a
              href={externalUrl || '#'}
              target={externalUrl ? '_blank' : undefined}
              rel={externalUrl ? 'noopener noreferrer' : undefined}
              className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors text-center inline-flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${!externalUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label={`Apply for ${job?.title || 'job'} (opens in new tab)`}
              aria-disabled={!externalUrl}
            >
              <span>Click here to apply</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ) : (
            <button
              type="button"
              className="flex-1 min-w-[120px] px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              onClick={() => navigate(`/jobs/${job.id}`)}
            >
              {isOwner ? 'View Applications' : 'Apply Now'}
            </button>
          )}

          {employerId && !isOwner && (
            <button
              type="button"
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
              onClick={async () => {
                try { 
                  await requestConnectionForJob(job.id, employerId, user?.id); 
                } catch (e) { 
                  console.error('Failed to request connection:', e); 
                }
                navigate(`/messages?peer=${employerId}&job=${job.id}`);
              }}
              aria-label={`Ask employer about ${job?.title || 'job'}`}
            >
              💬 Ask Employer
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default memo(JobCard);