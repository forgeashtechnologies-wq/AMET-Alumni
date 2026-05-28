import React from 'react';
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';

const ROLE_OPTIONS = [
  { value: 'all', label: 'All Roles' },
  { value: 'alumni', label: 'Alumni' },
  { value: 'employer', label: 'Employer' },
  { value: 'admin', label: 'Admin & Super Admin' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'approved', label: 'Approved' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'deleted', label: 'Deleted' },
];

const MENTOR_STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
];

export default function UserFiltersBar({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
}) {
  const handleRoleChange = (e) => {
    onFiltersChange({ ...filters, role: e.target.value });
  };

  const handleStatusChange = (e) => {
    onFiltersChange({ ...filters, status: e.target.value });
  };

  const handleMentorStatusChange = (e) => {
    onFiltersChange({ ...filters, mentorStatus: e.target.value });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4 md:mb-6">
      <div className="md:col-span-2">
        <label htmlFor="admin-users-search" className="sr-only">
          Search
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            id="admin-users-search"
            type="text"
            className="block w-full rounded-lg border-gray-300 pl-10 pr-10 focus:border-ocean-500 focus:ring-ocean-500 sm:text-sm"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="admin-users-role" className="sr-only">
          Filter by Role
        </label>
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <select
            id="admin-users-role"
            className="block w-full rounded-lg border-gray-300 focus:border-ocean-500 focus:ring-ocean-500 sm:text-sm"
            value={filters.role}
            onChange={handleRoleChange}
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="admin-users-status" className="sr-only">
          Filter by Status
        </label>
        <select
          id="admin-users-status"
          className="block w-full rounded-lg border-gray-300 focus:border-ocean-500 focus:ring-ocean-500 sm:text-sm"
          value={filters.status}
          onChange={handleStatusChange}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="admin-users-mentor-status" className="sr-only">
          Mentor Status
        </label>
        <select
          id="admin-users-mentor-status"
          className="block w-full rounded-lg border-gray-300 focus:border-ocean-500 focus:ring-ocean-500 sm:text-sm"
          value={filters.mentorStatus || 'all'}
          onChange={handleMentorStatusChange}
        >
          {MENTOR_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Mentor: {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
