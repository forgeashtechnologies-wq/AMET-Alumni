import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import toast from 'react-hot-toast';
import { toFriendlyToast, getFriendlyErrorMessage } from '../../utils/errors';
import logger from '../../utils/logger';
import { ConfirmationDialog } from '../../components/shared';

const MentorSettings = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // Default meeting link state
  const [defaultLink, setDefaultLink] = useState('');
  const [linkSaving, setLinkSaving] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const validate = () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return false;
    }
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (s > e) {
        toast.error('End date must be after start date');
        return false;
      }
    }
    return true;
  };

  // Load current default link for this mentor
  useEffect(() => {
    const loadDefault = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id;
        if (!uid) return;
        let link = '';
        // Try mentor_profiles first
        const { data: mp } = await supabase
          .from('mentor_profiles')
          .select('default_meeting_link')
          .eq('user_id', uid)
          .maybeSingle();
        if (mp?.default_meeting_link) link = mp.default_meeting_link;
        if (!link) {
          const { data: p } = await supabase
            .from('profiles')
            .select('default_meeting_link')
            .eq('id', uid)
            .maybeSingle();
          if (p?.default_meeting_link) link = p.default_meeting_link;
        }
        setDefaultLink(link || '');
      } catch (e) {
        // Non-fatal
      }
    };
    loadDefault();
  }, []);

  const validHttpUrl = (url) => {
    if (!url) return true; // allow empty
    try {
      const u = new URL(url);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const saveDefaultLink = async () => {
    if (!validHttpUrl(defaultLink)) {
      toast.error('Please enter a valid https link');
      return;
    }
    setLinkSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) throw new Error('Not authenticated');
      // Try mentor_profiles first
      let err = null;
      const { error: mpErr } = await supabase
        .from('mentor_profiles')
        .update({ default_meeting_link: defaultLink || null })
        .eq('user_id', uid);
      if (mpErr) err = mpErr;
      // Fallback to profiles if mentor_profiles missing
      if (err) {
        const { error: pErr } = await supabase
          .from('profiles')
          .update({ default_meeting_link: defaultLink || null })
          .eq('id', uid);
        if (pErr) throw pErr;
      }
      toast.success('Default meeting link saved');
    } catch (e) {
      toFriendlyToast(toast, e, 'Failed to save link');
    } finally {
      setLinkSaving(false);
    }
  };

  const runBulkApplyDefaultLink = async () => {
    setBulkUpdating(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) throw new Error('Not authenticated');
      // Preferred path: RPC if available
      let rpcError = null;
      try {
        const { error: rpcErr } = await supabase.rpc('apply_default_link_to_upcoming_sessions', { p_mentor: uid });
        if (rpcErr) rpcError = rpcErr;
      } catch (e) {
        rpcError = e;
      }
      if (rpcError) {
        // Fallback: manual update of sessions that belong to this mentor via accepted/active requests
        const nowIso = new Date().toISOString();
        // Fetch request ids (accepted/active) for this mentor
        const { data: reqs, error: reqErr } = await supabase
          .from('mentorship_requests')
          .select('id')
          .eq('mentor_id', uid)
          .in('status', ['accepted', 'active']);
        if (reqErr) throw reqErr;
        const ids = (reqs || []).map(r => r.id);
        if (ids.length > 0) {
          const { error } = await supabase
            .from('mentorship_sessions')
            .update({ meeting_url: defaultLink })
            .gte('start_time', nowIso)
            .in('mentorship_request_id', ids)
            .or('meeting_url.is.null,meeting_url.eq.""');
          if (error) throw error;
        }
      }
      toast.success('Default link applied to upcoming sessions');
    } catch (e) {
      toFriendlyToast(toast, e, 'Failed to apply link');
    } finally {
      setBulkUpdating(false);
    }
  };

  const bulkApplyDefaultLink = () => {
    if (!defaultLink || !validHttpUrl(defaultLink)) {
      toast.error('Please set a valid default link first');
      return;
    }
    setConfirmDialog({
      type: 'bulk-apply-default-link',
      description: 'Apply the default meeting link to all upcoming sessions that are missing a link?',
    });
  };

  const runBroadcastLinkToAccepted = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) throw new Error('Not authenticated');
      const { data: accepted, error } = await supabase
        .from('mentorship_requests')
        .select('id')
        .eq('mentor_id', uid)
        .eq('status', 'accepted');
      if (error) throw error;
      for (const r of accepted || []) {
        const { error: insErr } = await supabase
          .from('mentorship_messages')
          .insert({
            mentorship_request_id: r.id,
            sender_id: uid,
            message: `Here’s my meeting link for our sessions: ${defaultLink}`
          });
        if (insErr) throw insErr;
      }
      toast.success('Link sent to accepted mentees');
    } catch (e) {
      toFriendlyToast(toast, e, 'Failed to send link');
    }
  };

  const broadcastLinkToAccepted = () => {
    if (!defaultLink || !validHttpUrl(defaultLink)) {
      toast.error('Please set a valid default link first');
      return;
    }
    setConfirmDialog({
      type: 'broadcast-link',
      description: 'Send your meeting link to all accepted mentees?',
    });
  };

  const handleCreateProgram = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const toastId = toast.loading('Creating mentorship program...');
    try {
      const payload = {
        title: title.trim(),
        description: description?.trim() || null,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        end_date: endDate ? new Date(endDate).toISOString() : null,
        is_active: !!isActive,
      };

      const { data, error } = await supabase
        .from('mentorship_programs')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;

      toast.success('Mentorship program created!', { id: toastId });
      // Navigate to dashboard after creation
      navigate('/mentorship/dashboard');
    } catch (err) {
      logger.error('Failed to create mentorship program:', err);
      toast.error(getFriendlyErrorMessage(err, 'Failed to create mentorship program'), { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="glass-card p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Mentor Settings</h1>

        {/* Default meeting link */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Default Meeting Link</h2>
          <p className="text-sm text-gray-600 mb-3">Used for all new sessions. You can bulk-apply it to upcoming sessions.</p>
          <div className="flex items-center gap-2">
            <input
              type="url"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
              placeholder="https://meet.google.com/..."
              value={defaultLink}
              onChange={(e) => setDefaultLink(e.target.value)}
            />
            <button onClick={saveDefaultLink} disabled={linkSaving} className={`btn-ocean px-4 py-2 rounded ${linkSaving ? 'opacity-70' : ''}`}>{linkSaving ? 'Saving...' : 'Save'}</button>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={bulkApplyDefaultLink} disabled={bulkUpdating || !defaultLink} className={`btn-ocean-outline px-4 py-2 rounded ${bulkUpdating ? 'opacity-70' : ''}`}>Apply to Upcoming Sessions</button>
            <button onClick={broadcastLinkToAccepted} disabled={!defaultLink} className="btn-secondary-outline px-4 py-2 rounded">Send Link to Accepted Mentees</button>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Create Mentorship Program</h2>
          <p className="text-sm text-gray-600 mb-4">As a mentor, you can create a structured program for mentees to join. Title is required. Dates are optional.</p>

          <form onSubmit={handleCreateProgram} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title<span className="text-red-500">*</span></label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                placeholder="e.g., Maritime Career Mentorship (Fall 2025)"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 h-24"
                placeholder="Brief overview of the program, goals, expectations, etc."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="isActive"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 text-ocean-600 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className={`btn-ocean px-4 py-2 rounded-lg ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {submitting ? 'Creating...' : 'Create Program'}
              </button>
            </div>
          </form>
        </div>

        <p className="text-gray-700">Additional mentor preferences and availability settings can be configured here later.</p>
      </div>
      <ConfirmationDialog
        isOpen={confirmDialog?.type === 'bulk-apply-default-link'}
        onClose={() => setConfirmDialog(null)}
        onConfirm={async () => {
          setConfirmDialog(null);
          await runBulkApplyDefaultLink();
        }}
        title="Apply default meeting link"
        description={confirmDialog?.description || 'Apply the default meeting link to all upcoming sessions that are missing a link?'}
        variant="warning"
      />
      <ConfirmationDialog
        isOpen={confirmDialog?.type === 'broadcast-link'}
        onClose={() => setConfirmDialog(null)}
        onConfirm={async () => {
          setConfirmDialog(null);
          await runBroadcastLinkToAccepted();
        }}
        title="Send meeting link to mentees"
        description={confirmDialog?.description || 'Send your meeting link to all accepted mentees?'}
        variant="warning"
      />
    </div>
  );
};

export default MentorSettings;
