import React from 'react';
import { Link } from 'react-router-dom';
import { getDeadline, computeJobApplyState, coalesceAppUrl } from '../../utils/jobs';
import { isAdmin } from '../../utils/roles';
import dayjs from 'dayjs';

export default function JobCard({ row, role }) {
  const applyState = computeJobApplyState(row);
  const expired = applyState.isClosed;
  const isQuick = applyState.isQuickLink;
  const externalUrl = coalesceAppUrl(row);
  const deadline = getDeadline(row);
  const deadlineLabel = deadline ? dayjs(deadline).format('DD MMM YYYY') : '—';

  const canManage =
    isAdmin(role) || row.posted_by === row?.__auth_user_id || row.created_by === row?.__auth_user_id;

  return (
    <article className="rounded-2xl border border-gray-200 p-5 shadow-sm bg-white focus-within:ring-2 focus-within:ring-ocean-500 focus-within:ring-offset-2">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-gray-900 leading-snug">{row.title}</h3>
          <p className="text-sm text-gray-600">{row.company_name ?? '—'}</p>
          <p className="text-xs text-gray-500">{row.location ?? '—'}</p>
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
            expired
              ? 'bg-gray-100 text-gray-700 border-gray-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
          aria-label={expired ? 'Applications closed' : 'Live and accepting applications'}
        >
          {expired ? 'Closed' : 'Live'}
        </span>
      </div>

      <div className="mt-3 text-sm text-gray-700 leading-relaxed line-clamp-3">{row.description}</div>

      <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
        <span className="font-medium">Deadline: {deadlineLabel}</span>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        {isQuick ? (
          <a
            href={externalUrl || '#'}
            target={externalUrl ? '_blank' : undefined}
            rel={externalUrl ? 'noopener noreferrer' : undefined}
            className={`inline-flex items-center justify-center rounded-lg bg-ocean-600 text-white text-sm font-semibold px-4 py-2 shadow-sm hover:bg-ocean-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 ${!externalUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-disabled={!externalUrl}
          >
            Click here to apply
          </a>
        ) : canManage ? (
          <>
            <Link
              to={`/jobs/${row.id}/applications`}
              className="inline-flex items-center justify-center rounded-lg bg-ocean-600 text-white text-sm font-semibold px-4 py-2 shadow-sm hover:bg-ocean-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
              aria-label="Manage applications"
            >
              Manage listing
            </Link>
            <Link
              to={`/jobs/${row.id}`}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 text-sm font-semibold px-4 py-2 text-gray-800 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
            >
              View details
            </Link>
          </>
        ) : expired ? (
          <button
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 text-sm font-semibold px-4 py-2 text-gray-500 bg-gray-50 cursor-not-allowed"
            aria-disabled="true"
          >
            Applications closed
          </button>
        ) : (
          <Link
            to={`/jobs/${row.id}`}
            className="inline-flex items-center justify-center rounded-lg bg-ocean-600 text-white text-sm font-semibold px-4 py-2 shadow-sm hover:bg-ocean-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 w-full sm:w-auto"
          >
            View details
          </Link>
        )}
      </div>
    </article>
  );
}
