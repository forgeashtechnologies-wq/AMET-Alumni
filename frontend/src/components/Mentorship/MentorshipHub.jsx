import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMentorshipRoleContext } from '../../hooks/useMentorshipRoleContext.js';

// Panel imports (to be created)
import FindMentorsPanel from './panels/FindMentorsPanel';
import MyMentorsPanel from './panels/MyMentorsPanel';
import MyMenteesPanel from './panels/MyMenteesPanel';
import RequestsPanel from './panels/RequestsPanel';
import MentorshipSettingsPanel from './panels/MentorshipSettingsPanel';

/**
 * Central hub for the Mentorship module.
 * Reads tab/sub/mode from URL and renders the appropriate panel.
 * Applies role-aware default tab logic.
 */
export default function MentorshipHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const roleContext = useMentorshipRoleContext();
  
  // Read query params
  const tabParam = searchParams.get('tab');
  const sub = searchParams.get('sub');
  const mode = searchParams.get('mode');
  const highlightRequestId = searchParams.get('highlightRequestId');
  const highlightRelationshipId = searchParams.get('highlightRelationshipId');
  
  // Determine default tab based on role when tab param is missing
  const defaultTab = useMemo(() => {
    const {
      isDualRole,
      hasMentorProfile,
      isMenteeApproved,
      menteeActiveCount,
      menteeRequestsSentCount,
      menteeRequestsReceivedCount,
    } = roleContext;
    
    // Dual-role: prioritize requests if any pending
    if (isDualRole) {
      const hasPendingRequests = 
        (menteeRequestsSentCount && menteeRequestsSentCount > 0) ||
        (menteeRequestsReceivedCount && menteeRequestsReceivedCount > 0);
      
      return hasPendingRequests ? 'requests' : 'mentee';
    }
    
    // Mentor-only: show mentees
    if (hasMentorProfile && !isMenteeApproved) {
      return 'mentor';
    }
    
    // Mentee-only: show find if no active mentors, else show mentors
    if (isMenteeApproved && !hasMentorProfile) {
      const hasActiveMentors = menteeActiveCount && menteeActiveCount > 0;
      const hasSentRequests = menteeRequestsSentCount && menteeRequestsSentCount > 0;
      
      return (hasActiveMentors || hasSentRequests) ? 'mentee' : 'find';
    }
    
    // Fallback: find mentors
    return 'find';
  }, [roleContext]);
  
  const activeTab = tabParam || defaultTab;
  
  // Render appropriate panel
  const renderPanel = () => {
    switch (activeTab) {
      case 'find':
        return <FindMentorsPanel />;
      
      case 'mentee':
        return (
          <MyMentorsPanel 
            highlightRelationshipId={highlightRelationshipId}
          />
        );
      
      case 'mentor':
        return (
          <MyMenteesPanel 
            highlightRelationshipId={highlightRelationshipId}
          />
        );
      
      case 'requests':
        return (
          <RequestsPanel 
            sub={sub || 'sent'} 
            highlightRequestId={highlightRequestId}
          />
        );
      
      case 'settings':
        // Default mode for settings when not explicitly specified
        // If user has a mentor profile, prefer mentor settings; otherwise mentee settings.
        {
          const effectiveMode =
            mode || (roleContext?.hasMentorProfile ? 'mentor' : 'mentee');
          return <MentorshipSettingsPanel mode={effectiveMode} />;
        }
      
      default:
        return <FindMentorsPanel />;
    }
  };
  
  return (
    <div className="mentorship-hub">
      {renderPanel()}
    </div>
  );
}
