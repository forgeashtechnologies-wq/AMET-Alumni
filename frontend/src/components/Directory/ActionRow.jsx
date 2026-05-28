import React, { useMemo, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { idempotentConnect, cancelPending, acceptPending, declinePending, removeConnection } from '../../utils/connections';
import ShareProfileModal from './ShareProfileModal';
import { useAuth } from '../../contexts/AuthContext';

export default function ActionRow({ meId, otherId, rel, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const { isFullyApproved, approvalStatus } = useAuth();
  const profileUrl = useMemo(() => `${window.location.origin}/directory/${otherId}`, [otherId]);
  const rawStatus = rel?.status ?? null;
  const side = rel?.pending_side ?? null;
  // Treat 'removed' and 'declined' as no active connection (idle)
  const status = (rawStatus === 'removed' || rawStatus === 'declined') ? null : rawStatus;

  const safeRun = async (fn) => {
    try {
      setBusy(true);
      await fn();
    } finally {
      setBusy(false);
      onChanged?.();
    }
  };

  const connect = async () => safeRun(async () => {
    await idempotentConnect(meId, otherId, rel);
  });

  const cancel = async () => safeRun(async () => {
    await cancelPending(meId, otherId);
  });

  const accept = async () => safeRun(async () => {
    await acceptPending(meId, otherId);
  });

  const decline = async () => safeRun(async () => {
    await declinePending(meId, otherId);
  });

  const remove = async () => safeRun(async () => {
    await removeConnection(meId, otherId);
  });

  const message = () => {
    window.location.href = `/messages?peer=${otherId}`;
  };

  const share = async () => {
    setShareOpen(true);
  };

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {!status && (
        <button
          className="btn-ocean px-3 py-1.5 rounded-lg"
          disabled={busy || !isFullyApproved}
          onClick={isFullyApproved ? connect : undefined}
        >
          {isFullyApproved
            ? 'Connect'
            : approvalStatus === 'pending'
              ? 'Pending approval – cannot connect'
              : 'Cannot connect'}
        </button>
      )}

      {status === 'pending' && side === 'sent' && (
        <>
          <button className="btn-ghost px-3 py-1.5 rounded-lg disabled:opacity-50" disabled>Pending…</button>
          <button className="btn-outline px-3 py-1.5 rounded-lg" disabled={busy} onClick={cancel}>Cancel</button>
        </>
      )}

      {status === 'pending' && side === 'received' && (
        <>
          <button className="btn-success px-3 py-1.5 rounded-lg" disabled={busy} onClick={accept}>Accept</button>
          <button className="btn-outline px-3 py-1.5 rounded-lg" disabled={busy} onClick={decline}>Decline</button>
        </>
      )}

      {['accepted','connected'].includes(status) && (
        <>
          <button className="btn-ocean px-3 py-1.5 rounded-lg" onClick={message}>Message</button>
          <button className="btn-outline px-3 py-1.5 rounded-lg" disabled={busy} onClick={remove}>Remove</button>
        </>
      )}

      <button className="btn-ghost px-3 py-1.5 rounded-lg" onClick={share}>Share</button>
      <ShareProfileModal open={shareOpen} onClose={() => setShareOpen(false)} url={profileUrl} />
      {!isFullyApproved && !status && (
        <p className="w-full text-xs text-amber-700" role="note">
          {approvalStatus === 'pending'
            ? 'Your account is pending approval. You can browse profiles but cannot send new connection requests yet.'
            : 'You are not allowed to send new connection requests.'}
        </p>
      )}
    </div>
  );
}
