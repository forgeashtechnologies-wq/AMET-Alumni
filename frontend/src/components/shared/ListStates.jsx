import React from 'react';
import { 
  AlertCircle, 
  RefreshCw, 
  Search, 
  Users, 
  Calendar, 
  MessageSquare, 
  Briefcase,
  UserPlus,
  FolderOpen,
  Inbox
} from 'lucide-react';
import { Button } from './Buttons';

// ============================================
// LOADING COMPONENTS - Smooth transitions instead of skeletons
// ============================================

/**
 * LoadingSpinner - Minimal centered spinner for loading states
 * Replaces skeleton cards with a clean, non-jarring loading indicator
 */
export function LoadingSpinner({ 
  message = 'Loading...', 
  size = 'lg',
  className = '' 
}) {
  const sizeClasses = {
    sm: 'spinner-sm',
    md: 'spinner-md',
    lg: 'spinner-lg',
  };

  return (
    <div 
      className={`flex items-center justify-center py-12 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3">
        <div className={`spinner ${sizeClasses[size] || 'spinner-lg'}`} aria-hidden="true" />
        {message && (
          <p className="text-sm text-gray-500 font-medium">{message}</p>
        )}
        <span className="sr-only">{message}</span>
      </div>
    </div>
  );
}

/**
 * @deprecated Use LoadingSpinner instead for smooth transitions
 * Skeleton Card - kept for backward compatibility
 */
export function SkeletonCard({ className = '' }) {
  return <LoadingSpinner message="" className={className} />;
}

/**
 * @deprecated Use LoadingSpinner instead for smooth transitions
 * Skeleton Row - kept for backward compatibility
 */
export function SkeletonRow({ columns = 4, className = '' }) {
  return <LoadingSpinner message="" size="sm" className={className} />;
}

/**
 * @deprecated Use LoadingSpinner instead for smooth transitions
 * Skeleton List - kept for backward compatibility
 */
export function SkeletonList({ 
  count = 3, 
  variant = 'card', 
  columns = 4,
  className = '' 
}) {
  return <LoadingSpinner message="Loading content..." className={className} />;
}

/**
 * @deprecated Use LoadingSpinner instead for smooth transitions
 * Skeleton Grid - kept for backward compatibility
 */
export function SkeletonGrid({ 
  count = 6, 
  columns = 3,
  className = '' 
}) {
  return <LoadingSpinner message="Loading content..." className={className} />;
}

// ============================================
// EMPTY STATE COMPONENTS
// ============================================

// Icon mapping for different content types
const emptyStateIcons = {
  default: Inbox,
  users: Users,
  search: Search,
  events: Calendar,
  messages: MessageSquare,
  jobs: Briefcase,
  connections: UserPlus,
  groups: Users,
  files: FolderOpen,
};

/**
 * Empty State - for when there's no data to display
 */
export function EmptyState({
  icon: CustomIcon,
  iconType = 'default',
  title = 'No items found',
  description = 'There are no items to display at this time.',
  actionLabel,
  onAction,
  actionVariant = 'primary',
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}) {
  const IconComponent = CustomIcon || emptyStateIcons[iconType] || emptyStateIcons.default;

  return (
    <div className={`empty-state ${className}`} role="status">
      <IconComponent className="empty-state-icon" aria-hidden="true" />
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {actionLabel && onAction && (
            <Button variant={actionVariant} onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="outline" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Pre-configured empty states for common scenarios
export function EmptySearchResults({ query, onClear, className = '' }) {
  return (
    <EmptyState
      iconType="search"
      title="No results found"
      description={query 
        ? `We couldn't find anything matching "${query}". Try adjusting your search or filters.`
        : "Try adjusting your search or filters to find what you're looking for."
      }
      actionLabel={query ? "Clear search" : undefined}
      onAction={onClear}
      className={className}
    />
  );
}

export function EmptyConnections({ onExplore, className = '' }) {
  return (
    <EmptyState
      iconType="connections"
      title="No connections yet"
      description="Start building your network by connecting with fellow alumni."
      actionLabel="Explore Directory"
      onAction={onExplore}
      className={className}
    />
  );
}

export function EmptyMessages({ onStartChat, className = '' }) {
  return (
    <EmptyState
      iconType="messages"
      title="No messages yet"
      description="Start a conversation with someone from your network."
      actionLabel="Start a Chat"
      onAction={onStartChat}
      className={className}
    />
  );
}

export function EmptyEvents({ onExplore, className = '' }) {
  return (
    <EmptyState
      iconType="events"
      title="No upcoming events"
      description="There are no events scheduled at this time. Check back later or explore past events."
      actionLabel="Explore Events"
      onAction={onExplore}
      className={className}
    />
  );
}

export function EmptyGroups({ onExplore, onCreate, className = '' }) {
  return (
    <EmptyState
      iconType="groups"
      title="No groups found"
      description="Join a group to connect with alumni who share your interests."
      actionLabel="Explore Groups"
      onAction={onExplore}
      secondaryActionLabel="Create Group"
      onSecondaryAction={onCreate}
      className={className}
    />
  );
}

// ============================================
// ERROR STATE COMPONENT
// ============================================

/**
 * Error State - for when something goes wrong
 */
export function ErrorState({
  title = 'Something went wrong',
  description = 'We encountered an error while loading this content. Please try again.',
  error,
  onRetry,
  retryLabel = 'Try Again',
  onGoBack,
  goBackLabel = 'Go Back',
  className = '',
}) {
  return (
    <div className={`empty-state ${className}`} role="alert">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-500" aria-hidden="true" />
      </div>
      <h3 className="empty-state-title text-red-900">{title}</h3>
      <p className="empty-state-description text-red-700">{description}</p>
      
      {error && process.env.NODE_ENV === 'development' && (
        <details className="mt-2 text-xs text-gray-500 max-w-sm">
          <summary className="cursor-pointer hover:text-gray-700">Technical details</summary>
          <pre className="mt-2 p-2 bg-gray-100 rounded text-left overflow-auto">
            {error.message || String(error)}
          </pre>
        </details>
      )}
      
      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        {onRetry && (
          <Button variant="primary" onClick={onRetry} leftIcon={<RefreshCw className="w-4 h-4" />}>
            {retryLabel}
          </Button>
        )}
        {onGoBack && (
          <Button variant="outline" onClick={onGoBack}>
            {goBackLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================
// PARTIAL/FILTERED STATE COMPONENT
// ============================================

/**
 * Partial Results Banner - shows when filters are applied
 */
export function PartialResultsBanner({
  count,
  totalCount,
  filterDescription,
  onClearFilters,
  className = '',
}) {
  if (!filterDescription && count === totalCount) return null;

  return (
    <div 
      className={`flex items-center justify-between gap-4 p-3 bg-ocean-50 border border-ocean-200 rounded-lg text-sm ${className}`}
      role="status"
      aria-live="polite"
    >
      <p className="text-ocean-800">
        Showing <strong>{count}</strong>
        {totalCount && totalCount !== count && (
          <> of <strong>{totalCount}</strong></>
        )}
        {' '}results
        {filterDescription && (
          <span className="text-ocean-600"> • {filterDescription}</span>
        )}
      </p>
      
      {onClearFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="text-ocean-600 hover:text-ocean-800 font-medium hover:underline focus-ring rounded"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

// ============================================
// LOADING OVERLAY COMPONENT
// ============================================

/**
 * Loading Overlay - for showing loading state over existing content
 */
export function LoadingOverlay({ 
  message = 'Loading...', 
  className = '' 
}) {
  return (
    <div 
      className={`absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="spinner spinner-lg" />
        <p className="text-sm text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );
}

// ============================================
// LIST CONTAINER WITH STATES
// ============================================

/**
 * ListContainer - wrapper that handles all list states
 * 
 * @param {object} props
 * @param {boolean} props.loading - Show loading state
 * @param {boolean} props.error - Show error state
 * @param {Error} props.errorObject - Error object for details
 * @param {boolean} props.empty - Show empty state
 * @param {number} props.count - Number of items
 * @param {number} props.totalCount - Total items before filtering
 * @param {string} props.filterDescription - Description of active filters
 * @param {function} props.onRetry - Retry handler
 * @param {function} props.onClearFilters - Clear filters handler
 * @param {object} props.emptyStateProps - Props for EmptyState
 * @param {object} props.errorStateProps - Props for ErrorState
 * @param {number} props.skeletonCount - Number of skeleton items to show
 * @param {'card'|'row'} props.skeletonVariant - Skeleton variant
 * @param {React.ReactNode} props.children - Content to render when data is available
 */
export function ListContainer({
  loading = false,
  error = false,
  errorObject,
  empty = false,
  count = 0,
  totalCount,
  filterDescription,
  onRetry,
  onClearFilters,
  emptyStateProps = {},
  errorStateProps = {},
  skeletonCount = 3,
  skeletonVariant = 'card',
  className = '',
  children,
}) {
  // Loading state - use minimal spinner instead of skeletons
  if (loading) {
    return (
      <div className={className}>
        <LoadingSpinner message="Loading..." />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={className}>
        <ErrorState 
          error={errorObject} 
          onRetry={onRetry}
          {...errorStateProps}
        />
      </div>
    );
  }

  // Empty state
  if (empty || count === 0) {
    return (
      <div className={className}>
        <EmptyState {...emptyStateProps} />
      </div>
    );
  }

  // Content with optional partial results banner - smooth fade-in
  return (
    <div className={`${className} page-enter`}>
      {(filterDescription || (totalCount && totalCount !== count)) && (
        <PartialResultsBanner
          count={count}
          totalCount={totalCount}
          filterDescription={filterDescription}
          onClearFilters={onClearFilters}
          className="mb-4"
        />
      )}
      {children}
    </div>
  );
}

export default ListContainer;
