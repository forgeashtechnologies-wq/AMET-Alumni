import React from 'react';
import { isQuickLink, coalesceAppUrl } from '../../utils/jobs';
import { isOpen } from '../../utils/deadlines';
import { supabase } from '../../utils/supabase';

interface Props {
  job: any;
  viewerRole: 'alumni' | 'student' | 'employer' | 'admin' | 'super_admin';
  isOwner?: boolean;
  onChanged?: () => void;
}

const Role = {
  isAdminLike: (r: string) => r === 'admin' || r === 'super_admin',
  isEmployer: (r: string) => r === 'employer',
};

export default function JobCard({ job, viewerRole, isOwner = false, onChanged }: Props) {
  const quick = isQuickLink(job);
  const open = isOpen(job);
  const appUrl = coalesceAppUrl(job);

  const canOwnerDisable = quick && (isOwner || Role.isAdminLike(viewerRole));
  const showApplicantApply = viewerRole === 'alumni' || viewerRole === 'student';

  const disableJob = async () => {
    const { error } = await supabase.from('jobs').update({ is_active: false }).eq('id', job.id);
    if (error) console.error('Disable failed', error);
    onChanged?.();
  };

  return (
    <div className="rounded-2xl border p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">{job.title}</div>
          <div className="text-sm opacity-80">{job.company_name} • {job.location}</div>
        </div>
        {quick && <span className="text-xs px-2 py-1 rounded bg-gray-200">Quick Link</span>}
      </div>

      {job?.description && String(job.description).trim() && (
        <p className="text-sm line-clamp-3 whitespace-pre-wrap opacity-90">{job.description}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {quick ? (
            open ? (
              <a
                href={appUrl || '#'}
                target={appUrl ? '_blank' : undefined}
                rel={appUrl ? 'noopener noreferrer' : undefined}
                className={`inline-flex items-center px-3 py-2 text-sm rounded bg-black text-white ${!appUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-disabled={!appUrl}
              >
                Click here to apply
              </a>
            ) : (
              <button className="px-3 py-2 text-sm rounded border" disabled>
                Applications Closed
              </button>
            )
          ) : (
            showApplicantApply ? (
              <button className="px-3 py-2 text-sm rounded bg-black text-white">Apply</button>
            ) : (
              <span className="text-xs px-2 py-1 rounded border opacity-80">In-App</span>
            )
          )}
        </div>

        <div className="flex items-center gap-2">
          {quick && (
            <span className="text-xs opacity-70">External listing • Redirects to employer site</span>
          )}
          {canOwnerDisable && (
            <button onClick={disableJob} className="px-3 py-2 text-sm rounded border">Disable</button>
          )}
        </div>
      </div>
    </div>
  );
}
