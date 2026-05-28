import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOpenMentorshipChat } from '../../../hooks/useOpenMentorshipChat';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import { toast } from 'react-hot-toast';
import logger from '../../../utils/logger';
import { MENTORSHIP_COPY } from '../../../constants/mentorshipCopy';
import MentorshipStatusChip from '../MentorshipStatusChip';
import { 
  endMentorshipRelationship, 
  endAllMentorshipsWithUser, 
  fullDisconnectFromUser 
} from '../../../api/mentorshipApi';
import { mapMentorshipError } from '../../../services/mentorship';

/**
 * Card component for mentorship relationships (active and past).
 * Shows different UI based on whether user is mentee or mentor.
 * 
 * @param {Object} props
 * @param {'mentee'|'mentor'} props.role - User's role in this relationship
 * @param {Object} props.otherUser - The other user in the relationship
 * @param {string} props.status - Relationship status (active, completed, terminated)
 * @param {string} props.relationshipId - Relationship ID
 * @param {string} [props.startedAt] - When relationship started
 * @param {string} [props.endedAt] - When relationship ended
 * @param {boolean} [props.hasMessages] - Whether there are messages in DM
 * @param {Function} [props.onEndMentorship] - Handler for ending mentorship
 * @param {boolean} [props.highlighted] - Whether to highlight this card
 */
export default function MentorshipRelationshipCard({
  role,
  otherUser,
  status,
  relationshipId,
  startedAt,
  endedAt,
  hasMessages = false,
  onEndMentorship,
  highlighted = false,
}) {
  const navigate = useNavigate();
  const { openChat, loadingId } = useOpenMentorshipChat();
  const statusCopy = MENTORSHIP_COPY.chips.statuses.relationship;
  const roleCopy = MENTORSHIP_COPY.chips.roles;
  const buttonCopy = MENTORSHIP_COPY.buttons;
  const dialogCopy = MENTORSHIP_COPY.dialogs.endMentorship;
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [endChoice, setEndChoice] = useState('single'); // 'single' | 'all' | 'disconnect'
  const [isEnding, setIsEnding] = useState(false);
  
  const isActive = status === 'active';
  const isCompleted = status === 'completed';
  const isEnded = status === 'ended_by_mentor' || status === 'ended_by_mentee' || status === 'ended_by_system';
  
  const isMentee = role === 'mentee';
  
  // Status chip via shared component
  const getStatusChip = () => {
    if (isActive || isCompleted || isEnded) {
      return <MentorshipStatusChip type="relationship" status={status} />;
    }
    return null;
  };
  
  const getRoleChip = () => {
    if (isMentee) {
      return (
        <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
          {roleCopy.mentor.label}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
        {roleCopy.mentee.label}
      </span>
    );
  };
  
  const handleNameClick = () => {
    if (!otherUser?.id) return;

    if (isMentee) {
      // Viewer is mentee, otherUser is mentor → mentorship profile
      navigate(`/mentorship/mentor/${otherUser.id}`);
    } else {
      // Viewer is mentor, otherUser is mentee → standard alumni profile
      navigate(`/profile/${otherUser.id}`);
    }
  };

  const handleOpenChat = async () => {
    if (!relationshipId) return;

    const result = await openChat(relationshipId);
    if (result && result.message) {
      toast.error(result.message);
    }
  };
  
  const handleEndMentorship = async () => {
    if (!otherUser?.id) {
      toast.error('Unable to end mentorship: user information missing');
      return;
    }

    setIsEnding(true);
    try {
      if (endChoice === 'single') {
        await endMentorshipRelationship(relationshipId);
        toast.success('Mentorship ended successfully');
      } else if (endChoice === 'all') {
        await endAllMentorshipsWithUser(otherUser.id);
        toast.success('All mentorships with this person ended');
      } else if (endChoice === 'disconnect') {
        await fullDisconnectFromUser(otherUser.id);
        toast.success('Disconnected successfully');
      }

      // Trigger parent refetch
      if (onEndMentorship) {
        onEndMentorship();
      }

      setShowEndConfirm(false);
      setShowMenu(false);
    } catch (error) {
      logger.error('Error ending mentorship:', error);
      const { code, message } = mapMentorshipError(error);
      if (code === 'ALREADY_ENDED') {
        toast.success('This mentorship is already ended.');
      } else {
        toast.error(message || 'Failed to end mentorship');
      }
    } finally {
      setIsEnding(false);
    }
  };
  
  return (
    <div
      className={clsx(
        'border rounded-xl p-4 bg-white shadow-sm',
        'flex flex-col sm:flex-row sm:items-center gap-4',
        'transition-all duration-200',
        highlighted && 'ring-2 ring-blue-500 ring-offset-2',
        'hover:shadow-md',
        !isActive && 'opacity-75'
      )}
    >
      {/* User Info */}
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {otherUser?.avatar_url ? (
            <img
              src={otherUser.avatar_url}
              alt={otherUser.full_name || otherUser.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
              <span className="text-slate-600 font-semibold text-lg">
                {(otherUser?.full_name || otherUser?.name || '?')[0].toUpperCase()}
              </span>
            </div>
          )}
        </div>
        
        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <button
              type="button"
              onClick={handleNameClick}
              className="text-left text-base font-semibold text-slate-900 truncate hover:underline focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 rounded"
            >
              {otherUser?.full_name || otherUser?.name || 'Unknown User'}
            </button>
            {getRoleChip()}
            {getStatusChip()}
          </div>
          
          {otherUser?.current_job_title && (
            <p className="text-sm text-slate-600 truncate">
              {otherUser.current_job_title}
              {otherUser.company_name && ` at ${otherUser.company_name}`}
            </p>
          )}
          
          <p className="text-xs text-slate-500 mt-1">
            {isActive && startedAt && `Started ${formatDistanceToNow(new Date(startedAt), { addSuffix: true })}`}
            {!isActive && endedAt && `Ended ${formatDistanceToNow(new Date(endedAt), { addSuffix: true })}`}
          </p>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Primary CTA: Open Chat */}
        <button
          onClick={handleOpenChat}
          disabled={loadingId === relationshipId || !relationshipId}
          className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors min-h-[36px]"
        >
          {loadingId === relationshipId
            ? buttonCopy.chat.opening
            : hasMessages
              ? buttonCopy.chat.openChat
              : buttonCopy.chat.sendFirstMessage}
        </button>
        
        {/* Menu for Active Relationships */}
        {isActive && onEndMentorship && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="inline-flex items-center justify-center rounded-md p-2 text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="More options"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            
            {showMenu && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                
                {/* Menu */}
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                  {!showEndConfirm ? (
                    <button
                      onClick={() => setShowEndConfirm(true)}
                      className="w-full text-left px-4 py-2 text-sm text-rose-700 hover:bg-rose-50 transition-colors"
                    >
                      End Mentorship…
                    </button>
                  ) : (
                    <div className="px-4 py-3 space-y-3">
                      <p className="text-sm text-slate-900 font-semibold">
                        How would you like to end this mentorship?
                      </p>
                      
                      {/* Option 1: End only this program */}
                      <label className="flex items-start gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer">
                        <input
                          type="radio"
                          name="endChoice"
                          value="single"
                          checked={endChoice === 'single'}
                          onChange={(e) => setEndChoice(e.target.value)}
                          className="mt-0.5 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900">
                            End only this program mentorship
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            Other programs with this person stay active. You stay connected and can still chat.
                          </div>
                        </div>
                      </label>

                      {/* Option 2: End all mentorships */}
                      <label className="flex items-start gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer">
                        <input
                          type="radio"
                          name="endChoice"
                          value="all"
                          checked={endChoice === 'all'}
                          onChange={(e) => setEndChoice(e.target.value)}
                          className="mt-0.5 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900">
                            End all mentorships with this person
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            Ends all active mentorships, but you stay connected and can still chat.
                          </div>
                        </div>
                      </label>

                      {/* Option 3: End all + disconnect */}
                      <label className="flex items-start gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer">
                        <input
                          type="radio"
                          name="endChoice"
                          value="disconnect"
                          checked={endChoice === 'disconnect'}
                          onChange={(e) => setEndChoice(e.target.value)}
                          className="mt-0.5 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900">
                            End all mentorships + disconnect
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            Ends all mentorships, removes your connection, and makes chat read-only (view only).
                          </div>
                        </div>
                      </label>

                      <div className="flex gap-2 pt-2 border-t border-slate-200">
                        <button
                          onClick={handleEndMentorship}
                          disabled={isEnding}
                          className="flex-1 inline-flex items-center justify-center rounded px-3 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                        >
                          {isEnding ? 'Ending...' : 'Continue'}
                        </button>
                        <button
                          onClick={() => {
                            setShowEndConfirm(false);
                            setEndChoice('single');
                          }}
                          disabled={isEnding}
                          className="flex-1 inline-flex items-center justify-center rounded px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
