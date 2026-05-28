// frontend/src/hooks/useOpenMentorshipChat.js
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { openMentorshipChat as openMentorshipChatApi } from '../api/mentorshipApi';
import { mapMentorshipError } from '../utils/mentorshipErrorMap';

/**
 * Canonical hook for opening mentorship-related DM chats.
 *
 * - Calls mentorship_open_chat via the mentorshipApi wrapper
 * - Navigates to /messages with mentorship context
 * - Returns structured errors for callers to show toasts/inline UI
 * 
 * This is the ONLY way mentorship components should open chat.
 * Never call ensureDmThreadWith directly for mentorship contexts.
 * 
 * @returns {Object} Hook result
 * @property {Function} openChat - Function to open chat (takes relationshipId)
 * @property {string|null} loadingId - Currently loading relationship ID
 * @property {Object|null} lastError - Last error { code, message }
 */
export function useOpenMentorshipChat() {
  const navigate = useNavigate();
  const [loadingId, setLoadingId] = useState(null);
  const [lastError, setLastError] = useState(null);

  const openChat = useCallback(
    async (relationshipId) => {
      if (!relationshipId) {
        const err = {
          code: 'UNKNOWN',
          message: 'Cannot open chat: mentorship relationship not found.',
        };
        setLastError(err);
        return err;
      }

      setLoadingId(relationshipId);
      setLastError(null);

      try {
        const { conversationId } = await openMentorshipChatApi(relationshipId);

        const params = new URLSearchParams({
          conversationId,
          source: 'mentorship',
          relationshipId,
        });

        navigate(`/messages?${params.toString()}`);
        return null;
      } catch (error) {
        const mapped = mapMentorshipError(error);
        setLastError(mapped);
        return mapped;
      } finally {
        setLoadingId((current) =>
          current === relationshipId ? null : current
        );
      }
    },
    [navigate]
  );

  return {
    openChat,
    loadingId,
    lastError,
  };
}
