import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Avatar from '../../common/Avatar';
import { getAccountStatus, ACCOUNT_STATUS_META } from '../../../utils/accountStatus';
import {
  UsersIcon,
  MapPinIcon,
  EyeIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  TrashIcon,
  EllipsisVerticalIcon,
  AcademicCapIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

const ROLE_MAPPINGS = {
  alumni: 'Alumni',
  mentor: 'Mentor',
  employer: 'Employer',
  mentee_student: 'Mentee/Student',
  student: 'Mentee/Student',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

function getRoleBadge(role) {
  switch (role) {
    case 'admin':
    case 'super_admin':
      return 'bg-purple-100 text-purple-800';
    case 'mentor':
      return 'bg-ocean-100 text-ocean-800';
    case 'employer':
      return 'bg-indigo-100 text-indigo-800';
    case 'mentee_student':
    case 'student':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getRoleLabel(role) {
  return ROLE_MAPPINGS[role] || 'Unknown';
}

function StatusBadge({ value }) {
  if (!value) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
        Not set
      </span>
    );
  }

  const normalized = value.toLowerCase();
  const styles =
    normalized === 'approved'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : normalized === 'pending'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : normalized === 'rejected'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : 'bg-slate-50 text-slate-700 border-slate-200'; // suspended/other

  const label = normalized.charAt(0).toUpperCase() + normalized.slice(1);

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${styles}`}>
      {label}
    </span>
  );
}

function RowActionsMenu({
  user,
  status,
  onApprove,
  onReject,
  onSoftDelete,
  onRestoreUser,
  onMenteeAction,
  onMentorAction,
  currentUserId,
  onPurge,
  onDeleteAuth,
  canPurge,
  canHardDelete,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (!isOpen || !buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();

    const preferredTop = rect.bottom + 8; // open downward by default
    const menuHeight = 320; // approximate max menu height in px
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    let top = preferredTop;

    // If there isn't enough space below, open above the button instead.
    if (preferredTop + menuHeight > viewportHeight && rect.top - 8 > menuHeight) {
      top = rect.top - 8 - menuHeight;
    }

    const right = (window.innerWidth || document.documentElement.clientWidth) - rect.right - 8;

    setMenuPosition({ top, right: Math.max(right, 8) });
  }, [isOpen]);

  if (!onApprove || !onReject || !onSoftDelete) return null;

  return (
    <div className="relative">
      <button
        title="User actions"
        ref={buttonRef}
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center justify-center w-[40px] h-[40px] rounded-lg text-gray-400 hover:text-ocean-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
      >
        <EllipsisVerticalIcon className="w-4 h-4" />
      </button>
      {isOpen &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div
              className="fixed z-50 w-56 max-h-[320px] overflow-y-auto origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
              style={{ top: menuPosition.top, right: menuPosition.right }}
            >
            <div className="py-1">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100">
                Account moderation
              </div>
              <button
                onClick={() => {
                  if (status.code === 'approved') return;
                  onApprove(user);
                  setIsOpen(false);
                }}
                disabled={status.code === 'approved'}
                className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-700"
              >
                <CheckCircleIcon className="w-4 h-4 text-green-600" />
                Approve user
              </button>
              <button
                onClick={() => {
                  if (status.code === 'rejected') return;
                  onReject(user);
                  setIsOpen(false);
                }}
                disabled={status.code === 'rejected'}
                className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-700"
              >
                <XCircleIcon className="w-4 h-4 text-red-600" />
                Reject user
              </button>
              {!user.is_deleted && user.id !== currentUserId && (
                <button
                  title="Soft delete: close the account but keep all data. User becomes read-only and cannot perform new actions. Contact your administrator for more information."
                  onClick={() => {
                    onSoftDelete(user);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 text-gray-700"
                >
                  <TrashIcon className="w-4 h-4 text-red-600" />
                  Soft delete user
                </button>
              )}
              {user.is_deleted && user.id !== currentUserId && onRestoreUser && (
                <button
                  title="Restore: re-enable a soft-deleted user."
                  onClick={() => {
                    onRestoreUser(user);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 text-gray-700"
                >
                  <UsersIcon className="w-4 h-4 text-ocean-600" />
                  Restore user
                </button>
              )}
              {user.is_deleted && user.id !== currentUserId && (canPurge || canHardDelete) && (
                <>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b border-t border-gray-100 mt-1">
                    Danger zone
                  </div>
                  {canPurge && onPurge && (
                    <button
                      title="Purge data: permanently remove this user's data from the app. This cannot be undone. Contact your administrator for more information."
                      onClick={() => {
                        onPurge(user);
                        setIsOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-red-50 text-red-700"
                    >
                      <DocumentArrowDownIcon className="w-4 h-4" />
                      Purge data
                    </button>
                  )}
                  {canHardDelete && onDeleteAuth && (
                    <button
                      title="Delete Auth user: remove this user's login from the system. This cannot be undone. Contact your administrator for more information."
                      onClick={() => {
                        onDeleteAuth(user);
                        setIsOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-red-50 text-red-800"
                    >
                      <DocumentArrowUpIcon className="w-4 h-4" />
                      Delete Auth user
                    </button>
                  )}
                </>
              )}
            </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}

export default function UserTable({
  rows,
  loading,
  error,
  page,
  pageSize,
  totalCount,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onView,
  onEditRole,
  onApprove,
  onReject,
  onToggleActive,
  onSoftDelete,
  onRestoreUser,
  onPurge,
  onDeleteAuth,
  canPurge,
  canHardDelete,
  currentUserId,
  onPageChange,
  onMenteeAction,
  onMentorAction,
  deriveMentorStatus,
}) {
  const hasTotalCount = typeof totalCount === 'number';
  const totalPages = hasTotalCount
    ? Math.max(1, Math.ceil(totalCount / pageSize))
    : null;
  const canGoNext = hasTotalCount
    ? page < totalPages
    : rows.length === pageSize;

  const pageStartIndex = rows.length ? (page - 1) * pageSize + 1 : 0;
  const pageEndIndex = rows.length ? pageStartIndex + rows.length - 1 : 0;

  if (loading && !rows.length) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-500">
        Loading users...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load users. Please try again.
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-600">
        <UsersIcon className="w-8 h-8 mx-auto mb-3 text-gray-400" />
        <p>No users found for the current filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="relative py-3.5 pl-4 pr-3 text-left sm:pl-6">
                <input
                  type="checkbox"
                  className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-ocean-600 focus:ring-ocean-500"
                  checked={rows.length > 0 && selectedIds.length === rows.length}
                  onChange={onToggleSelectAll}
                />
              </th>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                User
              </th>
              <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">
                Role
              </th>
              <th scope="col" className="px-2 py-3.5 text-left text-sm font-semibold text-gray-900">
                <span className="sr-only">Edit role</span>
              </th>
              <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">
                Status
              </th>
              <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">
                Mentor Status
              </th>
              <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">
                Location
              </th>
              <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">
                Last Login
              </th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {rows.map((user) => {
              const selected = selectedIds.includes(user.id);
              const status = getAccountStatus(user);
              const statusMeta = ACCOUNT_STATUS_META[status.code] || ACCOUNT_STATUS_META.unknown;

              return (
                <tr key={user.id} className={selected ? 'bg-ocean-50' : ''}>
                  <td className="relative py-4 pl-4 pr-3 sm:pl-6">
                    <input
                      type="checkbox"
                      className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-ocean-600 focus:ring-ocean-500"
                      checked={selected}
                      onChange={() => onToggleSelect(user.id)}
                    />
                  </td>
                  <td className="py-4 pl-4 pr-3 text-sm sm:pl-6">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center">
                        <Avatar
                          src={user.avatar_url ?? null}
                          alt={user.full_name || 'User'}
                          size={40}
                          rounded="full"
                        />
                      </div>
                      <div className="ml-4">
                        <div className="font-medium text-gray-900">{user.full_name || 'N/A'}</div>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        {user.current_position && (
                          <p className="text-xs text-gray-500">{user.current_position}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        title="View details"
                        onClick={() => onView(user)}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-gray-400 hover:text-ocean-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadge(
                          user.role
                        )}`}
                      >
                        {getRoleLabel(user.role)}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-2">
                    <button
                      type="button"
                      title="Edit role"
                      onClick={() => onEditRole(user)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-full text-gray-400 hover:text-ocean-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${statusMeta.badgeClass}`}
                    >
                      {statusMeta.label}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <StatusBadge value={deriveMentorStatus ? deriveMentorStatus(user) : user.mentor_status} />
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPinIcon className="w-4 h-4 mr-1" />
                      {user.location || 'N/A'}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-gray-600" title={user.last_sign_in_at || ''}>
                      {user.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleString()
                        : 'N/A'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <RowActionsMenu
                        user={user}
                        status={status}
                        onApprove={onApprove}
                        onReject={onReject}
                        onToggleActive={onToggleActive}
                        onSoftDelete={onSoftDelete}
                        onRestoreUser={onRestoreUser}
                        onMenteeAction={onMenteeAction}
                        onMentorAction={onMentorAction}
                        currentUserId={currentUserId}
                        onPurge={onPurge}
                        onDeleteAuth={onDeleteAuth}
                        canPurge={canPurge}
                        canHardDelete={canHardDelete}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
        <p className="text-sm text-gray-600">
          {hasTotalCount && totalCount > 0 ? (
            <>
              Showing <span className="font-medium">{pageStartIndex}</span>
              {'–'}
              <span className="font-medium">{pageEndIndex}</span>
              {' '}of <span className="font-medium">{totalCount}</span> users
              {' '}• Page <span className="font-medium">{page}</span>
              {totalPages && (
                <>
                  {' '} / <span className="font-medium">{totalPages}</span>
                </>
              )}
            </>
          ) : (
            <>
              Page <span className="font-medium">{page}</span>
              {totalPages && (
                <>
                  {' '} / <span className="font-medium">{totalPages}</span>
                </>
              )}
            </>
          )}
        </p>
        <div className="flex space-x-2">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="inline-flex items-center justify-center min-h-[40px] px-4 rounded-lg border-2 border-ocean-600 text-ocean-600 hover:bg-ocean-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
          >
            Previous
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={!canGoNext}
            className="inline-flex items-center justify-center min-h-[40px] px-4 rounded-lg border-2 border-ocean-600 text-ocean-600 hover:bg-ocean-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
