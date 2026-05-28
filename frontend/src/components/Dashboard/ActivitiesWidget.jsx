import { useEffect, useState, memo } from "react";
import { supabase } from "../../utils/supabase";
import { 
  CalendarIcon, 
  BriefcaseIcon, 
  UserGroupIcon, 
  AcademicCapIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

function ActivitiesWidget() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    const refetch = async () => {
      const { data, error } = await supabase.rpc('get_recent_activity', { p_limit: 5 });
      if (!isMounted) return;
      if (error) {
        setErr(error.message || 'Failed to load activities');
      } else {
        const normalized = (Array.isArray(data) ? data : []).map((row) => ({
          activity_type: row.activity_type,
          activity_text: row.title,
          created_at: row.created_at,
        }));
        setRows(normalized);
      }
    };

    refetch();

    const tables = [
      "event_attendees",
      "job_applications",
      "connections",
      "group_members",
      "mentorships",
    ];

    const channels = tables.map((t) =>
      supabase
        .channel(`realtime:${t}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: t },
          () => refetch()
        )
        .subscribe()
    );

    return () => {
      isMounted = false;
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, []);

  const getActivityConfig = (type) => {
    const configs = {
      event_rsvp: { 
        icon: CalendarIcon, 
        color: 'bg-purple-100', 
        iconColor: 'text-purple-600',
        label: 'Event RSVP'
      },
      job_application: { 
        icon: BriefcaseIcon, 
        color: 'bg-orange-100', 
        iconColor: 'text-orange-600',
        label: 'Job Application'
      },
      connection_request: { 
        icon: UserGroupIcon, 
        color: 'bg-ocean-100', 
        iconColor: 'text-ocean-600',
        label: 'Connection'
      },
      group_joined: { 
        icon: UserGroupIcon, 
        color: 'bg-green-100', 
        iconColor: 'text-green-600',
        label: 'Group'
      },
      mentorship_accepted: { 
        icon: AcademicCapIcon, 
        color: 'bg-indigo-100', 
        iconColor: 'text-indigo-600',
        label: 'Mentorship'
      },
      message_sent: {
        icon: ClockIcon,
        color: 'bg-pink-100',
        iconColor: 'text-pink-600',
        label: 'Messages'
      },
      message_view: {
        icon: ClockIcon,
        color: 'bg-pink-100',
        iconColor: 'text-pink-600',
        label: 'Messages'
      },
      message_thread_open: {
        icon: ClockIcon,
        color: 'bg-pink-100',
        iconColor: 'text-pink-600',
        label: 'Messages'
      },
    };
    return configs[type] || { icon: ClockIcon, color: 'bg-gray-100', iconColor: 'text-gray-600', label: 'Activity' };
  };

  const truncate = (text, max = 60) => {
    if (!text) return "";
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
  };

  const cleanPath = (text = "") => text.replace(/\/messages/gi, "").replace(/^\s*\/+|\s*\/+$/g, "").trim();

  const normalizeMessageTitle = (text = "") => {
    const t = text.toLowerCase();
    if (t.includes("threads list load")) return "Checked your inbox";
    if (t.includes("open thread")) return "Opened a conversation";
    if (t.includes("messages page view") || t.includes("page view")) return "Viewed messages";
    return text;
  };

  // Remove trailing dots/bullets/whitespace
  const stripTrailingDots = (text = "") => text.replace(/[.\u2022\u00b7]+\s*$/u, "").trim();

  const renderLine = (a) => {
    const cleaned = stripTrailingDots(truncate(cleanPath(a.activity_text)));
    const normalizedMsg = stripTrailingDots(truncate(normalizeMessageTitle(cleanPath(a.activity_text))));
    switch (a.activity_type) {
      case "event_rsvp":
        return cleaned || "You RSVP’d";
      case "job_application":
        return cleaned || "You applied";
      case "connection_request":
        return cleaned || "Connection request";
      case "group_joined":
        return cleaned || "Joined group";
      case "mentorship_accepted":
        return cleaned || "Mentorship request accepted";
      case "message_sent":
      case "message_view":
      case "message_thread_open":
        return normalizedMsg || "Messages";
      default:
        return cleaned || normalizedMsg || a.activity_type || "Activity";
    }
  };

  const formatTimeAgo = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Recent Activities</h2>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Last 5</span>
      </div>

      {/* Loading */}
      {!rows && !err && (
        <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
          <div className="flex flex-col items-center gap-2">
            <div className="spinner spinner-md" aria-hidden="true" />
            <span className="sr-only">Loading activities...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {err && (
        <div className="text-center py-8">
          <p className="text-sm text-red-600">Failed to load activities.</p>
        </div>
      )}

      {/* Empty */}
      {rows && rows.length === 0 && (
        <div className="text-center py-8">
          <ClockIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No recent activities</p>
        </div>
      )}

      {/* List */}
      {rows && rows.length > 0 && (
        <ul className="space-y-4 page-enter list-none p-0">
          {rows.slice(0, 5).map((a, idx) => {
            const text = renderLine(a);
            const { icon: Icon, color, iconColor } = getActivityConfig(a.activity_type);
            return (
              <li key={`${a.activity_type}-${a.created_at}-${idx}`} className="flex space-x-3">
                <div className="flex items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center border border-gray-200 bg-white ${color}`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 leading-snug">{text}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(a.created_at)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default memo(ActivitiesWidget);
