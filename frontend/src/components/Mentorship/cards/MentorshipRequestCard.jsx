import React, { useState } from 'react';
import { useOpenMentorshipChat } from '../../../hooks/useOpenMentorshipChat';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import { MENTORSHIP_COPY } from '../../../constants/mentorshipCopy';
import MentorshipStatusChip from '../MentorshipStatusChip';

/**
 * Card component for mentorship requests (both sent and received).
 * Handles pending, accepted, rejected, and cancelled states.
 * 
 * @param {Object} props
 * @param {'sent'|'received'} props.direction - Whether this is a sent or received request
 * @param {Object} props.otherUser - The other user (mentor if sent, mentee if received)
 * @param {string} props.status - Request status
 * @param {string} props.requestId - Request ID
 * @param {string} props.createdAt - Request creation timestamp
 * @param {string} [props.relationshipId] - Relationship ID if accepted
 * @param {Function} [props.onAccept] - Handler for accepting request
 * @param {Function} [props.onReject] - Handler for rejecting request
 * @param {Function} [props.onCancel] - Handler for cancelling request
 * @param {boolean} [props.highlighted] - Whether to highlight this card
 */
export default function MentorshipRequestCard({
  direction,
  otherUser,
  status,
  requestId,
  createdAt,
  relationshipId,
  onAccept,
  onReject,
  onCancel,
  highlighted = false,
}) {
  const { openChat, loadingId } = useOpenMentorshipChat();
  const statusCopy = MENTORSHIP_COPY.chips.statuses.request;
  const buttonCopy = MENTORSHIP_COPY.buttons;
  const dialogCopy = MENTORSHIP_COPY.dialogs.rejectRequest;
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  
  const isSent = direction === 'sent';
  const isPending = status === 'pending';
  const isAccepted = status === 'accepted';
  const isRejected = status === 'rejected';
  const isCancelled = status === 'cancelled_by_user' || status === 'cancelled_by_system';
  
  // Status chip via shared component
  const getStatusChip = () => (
    <MentorshipStatusChip type="request" status={status} />
  );
  
  const handleOpenChat = () => {
    if (relationshipId) {
      openChat(relationshipId);
    }
  };
  
  const handleReject = () => {
    if (onReject) {
      onReject();
      setShowRejectConfirm(false);
    }
  };
  
  return (
    <div
      className={clsx(
        'border rounded-xl p-4 bg-white shadow-sm',
        'flex flex-col sm:flex-row sm:items-center gap-4',
        'transition-all duration-200',
        highlighted && 'ring-2 ring-blue-500 ring-offset-2',
        'hover:shadow-md'
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
            <h3 className="text-base font-semibold text-slate-900 truncate">
              {otherUser?.full_name || otherUser?.name || 'Unknown User'}
            </h3>
            {getStatusChip()}
          </div>
          
          {otherUser?.current_job_title && (
            <p className="text-sm text-slate-600 truncate">
              {otherUser.current_job_title}
              {otherUser.company_name && ` at ${otherUser.company_name}`}
            </p>
          )}
          
          <p className="text-xs text-slate-500 mt-1">
            {isSent ? 'Requested' : 'Received'} {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0 sm:flex-col sm:items-end">
        {/* Sent + Pending: Cancel */}
        {isSent && isPending && onCancel && (
          <button
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors min-h-[36px]"
          >
            {buttonCopy.mentorship.cancelRequest}
          </button>
        )}
        
        {/* Received + Pending: Accept/Reject */}
        {!isSent && isPending && (
          <>
            {!showRejectConfirm ? (
              <div className="flex gap-2">
                <button
                  onClick={onAccept}
                  className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors min-h-[36px]"
                >
                  {buttonCopy.mentorship.acceptRequest}
                </button>
                <button
                  onClick={() => setShowRejectConfirm(true)}
                  className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors min-h-[36px]"
                >
                  {buttonCopy.mentorship.rejectRequest}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 p-2 bg-rose-50 rounded-md border border-rose-200">
                <p className="text-xs text-rose-900 font-medium">{dialogCopy.title}</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleReject}
                    className="inline-flex items-center justify-center rounded px-2 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors"
                  >
                    {dialogCopy.confirmLabel}
                  </button>
                  <button
                    onClick={() => setShowRejectConfirm(false)}
                    className="inline-flex items-center justify-center rounded px-2 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors"
                  >
                    {dialogCopy.cancelLabel}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Accepted: Open Chat */}
        {isAccepted && relationshipId && (
          <button
            onClick={handleOpenChat}
            disabled={loadingId === relationshipId}
            className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors min-h-[36px]"
          >
            {loadingId === relationshipId ? buttonCopy.chat.opening : buttonCopy.chat.openChat}
          </button>
        )}
      </div>
    </div>
  );
}
