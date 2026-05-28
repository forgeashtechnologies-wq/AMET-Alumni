import React, { useState } from 'react';
import { supabase } from '../utils/supabase';
import { idempotentConnect, acceptPending, declinePending } from '../utils/connections';
import logger from '../utils/logger';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { useNavigate } from 'react-router-dom';
import { mapDmErrorToMessage } from '../api/dm';
import toast from 'react-hot-toast';
import {
  MapPinIcon,
  AcademicCapIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  CheckBadgeIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import Avatar from './common/Avatar';
import { useAuth } from '../contexts/AuthContext';
import { formatBatchLabel } from '../utils/batchYear';

function Chip({ icon: Icon, children }) {
  if (!children) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
      {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
      <span className="max-w-[160px] truncate" title={typeof children === 'string' ? children : undefined}>
        {children}
      </span>
    </span>
  );
}

export default function AlumniProfileCard({ profile, currentUserId, avatarUrl }) {
  const navigate = useNavigate();
  // status: 'idle' | 'pending' | 'accepted' | 'connected'
  // direction: 'sent' | 'received' | null
  const { status, direction, isLoading, refreshStatus } = useConnectionStatus(currentUserId, profile.id);
  const [actionLoading, setActionLoading] = useState(false);
  const { isFullyApproved, approvalStatus } = useAuth();

  const {
    full_name,
    avatar_url,
    batch_year, // prefer this; fallback to batch
    batch,
    graduation_year,
    expected_graduation_year,
    department,
    company_name,
    current_job_title,
    location,
    is_verified,
  } = profile;

  // Resolve avatar src: prefer prop from hook, fallback to profile data, then default
  const avatarSrc = avatarUrl || avatar_url || '/default-avatar.svg';

  // Use COALESCE logic matching backend view
  const displayBatch = graduation_year ?? expected_graduation_year ?? batch_year ?? batch;

  // Determine sender/receiver based on hook-provided direction when pending
  const isSender = status === 'pending' && direction === 'sent';
  const isReceiver = status === 'pending' && direction === 'received';

  const handleConnect = async () => {
    setActionLoading(true);
    try {
      // Map hook status/direction to rel shape for idempotent helper
      const rel = !status ? { status: null, pending_side: null } : (
        status === 'pending' ? { status: 'pending', pending_side: direction === 'sent' ? 'sent' : 'received' } : { status, pending_side: null }
      );
      await idempotentConnect(currentUserId, profile.id, rel);
      refreshStatus(); // reflect immediately
    } catch (error) {
      // Swallow duplicates and refresh; log unexpected
      const code = error?.code || error?.status || error?.message;
      if (code !== '23505' && code !== 409 && !(typeof code === 'string' && code.includes('duplicate'))) {
        logger.error('Error connecting:', error);
      }
      refreshStatus();
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      await acceptPending(currentUserId, profile.id);
      refreshStatus();
    } catch (error) {
      logger.error('Error accepting:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    setActionLoading(true);
    try {
      await declinePending(currentUserId, profile.id);
      refreshStatus();
    } catch (error) {
      logger.error('Error declining:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMessage = async () => {
    try {
      // Use verified RPC name from SQL: get_or_create_conversation(user_1_id, user_2_id)
      const { data, error } = await supabase.rpc('get_or_create_conversation', {
        user_1_id: currentUserId,
        user_2_id: profile.id,
      });
      if (error) throw error;
      // Assuming data has conversation_id, redirect to messages
      navigate(`/messages?conversation=${data}`);
    } catch (error) {
      logger.error('Error starting conversation:', error);
      const msg = mapDmErrorToMessage(error);
      toast.error(msg);
    }
  };

  const handleViewProfile = () => {
    navigate(`/directory/${profile.id}`);
  };

  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 h-32 rounded-2xl"></div>;
  }

  return (
    <div className="relative flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm hover:shadow-md hover:border-sky-200 ring-1 ring-transparent hover:ring-sky-50 transition">
      {/* subtle top accent */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-sky-500/0 via-sky-500/30 to-sky-500/0" />

      <div className="grid grid-cols-2 gap-4 h-full">
        {/* Left Side: Avatar and Details */}
        <div className="flex flex-col items-center">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full ring-2 ring-slate-200 bg-slate-100 mb-2 flex items-center justify-center">
            <Avatar src={avatarSrc} alt={full_name || 'Profile'} size={64} />
          </div>

          <div className="text-center">
            <h3 className="line-clamp-1 text-[15px] font-semibold leading-6 text-slate-900" title={full_name}>
              {full_name || '—'}
            </h3>
            {is_verified && <CheckBadgeIcon className="h-4 w-4 text-sky-600 mx-auto mt-1" title="Verified" />}

            {displayBatch && (
              <span className="inline-block mt-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
                {formatBatchLabel(displayBatch)}
              </span>
            )}

            <div className="mt-3 space-y-1">
              {department && (
                <Chip icon={AcademicCapIcon}>{department}</Chip>
              )}
              {company_name && (
                <Chip>{company_name}</Chip>
              )}
              {current_job_title && (
                <Chip>{current_job_title}</Chip>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Actions */}
        <div className="flex flex-col justify-center items-center space-y-2">
          {status === 'accepted' || status === 'connected' ? (
            <button
              onClick={handleMessage}
              className="w-full inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              disabled={actionLoading}
            >
              Message
            </button>
          ) : status === 'pending' ? (
            isSender ? (
              <div className="w-full inline-flex items-center justify-center rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600">
                Request Sent
              </div>
            ) : isReceiver ? (
              <div className="w-full flex space-x-2">
                <button
                  onClick={handleAccept}
                  className="flex-1 inline-flex items-center justify-center rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                  disabled={actionLoading}
                >
                  Accept
                </button>
                <button
                  onClick={handleDecline}
                  className="flex-1 inline-flex items-center justify-center rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                  disabled={actionLoading}
                >
                  Decline
                </button>
              </div>
            ) : (
              <div className="w-full inline-flex items-center justify-center rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600">
                Pending
              </div>
            )
          ) : (
            <button
              onClick={isFullyApproved ? handleConnect : undefined}
              className="w-full inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              disabled={actionLoading || !isFullyApproved}
            >
              <UserPlusIcon className="h-4 w-4 mr-2" />
              {isFullyApproved
                ? 'Connect'
                : approvalStatus === 'pending'
                  ? 'Pending approval – cannot connect'
                  : 'Cannot connect'}
            </button>
          )}

          <button
            onClick={handleViewProfile}
            className="w-full inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            View Profile
          </button>
          {!isFullyApproved && (
            <p className="mt-1 text-xs text-amber-700 text-center" role="note">
              {approvalStatus === 'pending'
                ? 'Your account is pending approval. You can browse alumni but cannot send new connection requests yet.'
                : 'You are not allowed to send new connection requests.'}
            </p>
          )}
        </div>
      </div>

      {/* Chips row for location (if needed) */}
      {location && (
        <div className="mt-4 flex justify-center">
          <Chip icon={MapPinIcon}>{location}</Chip>
        </div>
      )}
    </div>
  );
}
