import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { getFriendlyErrorMessage } from '../../../utils/errors';
import logger from '../../../utils/logger';
import { getAccountStatus, ACCOUNT_STATUS_CODES } from '../../../utils/accountStatus';
import { useAdminUsersGrid } from '../../../hooks/useAdminUsersGrid';
import { changeUserRole } from '../../../utils/changeUserRole';
import EditUserModal from '../EditUserModal';
import UserFiltersBar from './UserFiltersBar';
import UserTable from './UserTable';
import UserDetailDrawer from './UserDetailDrawer';
import {
  UsersIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import {
  adminUsersUpdateProfileApproval,
  adminUsersToggleActive,
  adminUsersSoftDelete,
  adminUsersPurgeData,
  adminUsersDeleteAuthUser,
  adminUsersRestoreUser,
} from '../../../api/adminUsers';
import {
  adminUpdateMenteeStatus,
  adminUpdateMentorStatus,
} from '../../../services/adminMentorship';
import { ConfirmationDialog } from '../../../components/shared';

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const { user: currentUser, role, getUserRole } = useAuth();
  const canHardDelete = role === 'super_admin';
  const canPurge = role === 'super_admin';
  const canSoftDelete = role === 'admin' || role === 'super_admin';

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState({ role: 'all', status: 'all', mentorStatus: 'all' });
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleEditUser, setRoleEditUser] = useState(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  const [isMutating, setIsMutating] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null); // { type, user, ids, count }

  // Debounce search to reduce RPC chatter
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Map UI filters to server-side role/status
  const serverRole = (() => {
    // For 'Admin & Super Admin' UI filter, we do not apply a server-side
    // role constraint and instead filter both roles on the client.
    if (filters.role === 'all' || filters.role === 'admin') return null;
    return filters.role;
  })();

  const serverStatus = (() => {
    if (filters.status === 'all') return null;
    if (filters.status === 'deleted') return null; // deleted handled client-side via flags
    return filters.status;
  })();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useAdminUsersGrid({
    search: debouncedSearch,
    role: serverRole,
    status: serverStatus,
    page,
    pageSize: PAGE_SIZE,
  });

  const rows = data?.rows || [];
  const totalCount = data?.totalCount;

  const deriveMentorStatus = (user) => (user.mentor_profile_status || user.mentor_status || 'pending');

  // Client-side filters for role, status (including deleted), and mentorship statuses.
  // This makes the grid behavior deterministic even if server-side filters change.
  const filteredRows = rows.filter((u) => {
    // Role filter: "Admin" in the UI should match both admin and super_admin.
    if (filters.role && filters.role !== 'all') {
      if (filters.role === 'admin') {
        if (u.role !== 'admin' && u.role !== 'super_admin') {
          return false;
        }
      } else if (u.role !== filters.role) {
        return false;
      }
    }

    // Status filter: use normalized account status so deleted/blocked/pending/approved are consistent.
    if (filters.status && filters.status !== 'all') {
      const status = getAccountStatus(u).code;

      if (
        filters.status === ACCOUNT_STATUS_CODES.DELETED ||
        filters.status === 'deleted'
      ) {
        if (status !== ACCOUNT_STATUS_CODES.DELETED) return false;
      } else if (status !== filters.status) {
        return false;
      }
    }

    // Filter by mentor status (client-side only)
    if (filters.mentorStatus && filters.mentorStatus !== 'all') {
      const userMentorStatus = deriveMentorStatus(u).toLowerCase();
      if (userMentorStatus !== filters.mentorStatus.toLowerCase()) {
        return false;
      }
    }

    return true;
  });

  const loading = isLoading || isMutating;

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleOpenEditRole = (user) => {
    setRoleEditUser(user);
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = async (userId, newRole) => {
    const sourceUser =
      rows.find((u) => u.id === userId) || roleEditUser;

    if (!sourceUser) {
      toast.error('User not found');
      return;
    }

    const oldRole = sourceUser.role;

    setIsMutating(true);
    try {
      const { success, error } = await changeUserRole({
        userId,
        oldRole,
        newRole,
      });

      if (!success) {
        if (error) {
          logger.error('Failed to change user role:', error);
        }
        return;
      }

      await refetch();
    } catch (err) {
      logger.error('Error updating user role from AdminUsersPage:', err);
      toast.error(
        `Failed to update role: ${getFriendlyErrorMessage(
          err,
          'Unable to update user role.'
        )}`
      );
    } finally {
      setIsMutating(false);
      setIsRoleModalOpen(false);
      setRoleEditUser(null);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredRows.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRows.map((u) => u.id));
    }
  };

  const handleApprove = async (user) => {
    setIsMutating(true);
    try {
      await adminUsersUpdateProfileApproval({
        profileId: user.id,
        decision: 'approve',
        notes: null,
      });
      await refetch();
      toast.success(`${user.full_name || user.email} has been approved.`);
    } catch (err) {
      logger.error('Error approving user:', err);
      toast.error(
        `Failed to approve user: ${getFriendlyErrorMessage(
          err,
          'Unable to approve user.'
        )}`
      );
    } finally {
      setIsMutating(false);
    }
  };

  const handleReject = async (user) => {
    const reason = window.prompt('Reason for rejection (optional):');
    setIsMutating(true);
    try {
      await adminUsersUpdateProfileApproval({
        profileId: user.id,
        decision: 'reject',
        notes: reason || null,
      });
      await refetch();
      toast.success('User has been rejected.');
    } catch (err) {
      logger.error('Error rejecting user:', err);
      toast.error(
        `Failed to reject user: ${getFriendlyErrorMessage(
          err,
          'Unable to reject user.'
        )}`
      );
    } finally {
      setIsMutating(false);
    }
  };

  const handleToggleActive = async (user) => {
    if (user.is_deleted) return;

    const currentlyActive = user.is_active !== false;
    const confirmLabel = currentlyActive
      ? `Block ${user.email || user.full_name || 'this user'}? They will not be able to use the platform.`
      : `Unblock ${user.email || user.full_name || 'this user'} and allow access again?`;

    if (!window.confirm(confirmLabel)) return;

    setIsMutating(true);
    try {
      await adminUsersToggleActive({
        userId: user.id,
        isActive: !currentlyActive,
        reason: currentlyActive
          ? 'Blocked from Admin Users page'
          : 'Unblocked from Admin Users page',
      });
      await refetch();
      toast.success(currentlyActive ? 'User has been blocked.' : 'User has been unblocked.');
    } catch (err) {
      logger.error('Error toggling user active state:', err);
      toast.error(
        getFriendlyErrorMessage(err, 'Unable to change user active status.')
      );
    } finally {
      setIsMutating(false);
    }
  };

  const handleSoftDelete = (user) => {
    if (user.id === currentUser?.id) {
      toast.error('You cannot delete your own account.');
      return;
    }

    if (!canSoftDelete) {
      toast.error('Only admins can soft delete users.');
      return;
    }

    setConfirmDialog({
      type: 'soft-delete',
      user,
    });
  };

  const handlePurge = async (user) => {
    if (user.id === currentUser?.id) {
      toast.error('You cannot purge your own account data.');
      return;
    }

    setConfirmDialog({
      type: 'purge',
      user,
    });
  };

  const handleDeleteAuth = (user) => {
    if (user.id === currentUser?.id) {
      toast.error('You cannot delete your own account.');
      return;
    }

    setConfirmDialog({
      type: 'delete-auth',
      user,
    });
  };

  const handleRestoreUser = async (user) => {
    if (!user?.id) return;
    if (!user.is_deleted) return;
    if (!window.confirm(`Restore ${user.email || user.full_name || 'this user'}?`)) return;

    setIsMutating(true);
    try {
      await adminUsersRestoreUser({
        userId: user.id,
        reason: 'Restored from Admin Users page',
      });
      await refetch();
      toast.success('User restored');
    } catch (err) {
      logger.error('Error restoring user:', err);
      toast.error(
        `Failed to restore user: ${getFriendlyErrorMessage(
          err,
          'Unable to restore user.'
        )}`
      );
    } finally {
      setIsMutating(false);
    }
  };

  const handleMenteeAction = async (userId, status) => {
    setIsMutating(true);
    try {
      await adminUpdateMenteeStatus(userId, status);
      await refetch();
      toast.success(`Mentee status set to ${status}.`);
    } catch (err) {
      logger.error('Error updating mentee status:', err);
      toast.error(
        `Failed to update mentee status: ${getFriendlyErrorMessage(
          err,
          'Unable to update mentee status.'
        )}`
      );
    } finally {
      setIsMutating(false);
    }
  };

  const handleMentorAction = async (userId, status) => {
    setIsMutating(true);
    try {
      await adminUpdateMentorStatus(userId, status);
      await refetch();
      toast.success(`Mentor status set to ${status}.`);
    } catch (err) {
      logger.error('Error updating mentor status:', err);
      toast.error(
        `Failed to update mentor status: ${getFriendlyErrorMessage(
          err,
          'Unable to update mentor status.'
        )}`
      );
    } finally {
      setIsMutating(false);
    }
  };

  const handleBulkAction = async (action) => {
    if (!selectedIds.length) return;

    if (action === 'approve' || action === 'reject') {
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      setIsMutating(true);
      const results = await Promise.allSettled(
        selectedIds.map((id) =>
          adminUsersUpdateProfileApproval({
            profileId: id,
            decision: action === 'approve' ? 'approve' : 'reject',
            notes: null,
          })
        )
      );
      const ok = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - ok;
      if (ok) {
        await refetch();
      }
      setSelectedIds([]);
      setIsMutating(false);
      if (ok) toast.success(`${newStatus === 'approved' ? 'Approved' : 'Rejected'} ${ok} user(s).`);
      if (failed) toast.error(`Failed to ${newStatus} ${failed} user(s).`);
      return;
    }

    if (action === 'delete') {
      if (!canSoftDelete) {
        toast.error('Only admins can soft delete users.');
        return;
      }
      setConfirmDialog({
        type: 'bulk-soft-delete',
        ids: selectedIds,
        count: selectedIds.length,
      });
      return;
    }
  };

  const runSoftDelete = async () => {
    const user = confirmDialog?.user;
    if (!user) return;

    setIsMutating(true);
    try {
      await adminUsersSoftDelete({
        userId: user.id,
        reason: 'Soft delete from Admin Users page',
      });
      await refetch();
      toast.success('User soft-deleted');
    } catch (err) {
      logger.error('Error soft-deleting user:', err);
      toast.error(
        `Failed to delete user: ${getFriendlyErrorMessage(
          err,
          'Unable to delete user.'
        )}`
      );
    } finally {
      setIsMutating(false);
      setConfirmDialog(null);
    }
  };

  const runPurge = async () => {
    const user = confirmDialog?.user;
    if (!user) return;

    setIsMutating(true);
    try {
      await adminUsersPurgeData({ userId: user.id });
      await refetch();
      toast.success('User data purged');
    } catch (err) {
      logger.error('Error purging user data:', err);
      toast.error(
        `Failed to purge user data: ${getFriendlyErrorMessage(
          err,
          'Unable to purge user data.'
        )}`
      );
    } finally {
      setIsMutating(false);
      setConfirmDialog(null);
    }
  };

  const runDeleteAuth = async () => {
    const user = confirmDialog?.user;
    if (!user) return;

    setIsMutating(true);
    try {
      await adminUsersDeleteAuthUser({ userId: user.id });
      await refetch();
      toast.success('Auth user deleted successfully');
    } catch (err) {
      logger.error('Error deleting auth user:', err);
      toast.error(
        `Failed to delete auth user: ${getFriendlyErrorMessage(
          err,
          'Unable to delete auth user.'
        )}`
      );
    } finally {
      setIsMutating(false);
      setConfirmDialog(null);
    }
  };

  const runBulkSoftDelete = async () => {
    const ids = confirmDialog?.ids || [];
    if (!ids.length) return;
    if (ids.includes(currentUser?.id)) {
      toast.error('You cannot delete your own account.');
      return;
    }

    setIsMutating(true);
    const results = await Promise.allSettled(
      ids.map((id) =>
        adminUsersSoftDelete({
          userId: id,
          reason: 'Bulk soft delete from Admin Users page',
        })
      )
    );
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - ok;
    setSelectedIds([]);
    setIsMutating(false);
    if (ok) toast.success(`Soft-deleted ${ok} user(s).`);
    if (failed) toast.error(`Failed to delete ${failed} user(s).`);
    await refetch();
    setConfirmDialog(null);
  };

  return (
    <div className="bg-gray-50/50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
            <UsersIcon className="w-7 h-7 sm:w-8 sm:h-8 mr-3 text-ocean-500" />
            User Management
          </h1>
          <p className="mt-1 text-gray-600 text-sm sm:text-base">
            Oversee, manage, and moderate all users on the platform.
          </p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg">
          <UserFiltersBar
            search={search}
            onSearchChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            filters={filters}
            onFiltersChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
          />

          {selectedIds.length > 0 && (
            <div className="bg-ocean-50 border border-ocean-200 rounded-lg p-3 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm font-medium text-ocean-800">
                {selectedIds.length} user{selectedIds.length > 1 && 's'} selected
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => handleBulkAction('approve')}
                  className="text-sm font-medium text-green-600 hover:text-green-800 flex items-center"
                >
                  <CheckCircleIcon className="w-4 h-4 mr-1" /> Approve
                </button>
                <button
                  onClick={() => handleBulkAction('reject')}
                  className="text-sm font-medium text-yellow-600 hover:text-yellow-800 flex items-center"
                >
                  <XCircleIcon className="w-4 h-4 mr-1" /> Reject
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="text-sm font-medium text-red-600 hover:text-red-800 flex items-center"
                >
                  <TrashIcon className="w-4 h-4 mr-1" /> Delete
                </button>
              </div>
            </div>
          )}

          <UserTable
            rows={filteredRows}
            loading={loading}
            error={isError ? error : null}
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={totalCount}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            onView={(user) => setSelectedUser(user)}
            onEditRole={handleOpenEditRole}
            onApprove={handleApprove}
            onReject={handleReject}
            onToggleActive={handleToggleActive}
            onSoftDelete={handleSoftDelete}
            onRestoreUser={handleRestoreUser}
            onPurge={handlePurge}
            onDeleteAuth={handleDeleteAuth}
            canPurge={canPurge}
            canHardDelete={canHardDelete}
            currentUserId={currentUser?.id}
            onPageChange={setPage}
            onMenteeAction={handleMenteeAction}
            onMentorAction={handleMentorAction}
            deriveMentorStatus={deriveMentorStatus}
          />
        </div>
      </div>

      {/* Confirmation dialogs for destructive actions */}
      <ConfirmationDialog
        isOpen={confirmDialog?.type === 'soft-delete'}
        onClose={() => setConfirmDialog(null)}
        onConfirm={runSoftDelete}
        title="Soft delete user"
        description={`You are about to soft delete ${
          confirmDialog?.user?.email || confirmDialog?.user?.full_name || 'this user'
        }.`}
        variant="danger"
      >
        <ul className="mt-3 text-sm text-gray-600 list-disc list-inside space-y-1">
          <li>The user will no longer be able to sign in or use the platform.</li>
          <li>Their account will be marked as deleted but retained for audit/history.</li>
        </ul>
      </ConfirmationDialog>

      <ConfirmationDialog
        isOpen={confirmDialog?.type === 'purge'}
        onClose={() => setConfirmDialog(null)}
        onConfirm={runPurge}
        title="Purge user data"
        description={`DANGER: permanently purge most in-app data for ${
          confirmDialog?.user?.email || confirmDialog?.user?.full_name || 'this user'
        }.`}
        variant="danger"
      >
        <ul className="mt-3 text-sm text-gray-600 list-disc list-inside space-y-1">
          <li>This will remove most profile- and activity-related records from the application database.</li>
          <li>Intended for GDPR/right-to-erasure or serious abuse cases.</li>
          <li>This operation cannot be undone.</li>
        </ul>
      </ConfirmationDialog>

      <ConfirmationDialog
        isOpen={confirmDialog?.type === 'delete-auth'}
        onClose={() => setConfirmDialog(null)}
        onConfirm={runDeleteAuth}
        title="Delete Auth user"
        description={`DANGER: delete the Supabase Auth account for ${
          confirmDialog?.user?.email || confirmDialog?.user?.full_name || 'this user'
        }.`}
        variant="danger"
      >
        <ul className="mt-3 text-sm text-gray-600 list-disc list-inside space-y-1">
          <li>The user will no longer be able to log in with this account.</li>
          <li>Some data may become orphaned until it is cleaned up.</li>
          <li>This operation cannot be undone.</li>
        </ul>
      </ConfirmationDialog>

      <ConfirmationDialog
        isOpen={confirmDialog?.type === 'bulk-soft-delete'}
        onClose={() => setConfirmDialog(null)}
        onConfirm={runBulkSoftDelete}
        title="Soft delete multiple users"
        description={`You are about to soft delete ${confirmDialog?.count || 0} user(s).`}
        variant="danger"
      >
        <ul className="mt-3 text-sm text-gray-600 list-disc list-inside space-y-1">
          <li>All selected users will lose access to the platform.</li>
          <li>Their accounts will be marked as deleted but retained for audit/history.</li>
        </ul>
      </ConfirmationDialog>

      <UserDetailDrawer
        user={selectedUser}
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        onApproveUser={handleApprove}
        onRejectUser={handleReject}
        onToggleActiveUser={handleToggleActive}
        onSoftDeleteUser={handleSoftDelete}
        onRestoreUser={handleRestoreUser}
        onPurgeUser={handlePurge}
        onDeleteAuthUser={handleDeleteAuth}
        canPurge={canPurge}
        canHardDelete={canHardDelete}
        currentUserId={currentUser?.id}
        onMentorAction={handleMentorAction}
        isBusy={loading}
      />

      <EditUserModal
        user={roleEditUser}
        isOpen={isRoleModalOpen}
        onClose={() => {
          setIsRoleModalOpen(false);
          setRoleEditUser(null);
        }}
        onSave={handleSaveRole}
        isSuperAdminActor={getUserRole && getUserRole() === 'super_admin'}
      />
    </div>
  );
}
