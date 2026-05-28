import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminGate({ children }) {
  const { loading, getUserRole } = useAuth();
  if (loading) return <div className="p-6">Loading…</div>;
  const role = getUserRole?.() || 'alumni';
  if (role === 'admin' || role === 'super_admin') return children;
  return <Navigate to="/" replace />;
}
