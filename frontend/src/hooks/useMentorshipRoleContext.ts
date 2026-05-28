import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';

export type MentorshipRoleContext = {
  isStudent: boolean;
  isAlumni: boolean;
  isMenteeApproved: boolean;
  hasMentorProfile: boolean;
  mentorStatus: 'pending' | 'approved' | 'rejected' | null;
  isDualRole: boolean;
  
  // Optional summary counts
  menteeActiveCount?: number;
  menteeRequestsSentCount?: number;
  menteeRequestsReceivedCount?: number;
  mentorCapacity?: number;
  mentorCurrentMentees?: number;
};

/**
 * Central hook for mentorship role/status information.
 * Used by tabs, banners, and hub to determine what UI to show.
 */
export function useMentorshipRoleContext(): MentorshipRoleContext {
  const auth = useAuth() as any; // Type assertion needed due to AuthContext typing
  const { user, profile, approvalStatus } = auth;
  
  // Fetch mentor profile if user is authenticated
  const { data: mentorProfile } = useQuery({
    queryKey: ['mentor-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('mentors')
        .select('status, max_mentees, current_mentees')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching mentor profile:', error);
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
      const [sentRequests, receivedRequests, asmenteeRels, asMentorRels] = await Promise.all([
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
        activeMentors: asMentorRels.count || 0,
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
      mentorCurrentMentees: mentorProfile?.current_mentees || summary?.activeMentees,
    };
  }, [profile, approvalStatus, mentorProfile, summary]);
}
