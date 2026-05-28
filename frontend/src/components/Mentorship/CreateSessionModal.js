import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import toast from 'react-hot-toast';

// Props: open, onClose, requestId
export default function CreateSessionModal({ open, onClose, requestId }) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [defaultLink, setDefaultLink] = useState('');

  useEffect(() => {
    const loadDefaultLink = async () => {
      if (!open) return;
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id;
        if (!uid) return;
        // Try mentor_profiles first
        let link = '';
        const { data, error } = await supabase
          .from('mentor_profiles')
          .select('default_meeting_link')
          .eq('user_id', uid)
          .maybeSingle();
        if (!error && data?.default_meeting_link) link = data.default_meeting_link;
        if (!link) {
          const { data: p } = await supabase
            .from('profiles')
            .select('default_meeting_link')
            .eq('id', uid)
            .maybeSingle();
          if (p?.default_meeting_link) link = p.default_meeting_link;
        }
        setDefaultLink(link || '');
        // Only prefill if field empty
        setMeetingUrl(prev => prev || link || '');
      } catch (e) {
        // Non-fatal
      }
    };
    loadDefaultLink();
  }, [open]);

  if (!open) return null;

  const validHttpUrl = (url) => {
    if (!url) return true; // allow empty to fall back to default
    try {
      const u = new URL(url);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!requestId) { toast.error('Missing request ID.'); return; }
    if (!start || !end) {
      toast.error('Start and end time are required.');
      return;
    }
    if (new Date(start) >= new Date(end)) {
      toast.error('End time must be after start time.');
      return;
    }
    if (!validHttpUrl(meetingUrl || defaultLink)) {
      toast.error('Please provide a valid meeting link (http/https).');
      return;
    }

    setLoading(true);
    try {
      const meeting_url = (meetingUrl && meetingUrl.trim()) || defaultLink || null;
      const payload = {
        mentorship_request_id: requestId,
        start_time: new Date(start).toISOString(),
        end_time: new Date(end).toISOString(),
        meeting_url,
        notes: notes?.trim() || null,
        status: 'scheduled'
      };
      const { error } = await supabase
        .from('mentorship_sessions')
        .insert(payload);
      if (error) {
        const msg = error?.message || '';
        if (error?.code === '401' || error?.code === '403' || /permission|not allowed|rls/i.test(msg)) {
          toast.error('You no longer have permission to modify this item. The request may have changed status.');
        } else {
          toast.error(msg || 'Failed to create session');
        }
        return;
      }
      toast.success('Session scheduled');
      onClose?.();
      // Reset
      setStart('');
      setEnd('');
      setMeetingUrl('');
      setNotes('');
    } catch (e) {
      const msg = e?.message || '';
      if (/permission|not allowed|rls/i.test(msg)) {
        toast.error('You no longer have permission to modify this item. The request may have changed status.');
      } else {
        toast.error(msg || 'Failed to create session');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Schedule Session</h3>
        <p className="text-sm text-gray-600 mb-4">Set time and meeting link for this mentorship session.</p>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Start</label>
            <input type="datetime-local" className="w-full border rounded px-3 py-2" value={start} onChange={(e) => setStart(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">End</label>
            <input type="datetime-local" className="w-full border rounded px-3 py-2" value={end} onChange={(e) => setEnd(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Meeting Link</label>
            <input type="url" placeholder={defaultLink || 'https://...'} className="w-full border rounded px-3 py-2" value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} />
            {defaultLink && <p className="text-xs text-gray-500 mt-1">Default for this mentor: {defaultLink}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Notes (optional)</label>
            <textarea className="w-full border rounded px-3 py-2 h-20" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary-outline" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn-ocean" disabled={loading}>{loading ? 'Saving...' : 'Create Session'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
