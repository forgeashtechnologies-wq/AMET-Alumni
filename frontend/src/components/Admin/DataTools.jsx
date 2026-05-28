/**
 * DataTools - Admin page for data validation and integrity checks
 * Uses the useDataValidation hook to run and view validation results
 */
import React from 'react';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useDataValidation } from '../../hooks/useDataValidation';
import { useAuth } from '../../contexts/AuthContext';

// Issue card component
function IssueCard({ title, count, description, severity = 'warning' }) {
  const severityColors = {
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
  };

  return (
    <div className={`rounded-lg border p-4 ${severityColors[severity]}`}>
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{title}</h4>
        <span className="text-2xl font-bold">{count}</span>
      </div>
      <p className="text-sm mt-1 opacity-75">{description}</p>
    </div>
  );
}

// Validation run history item
function ValidationRunItem({ run }) {
  const date = new Date(run.created_at);
  const totalIssues = run.summary?.total_issues || 0;

  return (
    <div className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center space-x-3">
        <ClockIcon className="h-5 w-5 text-gray-400" />
        <div>
          <p className="text-sm font-medium text-gray-900">
            {date.toLocaleDateString()} at {date.toLocaleTimeString()}
          </p>
          <p className="text-xs text-gray-500">
            Scope: {run.scope || 'all'} | Duration: {run.duration_ms || '?'}ms
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {totalIssues === 0 ? (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="h-3 w-3 mr-1" />
            No issues
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
            {totalIssues} issue{totalIssues !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}

export default function DataTools() {
  const { isAdmin } = useAuth();
  const {
    validationRuns,
    latestRun,
    issues,
    isLoading,
    isRunning,
    runValidation,
    refetch,
  } = useDataValidation();

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ShieldCheckIcon className="h-8 w-8 text-ocean-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Data Tools</h1>
            <p className="text-sm text-gray-600">
              Validate data integrity and find orphaned records
            </p>
          </div>
        </div>
        <button
          onClick={() => runValidation('all')}
          disabled={isRunning}
          className="inline-flex items-center px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? (
            <>
              <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <ArrowPathIcon className="h-5 w-5 mr-2" />
              Run Validation
            </>
          )}
        </button>
      </div>

      {/* Latest Results Summary */}
      {latestRun && (
        <div className="glass-card rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Latest Validation Results
            </h2>
            <span className="text-sm text-gray-500">
              {new Date(latestRun.created_at).toLocaleString()}
            </span>
          </div>

          {issues.total === 0 ? (
            <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
              <div>
                <p className="font-medium text-green-800">All checks passed!</p>
                <p className="text-sm text-green-600">
                  No data integrity issues were found.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <IssueCard
                title="Orphan Event RSVPs"
                count={issues.orphanEventRsvps}
                description="RSVPs for deleted events"
                severity={issues.orphanEventRsvps > 0 ? 'warning' : 'success'}
              />
              <IssueCard
                title="Orphan Job Applications"
                count={issues.orphanJobApplications}
                description="Applications for deleted jobs"
                severity={issues.orphanJobApplications > 0 ? 'warning' : 'success'}
              />
              <IssueCard
                title="Orphan Group Members"
                count={issues.orphanGroupMembers}
                description="Members of deleted groups"
                severity={issues.orphanGroupMembers > 0 ? 'warning' : 'success'}
              />
              <IssueCard
                title="Profiles Missing Email"
                count={issues.profilesMissingEmail}
                description="User profiles without email"
                severity={issues.profilesMissingEmail > 0 ? 'error' : 'success'}
              />
              <IssueCard
                title="Jobs Missing Title"
                count={issues.jobsMissingTitle}
                description="Job postings without title"
                severity={issues.jobsMissingTitle > 0 ? 'error' : 'success'}
              />
              <IssueCard
                title="Events Missing Title"
                count={issues.eventsMissingTitle}
                description="Events without title"
                severity={issues.eventsMissingTitle > 0 ? 'error' : 'success'}
              />
            </div>
          )}
        </div>
      )}

      {/* Validation History */}
      <div className="glass-card rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Validation History
          </h2>
          <button
            onClick={refetch}
            disabled={isLoading}
            className="text-sm text-ocean-600 hover:text-ocean-700"
          >
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin" />
          </div>
        ) : validationRuns.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            <ShieldCheckIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No validation runs yet.</p>
            <p className="text-sm">Click "Run Validation" to check your data.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {validationRuns.map((run) => (
              <ValidationRunItem key={run.id} run={run} />
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="glass-card rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => runValidation('profiles')}
            disabled={isRunning}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Validate Profiles</h4>
            <p className="text-sm text-gray-500">Check user profile data</p>
          </button>
          <button
            onClick={() => runValidation('events')}
            disabled={isRunning}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Validate Events</h4>
            <p className="text-sm text-gray-500">Check event data and RSVPs</p>
          </button>
          <button
            onClick={() => runValidation('jobs')}
            disabled={isRunning}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Validate Jobs</h4>
            <p className="text-sm text-gray-500">Check job postings and applications</p>
          </button>
        </div>
      </div>
    </div>
  );
}
