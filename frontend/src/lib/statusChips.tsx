import React from 'react';

type ChipProps = { status: string };

const base = 'px-2 py-1 rounded text-xs font-medium';

export const ApprovalChip: React.FC<ChipProps> = ({ status }) => {
  const map: Record<string, string> = {
    approved: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    rejected: 'bg-red-100 text-red-800',
    deleted: 'bg-gray-100 text-gray-600',
  };
  return <span className={`${base} ${map[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
};

export const MentorStatusChip: React.FC<ChipProps> = ({ status }) => {
  return <ApprovalChip status={status} />;
};

export const RequestStatusChip: React.FC<ChipProps> = ({ status }) => {
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled_by_user: 'bg-gray-100 text-gray-700',
    cancelled_by_system: 'bg-gray-100 text-gray-700',
  };
  return <span className={`${base} ${map[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
};

export const RelationshipStatusChip: React.FC<ChipProps> = ({ status }) => {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    terminated_by_user: 'bg-gray-100 text-gray-700',
    terminated_by_system: 'bg-gray-100 text-gray-700',
  };
  return <span className={`${base} ${map[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
};
