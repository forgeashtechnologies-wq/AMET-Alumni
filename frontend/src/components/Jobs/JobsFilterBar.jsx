import React from 'react';
import { isAdmin, isEmployer } from '../../utils/roles';

export default function JobsFilterBar({
  role,
  search, setSearch,
  sort, setSort,
  expiredOnly, setExpiredOnly,
}) {
  const canSeeExpired = isAdmin(role) || isEmployer(role);

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search title or company"
        className="border rounded-lg px-3 py-1.5 text-sm w-[260px]"
      />

      <select
        value={sort}
        onChange={(e) => setSort(e.target.value)}
        className="border rounded-lg px-3 py-1.5 text-sm"
        aria-label="Sort jobs"
      >
        <option value="newest">Date Posted (Newest)</option>
        <option value="deadline">Deadline (Soonest)</option>
        <option value="alpha">Alphabetical (A–Z)</option>
      </select>

      {canSeeExpired && (
        <label className="ml-auto inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={expiredOnly}
            onChange={(e) => setExpiredOnly(e.target.checked)}
            className="h-4 w-4"
          />
          <span>Expired only</span>
        </label>
      )}
    </div>
  );
}
