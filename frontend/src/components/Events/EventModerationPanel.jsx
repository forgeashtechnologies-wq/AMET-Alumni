import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { approveEvent, rejectEvent, fetchPendingEvents } from '../../utils/moderationApi';
import logger from '../../utils/logger';

const StatusBadge = ({ status }) => {
  const cls = (() => {
    switch ((status || 'pending').toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  })();
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status || 'pending'}
    </span>
  );
};

export default function EventModerationPanel() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [rejecting, setRejecting] = useState({ id: null, reason: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await fetchPendingEvents();
      if (error) throw error;
      setEvents(data || []);
    } catch (e) {
      logger.error('Failed to load pending events:', e);
      toast.error('Could not load pending events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onApprove = async (ev) => {
    if (!user?.id) return toast.error('Missing current user');
    setBusyId(ev.id);
    try {
      const { data, error } = await approveEvent(ev.id, user.id);
      if (error) throw error;
      toast.success('Event approved successfully');
      setEvents((prev) => prev.filter((e) => e.id !== ev.id));
    } catch (e) {
      logger.error('Approve failed:', e);
      toast.error(e?.message || 'Failed to approve event');
    } finally {
      setBusyId(null);
    }
  };

  const onReject = async (ev) => {
    if (!user?.id) return toast.error('Missing current user');
    if (!rejecting.reason) {
      // Optional: allow empty reason; adjust if you want to enforce
    }
    setBusyId(ev.id);
    try {
      const { data, error } = await rejectEvent(ev.id, user.id, rejecting.reason || null);
      if (error) throw error;
      toast.success(`Event rejected${rejecting.reason ? ` (reason: ${rejecting.reason})` : ''}`);
      setEvents((prev) => prev.filter((e) => e.id !== ev.id));
      setRejecting({ id: null, reason: '' });
    } catch (e) {
      logger.error('Reject failed:', e);
      toast.error(e?.message || 'Failed to reject event');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <div className="p-6">Loading pending events…</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Event Moderation</h1>
        <p className="text-gray-600">Approve or reject events submitted by users.</p>
      </div>

      {events.length === 0 ? (
        <div className="p-8 bg-white rounded-xl shadow text-center text-gray-600">No pending events.</div>
      ) : (
        <div className="space-y-4">
          {events.map((ev) => (
            <div key={ev.id} className="bg-white rounded-xl shadow p-4 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-semibold text-gray-900">{ev.title}</h2>
                  <StatusBadge status={ev.approval_status} />
                </div>
                {ev.short_description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{ev.short_description}</p>
                )}
                <div className="text-xs text-gray-500 mt-1">Created: {new Date(ev.created_at).toLocaleString()}</div>
              </div>

              <div className="w-full md:w-80 flex flex-col gap-2">
                {rejecting.id === ev.id ? (
                  <textarea
                    value={rejecting.reason}
                    onChange={(e) => setRejecting({ id: ev.id, reason: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm"
                    placeholder="Optional reason for rejection"
                    rows={2}
                  />
                ) : null}

                <div className="flex gap-2 justify-end">
                  {rejecting.id === ev.id ? (
                    <>
                      <button
                        className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm"
                        onClick={() => setRejecting({ id: null, reason: '' })}
                        disabled={busyId === ev.id}
                      >
                        Cancel
                      </button>
                      <button
                        className={`px-3 py-2 rounded-lg bg-red-600 text-white text-sm ${busyId === ev.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => onReject(ev)}
                        disabled={busyId === ev.id}
                      >
                        {busyId === ev.id ? 'Rejecting…' : 'Confirm Reject'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className={`px-3 py-2 rounded-lg bg-green-600 text-white text-sm ${busyId === ev.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => onApprove(ev)}
                        disabled={busyId === ev.id}
                      >
                        {busyId === ev.id ? 'Approving…' : 'Approve'}
                      </button>
                      <button
                        className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm"
                        onClick={() => setRejecting({ id: ev.id, reason: '' })}
                        disabled={busyId === ev.id}
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
