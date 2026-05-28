import React, { memo, useMemo } from 'react';
import DirectoryCardSplit from './DirectoryCardSplit';
import { useAvatars } from '../../hooks/useAvatar';

function DirectoryGrid({ items = [], meId, currentTab = 'all', onChanged, compact = false, loading = false }) {
  // Minimal loading state - no skeleton, just a centered spinner
  const LoadingState = () => (
    <div 
      className="flex items-center justify-center py-16" 
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="spinner spinner-lg" aria-hidden="true" />
        <p className="text-sm text-slate-500 font-medium">Loading profiles...</p>
        <span className="sr-only">Loading profiles...</span>
      </div>
    </div>
  );

  // Memoize ids array to prevent useAvatars from refetching on every render
  const ids = useMemo(
    () => Array.isArray(items) ? items.map((p) => p.id).filter(Boolean) : [],
    [items]
  );
  
  const { avatarUrls, loading: avatarsLoading } = useAvatars(ids, {
    useSignedUrls: true,
    autoFetch: ids.length > 0,
  });

  const isLoading = loading || avatarsLoading;

  if (isLoading) {
    return <LoadingState />;
  }

  if (!Array.isArray(items) || items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-12 sm:p-16 text-center shadow-sm">
        <div className="mx-auto max-w-md">
          {/* Icon */}
          <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-ocean-100 to-indigo-100 flex items-center justify-center mb-4 shadow-sm">
            <svg className="h-8 w-8 text-ocean-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          {/* Title */}
          <h3 className="text-lg font-bold text-slate-900 mb-2">No members found</h3>
          {/* Description */}
          <p className="text-sm text-slate-600 mb-4">
            Try adjusting your filters or search criteria to find more people in the AMET community.
          </p>
        </div>
      </div>
    );
  }

  // Responsive grid: 1 col mobile, 2 cols tablet, 3 cols desktop, 4 cols large screens
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 page-enter">
      {items.map((profile, index) => (
        <div 
          key={profile.id} 
          className={`card-enter stagger-${Math.min(index + 1, 8)}`}
          style={{ animationFillMode: 'forwards', opacity: 0 }}
        >
          <DirectoryCardSplit
            profile={profile}
            avatarUrl={avatarUrls[profile.id] || null}
            meId={meId}
            currentTab={currentTab}
            onChanged={onChanged}
          />
        </div>
      ))}
    </div>
  );
}

export default memo(DirectoryGrid);
