import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../utils/supabase';
import logger from '../../utils/logger';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  LinkIcon,
  ShieldCheckIcon,
  ChatBubbleLeftRightIcon,
  CalendarIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  UserIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentTextIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

// Category configuration with icons and colors
const CATEGORY_CONFIG = {
  browse: {
    label: 'Browsing',
    icon: EyeIcon,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    dotColor: 'bg-blue-500',
  },
  create: {
    label: 'Created',
    icon: DocumentTextIcon,
    color: 'bg-green-100 text-green-700 border-green-200',
    dotColor: 'bg-green-500',
  },
  update: {
    label: 'Updated',
    icon: PencilIcon,
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500',
  },
  delete: {
    label: 'Deleted',
    icon: TrashIcon,
    color: 'bg-red-100 text-red-700 border-red-200',
    dotColor: 'bg-red-500',
  },
  relationship: {
    label: 'Relationship',
    icon: LinkIcon,
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    dotColor: 'bg-purple-500',
  },
  permission: {
    label: 'Permission',
    icon: ShieldCheckIcon,
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    dotColor: 'bg-orange-500',
  },
  auth: {
    label: 'Auth',
    icon: UserIcon,
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    dotColor: 'bg-indigo-500',
  },
  system: {
    label: 'System',
    icon: ShieldCheckIcon,
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    dotColor: 'bg-slate-500',
  },
};

// Entity type configuration
const ENTITY_CONFIG = {
  event: { label: 'Event', icon: CalendarIcon, color: 'text-blue-600' },
  job: { label: 'Job', icon: BriefcaseIcon, color: 'text-green-600' },
  group: { label: 'Group', icon: UserGroupIcon, color: 'text-purple-600' },
  profile: { label: 'Profile', icon: UserIcon, color: 'text-amber-600' },
  mentorship: { label: 'Mentorship', icon: AcademicCapIcon, color: 'text-indigo-600' },
  connection: { label: 'Connection', icon: LinkIcon, color: 'text-pink-600' },
  message: { label: 'Message', icon: ChatBubbleLeftRightIcon, color: 'text-cyan-600' },
  conversation: { label: 'Conversation', icon: ChatBubbleLeftRightIcon, color: 'text-cyan-600' },
  directory: { label: 'Directory', icon: UserGroupIcon, color: 'text-slate-600' },
  application: { label: 'Application', icon: DocumentTextIcon, color: 'text-emerald-600' },
  rsvp: { label: 'RSVP', icon: CalendarIcon, color: 'text-violet-600' },
  notification: { label: 'Notification', icon: DocumentTextIcon, color: 'text-rose-600' },
  system: { label: 'System', icon: ShieldCheckIcon, color: 'text-slate-600' },
};

// Human-friendly action labels
const ACTION_LABELS = {
  // Browsing
  messages_page_view: 'Opened Messages page',
  dm_threads_list_load: 'Loaded conversations list',
  dm_open_thread: 'Opened a DM conversation',
  directory_page_view: 'Viewed Alumni Directory',
  directory_list_view: 'Viewed Alumni Directory list',
  directory_search: 'Searched in Alumni Directory',
  events_list_view: 'Viewed Events list',
  event_detail_view: 'Viewed Event details',
  job_list_view: 'Viewed Job listings',
  job_detail_view: 'Viewed Job details',
  // Events
  event_created: 'Created an event',
  event_updated: 'Updated an event',
  event_deleted: 'Deleted an event',
  // Jobs
  job_created: 'Posted a job',
  job_updated: 'Updated a job',
  job_deleted: 'Deleted a job',
  job_application_submitted: 'Applied for a job',
  // Groups
  group_created: 'Created a group',
  group_updated: 'Updated a group',
  group_deleted: 'Deleted a group',
  group_joined: 'Joined a group',
  group_left: 'Left a group',
  group_role_changed: 'Group role changed',
  // Connections
  connection_requested: 'Sent connection request',
  connection_accepted: 'Accepted connection',
  connection_declined: 'Declined connection',
  connection_removed: 'Removed connection',
  connection_disconnected: 'Disconnected',
  // Mentorship
  mentorship_requested: 'Requested mentorship',
  mentorship_accepted: 'Accepted mentorship',
  mentorship_rejected: 'Declined mentorship',
  mentorship_completed: 'Completed mentorship',
  // Profile/Permissions
  profile_role_changed: 'Role changed',
  profile_approval_changed: 'Approval status changed',
  profile_admin_changed: 'Admin flag changed',
  profile_admin_edited: 'Profile edited by admin',
  // RSVPs
  event_rsvp_going: 'RSVP\'d Going',
  event_rsvp_interested: 'RSVP\'d Interested',
  event_rsvp_not_going: 'RSVP\'d Not Going',
  event_rsvp_cancelled: 'Cancelled RSVP',
};

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getActionLabel = (action, actionLabel) => {
  if (actionLabel) return actionLabel;
  if (!action) return 'Unknown action';
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  // Convert snake_case to Title Case
  return action
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const formatFullDateTime = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Category Badge
const CategoryBadge = ({ category }) => {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.system;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {config.label}
    </span>
  );
};

// Entity Badge
const EntityBadge = ({ entityType, entityName }) => {
  const config = ENTITY_CONFIG[entityType] || ENTITY_CONFIG.system;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-sm ${config.color}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="font-medium">{entityName || config.label}</span>
    </span>
  );
};

// User Avatar with fallback
const UserAvatar = ({ name, avatarUrl, size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'User'}
        className={`${sizeClasses} rounded-full object-cover ring-2 ring-white`}
      />
    );
  }

  return (
    <div className={`${sizeClasses} rounded-full bg-gradient-to-br from-ocean-400 to-ocean-600 flex items-center justify-center text-white font-medium ring-2 ring-white`}>
      {initials}
    </div>
  );
};

// Expandable Details Panel
const DetailsPanel = ({ log, isExpanded }) => {
  if (!isExpanded) return null;

  const hasOldValues = log.old_values && Object.keys(log.old_values).length > 0;
  const hasNewValues = log.new_values && Object.keys(log.new_values).length > 0;
  const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;
  const hasImpact = log.impact && Object.keys(log.impact).length > 0;

  if (!hasOldValues && !hasNewValues && !hasMetadata && !hasImpact) {
    return (
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
        <p className="text-sm text-slate-500 italic">No additional details available</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 space-y-3">
      {/* Changes (old → new) */}
      {(hasOldValues || hasNewValues) && (
        <div>
          <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Changes</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {hasOldValues && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                <span className="text-xs font-medium text-red-600 block mb-1">Before</span>
                <pre className="text-xs text-red-800 whitespace-pre-wrap break-words">
                  {JSON.stringify(log.old_values, null, 2)}
                </pre>
              </div>
            )}
            {hasNewValues && (
              <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                <span className="text-xs font-medium text-green-600 block mb-1">After</span>
                <pre className="text-xs text-green-800 whitespace-pre-wrap break-words">
                  {JSON.stringify(log.new_values, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Impact */}
      {hasImpact && (
        <div>
          <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Impact</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(log.impact).map(([key, value]) => (
              <span key={key} className="inline-flex items-center px-2 py-1 rounded bg-amber-100 text-amber-800 text-xs">
                <strong className="mr-1">{key}:</strong> {String(value)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      {hasMetadata && (
        <div>
          <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Details</h4>
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <pre className="text-xs text-slate-700 whitespace-pre-wrap break-words">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Technical info */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-2 border-t border-slate-200">
        {log.source && <span><strong>Source:</strong> {log.source}</span>}
        {log.route && <span><strong>Route:</strong> {log.route}</span>}
        {log.log_source && <span><strong>Log type:</strong> {log.log_source}</span>}
      </div>
    </div>
  );
};

// Loading Skeleton
const LoadingSkeleton = () => (
  <div className="space-y-3 animate-pulse">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-3 bg-slate-200 rounded w-2/3" />
            <div className="h-3 bg-slate-200 rounded w-1/4" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Empty State
const EmptyState = ({ hasFilters, onReset }) => (
  <div className="text-center py-12 px-4">
    <DocumentTextIcon className="mx-auto h-12 w-12 text-slate-300" />
    <h3 className="mt-4 text-lg font-medium text-slate-900">No activity logs found</h3>
    <p className="mt-2 text-sm text-slate-500">
      {hasFilters
        ? 'Try adjusting your filters to see more results.'
        : 'Activity will appear here as users interact with the platform.'}
    </p>
    {hasFilters && (
      <button
        onClick={onReset}
        className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-ocean-600 hover:text-ocean-700 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2"
      >
        <XMarkIcon className="h-4 w-4" />
        Clear all filters
      </button>
    )}
  </div>
);

// Error State
const ErrorState = ({ error, onRetry }) => (
  <div className="text-center py-12 px-4 bg-red-50 rounded-lg border border-red-200">
    <XMarkIcon className="mx-auto h-12 w-12 text-red-400" />
    <h3 className="mt-4 text-lg font-medium text-red-900">Failed to load activity logs</h3>
    <p className="mt-2 text-sm text-red-600">{error}</p>
    <button
      onClick={onRetry}
      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
    >
      <ArrowPathIcon className="h-4 w-4" />
      Try again
    </button>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ActivityLogs = () => {
  // State
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  
  // UI state
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return search || categoryFilter !== 'all' || entityFilter !== 'all' || fromDate || toDate;
  }, [search, categoryFilter, entityFilter, fromDate, toDate]);

  // Fetch logs using the RPC
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        p_limit: pageSize,
        p_offset: page * pageSize,
      };

      if (search) params.p_search = search;
      if (categoryFilter !== 'all') params.p_category = categoryFilter;
      if (entityFilter !== 'all') params.p_entity_type = entityFilter;
      if (fromDate) params.p_from_date = new Date(fromDate).toISOString();
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        params.p_to_date = end.toISOString();
      }

      const { data, error: rpcError } = await supabase.rpc('get_activity_logs', params);

      if (rpcError) throw rpcError;

      const rows = data || [];
      setLogs(rows);
      setTotalCount(rows.length > 0 ? rows[0].total_count : 0);
    } catch (e) {
      logger.error('Failed to fetch activity logs:', e);
      setError(e.message || 'Failed to fetch activity logs');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, categoryFilter, entityFilter, fromDate, toDate]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(0);
  }, [search, categoryFilter, entityFilter, fromDate, toDate, pageSize]);

  // Toggle row expansion
  const toggleRowExpansion = (id) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Reset all filters
  const resetFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setEntityFilter('all');
    setFromDate('');
    setToDate('');
    setPage(0);
  };

  // Pagination calculations
  const totalPages = Math.ceil(totalCount / pageSize);
  const startItem = page * pageSize + 1;
  const endItem = Math.min((page + 1) * pageSize, totalCount);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Activity Logs</h1>
          <p className="mt-1 text-sm text-slate-600">
            Complete audit trail of user actions across the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2 ${
              showFilters || hasActiveFilters
                ? 'bg-ocean-50 text-ocean-700 border-ocean-200'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <FunnelIcon className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-ocean-600 text-white text-xs">
                !
              </span>
            )}
          </button>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-ocean-600 rounded-lg hover:bg-ocean-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-slate-700 mb-1">
                Search
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="search"
                  type="text"
                  placeholder="User, action, or entity..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-slate-700 mb-1">
                Category
              </label>
              <select
                id="category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
              >
                <option value="all">All categories</option>
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>

            {/* Entity Type Filter */}
            <div>
              <label htmlFor="entity" className="block text-sm font-medium text-slate-700 mb-1">
                Entity Type
              </label>
              <select
                id="entity"
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
              >
                <option value="all">All types</option>
                {Object.entries(ENTITY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="fromDate" className="block text-sm font-medium text-slate-700 mb-1">
                  From
                </label>
                <input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                />
              </div>
              <div>
                <label htmlFor="toDate" className="block text-sm font-medium text-slate-700 mb-1">
                  To
                </label>
                <input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                />
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <span className="text-sm text-slate-600">
                {totalCount.toLocaleString()} result{totalCount !== 1 ? 's' : ''} found
              </span>
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
              >
                <XMarkIcon className="h-4 w-4" />
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results Summary */}
      {!loading && !error && logs.length > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Showing {startItem.toLocaleString()}–{endItem.toLocaleString()} of {totalCount.toLocaleString()} activities
          </span>
          <div className="flex items-center gap-2">
            <label htmlFor="pageSize" className="text-sm text-slate-600">Show:</label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={fetchLogs} />
      ) : logs.length === 0 ? (
        <EmptyState hasFilters={hasActiveFilters} onReset={resetFilters} />
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const isExpanded = expandedRows.has(log.id);
            const categoryConfig = CATEGORY_CONFIG[log.category] || CATEGORY_CONFIG.system;

            return (
              <div
                key={log.id}
                className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition-colors"
              >
                {/* Main Row */}
                <button
                  onClick={() => toggleRowExpansion(log.id)}
                  className="w-full px-4 py-3 flex items-start gap-3 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ocean-500"
                  aria-expanded={isExpanded}
                >
                  {/* Timeline dot */}
                  <div className="flex-shrink-0 mt-1">
                    <div className={`h-2.5 w-2.5 rounded-full ${categoryConfig.dotColor}`} />
                  </div>

                  {/* User Avatar */}
                  <div className="flex-shrink-0">
                    <UserAvatar
                      name={log.actor_display_name}
                      avatarUrl={log.actor_avatar_url}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900 truncate">
                        {log.actor_display_name || 'Unknown user'}
                      </span>
                      <CategoryBadge category={log.category} />
                    </div>
                    <p className="text-sm text-slate-700">
                      {getActionLabel(log.action, log.action_label)}
                    </p>
                    {log.entity_name && (
                      <div className="mt-1">
                        <EntityBadge entityType={log.resource_type} entityName={log.entity_name} />
                      </div>
                    )}
                  </div>

                  {/* Time & Expand */}
                  <div className="flex-shrink-0 flex items-center gap-2 text-right">
                    <div className="hidden sm:block">
                      <div className="text-sm text-slate-600" title={formatFullDateTime(log.created_at)}>
                        {formatRelativeTime(log.created_at)}
                      </div>
                      {log.actor_email && (
                        <div className="text-xs text-slate-400 truncate max-w-[150px]">
                          {log.actor_email}
                        </div>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUpIcon className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Details */}
                <DetailsPanel log={log} isExpanded={isExpanded} />
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Previous
          </button>
          <span className="text-sm text-slate-600">
            Page {page + 1} of {totalPages.toLocaleString()}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2"
          >
            Next
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ActivityLogs;
