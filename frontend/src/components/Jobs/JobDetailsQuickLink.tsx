import React from 'react';
import { isQuickLink, coalesceAppUrl } from '../../utils/jobs';
import { isOpen } from '../../utils/deadlines';
import { supabase } from '../../utils/supabase';

export default function JobDetailsQuickLink({ job, viewerRole, isOwner, onChanged }: any) {
  const quick = isQuickLink(job);
  const open = isOpen(job);
  const appUrl = coalesceAppUrl(job);
  const canOwnerDisable = quick && (isOwner || viewerRole === 'admin' || viewerRole === 'super_admin');

  const disableJob = async () => {
    const { error } = await supabase.from('jobs').update({ is_active: false }).eq('id', job.id);
    if (error) console.error('Disable failed', error);
    onChanged?.();
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{job.title}</h1>
          <div className="opacity-80">{job.company_name} • {job.location}</div>
        </div>
        {quick && <span className="text-xs px-2 py-1 rounded bg-gray-200">Quick Link</span>}
      </header>

      <div className="flex items-center gap-3">
        {quick && open ? (
          <a href={appUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 rounded bg-black text-white">
            Apply Externally
          </a>
        ) : (
          <button className="px-4 py-2 rounded border" disabled>
            Applications Closed
          </button>
        )}

        {canOwnerDisable && (
          <button onClick={disableJob} className="px-4 py-2 rounded border">Disable</button>
        )}
      </div>

      {quick && (
        <p className="text-sm opacity-70">
          External listing. You will be redirected to the employer's site to apply. Availability depends on the external deadline.
        </p>
      )}

      {job?.description && String(job.description).trim() && (
        <article className="prose max-w-none whitespace-pre-wrap">{job.description}</article>
      )}
    </div>
  );
}
