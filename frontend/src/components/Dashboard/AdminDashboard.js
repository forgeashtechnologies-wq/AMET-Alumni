import React from 'react';
import { supabase } from '../../utils/supabase';
import { Link } from 'react-router-dom';
import { 
  UsersIcon, 
  CalendarIcon, 
  BriefcaseIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import useRoleCounts from '../../hooks/useRoleCounts';

const AdminDashboard = ({ user }) => {
  const { displayCounts, loading: countsLoading } = useRoleCounts();

  const totalAlumniValue = countsLoading
    ? '…'
    : (displayCounts.alumni?.toLocaleString?.() || String(displayCounts.alumni ?? 0));

  const systemStats = [
    { title: 'Total Alumni', value: totalAlumniValue, change: '', icon: UsersIcon, color: 'bg-blue-500' },
    { title: 'Active Events', value: '15', change: '+3', icon: CalendarIcon, color: 'bg-green-500' },
    { title: 'Job Postings', value: '89', change: '+8%', icon: BriefcaseIcon, color: 'bg-purple-500' },
    { title: 'System Alerts', value: '3', change: '-2', icon: ExclamationTriangleIcon, color: 'bg-red-500' }
  ];

  const pendingApprovals = [
    { id: 1, type: 'user', title: 'New Alumni Registration - Sarah Johnson', time: '2 hours ago', priority: 'high' },
    { id: 2, type: 'event', title: 'Tech Meetup 2024 Event Approval', time: '4 hours ago', priority: 'medium' },
    { id: 3, type: 'job', title: 'Senior Developer Job Posting', time: '6 hours ago', priority: 'low' },
    { id: 4, type: 'content', title: 'Alumni Achievement Submission', time: '1 day ago', priority: 'medium' }
  ];

  const recentActivities = [
    { id: 1, action: 'User approved', user: 'John Smith', time: '30 mins ago', status: 'completed' },
    { id: 2, action: 'Event created', user: 'Admin', time: '2 hours ago', status: 'completed' },
    { id: 3, action: 'Job posting approved', user: 'HR Manager', time: '4 hours ago', status: 'completed' },
    { id: 4, action: 'System backup', user: 'System', time: '6 hours ago', status: 'completed' }
  ];

  const systemAlerts = [
    { id: 1, type: 'warning', message: 'Server storage at 85% capacity', severity: 'medium' },
    { id: 2, type: 'info', message: 'Scheduled maintenance tomorrow at 2 AM', severity: 'low' },
    { id: 3, type: 'error', message: 'Email service temporary disruption', severity: 'high' }
  ];

  const quickActions = [
    { title: 'User Management', icon: UsersIcon, link: '/admin/users', color: 'bg-blue-500' },
    { title: 'User Approval', icon: CheckCircleIcon, link: '/admin/user-approval', color: 'bg-yellow-500' },
    { title: 'Mentor Approval', icon: CheckCircleIcon, link: '/admin/mentor-approval', color: 'bg-teal-500' },
    { title: 'Analytics', icon: ChartBarIcon, link: '/admin/analytics', color: 'bg-green-500' },
    { title: 'System Settings', icon: CogIcon, link: '/admin/settings', color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="glass-card rounded-lg p-6 bg-gradient-to-r from-ocean-500 to-blue-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Admin Dashboard 🚀
            </h1>
            <p className="mt-1 opacity-90">
              Manage and monitor the AMET Alumni System
            </p>
          </div>
          <div className="hidden md:block">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <CogIcon className="w-8 h-8 text-white ocean-wave" />
            </div>
          </div>
        </div>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {systemStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="glass-card rounded-lg p-6 card-hover">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className={`text-sm ${stat.change.startsWith('+') ? 'text-green-600' : stat.change.startsWith('-') ? 'text-red-600' : 'text-gray-600'}`}>
                    {stat.change} from last month
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Approvals */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Pending Approvals</h2>
              <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                {pendingApprovals.length} pending
              </span>
            </div>
            <div className="space-y-4">
              {pendingApprovals.map((item) => (
                <div key={item.id} className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-ocean-50 transition-colors">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      item.priority === 'high' ? 'bg-red-100' :
                      item.priority === 'medium' ? 'bg-yellow-100' : 'bg-green-100'
                    }`}>
                      {item.type === 'user' && <UsersIcon className="w-5 h-5 text-gray-600" />}
                      {item.type === 'event' && <CalendarIcon className="w-5 h-5 text-gray-600" />}
                      {item.type === 'job' && <BriefcaseIcon className="w-5 h-5 text-gray-600" />}
                      {item.type === 'content' && <CheckCircleIcon className="w-5 h-5 text-gray-600" />}
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.time}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium hover:bg-green-200">
                      Approve
                    </button>
                    <button className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium hover:bg-red-200">
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Alerts & Recent Activity */}
        <div className="space-y-6">
          {/* System Alerts */}
          <div className="glass-card rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Alerts</h3>
            <div className="space-y-3">
              {systemAlerts.map((alert) => (
                <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${
                  alert.severity === 'high' ? 'bg-red-50 border-red-400' :
                  alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-400' :
                  'bg-blue-50 border-blue-400'
                }`}>
                  <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                  <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${
                    alert.severity === 'high' ? 'bg-red-100 text-red-800' :
                    alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {alert.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass-card rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.action}</span>
                      {activity.user !== 'System' && (
                        <>
                          {' by '}
                          <span className="font-medium">{activity.user}</span>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Link 
              key={index}
              to={action.link} 
              className="glass-card rounded-lg p-6 text-center card-hover"
            >
              <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mx-auto mb-3`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-medium text-gray-900">{action.title}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default AdminDashboard;