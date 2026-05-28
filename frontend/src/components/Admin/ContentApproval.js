import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import logger from '../../utils/logger';
import toast from 'react-hot-toast';
import { getFriendlyErrorMessage, toFriendlyToast } from '../../utils/errors';
import ContentDetailsModal from './ContentDetailsModal';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';
import { applyPendingFilters } from '../../utils/pendingFilters';
import {
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ChatBubbleLeftRightIcon,
  BriefcaseIcon,
  DocumentTextIcon,
  PhotoIcon,
  UserCircleIcon,
  UserGroupIcon,
  CalendarIcon,
  ClockIcon,
  FlagIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { deleteGroupRpc } from '../../api/groups';
import { DeleteConfirmationDialog } from '../shared/ConfirmationDialog';

/**
 * ContentApproval - Component for moderating and approving user-generated content
 * Handles posts, comments, events, and other content that needs admin review
 */
const ContentApproval = () => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { profile } = useAuth();
    // Separate state arrays for different content types
  const [pendingJobs, setPendingJobs] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [pendingGroups, setPendingGroups] = useState([]);
  const [pendingOtherContent, setPendingOtherContent] = useState([]);
  
  // Separate loading and error states
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState(null);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState(null);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState(null);
  const [otherContentLoading, setOtherContentLoading] = useState(true);
  const [otherContentError, setOtherContentError] = useState(null);
  
  // Combined loading and error states for UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Combined pending content for UI
  const [pendingContent, setPendingContent] = useState([]);
  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending'); // pending | approved | rejected | all
  const [viewMode, setViewMode] = useState('list');

  // RPC one-liners: pending counts and feed
  const [pendingCounts, setPendingCounts] = useState(null);
  const [feed, setFeed] = useState([]);
  // Rejection dialog state
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectItem, setRejectItem] = useState(null);

  // Delete confirmation dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Check if user is super_admin
  const isSuperAdmin = profile?.role === 'super_admin';

  const fetchPendingContent = useCallback(async () => {
    // Reset all states
    setJobsLoading(true);
    setEventsLoading(true);
    setGroupsLoading(true);
    setOtherContentLoading(true);
    setJobsError(null);
    setEventsError(null);
    setGroupsError(null);
    setOtherContentError(null);
    setLoading(true);
    setError(null);
    
    // Fetch jobs per status
    try {
      const jobsQuery = supabase
        .from('jobs')
        // Join profiles via jobs.user_id -> profiles.id so we can show the creator's name
        .select('*, profiles:user_id(first_name, last_name, avatar_url, email)');
      
      let jq = jobsQuery;
      if (statusFilter === 'pending') {
        jq = applyPendingFilters(jq);
      } else if (statusFilter === 'approved') {
        jq = jq.eq('is_approved', true);
      } else if (statusFilter === 'rejected') {
        jq = jq.eq('is_rejected', true);
      }
      const { data: jobs, error: fetchJobsError } = await jq.order('created_at', { ascending: false });
      
      if (fetchJobsError) {
        setJobsError(getFriendlyErrorMessage(fetchJobsError, 'Unable to load jobs'));
        logger.error('Error fetching jobs:', fetchJobsError);
      } else {
        const normalizedJobs = (jobs || []).map(item => ({ 
          ...item, 
          type: 'Job', 
          content_type: 'job', 
          creator: item.profiles 
        }));
        setPendingJobs(normalizedJobs);
      }
    } catch (err) {
      setJobsError(getFriendlyErrorMessage(err, 'Unable to load jobs'));
      logger.error('Error in jobs fetch:', err);
    } finally {
      setJobsLoading(false);
    }
    
    // Fetch events per status (uses approval_status enum)
    try {
      const eventsQuery = supabase
        .from('events')
        .select('*, profiles:user_id(first_name, last_name, avatar_url, email)');
      
      let eq = eventsQuery;
      if (statusFilter === 'pending') {
        eq = eq.eq('approval_status', 'pending');
      } else if (statusFilter === 'approved') {
        eq = eq.eq('approval_status', 'approved');
      } else if (statusFilter === 'rejected') {
        eq = eq.eq('approval_status', 'rejected');
      }
      const { data: events, error: fetchEventsError } = await eq.order('created_at', { ascending: false });
      
      if (fetchEventsError) {
        setEventsError(getFriendlyErrorMessage(fetchEventsError, 'Unable to load events'));
        logger.error('Error fetching events:', fetchEventsError);
      } else {
        const normalizedEvents = (events || []).map(item => ({ 
          ...item, 
          type: 'Event', 
          content_type: 'event', 
          creator: item.profiles 
        }));
        setPendingEvents(normalizedEvents);
      }
    } catch (err) {
      setEventsError(getFriendlyErrorMessage(err, 'Unable to load events'));
      logger.error('Error in events fetch:', err);
    } finally {
      setEventsLoading(false);
    }
    
    // Fetch groups per status
    try {
      const groupsQuery = supabase
        .from('groups')
        .select('*, profiles!groups_created_by_fkey(first_name, last_name, avatar_url, email)');
      
      let gq = groupsQuery;
      if (statusFilter === 'pending') {
        gq = applyPendingFilters(gq);
        // Also exclude archived groups from the pending review list
        gq = gq.eq('is_archived', false);
      } else if (statusFilter === 'approved') {
        gq = gq.eq('is_approved', true);
      } else if (statusFilter === 'rejected') {
        gq = gq.eq('is_rejected', true);
      }
      const { data: groups, error: fetchGroupsError } = await gq.order('created_at', { ascending: false });
      
      if (fetchGroupsError) {
        setGroupsError(getFriendlyErrorMessage(fetchGroupsError, 'Unable to load groups'));
        logger.error('Error fetching groups:', fetchGroupsError);
      } else {
        const normalizedGroups = (groups || []).map(item => ({ 
          ...item, 
          type: 'Group', 
          content_type: 'group', 
          creator: item.profiles 
        }));
        setPendingGroups(normalizedGroups);
      }
    } catch (err) {
      setGroupsError(getFriendlyErrorMessage(err, 'Unable to load groups'));
      logger.error('Error in groups fetch:', err);
    } finally {
      setGroupsLoading(false);
    }
    
    // Fetch other content (posts, comments, etc.)
    try {
      let oc = supabase
        .from('content_approvals')
        .select('*, profiles:creator_id(first_name, last_name, avatar_url, email)');
      if (statusFilter === 'pending') {
        oc = oc.eq('status', 'pending');
      } else if (statusFilter === 'approved') {
        oc = oc.eq('status', 'approved');
      } else if (statusFilter === 'rejected') {
        oc = oc.eq('status', 'rejected');
      }
      const { data: otherContent, error: fetchOtherContentError } = await oc.order('created_at', { ascending: false });
      
      if (fetchOtherContentError) {
        setOtherContentError(getFriendlyErrorMessage(fetchOtherContentError, 'Unable to load content'));
        logger.error('Error fetching other content:', fetchOtherContentError);
      } else {
        const normalizedOther = (otherContent || []).map(item => ({ 
          ...item, 
          type: item.content_type, 
          creator: item.profiles 
        }));
        setPendingOtherContent(normalizedOther);
      }
    } catch (err) {
      setOtherContentError(getFriendlyErrorMessage(err, 'Unable to load content'));
      logger.error('Error in other content fetch:', err);
    } finally {
      setOtherContentLoading(false);
    }
  }, [statusFilter]);

  // Fetch pending counts via RPC once
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: counts, error: cErr } = await supabase.rpc('admin_pending_counts');
      if (!mounted) return;
      if (!cErr) {
        setPendingCounts(counts || null);
        // Mark as used to avoid unused var lint during build (dev-only)
        if (counts) logger.info('admin_pending_counts');
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Fetch feed via RPC (can be refreshed)
  const fetchFeed = useCallback(async () => {
    const { data: feedData, error: fErr } = await supabase.rpc('admin_pending_feed');
    if (!fErr && Array.isArray(feedData)) {
      setFeed(feedData);
    }
  }, []);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);
  
  // Update combined state after all fetches complete
  useEffect(() => {
    const isStillLoading = jobsLoading || eventsLoading || groupsLoading || otherContentLoading;
    setLoading(isStillLoading);
    
    // Only combine data when everything is loaded
    if (!isStillLoading) {
      // Aggregate errors
      const errors = [];
      if (jobsError) errors.push(`Jobs: ${jobsError}`);
      if (eventsError) errors.push(`Events: ${eventsError}`);
      if (groupsError) errors.push(`Groups: ${groupsError}`);
      if (otherContentError) errors.push(`Other content: ${otherContentError}`);
      
      if (errors.length > 0) {
        setError(errors.join('; '));
        toast.error(`Failed to load some content: ${errors.join('; ')}`);
      }
      
      // Combine and sort all content
      const allContent = [...pendingJobs, ...pendingEvents, ...pendingGroups, ...pendingOtherContent];
      allContent.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setPendingContent(allContent);
    }
  }, [jobsLoading, eventsLoading, groupsLoading, otherContentLoading, 
      pendingJobs, pendingEvents, pendingGroups, pendingOtherContent,
      jobsError, eventsError, groupsError, otherContentError]);

  useEffect(() => {
    fetchPendingContent();
  }, [fetchPendingContent]);

  // Realtime: refresh only when relevant review-state changes
  useEffect(() => {
    const refreshDashboard = () => {
      fetchPendingContent();
      fetchFeed();
    };
    const reviewChannel = supabase
      .channel('review-stream')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'jobs', filter: 'is_approved=is.null' }, () => refreshDashboard())
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'jobs', filter: 'is_approved=eq.false' }, () => refreshDashboard())
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: 'approval_status=in.(pending)' }, () => refreshDashboard())
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'groups', filter: 'is_approved=eq.false' }, () => refreshDashboard())
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'content_approvals', filter: 'status=in.(pending)' }, () => refreshDashboard())
      .subscribe();

    return () => { try { supabase.removeChannel(reviewChannel); } catch (e) { logger.warn('removeChannel failed'); } };
  }, [fetchPendingContent, fetchFeed]);
  
  
  
  const handleApprove = async (item) => {
    const { id, content_type } = item;
    let tableName, updateData;

    switch (content_type) {
      case 'job':
        tableName = null;
        updateData = null;
        break;
      case 'event':
        tableName = 'events';
        updateData = { 
          approval_status: 'approved',
          rejection_reason: null,
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
        };
        break;
      case 'group':
        tableName = null; // using RPC instead
        updateData = null;
        break;
      default:
        tableName = 'content_approvals';
        updateData = { 
          status: 'approved', 
          reviewer_id: profile?.id, 
          reviewed_at: new Date().toISOString() 
        };
    }

    try {
      if (content_type === 'job') {
        // Use canonical RPC for job approval to satisfy DB security and triggers
        const { error: approveError } = await supabase.rpc('approve_job', {
          p_job_id: id,
          p_approved: true,
        });
        if (approveError) throw approveError;

        // Stamp moderation metadata and clear rejection flag
        const { error: metaError } = await supabase
          .from('jobs')
          .update({
            is_rejected: false,
            reviewed_by: profile?.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', id);
        if (metaError) throw metaError;
      } else if (content_type === 'group') {
        const { error } = await supabase.rpc('admin_review_group', { p_group_id: id, p_action: 'approve' });
        if (error) throw error;
      } else {
        const { error } = await supabase.from(tableName).update(updateData).eq('id', id);
        if (error) throw error;
      }
      
      toast.success(`${item.type} approved successfully.`);
      // Remove from the appropriate state array
      switch (content_type) {
        case 'job':
          setPendingJobs(current => current.filter(p => p.id !== id));
          break;
        case 'event':
          setPendingEvents(current => current.filter(p => p.id !== id));
          break;
        case 'group':
          setPendingGroups(current => current.filter(p => p.id !== id));
          break;
        default:
          setPendingOtherContent(current => current.filter(p => p.id !== id));
      }
      
      // Also remove from the combined UI array
      setPendingContent(current => current.filter(p => p.id !== id));
      // Refetch lists to stay fresh
      fetchPendingContent();
    } catch (err) {
      logger.error(`Error approving ${content_type}:`, err);
      toFriendlyToast(toast, err, `Failed to approve ${content_type}. Please try again.`);
    }
  };
  
    const handleViewDetails = (item) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleReject = (item) => {
    setRejectItem(item);
    setRejectReason('');
    setRejectOpen(true);
  };

  const handleRejectConfirm = async () => {
    const item = rejectItem;
    if (!item) return;
    const reason = String(rejectReason || '').trim();
    if (!reason) { toast.error('Please provide a rejection reason.'); return; }

    const { id, content_type } = item;
    let tableName, updateData;

    switch (content_type) {
      case 'job':
        tableName = 'jobs';
        updateData = {
          is_rejected: true,
          rejection_reason: reason,
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString()
        };
        break;
      case 'event':
        tableName = 'events';
        updateData = {
          approval_status: 'rejected',
          rejection_reason: reason,
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString()
        };
        break;
      case 'group':
        tableName = null; // using RPC instead
        updateData = null;
        break;
      default:
        tableName = 'content_approvals';
        updateData = {
          status: 'rejected',
          reviewer_id: profile?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason
        };
    }

    try {
      if (content_type === 'group') {
        const { error } = await supabase.rpc('admin_review_group', { p_group_id: id, p_action: 'reject' });
        if (error) throw error;
      } else {
        const { error } = await supabase.from(tableName).update(updateData).eq('id', id);
        if (error) throw error;
      }

      toast.success(`${item.type} rejected successfully.`);
      // Remove from the appropriate state array
      switch (content_type) {
        case 'job':
          setPendingJobs(current => current.filter(p => p.id !== id));
          break;
        case 'event':
          setPendingEvents(current => current.filter(p => p.id !== id));
          break;
        case 'group':
          setPendingGroups(current => current.filter(p => p.id !== id));
          break;
        default:
          setPendingOtherContent(current => current.filter(p => p.id !== id));
      }

      // Also remove from the combined UI array
      setPendingContent(current => current.filter(p => p.id !== id));
      setRejectOpen(false);
      setRejectItem(null);
      setRejectReason('');
      // Refetch lists to stay fresh
      fetchPendingContent();
    } catch (err) {
      logger.error(`Error rejecting ${content_type}:`, err);
      toFriendlyToast(toast, err, `Failed to reject ${content_type}. Please try again.`);
    }
  };

  // Handle delete (super_admin only)
  const handleDelete = (item) => {
    setDeleteItem(item);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    const item = deleteItem;
    if (!item) return;

    const { id, content_type } = item;
    setDeleteLoading(true);

    try {
      switch (content_type) {
        case 'job': {
          // Use admin_delete_job RPC
          const { error: jobError } = await supabase.rpc('admin_delete_job', { p_job_id: id });
          if (jobError) throw jobError;
          setPendingJobs(current => current.filter(p => p.id !== id));
          break;
        }

        case 'event': {
          // Use admin_delete_event RPC
          const { error: eventError } = await supabase.rpc('admin_delete_event', { p_event_id: id });
          if (eventError) throw eventError;
          setPendingEvents(current => current.filter(p => p.id !== id));
          break;
        }

        case 'group': {
          // Use delete_group_secure RPC
          await deleteGroupRpc(id);
          setPendingGroups(current => current.filter(p => p.id !== id));
          break;
        }

        default: {
          // For other content types, direct delete if allowed
          const { error: deleteError } = await supabase
            .from('content_approvals')
            .delete()
            .eq('id', id);
          if (deleteError) throw deleteError;
          setPendingOtherContent(current => current.filter(p => p.id !== id));
          break;
        }
      }

      toast.success(`${item.type} deleted permanently.`);
      setPendingContent(current => current.filter(p => p.id !== id));
      setDeleteOpen(false);
      setDeleteItem(null);
    } catch (err) {
      logger.error(`Error deleting ${content_type}:`, err);
      toFriendlyToast(toast, err, `Failed to delete ${content_type}. Please try again.`);
    } finally {
      setDeleteLoading(false);
    }
  };
  
  const getContentTypeIcon = (type) => {
    switch(type) {
      case 'post': return <DocumentTextIcon className="w-6 h-6 text-ocean-600" />;
      case 'comment': return <ChatBubbleLeftRightIcon className="w-6 h-6 text-green-500" />;
      case 'event': return <CalendarIcon className="w-6 h-6 text-red-500" />;
      case 'job': return <BriefcaseIcon className="w-6 h-6 text-indigo-500" />;
      case 'group': return <UserGroupIcon className="w-6 h-6 text-purple-500" />;
      case 'profile': return <UserCircleIcon className="w-5 h-5" />;
      case 'image': return <PhotoIcon className="w-5 h-5" />;
      default: return <DocumentTextIcon className="w-5 h-5" />;
    }
  };

  const getContentTypeBadge = (type) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (type) {
      case 'post': return 'bg-ocean-100 text-ocean-800';
      case 'comment': return 'bg-green-100 text-green-800';
      case 'event': return 'bg-red-100 text-red-800';
      case 'job': return 'bg-indigo-100 text-indigo-800';
      case 'group': return 'bg-purple-100 text-purple-800';
      case 'profile': return `${baseClasses} bg-indigo-100 text-indigo-800`;
      case 'image': return `${baseClasses} bg-pink-100 text-pink-800`;
      default: return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const filteredContent = pendingContent.filter(item => filter === 'all' || item.content_type === filter);

  // Compute effective moderation status per item across schemas
  const getModerationStatus = (item) => {
    if (!item) return 'pending';
    const ct = String(item.content_type || '').toLowerCase();
    if (ct === 'event') {
      return item.approval_status || 'pending';
    }
    if (ct === 'job' || ct === 'group') {
      return item.is_rejected ? 'rejected' : (item.is_approved ? 'approved' : 'pending');
    }
    // default types (post, comment, profile, image, etc.)
    return item.status || 'pending';
  };

  const renderGridItem = (item) => (
    <div key={item.id} className="bg-white rounded-lg shadow-md border border-gray-200 flex flex-col p-4 hover:shadow-lg transition-shadow duration-200">
      <div className="flex-grow">
        <div className="flex justify-between items-center mb-2">
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getContentTypeBadge(item.content_type)}`}>
            {item.type}
          </span>
          <span className="text-xs">
            {getModerationStatus(item)}
          </span>
          <span className="text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString()}</span>
        </div>
        <h4 className="text-md font-bold text-gray-800 truncate mb-1">{item.title || item.name || item.job_title || `${item.type} Submission`}</h4>
        <p className="text-sm text-gray-600 mb-2">
          by {item.creator?.first_name || 'Unknown User'}
        </p>
        <div className="text-sm text-gray-700 line-clamp-3">
          {item.description || item.content_summary || 'No description available.'}
        </div>
      </div>
      <div className="flex items-center justify-end space-x-2 mt-4 pt-4 border-t border-gray-200">
        <button 
          title="View Details" 
          onClick={() => handleViewDetails(item)} 
          className="text-gray-500 hover:text-indigo-600 p-2 rounded-full hover:bg-gray-100"
          aria-label={`View details for ${item.type} ${item.title || item.job_title || ''}`}
        >
          <EyeIcon className="h-6 w-6" />
        </button>
        <button 
          title="Approve" 
          onClick={() => handleApprove(item)} 
          disabled={getModerationStatus(item) === 'approved'}
          className={`p-2 rounded-full hover:bg-green-100 ${getModerationStatus(item) === 'approved' ? 'text-green-300 cursor-not-allowed' : 'text-green-600 hover:text-green-800'}`}
          aria-label={`Approve ${item.type} ${item.title || item.job_title || ''}`}
        >
          <CheckCircleIcon className="h-6 w-6" />
        </button>
        <button 
          title="Reject" 
          onClick={() => handleReject(item)} 
          disabled={getModerationStatus(item) === 'rejected'}
          className={`p-2 rounded-full hover:bg-red-100 ${getModerationStatus(item) === 'rejected' ? 'text-red-300 cursor-not-allowed' : 'text-red-600 hover:text-red-800'}`}
          aria-label={`Reject ${item.type} ${item.title || item.job_title || ''}`}
        >
          <XCircleIcon className="h-6 w-6" />
        </button>
        {/* Delete button - super_admin only */}
        {isSuperAdmin && ['job', 'event', 'group'].includes(item.content_type) && (
          <button 
            title="Delete permanently" 
            onClick={() => handleDelete(item)} 
            className="p-2 rounded-full text-red-700 hover:text-red-900 hover:bg-red-100"
            aria-label={`Delete ${item.type} ${item.title || item.job_title || ''} permanently`}
          >
            <TrashIcon className="h-6 w-6" />
          </button>
        )}
      </div>
    </div>
  );

  const renderListItem = (item) => (
    <li key={item.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors duration-150">
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-1 min-w-0">
          <div className="flex-shrink-0 flex items-center space-x-2">
            {getContentTypeIcon(item.content_type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-md font-semibold text-gray-900 truncate">
              {item.title || item.name || item.job_title || `${item.type} Submission`}
            </p>
            <p className="text-sm text-gray-500 truncate flex items-center">
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getContentTypeBadge(item.content_type)}`}>
                {item.type}
              </span>
              <span className="mx-2">•</span>
              <span>by {item.creator?.first_name || 'Unknown'}</span>
              <span className="mx-2">•</span>
              <span>{new Date(item.created_at).toLocaleDateString()}</span>
              <span className="mx-2">•</span>
              <span className="text-xs">{getModerationStatus(item)}</span>
            </p>
          </div>
        </div>
        <div className="ml-4 flex-shrink-0 flex items-center space-x-2">
          <button 
            title="View Details" 
            onClick={() => handleViewDetails(item)} 
            className="inline-flex items-center justify-center w-[44px] h-[44px] p-0 rounded-lg text-gray-500 hover:text-ocean-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
            aria-label={`View details for ${item.type} ${item.title || item.job_title || ''}`}
          >
            <EyeIcon className="h-6 w-6" />
          </button>
          <button 
            title="Approve" 
            onClick={() => handleApprove(item)} 
            disabled={getModerationStatus(item) === 'approved'}
            className={`inline-flex items-center justify-center w-[44px] h-[44px] p-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 ${getModerationStatus(item) === 'approved' ? 'text-green-300 cursor-not-allowed' : 'text-green-600 hover:text-green-800 hover:bg-green-100'}`}
            aria-label={`Approve ${item.type} ${item.title || item.job_title || ''}`}
          >
            <CheckCircleIcon className="h-6 w-6" />
          </button>
          <button 
            title="Reject" 
            onClick={() => handleReject(item)} 
            disabled={getModerationStatus(item) === 'rejected'}
            className={`inline-flex items-center justify-center w-[44px] h-[44px] p-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 ${getModerationStatus(item) === 'rejected' ? 'text-red-300 cursor-not-allowed' : 'text-red-600 hover:text-red-800 hover:bg-red-100'}`}
            aria-label={`Reject ${item.type} ${item.title || item.job_title || ''}`}
          >
            <XCircleIcon className="h-6 w-6" />
          </button>
          {/* Delete button - super_admin only */}
          {isSuperAdmin && ['job', 'event', 'group'].includes(item.content_type) && (
            <button 
              title="Delete permanently" 
              onClick={() => handleDelete(item)} 
              className="inline-flex items-center justify-center w-[44px] h-[44px] p-0 rounded-lg text-red-700 hover:text-red-900 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              aria-label={`Delete ${item.type} ${item.title || item.job_title || ''} permanently`}
            >
              <TrashIcon className="h-6 w-6" />
            </button>
          )}
        </div>
      </div>
    </li>
  );

  const contentFilters = [
    { value: 'all', label: 'All Content' },
    { value: 'job', label: 'Jobs' },
    { value: 'event', label: 'Events' },
    { value: 'group', label: 'Groups' }
  ];

  return (
    <div className="space-y-6">
      {/* Header and filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Content Moderation</h2>
          <p className="text-sm text-gray-500">
            Review and manage all user-submitted content in one place.
          </p>
          {/* Quick links to dedicated admin pages */}
          {isSuperAdmin && (
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                to="/admin/groups"
                className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
              >
                <UserGroupIcon className="h-3.5 w-3.5 mr-1" />
                Groups Admin
              </Link>
              <Link
                to="/jobs/admin"
                className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
              >
                <BriefcaseIcon className="h-3.5 w-3.5 mr-1" />
                Jobs Admin
              </Link>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 w-full md:w-auto">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full sm:w-auto block rounded-md border-gray-300 shadow-sm focus:border-ocean-500 focus:ring-ocean-500 sm:text-sm"
            aria-label="Filter content type"
            aria-controls="content-list"
          >
            {contentFilters.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto block rounded-md border-gray-300 shadow-sm focus:border-ocean-500 focus:ring-ocean-500 sm:text-sm"
            aria-label="Filter by moderation status"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>

          <div className="flex w-full sm:w-auto rounded-md shadow-sm" role="group" aria-label="View mode selection">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`relative inline-flex items-center px-3 py-2 rounded-l-md border ${
                viewMode === 'list'
                  ? 'bg-ocean-600 text-white border-ocean-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2`}
              aria-pressed={viewMode === 'list'}
              aria-label="List view"
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`relative inline-flex items-center px-3 py-2 rounded-r-md border ${
                viewMode === 'grid'
                  ? 'bg-ocean-600 text-white border-ocean-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2`}
              aria-pressed={viewMode === 'grid'}
              aria-label="Grid view"
            >
              Grid
            </button>
          </div>

          <button
            onClick={fetchPendingContent}
            className="inline-flex items-center justify-center min-h-[44px] px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ocean-500 w-full sm:w-auto"
            aria-label="Refresh content list"
          >
            <ArrowPathIcon className="w-4 h-4 mr-1" />
            Refresh
          </button>
        </div>
      </div>
      
      {/* Content display */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-ocean-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
                            <ExclamationTriangleIcon className="h-6 w-6 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
                            <h3 className="text-lg font-semibold text-red-800">Failed to Load Content</h3>
                            <div className="mt-2 text-md text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      ) : !loading && filteredContent.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
          <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Queue Clear!</h3>
          <p className="mt-1 text-sm text-gray-500">There is no content awaiting moderation.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
          role="grid" 
          aria-label="Content awaiting approval in grid view"
          id="content-list"
        >
          {filteredContent.map(renderGridItem)}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul 
            className="divide-y divide-gray-200"
            role="list" 
            aria-label="Content awaiting approval"
            id="content-list"
          >
            {filteredContent.map(renderListItem)}
          </ul>
        </div>
      )}
    
      <ContentDetailsModal 
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Rejection Reason Dialog */}
      {rejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black/40" onClick={() => setRejectOpen(false)} aria-hidden="true" />
          <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900">Reject {rejectItem?.type}</h3>
            <p className="mt-2 text-sm text-gray-600">Please provide a reason for rejecting this {rejectItem?.content_type}.</p>
            <textarea
              className="mt-4 w-full rounded-md border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-ocean-500"
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason"
              aria-label="Rejection reason"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectOpen(false)}
                className="inline-flex items-center justify-center min-h-[40px] px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                className="inline-flex items-center justify-center min-h-[40px] px-4 rounded-md bg-red-600 text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog - Super Admin Only - Uses portal for proper centering */}
      <DeleteConfirmationDialog
        isOpen={deleteOpen && !!deleteItem}
        onClose={() => !deleteLoading && setDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemType={deleteItem?.type || 'Item'}
        itemName={deleteItem?.title || deleteItem?.name || deleteItem?.job_title || `${deleteItem?.type || 'Item'} Submission`}
        loading={deleteLoading}
      />
    </div>
  );
};

export default ContentApproval;
