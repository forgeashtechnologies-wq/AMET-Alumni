import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import { approveGroupRpc, rejectGroupRpc, archiveGroupRpc, deleteGroupRpc } from '../api/groups';
import { getFriendlyErrorMessage } from '../utils/errors';
import { showSuccess, showError } from '../components/shared';
import logger from '../utils/logger';
import {
  Users,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Archive,
  Trash2,
  Eye,
  Settings,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  Shield,
  Lock,
  Globe,
  GraduationCap
} from 'lucide-react';
import { ConfirmationDialog, DeleteConfirmationDialog } from '../components/shared/ConfirmationDialog';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'approved', label: 'Approved' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' }
];

const PRIVACY_OPTIONS = [
  { value: 'all', label: 'All Privacy' },
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' }
];

function getGroupStatus(group) {
  if (group.is_archived) return { label: 'Archived', color: 'gray', icon: Archive };
  if (group.is_rejected || group.approval_status === 'rejected') return { label: 'Rejected', color: 'red', icon: XCircle };
  if (group.is_approved || group.approval_status === 'approved') return { label: 'Approved', color: 'green', icon: CheckCircle };
  return { label: 'Pending', color: 'yellow', icon: AlertTriangle };
}

function StatusBadge({ group }) {
  const status = getGroupStatus(group);
  const colorClasses = {
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    gray: 'bg-gray-100 text-gray-600'
  };
  const Icon = status.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${colorClasses[status.color]}`}>
      <Icon className="w-3 h-3" />
      {status.label}
    </span>
  );
}

export default function AdminGroupsPage() {
  const { userRole, profile } = useAuth();
  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = profile?.is_admin === true || isSuperAdmin;

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [privacyFilter, setPrivacyFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState({});
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: null, // 'archive' | 'delete'
    group: null,
  });

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('groups')
        .select(`
          id, name, description, is_private, is_approved, approval_status, 
          is_archived, is_rejected, rejection_reason, alumni_only,
          created_at, created_by, group_avatar_url, tags,
          group_members(count)
        `)
        .order('created_at', { ascending: false });

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setGroups(data || []);
    } catch (err) {
      logger.error('Failed to fetch groups for admin:', err);
      setError(getFriendlyErrorMessage(err, 'Failed to load groups'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchGroups();
    }
  }, [isAdmin, fetchGroups]);

  const handleApprove = async (groupId) => {
    setActionLoading(prev => ({ ...prev, [groupId]: 'approve' }));
    try {
      await approveGroupRpc(groupId);
      showSuccess('Group approved');
      await fetchGroups();
    } catch (err) {
      showError(getFriendlyErrorMessage(err, 'Failed to approve group'));
    } finally {
      setActionLoading(prev => ({ ...prev, [groupId]: null }));
    }
  };

  const handleReject = async (groupId) => {
    const reason = window.prompt('Enter rejection reason (optional):');
    setActionLoading(prev => ({ ...prev, [groupId]: 'reject' }));
    try {
      await rejectGroupRpc(groupId, reason || undefined);
      showSuccess('Group rejected');
      await fetchGroups();
    } catch (err) {
      showError(getFriendlyErrorMessage(err, 'Failed to reject group'));
    } finally {
      setActionLoading(prev => ({ ...prev, [groupId]: null }));
    }
  };

  // Open confirmation dialog for archive
  const openArchiveDialog = (group) => {
    setConfirmDialog({ isOpen: true, type: 'archive', group });
  };

  // Open confirmation dialog for delete
  const openDeleteDialog = (group) => {
    setConfirmDialog({ isOpen: true, type: 'delete', group });
  };

  // Close confirmation dialog
  const closeConfirmDialog = () => {
    if (actionLoading[confirmDialog.group?.id]) return; // Don't close while loading
    setConfirmDialog({ isOpen: false, type: null, group: null });
  };

  // Handle confirmed archive
  const handleArchiveConfirm = async () => {
    const groupId = confirmDialog.group?.id;
    if (!groupId) return;
    
    setActionLoading(prev => ({ ...prev, [groupId]: 'archive' }));
    try {
      await archiveGroupRpc(groupId);
      showSuccess('Group archived successfully');
      closeConfirmDialog();
      await fetchGroups();
    } catch (err) {
      showError(getFriendlyErrorMessage(err, 'Failed to archive group'));
    } finally {
      setActionLoading(prev => ({ ...prev, [groupId]: null }));
    }
  };

  // Handle confirmed delete
  const handleDeleteConfirm = async () => {
    const groupId = confirmDialog.group?.id;
    if (!groupId) return;
    
    setActionLoading(prev => ({ ...prev, [groupId]: 'delete' }));
    try {
      await deleteGroupRpc(groupId);
      showSuccess('Group deleted permanently');
      closeConfirmDialog();
      await fetchGroups();
    } catch (err) {
      showError(getFriendlyErrorMessage(err, 'Failed to delete group'));
    } finally {
      setActionLoading(prev => ({ ...prev, [groupId]: null }));
    }
  };

  // Filter groups
  const filteredGroups = groups.filter(g => {
    // Search filter
    if (search) {
      const q = search.toLowerCase();
      if (!g.name?.toLowerCase().includes(q) && !g.description?.toLowerCase().includes(q)) {
        return false;
      }
    }
    // Status filter
    if (statusFilter !== 'all') {
      const status = getGroupStatus(g);
      if (status.label.toLowerCase() !== statusFilter) return false;
    }
    // Privacy filter
    if (privacyFilter !== 'all') {
      if (privacyFilter === 'public' && g.is_private) return false;
      if (privacyFilter === 'private' && !g.is_private) return false;
    }
    return true;
  });

  // Stats
  const stats = {
    total: groups.length,
    approved: groups.filter(g => g.is_approved || g.approval_status === 'approved').length,
    pending: groups.filter(g => !g.is_approved && !g.is_rejected && !g.is_archived && g.approval_status !== 'approved' && g.approval_status !== 'rejected').length,
    rejected: groups.filter(g => g.is_rejected || g.approval_status === 'rejected').length,
    archived: groups.filter(g => g.is_archived).length
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-red-800 mb-2">Access Denied</h1>
          <p className="text-red-600">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" />
            Groups/Chapters Administration
          </h1>
          <p className="text-gray-600 mt-1">Manage all groups/chapters across the platform</p>
        </div>
        <button
          onClick={fetchGroups}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'blue' },
          { label: 'Approved', value: stats.approved, color: 'green' },
          { label: 'Pending', value: stats.pending, color: 'yellow' },
          { label: 'Rejected', value: stats.rejected, color: 'red' },
          { label: 'Archived', value: stats.archived, color: 'gray' }
        ].map(stat => (
          <div key={stat.label} className={`bg-${stat.color}-50 border border-${stat.color}-200 rounded-lg p-4`}>
            <div className={`text-2xl font-bold text-${stat.color}-700`}>{stat.value}</div>
            <div className={`text-sm text-${stat.color}-600`}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search groups/chapters by name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Search groups/chapters"
            />
          </div>
          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white min-w-[140px]"
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          {/* Privacy Filter */}
          <div className="relative">
            <select
              value={privacyFilter}
              onChange={(e) => setPrivacyFilter(e.target.value)}
              className="pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white min-w-[120px]"
              aria-label="Filter by privacy"
            >
              {PRIVACY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-600">
          Showing {filteredGroups.length} of {groups.length} groups/chapters
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">Error loading groups/chapters</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading groups...</p>
        </div>
      )}

      {/* Groups Table */}
      {!loading && filteredGroups.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" role="table">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Group</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Privacy</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Members</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredGroups.map(group => {
                  const status = getGroupStatus(group);
                  const isActionLoading = !!actionLoading[group.id];
                  const memberCount = group.group_members?.[0]?.count || 0;
                  return (
                    <tr key={group.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {group.group_avatar_url ? (
                              <img src={group.group_avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Users className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link 
                              to={`/groups/${group.id}`}
                              className="font-medium text-gray-900 hover:text-blue-600 truncate block"
                            >
                              {group.name}
                            </Link>
                            <p className="text-sm text-gray-500 truncate max-w-xs">
                              {group.description || 'No description'}
                            </p>
                            {group.alumni_only && (
                              <span className="inline-flex items-center gap-1 text-xs text-indigo-600 mt-1">
                                <GraduationCap className="w-3 h-3" /> Alumni only
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge group={group} />
                        {group.rejection_reason && (
                          <p className="text-xs text-red-600 mt-1 max-w-xs truncate" title={group.rejection_reason}>
                            {group.rejection_reason}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 text-sm ${group.is_private ? 'text-red-600' : 'text-green-600'}`}>
                          {group.is_private ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                          {group.is_private ? 'Private' : 'Public'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {memberCount}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {new Date(group.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/groups/${group.id}`}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View group"
                            aria-label={`View ${group.name}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link
                            to={`/groups/${group.id}/manage`}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Manage group"
                            aria-label={`Manage ${group.name}`}
                          >
                            <Settings className="w-4 h-4" />
                          </Link>
                          {/* Approve button (for pending groups) */}
                          {status.label === 'Pending' && (
                            <button
                              onClick={() => handleApprove(group.id)}
                              disabled={isActionLoading}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Approve group"
                              aria-label={`Approve ${group.name}`}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {/* Reject button (for pending groups) */}
                          {status.label === 'Pending' && (
                            <button
                              onClick={() => handleReject(group.id)}
                              disabled={isActionLoading}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Reject group"
                              aria-label={`Reject ${group.name}`}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          {/* Archive button (for non-archived groups) */}
                          {!group.is_archived && (
                            <button
                              onClick={() => openArchiveDialog(group)}
                              disabled={isActionLoading}
                              className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Archive group"
                              aria-label={`Archive ${group.name}`}
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}
                          {/* Delete button (super_admin only) */}
                          {isSuperAdmin && (
                            <button
                              onClick={() => openDeleteDialog(group)}
                              disabled={isActionLoading}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete group permanently"
                              aria-label={`Delete ${group.name} permanently`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredGroups.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No groups/chapters found</h3>
          <p className="text-gray-500 mb-4">
            {search || statusFilter !== 'all' || privacyFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'No groups/chapters have been created yet'}
          </p>
          {(search || statusFilter !== 'all' || privacyFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setPrivacyFilter('all');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4" />
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Archive Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen && confirmDialog.type === 'archive'}
        onClose={closeConfirmDialog}
        onConfirm={handleArchiveConfirm}
        title="Archive Group"
        description="Archive this group? Members will no longer be able to post new content."
        confirmText={actionLoading[confirmDialog.group?.id] === 'archive' ? 'Archiving...' : 'Archive Group'}
        cancelText="Cancel"
        variant="warning"
        loading={actionLoading[confirmDialog.group?.id] === 'archive'}
        itemName={confirmDialog.group?.name}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={confirmDialog.isOpen && confirmDialog.type === 'delete'}
        onClose={closeConfirmDialog}
        onConfirm={handleDeleteConfirm}
        itemType="Group"
        itemName={confirmDialog.group?.name}
        loading={actionLoading[confirmDialog.group?.id] === 'delete'}
      />
    </div>
  );
}
