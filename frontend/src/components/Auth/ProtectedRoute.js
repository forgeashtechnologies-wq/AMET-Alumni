import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isAdminLike } from '../../lib/roles';

// Backward compatible props: supports requiredPermission, isSuperAdminOnly
// New props: requireAdmin (boolean), allowRoles (array of role strings)
const ProtectedRoute = ({ children, requiredPermission, isSuperAdminOnly, requireAdmin = false, allowRoles, requireVerifiedEmail = false }) => {
  const { isAuthenticated, hasPermission, loading, userRole, getUserRole, session } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg mb-4 mx-auto animate-pulse">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <div className="text-gray-600 text-lg mb-2">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireVerifiedEmail) {
    const verified = !!session?.user?.email_confirmed_at;
    if (!verified) {
      return <Navigate to="/access-denied" state={{ from: location.pathname }} replace />;
    }
  }

  // New gating: enum-based role checks
  if (requireAdmin && !isAdminLike(userRole)) {
    return <Navigate to="/access-denied" state={{ from: location.pathname }} replace />;
  }

  if (allowRoles && Array.isArray(allowRoles) && allowRoles.length > 0) {
    if (!allowRoles.includes(userRole)) {
      return <Navigate to="/access-denied" state={{ from: location.pathname }} replace />;
    }
  }

  // Backward compatibility: permission and super admin flags
  if ((requiredPermission && !hasPermission(requiredPermission)) || 
      (isSuperAdminOnly && getUserRole() !== 'super_admin')) {
    // Redirect to the dedicated 'access-denied' page
    return <Navigate to="/access-denied" state={{ from: location.pathname }} replace />;
  }

  return children;
};

export default ProtectedRoute;
