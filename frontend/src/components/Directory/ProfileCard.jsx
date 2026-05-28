import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Avatar from '../common/Avatar';
import { formatBatchLabel } from '../../utils/batchYear';
import {
  MapPinIcon,
  AcademicCapIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  ShareIcon,
  UserMinusIcon,
  CheckBadgeIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';

function Chip({ icon: Icon, children }) {
  if (!children) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
      {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
      <span className="max-w-[160px] truncate" title={typeof children === 'string' ? children : undefined}>
        {children}
      </span>
    </span>
  );
}

export default function ProfileCard({
  profile = {},
  avatarUrl,
  onView,
  onConnect,
  onMessage,
  onRemove,
}) {
  const { isAdmin } = useAuth();
  const {
    full_name,
    avatar_url,
    current_job_title,
    company_name,
    location,
    department,
    is_connected,
    request_pending,
    is_verified,
    role,
  } = profile;

  const batchYear = profile.graduation_year ?? profile.expected_graduation_year ?? profile.batch_year ?? null;

  // Resolve avatar src: prefer prop from hook, fallback to profile data, then default
  const avatarSrc = avatarUrl || avatar_url || '/default-avatar.svg';

  const jobLine = [current_job_title, company_name].filter(Boolean).join(' at ');

  return (
    <div className="relative flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm hover:shadow-md hover:border-sky-200 ring-1 ring-transparent hover:ring-sky-50 transition">
      {/* subtle top accent */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-sky-500/0 via-sky-500/30 to-sky-500/0" />

      <div className="grid grid-cols-2 gap-4 h-full">
        {/* Left Side: Avatar and Details */}
        <div className="flex flex-col items-center">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full ring-2 ring-slate-200 bg-slate-100 mb-2 flex items-center justify-center">
            <Avatar src={avatarSrc} alt={full_name || 'Profile'} size={64} />
          </div>

          <div className="text-center">
            <h3 className="line-clamp-1 text-[15px] font-semibold leading-6 text-slate-900" title={full_name}>
              {full_name || ''}
            </h3>
            {is_verified && <CheckBadgeIcon className="h-4 w-4 text-sky-600 mx-auto mt-1" title="Verified" />}
            {isAdmin && role === 'employer' && (
              <div className="mt-1">
                <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 text-[10px] font-medium" title="Employer">
                  Employer
                </span>
              </div>
            )}

            {batchYear && (
              <span className="inline-block mt-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
                {formatBatchLabel(batchYear)}
              </span>
            )}

            <div className="mt-3 space-y-1">
              {department && (
                <Chip icon={AcademicCapIcon}>{department}</Chip>
              )}
              {company_name && (
                <Chip>{company_name}</Chip>
              )}
              {current_job_title && (
                <Chip>{current_job_title}</Chip>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Actions */}
        <div className="flex flex-col justify-center items-center space-y-2">
          {is_connected ? (
            <button
              onClick={onMessage}
              className="w-full inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              Message
            </button>
          ) : request_pending ? (
            <div className="w-full inline-flex items-center justify-center rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600">
              Request Sent
            </div>
          ) : (
            <button
              onClick={onConnect}
              className="w-full inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              Connect
            </button>
          )}

          <button
            onClick={onView}
            className="w-full inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            View Profile
          </button>
        </div>
      </div>

      {/* Chips row for location (if needed) */}
      {location && (
        <div className="mt-4 flex justify-center">
          <Chip icon={MapPinIcon}>{location}</Chip>
        </div>
      )}
    </div>
  );
}
