/**
 * @deprecated This component is DEPRECATED.
 * 
 * The mentorship module has been refactored to use a new panel-based architecture:
 * - MentorshipLayout.jsx - Main layout shell
 * - MentorshipHub.jsx - Central hub with tab routing
 * - panels/FindMentorsPanel.jsx - Find mentors
 * - panels/MyMentorsPanel.jsx - My mentors (as mentee)
 * - panels/MyMenteesPanel.jsx - My mentees (as mentor)
 * - panels/RequestsPanel.jsx - Sent/received requests
 * - panels/MentorshipSettingsPanel.jsx - Settings
 * 
 * All chat functionality now uses:
 * - useOpenMentorshipChat hook (calls mentorship_open_chat RPC)
 * - Navigates to /messages with conversationId
 * 
 * This file is kept for backwards compatibility but should not be used for new features.
 */
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import logger from '../../utils/logger';
import { toast } from 'react-hot-toast';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useApproval } from '../../hooks/useApproval';
import { getPublicIdentity } from '../../lib/hydrateIdentity';
import { fetchMenteeRequests, fetchMentorRequests as qFetchMentorRequests } from '../../lib/queries/mentorship';
import { RequestStatusChip } from '../../lib/statusChips';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { mapSupabaseErrorToToast } from '../../utils/mapSupabaseErrorToToast';
import { useCreateMentorshipRequest, useAcceptMentorshipRequest, useRejectMentorshipRequest, useCancelMentorshipRequest } from '../../hooks/useMentorshipMutations';
import { ensureDmThreadWith } from '../../api/dm'; // @deprecated - use useOpenMentorshipChat instead
import { useMentorshipEligibility } from '../../hooks/useMentorshipEligibility';
import { 
  UserGroupIcon,
  AcademicCapIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  StarIcon,
  MapPinIcon,
  BriefcaseIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

import ApprovedGuard from '../guards/ApprovedGuard';
import RequestMentorshipButton from './RequestMentorshipButton';

// Availability chip color helper (module scope so MentorCard can use it)
const getAvailabilityColor = (availability) => {
  switch (availability) {
    case 'Available':
      return 'text-green-600 bg-green-100';
    case 'Unavailable':
      return 'text-gray-600 bg-gray-100';
    case 'Busy':
      return 'text-yellow-600 bg-yellow-100';
    case 'Limited':
      return 'text-orange-600 bg-orange-100';
    case 'Hidden':
      return 'text-gray-600 bg-gray-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

const Mentorship = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('find-mentors');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    expertise: 'all',
    experience: 'all',
    location: 'all',
    availability: 'all'
  });
  const [showOnlyAccepting, setShowOnlyAccepting] = useState(true);

  // State for data from Supabase
  const [mentors, setMentors] = useState([]);
  const [mentorshipRequests, setMentorshipRequests] = useState([]);
  const [requestedMentorIds, setRequestedMentorIds] = useState(new Set());
  const queryClient = useQueryClient();
  const [mentorFilter, setMentorFilter] = useState('pending');
  const [myMentees, setMyMentees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCurrentUserMentor, setIsCurrentUserMentor] = useState(false);
  const [isMentorApproved, setIsMentorApproved] = useState(false);
  const [isMentorPending, setIsMentorPending] = useState(false);
  const { user, profile, getUserRole } = useAuth();
  const { isApprovedMentee, isApprovedMentor } = useApproval();
  const mentorshipEligibility = useMentorshipEligibility();
  const hasFetched = useRef(false);
  const isStudentUnapproved = ((getUserRole ? getUserRole() : '') .toLowerCase() === 'student') && !(profile?.is_approved || profile?.approval_status === 'approved');
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const createRequestMutation = useCreateMentorshipRequest();
  const acceptRequestMutation = useAcceptMentorshipRequest();
  const rejectRequestMutation = useRejectMentorshipRequest();
  const cancelRequestMutation = useCancelMentorshipRequest();

  // Load mentee-side requests (My Requests)
  const loadMenteeRequests = async () => {
    if (!user?.id) return;
    try {
      const q = await fetchMenteeRequests(user.id, {});
      const { data: rows, error } = await q;
      if (error) throw error;
      const hydrated = await Promise.all((rows || []).map(async (r) => ({
        ...r,
        mentor: await getPublicIdentity(r.mentor_id),
      })));
      if (isMountedRef.current) {
        setMentorshipRequests(hydrated);
      }
    } catch (e) {
      logger.error('Failed to load your mentorship requests', e);
      toast.error('Failed to load your mentorship requests');
    }
  };

  // Mentor requests via React Query
  const mentorReqQuery = useQuery({
    queryKey: ['mentorRequests', user?.id, mentorFilter || 'all'],
    enabled: !!user?.id && isMentorApproved,
    queryFn: async () => {
      const q = await qFetchMentorRequests(user.id, mentorFilter === 'pending' ? { status: 'pending' } : {});
      const { data: rows, error } = await q;
      if (error) throw error;
      const hydrated = await Promise.all((rows || []).map(async (r) => ({
        ...r,
        mentee: await getPublicIdentity(r.mentee_id),
      })));
      return hydrated;
    },
    staleTime: 60_000,
  });
  const mentorRequests = mentorReqQuery.data || [];
  const mentorReqLoading = mentorReqQuery.isLoading || mentorReqQuery.isFetching;

  // Accept/Reject using centralized RPC-based mutations
  const acceptMutation = acceptRequestMutation;
  const rejectMutation = rejectRequestMutation;

  // Initial mount: fetch mentors and current user's mentor status once
  useEffect(() => {
    logger.log('Mentorship component mounted');
    if (!hasFetched.current) {
      fetchApprovedMentors();
      checkCurrentUserMentor();
      hasFetched.current = true;
    }
  }, [location]); // Removed user from the dependency array to avoid re-fetching

  // When page becomes visible again (e.g., after toggling in Admin), refetch mentors once
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        fetchApprovedMentors();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Re-fetch when the checkbox flips (server-side filter applied in query)
  useEffect(() => {
    fetchApprovedMentors();
  }, [showOnlyAccepting]);

  // Realtime subscription to availability updates
  useEffect(() => {
    const channel = supabase
      .channel('profiles-availability')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', columns: ['is_available_for_mentorship'] },
        () => fetchApprovedMentors()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);
  
  // Check if the current user is already a mentor
  const checkCurrentUserMentor = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('mentors')
        .select('status, user_id')
        .eq('user_id', user.id)
        .single();
        
      if (error && error.code !== 'PGRST116') { // PGRST116 is not found error
        logger.error('Error checking mentor status:', error);
        return;
      }
      
      if (isMountedRef.current) {
        setIsCurrentUserMentor(!!data);
        setIsMentorApproved(data?.status === 'approved');
        setIsMentorPending(data?.status === 'pending');
      }
    } catch (err) {
      logger.error('Error checking if user is mentor:', err);
    }
  };
  
  // Function to fetch approved mentors; CTA disabled when unavailable via profiles.is_available_for_mentorship
  const fetchApprovedMentors = async () => {
    try {
      if (!isMountedRef.current) return;
      setLoading(true);
      setError(null);
      
      logger.log('Fetching approved mentors from Supabase...');
      
      // Prefer RPC wrapper around v_mentors_public for future personalization/pagination
      const { data: mentorsRows, error: mentorsError } = await supabase.rpc('get_mentors_for_current_mentee', {
        p_limit: 50,
        p_offset: 0,
      });
      
      logger.log('Supabase query result received');
      
      if (mentorsError) {
        throw mentorsError;
      }
      
      logger.log('Fetched mentors count:', mentorsRows?.length || 0);

      // Transform data to match rendering needs
      let baseMentors = mentorsRows || [];
      if (showOnlyAccepting) {
        baseMentors = baseMentors.filter((m) => m.is_available_for_mentorship);
      }

      const transformedMentors = baseMentors.map(mentor => {
        const ident = {
          full_name: mentor.full_name,
          avatar_url: mentor.avatar_url,
        };
        const title = 'Maritime Professional';
        const company = 'AMET';
        const location = mentor.location || 'Unknown';
        // Use view field as single source of truth
        const isAvailable = !!mentor.is_available_for_mentorship;
        return {
          id: mentor.id,
          user_id: mentor.user_id,
          name: ident.full_name || 'Anonymous Mentor',
          avatar: ident.avatar_url || '/default-avatar.svg',
          title,
          company,
          location,
          bio: mentor.mentoring_statement || '',
          expertise: mentor.expertise || [],
          experience: `${mentor.mentoring_experience_years || 0} years`,
          responseTime: '48 hours',
          // Single source of truth for availability
          is_available_for_mentorship: isAvailable,
          applicant: undefined,
          compatibilityScore: 85,
          ratings: '5.0',
          // Use current_mentees_count from view as single source of truth for mentee count
          totalMentees: typeof mentor.current_mentees_count === 'number' ? mentor.current_mentees_count : 0,
          maxMentees: mentor.max_mentees || null,
          preferences: mentor.mentoring_preferences || {},
          isBookmarked: false,
        };
      });
      
      logger.log('Transformed mentors count:', transformedMentors?.length || 0);
      // Show all approved mentors. Request button will be disabled if unavailable.
      if (isMountedRef.current) {
        setMentors(transformedMentors);
      }
    } catch (err) {
      logger.error('Error fetching mentors:', err);
      if (isMountedRef.current) {
        setError(err.message || 'Failed to load mentors');
        toast.error('Failed to load mentors');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };
  

  // Default mentor filter to pending when approved
  useEffect(() => {
    if (isMentorApproved) setMentorFilter('pending');
  }, [isMentorApproved]);

  // Load mentee requests when switching to the tab
  useEffect(() => {
    if (activeTab === 'my-requests' && isApprovedMentee) {
      loadMenteeRequests();
    }
  }, [activeTab, isApprovedMentee, user?.id]);

  // Also load initially so the mentor grid can reflect existing pending requests
  useEffect(() => {
    if (isApprovedMentee && user?.id) {
      loadMenteeRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApprovedMentee, user?.id]);

  // Keep a quick lookup of mentors already requested (pending or accepted)
  useEffect(() => {
    const ids = new Set((mentorshipRequests || [])
      .filter(r => r && (r.status === 'pending' || r.status === 'accepted'))
      .map(r => r.mentor_id));
    setRequestedMentorIds(ids);
  }, [mentorshipRequests]);

  // Listen for requests created from other pages (e.g., mentor profile)
  useEffect(() => {
    const onCreated = (e) => {
      const mid = e?.detail?.mentorId;
      if (mid) {
        setRequestedMentorIds(prev => new Set([...(prev || new Set()), mid]));
      }
      // Reflect immediately in this screen
      setActiveTab('my-requests');
      loadMenteeRequests();
    };
    window.addEventListener('mentorship:request:created', onCreated);
    return () => window.removeEventListener('mentorship:request:created', onCreated);
  }, []);

  const expertiseOptions = [
    { value: 'all', label: 'All Expertise Areas' },
    { value: 'marine-engineering', label: 'Marine Engineering' },
    { value: 'naval-architecture', label: 'Naval Architecture' },
    { value: 'port-management', label: 'Port Management' },
    { value: 'maritime-law', label: 'Maritime Law' },
    { value: 'ship-operations', label: 'Ship Operations' },
    { value: 'logistics', label: 'Logistics' },
    { value: 'research', label: 'Research & Development' }
  ];

  const handleSendRequest = async (mentorObj) => {
    try {
      if (!user) {
        toast.error('Please sign in to request mentorship.');
        return;
      }

      const menteeId = profile?.id || user.id; // profiles.id equals auth user id in this schema
      const mentorId = mentorObj?.user_id;
      if (!mentorId) {
        toast.error('Unable to determine mentor profile.');
        return;
      }

      // Prevent mentors from joining their own mentorship as mentees
      if (mentorId === menteeId) {
        toast.error("You can’t join your own mentorship as a mentee.");
        return;
      }

      // Basic prompts for message/goals (kept simple for basic mode)
      const message = window.prompt('Write a short message to the mentor (why you want mentorship):', '');
      if (message === null) return; // user cancelled
      const goals = window.prompt('Optionally describe your goals (optional):', '') || '';

      await createRequestMutation.mutateAsync({ mentorId, message, goals });

      toast.success('Mentorship request sent!');
      // Optionally, switch to My Requests tab
      setActiveTab('my-requests');
    } catch (e) {
      // Errors are already mapped to user-friendly toasts inside the mutation
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  

  const filteredMentors = mentors.filter(mentor => {
    const matchesSearch = mentor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         mentor.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         mentor.expertise.some(exp => exp.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesExpertise = filters.expertise === 'all' || 
                            mentor.expertise.some(exp => 
                              exp.toLowerCase().replace(/\s+/g, '-').includes(filters.expertise.replace('all', ''))
                            );
    const matchesAccepting = !showOnlyAccepting || mentor.is_available_for_mentorship;
    return matchesSearch && matchesExpertise && matchesAccepting;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Mentorship Program</h1>
            <p className="text-gray-600">Connect with experienced professionals and advance your maritime career</p>
          </div>
          <div className="flex items-center gap-2">
            <Link 
              to="/mentorship/me"
              className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2 px-4 rounded-lg shadow-sm transition duration-150 ease-in-out"
            >
              My Mentorship
            </Link>
            {isMentorPending && (
              <div className="px-3 py-2 rounded-lg bg-yellow-100 text-yellow-800 text-sm font-semibold">
                Mentor application pending
              </div>
            )}
            {(() => {
              const role = getUserRole ? getUserRole() : undefined;
              if (role && role.toLowerCase() === 'student') return null;
              if (!isMentorApproved) {
                return (
                  <Link 
                    to="/mentorship/become-mentor"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out flex items-center"
                  >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Become a Mentor
                  </Link>
                );
              }
              return null;
            })()}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-card rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex">
            {(() => {
              const tabs = [];
              if (isApprovedMentee) {
                tabs.push({ id: 'find-mentors', label: 'Find Mentors', icon: MagnifyingGlassIcon });
                tabs.push({ id: 'my-requests', label: 'My Requests', icon: UserGroupIcon });
              }
              if (isApprovedMentor) {
                tabs.push({ id: 'my-mentoring', label: 'Mentor Dashboard', icon: AcademicCapIcon });
              }
              return tabs;
            })().map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center px-6 py-4 text-sm font-medium ${
                    activeTab === tab.id
                      ? 'text-ocean-600 border-b-2 border-ocean-600 bg-ocean-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Find Mentors Tab */}
          {activeTab === 'find-mentors' && (
            <div className="space-y-6">
              {/* Modern eligibility banners */}
              {(() => {
                const { approvalStatus, menteeStatus, mentorStatus, isDualRole, menteeReason, mentorReason, isApprovedMentee: eligMentee, isApprovedMentor: eligMentor } = mentorshipEligibility || {};
                if (!user) return null;

                return (
                  <div className="flex flex-col gap-3 mb-4">
                    {!eligMentee && (
                      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
                        <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 flex-shrink-0">
                          <span className="text-amber-700 text-sm">🎓</span>
                        </div>
                        <div className="flex-1 text-sm">
                          <div className="font-semibold text-amber-900">
                            Mentee access not ready yet
                          </div>
                          <p className="mt-0.5 text-amber-800">
                            {menteeReason || (
                              <>
                                Your mentee status is <span className="font-semibold">{menteeStatus || 'pending'}</span>.
                                You'll be able to request mentorship once your mentee status is approved by an admin in User Management.
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    )}

                    {!eligMentor && (
                      <div className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 shadow-sm">
                        <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 flex-shrink-0">
                          <span className="text-indigo-700 text-sm">⭐</span>
                        </div>
                        <div className="flex-1 text-sm">
                          <div className="font-semibold text-indigo-900">
                            Mentor profile not active yet
                          </div>
                          <p className="mt-0.5 text-indigo-800">
                            {mentorReason || (
                              <>
                                Your mentor status is currently <span className="font-semibold">{mentorStatus || 'pending'}</span>.
                                You'll start receiving mentorship requests once an admin approves your mentor profile in User Management.
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    )}

                    {eligMentee && eligMentor && (
                      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm">
                        <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 flex-shrink-0">
                          <span className="text-emerald-700 text-sm">✅</span>
                        </div>
                        <div className="flex-1 text-sm">
                          <div className="font-semibold text-emerald-900">
                            You're all set for mentorship
                          </div>
                          <p className="mt-0.5 text-emerald-800">
                            You can request mentors and also receive mentees. Use the tabs above to explore opportunities.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Search and Filters */}
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="form-input w-full pl-10 pr-4 py-2 rounded-lg"
                      placeholder="Search mentors by name, expertise, or company..."
                    />
                  </div>
                </div>

                <select
                  value={filters.expertise}
                  onChange={(e) => setFilters(prev => ({ ...prev, expertise: e.target.value }))}
                  className="form-input px-3 py-2 rounded-lg"
                >
                  {expertiseOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={showOnlyAccepting}
                    onChange={(e) => setShowOnlyAccepting(e.target.checked)}
                  />
                  Show accepting mentors
                </label>
              </div>

              {/* Results */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ocean-500"></div>
                  <h3 className="text-lg font-medium text-gray-700 mt-4">Loading mentors...</h3>
                </div>
              ) : error ? (
                <div className="bg-red-50 p-8 rounded-lg text-center">
                  <XCircleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-red-800 mb-2">Failed to load mentors</h3>
                  <p className="text-red-600 mb-6">{error}</p>
                  <button 
                    onClick={fetchApprovedMentors}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Try Again
                  </button>
                </div>
              ) : filteredMentors.length === 0 ? (
                <div className="bg-gray-50 p-8 rounded-lg text-center">
                  <UserGroupIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No mentors found</h3>
                  <p className="text-gray-600 mb-6">
                    Try adjusting your filters or search criteria
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-gray-600">
                      Found <span className="font-medium">{filteredMentors.length}</span> mentors
                    </p>
                    <select className="form-input px-3 py-1 rounded text-sm">
                      <option>Sort by Compatibility</option>
                      <option>Sort by Rating</option>
                      <option>Sort by Experience</option>
                      <option>Sort by Availability</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredMentors.map((mentor) => {
                      const req = mentorshipRequests.find((r) => r.mentor_id === mentor.user_id);
                      return (
                        <MentorCard
                          key={mentor.id}
                          mentor={mentor}
                          requested={requestedMentorIds.has(mentor.user_id) || !!req}
                          requestStatus={req?.status || null}
                          onRequestSuccess={() => {
                            setRequestedMentorIds(prev => new Set([...(prev || new Set()), mentor.user_id]));
                            setActiveTab('my-requests');
                            loadMenteeRequests();
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* My Requests Tab (mentee) */}
          {activeTab === 'my-requests' && (
            <ApprovedGuard require="approved-mentee">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Mentorship Requests</h3>
                {mentorshipRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <UserGroupIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No mentorship requests yet</h3>
                    <p className="text-gray-600 mb-4">Start by requesting mentorship from experienced professionals</p>
                    <button onClick={() => setActiveTab('find-mentors')} className="btn-ocean px-4 py-2 rounded-lg">Find Mentors</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {mentorshipRequests.map((r) => (
                      <div key={r.id} className={`border border-gray-200 rounded-lg p-6 ${r.status.startsWith('cancelled') || r.status === 'rejected' ? 'opacity-70' : ''}`} title={r.status.startsWith('cancelled') || r.status === 'rejected' ? 'This request is closed.' : ''}>
                        {r.status === 'cancelled_by_system' && (
                          <div className="mb-2 p-2 rounded bg-gray-50 text-gray-700 text-sm">This mentorship was closed because the mentor is no longer eligible.</div>
                        )}
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4 flex-1">
                            <img src={r.mentor.avatar_url || '/default-avatar.svg'} alt={r.mentor.full_name || 'Mentor'} className="w-12 h-12 rounded-full object-cover" />
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{r.mentor.full_name || 'Mentor'}</h4>
                              <p className="text-gray-600 text-sm mt-1">{new Date(r.created_at).toLocaleString()}</p>
                              {r.message && <p className="text-gray-700 text-sm mt-2">{r.message}</p>}
                            </div>
                          </div>
                          <RequestStatusChip status={r.status} />
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          {r.status === 'accepted' && (
                            <>
                              <button
                                type="button"
                                className="btn-ocean px-3 py-1.5 rounded"
                                onClick={async () => {
                                  try {
                                    if (!user?.id) {
                                      toast.error('You must be logged in to open chat.');
                                      return;
                                    }
                                    const otherUserId = r.mentor_id;
                                    if (!otherUserId) {
                                      toast.error('Unable to determine conversation partner.');
                                      return;
                                    }
                                    const threadId = await ensureDmThreadWith(otherUserId);
                                    navigate(`/messages?threadId=${encodeURIComponent(threadId)}&source=mentorship&requestId=${encodeURIComponent(r.id)}`);
                                  } catch (e) {
                                    logger.error('Chat open error:', e);
                                    toast.error('Could not open chat. Please try again.');
                                  }
                                }}
                              >
                                Open Chat
                              </button>
                              <Link to={`/mentorship/mentor/${r.mentor.id}`} className="btn-ocean-outline px-3 py-1.5 rounded">View Mentor</Link>
                            </>
                          )}
                          {r.status === 'pending' && (
                            <button
                              className="btn-ocean-outline px-3 py-1.5 rounded"
                              onClick={async () => {
                                try {
                                  await cancelRequestMutation.mutateAsync(r.id);
                                  toast.success('Request cancelled');
                                  await loadMenteeRequests();
                                } catch (_) {
                                  // Error toast already handled via mapMentorshipError
                                }
                              }}
                            >
                              Cancel Request
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ApprovedGuard>
          )}

          {/* My Mentoring Tab */}
          {activeTab === 'my-mentoring' && (
            <ApprovedGuard require="approved-mentor">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Mentor Dashboard</h3>

                {/* Requests Received */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-md font-medium text-gray-900">Requests Received</h4>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setMentorFilter('pending')} className={`text-sm ${mentorFilter==='pending' ? 'text-ocean-700 font-semibold' : 'text-ocean-600 hover:underline'}`}>Pending</button>
                      <span className="text-gray-400">|</span>
                      <button onClick={() => setMentorFilter('all')} className={`text-sm ${mentorFilter!=='pending' ? 'text-ocean-700 font-semibold' : 'text-ocean-600 hover:underline'}`}>All</button>
                    </div>
                  </div>
                  {mentorReqLoading ? (
                    <ListSkeleton rows={3} />
                  ) : mentorRequests.length === 0 ? (
                    <div className="text-center py-8 text-gray-600">No items yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {mentorRequests.map((r) => (
                        <div key={r.id} className="border border-gray-200 rounded-lg p-4 flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <img src={r.mentee.avatar_url || '/default-avatar.svg'} alt={r.mentee.full_name || 'Mentee'} className="w-10 h-10 rounded-full object-cover" />
                            <div>
                              <div className="font-medium text-gray-900">{r.mentee.full_name || 'Mentee'}</div>
                              <div className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</div>
                              {r.message && <div className="text-sm text-gray-700 mt-1">{r.message}</div>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <RequestStatusChip status={r.status} />
                            {r.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => acceptMutation.mutate(r.id)}
                                  className="btn-ocean px-3 py-1 rounded text-sm"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => rejectMutation.mutate(r.id)}
                                  className="btn-ocean-outline px-3 py-1 rounded text-sm"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ApprovedGuard>
          )}
        </div>
      </div>
    </div>
  );
};

// Mentor Card Component
const MentorCard = ({ mentor, requested = false, requestStatus = null, onRequestSuccess }) => {
  const isAvailable = mentor.is_available_for_mentorship === true;
  const total = typeof mentor.totalMentees === 'number' ? mentor.totalMentees : 0;
  const max = mentor.maxMentees ?? null;
  const atCapacity = max !== null && total >= max;
  const accepting = isAvailable && !atCapacity;

  let availabilityLabel = 'Unavailable';
  if (!isAvailable) {
    availabilityLabel = 'Not accepting mentees';
  } else if (atCapacity) {
    availabilityLabel = 'At capacity';
  } else {
    availabilityLabel = 'Accepting mentees';
  }

  const disabledReason = !accepting
    ? (!isAvailable
        ? 'This mentor is not accepting new mentees right now.'
        : 'This mentor has reached their current mentee limit.')
    : undefined;
  return (
    <div className="glass-card rounded-lg p-6 card-hover">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-4">
          <div className="relative">
            <img 
              src={mentor.avatar} 
              alt={mentor.name}
              className="w-16 h-16 rounded-full object-cover"
            />
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
              isAvailable ? 'bg-green-500' : 'bg-gray-500'
            }`}></div>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-lg">{mentor.name}</h3>
            <p className="text-ocean-600 font-medium">{mentor.title}</p>
            <p className="text-gray-600 text-sm">{mentor.company}</p>
            <div className="flex items-center mt-1">
              <MapPinIcon className="w-4 h-4 text-gray-400 mr-1" />
              <span className="text-gray-600 text-sm">{mentor.location}</span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-gray-700 text-sm mb-4 line-clamp-2">{mentor.bio}</p>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div className="flex items-center">
          <StarIcon className="w-4 h-4 text-yellow-500 mr-1" />
          <span className="font-medium">{mentor.rating}</span>
          <span className="text-gray-600 ml-1">
            Mentees: {total}
            {max !== null ? ` / ${max}` : ''}
          </span>
        </div>
        <div className="flex items-center">
          <ClockIcon className="w-4 h-4 text-gray-400 mr-1" />
          <span className="text-gray-600">{mentor.experience}</span>
        </div>
        <div className="flex items-center">
          <ChatBubbleLeftRightIcon className="w-4 h-4 text-gray-400 mr-1" />
          <span className="text-gray-600">{mentor.responseTime}</span>
        </div>
        <div className="flex items-center">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${accepting ? 'text-green-600 bg-green-100' : atCapacity ? 'text-orange-700 bg-orange-100' : 'text-gray-600 bg-gray-100'}`}>
            {availabilityLabel}
          </span>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Expertise</h4>
        <div className="flex flex-wrap gap-1">
          {mentor.expertise.slice(0, 3).map((skill, index) => (
            <span 
              key={index}
              className="px-2 py-1 bg-ocean-100 text-ocean-800 rounded text-xs"
            >
              {skill}
            </span>
          ))}
          {mentor.expertise.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
              +{mentor.expertise.length - 3}
            </span>
          )}
        </div>
      </div>

      {mentor.preferences && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Preferences</h4>
          <div className="flex flex-wrap gap-1 text-xs">
            {mentor.preferences.communication && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">Comm: {mentor.preferences.communication}</span>
            )}
            {mentor.preferences.format && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">Format: {mentor.preferences.format}</span>
            )}
            {mentor.preferences.duration && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">Duration: {mentor.preferences.duration}</span>
            )}
          </div>
        </div>
      )}

      <div className="mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Compatibility Score</span>
          <span className="font-medium text-ocean-600">{mentor.compatibilityScore}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
          <div 
            className="bg-ocean-500 h-2 rounded-full" 
            style={{ width: `${mentor.compatibilityScore}%` }}
          ></div>
        </div>
      </div>

      <div className="flex space-x-2">
        <Link 
          to={`/mentorship/mentor/${mentor.user_id}`}
          className="flex-1 btn-ocean-outline py-2 px-3 rounded text-sm text-center"
        >
          View Profile
        </Link>
        <ApprovedGuard require="approved-mentee" showBlockedMessage={false}>
          <RequestMentorshipButton
            mentorId={mentor.user_id}
            disabled={!accepting}
            disabledReason={disabledReason}
            requested={requested}
            requestStatus={requestStatus}
            onSuccess={onRequestSuccess}
          />
        </ApprovedGuard>
      </div>
    </div>
  );
};

// Small 3-row skeleton for lists
function ListSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200" />
            <div className="flex-1">
              <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Mentorship;