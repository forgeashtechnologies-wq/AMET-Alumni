import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  UserGroupIcon,
  BriefcaseIcon,
  DocumentCheckIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [pendingContent, setPendingContent] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAllDashboardData();
    const interval = setInterval(fetchAllDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllDashboardData = async () => {
    setLoading(true);

    const [statsResult, analyticsResult, pendingResult] = await Promise.allSettled([
      supabase.rpc('get_dashboard_stats'),
      supabase.rpc('get_user_analytics'),
      supabase.rpc('get_pending_content'),
    ]);

    if (statsResult.status === 'fulfilled' && !statsResult.value.error) {
      setStats(statsResult.value.data);
      setRecentActivity(statsResult.value.data?.recentActivity || []);
    } else {
      logger.error('Error fetching dashboard stats:', statsResult.value?.error || statsResult.reason);
      toast.error('Failed to load dashboard stats.');
      setStats(null); // Clear old data on failure
      setRecentActivity([]);
    }

    if (analyticsResult.status === 'fulfilled' && !analyticsResult.value.error) {
      setAnalytics(analyticsResult.value.data);
    } else {
      logger.error('Error fetching user analytics:', analyticsResult.value?.error || analyticsResult.reason);
      toast.error('Failed to load user analytics.');
      setAnalytics(null);
    }

    if (pendingResult.status === 'fulfilled' && !pendingResult.value.error) {
      setPendingContent(pendingResult.value.data || []);
    } else {
      logger.error('Error fetching pending content:', pendingResult.value?.error || pendingResult.reason);
      toast.error('Failed to load pending content.');
      setPendingContent([]);
    }

    setLoading(false);
  };

  const handleModerateContent = async (contentId, contentType, action) => {
    try {
      const { error } = await supabase.rpc('moderate_content', {
        p_content_id: contentId,
        p_content_type: contentType,
        p_action: action
      });

      if (error) throw error;

      toast.success(`${contentType} ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      fetchAllDashboardData();
      
    } catch (error) {
      logger.error('Error moderating content:', error);
      toast.error(`Failed to ${action} ${contentType}`);
    }
  };

  const StatCard = ({ title, value, icon, color }) => {
    const Icon = icon;
    return (
      <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${color}`}>
        <div className="flex items-center">
          <div className="mr-4">
            <Icon className="h-10 w-10 text-gray-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold">{value || '0'}</p>
          </div>
        </div>
      </div>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const renderOverview = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
        <StatCard title="Total Users" value={stats?.totalUsers} icon={UserGroupIcon} color="border-blue-500" />
        <StatCard title="Active Jobs" value={stats?.activeJobs} icon={BriefcaseIcon} color="border-green-500" />
        <StatCard title="Pending Applications" value={stats?.pendingApplications} icon={DocumentCheckIcon} color="border-yellow-500" />
        <StatCard title="Total Applications" value={stats?.totalApplications} icon={ClockIcon} color="border-purple-500" />
        <StatCard title="Messages Today" value={stats?.messagesToday} icon={ChatBubbleLeftRightIcon} color="border-pink-500" />
      </div>
      <div className="bg-white rounded-lg shadow mb-8 p-6">
        <h2 className="text-lg font-semibold mb-4">Users by Role</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats?.usersByRole && Object.entries(stats.usersByRole).map(([role, count]) => (
            <div key={role} className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-sm font-medium text-gray-500 capitalize">{role}</p>
              <p className="text-2xl font-bold">{count}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        {recentActivity.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentActivity.map((activity) => (
                  <tr key={activity.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{activity.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{activity.activityType?.replace(/_/g, ' ')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(activity.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No recent activity found.</p>
        )}
      </div>
    </>
  );

  const renderAnalytics = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">User Analytics</h2>
      {analytics ? (
        <div>
          <h3 className="font-semibold">Registrations (last 30 days)</h3>
          <div className="flex space-x-2">
            {(Array.isArray(analytics?.registrationsByDate) ? analytics.registrationsByDate : []).map((d) => (
              <div key={d.date}>{d.date}: {d.count}</div>
            ))}
          </div>
        </div>
      ) : <p>No analytics data.</p>}
    </div>
  );

  const renderPendingContent = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Pending Content Approval</h2>
      {pendingContent.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted by</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingContent.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{item.content_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(item.created_at)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => handleModerateContent(item.id, item.content_type, 'approve')} className="text-indigo-600 hover:text-indigo-900 mr-4">Approve</button>
                    <button onClick={() => handleModerateContent(item.id, item.content_type, 'reject')} className="text-red-600 hover:text-red-900">Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-4">No pending content.</p>
      )}
    </div>
  );

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Enhanced Admin Dashboard</h1>
        <div className="flex space-x-2">
          <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg ${activeTab === 'overview' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Overview</button>
          <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 rounded-lg ${activeTab === 'analytics' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Analytics</button>
          <button onClick={() => setActiveTab('pending')} className={`px-4 py-2 rounded-lg ${activeTab === 'pending' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Pending ({pendingContent.length})</button>
        </div>
      </div>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'analytics' && renderAnalytics()}
      {activeTab === 'pending' && renderPendingContent()}
      
      {stats?.lastUpdated && (
        <p className="text-xs text-gray-500 mt-4 text-right">
          Last updated: {new Date(stats.lastUpdated).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
};

export default Dashboard;
