import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function RequireCompleteProfile({ children }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return null; // let app-level spinner render
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  // Onboarding retired: allow access even if profile is incomplete or missing avatar
  return children;
}
