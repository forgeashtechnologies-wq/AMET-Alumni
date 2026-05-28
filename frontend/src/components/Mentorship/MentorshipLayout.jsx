import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import MentorshipTabs from './MentorshipTabs';
import MentorshipHub from './MentorshipHub';
import MentorshipStatusBannerStrip from './banners/MentorshipStatusBannerStrip';

/**
 * Main layout shell for the mentorship module.
 * Provides consistent header, status banners, tab navigation, and hub.
 * Uses 4px spacing grid for atomic UI consistency.
 */
export default function MentorshipLayout() {
  const { role: authRole, getUserRole } = useAuth();
  const computedRole = authRole || (typeof getUserRole === 'function' ? getUserRole() : null);
  const isAdmin = computedRole === 'admin' || computedRole === 'super_admin';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">
                Mentorship
              </h1>
              <Link
                to="/mentorship/info"
                className="inline-flex items-center rounded-full bg-ocean-50 text-ocean-700 text-xs font-semibold px-2 py-1 border border-ocean-100 hover:bg-ocean-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
              >
                Info
              </Link>
            </div>
            {isAdmin && (
              <Link
                to="/admin/mentor-approvals"
                className="inline-flex items-center justify-center rounded-md border border-ocean-500 text-ocean-700 px-4 py-2 text-sm font-semibold hover:bg-ocean-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 transition-colors shadow-sm"
              >
                Mentorship Admin
              </Link>
            )}
          </div>
          <p className="text-sm text-slate-600 max-w-2xl">
            Connect with trainers, guide trainees, and grow your professional network.
          </p>
        </div>
      </div>
      
      {/* Status Banners */}
      <MentorshipStatusBannerStrip />
      
      {/* Tab Navigation */}
      <MentorshipTabs />

      {/* Hub Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <MentorshipHub />
      </div>
    </div>
  );
}
