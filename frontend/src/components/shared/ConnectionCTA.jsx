import React, { useState } from 'react';
import { TextPill } from './Chips';
import { idempotentConnect, cancelPending, acceptPending, declinePending, removeConnection } from '../../utils/connections';
import { logActivity } from '../../utils/activityLogger';
import { MessageButton, RemoveButton, primaryButtonClasses } from './Buttons';
import { Loader2 } from 'lucide-react';
import logger from '../../utils/logger';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

// scope: 'directory' | 'profile'
// currentTab: 'all' | 'received' | 'sent' | 'connected' (optional outside Directory)
export default function ConnectionCTA({ meId, peerId, rel, currentTab = 'all', scope = 'directory', onChanged, onMessage, profileName = '' }) {
  const [busy, setBusy] = useState(false);
  const [overrideRel, setOverrideRel] = useState(null); // used to force immediate fallback after remove
  const [error, setError] = useState(null);

  // Frontend gating to mirror backend fc_is_fully_approved():
  // pending / not-fully-approved users can browse but must not initiate new connection requests.
  const { isFullyApproved, approvalStatus, isBlocked } = useAuth();

  const blockedGuard = () => {
    if (isBlocked) {
      toast.error('Your account is restricted and cannot perform this action');
      return true;
    }
    return false;
  };

  const safe = (fn) => async () => {
    if (!meId || !peerId || busy) return;
    setBusy(true);
    setError(null);
    try { 
      await fn(); 
      onChanged?.(); 
    } catch (err) {
      setError(err.message || 'Action failed');
      logger.error('Connection action error:', err);
    } finally { 
      setBusy(false); 
    }
  };

  const doConnect = async () => {
    if (blockedGuard()) return;
    if (!meId || !peerId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await idempotentConnect(meId, peerId, { status: effStatus, pending_side: effSide });
      onChanged?.();
      // Optimistically reflect as pending(sent)
      setOverrideRel({ status: 'pending', pending_side: 'sent' });
      logActivity({ action: 'connection_request', meta: { peer_id: peerId } }).catch(() => {});
    } catch (e) {
      // Treat conflict/duplicate as already pending (outgoing)
      const statusCode = e?.status || e?.code;
      if (statusCode === 409 || statusCode === '23505') {
        setOverrideRel({ status: 'pending', pending_side: 'sent' });
      } else {
        setError('Connection request failed');
        logger.error('Connect error:', e);
      }
    } finally {
      setBusy(false);
    }
  };
  
  const doCancel = safe(async () => {
    if (blockedGuard()) return;
    await cancelPending(meId, peerId);
    // Reset optimistic state
    setOverrideRel({ status: null, pending_side: null });
    logActivity({ action: 'connection_cancelled', meta: { peer_id: peerId } }).catch(() => {});
  });
  
  const doAccept = safe(async () => {
    if (blockedGuard()) return;
    await acceptPending(meId, peerId);
    logActivity({ action: 'connection_accepted', meta: { peer_id: peerId } }).catch(() => {});
  });
  const doDecline = safe(async () => {
    if (blockedGuard()) return;
    await declinePending(meId, peerId);
    logActivity({ action: 'connection_declined', meta: { peer_id: peerId } }).catch(() => {});
  });
  const doRemove = safe(async () => {
    if (blockedGuard()) return;
    await removeConnection(meId, peerId);
    // Immediately reflect as disconnected in UI
    setOverrideRel({ status: null, pending_side: null });
    logActivity({ action: 'connection_removed', meta: { peer_id: peerId } }).catch(() => {});
  });

  const effStatus = (overrideRel?.status ?? rel?.status) ?? null;
  const effSide = (overrideRel?.pending_side ?? rel?.pending_side) ?? null;

  const isConnected = (s) => ['accepted', 'connected'].includes(s);
  const nullishOrReset = !effStatus || ['declined', 'removed'].includes(effStatus);

  // Directory scope: simplified 3-state model
  if (scope === 'directory') {
    // State 1: No relationship → Connect button
    if (nullishOrReset) {
      return (
        <div className="w-full">
          <button
            type="button"
            onClick={isFullyApproved && !isBlocked ? doConnect : blockedGuard}
            disabled={!meId || busy || !isFullyApproved || isBlocked}
            className={`${primaryButtonClasses} w-full min-h-[44px]`}
            aria-label={profileName ? `Connect with ${profileName}` : 'Connect'}
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Connecting…
              </span>
            ) : !isFullyApproved ? (
              approvalStatus === 'pending'
                ? 'Pending approval – cannot connect'
                : 'Cannot connect'
            ) : (
              'Connect'
            )}
          </button>
          {(!isFullyApproved || isBlocked) && (
            <p className="mt-1 text-xs text-amber-700" role="note">
              {isBlocked
                ? 'Your account is currently restricted. You cannot send connection requests.'
                : approvalStatus === 'pending'
                ? 'Your account is pending approval. You can browse but cannot send new connection requests yet.'
                : 'You are not allowed to send new connection requests.'}
            </p>
          )}
          {error && (
            <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>
          )}
        </div>
      );
    }

    // State 2: Pending (we sent) → Request sent pill + Cancel link
    if (effStatus === 'pending' && effSide === 'sent') {
      return (
        <div className="w-full space-y-2">
          <TextPill>Request sent</TextPill>
          <button
            type="button"
            onClick={doCancel}
            disabled={!meId || busy}
            className="
              w-full min-h-[36px] py-2 text-sm font-medium
              text-slate-600 hover:text-slate-900 hover:underline
              rounded-md transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            aria-label={profileName ? `Cancel connection request to ${profileName}` : 'Cancel request'}
          >
            {busy ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Canceling…
              </span>
            ) : (
              'Cancel'
            )}
          </button>
          {error && (
            <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>
          )}
        </div>
      );
    }

    // State 3: Connected → Message button
    if (isConnected(effStatus)) {
      return (
        <div className="w-full">
          <button
            type="button"
            onClick={onMessage}
            disabled={!meId}
            className={`${primaryButtonClasses} w-full min-h-[44px]`}
            aria-label={profileName ? `Send message to ${profileName}` : 'Message'}
          >
            Message
          </button>
        </div>
      );
    }

    // Fallback: pending (they sent) - should not appear in directory, but handle gracefully
    if (effStatus === 'pending' && effSide === 'received') {
      return (
        <div className="w-full">
          <TextPill>Pending request</TextPill>
        </div>
      );
    }

    // Unknown state fallback
    return null;
  }

  // Profile scope: full feature set (Accept/Decline, Remove, etc.)
  const showAcceptDecline = scope === 'profile' && (currentTab === 'received' || (effStatus === 'pending' && effSide === 'received'));
  const showRequestSent = currentTab === 'sent' || (effStatus === 'pending' && effSide === 'sent');
  const showMessage = currentTab === 'connected' || isConnected(effStatus);
  const showConnect = scope === 'profile' && nullishOrReset;

  return (
    <div className="space-y-2 w-full">
      {showAcceptDecline && (
        <div className="flex gap-2">
          <button 
            onClick={doAccept} 
            disabled={!meId || busy} 
            className="btn-ocean flex-1 min-h-[44px] py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
            aria-label={profileName ? `Accept connection from ${profileName}` : 'Accept'}
          >
            {busy ? 'Accepting…' : 'Accept'}
          </button>
          <button 
            onClick={doDecline} 
            disabled={!meId || busy} 
            className="btn-outline flex-1 min-h-[44px] py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
            aria-label={profileName ? `Decline connection from ${profileName}` : 'Decline'}
          >
            {busy ? 'Declining…' : 'Decline'}
          </button>
        </div>
      )}

      {showRequestSent && (
        <>
          <TextPill>Request sent</TextPill>
          <button
            onClick={doCancel}
            disabled={!meId || busy}
            className="w-full min-h-[36px] py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline rounded-md disabled:opacity-50"
            aria-label="Cancel request"
          >
            {busy ? 'Canceling…' : 'Cancel'}
          </button>
        </>
      )}

      {showMessage && (
        <div className="flex gap-2">
          <MessageButton onClick={onMessage} disabled={!meId} />
          <RemoveButton onClick={doRemove} disabled={!meId} loading={busy} />
        </div>
      )}

      {showConnect && (
        <button 
          onClick={isFullyApproved ? doConnect : undefined}
          disabled={!meId || busy || !isFullyApproved}
          className={`${primaryButtonClasses} w-full min-h-[44px]`}
          aria-label={profileName ? `Connect with ${profileName}` : 'Connect'}
        >
          {busy
            ? 'Connecting…'
            : !isFullyApproved
              ? (approvalStatus === 'pending'
                  ? 'Pending approval – cannot connect'
                  : 'Cannot connect')
              : 'Connect'}
        </button>
      )}

      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>
      )}
    </div>
  );
}
