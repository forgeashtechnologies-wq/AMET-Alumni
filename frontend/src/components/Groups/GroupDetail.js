import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import logger from '../../utils/logger';
import { 
  fetchGroupDetails, 
  fetchGroupPosts, 
  createGroupPost,
  deleteGroupPost,
  removeGroupMember,
  updateGroupDetails,
  uploadGroupAvatar,
  uploadPostImage,
  updateGroupPost,
  reportGroupPost,
  setMemberRole,
  fetchGroupMembers,
  acceptGroupInvitation,
  rejectGroupInvitation,
} from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useApproval } from '../../hooks/useApproval';
import { 
  Users, 
  MessageSquare, 
  Info, 
  ArrowLeft, 
  Image as ImageIcon, 
  X, 
  Edit, 
  Trash2, 
  UserMinus, 
  Camera, 
  Shield,
  Search,
  Filter,
  AlertTriangle,
  Send,
  Loader2,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  GraduationCap
} from 'lucide-react';
import ShareButtons from '../common/ShareButtons';
import ImageWithFallback from '../common/ImageWithFallback';
import { format } from 'date-fns';
import CommentsThread from './CommentsThread';
import { joinGroupRpc, withdrawJoinRequest, leaveGroupRpc, deleteGroupRpc, updateGroupAvatarRpc } from '../../api/groups';
import { ROLE_LABELS } from '../../utils/roles';
import { canPostToGroup, canJoinGroup, getGroupStatus, isEmployer, canViewGroupContent } from '../../utils/acl';
import { getFriendlyErrorMessage } from '../../utils/errors';
import { isMember as checkMemberPresence } from '../../utils/membershipPresence';

// Removed local roleLabel; use ROLE_LABELS for consistency

// Local helper to avoid importing from ignored lib/membership in Vercel builds
async function getMyMembership(supabaseClient, groupId) {
  const { data: authData, error: authErr } = await supabaseClient.auth.getUser();
  if (authErr || !authData?.user) return null;
  const userId = authData.user.id;
  const { data, error } = await supabaseClient
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

const GroupDetail = () => {
  const { id } = useParams();
  const { user, profile, userRole } = useAuth();
  const { isApproved: isUserApproved } = useApproval();
  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [members, setMembers] = useState([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newPostContent, setNewPostContent] = useState('');
  const [activeTab, setActiveTab] = useState('posts');
  const [avatarSrc, setAvatarSrc] = useState('');
  
  // New state variables for enhanced features
  const [postImage, setPostImage] = useState(null);
  const [postImagePreview, setPostImagePreview] = useState(null);
  const [uploadingPost, setUploadingPost] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [joinPending, setJoinPending] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [postToDelete, setPostToDelete] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  // Modals: edit and report
  const [postToEdit, setPostToEdit] = useState(null);
  const [editText, setEditText] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [reportPostId, setReportPostId] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  // Paging
  const [hasMore, setHasMore] = useState(true);
  // Comments per post: { [postId]: { open, loading, items: [], input: '' } }
  const [comments, setComments] = useState({});
  const [memberSearch, setMemberSearch] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState('all'); // 'all', 'admin', 'member'
  const [confirmDialogData, setConfirmDialogData] = useState(null); // { type, title, message, onConfirm }
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState(null);
  // Edit group modal
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [editGroupTags, setEditGroupTags] = useState('');
  const [editGroupPrivate, setEditGroupPrivate] = useState(false);
  const [editGroupAdminOnly, setEditGroupAdminOnly] = useState(false);
  const [inviteActionLoading, setInviteActionLoading] = useState(false);
  
  // Refs
  const fileInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const confirmDialogRef = useRef(null);
  const confirmTriggerRef = useRef(null);
  const editModalRef = useRef(null);
  const editTriggerRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadGroupData = useCallback(async () => {
    if (!isMountedRef.current) return;
    setLoading(true);
    setError(null);
    try {
      // PERFORMANCE: Fetch group details (without members - we'll get count separately)
      const { data: groupData, error: groupError } = await fetchGroupDetails(id, { includeMembers: false });
      if (groupError) throw groupError;
      if (isMountedRef.current) {
        setGroup(groupData);
      }
      
      // PERFORMANCE: Parallelize all user-specific and secondary queries
      const isSiteAdmin = profile?.is_admin === true;
      const userId = user?.id;
      
      // Build parallel promises array
      const parallelPromises = [
        // 1. Member count (lightweight head-only query)
        supabase
          .from('group_members')
          .select('user_id', { count: 'exact', head: true })
          .eq('group_id', id),
      ];
      
      if (userId) {
        // 2. Check membership presence
        parallelPromises.push(checkMemberPresence(supabase, id, userId));
        // 3. Get my membership role
        parallelPromises.push(getMyMembership(supabase, id));
        // 4. Check pending join request
        parallelPromises.push(
          supabase
            .from('group_memberships')
            .select('status')
            .eq('group_id', id)
            .eq('user_id', userId)
            .eq('status', 'pending')
        );
      }
      
      const results = await Promise.all(parallelPromises);
      
      // Process results
      const countResult = results[0];
      if (typeof countResult?.count === 'number' && isMountedRef.current) {
        setMemberCount(countResult.count);
      }
      
      let memberCheck = false;
      let adminCheck = isSiteAdmin; // Site admin is always admin
      let pendingCheck = false;
      
      if (userId) {
        // Membership presence (result[1])
        memberCheck = !!results[1];
        
        // My membership role (result[2])
        const mem = results[2];
        if (mem?.role === 'admin') adminCheck = true;
        
        // Pending check (result[3])
        const pendingResult = results[3];
        if (!pendingResult?.error && (pendingResult?.data?.length ?? 0) > 0) {
          pendingCheck = true;
        }
      }
      
      if (isMountedRef.current) {
        setIsMember(memberCheck);
        setIsAdmin(adminCheck);
        setJoinPending(pendingCheck);
        // Group and membership are ready; we can render the shell.
        setLoading(false);
      }

      // Fetch posts if user is a member or the group is public (paged)
      // This is done after membership check since it depends on the result
      if (isMountedRef.current) {
        setPostsError(null);
        setPostsLoading(true);
      }
      if ((memberCheck || !groupData.is_private)) {
        try {
          const { data: postsData, error: postsFetchError } = await fetchGroupPosts(id, { limit: 10 });
          if (postsFetchError) throw postsFetchError;
          if (isMountedRef.current) {
            setPosts(postsData || []);
            setHasMore((postsData || []).length === 10);
          }
        } catch (postErr) {
          if (isMountedRef.current) {
            setPostsError('Failed to load posts. Please try again.');
          }
          logger.error('Error loading group posts:', postErr);
        } finally {
          if (isMountedRef.current) {
            setPostsLoading(false);
          }
        }
      } else if (isMountedRef.current) {
        // User cannot view posts; mark posts as not loading
        setPostsLoading(false);
      }
    } catch (err) {
      const msg = String(err?.message || '');
      if (/JSON object requested, multiple \(or no\) rows returned/i.test(msg)) {
        if (isMountedRef.current) {
          setError('This group is currently not available. It may be pending review or archived.');
        }
      } else if (err?._restricted || err?.code === 'restricted') {
        if (isMountedRef.current) {
          setGroup(err.group || { _restricted: true, id });
          setError('This is a private group. You need an invitation to view it.');
        }
      } else {
        if (isMountedRef.current) {
          setError('Failed to load this group. Please try again.');
        }
      }
      logger.error("Error loading group data:", err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [id, user?.id, profile?.is_admin]);

  const handleAcceptInvitation = useCallback(async () => {
    try {
      if (!user) {
        window.location.href = `/login?redirect=/groups/${id}`;
        return;
      }
      if (!group?._invitePending) return;
      if (!isMountedRef.current) return;
      setInviteActionLoading(true);
      const { error } = await acceptGroupInvitation(id);
      if (error) throw error;
      toast.success('You have joined this group.');
      await loadGroupData();
    } catch (err) {
      logger.error('Error accepting group invitation:', err);
      if (isMountedRef.current) {
        setError(getFriendlyErrorMessage(err, 'Failed to accept invitation. Please try again.'));
      }
    } finally {
      if (isMountedRef.current) {
        setInviteActionLoading(false);
      }
    }
  }, [user, group?._invitePending, id, loadGroupData]);

  const handleRejectInvitation = useCallback(async () => {
    try {
      if (!user) {
        window.location.href = `/login?redirect=/groups/${id}`;
        return;
      }
      if (!group?._invitePending) return;
      if (!isMountedRef.current) return;
      setInviteActionLoading(true);
      const { error } = await rejectGroupInvitation(id);
      if (error) throw error;
      toast.success('Invitation declined.');
      window.location.href = '/groups';
    } catch (err) {
      logger.error('Error rejecting group invitation:', err);
      if (isMountedRef.current) {
        setError(getFriendlyErrorMessage(err, 'Failed to decline invitation. Please try again.'));
      }
    } finally {
      if (isMountedRef.current) {
        setInviteActionLoading(false);
      }
    }
  }, [user, group?._invitePending, id]);

  useEffect(() => {
    loadGroupData();
  }, [loadGroupData]);

  // Compute avatar src: prefer stored public URL; otherwise fetch a signed URL
  useEffect(() => {
    const buildSrc = async () => {
      if (!id) return;
      // If we have a stored public URL, use it with cache-busting
      if (group?.group_avatar_url) {
        const cb = group.updated_at ? `?t=${new Date(group.updated_at).getTime()}` : '';
        setAvatarSrc(`${group.group_avatar_url}${cb}`);
        return;
      }
      // Otherwise, skip signed URL attempts to avoid noisy 400s; let placeholder render
      setAvatarSrc('');
    };
    buildSrc();
  }, [id, group?.group_avatar_url, group?.updated_at]);

  // Load members when Members tab is active (admins only)
  useEffect(() => {
    const loadMembers = async () => {
      if (activeTab !== 'members') return;
      // Allow any member (or admin) to see the members list
      if (!isMember && !isAdmin) return;
      try {
        const { data, error } = await fetchGroupMembers(id, 200, 0);
        if (!error && isMountedRef.current) setMembers(data || []);
      } catch(e) {
        logger.error('Failed to load members', e);
      }
    };
    loadMembers();
  }, [activeTab, id, isAdmin, isMember]);

  const handleMembership = async () => {
    try {
      if (!user) {
        // Redirect to login if not logged in
        window.location.href = `/login?redirect=/groups/${id}`;
        return;
      }
      // Use centralized join check
      const joinCheck = canJoinGroup(group, userRole, isMember);
      if (!joinCheck.allowed && !isMember) {
        const reason = joinCheck.reason || 'You cannot join this group.';
        setError(reason);
        // Avoid duplicate noisy toast when this is an alumni-only restriction;
        // the inline access-denied card already explains the rule clearly.
        if (!String(reason).toLowerCase().includes('alumni only')) {
          toast.error(reason);
        }
        return;
      }
      if (!isUserApproved && !isMember) {
        setError('Your account is pending approval. You can browse groups but cannot join until approved.');
        return;
      }
      // Enforce showJoin/showLeave rules
      const isSiteAdmin = profile?.is_admin === true;
      const isApproved = group.is_approved === true;
      const isPrivate = group.is_private === true;
      const showJoin = !isMember && isApproved && !isPrivate;
      const showLeave = isMember && !isAdmin; // isAdmin here means group/site admin
      // Last-admin guard: if current user is an admin trying to leave, ensure another admin exists
      if (isMember && isAdmin) {
        const { count, error } = await supabase
          .from('group_members')
          .select('role', { count: 'exact', head: true })
          .eq('group_id', id)
          .eq('role', 'admin')
          .neq('user_id', user.id);
        if (!error && ((count ?? 0) === 0)) {
          setError('Every group needs at least one admin. Transfer admin role before leaving.');
          return;
        }
      }
      
      // Join is only allowed for public, approved groups. Private groups are invite-only.
      if (!isMember) {
        if (isPrivate) {
          setError('This is a private, invite-only group. Ask a member or group admin to invite you.');
          toast.error('This is a private, invite-only group. Ask a member or group admin to invite you.');
          return;
        }

        const status = await joinGroupRpc(id);
        if (status === 'active') {
          toast.success('Joined group');
          setJoinPending(false);
          await loadGroupData();
        } else {
          // Pending approval (e.g., private group or special moderation case)
          setJoinPending(true);
          toast.success('Join request sent to group admins.');
        }
        return;
      }

      // Leave via secure RPC (DB enforces last-admin guard)
      await leaveGroupRpc(id);
      await loadGroupData();
    } catch (err) {
      logger.error("Error handling membership change:", err);
      const msg = String(err?.message || '');
      // Surface the last-admin safety guard with a clear, specific message
      if (/at least one admin must remain in each group/i.test(msg) || /must have at least one admin/i.test(msg)) {
        setError('Every group needs at least one admin. Transfer admin role to someone else before leaving.');
      } else {
        setError(getFriendlyErrorMessage(err, 'An unexpected error occurred. Please try again.'));
      }
    }
  };

  const handleWithdrawRequest = async () => {
    try {
      if (!user) {
        window.location.href = `/login?redirect=/groups/${id}`;
        return;
      }
      await withdrawJoinRequest(id);
      setJoinPending(false);
      toast.success('Join request withdrawn');
      await loadGroupData();
    } catch (err) {
      logger.error('Error withdrawing join request:', err);
      setError(getFriendlyErrorMessage(err, 'Failed to withdraw join request. Please try again.'));
    }
  };

  // Delete group (super_admin only) - uses hardened RPC
  const handleDeleteGroup = async () => {
    try {
      await deleteGroupRpc(id);
      toast.success('Group deleted permanently');
      window.location.href = '/groups';
    } catch (err) {
      logger.error('Error deleting group:', err);
      const msg = String(err?.message || '');
      if (/super.?admin/i.test(msg) || /permission denied/i.test(msg)) {
        toast.error('Only super admins can delete groups.');
      } else if (/archive/i.test(msg)) {
        toast.error('Cannot delete: archive the group instead.');
      } else {
        toast.error(getFriendlyErrorMessage(err, 'Failed to delete group.'));
      }
    } finally {
      setShowConfirmDialog(false);
      setConfirmAction(null);
    }
  };
  
  // Handle removing a member from the group (admin only)
  const handleRemoveMember = async (memberId) => {
    try {
      const { error } = await removeGroupMember(id, memberId);
      if (error) throw error;
      // Update local members list
      setMembers(prev => prev.filter(m => m.user.id !== memberId));
      
      setMemberToRemove(null);
      setShowConfirmDialog(false);
    } catch (err) {
      logger.error("Error removing member:", err);
      setError("Failed to remove member.");
    }
  };
  
  // Handle deleting a post (admin or post owner)
  const handleDeletePost = async (postId) => {
    try {
      const { error } = await deleteGroupPost(postId);
      if (error) throw error;
      
      // Update posts list
      setPosts(prev => prev.filter(post => post.id !== postId));
      
      setPostToDelete(null);
      setShowConfirmDialog(false);
    } catch (err) {
      logger.error("Error deleting post:", err);
      setError("Failed to delete post.");
    }
  };

  // Edit post modal handlers
  const openEditModal = (post) => {
    setPostToEdit(post);
    setEditText(post.content || '');
    setShowEditModal(true);
  };
  const submitEditPost = async () => {
    if (!postToEdit) return;
    try {
      const { data, error } = await updateGroupPost(postToEdit.id, { content: editText });
      if (error) throw error;
      setPosts(prev => prev.map(p => p.id === postToEdit.id ? { ...p, content: data.content } : p));
      setShowEditModal(false);
      setPostToEdit(null);
      setEditText('');
    } catch (err) {
      logger.error('Error updating post:', err);
      setError('Failed to update post.');
    }
  };

  // Report post modal handlers
  const openReportModal = (postId) => {
    setReportPostId(postId);
    setReportReason('');
    setShowReportModal(true);
  };
  const submitReportPost = async () => {
    if (!reportPostId || !reportReason.trim()) return;
    try {
      const { error } = await reportGroupPost({ post_id: reportPostId, reason: reportReason.slice(0, 240), reporter_id: user.id });
      if (error) throw error;
      setShowReportModal(false);
      setReportPostId(null);
      setReportReason('');
      alert('Report sent to admins.');
    } catch (err) {
      logger.error('Error reporting post:', err);
      setError('Failed to submit report.');
    }
  };

  const loadMorePosts = async () => {
    if (!posts.length) return;
    const last = posts[posts.length - 1];
    try {
      const { data, error } = await fetchGroupPosts(id, { cursor: { created_at: last.created_at }, limit: 10 });
      if (error) throw error;
      if (isMountedRef.current) {
        setPosts(prev => [...prev, ...(data || [])]);
        setHasMore((data || []).length === 10);
      }
    } catch (err) {
      logger.error('Error loading more posts:', err);
    }
  };
  
  // Show confirmation dialog for actions
  const showConfirm = (action, data) => {
    if (action === 'removeMember') {
      setMemberToRemove(data);
      setConfirmAction('removeMember');
    } else if (action === 'deletePost') {
      setPostToDelete(data);
      setConfirmAction('deletePost');
    } else if (action === 'deleteGroup') {
      setConfirmAction('deleteGroup');
    }
    setShowConfirmDialog(true);
  };
  
  // Handle confirmation dialog actions
  const handleConfirmAction = () => {
    if (confirmAction === 'removeMember' && memberToRemove) {
      handleRemoveMember(memberToRemove);
    } else if (confirmAction === 'deletePost' && postToDelete) {
      handleDeletePost(postToDelete);
    } else if (confirmAction === 'deleteGroup') {
      handleDeleteGroup();
    }
  };
  
  // Cancel confirmation dialog
  const cancelConfirmAction = () => {
    setShowConfirmDialog(false);
    setMemberToRemove(null);
    setPostToDelete(null);
    setConfirmAction(null);
  };

  // Focus management for confirmation dialog
  useEffect(() => {
    if (showConfirmDialog) {
      confirmTriggerRef.current = document.activeElement;
      // Focus the dialog after render
      setTimeout(() => {
        confirmDialogRef.current?.focus();
      }, 50);
    } else if (confirmTriggerRef.current) {
      confirmTriggerRef.current.focus();
      confirmTriggerRef.current = null;
    }
  }, [showConfirmDialog]);

  // Focus management for edit modal
  useEffect(() => {
    if (showEditModal) {
      editTriggerRef.current = document.activeElement;
      setTimeout(() => {
        editModalRef.current?.focus();
      }, 50);
    } else if (editTriggerRef.current) {
      editTriggerRef.current.focus();
      editTriggerRef.current = null;
    }
  }, [showEditModal]);

  // Handle post image selection
  const handlePostImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          alert('File is too large. Please select a file smaller than 5MB.');
          return;
        }
        setPostImage(file);
        
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setPostImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };
  
  // Remove selected image
  const removeSelectedImage = () => {
    setPostImage(null);
    setPostImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle group avatar upload (PNG/JPG only, 2MB, upsert true)
  const handleAvatarChange = async (e) => {
    if (!user) {
      alert('You must be logged in to change the group avatar.');
      return;
    }
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const ACCEPT = ['image/png', 'image/jpeg'];
    const MAX = 2 * 1024 * 1024; // 2MB
    if (!ACCEPT.includes(file.type)) {
      alert('Only PNG or JPG images are allowed.');
      return;
    }
    if (file.size > MAX) {
      alert('Image must be 2 MB or smaller.');
      return;
    }

    if (!isMountedRef.current) return;
    setUploadingAvatar(true);
    try {
      const path = `${id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('group_avatars')
        .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg', cacheControl: '3600' });
      if (uploadError) throw uploadError;

      // Persist URL on the group via RPC so RLS and helper enforce permissions
      const { data: pub } = supabase.storage.from('group_avatars').getPublicUrl(path);
      const publicUrl = pub?.publicUrl || '';
      try {
        await updateGroupAvatarRpc(id, publicUrl || null);
      } catch (updErr) {
        logger.error('Failed to persist avatar URL via RPC:', updErr);
        if (isMountedRef.current) {
          setError('Avatar uploaded but could not be saved to the group (permissions).');
        }
        return;
      }

      const busted = publicUrl ? `${publicUrl}?t=${Date.now()}` : '';
      if (isMountedRef.current) {
        setGroup(prev => ({ ...prev, group_avatar_url: busted }));
      }
    } catch (err) {
      logger.error('Error uploading avatar:', err);
      if (isMountedRef.current) {
        setError('Failed to upload group avatar.');
      }
    } finally {
      if (isMountedRef.current) {
        setUploadingAvatar(false);
      }
    }
  };
  
  // Create post with optional image
  const handleCreatePost = async (e) => {
    if (!user) {
      alert('You must be logged in to create a post.');
      return;
    }
    if (!isUserApproved) {
      setError('Your account is pending approval. You cannot post until approved.');
      return;
    }
    e.preventDefault();
    if (!newPostContent.trim() && !postImage) return;
    // Respect posting policy: archived or admin-only
    const isSiteAdmin = profile?.is_admin === true;
    const me = isAdmin ? { role: 'admin', status: 'active' } : (isMember ? { role: 'member', status: 'active' } : null);
    if (userRole === 'employer' || !canPostToGroup(group || {}, !!isSiteAdmin, me || undefined)) {
      setError('You don’t have permission for that.');
      return;
    }
    
    if (!isMountedRef.current) return;
    setUploadingPost(true);
    try {
      // First create the post without image to obtain postId
      const basePost = { group_id: id, content: newPostContent, user_id: user.id };
      const { data: created, error: createErr } = await createGroupPost(basePost);
      if (createErr) throw createErr;

      let finalPost = created;
      // If image selected, upload and update the post
      if (postImage) {
        const { url, error: uploadError } = await uploadPostImage(postImage, id, created.id);
        if (uploadError) throw uploadError;
        const { data: withImg, error: updErr } = await updateGroupPost(created.id, { image_url: url, has_image: true });
        if (updErr) throw updErr;
        finalPost = withImg;
      }

      if (isMountedRef.current) {
        setPosts(prev => [finalPost, ...prev]);
        setNewPostContent('');
      }
      removeSelectedImage();
    } catch (err) {
      logger.error("Error creating post:", err);
      if (isMountedRef.current) {
        setError(getFriendlyErrorMessage(err, 'Failed to create post.'));
      }
    } finally {
      if (isMountedRef.current) {
        setUploadingPost(false);
      }
    }
  };

  const handleRequestJoin = async () => {
    try {
      if (!user) {
        window.location.href = `/login?redirect=/groups/${id}`;
        return;
      }

      const joinCheck = canJoinGroup(group, userRole, isMember);
      if (!joinCheck.allowed && !isMember) {
        setError(joinCheck.reason || 'You cannot join this group.');
        toast.error(joinCheck.reason || 'You cannot join this group.');
        return;
      }

      if (!isUserApproved && !isMember) {
        setError('Your account is pending approval. You can browse groups but cannot join until approved.');
        return;
      }

      const status = await joinGroupRpc(id);
      if (status === 'active') {
        toast.success('Joined group');
        setJoinPending(false);
        await loadGroupData();
      } else {
        setJoinPending(true);
        toast.success('Join request sent to group admins.');
      }
    } catch (err) {
      logger.error('Error requesting to join group:', err);
      setError(getFriendlyErrorMessage(err, 'An unexpected error occurred. Please try again.'));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    const message = String(error || '');
    const lower = message.toLowerCase();
    const isAlumniOnly = lower.includes('alumni only');

    return (
      <div className="container mx-auto p-6">
        <Link
          to="/groups"
          className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to All Groups
        </Link>

        <div
          className={`bg-white rounded-lg shadow-md p-8 text-center border ${
            isAlumniOnly
              ? 'border-indigo-200'
              : 'border-red-200'
          }`}
          role="alert"
          aria-live="assertive"
        >
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isAlumniOnly ? 'Access denied' : 'Unable to load this group'}
          </h1>
          <p className="text-gray-600">
            {isAlumniOnly
              ? 'This group is for alumni only. Your current account type does not have access.'
              : message}
          </p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container mx-auto p-6">
        <Link
          to="/groups"
          className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to All Groups
        </Link>
        <div className="bg-white rounded-lg shadow-md p-8 text-center" role="status" aria-live="polite">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Group not available</h1>
          <p className="text-gray-600">This group is not available or may have been archived.</p>
        </div>
      </div>
    );
  }

  // Private route guard: invited users get an accept/reject CTA; others see generic private message.
  const isSiteAdmin = profile?.is_admin === true;
  if (group.is_private && !isMember && !isSiteAdmin) {
    if (group._invitePending) {
      const invitedAt = group._invitationMeta?.created_at
        ? format(new Date(group._invitationMeta.created_at), 'dd MMM yyyy')
        : null;
      return (
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-3xl mx-auto px-4 py-12">
            <div className="bg-white rounded-2xl shadow-lg p-10 text-center">
              <div className="flex justify-center mb-6">
                <div className="p-4 rounded-full bg-amber-100 text-amber-600">
                  <Shield className="w-8 h-8" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                Youve been invited to this private group
              </h1>
              <p className="text-gray-600 mb-3">
                {group.name
                  ? `${group.name} is invite-only. Accept the invitation below to join and view posts and members.`
                  : 'This group is invite-only. Accept the invitation below to join.'}
              </p>
              {invitedAt && (
                <p className="text-sm text-gray-500 mb-4">Invited on {invitedAt}</p>
              )}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleAcceptInvitation}
                  disabled={inviteActionLoading}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-ocean-600 rounded-lg hover:bg-ocean-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {inviteActionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Accept invite and join group'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleRejectInvitation}
                  disabled={inviteActionLoading}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Decline invite
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-lg p-10 text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-amber-100 text-amber-600">
                <Shield className="w-8 h-8" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              This is a private group
            </h1>
            <p className="text-gray-600 mb-5">
              {group.name
                ? `${group.name} is invite-only. Ask a current admin or member to send you an invitation so you can view the posts and members.`
                : 'Ask a current group admin or member to invite you before you can view this group.'}
            </p>
            <div className="text-sm text-gray-500 mb-6 space-y-1">
              <p>Already received an invite? Check your Notifications panel for the invitation badge.</p>
              <p>If you believe you should have access, message a group admin or email support so they can resend the invite.</p>
            </div>
            <Link
              to="/groups"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-ocean-600 rounded-lg hover:bg-ocean-700"
            >
              Back to Groups
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Header CTA state: join/leave/manage/invite-only
  const headerIsApproved = group.is_approved === true;
  const headerIsPrivate = group.is_private === true;
  const headerShowManage = isAdmin && !group.is_archived;
  const headerShowJoin = userRole !== 'employer' && !group.is_archived && !isMember && headerIsApproved && !headerIsPrivate;
  const headerShowLeave = !group.is_archived && isMember && !isAdmin;
  const headerShowRequest = userRole !== 'employer' && !group.is_archived && !isMember && headerIsPrivate && !isAdmin;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Confirmation Dialog (legacy, used by showConfirm) */}
      {showConfirmDialog && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={cancelConfirmAction}
          role="presentation"
        >
          <div 
            ref={confirmDialogRef}
            className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-desc"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') cancelConfirmAction();
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
            tabIndex={-1}
          >
            <h3 id="confirm-dialog-title" className="text-lg font-bold mb-4">
              {confirmAction === 'removeMember' ? 'Remove Member' : confirmAction === 'deleteGroup' ? 'Delete Group' : 'Delete Post'}
            </h3>
            <p id="confirm-dialog-desc" className="mb-6 text-gray-600">
              {confirmAction === 'removeMember'
                ? 'Are you sure you want to remove this member from the group? They will lose access to all group content.'
                : confirmAction === 'deleteGroup'
                  ? 'Are you sure you want to permanently delete this group? This action cannot be undone.'
                  : 'Are you sure you want to delete this post? This action cannot be undone.'}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelConfirmAction}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className="px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 min-h-[44px]"
              >
                {confirmAction === 'removeMember' ? 'Remove Member' : confirmAction === 'deleteGroup' ? 'Delete Group' : 'Delete Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Post Modal */}
      {showEditModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowEditModal(false)}
          role="presentation"
        >
          <div 
            ref={editModalRef}
            className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-post-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowEditModal(false);
            }}
            tabIndex={-1}
          >
            <h3 id="edit-post-title" className="text-lg font-bold mb-4">Edit Post</h3>
            <label htmlFor="edit-post-content" className="sr-only">Post content</label>
            <textarea
              id="edit-post-content"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={1000}
              rows={4}
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowEditModal(false)} 
                className="px-4 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 min-h-[44px]"
              >
                Cancel
              </button>
              <button 
                onClick={submitEditPost} 
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px]"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Post Modal */}
      {showReportModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowReportModal(false)}
          role="presentation"
        >
          <div 
            className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-post-title"
            aria-describedby="report-post-desc"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowReportModal(false);
            }}
            tabIndex={-1}
          >
            <h3 id="report-post-title" className="text-lg font-bold mb-4">Report Post</h3>
            <p id="report-post-desc" className="text-sm text-gray-600 mb-2">Please describe the issue (max 240 characters).</p>
            <label htmlFor="report-reason" className="sr-only">Report reason</label>
            <textarea
              id="report-reason"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              maxLength={240}
              rows={3}
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowReportModal(false)} 
                className="px-4 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 min-h-[44px]"
              >
                Cancel
              </button>
              <button 
                onClick={submitReportPost} 
                disabled={!reportReason.trim()} 
                className="px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 min-h-[44px]"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {showEditGroup && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowEditGroup(false)}
          role="presentation"
        >
          <div 
            className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-group-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowEditGroup(false);
            }}
            tabIndex={-1}
          >
            <h3 id="edit-group-title" className="text-lg font-bold mb-4">Edit Group</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="edit-group-name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input 
                  id="edit-group-name"
                  value={editGroupName} 
                  onChange={(e) => setEditGroupName(e.target.value)} 
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                />
              </div>
              <div>
                <label htmlFor="edit-group-desc" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  id="edit-group-desc"
                  value={editGroupDesc} 
                  onChange={(e) => setEditGroupDesc(e.target.value)} 
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  rows={3}
                />
              </div>
              <div>
                <label htmlFor="edit-group-tags" className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                <input 
                  id="edit-group-tags"
                  value={editGroupTags} 
                  onChange={(e) => setEditGroupTags(e.target.value)} 
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={editGroupPrivate} onChange={(e) => setEditGroupPrivate(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="font-medium">Private</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={editGroupAdminOnly} onChange={(e) => setEditGroupAdminOnly(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="font-medium">Admin-only Posts</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button 
                onClick={() => setShowEditGroup(false)} 
                className="px-4 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const updates = {
                      name: editGroupName,
                      description: editGroupDesc,
                      is_private: editGroupPrivate,
                      is_admin_only_posts: editGroupAdminOnly,
                      tags: editGroupTags.split(',').map(t => t.trim()).filter(Boolean),
                    };
                    const { data, error } = await updateGroupDetails(id, updates);
                    if (error) throw error;
                    setGroup(prev => ({ ...prev, ...data }));
                    setShowEditGroup(false);
                  } catch (err) {
                    logger.error('Error updating group:', err);
                    setError('Failed to update group');
                  }
                }}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px]"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <Link to="/groups" className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mb-6 px-3 py-2 rounded-lg hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to All Groups
        </Link>

        {/* Group Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between">
            <div className="flex md:flex-row flex-col">
              {/* Group Avatar with upload option for admins */}
              <div className="relative mr-6 mb-4 md:mb-0">
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center">
                  <ImageWithFallback
                    src={avatarSrc}
                    alt={group.name}
                    className="w-24 h-24"
                    placeholderSrc="/default-avatar.svg"
                    emptyMessage="Group image to be uploaded"
                  />
                </div>
                
                {/* Avatar upload button (admin only) */}
                {isAdmin && (
                  <div className="absolute bottom-0 right-0">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                      ref={avatarInputRef}
                    />
                    <button
                      onClick={() => avatarInputRef.current.click()}
                      className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-w-[36px] min-h-[36px] flex items-center justify-center"
                      aria-label="Change group avatar"
                      disabled={uploadingAvatar}
                    >
                      {uploadingAvatar ? (
                        <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin" aria-label="Uploading"></div>
                      ) : (
                        <Camera size={16} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex-grow">
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
                  {/* Privacy badge */}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${group.is_private ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                    {group.is_private ? 'Private' : 'Public'}
                  </span>
                  {/* Alumni-only badge */}
                  {(group.alumni_only === true || (Array.isArray(group.tags) && group.tags.some(t => String(t).toLowerCase() === 'alumni-only'))) && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" />Alumni only
                    </span>
                  )}
                  {/* Archived badge */}
                  {group.is_archived && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">Archived</span>
                  )}
                  {/* Admin-only posts badge */}
                  {group.is_admin_only_posts && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">Admin-only Posts</span>
                  )}
                  {/* Moderation chip (creator/admin only) */}
                  {(user?.id === group.created_by || isAdmin) && (
                    group.is_rejected ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700" title={group.rejection_reason || ''}>Rejected</span>
                    ) : (group.is_approved || group.approval_status === 'approved') ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">Approved</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">Pending</span>
                    )
                  )}
                </div>
                <p className="text-gray-600 text-base leading-relaxed">{group.description}</p>
              </div>
            </div>
            
            <div className="flex-shrink-0 mt-4 md:mt-0 md:ml-4 flex items-center gap-3">
              {headerShowJoin && !joinPending && (
                <button
                  onClick={handleMembership}
                  className="px-6 py-2.5 rounded-lg font-semibold text-white transition-all bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px]"
                >
                  Join Group
                </button>
              )}
              {headerShowJoin && joinPending && (
                <>
                  <span className="px-4 py-2.5 rounded-lg font-semibold bg-gray-100 text-gray-700 text-sm min-h-[44px] flex items-center">
                    Request sent
                  </span>
                  <button
                    type="button"
                    onClick={handleWithdrawRequest}
                    className="px-4 py-2.5 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 min-h-[44px]"
                  >
                    Withdraw request
                  </button>
                </>
              )}
              {headerShowLeave && (
                <button
                  onClick={handleMembership}
                  className="px-6 py-2.5 rounded-lg font-semibold text-white transition-all bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 min-h-[44px]"
                >
                  Leave Group
                </button>
              )}
              {!headerShowJoin && !headerShowLeave && isMember && (
                <span className="px-4 py-2.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold min-h-[44px] flex items-center">
                  Member
                </span>
              )}
              {headerShowRequest && (
                joinPending ? (
                  <span className="px-4 py-2.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold min-h-[44px] flex items-center">
                    Join request pending approval.
                  </span>
                ) : (
                  <button
                    onClick={handleRequestJoin}
                    className="px-6 py-2.5 rounded-lg font-semibold text-white transition-all bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px]"
                  >
                    Request to Join
                  </button>
                )
              )}
              {headerShowManage && (
                <>
                  <Link
                    to={`/groups/${id}/manage`}
                    className="px-5 py-2.5 rounded-lg border-2 border-gray-300 text-sm font-semibold hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 min-h-[44px] flex items-center"
                  >
                    Manage Group
                  </Link>
                  {/* Delete button: super_admin only */}
                  {userRole === 'super_admin' && (
                    <button
                      onClick={() => showConfirm('deleteGroup')}
                      className="px-5 py-2.5 rounded-lg border-2 border-red-600 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 min-h-[44px]"
                      aria-label="Permanently delete this group (super admin only)"
                    >
                      Delete Group
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          {/* Pending approval banner for creator/admins */}
          {((user?.id === group.created_by) || (profile?.is_admin === true)) && !group.is_approved && (
            <div className="rounded-lg border-2 border-amber-300 bg-amber-50 text-amber-800 p-4 mt-6 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">Pending Approval</p>
                <p className="text-sm">This group is awaiting admin approval. Only you and site admins can see it for now.</p>
              </div>
            </div>
          )}
          {(!group.is_private && group.is_approved && !group.is_archived) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <ShareButtons url={window.location.href} title={group.name} />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <nav className="flex" aria-label="Group content tabs" role="tablist">
            <button 
              id="tab-posts"
              onClick={() => setActiveTab('posts')} 
              className={`flex-1 py-4 px-4 border-b-2 font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 min-h-[48px] ${activeTab === 'posts' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              role="tab"
              aria-selected={activeTab === 'posts'}
              aria-controls="tabpanel-posts"
            >
              <MessageSquare className="inline-block w-5 h-5 mr-2" aria-hidden="true" />Posts
            </button>
            <button 
              id="tab-members"
              onClick={() => setActiveTab('members')} 
              className={`flex-1 py-4 px-4 border-b-2 font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 min-h-[48px] ${activeTab === 'members' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              role="tab"
              aria-selected={activeTab === 'members'}
              aria-controls="tabpanel-members"
            >
              <Users className="inline-block w-5 h-5 mr-2" aria-hidden="true" />Members
              <span className="ml-1 px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs font-bold" aria-label={`${memberCount || members?.length || 0} members`}>
                {memberCount || members?.length || 0}
              </span>
            </button>
            <button 
              id="tab-about"
              onClick={() => setActiveTab('about')} 
              className={`flex-1 py-4 px-4 border-b-2 font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 min-h-[48px] ${activeTab === 'about' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              role="tab"
              aria-selected={activeTab === 'about'}
              aria-controls="tabpanel-about"
            >
              <Info className="inline-block w-5 h-5 mr-2" aria-hidden="true" />About
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'posts' && (
            <div id="tabpanel-posts" role="tabpanel" aria-labelledby="tab-posts">
            {(() => {
              const adminOnlyPost = group.is_admin_only_posts === true;
              const publicApproved = (group.is_private === false && group.is_approved === true);
              const canViewPosts = (isMember || publicApproved) && !group.is_archived;
              const canPost = !group.is_archived && isMember && (isAdmin || !adminOnlyPost);
              if (!canViewPosts) {
                if (group.is_archived) return <p className="text-center text-gray-600">This group is archived.</p>;
                if (group.is_private && !isMember) {
                  if (isSiteAdmin) {
                    return <p className="text-center text-gray-600">You're not a member of this private group. Add yourself as a member in Group Manage to view posts.</p>;
                  }
                  return <p className="text-center text-gray-600">This group is private. Ask an admin for access.</p>;
                }
                if (!group.is_approved) return <p className="text-center text-gray-600">This group is pending review.</p>;
                return <p className="text-center text-gray-600">You don't have access to view posts.</p>;
              }

              if (postsLoading) {
                return (
                  <div className="bg-white shadow-md rounded-lg p-6 text-center text-gray-600">
                    Loading posts...
                  </div>
                );
              }

              if (postsError) {
                return (
                  <div className="bg-white shadow-md rounded-lg p-6 text-center text-red-600">
                    {postsError}
                  </div>
                );
              }

              return (
                <div>
                  {/* Composer */}
                  <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                    <h2 className="text-xl font-bold mb-4">Create a Post</h2>
                    {group.is_archived && (
                      <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">This group is archived; posting is disabled.</div>
                    )}
                    {adminOnlyPost && !isAdmin && !group.is_archived && (
                      <div className="mb-3 text-sm text-purple-700 bg-purple-50 border border-purple-200 rounded p-2">Only group admins can post in this group.</div>
                    )}
                    <form onSubmit={handleCreatePost}>
                      <label htmlFor="new-post-content" className="sr-only">Write your post</label>
                      <textarea
                        id="new-post-content"
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={!canPost}
                        placeholder="What's on your mind?"
                        rows={3}
                      />
                      <div className="flex items-center justify-between mt-3">
                        <div>
                          {/* Image upload for posts is temporarily disabled */}
                        </div>
                        <button
                          type="submit"
                          disabled={!canPost || uploadingPost || (!newPostContent.trim() && !postImage)}
                          className={`px-5 py-2.5 text-white rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[44px] ${uploadingPost ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                        >
                          {uploadingPost ? 'Posting...' : 'Post'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Posts list */}
                  <div className="space-y-4">
                    {posts.length > 0 ? posts.map(post => (
                      <div key={post.id} className="bg-white shadow-md rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <img
                              src={post.author?.avatar_url || '/default-avatar.svg'}
                              alt={post.author?.full_name}
                              className="w-10 h-10 rounded-full mr-3"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/default-avatar.svg';
                              }}
                            />
                            <div>
                              <p className="font-bold">{post.author?.full_name || 'Amet User'}</p>
                              <p className="text-gray-500 text-sm">{format(new Date(post.created_at), 'PPpp')}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {(isAdmin || post.user_id === user.id) && (
                              <button
                                onClick={() => openEditModal(post)}
                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label={`Edit post by ${post.author?.full_name || 'user'}`}
                              >
                                <Edit size={18} aria-hidden="true" />
                              </button>
                            )}
                            {(isAdmin || post.user_id === user.id) && (
                              <button
                                onClick={() => showConfirm('deletePost', post.id)}
                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                                aria-label={`Delete post by ${post.author?.full_name || 'user'}`}
                              >
                                <Trash2 size={18} aria-hidden="true" />
                              </button>
                            )}
                            {/* Report post option removed */}
                          </div>
                        </div>

                        <p className="mb-3 whitespace-pre-wrap break-words">{post.content}</p>

                        {post.image_url && (
                          <div className="mt-2 mb-3">
                            <img
                              src={post.image_url}
                              alt="Post attachment"
                              className="max-h-96 rounded border max-w-full"
                            />
                          </div>
                        )}

                        <div className="mt-2">
                          <CommentsThread postId={post.id} group={group} isMember={isMember} />
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                        <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-900 font-medium mb-1">No posts yet</p>
                        <p className="text-gray-500 text-sm">Be the first to share something with the group!</p>
                      </div>
                    )}
                    {hasMore && (
                      <div className="text-center">
                        <button 
                          onClick={loadMorePosts} 
                          className="px-4 py-2.5 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px]"
                        >
                          Load more posts
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
            </div>
          )}

          {activeTab === 'members' && (
            <div id="tabpanel-members" role="tabpanel" aria-labelledby="tab-members">
              {members.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-900 font-medium mb-1">No members to display</p>
                  <p className="text-gray-500 text-sm">Members will appear here once they join the group.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {members.map(member => (
                    <article key={member.user.id} className="bg-white p-4 rounded-lg shadow relative" aria-label={`Member: ${member.user.full_name}`}>
                      {/* Admin badge */}
                      {member.role === 'admin' && (
                        <span className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full flex items-center font-medium">
                          <Shield size={12} className="mr-1" aria-hidden="true" /> Admin
                        </span>
                      )}
                      
                      <div className="text-center">
                        <img 
                          src={member.user.avatar_url || '/default-avatar.svg'} 
                          alt=""
                          className="w-20 h-20 rounded-full mx-auto mb-2 border-2 border-gray-200"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/default-avatar.svg';
                          }}
                        />
                        <p className="font-semibold text-gray-900">{member.user.full_name}</p>
                        <p className="text-sm text-gray-600">
                          {(ROLE_LABELS[member?.user?.role] || 'Alumni')}
                          {" • "}
                          {member.role === 'admin' ? 'Group Admin' : 'Member'}
                        </p>
                      </div>
                      
                      {/* Admin actions (admin only, can't act on self) */}
                      {isAdmin && member.user.id !== user.id && (
                        <div className="mt-3 text-center space-y-2">
                          {member.role !== 'admin' ? (
                            <button
                              onClick={async () => {
                                try {
                                  await setMemberRole(id, member.user.id, 'admin');
                                  setMembers(prev => prev.map(m => m.user.id === member.user.id ? { ...m, role: 'admin' } : m));
                                  toast.success(`${member.user.full_name} promoted to admin`);
                                } catch (e) {
                                  setError('Failed to promote member');
                                  toast.error('Failed to promote member');
                                }
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm flex items-center justify-center mx-auto px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label={`Promote ${member.user.full_name} to admin`}
                            >
                              <ArrowUp size={14} className="mr-1" aria-hidden="true" />
                              Promote to Admin
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                try {
                                  await setMemberRole(id, member.user.id, 'member');
                                  setMembers(prev => prev.map(m => m.user.id === member.user.id ? { ...m, role: 'member' } : m));
                                  toast.success(`${member.user.full_name} demoted to member`);
                                } catch (e) {
                                  setError('Failed to demote member');
                                  toast.error('Failed to demote member');
                                }
                              }}
                              className="text-gray-600 hover:text-gray-800 text-sm flex items-center justify-center mx-auto px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                              aria-label={`Demote ${member.user.full_name} to member`}
                            >
                              <ArrowDown size={14} className="mr-1" aria-hidden="true" />
                              Demote to Member
                            </button>
                          )}
                          {member.role !== 'admin' && (
                            <button
                              onClick={() => showConfirm('removeMember', member.user.id)}
                              className="text-red-500 hover:text-red-700 text-sm flex items-center justify-center mx-auto px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                              aria-label={`Remove ${member.user.full_name} from group`}
                            >
                              <UserMinus size={14} className="mr-1" aria-hidden="true" />
                              Remove
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'about' && (
            <div id="tabpanel-about" role="tabpanel" aria-labelledby="tab-about">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-900">About this group</h2>
                <p className="text-gray-700 leading-relaxed">{group.description || 'No description provided.'}</p>
                <dl className="mt-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <dt className="font-semibold text-gray-900">Privacy:</dt>
                    <dd className={`px-2.5 py-1 rounded-full text-xs font-semibold ${group.is_private ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                      {group.is_private ? 'Private' : 'Public'}
                    </dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <dt className="font-semibold text-gray-900">Created:</dt>
                    <dd className="text-gray-600">{format(new Date(group.created_at), 'PPP')}</dd>
                  </div>
                  {group.tags && group.tags.length > 0 && (
                    <div>
                      <dt className="font-semibold text-gray-900 mb-2">Tags:</dt>
                      <dd className="flex flex-wrap gap-2">
                        {group.tags.map((tag, i) => (
                          <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                            {tag}
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default GroupDetail;
