import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { fetchGroupsPagedRpc, joinGroupRpc, leaveGroupRpc } from '../../api/groups';
import { fetchMembershipMap } from '../../utils/memberships';
import { useAuth } from '../../contexts/AuthContext';
import { useApproval } from '../../hooks/useApproval';
import { canCreateGroup, canJoinGroup, getGroupStatus, isEmployer } from '../../utils/acl';
import { Users, Search, Calendar, AlertCircle, RefreshCw, Lock, CheckCircle, GraduationCap } from 'lucide-react';
import ImageWithFallback from '../common/ImageWithFallback';
import { getFriendlyErrorMessage } from '../../utils/errors';
import logger from '../../utils/logger';
import { logActivity } from '../../utils/activityLogger';

// Minimal loading spinner for smooth transitions
const GroupsLoadingSpinner = () => (
  <div className="flex items-center justify-center py-16" role="status" aria-live="polite">
    <div className="flex flex-col items-center gap-3">
      <div className="spinner spinner-lg" aria-hidden="true" />
      <p className="text-sm text-gray-500 font-medium">Loading groups...</p>
      <span className="sr-only">Loading groups...</span>
    </div>
  </div>
);

// Group card component
const GroupCard = ({ group, isMember, isGroupAdmin, hasPendingRequest, onJoinLeave, currentUserId, canManageAllGroups, userRole, isUserApproved, isBlocked }) => {
  const [imgSrc, setImgSrc] = useState('');
  const isCreator = group.created_by === currentUserId;
  const formattedDate = new Date(group.created_at).toLocaleDateString();
  const showModeration = isCreator || canManageAllGroups;
  
  // Use centralized status helper
  const groupStatus = getGroupStatus(group);
  const isApproved = groupStatus.isApproved;
  const isPrivate = group.is_private === true;
  const isSiteAdmin = !!canManageAllGroups;
  
  // Alumni-only: check DB column first, fall back to tag
  const isAlumniOnlyGroup = group.alumni_only === true || 
    (Array.isArray(group.tags) && group.tags.some((tag) => String(tag).toLowerCase() === 'alumni-only'));
  
  // Use centralized join check
  const joinCheck = canJoinGroup(group, userRole, isMember);
  const showManage = (isGroupAdmin || isSiteAdmin) && !group.is_archived;
  const employer = isEmployer(userRole);
  
  // Determine membership state for CTA using centralized logic
  let membershipState = 'none'; // none | joined | pending | manage
  let ctaLabel = '';
  let ctaClass = '';
  let ctaDisabled = false;
  
  // P1: Increased text size from text-xs to text-sm for better accessibility
  if (isMember) {
    if (showManage) {
      membershipState = 'manage';
      ctaLabel = 'Manage';
      ctaClass = 'text-sm px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1';
    } else {
      membershipState = 'joined';
      ctaLabel = 'Joined';
      ctaClass = 'text-sm px-3 py-1.5 rounded-md bg-green-50 text-green-700 border border-green-200';
    }
  } else if (isBlocked) {
    membershipState = 'blocked';
    ctaLabel = 'Account restricted';
    ctaDisabled = true;
    ctaClass = 'text-sm px-3 py-1.5 rounded-md bg-gray-200 text-gray-600 cursor-not-allowed';
  } else if (!isUserApproved) {
    membershipState = 'unapproved';
    ctaLabel = 'Approval required';
    ctaDisabled = true;
    ctaClass = 'text-sm px-3 py-1.5 rounded-md bg-gray-200 text-gray-600 cursor-not-allowed';
  } else if (hasPendingRequest) {
    membershipState = 'pending_request';
    ctaLabel = 'Request pending';
    ctaDisabled = true;
    ctaClass = 'text-sm px-3 py-1.5 rounded-md bg-yellow-100 text-yellow-700 border border-yellow-300 cursor-not-allowed';
  } else if (!joinCheck.allowed) {
    // Use centralized join check reason
    membershipState = 'blocked';
    ctaLabel = joinCheck.reason || 'Cannot join';
    ctaDisabled = true;
    ctaClass = 'text-sm px-3 py-1.5 rounded-md bg-gray-200 text-gray-600 cursor-not-allowed';
  } else if (isPrivate) {
    // Private groups require request/invite
    membershipState = 'request';
    ctaLabel = 'Request to Join';
    ctaClass = 'text-sm px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1';
  } else {
    membershipState = 'join';
    ctaLabel = 'Join';
    ctaClass = 'text-sm px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1';
  }
  
  // Build avatar image src: prefer stored public URL; otherwise fetch a signed URL
  useEffect(() => {
    const build = async () => {
      if (group?.group_avatar_url) {
        const cb = group.updated_at ? `?t=${new Date(group.updated_at).getTime()}` : '';
        setImgSrc(`${group.group_avatar_url}${cb}`);
        return;
      }
      // No stored URL; skip signed URL attempts to avoid noisy 400s for missing/private objects
      setImgSrc('');
    };
    build();
  }, [group?.group_avatar_url, group?.updated_at, group?.id]);

  return (
    <article className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden transform transition-transform hover:-translate-y-1 hover:shadow-xl focus-within:ring-2 focus-within:ring-blue-500" aria-label={`Group: ${group.name}`}>
      <Link to={`/groups/${group.id}`}>
        <div className="w-full h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
          <ImageWithFallback
            src={imgSrc}
            alt={group.name}
            className="w-full h-full"
            placeholderSrc="/default-avatar.svg"
            emptyMessage="Group image to be uploaded"
          />
        </div>
      </Link>
      <div className="p-4">
        <h2 className="text-xl font-bold text-gray-800 mb-2 truncate">
          <Link to={`/groups/${group.id}`} className="hover:text-blue-600 transition-colors">
            {group.name}
          </Link>
        </h2>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2 h-10">
          {group.description || 'No description provided.'}
        </p>
        
        {/* Tags */}
        {group.tags && group.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {group.tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index} 
                className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
            {group.tags.length > 3 && (
              <span className="text-xs text-gray-500">+{group.tags.length - 3} more</span>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-3">
          <div className="flex items-center">
            <Users className="w-3 h-3 mr-1" />
            <span>Members</span>
          </div>
          <div className="flex flex-wrap items-center gap-1 justify-end">
            {/* Primary status chips */}
            <span className={`px-2 py-1 rounded-full flex items-center gap-1 ${isPrivate ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {isPrivate && <Lock className="w-3 h-3" />}
              {isPrivate ? 'Private' : 'Public'}
            </span>
            {group.is_admin_only_posts && (
              <span className="px-2 py-1 rounded-full bg-purple-50 text-purple-700" title="Only admins can post">Admin Posts</span>
            )}
            {group.is_archived && (
              <span className="px-2 py-1 rounded-full bg-red-100 text-red-700">Archived</span>
            )}
            {isAlumniOnlyGroup && (
              <span className="px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 flex items-center gap-1" title="Alumni-only group">
                <GraduationCap className="w-3 h-3" />Alumni only
              </span>
            )}
            {isMember && !showManage && (
              <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />Joined
              </span>
            )}
            {showModeration && !groupStatus.isActive && (
              <span 
                className={`px-2 py-1 rounded-full ${
                  groupStatus.statusColor === 'green' ? 'bg-green-100 text-green-700' :
                  groupStatus.statusColor === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                  groupStatus.statusColor === 'red' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}
                title={group.rejection_reason || ''}
              >
                {groupStatus.statusLabel}
              </span>
            )}
          </div>
        </div>
        
        <div className="mt-3 flex justify-between items-center">
          <span className="text-xs text-gray-500 flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            {formattedDate}
          </span>
          
          {/* Single unified CTA */}
          {membershipState === 'manage' ? (
            <Link 
              to={`/groups/${group.id}/manage`}
              className={ctaClass}
              aria-label={`Manage ${group.name}`}
            >
              {ctaLabel}
            </Link>
          ) : (membershipState === 'join' || membershipState === 'request') ? (
            <button
              onClick={() => onJoinLeave(group.id, false, isPrivate)}
              className={ctaClass}
              aria-label={`${ctaLabel} ${group.name}`}
              disabled={isBlocked}
            >
              {ctaLabel}
            </button>
          ) : (
            <button
              disabled={ctaDisabled}
              className={ctaClass}
              aria-label={ctaLabel}
              title={joinCheck.reason || ''}
            >
              {ctaLabel}
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

const GroupsList = () => {
  const { user, isAdmin, hasPermission, profile, userRole, isBlocked } = useAuth();
  const { isApproved: isUserApproved } = useApproval();
  // P2: Store raw fetched groups separately so errors don't clear existing data
  const [allFetchedGroups, setAllFetchedGroups] = useState([]);
  const [userMemberships, setUserMemberships] = useState([]);
  const [membershipMap, setMembershipMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // P0: Separate transient feedback messages from blocking errors
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'joined', 'created' (used primarily by My Groups CTA)
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const itemsPerPage = 12;
  const [myGroups, setMyGroups] = useState([]);
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc' alphabetical
  // Check if user can manage all groups (admin privilege)
  const canManageAllGroups = isAdmin || hasPermission('manage:all_groups');
  
  // P0: Ref for aria-live announcements
  const liveRegionRef = useRef(null);
  const isMountedRef = useRef(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // P0: Client-side filtering on allFetchedGroups using search, membership filter, and alphabetical sort
  const userMembershipSet = useMemo(() => new Set(userMemberships || []), [userMemberships]);

  const filteredGroups = useMemo(() => {
    let result = [...allFetchedGroups];
    
    // Apply membership filter (joined/created)
    if (user && filter !== 'all') {
      if (filter === 'joined') {
        result = result.filter(group => group.is_member === true || userMembershipSet.has(group.id));
      } else if (filter === 'created') {
        result = result.filter(group => group.created_by === user.id);
      }
    }
    
    // P0 FIX: Apply search query filter on name and description
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(group => {
        const name = (group.name || '').toLowerCase();
        const description = (group.description || '').toLowerCase();
        return name.includes(query) || description.includes(query);
      });
    }
    
    // Sort alphabetically by group name (A–Z or Z–A)
    result = [...result].sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      if (nameA === nameB) return 0;
      return sortDirection === 'asc'
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    });
    
    return result;
  }, [allFetchedGroups, user, filter, searchQuery, sortDirection, userMembershipSet]);
  
  // Derive groups from filteredGroups for backward compatibility
  const groups = filteredGroups;
  
  // P1 FIX: Remove searchQuery from useEffect deps - filtering is now client-side via useMemo
  // This prevents re-fetch + skeleton jitter on every keystroke
  useEffect(() => {
    const getGroups = async () => {
      // Employers should not see or fetch groups; keep loading false and list empty
      if (userRole === 'employer') {
        if (!isMountedRef.current) return;
        setAllFetchedGroups([]);
        setLoading(false);
        setError(null);
        return;
      }

      if (!isMountedRef.current) return;
      setLoading(true);
      // P2: Don't clear error immediately - only clear on success
      try {
        // Fetch first page of groups via secure RPC (handles role-aware filtering)
        let data;
        try {
          data = await fetchGroupsPagedRpc({ limit: itemsPerPage, offset: 0 });
        } catch (rpcErr) {
          logger.warn('fetchGroupsPagedRpc failed, will fall back to direct query:', rpcErr);
          data = null;
        }

        // TEMPORARY LEGACY FALLBACK:
        // If RPC returns no groups (e.g., older data with pending approval_status),
        // fall back to a direct groups table query so existing groups remain visible.
        if (!data || data.length === 0) {
          const { data: legacy, error: legacyError } = await supabase
            .from('groups')
            .select('id,name,description,is_private,is_admin_only_posts,is_archived,is_approved,approval_status,created_by,group_avatar_url,tags,created_at,alumni_only')
            .order('created_at', { ascending: false })
            .range(0, itemsPerPage - 1);
          if (legacyError) {
            throw legacyError;
          }
          data = legacy || [];
        }

        // P0/P1: Store raw data; filtering is done via useMemo
        if (!isMountedRef.current) return;
        setAllFetchedGroups(data || []);
        setHasMore((data || []).length >= itemsPerPage);
        setError(null); // Clear error only on success
        
        // Extract "My Groups" for top strip from raw data
        if (user && data && data.length > 0) {
          const mine = data.filter(g => g.is_member === true).slice(0, 3);
          if (isMountedRef.current) {
            setMyGroups(mine);
          }
        } else if (isMountedRef.current) {
          setMyGroups([]);
        }
        
        // If user is logged in, identify their group memberships via is_member flag
        if (user) {
          const memberships = (data || [])
            .filter(group => group.is_member === true)
            .map(group => group.id);
          if (isMountedRef.current) {
            setUserMemberships(memberships);
          }
          // Build membership map for the first page of visible groups to drive accurate CTAs
          const ids = (data || []).map(g => g.id);
          try {
            const mm = await fetchMembershipMap(supabase, ids);
            if (isMountedRef.current) {
              setMembershipMap(mm);
            }
          } catch (mmErr) {
            logger.warn('Failed to load membership map:', mmErr);
            if (isMountedRef.current) {
              setMembershipMap({});
            }
          }
        }
      } catch (err) {
        const msg = String(err?.message || '');
        // P2: Only set error if we have no existing data to show
        const errorMsg = /JSON object requested, multiple \(or no\) rows returned/i.test(msg)
          ? 'Some groups may be hidden right now due to policy changes. Please try again later.'
          : 'Failed to load groups. Please try again.';
        
        if (allFetchedGroups.length === 0) {
          if (isMountedRef.current) {
            setError(errorMsg);
          }
        } else if (isMountedRef.current) {
          // P2: Show inline feedback instead of blocking error when we have existing data
          setFeedbackMessage({ type: 'error', text: errorMsg });
          setTimeout(() => setFeedbackMessage(null), 5000);
        }
        logger.error("Error fetching groups:", err);
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    getGroups();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userRole, canManageAllGroups]); // P1: Removed searchQuery, selectedTags, filter, privacyFilter, page from deps

  const handleJoinLeave = async (groupId, isMember, isPrivate) => {
    if (!user) {
      // Redirect to login if not authenticated
      window.location.href = '/login?redirect=/groups';
      return;
    }

    if (isBlocked) {
      // UX-only guard; backend RLS already enforces
      try { (await import('react-hot-toast')).default.error('Your account is restricted and cannot perform this action'); } catch (e) { void e; }
      return;
    }

    try {
      if (isMember) {
        // Leave group via secure RPC (DB enforces last-admin guard)
        await leaveGroupRpc(groupId);
        
        if (isMountedRef.current) {
          setUserMemberships(prev => prev.filter(id => id !== groupId));
          setMembershipMap(prev => {
            const next = { ...prev };
            if (next[groupId]) {
              next[groupId] = { ...next[groupId], isMember: false };
            }
            return next;
          });
        }
        // P0: Announce success to screen readers
        if (isMountedRef.current) {
          setFeedbackMessage({ type: 'success', text: 'You have left the group.' });
          setTimeout(() => setFeedbackMessage(null), 3000);
        }
        logger.log(`User left group ${groupId}`);
        logActivity({ action: 'group_left', meta: { group_id: groupId } });
      } else {
        // Join via hardened join_group_v2 RPC; returns 'active' | 'pending'
        const status = await joinGroupRpc(groupId);

        if (status === 'active') {
          if (isMountedRef.current) {
            setUserMemberships(prev => [...prev, groupId]);
            setMembershipMap(prev => {
              const next = { ...prev };
              const current = next[groupId] || {};
              next[groupId] = { ...current, isMember: true };
              return next;
            });
            // P0: Announce success to screen readers
            setFeedbackMessage({ type: 'success', text: 'You have joined the group!' });
            setTimeout(() => setFeedbackMessage(null), 3000);
          }
          logger.log(`User joined group ${groupId}`);
          logActivity({ action: 'group_joined', meta: { group_id: groupId, status: 'active' } });
        } else {
          // Private groups or cases where membership is pending approval
          // P0: Use feedbackMessage instead of error for non-blocking feedback
          if (isMountedRef.current) {
            setFeedbackMessage({ type: 'info', text: 'Join request sent to group admins. You will be notified when approved.' });
          }
          // Update membership map to show pending state
          if (isMountedRef.current) {
            setMembershipMap(prev => {
              const next = { ...prev };
              const current = next[groupId] || {};
              next[groupId] = { ...current, isPending: true };
              return next;
            });
            setTimeout(() => setFeedbackMessage(null), 4000);
          }
          logActivity({ action: 'group_join_request', meta: { group_id: groupId, status: 'pending' } });
        }
      }
    } catch (err) {
      logger.error("Error joining/leaving group:", err);
      // P0: Use feedbackMessage for non-blocking error feedback
      if (isMountedRef.current) {
        setFeedbackMessage({ type: 'error', text: getFriendlyErrorMessage(err, 'An error occurred while trying to join/leave the group.') });
        setTimeout(() => setFeedbackMessage(null), 4000);
      }
    }
  };

  if (userRole === 'employer') {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">
            This feature is only available for alumni, students, or administrators.
          </p>
        </div>
      </div>
    );
  }

  // P2: Only show full-page blocking error if we have NO data at all
  if (error && allFetchedGroups.length === 0) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-lg" role="alert" aria-live="assertive">
          <div className="flex items-start">
            <AlertCircle className="w-6 h-6 text-red-600 mr-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to load groups</h3>
              <p className="text-sm text-red-700 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayedGroups = groups;
  const canLoadMore = hasMore;

  const loadMoreGroups = async () => {
    if (!canLoadMore || isLoadingMore || loading) return;
    setIsLoadingMore(true);
    try {
      const offset = allFetchedGroups.length;
      let data;
      try {
        data = await fetchGroupsPagedRpc({ limit: itemsPerPage, offset });
      } catch (rpcErr) {
        logger.warn('fetchGroupsPagedRpc (load more) failed, will fall back to direct query:', rpcErr);
        data = null;
      }

      if (!data || data.length === 0) {
        if (isMountedRef.current) {
          setHasMore(false);
        }
        return;
      }

      let combined = [];
      if (isMountedRef.current) {
        setAllFetchedGroups(prev => {
          combined = [...(prev || []), ...data];
          return combined;
        });
      }

      if (user && isMountedRef.current) {
        const memberships = (combined || [])
          .filter(group => group.is_member === true)
          .map(group => group.id);
        setUserMemberships(memberships);

        const ids = (data || []).map(g => g.id);
        if (ids.length > 0) {
          try {
            const mm = await fetchMembershipMap(supabase, ids);
            if (isMountedRef.current) {
              setMembershipMap(prev => ({ ...(prev || {}), ...(mm || {}) }));
            }
          } catch (mmErr) {
            logger.warn('Failed to load membership map for additional groups:', mmErr);
          }
        }

        const mine = (combined || []).filter(g => g.is_member === true).slice(0, 3);
        setMyGroups(mine);
      }

      if (isMountedRef.current) {
        setHasMore((data || []).length >= itemsPerPage);
      }
    } catch (err) {
      const msg = String(err?.message || '');
      const errorMsg = /JSON object requested, multiple \(or no\) rows returned/i.test(msg)
        ? 'Some additional groups may be hidden right now due to policy changes. Please try again later.'
        : 'Failed to load more groups. Please try again.';

      if (isMountedRef.current) {
        setFeedbackMessage({ type: 'error', text: errorMsg });
        setTimeout(() => setFeedbackMessage(null), 5000);
      }
      logger.error('Error loading more groups:', err);
    } finally {
      if (isMountedRef.current) {
        setIsLoadingMore(false);
      }
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* P0: Aria-live region for screen reader announcements */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {feedbackMessage?.text}
      </div>
      
      {/* P0/P2: Inline feedback banner (non-blocking) */}
      {feedbackMessage && (
        <div
          role="status"
          className={`mb-4 p-4 rounded-lg flex items-center gap-3 ${
            feedbackMessage.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
            feedbackMessage.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
            'bg-blue-50 border border-blue-200 text-blue-800'
          }`}
        >
          {feedbackMessage.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />}
          {feedbackMessage.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />}
          <span className="text-sm font-medium">{feedbackMessage.text}</span>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="ml-auto text-current opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current rounded p-1"
            aria-label="Dismiss message"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-4 md:mb-0">Networking Groups/Chapters</h1>
        {user && canCreateGroup(userRole) && !isBlocked && (
          <Link
            to="/groups/new"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Create Group/Chapter
          </Link>
        )}
      </div>

      {/* My Groups Strip */}
      {user && myGroups.length > 0 && filter === 'all' && (
        <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6" aria-labelledby="my-groups-heading">
          <h2 id="my-groups-heading" className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-600" />
            My Groups/Chapters
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {myGroups.map(g => {
              const mm = membershipMap[g.id] || { isMember: true, isAdmin: false };
              return (
                <Link
                  key={g.id}
                  to={`/groups/${g.id}`}
                  className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-md transition-shadow flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={`View ${g.name} group${mm.isAdmin ? ', you are an admin' : ''}`}
                >
                  <div className="w-12 h-12 rounded-md bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {g.group_avatar_url ? (
                      // P1: Decorative image - name is in link label; use empty alt
                      <img src={g.group_avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-6 h-6 text-gray-400" aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{g.name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                      {g.is_private ? 'Private' : 'Public'}
                      {mm.isAdmin && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Admin</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="mt-3 text-right">
            <button
              onClick={() => setFilter('joined')}
              className="text-sm text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
            >
              View all my groups →
            </button>
          </div>
        </section>
      )}

      {/* Search and sort */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex-1 w-full">
            <div className="relative">
              <input
                type="text"
                placeholder="Search groups/chapters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Search groups/chapters"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Sort:</span>
            <div className="inline-flex rounded-full bg-gray-50 p-0.5" role="group" aria-label="Sort groups alphabetically">
              <button
                type="button"
                onClick={() => setSortDirection('asc')}
                aria-pressed={sortDirection === 'asc'}
                className={`text-xs md:text-sm px-3 py-1.5 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                  sortDirection === 'asc'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                }`}
              >
                A → Z
              </button>
              <button
                type="button"
                onClick={() => setSortDirection('desc')}
                aria-pressed={sortDirection === 'desc'}
                className={`text-xs md:text-sm px-3 py-1.5 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ml-1 ${
                  sortDirection === 'desc'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Z → A
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active filters summary for screen readers */}
      {(searchQuery || sortDirection === 'desc') && (
        <div className="sr-only" aria-live="polite">
          Showing {groups.length} groups/chapters
          {searchQuery && ` matching "${searchQuery}"`}
          {sortDirection === 'desc' && ' sorted Z to A'}
        </div>
      )}
      
      {/* Groups grid */}
      {loading ? (
        <GroupsLoadingSpinner />
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 page-enter" role="list" aria-label="Groups/Chapters list">
        {displayedGroups.length > 0 ? (
          displayedGroups.map(group => {
            const mm = membershipMap[group.id] || { isMember: group.is_member === true || userMembershipSet.has(group.id), isAdmin: false, isPending: false };
            return (
              <GroupCard 
                key={group.id} 
                group={group} 
                isMember={!!mm.isMember}
                isGroupAdmin={!!mm.isAdmin}
                hasPendingRequest={!!mm.isPending}
                onJoinLeave={handleJoinLeave}
                currentUserId={user?.id}
                canManageAllGroups={canManageAllGroups}
                userRole={userRole}
                isUserApproved={isUserApproved}
              />
            );
          })
        ) : (
          <div className="col-span-full text-center py-16 bg-gray-50 rounded-lg">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No groups/chapters found</h2>
            <p className="text-gray-500 mb-4">
              {searchQuery
                ? 'No groups/chapters match your search.'
                : user
                  ? 'Be the first to create a group/chapter!'
                  : 'Sign in to discover and join groups/chapters.'}
            </p>
            {filter !== 'all' && !searchQuery && (
              <button
                onClick={() => setFilter('all')}
                className="inline-flex items-center gap-2 px-4 py-2 mr-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Show all groups
              </button>
            )}
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilter('all');
                  setSortDirection('asc');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <RefreshCw className="w-4 h-4" />
                Clear search
              </button>
            )}
            {user && canCreateGroup(userRole) && !searchQuery && (
              <Link
                to="/groups/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Create your first group
              </Link>
            )}
          </div>
        )}
      </div>
      )}

      {/* Load More */}
      {!loading && canLoadMore && (
        <div className="mt-8 text-center">
          <button
            onClick={loadMoreGroups}
            disabled={isLoadingMore}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingMore ? 'Loading more…' : 'Load more groups'}
          </button>
          <p className="text-sm text-gray-500 mt-2">
            Showing {displayedGroups.length} groups
          </p>
        </div>
      )}
    </div>
  );
};

export default GroupsList;
