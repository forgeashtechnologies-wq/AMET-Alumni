import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Avatar from '../../common/Avatar';
import { getAccountStatus, ACCOUNT_STATUS_META } from '../../../utils/accountStatus';

export default function UserDetailDrawer({
  user,
  open,
  onClose,
  onApproveUser,
  onRejectUser,
  onToggleActiveUser,
  onSoftDeleteUser,
  onRestoreUser,
  onPurgeUser,
  onDeleteAuthUser,
  canPurge,
  canHardDelete,
  currentUserId,
  onMentorAction,
  isBusy,
}) {
  const [pendingAction, setPendingAction] = useState(null);
  if (!user) return null;

  const status = getAccountStatus(user);
  const statusMeta = ACCOUNT_STATUS_META[status.code] || ACCOUNT_STATUS_META.unknown;
  const isSelf = currentUserId && user.id === currentUserId;
  const isDeleted = !!user.is_deleted;
  const isActive = user.is_active !== false;
  const mentorStatus = (user.mentor_profile_status || user.mentor_status || 'pending').toLowerCase();
  const hasPendingMentorRequest =
    Boolean(user.mentor_profile_status && user.mentor_profile_status.toLowerCase() === 'pending');

  const buttonBase =
    'inline-flex items-center justify-center rounded-md text-sm font-medium px-3 py-2 min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 w-full sm:w-auto transition-colors';
  const variants = {
    success: 'border border-emerald-500 text-emerald-700 hover:bg-emerald-50 focus-visible:ring-emerald-500',
    warning: 'border border-amber-500 text-amber-700 hover:bg-amber-50 focus-visible:ring-amber-500',
    danger: 'border border-red-600 text-red-700 hover:bg-red-50 focus-visible:ring-red-500',
    neutral: 'border border-slate-300 text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400',
  };

  const executeAction = async (key, actionFn) => {
    if (!actionFn || pendingAction) return;
    setPendingAction(key);
    try {
      await actionFn();
    } finally {
      setPendingAction(null);
    }
  };

  const isDisabled = (key) => pendingAction === key || pendingAction !== null;

  return (
    <Transition.Root show={open} as={React.Fragment}>
      <Dialog as="div" className="relative z-30" onClose={onClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-40 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={React.Fragment}
                enter="transform transition ease-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in duration-200"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col bg-white shadow-xl">
                    <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                      <Dialog.Title className="text-base font-semibold leading-6 text-gray-900">
                        User Details
                      </Dialog.Title>
                      <button
                        type="button"
                        className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2"
                        onClick={onClose}
                      >
                        <span className="sr-only">Close panel</span>
                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
                      <div className="flex items-center space-x-4">
                        <Avatar
                          src={user.avatar_url ?? null}
                          alt={user.full_name || 'User'}
                          size={56}
                          rounded="full"
                        />
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">
                            {user.full_name || 'N/A'}
                          </h2>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <p className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {user.role || 'Unknown role'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 text-sm text-gray-700">
                        <div>
                          <span className="font-medium">Status:</span>{' '}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusMeta.badgeClass}`}>
                            {statusMeta.label}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Location:</span>{' '}
                          {user.location || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Last login:</span>{' '}
                          {user.last_sign_in_at
                            ? new Date(user.last_sign_in_at).toLocaleString()
                            : 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Active:</span>{' '}
                          {user.is_active === false ? 'No' : 'Yes'}
                        </div>
                        <div>
                          <span className="font-medium">Deleted:</span>{' '}
                          {user.is_deleted ? 'Yes' : 'No'}
                        </div>
                        {user.approval_status && (
                          <div>
                            <span className="font-medium">Approval status:</span>{' '}
                            {user.approval_status}
                          </div>
                        )}
                        <section
                          className="pt-4 border-t border-gray-100 space-y-3"
                          role="group"
                          aria-labelledby="admin-actions-heading"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <h3
                              id="admin-actions-heading"
                              className="text-xs font-semibold uppercase tracking-wide text-gray-500"
                            >
                              Admin actions
                            </h3>
                            <p className="text-[11px] text-gray-500">
                              These apply immediately. Confirm before proceeding.
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            <button
                              type="button"
                              disabled={!onApproveUser || isBusy || status.code === 'approved' || pendingAction !== null}
                              onClick={() => executeAction('approve-user', () => onApproveUser?.(user))}
                              className={`${buttonBase} ${variants.success} disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {pendingAction === 'approve-user' ? 'Approving…' : 'Approve user'}
                            </button>
                            <button
                              type="button"
                              disabled={!onRejectUser || isBusy || status.code === 'rejected' || pendingAction !== null}
                              onClick={() => executeAction('reject-user', () => onRejectUser?.(user))}
                              className={`${buttonBase} ${variants.warning} disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {pendingAction === 'reject-user' ? 'Rejecting…' : 'Reject user'}
                            </button>
                            <button
                              type="button"
                              disabled={!onToggleActiveUser || isBusy || isDeleted || pendingAction !== null}
                              onClick={() => executeAction('toggle-active', () => onToggleActiveUser?.(user))}
                              className={`${buttonBase} ${variants.warning} disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {pendingAction === 'toggle-active'
                                ? isActive
                                  ? 'Blocking…'
                                  : 'Unblocking…'
                                : isActive
                                ? 'Block user'
                                : 'Unblock user'}
                            </button>
                            <button
                              type="button"
                              disabled={!onSoftDeleteUser || isBusy || isSelf || pendingAction !== null}
                              onClick={() => executeAction('soft-delete', () => onSoftDeleteUser?.(user))}
                              className={`${buttonBase} ${variants.danger} disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {pendingAction === 'soft-delete' ? 'Deleting…' : 'Soft delete user'}
                            </button>
                            {isDeleted && (
                              <button
                                type="button"
                                disabled={!onRestoreUser || isBusy || isSelf || pendingAction !== null}
                                onClick={() => executeAction('restore-user', () => onRestoreUser?.(user))}
                                className={`${buttonBase} ${variants.success} disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                {pendingAction === 'restore-user' ? 'Restoring…' : 'Restore user'}
                              </button>
                            )}
                            {canPurge && isDeleted && (
                              <button
                                type="button"
                                disabled={!onPurgeUser || isBusy || isSelf || pendingAction !== null}
                                onClick={() => executeAction('purge-data', () => onPurgeUser?.(user))}
                                className={`${buttonBase} ${variants.danger} disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                {pendingAction === 'purge-data' ? 'Purging…' : 'Purge data'}
                              </button>
                            )}
                            {canHardDelete && isDeleted && (
                              <button
                                type="button"
                                disabled={!onDeleteAuthUser || isBusy || isSelf || pendingAction !== null}
                                onClick={() => executeAction('delete-auth', () => onDeleteAuthUser?.(user))}
                                className={`${buttonBase} ${variants.danger} disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                {pendingAction === 'delete-auth' ? 'Deleting login…' : 'Delete Auth user'}
                              </button>
                            )}
                          </div>
                        </section>
                        {hasPendingMentorRequest && (
                          <section
                            className="pt-4 border-t border-gray-100 space-y-3"
                            role="group"
                            aria-labelledby="mentorship-actions-heading"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <h3
                                id="mentorship-actions-heading"
                                className="text-xs font-semibold uppercase tracking-wide text-gray-500"
                              >
                                Mentorship
                              </h3>
                              <p className="text-[11px] text-gray-500">Pending trainer application.</p>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                              <button
                                type="button"
                                disabled={!onMentorAction || isBusy || pendingAction !== null}
                                onClick={() => executeAction('mentor-approve', () => onMentorAction?.(user.id, 'approved'))}
                                className={`${buttonBase} ${variants.success} disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                {pendingAction === 'mentor-approve' ? 'Approving…' : 'Approve as mentor'}
                              </button>
                            </div>
                          </section>
                        )}
                        <p className="sr-only" aria-live="polite">
                          {pendingAction ? 'Processing action, please wait.' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
