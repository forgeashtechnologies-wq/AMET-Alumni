import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase, mapOAuthToProfileData, onPostgresChangesOnce } from '../utils/supabase';
import { upsertMyProfileFillOnly } from '../services/profile';
import { ROLES, isRole } from '../constants/roles';
import logger from '../utils/logger';

const fingerprintToken = (token) => {
  if (!token) return null;
  try {
    let hash = 0;
    const str = String(token);
    for (let i = 0; i < str.length; i += 1) {
      hash = (hash * 31 + str.charCodeAt(i)) | 0;
    }
    const hex = (hash >>> 0).toString(16);
    return `h${str.length}_${hex}`;
  } catch (_) {
    return null;
  }
};

// Whitelist of user-editable profile fields to avoid admin-only columns
const SAFE_PROFILE_FIELDS = [
  'id',
  'email',
  'full_name',
  'first_name',
  'last_name',
  'phone',
  'graduation_year',
  'expected_graduation_year',
  'degree_code',
  'department_id',
  'company_name',
  'current_job_title',
  'location',
  'avatar_url',
  'industry',
  'company_size',
  'company_website',
  'role',
];

const pickSafeProfileFields = (src) => {
  const out = {};
  for (const k of SAFE_PROFILE_FIELDS) if (k in src) out[k] = src[k];
  return out;
};

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Store auth session in window to persist across React renders
if (!window.AMET_AUTH) {
  window.AMET_AUTH = {
    initialized: false,
    profileFetched: null,
    currentUserId: null,
    authInProgress: false, // Track auth operations to prevent race conditions
    lastAuthEvent: null,   // Track last auth event type
    initTime: Date.now()   // Track when auth was initialized
  };
}

// Define base permissions for each role (full capabilities when fully approved)
const BASE_PERMISSIONS = {
  // Alumni role permissions
  alumni: [
    'access:dashboard',
    'view:jobs',
    'apply:jobs',
    'access:events',
    'view:alumni_directory',
    'request:mentorship',
    'become:mentor',
    'access:groups',
    'message:users',
    'access:profile_settings',
    'manage:mentor_profile',
    'manage:mentee_requests',
    'chat:mentees',
    'manage:mentoring_slots',
  ],
  employer: [
    'access:dashboard',
    'view:jobs',            // allow Job Portal menu visibility
    'post:jobs',
    'manage:jobs',
    'view:job_applications',
    'manage:company_profile',
    'access:events',
    'message:users',        // allow messaging entry and gated chat
    'access:profile_settings',
  ],
  admin: [
    'access:all',
    'access:events',
    'events:create',
  ],
  super_admin: [
    'access:all',
    'access:events',
    'events:create',
    'view:feedback_reports',
  ],
  student: [
    'access:dashboard',
    'view:jobs',
    'apply:jobs',
    'access:events',
    'view:alumni_directory',
    'request:mentorship',
    'access:groups',
    'message:users',
    'access:profile_settings',
  ],
};

function derivePermissions(role, approvalFlags, isReadOnlyAccount) {
  const base = BASE_PERMISSIONS[role] || [];
  const approvalStatus = approvalFlags?.approvalStatus || 'pending';
  const isFullyApproved = approvalFlags?.isFullyApproved ?? false;

  // Admin & super_admin always keep full permissions
  if (role === 'admin' || role === 'super_admin') {
    return base;
  }

  // If rejected, return an empty permission set (they are normally redirected)
  if (approvalStatus === 'rejected') {
    return [];
  }

  // If fully approved -> full base permissions
  if (isFullyApproved) {
    return base;
  }

  // Pending logic per role
  if (role === 'student' || role === 'alumni') {
    return [
      'access:dashboard',
      'access:profile_settings',
      // Allow read-only listings, including browsing the alumni directory
      'view:jobs',
      'access:events',
      'view:alumni_directory',
    ];
  }

  if (role === 'employer') {
    return [
      'access:dashboard',
      'view:jobs',
      'access:events',
      'access:profile_settings',
    ];
  }

  // Default: fallback to base permissions
  let permissions = [...base];

  if (!isFullyApproved) {
    permissions = permissions.filter((perm) => {
      if (perm.startsWith('access:')) return true;
      if (perm.startsWith('view:')) return true;
      if (perm === 'access:profile_settings') return true;
      return false;
    });
  }

  if (isReadOnlyAccount && role !== 'admin' && role !== 'super_admin') {
    permissions = permissions.filter((perm) => perm.startsWith('access:') || perm.startsWith('view:'));
  }

  return permissions;
}

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [rejectionStatus, setRejectionStatus] = useState({ isRejected: false, reason: null });
  const [approvalFlags, setApprovalFlags] = useState(null);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  
  // Use refs that survive hot reloads but also window.AMET_AUTH for strict mode
  const initializedRef = useRef(window.AMET_AUTH.initialized);
  const profileFetchedRef = useRef(window.AMET_AUTH.profileFetched);

  const fetchUserProfile = useCallback(async (userId, force = false) => {
    // If no userId, exit early
    if (!userId) {
      logger.log('No userId provided to fetchUserProfile');
      setProfile(null);
      setLoading(false);
      return;
    }

    // Check if another auth operation is in progress to prevent race conditions
    if (window.AMET_AUTH.authInProgress) {
      logger.log(`Auth operation already in progress, deferring fetch for userId: ${userId}`);
      // We'll set a flag to indicate this was attempted
      window.AMET_AUTH.pendingFetch = userId;
      return;
    }
    
    // CRITICAL: Detect when user ID changes during session
    const previousUserId = window.AMET_AUTH.currentUserId;
    if (previousUserId && previousUserId !== userId) {
      logger.log(`⚠️ User ID changed from ${previousUserId} to ${userId}, resetting auth state`);
      // Clear all state before proceeding with new user
      setProfile(null);
    }
    
    // Prevent multiple fetches for the same user
    if (profileFetchedRef.current === userId && !force) {
      logger.log(`Profile already fetched for userId: ${userId}, skipping fetch`);
      return;
    }

    logger.log(`Fetching profile for userId: ${userId}`);
    
    // Set operation in progress flag to prevent race conditions
    window.AMET_AUTH.authInProgress = true;
    
    // Store in both ref and window for Strict Mode and HMR survival
    profileFetchedRef.current = userId;
    window.AMET_AUTH.profileFetched = userId;
    window.AMET_AUTH.currentUserId = userId;

    try {
      // Simple atomic profile fetch - keep this small and focused
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      // Debug what we actually got
      logger.log('Profile fetch result:', { profileData, hasData: !!profileData, dataKeys: profileData ? Object.keys(profileData) : 'null' });
      
      // Check rejection status
      if (profileData && profileData.alumni_verification_status === 'rejected') {
        logger.log('User account is rejected');
        setRejectionStatus({ isRejected: true });
        setProfile(null); // No profile data for rejected users
      } else if (profileData) {
        logger.log('Profile fetched successfully:', profileData);
        setProfile(profileData);
      } else {
        // No profile exists - create a seed row from auth metadata as a fallback
        logger.log('No profile found for user; attempting to create from auth metadata');
        try {
          const { data: authData } = await supabase.auth.getUser();
          const u = authData?.user;
          if (u?.id === userId) {
            const md = u.user_metadata || {};
            const seed = {
              id: u.id,
              email: u.email,
              first_name: md.first_name || null,
              last_name: md.last_name || null,
              phone: md.phone || null,
              graduation_year: md.graduation_year ? Number(md.graduation_year) : null,
              expected_graduation_year: md.expected_graduation_year ? Number(md.expected_graduation_year) : null,
              degree_code: md.degree_code || null,
              department_id: md.department_id || null,
              company_name: md.company_name || null,
              current_job_title: md.current_job_title || md.job_title || null,
              location: md.location || null,
              avatar_url: md.avatar_url || md.avatar || null,
            };
            const sanitized = Object.fromEntries(Object.entries(seed).filter(([, v]) => v !== undefined));
            const safePayload = pickSafeProfileFields(sanitized);
            let { data: created, error: createErr } = await supabase
              .from('profiles')
              .upsert(safePayload)
              .select()
              .maybeSingle();
            if (createErr) {
              const msg = String(createErr.message || createErr);
              logger.warn('Failed to create profile from auth metadata:', msg);
              // Retry without FK-prone fields
              try {
                const minimal = { ...safePayload };
                delete minimal.degree_code;
                delete minimal.department_id;
                const minimalSafe = pickSafeProfileFields(minimal);
                ({ data: created } = await supabase
                  .from('profiles')
                  .upsert(minimalSafe)
                  .select()
                  .maybeSingle());
                if (created) {
                  logger.log('Created minimal profile after FK retry');
                  setProfile(created);
                } else {
                  setProfile(null);
                }
              } catch (retryErr) {
                logger.warn('Profile seed retry failed:', retryErr);
                setProfile(null);
              }
            } else {
              logger.log('Created profile from auth metadata');
              setProfile(created || null);
            }
          } else {
            setProfile(null);
          }
        } catch (seedErr) {
          logger.warn('Error during profile seed creation:', seedErr);
          setProfile(null);
        }
      }
    } catch (error) {
      logger.error('Error fetching profile:', error);
      // Fallback: attempt to create a minimal profile row for the current user
      try {
        const { data: authData } = await supabase.auth.getUser();
        const u = authData?.user;
        if (u?.id === userId) {
          const md = u.user_metadata || {};
          const seed = {
            id: u.id,
            email: u.email,
            first_name: md.first_name || null,
            last_name: md.last_name || null,
            location: md.location || null,
            avatar_url: md.avatar_url || md.avatar || null,
            created_at: new Date().toISOString(),
          };
          const sanitized = Object.fromEntries(Object.entries(seed).filter(([, v]) => v !== undefined));
          const safePayload = pickSafeProfileFields(sanitized);
          const { data: created } = await supabase
            .from('profiles')
            .upsert(safePayload)
            .select()
            .maybeSingle();
          if (created) {
            logger.log('Created minimal profile after fetch error');
            setProfile(created);
          } else {
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
      } catch (seedErr) {
        logger.warn('Profile seed after error failed:', seedErr);
        setProfile(null);
      }
    } finally {
      // Clear auth operation flag to allow subsequent operations
      window.AMET_AUTH.authInProgress = false;
      
      // Check for any pending fetch operations that were deferred
      if (window.AMET_AUTH.pendingFetch && window.AMET_AUTH.pendingFetch !== userId) {
        const pendingUserId = window.AMET_AUTH.pendingFetch;
        logger.log(`Processing deferred profile fetch for userId: ${pendingUserId}`);
        window.AMET_AUTH.pendingFetch = null;
        // Schedule the deferred fetch after a small delay to avoid state conflicts
        setTimeout(() => fetchUserProfile(pendingUserId), 50);
      }
      
      setLoading(false);
    }
  }, []);

  const computeApprovalFlagsFromProfile = useCallback((p) => {
    if (!p) {
      return { approvalStatus: null, isFullyApproved: false };
    }
    const approvalStatus =
      p.approval_status ||
      p.alumni_verification_status ||
      (p.is_approved ? 'approved' : 'pending');
    return {
      approvalStatus: approvalStatus || null,
      isFullyApproved: approvalStatus === 'approved',
    };
  }, []);

  const refreshApprovalFlags = useCallback(
    async (userId) => {
      if (!userId) {
        setApprovalFlags(null);
        return;
      }
      try {
        const { data, error } = await supabase.rpc('get_current_user_flags');
        if (error) {
          logger.warn('get_current_user_flags failed, falling back to profile fields:', error);
          setApprovalFlags(computeApprovalFlagsFromProfile(profile));
          return;
        }
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) {
          setApprovalFlags(computeApprovalFlagsFromProfile(profile));
          return;
        }
        setApprovalFlags({
          approvalStatus: row.approval_status || null,
          isFullyApproved: !!row.is_fully_approved,
        });
      } catch (err) {
        logger.warn('get_current_user_flags threw, falling back to profile fields:', err);
        setApprovalFlags(computeApprovalFlagsFromProfile(profile));
      }
    },
    [profile, computeApprovalFlagsFromProfile]
  );

  const signOut = useCallback(async () => {
    logger.log('Signing out user');
    
    // Record the current session ID before clearing state
    const currentSessionId = session?.access_token;
    
    // Reset all auth state
    setProfile(null);
    setUser(null);
    setSession(null);
    setApprovalFlags(null);
    
    // Clear stored auth data
    profileFetchedRef.current = null;
    window.AMET_AUTH.profileFetched = null;
    window.AMET_AUTH.currentUserId = null;
    window.AMET_AUTH.authInProgress = false; // Clear any stuck flags
    window.AMET_AUTH.lastSessionId = null;   // Clear session tracking
    
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Clear any legacy localStorage items
    window.localStorage.removeItem('supabase.auth.token');
    for (const key in window.localStorage) {
      if (key.startsWith('sb-')) {
        window.localStorage.removeItem(key);
      }
    }
    
    // Track that we've explicitly signed out this session
    if (currentSessionId) {
      // Remember this session was explicitly logged out to prevent auto-login
      const fingerprint = fingerprintToken(currentSessionId);
      if (fingerprint) {
        const loggedOutSessions = JSON.parse(localStorage.getItem('amet_logged_out_sessions') || '[]');
        loggedOutSessions.push({
          id: fingerprint,
          timestamp: Date.now()
        });
        // Keep only the last 5 sessions to prevent localStorage bloat
        while (loggedOutSessions.length > 5) {
          loggedOutSessions.shift();
        }
        localStorage.setItem('amet_logged_out_sessions', JSON.stringify(loggedOutSessions));
      }
    }

    // Redirect to login page
    window.location.href = '/login';
  }, [session]);

  const updateProfile = useCallback(async (updates) => {
    if (!user) throw new Error('No authenticated user');
    
    const updatesToApply = { 
      ...updates, 
      updated_at: new Date().toISOString() 
    };

    const { data, error } = await supabase
      .from('profiles')
      .update(updatesToApply)
      .eq('id', user.id)
      .select()
      .maybeSingle();

    if (error) throw error;

    // FIX: Immediately update local profile state for instant UI feedback
    if (data) {
      setProfile(prevProfile => ({
        ...prevProfile,
        ...data
      }));
      
      // If avatar_url was updated, also update user object
      if (data.avatar_url) {
        setUser(prevUser => ({
          ...prevUser,
          avatar: data.avatar_url,
          avatar_url: data.avatar_url
        }));
      }
    }

    // Re-fetch profile to ensure consistency
    await fetchUserProfile(user.id);
    return data;
  }, [user, fetchUserProfile]);

  /**
   * Handle OAuth profile data by mapping provider data and updating profile
   */
  const handleOAuthProfileData = async (userData, provider) => {
    if (!userData || !provider) return;
    
    try {
      // Map OAuth data to profile fields
      const mappedData = mapOAuthToProfileData(provider, userData);
      logger.log('Mapped OAuth profile data:', mappedData);
      
      if (Object.keys(mappedData).length > 0) {
        // Check if profile exists first
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userData.id)
          .single();
        
        if (existingProfile) {
          // Update existing profile with OAuth data
          // Only update fields that aren't already set
          const updatesNeeded = {};
          
          Object.entries(mappedData).forEach(([key, value]) => {
            // Only update if the field is empty or null in the existing profile
            if (value && (!existingProfile[key] || existingProfile[key] === '')) {
              updatesNeeded[key] = value;
            }
          });
          
          if (Object.keys(updatesNeeded).length > 0) {
            logger.log('Updating profile with OAuth data:', updatesNeeded);
            await updateProfile(updatesNeeded);
          } else {
            logger.log('No profile updates needed from OAuth data');
          }
        }
      }
    } catch (error) {
      logger.error('Error handling OAuth profile data:', error);
    }
  };

  // Centralized timeout management
  const timeoutRef = useRef({
    emergency: null,
    safety: null
  });

  // Helper to clear all timeouts safely
  const clearAllTimeouts = useCallback(() => {
    Object.keys(timeoutRef.current).forEach(key => {
      if (timeoutRef.current[key]) {
        clearTimeout(timeoutRef.current[key]);
        timeoutRef.current[key] = null;
      }
    });
  }, []);
  
  // Initialize auth once and set up listener
  useEffect(() => {
    // Only run once - check both ref and window global
    if (initializedRef.current || window.AMET_AUTH.initialized) {
      // Hydrate from current session to avoid being stuck in loading
      (async () => {
        try {
          const { data: { session: current } } = await supabase.auth.getSession();
          setSession(current || null);
          setUser(current?.user || null);
          if (current?.user?.id) {
            await fetchUserProfile(current.user.id);
          } else {
            setLoading(false);
          }
        } catch (_) {
          setLoading(false);
        }
      })();
      return;
    }
    
    // Mark as initialized in both places
    initializedRef.current = true;
    window.AMET_AUTH.initialized = true;
    
    logger.log('Initializing AuthContext...');

    // Purge legacy localStorage keys that might cache stale names
    try {
      ['currentUser', 'displayName', 'profileCache'].forEach((k) => {
        if (localStorage.getItem(k)) localStorage.removeItem(k);
      });
    } catch (_) { /* ignore */ }
    
    // Single emergency timeout that completely overrides the loading state
    // This is the final fallback if everything else fails
    timeoutRef.current.emergency = setTimeout(() => {
      logger.log('EMERGENCY loading timeout triggered - forcing app to exit loading state');
      window.AMET_AUTH.authInProgress = false; // Force clear any stuck flags
      window.AMET_AUTH.pendingFetch = null;
      setLoading(false);
    }, 3000);

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      // Log auth events and track them to help debug double invocations
      logger.log(`Auth state changed: ${event}`, newSession?.user?.id || 'no user');
      window.AMET_AUTH.lastAuthEvent = event;
      
      // Debug OAuth profile data if available
      if (event === 'SIGNED_IN' && newSession?.user?.app_metadata?.provider) {
        const provider = newSession.user.app_metadata.provider;
        logger.log(`OAuth sign-in detected from provider: ${provider}`);
        logger.log('User metadata:', newSession.user.user_metadata);
        logger.log('App metadata:', newSession.user.app_metadata);
        
        // Seed-only: derive a seed and upsert fill-only (never overwrite user edits)
        try {
          const m = newSession.user?.user_metadata || {};
          const full_name = (m.full_name || m.name || `${m.given_name || ''} ${m.family_name || ''}` ).trim();
          const seed = {
            full_name: full_name || null,
            first_name: m.given_name || null,
            last_name: m.family_name || null,
            avatar_url: m.avatar_url || m.picture || null,
            email: newSession.user?.email || null,
          };
          upsertMyProfileFillOnly(seed).catch(() => undefined);
        } catch (_) { /* ignore */ }

        // Map and update profile with OAuth data (fill-only at field level)
        handleOAuthProfileData(newSession.user, provider);
      }
      
      // Check for explicitly logged-out sessions to prevent auto-login conflicts
      if (event === 'SIGNED_IN' && newSession?.access_token) {
        const loggedOutSessions = JSON.parse(localStorage.getItem('amet_logged_out_sessions') || '[]');
        const fingerprint = fingerprintToken(newSession.access_token);
        const wasExplicitlyLoggedOut = fingerprint && loggedOutSessions.some(s => s.id === fingerprint);
        
        if (wasExplicitlyLoggedOut) {
          logger.log('⚠️ Ignoring auto-login attempt for previously logged out session');
          return; // Don't process this auth event
        }
        
        // Store current session for tracking
        window.AMET_AUTH.lastSessionId = newSession.access_token;
      }
      
      // We only care about these events
      if (['SIGNED_IN', 'SIGNED_OUT', 'INITIAL_SESSION', 'USER_UPDATED'].includes(event)) {
        // Update session state
        setSession(newSession);
        setUser(newSession?.user || null);

        // Onboarding retired: no draft resume

        // Handle profile fetch if we have a user
        if (newSession?.user?.id) {
          const currentUserId = window.AMET_AUTH.currentUserId;

          // Detect user ID change and force a reset
          if (currentUserId && currentUserId !== newSession.user.id) {
            logger.log(`⚠️ Auth event with user ID change detected: ${currentUserId} → ${newSession.user.id}`);
            // Clear the current profile to avoid state confusion
            setProfile(null);
            // Reset the profile fetched ref to force a new fetch
            profileFetchedRef.current = null;
            window.AMET_AUTH.profileFetched = null;
          }

          // Only fetch if this is a new user ID or first fetch
          if (currentUserId !== newSession.user.id) {
            fetchUserProfile(newSession.user.id);
          }
        } else {
          // No user, clear profile and exit loading
          setProfile(null);
          setLoading(false);
        }
      }
    });

    // Regular safety timeout - will trigger before emergency
    // but still give enough time for normal auth flow
    timeoutRef.current.safety = setTimeout(() => {
      logger.log('Safety timeout triggered - forcing app to exit loading state');
      setLoading(false);
    }, 2000);

    return () => {
      // Clean up all timeouts using our helper
      clearAllTimeouts();
      // Unsubscribe from auth state changes
      subscription?.unsubscribe();
    };
  }, [fetchUserProfile, clearAllTimeouts]);

  // Handle automatic redirect for rejected users
  useEffect(() => {
    const isRejectedFlag =
      rejectionStatus.isRejected ||
      approvalFlags?.approvalStatus === 'rejected';
    if (isRejectedFlag && window.location.pathname !== '/rejection') {
      window.location.href = '/rejection';
    }
  }, [rejectionStatus.isRejected, approvalFlags?.approvalStatus]);
  
  // Monitor profile updates
  useEffect(() => {
    if (profile) {
      const role = profile.role || 'student';
      logger.log(`Profile updated for user ${profile.id}, role: ${role}`);
    }
  }, [profile]);

  // Keep approval flags in sync with backend helper and profile fields
  useEffect(() => {
    if (!user?.id) {
      setApprovalFlags(null);
      return;
    }
    refreshApprovalFlags(user.id);
  }, [user?.id, profile?.approval_status, profile?.alumni_verification_status, profile?.is_approved, refreshApprovalFlags]);

  // Realtime: listen for changes to the current user's profile so role/flags update without re-login
  useEffect(() => {
    if (!user?.id) return;
    logger.log('Subscribing to realtime profile changes for user:', user.id);

    onPostgresChangesOnce(
      `profile-changes-${user.id}`,
      `profile-changes-handler-${user.id}`,
      { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
      async (payload) => {
        logger.log('Realtime profile update received:', payload.eventType);
        try {
          await fetchUserProfile(user.id);
        } catch (err) {
          logger.error('Failed to refresh profile after realtime update:', err);
        }
      }
    );

    return () => { /* registry manages channel lifecycle */ };
  }, [user?.id, fetchUserProfile]);
  
  // Monitor loading state changes
  useEffect(() => {
    logger.log(`Loading state changed to: ${loading}`);
  }, [loading]);

  // Normalize role handling strictly from profiles.role (single source of truth)
  const getUserRole = useCallback(() => {
    // If profile doesn't exist, default to 'alumni'

    // Prefer explicit DB role if valid
    if (profile?.role && isRole(profile.role)) return profile.role;

    // Fallback: use auth metadata role until Edge Function updates DB role
    const metaRole = user?.user_metadata?.role;
    if (metaRole && isRole(metaRole)) return metaRole;

    // Default aligned with enum
    return 'alumni';
  }, [profile, user]);
  const userRole = getUserRole();
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  // Helper functions for role checks (do not break existing boolean isAdmin)
  const isSuperAdminFn = useCallback(() => userRole === 'super_admin', [userRole]);
  const isAdminFn = useCallback(() => userRole === 'admin' || userRole === 'super_admin', [userRole]);

  const getEffectivePermissions = useCallback(() => {
    const isReadOnlyAccount = !!profile && (profile.is_deleted === true || profile.is_active === false);
    return derivePermissions(userRole, approvalFlags, isReadOnlyAccount);
  }, [userRole, approvalFlags, profile]);

  // Derived approval convenience flags for current user
  const computedFromProfile = computeApprovalFlagsFromProfile(profile);
  const approvalStatus =
    (approvalFlags && approvalFlags.approvalStatus) ?? computedFromProfile.approvalStatus ?? null;
  const isApproved = approvalStatus === 'approved';
  const isRejectedFlag = approvalStatus === 'rejected' || !!rejectionStatus.isRejected;
  const isPending = !isRejectedFlag && !isApproved;
  const isAdminLike = isAdminFn();
  const isFullyApproved =
    (approvalFlags && typeof approvalFlags.isFullyApproved === 'boolean')
      ? approvalFlags.isFullyApproved
      : !!computedFromProfile.isFullyApproved;

  const hasPermission = useCallback((permission) => {
    if (!permission) return true;
    const perms = getEffectivePermissions();

    if (permission === 'view:feedback_reports') {
      return perms.includes('view:feedback_reports');
    }

    return perms.includes('access:all') || perms.includes(permission);
  }, [getEffectivePermissions]);

  const hasAnyPermission = useCallback((permissions) => {
    const perms = getEffectivePermissions();
    if (perms.includes('access:all')) return true;
    return permissions.some((p) => perms.includes(p));
  }, [getEffectivePermissions]);

  // Backfill profiles.email from auth if missing (safe, user-editable column)
  useEffect(() => {
    (async () => {
      try {
        if (!user?.id) return;
        if (!profile) return;
        if (profile.email) return;
        if (!user.email) return;
        await supabase.from('profiles').update({ email: user.email.toLowerCase() }).eq('id', user.id);
        // refresh local profile cache silently
        await fetchUserProfile(user.id).catch(() => undefined);
      } catch (_) {
        // ignore
      }
    })();
  }, [user?.id, user?.email, profile?.email]);

  const hasAllPermissions = useCallback((permissions) => {
    const perms = getEffectivePermissions();
    if (perms.includes('access:all')) return true;
    return permissions.every(p => perms.includes(p));
  }, [getEffectivePermissions]);

  const isReadOnlyAccount = !!profile && (profile.is_deleted === true || profile.is_active === false);
  
  // Blocked user state (is_active=false with blocked_at set)
  const isBlocked = !!profile && profile.is_active === false && !!profile.blocked_at;
  const blockedReason = isBlocked ? profile.blocked_reason : null;

  const value = {
    user,
    profile,
    session,
    loading,
    signOut,
    updateProfile,
    fetchUserProfile,
    refreshProfile: (id) => fetchUserProfile(id, true),
    isAuthenticated: !!user,
    isAdmin,
    userRole,
    role: userRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getUserRole,
    rejectionStatus,
    approvalFlags,
    // New helpers
    isAdminFn,
    isSuperAdmin: isSuperAdminFn,
    isReadOnlyAccount,
    approvalStatus,
    isApproved,
    isPending,
    isRejected: isRejectedFlag,
    isAdminLike,
    // Canonical full-approval flag (mirrors backend fc_is_fully_approved via get_current_user_flags)
    isFullyApproved,
    // Blocked user state
    isBlocked,
    blockedReason,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
