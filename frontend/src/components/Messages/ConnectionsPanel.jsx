import logger from '../../utils/logger';
// frontend/src/components/Messages/ConnectionsPanel.jsx
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useConnectionsPanel from '../../hooks/useConnectionsPanel';
import { supabase } from '../../utils/supabase';
import { fetchMyThreads, fetchThreadMessages } from '../../api/dm';
import toast from 'react-hot-toast';
import { setDisconnectCooldown } from '../../utils/ui';
import { logActivity } from '../../utils/activityLogger';

const Avatar = ({ url, name }) => {
  const initial = (name || 'A').trim().charAt(0).toUpperCase();
  if (!url) {
    return (
      <div className="h-10 w-10 rounded-full bg-ocean-100 flex items-center justify-center">
        <span className="text-ocean-600 font-medium">{initial}</span>
      </div>
    );
  }
  return <img src={url} alt={name || 'avatar'} className="h-10 w-10 rounded-full object-cover" />;
};

function Row({ peer, onAccept, onReject, onCancel, onMessage, onDisconnect }) {
  const name = peer?.full_name || `${peer?.first_name || ''} ${peer?.last_name || ''}`.trim() || (peer?.email || '').split('@')[0] || 'Alumni';
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
      <div className="flex items-center gap-3">
        <Avatar url={peer?.avatar_url} name={name} />
        <div>
          <div className="text-sm font-medium text-gray-900">{name}</div>
          <div className="text-xs text-gray-500">
            {[peer?.degree_program, peer?.department, peer?.graduation_year].filter(Boolean).join(' • ')}
          </div>
          <div className="text-xs text-gray-500">
            {[peer?.current_job_title, peer?.company_name].filter(Boolean).join(' at ')}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onAccept && (
          <button className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-gradient-to-b from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700 transition-[colors,opacity,transform,shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2" onClick={onAccept}>Accept</button>
        )}
        {onReject && (
          <button className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-gradient-to-b from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-[colors,opacity,transform,shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2" onClick={onReject}>Reject</button>
        )}
        {onCancel && (
          <button className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 transition-[colors,opacity,transform,shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2" onClick={onCancel}>Cancel</button>
        )}
        {onMessage && (
          <button className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-gradient-to-b from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700 transition-[colors,opacity,transform,shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2" onClick={onMessage}>Message</button>
        )}
        {onDisconnect && (
          <button className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-gradient-to-b from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-[colors,opacity,transform,shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2" onClick={onDisconnect}>Disconnect</button>
        )}
      </div>
    </div>
  );
}

function DisconnectConfirmDialog({ peer, onConfirm, onCancel, impact }) {
  const name = peer?.full_name || `${peer?.first_name || ''} ${peer?.last_name || ''}`.trim() || 'this person';
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onCancel}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Disconnect from {name}?</h3>
        
        {impact && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm font-medium text-yellow-800 mb-2">⚠️ This will affect:</p>
            <ul className="text-sm text-yellow-700 space-y-1">
              {impact.mentorships > 0 && <li>• {impact.mentorships} active mentorship relationship(s)</li>}
              {impact.applications > 0 && <li>• {impact.applications} job application(s)</li>}
              {impact.events > 0 && <li>• {impact.events} upcoming event(s)</li>}
              {impact.messages > 0 && <li>• {impact.messages} message(s) will become read-only</li>}
              <li>• You will not be able to send new messages</li>
            </ul>
          </div>
        )}
        
        <p className="text-sm text-gray-600 mb-6">
          You can reconnect later by sending a new connection request.
        </p>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            data-testid="disconnect-cancel"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
            data-testid="disconnect-confirm"
          >
            Disconnect Anyway
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConnectionsPanel({ currentUserId, initialTab = 'received' }) {
  const navigate = useNavigate();
  const { loading, lists, counts, actions } = useConnectionsPanel(currentUserId);
  const [active, setActive] = useState(initialTab);
  const [disconnectTarget, setDisconnectTarget] = useState(null);
  const [disconnectImpact, setDisconnectImpact] = useState(null);
  const [checkingImpact, setCheckingImpact] = useState(false);

  const emptyText = useMemo(() => ({
    received: 'No incoming requests',
    sent: 'No sent requests',
    accepted: 'No connections yet',
  }), []);

  const onMessage = (id) => navigate(`/messages?peer=${id}`);

  const checkDisconnectImpact = async (peerId) => {
    setCheckingImpact(true);
    try {
      const impact = { mentorships: 0, applications: 0, events: 0, messages: 0 };
      
      // Check active mentorship relationships
      const { data: mentorships } = await supabase
        .from('mentorship_relationships')
        .select('id')
        .or(`and(mentor_id.eq.${currentUserId},mentee_id.eq.${peerId}),and(mentor_id.eq.${peerId},mentee_id.eq.${currentUserId})`)
        .in('status', ['active']);
      impact.mentorships = (mentorships || []).length;
      
      // Check job applications
      const { data: apps } = await supabase
        .from('job_applications')
        .select('id, job_id!inner(posted_by)')
        .or(`and(applicant_id.eq.${currentUserId},job_id.posted_by.eq.${peerId}),and(applicant_id.eq.${peerId},job_id.posted_by.eq.${currentUserId})`)
        .in('status', ['submitted', 'under_review', 'interviewing']);
      impact.applications = (apps || []).length;
      
      // Check upcoming events (next 30 days)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const { data: events } = await supabase
        .from('event_rsvps')
        .select('id, event_id!inner(created_by, date)')
        .or(`and(user_id.eq.${currentUserId},event_id.created_by.eq.${peerId}),and(user_id.eq.${peerId},event_id.created_by.eq.${currentUserId})`)
        .gte('event_id.date', new Date().toISOString())
        .lte('event_id.date', futureDate.toISOString());
      impact.events = (events || []).length;
      
      // Check message count in DM thread via canonical DM helpers
      const threads = await fetchMyThreads();
      const thread = (threads || []).find((t) => String(t.other_user_id) === String(peerId));
      if (thread?.thread_id) {
        const msgs = await fetchThreadMessages(thread.thread_id);
        impact.messages = Array.isArray(msgs) ? msgs.length : 0;
      }
      
      return impact;
    } catch (error) {
      logger.error('Error checking disconnect impact:', error);
      return null;
    } finally {
      setCheckingImpact(false);
    }
  };

  const handleDisconnectClick = async (peer) => {
    const impact = await checkDisconnectImpact(peer.id);
    setDisconnectTarget(peer);
    setDisconnectImpact(impact);
  };

  const handleDisconnectConfirm = async () => {
    if (disconnectTarget) {
      try {
        await actions.disconnect(disconnectTarget.id);
        
        // Set 24h cooldown
        setDisconnectCooldown(disconnectTarget.id);
        
        // Log activity
        try {
          await logActivity({
            action: 'connection_disconnected',
            entity_type: 'connection',
            entity_id: disconnectTarget.id,
            meta: {
              peer_id: disconnectTarget.id,
              peer_name: disconnectTarget.full_name || `${disconnectTarget.first_name} ${disconnectTarget.last_name}`.trim(),
              impact: disconnectImpact
            },
            route: '/messages?tab=connections'
          });
        } catch (logErr) {
          logger.warn('Failed to log disconnect activity:', logErr);
        }
        
        toast.success('Connection removed (logged in activity history)');
      } catch (err) {
        logger.error('Disconnect failed:', err);
      } finally {
        setDisconnectTarget(null);
        setDisconnectImpact(null);
      }
    }
  };

  const handleDisconnectCancel = () => {
    setDisconnectTarget(null);
    setDisconnectImpact(null);
  };

  const data = active === 'received' ? lists.received : active === 'sent' ? lists.sent : lists.accepted;

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <button className={`px-3 py-1 rounded-full border ${active==='received' ? 'bg-ocean-50 border-ocean-300 text-ocean-700' : 'bg-white border-gray-300 text-gray-700'}`} onClick={() => setActive('received')}>Requests Received ({counts.received})</button>
        <button className={`px-3 py-1 rounded-full border ${active==='sent' ? 'bg-ocean-50 border-ocean-300 text-ocean-700' : 'bg-white border-gray-300 text-gray-700'}`} onClick={() => setActive('sent')}>Requests Sent ({counts.sent})</button>
        <button className={`px-3 py-1 rounded-full border ${active==='accepted' ? 'bg-ocean-50 border-ocean-300 text-ocean-700' : 'bg-white border-gray-300 text-gray-700'}`} onClick={() => setActive('accepted')}>My Connections ({counts.accepted})</button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : (Array.isArray(data) && data.length > 0 ? (
        <div className="space-y-2">
          {data.map((p) => (
            <Row
              key={p.id}
              peer={p}
              onAccept={active==='received' ? (()=>actions.accept(p.id)) : undefined}
              onReject={active==='received' ? (()=>actions.reject(p.id)) : undefined}
              onCancel={active==='sent' ? (()=>actions.cancel(p.id)) : undefined}
              onMessage={active==='accepted' ? (()=>onMessage(p.id)) : undefined}
              onDisconnect={active==='accepted' ? (()=>handleDisconnectClick(p)) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-500">{emptyText[active]}</div>
      ))}
      
      {disconnectTarget && (
        <DisconnectConfirmDialog
          peer={disconnectTarget}
          impact={disconnectImpact}
          onConfirm={handleDisconnectConfirm}
          onCancel={handleDisconnectCancel}
        />
      )}
    </div>
  );
}
