import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon,
  UsersIcon,
  CalendarIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  DocumentTextIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../../utils/supabase';
import { downloadCSV } from '../../utils/csv';
import logger from '../../utils/logger';

const Analytics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedTab, setSelectedTab] = useState('overview');
  const [alumniCount, setAlumniCount] = useState(null);
  const [alumniCountLoading, setAlumniCountLoading] = useState(true);
  // Live analytics from RPCs
  const [overviewRpc, setOverviewRpc] = useState(null);
  const [recentRpc, setRecentRpc] = useState([]);

  // Mock analytics data (some values will be replaced with live data below)
  const overviewStats = [
    {
      title: 'Total Alumni',
      value: '—',
      change: '+12%',
      trend: 'up',
      icon: UsersIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Active Users',
      value: '1,234',
      change: '+8%',
      trend: 'up',
      icon: EyeIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Events This Month',
      value: '15',
      change: '+3',
      trend: 'up',
      icon: CalendarIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Job Postings',
      value: '89',
      change: '+15%',
      trend: 'up',
      icon: BriefcaseIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  const resolvedOverviewStats = overviewStats.map((stat) => {
    if (stat.title !== 'Total Alumni') return stat;
    const value = alumniCountLoading
      ? '—'
      : (alumniCount ?? 0).toLocaleString();
    return { ...stat, value };
  });

  const userEngagementData = [
    { month: 'Jan', logins: 1200, profileViews: 3400, messages: 890 },
    { month: 'Feb', logins: 1350, profileViews: 3800, messages: 1020 },
    { month: 'Mar', logins: 1180, profileViews: 3200, messages: 950 },
    { month: 'Apr', logins: 1420, profileViews: 4100, messages: 1150 }
  ];

  const [eventMetrics, setEventMetrics] = useState([
    {
      title: 'Total Events',
      value: '—',
      change: '',
      description: 'Events created this period'
    },
    {
      title: 'Total Attendees',
      value: '—',
      change: '',
      description: "People with 'going' or 'attended' status (stable)"
    },
    {
      title: 'Average RSVP Rate',
      value: '—',
      change: '',
      description: 'RSVP to event ratio'
    },
    {
      title: 'Event Satisfaction',
      value: '—',
      change: '',
      description: 'Average rating'
    }
  ]);

  // Fetch canonical approved alumni count once using backend RPC
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setAlumniCountLoading(true);
        const { data, error } = await supabase.rpc('get_alumni_approved_count');
        if (!mounted) return;
        if (error) {
          logger.error('Error fetching alumni count:', error);
          setAlumniCount(null);
          return;
        }
        const count = typeof data === 'number' ? data : 0;
        setAlumniCount(count);
      } catch (e) {
        if (!mounted) return;
        logger.error('Alumni count RPC error:', e);
        setAlumniCount(null);
      } finally {
        if (mounted) {
          setAlumniCountLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch stable Total Attendees KPI: rows where status IN ('going','attended'); avoid joins
  useEffect(() => {
    let isMounted = true;
    const fetchKpis = async () => {
      try {
        // Total attendees (stable): count rows in event_attendees with statuses
        const { count: attendeesCount, error: attendeesError } = await supabase
          .from('event_attendees')
          .select('id', { count: 'exact', head: true })
          .in('attendance_status', ['going', 'attended']);
        if (attendeesError) throw attendeesError;

        // Total events in period (optional; using overall count as placeholder)
        const { count: eventsCount, error: eventsError } = await supabase
          .from('events')
          .select('id', { count: 'exact', head: true });
        if (eventsError) throw eventsError;

        if (!isMounted) return;
        setEventMetrics((prev) => prev.map((m) => {
          if (m.title === 'Total Attendees') {
            return { ...m, value: attendeesCount?.toLocaleString?.() || String(attendeesCount ?? '0') };
          }
          if (m.title === 'Total Events') {
            return { ...m, value: eventsCount?.toLocaleString?.() || String(eventsCount ?? '0') };
          }
          return m;
        }));
      } catch (e) {
        // Keep defaults if an error occurs
        logger.error('Error fetching KPIs:', e);
      }
    };
    fetchKpis();
    return () => { isMounted = false; };
  }, [selectedPeriod]);

  // Fetch Overview KPIs and Recent Activity from RPCs
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: ov } = await supabase.rpc('get_user_analytics');
        const { data: recent } = await supabase.rpc('get_recent_activity', { p_limit: 5 });
        if (!mounted) return;
        setOverviewRpc(ov || null);
        setRecentRpc(recent || []);
      } catch (e) {
        logger.error('RPC analytics fetch error:', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const jobMetrics = [
    {
      title: 'Job Postings',
      value: '89',
      change: '+15%',
      description: 'Active job listings'
    },
    {
      title: 'Applications',
      value: '456',
      change: '+22%',
      description: 'Total applications'
    },
    {
      title: 'Success Rate',
      value: '34%',
      change: '+8%',
      description: 'Applications to hire ratio'
    },
    {
      title: 'Avg. Time to Fill',
      value: '18 days',
      change: '-3 days',
      description: 'Days to fill position'
    }
  ];

  const mentorshipMetrics = [
    {
      title: 'Active Mentors',
      value: '67',
      change: '+12%',
      description: 'Currently active mentors'
    },
    {
      title: 'Mentorship Requests',
      value: '123',
      change: '+28%',
      description: 'Total requests this month'
    },
    {
      title: 'Success Rate',
      value: '85%',
      change: '+7%',
      description: 'Completed mentorships'
    },
    {
      title: 'Avg. Session Rating',
      value: '4.8/5',
      change: '+0.2',
      description: 'Mentor session rating'
    }
  ];

  const topContent = [
    {
      title: 'AMET Alumni Meetup 2024',
      type: 'Event',
      views: 1234,
      engagement: '89%',
      category: 'Events'
    },
    {
      title: 'Senior Marine Engineer - Ocean Shipping',
      type: 'Job',
      views: 892,
      engagement: '76%',
      category: 'Jobs'
    },
    {
      title: 'Captain Rajesh Kumar - Mentorship',
      type: 'Profile',
      views: 756,
      engagement: '82%',
      category: 'Mentorship'
    },
    {
      title: 'Marine Engineers Mumbai Group',
      type: 'Group',
      views: 645,
      engagement: '71%',
      category: 'Networking'
    }
  ];

  // Helper to get icon and color for activity type
  const getActivityIcon = (activityType) => {
    const typeMap = {
      'user_registration': { icon: UsersIcon, color: 'bg-blue-100', iconColor: 'text-blue-600' },
      'event_created': { icon: CalendarIcon, color: 'bg-purple-100', iconColor: 'text-purple-600' },
      'event_rsvp': { icon: CalendarIcon, color: 'bg-purple-100', iconColor: 'text-purple-600' },
      'job_posted': { icon: BriefcaseIcon, color: 'bg-orange-100', iconColor: 'text-orange-600' },
      'job_application': { icon: BriefcaseIcon, color: 'bg-orange-100', iconColor: 'text-orange-600' },
      'connection_request': { icon: UserGroupIcon, color: 'bg-ocean-100', iconColor: 'text-ocean-600' },
      'connection_accepted': { icon: UserGroupIcon, color: 'bg-green-100', iconColor: 'text-green-600' },
      'group_created': { icon: UserGroupIcon, color: 'bg-ocean-100', iconColor: 'text-ocean-600' },
      'group_joined': { icon: UserGroupIcon, color: 'bg-ocean-100', iconColor: 'text-ocean-600' },
      'mentorship_request': { icon: AcademicCapIcon, color: 'bg-indigo-100', iconColor: 'text-indigo-600' },
      'message_sent': { icon: ChatBubbleLeftRightIcon, color: 'bg-pink-100', iconColor: 'text-pink-600' },
    };
    return typeMap[activityType] || { icon: BellIcon, color: 'bg-gray-100', iconColor: 'text-gray-600' };
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'recently';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const periods = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 3 months' },
    { value: '1y', label: 'Last year' }
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: ChartBarIcon },
    { id: 'users', label: 'Users', icon: UsersIcon },
    { id: 'events', label: 'Events', icon: CalendarIcon },
    { id: 'jobs', label: 'Jobs', icon: BriefcaseIcon },
    { id: 'mentorship', label: 'Mentorship', icon: AcademicCapIcon }
  ];

  const MetricCard = ({ metric }) => (
    <div className="glass-card rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{metric.title}</p>
          <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
          {metric.description && (
            <p className="text-sm text-gray-500 mt-1">{metric.description}</p>
          )}
        </div>
        <div className={`flex items-center ${
          metric.change.startsWith('+') ? 'text-green-600' : 
          metric.change.startsWith('-') ? 'text-red-600' : 'text-gray-600'
        }`}>
          {metric.change.startsWith('+') ? (
            <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
          ) : metric.change.startsWith('-') ? (
            <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
          ) : null}
          <span className="text-sm font-medium">{metric.change}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
            <p className="text-gray-600">Monitor platform performance and user engagement</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="form-input px-3 py-2 rounded-lg text-sm"
            >
              {periods.map(period => (
                <option key={period.value} value={period.value}>{period.label}</option>
              ))}
            </select>
            <button
              className="btn-ocean px-4 py-2 rounded-lg text-sm"
              onClick={() => {
                const rows = [];
                if (overviewRpc) {
                  Object.entries(overviewRpc).forEach(([k, v]) => rows.push({ metric: k, value: v }));
                }
                if (recentRpc?.length) {
                  recentRpc.forEach((r) => rows.push({ activity_type: r.activity_type, title: r.title, created_at: r.created_at }));
                }
                downloadCSV('analytics_overview.csv', rows);
              }}
            >
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-card rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`flex-1 flex items-center justify-center px-6 py-4 text-sm font-medium ${
                    selectedTab === tab.id
                      ? 'text-ocean-600 border-b-2 border-ocean-600 bg-ocean-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {selectedTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {resolvedOverviewStats.map((stat, index) => {
                  const Icon = stat.icon;
                  const isTotalAlumni = stat.title === 'Total Alumni';
                  const displayedValue = isTotalAlumni
                    ? (alumniCountLoading ? '–' : (alumniCount ?? 0).toLocaleString())
                    : stat.value;
                  return (
                    <div key={index} className="glass-card rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                          <p className="text-2xl font-bold text-gray-900">{displayedValue}</p>
                        </div>
                        <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                          <Icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                      </div>
                      <div className="mt-4 flex items-center">
                        {stat.trend === 'up' ? (
                          <ArrowTrendingUpIcon className="w-4 h-4 text-green-500 mr-1" />
                        ) : (
                          <ArrowTrendingDownIcon className="w-4 h-4 text-red-500 mr-1" />
                        )}
                        <span className={`text-sm font-medium ${
                          stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stat.change}
                        </span>
                        <span className="text-sm text-gray-500 ml-1">vs last period</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Charts and Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Engagement Chart */}
                <div className="glass-card rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">User Engagement</h3>
                  <div className="space-y-4">
                    {userEngagementData.map((data, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">{data.month}</span>
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                            <span>Logins: {data.logins}</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                            <span>Views: {data.profileViews}</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                            <span>Messages: {data.messages}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Content */}
                <div className="glass-card rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Content</h3>
                  <div className="space-y-4">
                    {topContent.map((content, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">{content.title}</h4>
                          <p className="text-xs text-gray-600">{content.type} • {content.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{content.views} views</p>
                          <p className="text-xs text-green-600">{content.engagement} engagement</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Activities */}
              <div className="glass-card rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Last 5</span>
                </div>
                {recentRpc && recentRpc.length > 0 ? (
                  <div className="space-y-3">
                    {recentRpc.slice(0, 5).map((activity, index) => {
                      const { icon: Icon, color, iconColor } = getActivityIcon(activity.activity_type);
                      return (
                        <div 
                          key={`${activity.activity_type}-${activity.created_at}-${index}`} 
                          className="group flex items-start space-x-4 p-3 rounded-xl hover:bg-ocean-50 transition-colors duration-200 border border-transparent hover:border-ocean-200"
                        >
                          <div className={`flex-shrink-0 w-10 h-10 ${color} rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
                            <Icon className={`w-5 h-5 ${iconColor}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {activity.title || activity.activity_type.replace(/_/g, ' ')}
                            </p>
                            <p className="text-xs text-gray-600 mt-0.5">
                              {activity.description || activity.activity_type.replace(/_/g, ' ')}
                            </p>
                            <div className="flex items-center mt-1.5 space-x-2">
                              <span className="inline-flex items-center text-xs text-gray-500">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {formatTimeAgo(activity.created_at)}
                              </span>
                              <span className="text-gray-300">•</span>
                              <span className="text-xs text-ocean-600 font-medium capitalize">
                                {activity.activity_type.replace(/_/g, ' ')}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BellIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No recent activity</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Events Tab */}
          {selectedTab === 'events' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Event Analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {eventMetrics.map((metric, index) => (
                  <MetricCard key={index} metric={metric} />
                ))}
              </div>
            </div>
          )}

          {/* Jobs Tab */}
          {selectedTab === 'jobs' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Job Portal Analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {jobMetrics.map((metric, index) => (
                  <MetricCard key={index} metric={metric} />
                ))}
              </div>
            </div>
          )}

          {/* Mentorship Tab */}
          {selectedTab === 'mentorship' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Mentorship Program Analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {mentorshipMetrics.map((metric, index) => (
                  <MetricCard key={index} metric={metric} />
                ))}
              </div>
            </div>
          )}

          {/* Users Tab */}
          {selectedTab === 'users' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">User Analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4">User Growth</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">New Users</span>
                      <span className="text-sm font-medium">+247 this month</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Alumni</span>
                      <span className="text-sm font-medium">{alumniCountLoading ? '–' : (alumniCount ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Active Users</span>
                      <span className="text-sm font-medium">1,234 (43%)</span>
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4">User Demographics</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Marine Engineering</span>
                      <span className="text-sm font-medium">45%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Naval Architecture</span>
                      <span className="text-sm font-medium">28%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Port Management</span>
                      <span className="text-sm font-medium">15%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Other</span>
                      <span className="text-sm font-medium">12%</span>
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4">Geographic Distribution</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Mumbai</span>
                      <span className="text-sm font-medium">35%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Alumni</span>
                      <span className="text-sm font-medium">{alumniCountLoading ? '–' : (alumniCount ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Kochi</span>
                      <span className="text-sm font-medium">18%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Other Cities</span>
                      <span className="text-sm font-medium">19%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;