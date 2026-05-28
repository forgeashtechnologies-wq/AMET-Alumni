import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import logger from '../utils/logger';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';

/**
 * Central hook for mentorship role/status information.
 * Used by tabs, banners, and hub to determine what UI to show.
 * 
 * @returns {Object} Role context object
 * @property {boolean} isStudent
 * @property {boolean} isAlumni
 * @property {boolean} isMenteeApproved
 * @property {boolean} hasMentorProfile
 * @property {string|null} mentorStatus - 'pending' | 'approved' | 'rejected' | null
 * @property {boolean} isDualRole
 * @property {number} [menteeActiveCount]
 * @property {number} [menteeRequestsSentCount]
 * @property {number} [menteeRequestsReceivedCount]
 * @property {number} [mentorCapacity]
 * @property {number} [mentorCurrentMentees]
 */
export function useMentorshipRoleContext() {
  const { user, profile, approvalStatus } = useAuth();
  
  // Fetch mentor profile if user is authenticated
  const { data: mentorProfile } = useQuery({
    queryKey: ['mentor-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('mentors')
        .select('status, max_mentees')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        logger.error('Error fetching mentor profile:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch mentorship summary counts
  const { data: summary } = useQuery({
    queryKey: ['mentorship-summary', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Fetch counts in parallel
      const [sentRequests, receivedRequests, asMenteeRels, asMentorRels] = await Promise.all([
        supabase
          .from('mentorship_requests')
          .select('id', { count: 'exact', head: true })
          .eq('mentee_id', user.id)
          .eq('status', 'pending'),
        
        supabase
          .from('mentorship_requests')
          .select('id', { count: 'exact', head: true })
          .eq('mentor_id', user.id)
          .eq('status', 'pending'),
        
        supabase
          .from('mentorship_relationships')
          .select('id', { count: 'exact', head: true })
          .eq('mentee_id', user.id)
          .eq('status', 'active'),
        
        supabase
          .from('mentorship_relationships')
          .select('id', { count: 'exact', head: true })
          .eq('mentor_id', user.id)
          .eq('status', 'active'),
      ]);
      
      return {
        sentCount: sentRequests.count || 0,
        receivedCount: receivedRequests.count || 0,
        activeMentors: asMenteeRels.count || 0,
        activeMentees: asMentorRels.count || 0,
      };
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
  
  return useMemo(() => {
    const role = profile?.role || 'alumni';
    const isStudent = role === 'student';
    const isAlumni = role === 'alumni' || role === 'user';
    
    // Mentee approval based on profile approval status
    const isMenteeApproved = approvalStatus === 'approved';
    
    // Mentor profile existence and status
    const hasMentorProfile = !!mentorProfile;
    const mentorStatus = mentorProfile?.status || null;
    
    // Dual role: both mentee-approved AND has mentor profile
    const isDualRole = isMenteeApproved && hasMentorProfile;
    
    return {
      isStudent,
      isAlumni,
      isMenteeApproved,
      hasMentorProfile,
      mentorStatus,
      isDualRole,
      
      // Summary counts
      menteeActiveCount: summary?.activeMentors,
      menteeRequestsSentCount: summary?.sentCount,
      menteeRequestsReceivedCount: summary?.receivedCount,
      mentorCapacity: mentorProfile?.max_mentees,
      mentorCurrentMentees: summary?.activeMentees,
    };
  }, [profile, approvalStatus, mentorProfile, summary]);
}
