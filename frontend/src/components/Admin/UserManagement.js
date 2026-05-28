import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';
import logger from '../../utils/logger';
import Avatar from '../common/Avatar';
import { useAvatars } from '../../hooks/useAvatar';
import { adminUpdateProfileApproval, adminListProfilesForApproval, adminCountProfilesForApproval } from '../../api/admin';
import { isRole } from '../../utils/roles';
import { changeUserRole } from '../../utils/changeUserRole';
import { getAccountStatus, ACCOUNT_STATUS_META } from '../../utils/accountStatus';
import { 
  UsersIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  EyeIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { getFriendlyErrorMessage } from '../../utils/errors';
import UserDetailsModal from './UserDetailsModal';
import EditUserModal from './EditUserModal';
import RejectUserModal from './RejectUserModal';
import MentorsTab from './MentorsTab';
import { ConfirmationDialog, DeleteConfirmationDialog } from '../../components/shared';

const UserManagement = () => {
  const { hasPermission, user: currentUser, getUserRole, role } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchInputRef = useRef(null);
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(null);

  const [filters, setFilters] = useState({
    role: 'all',
    alumni_verification_status: 'all', // legacy UI label; we will map to approval_status
  });
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const canHardDelete = role === 'super_admin';
  const canPurge = role === 'super_admin';
  const [confirmDialog, setConfirmDialog] = useState(null);
  
  const softDeleteUser = async (userId, reason) => {
    setDeletingId(userId);
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_soft_delete_user', {
        target: userId,
        p_reason: reason || null,
      });
      if (error) {
        logger.error('Soft delete failed:', error);
        toast.error(`Delete failed: ${getFriendlyErrorMessage(error, 'Unable to delete user.')}`);
        return { success: false, error };
      }
      
      toast.success('User soft-deleted');
      await fetchUsers(); // refresh the users list
      return { success: true };
    } catch (err) {
      logger.error('Error in soft delete:', err);
      toast.error(`Delete failed: ${getFriendlyErrorMessage(err, 'Unable to delete user.')}`);
      return { success: false, error: err };
    } finally {
      setDeletingId(null);
      setLoading(false);
    }
  };

  // Final step: delete Supabase Auth user via Edge Function
  const deleteAuthUser = async (userId) => {
    // Prevent self-delete safety
    if (userId === currentUser?.id) {
      toast.error('You cannot delete your own account.');
      return { success: false };
    }
    setDeletingId(userId);
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_delete_user_rpc', {
        target: userId,
      });

      if (error) {
        logger.error('Auth delete failed:', error);
        toast.error(`Auth delete failed: ${getFriendlyErrorMessage(error, 'Unable to delete auth user.')}`);
        return { success: false, error };
      }

      // admin_delete_user_rpc returns a JSONB payload; treat non-null data as success
      toast.success('Auth user deleted successfully');
      await fetchUsers();
      return { success: true, data };
    } catch (err) {
      logger.error('Error invoking admin_delete_user_rpc:', err);
      toast.error(`Auth delete failed: ${getFriendlyErrorMessage(err, 'Unable to delete auth user.')}`);
      return { success: false, error: err };
    } finally {
      setDeletingId(null);
      setLoading(false);
    }
  };
  
  const purgeUserData = async (userId) => {
    setDeletingId(userId);
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_purge_user_data', { target: userId });
      if (error) {
        logger.error('Purge failed:', error);
        toast.error(`Purge failed: ${getFriendlyErrorMessage(error, 'Unable to purge user data.')}`);
        return { success: false, error };
      }
      
      toast.success('User data purged');
      await fetchUsers(); // refresh the users list
      return { success: true };
    } catch (err) {
      logger.error('Error in purge:', err);
      toast.error(`Purge failed: ${getFriendlyErrorMessage(err, 'Unable to purge user data.')}`);
      return { success: false, error: err };
    } finally {
      setDeletingId(null);
      setLoading(false);
    }
  };
  
  // Legacy function - keep for compatibility but convert to soft delete
  const callAdminDeleteUser = async (userId) => {
    logger.log(`Converting deletion to soft delete for user ${userId}`);
    return softDeleteUser(userId);
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  // Debounce search input to reduce network churn and UI jank
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [debouncedQuery, page]);

  // Reset to page 1 when filters, tab, or search change
  useEffect(() => {
    setPage(1);
  }, [selectedTab, filters, debouncedQuery]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = debouncedQuery && debouncedQuery.trim();

      let activeStatusFilter = null;
      let activeRoleFilter = null;

      // Map selectedTab to server-side filters
      if (selectedTab === 'pending') {
        activeStatusFilter = 'pending';
      } else if (selectedTab === 'rejected') {
        activeStatusFilter = 'rejected';
      }

      if (selectedTab === 'employers') {
        activeRoleFilter = 'employer';
      }

      // Map dropdown role filter (overrides tab role when specific)
      if (filters.role && filters.role !== 'all') {
        if (filters.role === 'alumni') {
          activeRoleFilter = 'alumni';
        } else if (filters.role === 'employer') {
          activeRoleFilter = 'employer';
        } else if (filters.role === 'admin') {
          activeRoleFilter = 'admin';
        }
      }

      // Map dropdown status filter (excluding deleted which is handled client-side)
      if (
        filters.alumni_verification_status &&
        filters.alumni_verification_status !== 'all' &&
        filters.alumni_verification_status !== 'deleted'
      ) {
        activeStatusFilter = filters.alumni_verification_status;
      }

      const limit = PAGE_SIZE;
      const offset = (page - 1) * PAGE_SIZE;

      const [rows, count] = await Promise.all([
        adminListProfilesForApproval({
          status: activeStatusFilter || null,
          role: activeRoleFilter || null,
          search: q || null,
          limit,
          offset,
        }),
        adminCountProfilesForApproval({
          status: activeStatusFilter || null,
          role: activeRoleFilter || null,
          search: q || null,
        }),
      ]);

      const data = Array.isArray(rows) ? rows : [];
      setUsers(data);
      setTotalCount(typeof count === 'number' ? count : Number(count) || data.length);
    } catch (error) {
      logger.error('Error fetching users:', error);
      toast.error('Could not fetch users.');
      setUsers([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
      if (initialLoading) setInitialLoading(false);
    }
  };

  const getEffectiveStatus = (user) => {
    const status = getAccountStatus(user);
    return status.code;
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const searchMatch = 
        (user.full_name && user.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()));

      const roleMatch =
        filters.role === 'all' ||
        (filters.role === 'alumni' && user.role === 'alumni') ||
        (filters.role === 'mentor' && (user.role === 'mentor' || user.is_mentor)) ||
        (filters.role === 'employer' && (user.role === 'employer' || user.is_employer)) ||
        (filters.role === 'admin' && (user.role === 'admin' || user.role === 'super_admin' || user.is_admin));

      const status = getEffectiveStatus(user);
      const statusMatch =
        filters.alumni_verification_status === 'all'
          ? true
          : (filters.alumni_verification_status === 'deleted'
            ? status === 'deleted'
            : String(status) === filters.alumni_verification_status);

      let tabMatch = true;
      if (selectedTab === 'pending') {
        tabMatch = (status === 'pending');
      } else if (selectedTab === 'rejected') {
        tabMatch = (status === 'rejected');
      } else if (selectedTab === 'mentors') {
        // Delegated to MentorsTab component; this filter is not used when rendering MentorsTab
        tabMatch = false;
      } else if (selectedTab === 'employers') {
        tabMatch = (user.role === 'employer' || user.is_employer);
      } else if (selectedTab === 'deleted') {
        tabMatch = status === 'deleted';
      }

      return searchMatch && roleMatch && statusMatch && tabMatch;
    });
  }, [users, searchQuery, filters, selectedTab]);

  const totalPages = useMemo(() => {
    if (totalCount == null || totalCount <= 0) return 1;
    return Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  }, [totalCount]);

  const pageStartIndex = useMemo(() => {
    if (!filteredUsers.length) return 0;
    return (page - 1) * PAGE_SIZE + 1;
  }, [page, filteredUsers.length]);

  const pageEndIndex = useMemo(() => {
    if (!filteredUsers.length || pageStartIndex === 0) return 0;
    return pageStartIndex + filteredUsers.length - 1;
  }, [pageStartIndex, filteredUsers.length]);

  const avatarUserIds = Array.from(new Set(
    (filteredUsers || []).map((u) => u.id).filter(Boolean)
  ));

  const { avatarUrls } = useAvatars(avatarUserIds, {
    useSignedUrls: true,
    autoFetch: avatarUserIds.length > 0,
  });

  const getStatusBadge = (status) => {
    const meta = ACCOUNT_STATUS_META[status] || ACCOUNT_STATUS_META['unknown'];
    return meta.badgeClass;
  };

  const getStatusLabel = (status) => {
    const meta = ACCOUNT_STATUS_META[status] || ACCOUNT_STATUS_META['unknown'];
    return meta.label;
  };
 
  // Role mapping utility functions
  const ROLE_MAPPINGS = {
    'alumni': 'Alumni',
    'mentor': 'Mentor',
    'employer': 'Employer',
    'mentee_student': 'Mentee/Student',
    'student': 'Mentee/Student',
    'admin': 'Admin',
    'super_admin': 'Super Admin'
  };
  
  const getRoleBadge = (role) => {
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
  };
  
  const getRoleLabel = (role) => {
    return ROLE_MAPPINGS[role] || 'Unknown';
  };

  const tabs = [
    { name: 'All Users', id: 'all' },
    { name: 'Pending Approval', id: 'pending' },
    { name: 'Rejected', id: 'rejected' },
    { name: 'Mentors', id: 'mentors' },
    { name: 'Employers', id: 'employers' },
    { name: 'Deleted Users', id: 'deleted' },
  ];
  
  const handleUserAction = async (action, userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const status = getEffectiveStatus(user);

    switch (action) {
      case 'view':
        setSelectedUser(user);
        setIsModalOpen(true);
        break;
      case 'edit':
        setSelectedUser(user);
        setIsEditModalOpen(true);
        break;
      case 'reject':
        if (status === 'rejected') return;
        setSelectedUser(user);
        setIsRejectModalOpen(true);
        break;
      case 'approve':
        if (status === 'approved') return;
        try {
          await adminUpdateProfileApproval({
            profileId: userId,
            decision: 'approve',
            notes: null,
          });
          await fetchUsers();
          toast.success(`${user.full_name || user.email} has been approved.`);
        } catch (error) {
          logger.error('Error approving user:', error);
          toast.error(`Failed to approve user: ${getFriendlyErrorMessage(error, 'Unable to approve user.')}`);
        }
        break;
      case 'delete':
        // Prevent self-delete
        if (userId === currentUser?.id) {
          toast.error('You cannot delete your own account.');
          return;
        }
        setConfirmDialog({
          type: 'soft-delete-single',
          userId,
          message: `Are you sure you want to soft delete user ${user.email || user.id}? They can be restored later.`,
        });
        break;
      case 'purge':
        // Prevent self-purge
        if (userId === currentUser?.id) {
          toast.error('You cannot purge your own account data.');
          return;
        }
        setConfirmDialog({
          type: 'purge-single',
          userId,
          message: `Are you sure you want to PERMANENTLY PURGE all data for user ${user.email || user.id}? This cannot be undone!`,
        });
        break;
      case 'delete-auth':
        // Prevent self-delete
        if (userId === currentUser?.id) {
          toast.error('You cannot delete your own account.');
          return;
        }
        setConfirmDialog({
          type: 'delete-auth-single',
          userId,
          message: 'This will permanently delete the user from Supabase Auth. Continue?',
        });
        break;
      default: {
        toast.error(`Unknown action: ${action}`);
      }
    }
  };

  const handleToggleActive = async (user) => {
    // Do not allow toggling deleted users; use soft delete instead
    if (user.is_deleted) {
      return;
    }

    const currentlyActive = user.is_active !== false;
    const confirmLabel = currentlyActive
      ? `Block ${user.email || user.full_name || 'this user'}? They will not be able to use the platform.`
      : `Unblock ${user.email || user.full_name || 'this user'} and allow access again?`;

    setConfirmDialog({
      type: 'toggle-active',
      userId: user.id,
      message: confirmLabel,
      currentlyActive,
    });
  };

  const handleSaveUser = async (userId, newRole) => {
    const user = users.find((u) => u.id === userId);
    if (!user) {
      toast.error('User not found');
      return;
    }

    const oldRole = user.role;
    const { success, error } = await changeUserRole({ userId, oldRole, newRole });

    if (!success) {
      // changeUserRole already surfaced a toast; just log for debugging
      if (error) {
        logger.error('Failed to change user role:', error);
      }
      return;
    }

    // Refresh users so the table reflects the updated role
    await fetchUsers();
  };

  const handleBulkAction = async (action) => {
    if (!selectedUsers.length) return;

    if (action === 'approve' || action === 'reject') {
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      setLoading(true);
      const results = await Promise.allSettled(
        selectedUsers.map(id =>
          adminUpdateProfileApproval({
            profileId: id,
            decision: action === 'approve' ? 'approve' : 'reject',
            notes: null,
          })
        )
      );
      const ok = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.length - ok;
      if (ok) {
        await fetchUsers();
      }
      setSelectedUsers([]);
      setLoading(false);
      if (ok) toast.success(`${newStatus === 'approved' ? 'Approved' : 'Rejected'} ${ok} user(s).`);
      if (failed) toast.error(`Failed to ${newStatus} ${failed} user(s).`);
      return;
    }

    if (action === 'delete') {
      setConfirmDialog({
        type: 'bulk-soft-delete',
        userIds: selectedUsers,
        message: `Soft delete ${selectedUsers.length} user(s)? They can be restored later.`,
      });
      return;
    }
  };

  const handleSelectUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
    }
  };

  const handleRejectUser = async (userId, rejectionComment) => {
    try {
      await adminUpdateProfileApproval({
        profileId: userId,
        decision: 'reject',
        notes: rejectionComment || null,
      });
      // Update local UI immediately
      await fetchUsers();

      // Remove any stored rejection comments from localStorage if they exist
      // This is to clean up any legacy localStorage items
      try {
        const rejectionComments = JSON.parse(localStorage.getItem('rejectionComments') || '{}');
        if (rejectionComments[userId]) {
          delete rejectionComments[userId];
          localStorage.setItem('rejectionComments', JSON.stringify(rejectionComments));
        }
      } catch (e) {
        logger.log('Error cleaning localStorage:', e);
      }
      
      toast.success('User has been rejected');
    } catch (error) {
      const msg = error?.message || String(error);
      if (/404/.test(msg) || /schema cache/i.test(msg) || /could not find the function/i.test(msg)) {
        toast.error('Rejection failed: ensure RPC exists and matches (target uuid, new_status text). Reload PostgREST schema if needed.');
      } else {
        toast.error(`Failed to reject user: ${msg}`);
      }
    } finally {
      setIsRejectModalOpen(false);
    }
  };

  if (initialLoading) {
    return <div className="p-8">Loading user data...</div>;
  }

  const runToggleActive = async () => {
    if (!confirmDialog?.userId) return;
    const user = users.find(u => u.id === confirmDialog.userId);
    if (!user || user.is_deleted) return;

    const currentlyActive = user.is_active !== false;

    setLoading(true);
    try {
      const { error } = await supabase.rpc('admin_toggle_active', {
        p_user_id: user.id,
        p_is_active: !currentlyActive,
        p_reason: currentlyActive
          ? 'Blocked from Admin User Management'
          : 'Unblocked from Admin User Management',
      });

      if (error) {
        throw error;
      }

      await fetchUsers();
      toast.success(currentlyActive ? 'User has been blocked.' : 'User has been unblocked.');
    } catch (err) {
      logger.error('Error toggling user active state:', err);
      toast.error(getFriendlyErrorMessage(err, 'Unable to change user active status.'));
    } finally {
      setLoading(false);
    }
  };

  const runSingleSoftDelete = async () => {
    if (!confirmDialog?.userId) return;
    const userId = confirmDialog.userId;
    try {
      await softDeleteUser(userId);
      // Don't filter out the user - instead update the UI to show deleted status
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_deleted: true } : u));
    } catch (err) {
      logger.error('Error soft-deleting user:', err);
      toast.error(`Failed to delete user: ${getFriendlyErrorMessage(err, 'Unable to delete user.')}`);
    }
  };

  const runSinglePurge = async () => {
    if (!confirmDialog?.userId) return;
    const userId = confirmDialog.userId;
    try {
      await purgeUserData(userId);
      // After purging, keep the user in the list but mark data as purged
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_data_purged: true } : u));
    } catch (err) {
      logger.error('Error purging user data:', err);
      toast.error(`Failed to purge user data: ${getFriendlyErrorMessage(err, 'Unable to purge user data.')}`);
    }
  };

  const runBulkSoftDelete = async () => {
    const ids = confirmDialog?.userIds || [];
    if (!ids.length) return;
    // Check if trying to delete self
    if (ids.includes(currentUser?.id)) {
      toast.error('You cannot delete your own account.');
      return;
    }
    setLoading(true);
    const results = await Promise.allSettled(
      ids.map(id => softDeleteUser(id, 'Bulk soft delete from User Management'))
    );
    const ok = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
    const failed = results.length - ok;
    setUsers(prev => prev.map(u => ids.includes(u.id) ? { ...u, is_deleted: true } : u));
    setSelectedUsers([]);
    setLoading(false);
    if (ok) toast.success(`Soft-deleted ${ok} user(s).`);
    if (failed) toast.error(`Failed to delete ${failed} user(s).`);
  };

  return (
    <div className="bg-gray-50/50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <UsersIcon className="w-8 h-8 mr-3 text-ocean-500" />
            User Management
          </h1>
          <p className="mt-1 text-gray-600">
            Oversee, manage, and moderate all users on the platform.
          </p>
        </div>

        {/* Main Content Area */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg">
          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200 overflow-x-auto">
            <nav className="-mb-px flex space-x-4 md:space-x-6 min-w-max" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`${
                    selectedTab === tab.id
                      ? 'border-ocean-500 text-ocean-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm transition-colors flex-shrink-0`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Render Mentors sub-tab using dedicated MentorsTab */}
          {selectedTab === 'mentors' ? (
            <div className="mt-2">
              <MentorsTab />
            </div>
          ) : (
          /* Search and Filters */
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="md:col-span-2">
              <label htmlFor="search" className="sr-only">Search</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  type="text"
                  name="search"
                  id="search"
                  className="block w-full rounded-lg border-gray-300 pl-10 focus:border-ocean-500 focus:ring-ocean-500 sm:text-sm"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  ref={searchInputRef}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setDebouncedQuery('');
                      if (searchInputRef.current) searchInputRef.current.focus();
                    }}
                    aria-label="Clear search"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
            <div>
              <label htmlFor="role-filter" className="sr-only">Filter by Role</label>
              <select 
                id="role-filter"
                className="block w-full rounded-lg border-gray-300 focus:border-ocean-500 focus:ring-ocean-500 sm:text-sm"
                value={filters.role}
                onChange={e => setFilters({...filters, role: e.target.value})}
              >
                <option value="all">All Roles</option>
                <option value="alumni">Alumni</option>
                <option value="employer">Employer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label htmlFor="status-filter" className="sr-only">Filter by Status</label>
              <select 
                id="status-filter"
                className="block w-full rounded-lg border-gray-300 focus:border-ocean-500 focus:ring-ocean-500 sm:text-sm"
                value={filters.alumni_verification_status}
                onChange={e => setFilters({...filters, alumni_verification_status: e.target.value})}
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
                <option value="deleted">Deleted</option>
              </select>
            </div>
          </div>
          )}

          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <div className="bg-ocean-50 border border-ocean-200 rounded-lg p-3 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm font-medium text-ocean-800">
                {selectedUsers.length} user{selectedUsers.length > 1 && 's'} selected
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

          {/* Users Table */}
          {selectedTab !== 'mentors' && (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="relative py-3.5 pl-4 pr-3 text-left sm:pl-6">
                    <input
                      type="checkbox"
                      className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-ocean-600 focus:ring-ocean-500"
                      checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                      onChange={handleSelectAll}
                      ref={el => {
                        if (el) {
                          el.indeterminate = selectedUsers.length > 0 && selectedUsers.length < filteredUsers.length;
                        }
                      }}
                    />
                  </th>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                    User
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Role
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Status
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
                {filteredUsers.map((user) => (
                  <tr key={user.id} className={selectedUsers.includes(user.id) ? 'bg-ocean-50' : ''}>
                    <td className="relative py-4 pl-4 pr-3 sm:pl-6">
                      <input
                        type="checkbox"
                        className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-ocean-600 focus:ring-ocean-500"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                      />
                    </td>
                    <td className="py-4 pl-4 pr-3 text-sm sm:pl-6">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center">
                          <Avatar
                            src={avatarUrls[user.id] ?? user.avatar_url ?? null}
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(getEffectiveStatus(user))}`}>
                        {getStatusLabel(getEffectiveStatus(user))}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPinIcon className="w-4 h-4 mr-1" />
                        {user.location || 'N/A'}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600" title={user.last_sign_in_at || ''}>
                        {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <button 
                          title="View Details"
                          onClick={() => handleUserAction('view', user.id)}
                          className="inline-flex items-center justify-center w-[44px] h-[44px] p-0 rounded-lg text-gray-400 hover:text-ocean-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button 
                          title="Edit User"
                          onClick={() => handleUserAction('edit', user.id)}
                          className="inline-flex items-center justify-center w-[44px] h-[44px] p-0 rounded-lg text-gray-400 hover:text-ocean-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        {hasPermission('manage:users') && (
                          <>
                            <button 
                              title={getEffectiveStatus(user) === 'approved' ? 'Already approved' : 'Approve User'}
                              disabled={getEffectiveStatus(user) === 'approved'}
                              onClick={() => handleUserAction('approve', user.id)}
                              className={`inline-flex items-center justify-center w-[44px] h-[44px] p-0 rounded-lg ${getEffectiveStatus(user) === 'approved' ? 'text-green-300 cursor-not-allowed' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2`}
                            >
                              <CheckCircleIcon className="w-4 h-4" />
                            </button>
                            <button 
                              title={getEffectiveStatus(user) === 'rejected' ? 'Already rejected' : 'Reject User'}
                              disabled={getEffectiveStatus(user) === 'rejected'}
                              onClick={() => handleUserAction('reject', user.id)}
                              className={`inline-flex items-center justify-center w-[44px] h-[44px] p-0 rounded-lg ${getEffectiveStatus(user) === 'rejected' ? 'text-red-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2`}
                            >
                              <XCircleIcon className="w-4 h-4" />
                            </button>
                            {!user.is_deleted && (
                              <button
                                title={user.is_active === false ? 'Unblock User' : 'Block User'}
                                onClick={() => handleToggleActive(user)}
                                className="inline-flex items-center justify-center w-[44px] h-[44px] p-0 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
                              >
                                <ExclamationTriangleIcon className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                        {hasPermission('delete:users') && user.id !== currentUser?.id && (
                          <>
                            {user.is_deleted && canPurge && (
                              <button 
                                title="Purge User Data"
                                onClick={() => handleUserAction('purge', user.id)}
                                disabled={deletingId === user.id}
                                className={`inline-flex items-center justify-center w-[44px] h-[44px] p-0 rounded-lg ${deletingId === user.id ? 'opacity-50 cursor-not-allowed' : 'text-gray-400 hover:text-red-800 hover:bg-red-50'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2`}
                                aria-label="Purge user data permanently"
                              >
                                {deletingId === user.id ? (
                                  <div className="w-4 h-4 border-t-2 border-b-2 border-gray-500 rounded-full animate-spin"></div>
                                ) : (
                                  <DocumentArrowDownIcon className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            {user.is_deleted && canHardDelete && (
                              <button 
                                title="Delete Auth User"
                                onClick={() => handleUserAction('delete-auth', user.id)}
                                disabled={deletingId === user.id}
                                className={`inline-flex items-center justify-center w-[44px] h-[44px] p-0 rounded-lg ${deletingId === user.id ? 'opacity-50 cursor-not-allowed' : 'text-gray-400 hover:text-red-900 hover:bg-red-50'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2`}
                                aria-label="Delete user from Supabase Auth"
                              >
                                {deletingId === user.id ? (
                                  <div className="w-4 h-4 border-t-2 border-b-2 border-gray-500 rounded-full animate-spin"></div>
                                ) : (
                                  <DocumentArrowUpIcon className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            {!user.is_deleted && (
                              <button 
                                title="Soft Delete User"
                                onClick={() => handleUserAction('delete', user.id)}
                                disabled={deletingId === user.id}
                                className={`inline-flex items-center justify-center w-[44px] h-[44px] p-0 rounded-lg ${deletingId === user.id ? 'opacity-50 cursor-not-allowed' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2`}
                                aria-label="Soft delete user"
                              >
                                {deletingId === user.id ? (
                                  <div className="w-4 h-4 border-t-2 border-b-2 border-gray-500 rounded-full animate-spin"></div>
                                ) : (
                                  <TrashIcon className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}

          {/* Pagination */}
          {selectedTab !== 'mentors' && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-6">
              <p className="text-sm text-gray-600">
                {totalCount != null && totalCount > 0 ? (
                  <>
                    Showing{' '}
                    <span className="font-medium">{pageStartIndex}</span>
                    {'–'}
                    <span className="font-medium">{pageEndIndex}</span>
                    {' '}of <span className="font-medium">{totalCount}</span> users
                    {' '}• Page <span className="font-medium">{page}</span>
                    {totalPages > 1 && (
                      <>
                        {' '}/ <span className="font-medium">{totalPages}</span>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    Page <span className="font-medium">{page}</span>
                    {totalPages > 1 && (
                      <>
                        {' '}of <span className="font-medium">{totalPages}</span>
                      </>
                    )}
                  </>
                )}
              </p>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg border-2 border-ocean-600 text-ocean-600 hover:bg-ocean-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-[colors,opacity,transform,shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
                >
                  Previous
                </button>
                <button 
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages}
                  className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg border-2 border-ocean-600 text-ocean-600 hover:bg-ocean-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-[colors,opacity,transform,shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <UserDetailsModal 
        user={selectedUser} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

      <EditUserModal
        user={selectedUser}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveUser}
        isSuperAdminActor={getUserRole && getUserRole() === 'super_admin'}
      />
      
      <RejectUserModal 
        user={selectedUser}
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        onReject={handleRejectUser}
      />
      <ConfirmationDialog
        isOpen={confirmDialog?.type === 'soft-delete-single'}
        onClose={() => setConfirmDialog(null)}
        onConfirm={async () => {
          await runSingleSoftDelete();
          setConfirmDialog(null);
        }}
        title="Soft delete user"
        description={confirmDialog?.message || ''}
        variant="danger"
      />
      <ConfirmationDialog
        isOpen={confirmDialog?.type === 'toggle-active'}
        onClose={() => setConfirmDialog(null)}
        onConfirm={async () => {
          await runToggleActive();
          setConfirmDialog(null);
        }}
        title={confirmDialog?.currentlyActive ? 'Block user' : 'Unblock user'}
        description={confirmDialog?.message || ''}
        variant="warning"
      />
      <ConfirmationDialog
        isOpen={confirmDialog?.type === 'bulk-soft-delete'}
        onClose={() => setConfirmDialog(null)}
        onConfirm={async () => {
          await runBulkSoftDelete();
          setConfirmDialog(null);
        }}
        title="Soft delete users"
        description={confirmDialog?.message || ''}
        variant="danger"
      />
      <DeleteConfirmationDialog
        isOpen={confirmDialog?.type === 'purge-single'}
        onClose={() => setConfirmDialog(null)}
        onConfirm={async () => {
          await runSinglePurge();
          setConfirmDialog(null);
        }}
        itemType="User data"
        itemName={undefined}
        loading={deletingId === confirmDialog?.userId}
      />
      <DeleteConfirmationDialog
        isOpen={confirmDialog?.type === 'delete-auth-single'}
        onClose={() => setConfirmDialog(null)}
        onConfirm={async () => {
          try {
            if (confirmDialog?.userId) {
              await deleteAuthUser(confirmDialog.userId);
            }
          } catch (err) {
            logger.error('Error deleting auth user:', err);
            toast.error(`Failed to delete auth user: ${getFriendlyErrorMessage(err, 'Unable to delete auth user.')}`);
          } finally {
            setConfirmDialog(null);
          }
        }}
        itemType="Auth user"
        itemName={undefined}
        loading={deletingId === confirmDialog?.userId}
      />
    </div>
  );
};

export default UserManagement;