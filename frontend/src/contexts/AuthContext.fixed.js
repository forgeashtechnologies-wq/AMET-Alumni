import logger from '../utils/logger';
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase, signOut as supabaseSignOut } from '../utils/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [permissionsCache, setPermissionsCache] = useState({});
  const listenerRef = useRef(null);

  // Track initialization state with ref to prevent duplicate inits
  const initializedRef = useRef(false);

  // Helper to get user role - defined early to avoid temporal dead zone issues
  const getUserRole = useCallback(() => {
    if (!profile && !user) return 'alumni';

    // Check profile role first (canonical, enum-backed source of truth)
    if (profile?.role) {
      // Explicit role checks
      if (profile.role === 'super_admin') return 'super_admin';
      if (profile.role === 'admin') return 'admin';
      if (profile.role === 'employer') return 'employer';
      if (profile.role === 'student') return 'student';
      if (profile.role === 'alumni') return 'alumni';
      return profile.role;
    }

    // Fallbacks if no profile role
    // Check if admin based on email domain and is_admin flag
    if (profile?.email?.includes('@amet.ac.in') && profile?.is_admin) {
      return 'admin';
    }

    // Check if employer based on is_employer flag
    if (profile?.is_employer) {
      return 'employer';
    }

    // Final fallback to user metadata or default (legacy support only)
    const metaRole = user?.user_metadata?.role;
    if (metaRole === 'alumni' || metaRole === 'student' || metaRole === 'employer' || metaRole === 'admin' || metaRole === 'super_admin') {
      return metaRole;
    }
    return 'alumni';
  }, [profile, user]);

  const fetchUserProfile = useCallback(async (userId) => {
    logger.log(`Fetching profile for userId: ${userId}`);
    if (!userId) {
      logger.error("fetchUserProfile called with no userId.");
      setProfile(null);
      setLoading(false);
      return null;
    }

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
        .throwOnError();

      setProfile(profileData);
      return profileData;
    } catch (error) {
      logger.error('Error fetching profile:', error);
      setProfile(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabaseSignOut();
      // State will be cleared by the onAuthStateChange listener
    } catch (error) {
      logger.error('Sign out error:', error);
      // Force state clear on error
      setUser(null);
      setProfile(null);
      setSession(null);
    }
  }, []);

  const updateProfile = useCallback(async (updates) => {
    if (!user) {
      logger.error('Cannot update profile: No authenticated user');
      throw new Error('No authenticated user');
    }
    
    try {
      // Check if profile exists first
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      // Create a copy of updates to avoid mutating the original
      const updatesToApply = { ...updates };
      
      // Always include updated_at
      updatesToApply.updated_at = new Date().toISOString();
      
      logger.log('Applying profile updates:', updatesToApply);
      
      let result;
      
      if (existingProfile) {
        // Update existing profile
        const { data, error } = await supabase
          .from('profiles')
          .update(updatesToApply)
          .eq('id', user.id)
          .select()
          .single();
          
        if (error) {
          logger.error('Error updating profile:', error);
          throw error;
        }
        result = data;
      } else {
        // Create new profile
        const newProfileData = { 
          id: user.id,
          ...updatesToApply,
          created_at: new Date().toISOString()
        };
        
        logger.log('Creating new profile with data:', newProfileData);
        
        const { data, error } = await supabase
          .from('profiles')
          .insert([newProfileData])
          .select()
          .single();
          
        if (error) {
          logger.error('Error creating profile:', error);
          throw error;
        }
        
        result = data;
      }
      
      // Re-fetch the profile to ensure the auth context has the latest data.
      if (result) {
        await fetchUserProfile(user.id);
      }
      
      logger.log('Profile updated successfully:', result);
      return result;
    } catch (error) {
      logger.error('Error in updateProfile:', error);
      throw error;
    }
  }, [user, fetchUserProfile]);

  // Permission checking functions - IMPORTANT: do not include getUserRole in dependency arrays
  const hasPermission = useCallback(async (permissionName) => {
    if (!user) return false;
    
    // For super_admin, always return true
    if (getUserRole() === 'super_admin') return true;
    
    // Check cache first
    if (permissionsCache[permissionName] !== undefined) {
      return permissionsCache[permissionName];
    }
    
    try {
      const { data, error } = await supabase.rpc(
        'has_permission',
        { user_id: user.id, permission_name: permissionName }
      );
      
      if (error) {
        logger.error('Error checking permission:', error);
        return false;
      }
      
      // Cache the result
      setPermissionsCache(prev => ({
        ...prev,
        [permissionName]: !!data
      }));
      
      return !!data;
    } catch (error) {
      logger.error('Permission check failed:', error);
      return false;
    }
  }, [user, permissionsCache, profile]); // Depend on profile instead of getUserRole
  
  const hasAnyPermission = useCallback(async (permissions) => {
    if (!user || !permissions || !permissions.length) return false;
    
    // For super_admin, always return true
    if (getUserRole() === 'super_admin') return true;
    
    try {
      const results = await Promise.all(
        permissions.map(permission => hasPermission(permission))
      );
      
      return results.some(result => result === true);
    } catch (error) {
      logger.error('Permission check failed:', error);
      return false;
    }
  }, [user, hasPermission, profile]); // Depend on profile instead of getUserRole
  
  const hasAllPermissions = useCallback(async (permissions) => {
    if (!user || !permissions || !permissions.length) return false;
    
    // For super_admin, always return true
    if (getUserRole() === 'super_admin') return true;
    
    try {
      const results = await Promise.all(
        permissions.map(permission => hasPermission(permission))
      );
      
      return results.every(result => result === true);
    } catch (error) {
      logger.error('Permission check failed:', error);
      return false;
    }
  }, [user, hasPermission, profile]); // Depend on profile instead of getUserRole

  useEffect(() => {
    logger.log('AuthProvider useEffect started.');

    // Prevent duplicate initialization in development
    if (initializedRef.current) {
      logger.log('Auth already initialized, skipping duplicate init');
      return;
    }
    initializedRef.current = true;

    // Add a timeout to prevent getting stuck on loading indefinitely
    const loadingTimeout = setTimeout(() => {
      logger.error('Auth process timed out after 8 seconds.');
      setLoading(false);
    }, 8000);

    const initializeAuth = async () => {
      logger.log('1. Initializing authentication...');
      try {
        const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
        const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;

        if (!supabaseUrl || !supabaseKey) {
          logger.error('CRITICAL: Supabase URL or Key is missing. Check your .env.development file.');
          setLoading(false);
          clearTimeout(loadingTimeout);
          return;
        }
        logger.log('2. Supabase credentials found.');

        if (!supabase?.auth) {
          logger.error('CRITICAL: Supabase auth module is not available.');
          setLoading(false);
          clearTimeout(loadingTimeout);
          return;
        }
        logger.log('3. Supabase client is available.');

        // Check for existing session first
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession) {
          logger.log('3.5. Found existing session');
          setUser(existingSession.user);
          setSession(existingSession);
          await fetchUserProfile(existingSession.user.id);
        }

        // Set up auth state change listener
        logger.log('4. Setting up onAuthStateChange listener...');
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          clearTimeout(loadingTimeout);
          logger.log(`5. Auth state change event: ${event}`, { hasSession: !!session });
          
          const currentUser = session?.user || null;
          setUser(currentUser);
          setSession(session);

          try {
            if (currentUser) {
              logger.log('6a. User found, checking if profile needs update...');
              // Only fetch profile if we don't have one or if user changed
              if (!profile || profile.id !== currentUser.id) {
                await fetchUserProfile(currentUser.id);
              }
            } else {
              logger.log('6b. No user session, resetting profile.');
              setProfile(null);
            }
          } catch (e) {
            logger.error("Error during profile fetch on auth change:", e);
            setProfile(null);
          } finally {
            logger.log('7. Auth process finished. Setting loading to false.');
            setLoading(false);
          }
        });

        listenerRef.current = subscription;

      } catch (error) {
        logger.error('CRITICAL: Error during auth initialization:', error);
        setLoading(false);
        clearTimeout(loadingTimeout);
      }
    };

    initializeAuth();

    // Cleanup function
    return () => {
      logger.log('AuthProvider cleanup function called.');
      clearTimeout(loadingTimeout);
      if (listenerRef.current) {
        logger.log('Unsubscribing auth listener');
        listenerRef.current.unsubscribe();
        listenerRef.current = null;
      }
      initializedRef.current = false;
    };
  }, [profile?.id, fetchUserProfile]); // Only re-run if profile ID changes

  const userRole = getUserRole();
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  const value = {
    user,
    profile,
    session,
    loading,
    signOut,
    updateProfile,
    fetchUserProfile,
    isAuthenticated: !!user,
    isAdmin,
    userRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getUserRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
