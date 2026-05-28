import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import logger from '../utils/logger';
import { showSuccess, showError, LeaveConfirmationDialog } from '../components/shared';
import toast from 'react-hot-toast';
import { 
  fetchGroupDetails,
  updateGroupDetails,
  fetchGroupMembers,
  getMyGroupMembership,
} from '../utils/supabase';
import {
  listPendingMembers,
  approveGroupMember,
  rejectGroupMember,
  setMemberRoleRpc,
  removeMemberRpc,
  inviteMemberByEmail,
  leaveGroupRpc,
  approveGroupRpc,
  rejectGroupRpc,
  archiveGroupRpc,
  setAlumniOnly,
} from '../api/groups';
import { supabase } from '../utils/supabase';
import { ArrowLeft, Shield, AlertTriangle, Users, CheckCircle, XCircle, Search, Filter, X, ArrowUp, ArrowDown, Trash2, Loader2, ChevronDown, GraduationCap, Mail, RefreshCw, Eye, EyeOff, Info, Settings, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { canManageGroup, getGroupStatus } from '../utils/acl';
import { getFriendlyErrorMessage } from '../utils/errors';
import { ROLE_LABELS } from '../utils/roles';
import { useAvatars } from '../hooks/useAvatar';

// Skeleton components are defined inline in the loading state

// Skeleton for member cards
const MemberCardSkeleton = () => (
  <div className="border border-gray-200 rounded-lg p-5 animate-pulse">
    <div className="flex items-start gap-4 mb-4">
      <div className="w-14 h-14 rounded-full bg-gray-200" />
      <div className="flex-1">
        <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-1" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
    <div className="flex gap-2">
      <div className="h-10 bg-gray-200 rounded-lg flex-1" />
      <div className="h-10 bg-gray-200 rounded-lg w-12" />
    </div>
  </div>
);

// Stats card skeleton
const StatsCardSkeleton = () => (
  <div className="rounded-lg p-5 border border-gray-200 animate-pulse">
    <div className="flex items-center justify-between mb-2">
      <div className="h-4 bg-gray-200 rounded w-24" />
      <div className="w-5 h-5 bg-gray-200 rounded" />
    </div>
    <div className="h-8 bg-gray-200 rounded w-16" />
  </div>
);

// Tooltip component
const Tooltip = ({ children, content }) => (
  <div className="group relative inline-flex">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
      {content}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
    </div>
  </div>
);

// Email validation helper
const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Collapsible Section component for progressive disclosure
const CollapsibleSection = ({ 
  id, 
  title, 
  icon: Icon, 
  iconBg = 'bg-gray-50', 
  iconColor = 'text-gray-600',
  isOpen, 
  onToggle, 
  badge,
  badgeColor = 'bg-gray-100 text-gray-700',
  children,
  defaultOpen = true,
  className = ''
}) => {
  const contentId = `${id}-content`;
  
  return (
    <section className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${iconBg}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          {badge !== undefined && (
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${badgeColor}`}>
              {badge}
            </span>
          )}
        </div>
        <ChevronDown 
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`} 
          aria-hidden="true"
        />
      </button>
      <div
        id={contentId}
        role="region"
        aria-labelledby={id}
        className={`transition-all duration-200 ease-in-out ${isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}
      >
        <div className="px-6 pb-6">
          {children}
        </div>
      </div>
    </section>
  );
};

export default function GroupManage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, user, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const memberUserIds = members.map((m) => m.user?.id).filter(Boolean);
  const { avatarUrls } = useAvatars(memberUserIds, {
    useSignedUrls: true,
    autoFetch: memberUserIds.length > 0,
  });
  const [isSiteAdmin, setIsSiteAdmin] = useState(false);
  const [isGroupAdmin, setIsGroupAdmin] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [authMessage, setAuthMessage] = useState('You are not authorized to manage this group.');

  // Editable fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  // Admin-only Posts toggle removed per spec
  // isApproved is derived from approvalStatus
  const [approvalStatus, setApprovalStatus] = useState('pending'); // 'pending' | 'approved' | 'rejected'
  const [pending, setPending] = useState([]);
  const [leaving, setLeaving] = useState(false);
  const [adminCount, setAdminCount] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  const [actionStatus, setActionStatus] = useState({}); // { [userId]: { type: 'success'|'error', message: '' } }
  const [memberSearch, setMemberSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'admin', 'member'
  const [confirmDialog, setConfirmDialog] = useState(null); // { type: 'remove'|'demote', member: {...} }
  const [displayLimit, setDisplayLimit] = useState(20); // Pagination: show 20 at a time
  const [loadingMore, setLoadingMore] = useState(false);
  const [formErrors, setFormErrors] = useState({}); // { name: 'error', email: 'error' }
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('settings'); // 'settings' | 'members' for mobile
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const inviteInputRef = useRef(null);

  // Collapsible section states for Option 3 + Option 4 hybrid layout
  // Pending: auto-open when items exist, collapsed when empty
  // Members grid: open by default
  // Danger Zone: collapsed by default for safety
  const [sectionStates, setSectionStates] = useState({
    pending: false,    // Will be set based on pending.length
    members: true,     // Open by default
    dangerZone: false, // Collapsed by default
  });

  // Toggle a specific section
  const toggleSection = (section) => {
    setSectionStates(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Note: Member filtering is computed inline in the render for simplicity
  // Could be optimized with useMemo if performance becomes an issue with large member lists

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // PERFORMANCE: Stage loading so the shell appears quickly.
      // 1) Fetch group + my membership (if needed for non-admins) in parallel
      const isSiteAdminFromRole = userRole === 'admin' || userRole === 'super_admin';
      const siteAdminFlag = isSiteAdminFromRole || profile?.is_admin === true;

      const membershipPromise = siteAdminFlag
        ? Promise.resolve({ data: { role: 'admin' } })
        : getMyGroupMembership(id).catch(() => ({ data: null }));

      const [groupResult, myMembershipResult] = await Promise.all([
        fetchGroupDetails(id, { includeMembers: false }), // Group data only
        membershipPromise, // My membership for auth check when required
      ]);

      const { data, error } = groupResult;
      if (error) throw error;

      if (data?._restricted) {
        setGroup(data);
        showError('This is a private group. You cannot access the management console.');
        navigate(`/groups/${id}`);
        setLoading(false);
        return;
      }

      setGroup(data);
      setName(data?.name || '');
      setDescription(data?.description || '');
      setTags(Array.isArray(data?.tags) ? data.tags.join(', ') : '');
      setIsPrivate(!!data?.is_private);
      // is_admin_only_posts removed from UI
      // isApproved is derived from approvalStatus
      const status = getGroupStatus(data);
      setApprovalStatus(status.isRejected ? 'rejected' : status.isApproved ? 'approved' : 'pending');

      // Process auth check from parallel fetch (instead of separate useEffect)
      const siteAdmin = siteAdminFlag;
      setIsSiteAdmin(siteAdmin);
      const mem = myMembershipResult?.data;
      const isCreator = (data?.created_by === user?.id);
      const can = canManageGroup(!!siteAdmin, !!isCreator, mem || undefined);
      setIsGroupAdmin(mem?.role === 'admin');
      setAuthorized(!!can);
      if (!can) {
        showError('You are not authorized to manage this group.');
        navigate(`/groups/${id}`);
        setLoading(false);
        return;
      }

      // At this point we have enough data to render the page shell.
      setLoading(false);

      // 2) In the background, fetch members and pending requests.
      const [membersResult, pendingResult] = await Promise.all([
        fetchGroupMembers(id, 100, 0), // Members with pagination
        listPendingMembers(id).catch(() => []), // Pending requests (ignore errors)
      ]);

      // Process members from parallel fetch
      const mems = membersResult.data || [];
      // Sort: admins first, then by name
      const sorted = mems.sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        return (a.user?.full_name || '').localeCompare(b.user?.full_name || '');
      });
      setMembers(sorted);
      setDisplayLimit(20); // Reset pagination on load
      // Calculate admin and member counts
      const admins = mems.filter(m => m.role === 'admin');
      setAdminCount(admins.length);
      setMemberCount(mems.length);

      // Process pending requests from parallel fetch
      const pendingItems = pendingResult || [];
      setPending(pendingItems);

      if (pendingItems.length > 0) {
        setSectionStates(prev => ({ ...prev, pending: true }));
      }
    } catch (e) {
      logger.error('Failed to load group:', e);
      showError('Failed to load group');
      setLoading(false);
    }
  }, [id, profile?.is_admin, user?.id, userRole, navigate]);

  useEffect(() => {
    // Load group details and membership data on mount
    load();
  }, [load]);

  const leaveGroup = async () => {
    setLeaving(true);
    try {
      await leaveGroupRpc(id);
      showSuccess('You left the group');
      navigate(`/groups/${id}`);
    } catch (e) {
      logger.error(e);
      showError(getFriendlyErrorMessage(e, 'Unable to leave group. You may be the last admin.'));
    } finally {
      setLeaving(false);
    }
  };

  const archiveGroup = async () => {
    setSaving(true);
    try {
      await archiveGroupRpc(id);
      showSuccess('Group archived');
      navigate('/groups');
    } catch (e) {
      logger.error(e);
      showError(getFriendlyErrorMessage(e, 'Unable to archive the group. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
      showSuccess('Group data refreshed');
    } catch (e) {
      logger.error('Failed to refresh group:', e);
      showError('Failed to refresh group data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await approveGroupRpc(id);
      setApprovalStatus('approved');
      showSuccess('Group approved');
      await load();
    } catch (e) {
      logger.error('Failed to approve group:', e);
      showError(getFriendlyErrorMessage(e, 'Failed to approve group'));
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await rejectGroupRpc(id, null);
      setApprovalStatus('rejected');
      showSuccess('Group rejected');
      await load();
    } catch (e) {
      logger.error('Failed to reject group:', e);
      showError(getFriendlyErrorMessage(e, 'Failed to reject group'));
    } finally {
      setSaving(false);
    }
  };

  const saveBasics = async () => {
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    const nextErrors = {};

    if (!trimmedName) {
      nextErrors.name = 'Group name is required';
    }
    if (trimmedDescription.length > 2000) {
      nextErrors.description = 'Description is too long';
    }

    if (Object.keys(nextErrors).length) {
      setFormErrors(prev => ({ ...prev, ...nextErrors }));
      showError('Please fix the highlighted fields');
      return;
    }

    setSaving(true);
    try {
      const tagArray = (tags || '')
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const updates = {
        name: trimmedName,
        description: trimmedDescription || null,
        tags: tagArray,
      };

      const { data, error } = await updateGroupDetails(id, updates);
      if (error) throw error;

      setGroup(prev => ({ ...(prev || {}), ...(data || updates) }));
      showSuccess('Group details updated');
    } catch (e) {
      logger.error('Failed to save group basics:', e);
      showError(getFriendlyErrorMessage(e, 'Failed to save group details'));
    } finally {
      setSaving(false);
    }
  };

  const savePrivacy = async (nextIsPrivate) => {
    setSaving(true);
    try {
      const { data, error } = await updateGroupDetails(id, { is_private: nextIsPrivate });
      if (error) throw error;

      setGroup(prev => ({ ...(prev || {}), ...(data || { is_private: nextIsPrivate }) }));
      showSuccess(nextIsPrivate ? 'Group set to private' : 'Group set to public');
    } catch (e) {
      logger.error('Failed to update privacy:', e);
      showError(getFriendlyErrorMessage(e, 'Failed to update privacy settings'));
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDemoteClick = (member) => {
    setConfirmDialog({ type: 'demote', member });
  };

  const handleRemoveClick = (member) => {
    setConfirmDialog({ type: 'remove', member });
  };

  const promote = async (member) => {
    setActionStatus(prev => ({ ...prev, [member.user.id]: { type: 'loading' } }));
    try {
      await setMemberRoleRpc(id, member.user.id, 'admin');
      setActionStatus(prev => ({ ...prev, [member.user.id]: { type: 'success', message: 'Promoted to admin' } }));
      await load();
      toast.success('Member promoted to admin');
    } catch (e) {
      logger.error('Failed to promote member:', e);
      setActionStatus(prev => ({ ...prev, [member.user.id]: { type: 'error', message: 'Failed to promote' } }));
      showError('Failed to promote member');
    }
  };

  const demote = async (member) => {
    setActionStatus(prev => ({ ...prev, [member.user.id]: { type: 'loading' } }));
    try {
      await setMemberRoleRpc(id, member.user.id, 'member');
      setActionStatus(prev => ({ ...prev, [member.user.id]: { type: 'success', message: 'Demoted to member' } }));
      await load();
      toast.success('Admin demoted to member');
    } catch (e) {
      logger.error('Failed to demote member:', e);
      setActionStatus(prev => ({ ...prev, [member.user.id]: { type: 'error', message: 'Failed to demote' } }));
      showError('Failed to demote member');
    } finally {
      setConfirmDialog(null);
    }
  };

  const remove = async (member) => {
    setActionStatus(prev => ({ ...prev, [member.user.id]: { type: 'loading' } }));
    try {
      await removeMemberRpc(id, member.user.id);
      setActionStatus(prev => ({ ...prev, [member.user.id]: { type: 'success', message: 'Removed from group' } }));
      await load();
      toast.success('Member removed from group');
    } catch (e) {
      logger.error('Failed to remove member:', e);
      setActionStatus(prev => ({ ...prev, [member.user.id]: { type: 'error', message: 'Failed to remove' } }));
      showError('Failed to remove member');
    } finally {
      setConfirmDialog(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto p-4 md:p-6">
          {/* Header Skeleton */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-32 bg-gray-200 rounded-lg" />
                <div className="h-8 w-px bg-gray-200" />
                <div>
                  <div className="h-7 w-48 bg-gray-200 rounded mb-2" />
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="h-8 w-24 bg-gray-200 rounded-full" />
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Stats */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="h-6 w-40 bg-gray-200 rounded mb-5" />
                <div className="space-y-3">
                  <StatsCardSkeleton />
                  <StatsCardSkeleton />
                  <StatsCardSkeleton />
                </div>
              </div>
              {/* Form */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="h-6 w-40 bg-gray-200 rounded mb-5" />
                <div className="space-y-4">
                  <div className="h-10 bg-gray-200 rounded-lg" />
                  <div className="h-24 bg-gray-200 rounded-lg" />
                  <div className="h-10 bg-gray-200 rounded-lg" />
                </div>
              </div>
            </div>
            {/* Right Column */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="h-6 w-32 bg-gray-200 rounded mb-5" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MemberCardSkeleton />
                  <MemberCardSkeleton />
                  <MemberCardSkeleton />
                  <MemberCardSkeleton />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!authorized) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <Link to={`/groups/${id}`} className="text-gray-600 hover:text-gray-900 flex items-center"><ArrowLeft size={16} className="mr-2" />Back</Link>
          <h1 className="text-2xl font-bold text-gray-900 mb-4 flex-1">Manage Group</h1>
          <span className="w-10" aria-hidden="true"></span>
        </div>
        <div className="bg-white rounded shadow p-6">
          <p className="text-gray-700">{authMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
      {/* ARIA live region for status announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {Object.values(actionStatus).map(s => s.message).join('. ')}
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <Link 
              to={`/groups/${id}`} 
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-2 md:px-3 py-2 hover:bg-gray-50 min-h-[44px]"
              aria-label="Back to group page"
            >
              <ArrowLeft size={18} />
              <span className="font-medium hidden sm:inline">Back to Group</span>
            </Link>
            <div className="h-8 w-px bg-gray-300 hidden sm:block" />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">Group Management</h1>
              <p className="text-sm text-gray-500 mt-0.5 truncate">{group?.name}</p>
            </div>
          </div>
          <div className="flex flex-col items-stretch sm:items-end gap-2 flex-shrink-0">
            <div className="flex items-center gap-2 justify-end">
              {/* Refresh Button */}
              <Tooltip content="Refresh data">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Refresh group data"
                >
                  <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                </button>
              </Tooltip>
              {isSiteAdmin && (
                <span className="px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full whitespace-nowrap">
                  Site Admin
                </span>
              )}
              {isGroupAdmin && !isSiteAdmin && (
                <span className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full whitespace-nowrap">
                  Group Admin
                </span>
              )}
            </div>

            {/* Approval (site admin only) */}
            {isSiteAdmin && (
              <div className="flex items-center gap-2 justify-end">
                {/* Compact status pill */}
                {approvalStatus === 'approved' ? (
                  <span className="px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3" />
                    Approved
                  </span>
                ) : approvalStatus === 'rejected' ? (
                  <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-1.5">
                    <XCircle className="w-3 h-3" />
                    Rejected
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700 text-xs font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3" />
                    Pending
                  </span>
                )}

                {/* Compact Approve / Reject buttons */}
                {approvalStatus !== 'approved' && (
                  <button
                    onClick={handleApprove}
                    disabled={saving}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[32px]"
                  >
                    {saving ? 'Approving…' : 'Approve'}
                  </button>
                )}
                {approvalStatus !== 'rejected' && (
                  <button
                    onClick={handleReject}
                    disabled={saving}
                    className="px-3 py-1.5 border border-red-300 text-red-700 text-xs font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 min-h-[32px]"
                  >
                    {saving ? 'Rejecting…' : 'Reject'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="lg:hidden mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 flex">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 min-h-[44px] ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Settings size={16} />
            Settings
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 min-h-[44px] ${
              activeTab === 'members'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users size={16} />
            Members
            {pending.length > 0 && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                activeTab === 'members' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
              }`}>
                {pending.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          BLOCK 1: SETTINGS
          Contains: Overview, Basic Information, Privacy, Approval
          ═══════════════════════════════════════════════════════════════════════════ */}
      <div className={`space-y-4 ${activeTab !== 'settings' ? 'hidden lg:block' : ''}`}>
        {/* Block Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Settings className="w-5 h-5 text-blue-700" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Settings</h2>
        </div>

        {/* Group Overview - Always visible (not collapsible) */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" aria-labelledby="group-summary-heading">
          <h3 id="group-summary-heading" className="text-base font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="w-4 h-4 text-blue-600 mr-2" />
            Group Overview
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 text-center">
              <div className="text-2xl font-bold text-blue-900">{memberCount}</div>
              <div className="text-xs font-medium text-blue-700 mt-1">Members</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 text-center">
              <div className="text-2xl font-bold text-gray-900">{adminCount}</div>
              <div className="text-xs font-medium text-gray-600 mt-1">Admins</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-100 text-center">
              <div className="text-2xl font-bold text-amber-900">{pending.length}</div>
              <div className="text-xs font-medium text-amber-700 mt-1">Pending</div>
            </div>
          </div>
          
          {/* Admin Risk Banner */}
          {adminCount <= 1 && (
            <div className="mt-4 bg-amber-50 border border-amber-200 p-3 rounded-lg" role="alert">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    {adminCount === 0 ? 'No Admins' : 'Single Admin Risk'}
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {adminCount === 0 
                      ? 'Assign at least one admin to restore governance.'
                      : 'Add another admin to keep this group safe.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

          {/* Basics */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center">
          <div className="p-2 bg-gray-50 rounded-lg mr-3">
            <Info className="w-5 h-5 text-gray-600" />
          </div>
          Basic Information
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="group-name" className="block text-sm font-medium text-gray-700 mb-2">
              Group Name <span className="text-red-500">*</span>
            </label>
            <input 
              id="group-name"
              value={name} 
              onChange={(e) => {
                setName(e.target.value);
                if (formErrors.name) setFormErrors(prev => ({ ...prev, name: undefined }));
              }} 
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                formErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Enter group name"
              aria-describedby={formErrors.name ? 'name-error' : undefined}
              aria-invalid={!!formErrors.name}
              maxLength={100}
            />
            <div className="flex justify-between mt-1.5">
              {formErrors.name ? (
                <p id="name-error" className="text-xs text-red-600 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  {formErrors.name}
                </p>
              ) : (
                <span />
              )}
              <span className={`text-xs ${name.length > 90 ? 'text-amber-600' : 'text-gray-400'}`}>
                {name.length}/100
              </span>
            </div>
          </div>
          <div>
            <label htmlFor="group-description" className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea 
              id="group-description"
              value={description} 
              onChange={(e) => {
                setDescription(e.target.value);
                if (formErrors.description) setFormErrors(prev => ({ ...prev, description: undefined }));
              }} 
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none ${
                formErrors.description ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              rows="4"
              placeholder="Describe your group's purpose, activities, and who should join..."
              aria-describedby={formErrors.description ? 'description-error' : 'description-hint'}
              aria-invalid={!!formErrors.description}
              maxLength={2000}
            />
            <div className="flex justify-between mt-1.5">
              {formErrors.description ? (
                <p id="description-error" className="text-xs text-red-600 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  {formErrors.description}
                </p>
              ) : (
                <p id="description-hint" className="text-xs text-gray-500">A good description helps members understand your group</p>
              )}
              <span className={`text-xs ${description.length > 1800 ? 'text-amber-600' : 'text-gray-400'}`}>
                {description.length}/2000
              </span>
            </div>
          </div>
          <div>
            <label htmlFor="group-tags" className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
            <input 
              id="group-tags"
              value={tags} 
              onChange={(e) => setTags(e.target.value)} 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="e.g., technology, networking, alumni"
            />
            <p className="text-xs text-gray-500 mt-1.5">Separate multiple tags with commas. Tags help members discover your group.</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row sm:justify-end gap-3">
          <button 
            onClick={saveBasics} 
            disabled={saving || !name.trim()} 
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px] flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </section>

          {/* Privacy & Restrictions (combined) */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center">
          <div className="p-2 bg-gray-50 rounded-lg mr-3 flex items-center justify-center">
            {isPrivate ? <EyeOff className="w-5 h-5 text-gray-600" /> : <Eye className="w-5 h-5 text-gray-600" />}
          </div>
          Privacy & Restrictions
        </h2>

        <div className="space-y-4">
          {/* Privacy row */}
          <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
            <label className="flex items-start sm:items-center justify-between cursor-pointer gap-4">
              <div className="flex-1">
                <div className="font-medium text-gray-900 mb-1 flex items-center gap-2">
                  Private Group
                  {isPrivate && (
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full">Active</span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {isPrivate 
                    ? 'Only members can view group content. New members must be approved or invited.'
                    : 'Anyone can discover and view this group. Members can join freely.'}
                </p>
              </div>
              <div className="flex-shrink-0">
                <button
                  type="button"
                  role="switch"
                  aria-checked={isPrivate}
                  onClick={async () => {
                    const next = !isPrivate;
                    setIsPrivate(next);
                    await savePrivacy(next);
                  }}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    isPrivate ? 'bg-blue-600' : 'bg-gray-300'
                  } ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                      isPrivate ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </label>
          </div>

        </div>

        {/* No footer button: toggles now auto-save */}
      </section>
        </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          BLOCK 2: MEMBERS
          Contains: Pending Requests (collapsible), Invite, Members List (collapsible)
          ═══════════════════════════════════════════════════════════════════════════ */}
      <div className={`space-y-2 mt-8 ${activeTab !== 'members' ? 'hidden lg:block' : ''}`}>
        {/* Block Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="w-5 h-5 text-blue-700" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Members</h2>
        </div>

        {/* Pending Requests - Collapsible, auto-opens when items exist */}
        {(isSiteAdmin || isGroupAdmin) && (
          <CollapsibleSection
            id="pending-requests"
            title="Pending Join Requests"
            icon={AlertTriangle}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            isOpen={sectionStates.pending}
            onToggle={() => toggleSection('pending')}
            badge={pending.length > 0 ? pending.length : undefined}
            badgeColor="bg-amber-100 text-amber-700"
          >
            {pending.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-900">All Caught Up!</p>
                <p className="text-xs text-gray-600">No pending requests</p>
              </div>
            ) : (
            <div className="space-y-3">
              {pending.map((p) => {
                const status = actionStatus[p.user_id];
                const displayName = p.full_name || p.user_id;
                const avatarSrc = p.avatar_url || '/default-avatar.svg';
                return (
                  <div key={p.user_id} className="flex items-center justify-between border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      <img
                        src={avatarSrc}
                        alt={displayName}
                        className="w-10 h-10 rounded-full"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/default-avatar.svg';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{displayName}</div>
                        <div className="text-xs text-gray-500">Requested {new Date(p.requested_at).toLocaleDateString()}</div>
                        {status && (
                          <div className={`text-xs mt-1 flex items-center gap-1 ${
                            status.type === 'success' ? 'text-green-700' : 
                            status.type === 'error' ? 'text-red-700' : 'text-gray-600'
                          }`}>
                            {status.type === 'success' && <CheckCircle className="w-3 h-3" />}
                            {status.type === 'error' && <XCircle className="w-3 h-3" />}
                            {status.message}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={async () => { 
                          setActionStatus(prev => ({ ...prev, [p.user_id]: { type: 'loading' } }));
                          try {
                            await approveGroupMember(id, p.user_id); 
                            setActionStatus(prev => ({ ...prev, [p.user_id]: { type: 'success', message: 'Approved' } }));
                            showSuccess('Member approved'); 
                            setTimeout(() => load(), 1000);
                          } catch (e) {
                            setActionStatus(prev => ({ ...prev, [p.user_id]: { type: 'error', message: 'Failed to approve' } }));
                            showError('Failed to approve');
                          }
                        }} 
                        disabled={status?.type === 'loading'}
                        className="text-sm px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-w-[80px]"
                        aria-label={`Approve join request from ${p.user_id}`}
                      >
                        {status?.type === 'loading' ? 'Approving...' : 'Approve'}
                      </button>
                      <button 
                        onClick={async () => { 
                          setActionStatus(prev => ({ ...prev, [p.user_id]: { type: 'loading' } }));
                          try {
                            await rejectGroupMember(id, p.user_id); 
                            setActionStatus(prev => ({ ...prev, [p.user_id]: { type: 'success', message: 'Rejected' } }));
                            showSuccess('Request rejected'); 
                            setTimeout(() => load(), 1000);
                          } catch (e) {
                            setActionStatus(prev => ({ ...prev, [p.user_id]: { type: 'error', message: 'Failed to reject' } }));
                            showError('Failed to reject');
                          }
                        }} 
                        disabled={status?.type === 'loading'}
                        className="text-sm px-4 py-2 rounded-md bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 min-w-[80px]"
                        aria-label={`Reject join request from ${p.user_id}`}
                      >
                        {status?.type === 'loading' ? 'Rejecting...' : 'Reject'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </CollapsibleSection>
        )}

        {/* Members List - Collapsible, open by default */}
        <CollapsibleSection
          id="members-list"
          title="Member Directory"
          icon={Users}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          isOpen={sectionStates.members}
          onToggle={() => toggleSection('members')}
          badge={memberCount}
          badgeColor="bg-blue-100 text-blue-700"
        >
          {/* Invite New Member */}
          {(isSiteAdmin || isGroupAdmin) && (
            <div className="mb-6">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <UserPlus className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-medium text-gray-900">Invite New Member</h3>
                </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    id="invite-email"
                    ref={inviteInputRef}
                    type="email"
                    value={inviteEmail} 
                    onChange={(e) => {
                      setInviteEmail(e.target.value);
                      if (formErrors.email) setFormErrors(prev => ({ ...prev, email: undefined }));
                    }} 
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && inviteEmail && isValidEmail(inviteEmail) && !inviting && !group?.is_archived) {
                        e.preventDefault();
                        document.getElementById('invite-button')?.click();
                      }
                    }}
                    placeholder="colleague@example.com" 
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      formErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
                    }`}
                    disabled={group?.is_archived} 
                    aria-describedby="invite-hint"
                  />
                </div>
                {formErrors.email ? (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {formErrors.email}
                  </p>
                ) : (
                  <p id="invite-hint" className="mt-1.5 text-xs text-gray-500">
                    They'll receive a notification to join. {isPrivate && 'Private group invites bypass approval.'}
                  </p>
                )}
              </div>
              <div className="flex items-end">
                <button
                  id="invite-button"
                  disabled={inviting || !inviteEmail || !isValidEmail(inviteEmail) || group?.is_archived}
                  onClick={async () => {
                    if (!isValidEmail(inviteEmail)) {
                      setFormErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
                      inviteInputRef.current?.focus();
                      return;
                    }
                    setInviting(true);
                    try {
                      await inviteMemberByEmail(id, inviteEmail);
                      showSuccess('Invitation sent! The user will receive a notification.');
                      setInviteEmail('');
                      // Refresh group and pending requests so counts reflect the latest state
                      await load();
                    } catch (e) {
                      logger.error('Invite failed', e);
                      const msg = String(e?.message || '').toLowerCase();
                      // Surface specific RPC error messages for better UX
                      if (/employer/i.test(msg)) {
                        showError('Employers cannot be invited to groups.');
                      } else if (/alumni.?only/i.test(msg) || /students cannot be invited/i.test(msg)) {
                        showError('This group is alumni-only. Students cannot be invited.');
                      } else if (/already a member/i.test(msg)) {
                        showError('This user is already a member of this group.');
                      } else if (/not authenticated/i.test(msg)) {
                        showError('You must be logged in to send invites.');
                      } else if (/only group members/i.test(msg)) {
                        showError('Only group members can send invites.');
                      } else if (/archived/i.test(msg)) {
                        showError('Cannot invite to an archived group.');
                      } else if (/unapproved/i.test(msg) || /pending approval/i.test(msg)) {
                        showError('Cannot invite to a group that is not yet approved.');
                      } else if (/rate limit/i.test(msg)) {
                        showError('Too many invites sent. Please wait before sending more.');
                      } else if (/no user found/i.test(msg) || /user not found/i.test(msg)) {
                        showError('No user found with this email address.');
                      } else {
                        showError(getFriendlyErrorMessage(e, 'Failed to invite member. Please try again.'));
                      }
                    } finally {
                      setInviting(false);
                    }
                  }}
                  className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px] flex items-center gap-2"
                >
                  {inviting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Send Invite
                    </>
                  )}
                </button>
              </div>
            </div>
            </div>

            {/* Search and Filter */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search members by name or email..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                  />
                  {memberSearch && (
                    <button
                      onClick={() => setMemberSearch('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white cursor-pointer text-sm font-medium min-w-[140px]"
                  >
                    <option value="all">All Members</option>
                    <option value="admin">Admins Only</option>
                    <option value="member">Members Only</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
                <span>
                  {(() => {
                    const filtered = members.filter(m => {
                      const matchesSearch = !memberSearch || 
                        m.user.full_name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
                        m.user.email?.toLowerCase().includes(memberSearch.toLowerCase());
                      const matchesRole = roleFilter === 'all' || m.role === roleFilter;
                      return matchesSearch && matchesRole;
                    });
                    const displayed = Math.min(displayLimit, filtered.length);
                    return `Showing ${displayed} of ${filtered.length} ${(memberSearch || roleFilter !== 'all') ? 'filtered' : ''} members`;
                  })()}
                </span>
                {(memberSearch || roleFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setMemberSearch('');
                      setRoleFilter('all');
                      setDisplayLimit(20);
                    }}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        {members.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-base font-medium text-gray-900 mb-1">No Members Yet</p>
            <p className="text-sm text-gray-600">Invite members to get started</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Admins Section */}
            {(() => {
              const filteredAdmins = members.filter(m => {
                const matchesSearch = !memberSearch || 
                  m.user.full_name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
                  m.user.email?.toLowerCase().includes(memberSearch.toLowerCase());
                const matchesRole = roleFilter === 'all' || m.role === roleFilter;
                return m.role === 'admin' && matchesSearch && matchesRole;
              });
              const displayedAdmins = filteredAdmins.slice(0, displayLimit);
              return displayedAdmins.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Admins ({members.filter(m => m.role === 'admin').length})</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {displayedAdmins.map(m => {
              const status = actionStatus[m.user.id];
              return (
                <article key={m.user.id} className="border border-blue-200 bg-blue-50/30 rounded-lg p-5 relative hover:shadow-md hover:border-blue-300 transition-all" aria-label={`Admin: ${m.user.full_name}`}>
                  <span className="absolute top-4 right-4 bg-blue-600 text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-semibold" aria-label="Admin">
                    <Shield size={12} />
                    Admin
                  </span>
                  <div className="flex items-start gap-4 mb-4">
                    <img
                      src={avatarUrls[m.user.id] || m.user.avatar_url || '/default-avatar.svg'}
                      alt=""
                      className="w-14 h-14 rounded-full border-2 border-blue-300 object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/default-avatar.svg';
                      }}
                    />
                    <div className="flex-1 min-w-0 pr-16">
                      <div className="font-semibold text-gray-900 truncate text-base">{m.user.full_name}</div>
                      <div className="text-sm text-gray-600 mt-0.5">
                        {(ROLE_LABELS[m.user.role] || 'Alumni')}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Group Administrator
                      </div>
                    </div>
                  </div>
                  {status && (
                    <div className={`text-xs mb-3 p-3 rounded-lg flex items-center gap-2 font-medium ${
                      status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 
                      status.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-50 text-gray-600 border border-gray-200'
                    }`}>
                      {status.type === 'success' && <CheckCircle className="w-4 h-4" />}
                      {status.type === 'error' && <XCircle className="w-4 h-4" />}
                      {status.message}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleDemoteClick(m)} 
                      disabled={status?.type === 'loading' || adminCount <= 1}
                      className="text-sm px-4 py-2.5 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 flex-1 font-medium transition-colors flex items-center justify-center gap-1.5"
                      aria-label={`Demote ${m.user.full_name} to member`}
                      title={adminCount <= 1 ? 'Cannot demote the last admin. Promote another member first.' : ''}
                    >
                      <ArrowDown className="w-4 h-4" />
                      {status?.type === 'loading' ? 'Demoting...' : 'Demote'}
                    </button>
                  </div>
                </article>
              );
            })}
                </div>
              </div>
            )})()}

            {/* Members Section */}
            {(() => {
              const filteredMembers = members.filter(m => {
                const matchesSearch = !memberSearch || 
                  m.user.full_name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
                  m.user.email?.toLowerCase().includes(memberSearch.toLowerCase());
                const matchesRole = roleFilter === 'all' || m.role === roleFilter;
                return m.role !== 'admin' && matchesSearch && matchesRole;
              });
              // Calculate how many admins we've already shown
              const adminCount = members.filter(m => {
                const matchesSearch = !memberSearch || 
                  m.user.full_name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
                  m.user.email?.toLowerCase().includes(memberSearch.toLowerCase());
                const matchesRole = roleFilter === 'all' || m.role === roleFilter;
                return m.role === 'admin' && matchesSearch && matchesRole;
              }).length;
              const remainingSlots = Math.max(0, displayLimit - adminCount);
              const displayedMembers = filteredMembers.slice(0, remainingSlots);
              return displayedMembers.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Members ({members.filter(m => m.role !== 'admin').length})</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {displayedMembers.map(m => {
              const status = actionStatus[m.user.id];
              return (
                <article key={m.user.id} className="border border-gray-200 rounded-lg p-5 relative hover:shadow-md hover:border-blue-300 transition-all bg-white" aria-label={`Member: ${m.user.full_name}`}>
                  <div className="flex items-start gap-4 mb-4">
                    <img
                      src={avatarUrls[m.user.id] || m.user.avatar_url || '/default-avatar.svg'}
                      alt=""
                      className="w-14 h-14 rounded-full border-2 border-gray-200 object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/default-avatar.svg';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate text-base">{m.user.full_name}</div>
                      <div className="text-sm text-gray-600 mt-0.5">
                        {(ROLE_LABELS[m.user.role] || 'Alumni')}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {m.role === 'admin' ? 'Group Administrator' : 'Group Member'}
                      </div>
                    </div>
                  </div>
                  {status && (
                    <div className={`text-xs mb-3 p-3 rounded-lg flex items-center gap-2 font-medium ${
                      status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 
                      status.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-50 text-gray-600 border border-gray-200'
                    }`}>
                      {status.type === 'success' && <CheckCircle className="w-4 h-4" />}
                      {status.type === 'error' && <XCircle className="w-4 h-4" />}
                      {status.message}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button 
                      onClick={() => promote(m)} 
                      disabled={status?.type === 'loading'}
                      className="text-sm px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 flex-1 font-medium transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
                      aria-label={`Promote ${m.user.full_name} to admin`}
                    >
                      <ArrowUp className="w-4 h-4" />
                      {status?.type === 'loading' ? 'Promoting...' : 'Promote'}
                    </button>
                    <button 
                      onClick={() => handleRemoveClick(m)} 
                      disabled={status?.type === 'loading'}
                      className="text-sm px-4 py-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 flex items-center justify-center gap-1.5 min-h-[44px] transition-colors"
                      aria-label={`Remove ${m.user.full_name} from group`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </article>
              );
            })}
                </div>
              </div>
            )})()}

            {/* Load More Button */}
            {(() => {
              const totalFiltered = members.filter(m => {
                const matchesSearch = !memberSearch || 
                  m.user.full_name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
                  m.user.email?.toLowerCase().includes(memberSearch.toLowerCase());
                const matchesRole = roleFilter === 'all' || m.role === roleFilter;
                return matchesSearch && matchesRole;
              }).length;
              const hasMore = displayLimit < totalFiltered;
              return hasMore && (
                <div className="text-center py-6">
                  <button
                    onClick={() => {
                      setLoadingMore(true);
                      // Simulate loading delay for smooth UX
                      setTimeout(() => {
                        setDisplayLimit(prev => prev + 20);
                        setLoadingMore(false);
                      }, 300);
                    }}
                    disabled={loadingMore}
                    className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center gap-2 mx-auto focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-5 h-5" />
                        Load More ({Math.min(20, totalFiltered - displayLimit)} more)
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-500 mt-3">
                    Showing {displayLimit} of {totalFiltered} members
                  </p>
                </div>
              );
            })()}

            {/* No Results */}
            {members.filter(m => {
              const matchesSearch = !memberSearch || 
                m.user.full_name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
                m.user.email?.toLowerCase().includes(memberSearch.toLowerCase());
              const matchesRole = roleFilter === 'all' || m.role === roleFilter;
              return matchesSearch && matchesRole;
            }).length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-base font-medium text-gray-900 mb-1">No members found</p>
                <p className="text-sm text-gray-600 mb-4">Try adjusting your search or filters</p>
                <button
                  onClick={() => {
                    setMemberSearch('');
                    setRoleFilter('all');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        )}
        </CollapsibleSection>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          BLOCK 3: DANGER ZONE
          Contains: Archive Group, Leave Group - Collapsed by default for safety
          ═══════════════════════════════════════════════════════════════════════════ */}
      <div className={`mt-2 ${activeTab !== 'settings' ? 'hidden lg:block' : ''}`}>
        <CollapsibleSection
          id="danger-zone"
          title="Danger Zone"
          icon={AlertTriangle}
          iconBg="bg-red-50"
          iconColor="text-red-600"
          isOpen={sectionStates.dangerZone}
          onToggle={() => toggleSection('dangerZone')}
          className="border-red-200"
        >
          <div className="space-y-4">
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <h3 className="font-semibold text-gray-900 mb-2">Archive Group</h3>
              <p className="text-sm text-gray-600 mb-3">Archiving will disable new posts and hide the group from listings. This can be reversed by a site administrator.</p>
              <button 
                onClick={archiveGroup} 
                disabled={saving} 
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                {saving ? 'Archiving...' : 'Archive Group'}
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">Leave Group</h3>
              <p className="text-sm text-gray-600 mb-3">
                You will lose access to group content.
                {adminCount <= 1 && isGroupAdmin && ' You cannot leave as the only admin.'}
              </p>
              <button 
                onClick={() => setIsLeaveDialogOpen(true)} 
                disabled={leaving || (adminCount <= 1 && isGroupAdmin)} 
                className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                title={adminCount <= 1 && isGroupAdmin ? 'Cannot leave as the only admin' : ''}
              >
                {leaving ? 'Leaving...' : 'Leave Group'}
              </button>
            </div>
          </div>
        </CollapsibleSection>
      </div>

      {/* Confirmation Dialog for member demote/remove */}
      {confirmDialog && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200" 
          onClick={() => setConfirmDialog(null)}
          role="presentation"
        >
          <div 
            ref={dialogRef}
            tabIndex={-1}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200" 
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            aria-describedby="dialog-description"
            onKeyDown={(e) => {
              // Focus trap
              if (e.key === 'Tab') {
                const focusable = e.currentTarget.querySelectorAll('button');
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setConfirmDialog(null)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4 mb-5">
              <div className={`p-3 rounded-full flex-shrink-0 ${
                confirmDialog.type === 'remove' ? 'bg-red-100' : 'bg-amber-100'
              }`}>
                {confirmDialog.type === 'remove' ? (
                  <Trash2 className="w-6 h-6 text-red-600" />
                ) : (
                  <ArrowDown className="w-6 h-6 text-amber-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 id="dialog-title" className="text-lg font-semibold text-gray-900 mb-2">
                  {confirmDialog.type === 'remove' 
                    ? `Remove ${confirmDialog.member.user.full_name}?`
                    : `Demote ${confirmDialog.member.user.full_name}?`
                  }
                </h3>
                <p id="dialog-description" className="text-sm text-gray-600">
                  {confirmDialog.type === 'remove'
                    ? `${confirmDialog.member.user.full_name} will lose access to all group content and will need to be re-invited to rejoin.`
                    : `${confirmDialog.member.user.full_name} will no longer be able to manage members or change group settings.`
                  }
                </p>
              </div>
            </div>

            {/* Member preview */}
            <div className="bg-gray-50 rounded-lg p-4 mb-5 flex items-center gap-3">
              <img
                src={avatarUrls[confirmDialog.member.user.id] || confirmDialog.member.user.avatar_url || '/default-avatar.svg'}
                alt=""
                className="w-10 h-10 rounded-full border-2 border-gray-200"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/default-avatar.svg';
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{confirmDialog.member.user.full_name}</div>
                <div className="text-xs text-gray-500">
                  {confirmDialog.member.role === 'admin' ? 'Group Administrator' : 'Group Member'}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmDialog.type === 'remove') {
                    remove(confirmDialog.member);
                  } else {
                    demote(confirmDialog.member);
                  }
                }}
                className={`px-5 py-2.5 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[44px] flex items-center justify-center gap-2 ${
                  confirmDialog.type === 'remove'
                    ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                    : 'bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500'
                }`}
              >
                {confirmDialog.type === 'remove' ? (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Remove from Group
                  </>
                ) : (
                  <>
                    <ArrowDown className="w-4 h-4" />
                    Demote to Member
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <LeaveConfirmationDialog
        isOpen={isLeaveDialogOpen}
        onClose={() => setIsLeaveDialogOpen(false)}
        onConfirm={async () => {
          await leaveGroup();
          setIsLeaveDialogOpen(false);
        }}
        itemType="group"
        itemName={group?.name}
        loading={leaving}
      />
      </div>
    </div>
  );
}