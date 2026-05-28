import React from 'react';

const base = 'px-2 py-1 rounded text-xs font-medium';

export const ApprovalChip = ({ status }) => {
  const map = {
    approved: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    rejected: 'bg-red-100 text-red-800',
    deleted: 'bg-gray-100 text-gray-600',
  };
  return <span className={`${base} ${map[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
};

export const MentorStatusChip = ({ status }) => {
  return <ApprovalChip status={status} />;
};

export const RequestStatusChip = ({ status }) => {
  const map = {
    pending: 'bg-yellow-100 text-yellow-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled_by_user: 'bg-gray-100 text-gray-700',
    cancelled_by_system: 'bg-gray-100 text-gray-700',
  };
  return <span className={`${base} ${map[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
};

export const RelationshipStatusChip = ({ status }) => {
  const map = {
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    terminated_by_user: 'bg-gray-100 text-gray-700',
    terminated_by_system: 'bg-gray-100 text-gray-700',
  };
  return <span className={`${base} ${map[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
};
