import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';

// Canonical notification preference groups aligned with normalized types
const NOTIFICATION_GROUPS = [
  {
    id: 'connections',
    label: 'Connections & Networking',
    types: [
      'connection',
      'group',
      'group_invite_received',
      'group_invite_accepted',
      'group_join_request',
      'group_membership_approved',
      'group_membership_rejected',
    ],
  },
  {
    id: 'messages',
    label: 'Messages & Chat',
    types: ['message'], // Removed chat_message (normalized to message)
  },
  {
    id: 'jobs',
    label: 'Jobs & Applications',
    types: ['job', 'job_posted', 'job_approved', 'job_applied', 'application', 'application_status'],
  },
  {
    id: 'mentorship',
    label: 'Mentorship',
    types: ['mentorship'],
  },
  {
    id: 'events',
    label: 'Events',
    types: ['event', 'event_created', 'event_published', 'event_updated'], // Added event_updated
  },
  {
    id: 'system_alerts',
    label: 'System Alerts',
    types: ['alert', 'system', 'group_admin_risk', 'group_approved', 'group_rejected', 'group_deleted'], // include governance alerts
  },
];

export default function NotificationSettings() {
  const { user } = useAuth();
  const [prefsByType, setPrefsByType] = useState({}); // type -> boolean (in_app_enabled)
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('v_notification_prefs')
        .select('type,in_app_enabled')
        .eq('user_id', user.id);
      if (!mounted) return;
      if (error) {
        setPrefsByType({});
      } else {
        const map = {};
        (data || []).forEach((r) => { map[r.type] = r.in_app_enabled; });
        setPrefsByType(map);
      }
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [user?.id]);

  const isGroupEnabled = (group) =>
    group.types.every((t) => {
      const value = prefsByType[t];
      return value === undefined ? true : value;
    });

  const handleToggleGroup = async (group) => {
    if (!user) return;
    const next = !isGroupEnabled(group);
    setPrefsByType((prev) => {
      const copy = { ...prev };
      group.types.forEach((t) => {
        copy[t] = next;
      });
      return copy;
    });
    setSaving(true);
    const payload = group.types.map((t) => ({
      user_id: user.id,
      notification_type: t,
      in_app_enabled: next,
    }));
    const { error } = await supabase
      .from('notification_preferences')
      .upsert(payload, { onConflict: 'user_id,notification_type' });
    setSaving(false);
    if (error) {
      // revert on error
      setPrefsByType((prev) => {
        const copy = { ...prev };
        group.types.forEach((t) => {
          copy[t] = !next;
        });
        return copy;
      });
    }
  };

  const restoreDefaults = async () => {
    if (!user) return;
    setSaving(true);
    const allTypes = Array.from(new Set(NOTIFICATION_GROUPS.flatMap((g) => g.types)));
    const payload = allTypes.map((t) => ({ user_id: user.id, notification_type: t, in_app_enabled: true }));
    const { error } = await supabase
      .from('notification_preferences')
      .upsert(payload, { onConflict: 'user_id,notification_type' });
    if (!error) {
      const map = {};
      allTypes.forEach((t) => { map[t] = true; });
      setPrefsByType(map);
    }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">Notification Settings</h1>
      <p className="text-sm text-gray-600 mb-6">Control which notifications you receive in the app. Defaults are enabled.</p>

      <div className="bg-white rounded-lg shadow border divide-y">
        {NOTIFICATION_GROUPS.map((group) => (
          <div key={group.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium text-gray-900">{group.label}</p>
              <p className="text-xs text-gray-500">Includes: {group.types.join(', ')}</p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only"
                checked={isGroupEnabled(group)}
                onChange={() => handleToggleGroup(group)}
                aria-label={`Toggle ${group.label} notifications`}
              />
              <span className={`w-11 h-6 flex items-center bg-gray-200 rounded-full p-1 transition ${isGroupEnabled(group) ? 'bg-ocean-500' : 'bg-gray-300'}`}>
                <span className={`bg-white w-4 h-4 rounded-full shadow transform transition ${isGroupEnabled(group) ? 'translate-x-5' : ''}`} />
              </span>
            </label>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-6">
        <button onClick={restoreDefaults} className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50">Restore defaults</button>
        {saving && <span className="text-xs text-gray-500">Saving…</span>}
      </div>
    </div>
  );
}
