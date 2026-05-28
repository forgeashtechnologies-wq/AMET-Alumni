import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { can } from '../utils/permissions';
import GroupsList from '../components/Groups/GroupsList';
import CreateGroup from '../components/Groups/CreateGroup';
import GroupDetail from '../components/Groups/GroupDetail';

const GroupsPage = () => {
  const { user, hasPermission, userRole } = useAuth();
  
  // Check if user has permission to access groups
  const hasGroupAccess = hasPermission('access:groups');

  // Gate create-permissions to alumni/admin/super_admin as per new rules
  const canCreate = can('groups:create', userRole);

  return (
    <Routes>
      <Route 
        path="/" 
        element={hasGroupAccess ? <GroupsList /> : <Navigate to="/dashboard" replace />} 
      />
      <Route
        path="new"
        element={
          user && hasGroupAccess && canCreate ? (
            <CreateGroup />
          ) : (
            <Navigate 
              to={user ? "/groups" : "/login"} 
              replace 
              state={{ from: window.location.pathname }} 
            />
          )
        }
      />
      <Route
        path=":id"
        element={
          user ? (
            <GroupDetail />
          ) : (
            <Navigate to="/login" replace state={{ from: window.location.pathname }} />
          )
        }
      />
    </Routes>
  );
};

export default GroupsPage;
