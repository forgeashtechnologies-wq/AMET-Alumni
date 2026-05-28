import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import logger from '../utils/logger';

/**
 * PermissionGate - A component that conditionally renders children based on user permissions
 * 
 * @param {Object} props
 * @param {string|string[]} props.permissions - Single permission or array of permissions required
 * @param {boolean} props.requireAll - If true, user must have all permissions. If false, user only needs one. Default: false.
 * @param {React.ReactNode} props.children - Content to render if user has permission
 * @param {React.ReactNode} props.fallback - Optional content to render if user does not have permission
 * @returns {React.ReactNode}
 */
const PermissionGate = ({ 
  permissions, 
  requireAll = false, 
  children, 
  fallback = null
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        setChecking(true);
        
        if (!permissions) {
          setHasAccess(true);
          return;
        }
        
        let result = false;
        
        if (Array.isArray(permissions)) {
          // Check multiple permissions
          if (requireAll) {
            result = await hasAllPermissions(permissions);
          } else {
            result = await hasAnyPermission(permissions);
          }
        } else if (typeof permissions === 'string') {
          // Check a single permission
          result = await hasPermission(permissions);
        }
        
        setHasAccess(result);
      } catch (error) {
        logger.error('Error checking permissions:', error);
        setHasAccess(false);
      } finally {
        setChecking(false);
      }
    };
    
    checkPermissions();
  }, [permissions, requireAll, hasPermission, hasAnyPermission, hasAllPermissions]);

  if (checking) {
    // Optional: return a loading indicator during permission check
    return null;
  }

  return hasAccess ? children : fallback;
};

export default PermissionGate;
