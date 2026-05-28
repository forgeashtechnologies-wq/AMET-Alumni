import { createClient } from '@supabase/supabase-js';
import React, { createContext, useContext, useState, useEffect } from 'react';
import logger from './logger';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  logger.error('Missing Supabase environment variables');
  throw new Error('Missing Supabase environment variables');
}

// Create the client with realtime configuration as a singleton to guard against HMR/rehydration
export const supabase = (() => {
  // guard against HMR/rehydration multipliers
  if (window.__sb__) return window.__sb__;
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 5
      },
    }
  });
  
  // Store the client as a singleton
  window.__sb__ = client;
  
  return client;
})();

// Minimal dev note (no secrets); redacted/no-op in prod
logger.info('Supabase client initialized');

export async function ensureValidSession(minTtlSeconds = 30) {
  const now = Math.floor(Date.now() / 1000);
  const { data: s1 } = await supabase.auth.getSession();
  const sess1 = s1?.session;

  if (!sess1?.access_token) {
    await supabase.auth.refreshSession().catch(() => undefined);
  } else if (typeof sess1.expires_at === 'number' && sess1.expires_at - now < minTtlSeconds) {
    await supabase.auth.refreshSession().catch(() => undefined);
  }

  const { data: s2, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!s2?.session?.access_token) throw new Error('Not authenticated');
  return s2.session;
}

// --- REALTIME CONTEXT AND PROVIDER ---

// Realtime context for system status
export const RealtimeContext = createContext({
  supabase,
  isReady: false,
});

// Global channel registry to manage channels across component remounts
// Persist on window to survive Strict Mode double-mounts and Fast Refresh
const _channelRegistry = (() => {
  if (typeof window !== 'undefined') {
    if (!window.__sb_channels__) {
      window.__sb_channels__ = {};
    }
    return window.__sb_channels__;
  }
  return {};
})();

/**
 * Get or create a channel from the registry.
 * This is idempotent and safe to call multiple times.
 */
export function getOrCreateChannel(name) {
  if (!_channelRegistry[name]) {
    logger.info(`Creating new channel: ${name}`);
    _channelRegistry[name] = {
      channel: supabase.channel(name),
      // Whether the SUBSCRIBED status callback has fired
      subscribed: false,
      // Whether we have ever invoked channel.subscribe on this instance
      hasSubscribeCall: false,
      // Track attached listener keys to avoid duplicate .on bindings
      listeners: new Set(),
      refCount: 0
    };
  }
  
  _channelRegistry[name].refCount++;
  return _channelRegistry[name].channel;
}

/**
 * Ensures a channel is subscribed exactly once.
 * Safe to call multiple times; subsequent calls are no-ops.
 */
export function ensureChannelSubscribed(name) {
  // Always get (and create if needed) the registry entry first
  const channel = getOrCreateChannel(name);
  const entry = _channelRegistry[name];
  if (!entry.hasSubscribeCall) {
    logger.info(`Subscribing to ${name}`);
    // Mark before calling subscribe to prevent re-entry
    entry.hasSubscribeCall = true;
    try {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('Realtime is ready');
          entry.subscribed = true;
          // mark realtime ready for any waiters
          try { if (typeof window !== 'undefined') { window.__sb_rt_ready__ = true; } } catch (_) { void 0; }
        }
      });
    } catch (e) {
      // Ignore duplicate subscribe attempts on the same channel instance
      const msg = String(e?.message || e || '');
      if (!msg.toLowerCase().includes('subscribe') || !msg.toLowerCase().includes('only be called a single time')) {
        logger.error(`Failed subscribing to channel ${name}: ${String(e?.message || e)}`);
      }
    }
  }
  return channel;
}

/**
 * Idempotently attach a postgres_changes listener to a channel.
 * key should uniquely describe this listener (e.g., `${event}:${schema}:${table}:${filter}`).
 */
export function onPostgresChangesOnce(channelName, key, params, handler) {
  const channel = ensureChannelSubscribed(channelName);
  const entry = _channelRegistry[channelName];
  if (!entry.listeners) entry.listeners = new Set();
  if (!entry.listeners.has(key)) {
    entry.listeners.add(key);
    channel.on('postgres_changes', params, handler);
  }
  // return disposer that decrements refcount and removes channel when unused
  return () => {
    const e = _channelRegistry[channelName];
    if (!e) return;
    if (e.listeners && e.listeners.has(key)) e.listeners.delete(key);
    e.refCount = Math.max(0, (e.refCount || 0) - 1);
    if (e.refCount === 0) {
      try { supabase.removeChannel(e.channel); } catch (_) { void 0; }
      delete _channelRegistry[channelName];
    }
  };
}

// --- Realtime readiness helpers ---
let __rtWaiters = [];
export function isRealtimeReady() {
  try { return !!(window && window.__sb_rt_ready__); } catch (_) { return false; }
}
export function waitForRealtimeReady(timeoutMs = 4000) {
  if (isRealtimeReady()) return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    __rtWaiters.push(() => { clearTimeout(timer); resolve(true); });
    // attach a lightweight watcher to system-status to flip ready
    const ch = ensureChannelSubscribed('system-status');
    const check = setInterval(() => {
      if (_channelRegistry['system-status']?.subscribed) {
        clearInterval(check);
        try { if (typeof window !== 'undefined') { window.__sb_rt_ready__ = true; } } catch (_) { void 0; }
        __rtWaiters.forEach(fn => { try { fn(); } catch(_) { void 0; } });
        __rtWaiters = [];
      }
    }, 100);
    // auto clear after timeout; resolve already handles
    setTimeout(() => clearInterval(check), timeoutMs + 100);
  });
}

/**
 * A simplified RealtimeProvider that only handles core system status.
 * It's designed to be resilient to React Strict Mode double-invocation.
 */
export const RealtimeProvider = ({ children }) => {
  const [isReady, setReady] = useState(false);
  
  useEffect(() => {
    const channelName = 'system-status';
    const channel = ensureChannelSubscribed(channelName);
    
    if (_channelRegistry[channelName]?.subscribed) {
      setReady(true);
    }
    
    // Cleanup function - note we don't actually unsubscribe or remove the channel
    // We just decrement the reference count
    return () => {
      if (_channelRegistry[channelName]) {
        _channelRegistry[channelName].refCount--;
        
        // Only actually clean up if no components are using this channel
        if (_channelRegistry[channelName].refCount <= 0) {
          logger.info(`No more refs to ${channelName}, cleaning up`);
          // We intentionally don't remove the subscription here
          // to prevent issues with React Strict Mode
        }
      }
    };
  }, [])

  return (
    <RealtimeContext.Provider value={{ supabase, isReady }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const setupRealtimeSubscription = (channelName, options = {}) => {
  const { allowFallback = false } = options;
  try {
    const channel = ensureChannelSubscribed(channelName);
    logger.info(`Realtime subscription setup for channel: ${channelName}`);
    return channel;
  } catch (error) {
    logger.error(`Failed to setup realtime subscription for ${channelName}: ${String(error?.message || error)}`);
    if (allowFallback) {
      logger.warn(`Falling back to non-realtime mode for ${channelName}.`);
      return null;
    }
    throw error;
  }
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return { ...context, setupRealtimeSubscription };
};

/**
 * Checks if the realtime connection is established and ready.
 * @returns {Promise<void>} - A promise that resolves when the connection is ready
 */
export function checkRealtimeConnection() {
  return new Promise((resolve, reject) => {
    try {
      // If channel registry has system-status and it's subscribed, resolve immediately
      if (_channelRegistry['system-status']?.subscribed) {
        logger.info('Realtime connection already confirmed ready');
        resolve();
        return;
      }
      
      // Otherwise set up the channel and wait for subscription
      const channel = ensureChannelSubscribed('system-status');
      
      // Set a reasonable timeout
      const timeout = setTimeout(() => {
        logger.warn('Realtime connection check timed out after 5 seconds');
        // Resolve anyway to prevent blocking UI
        resolve();
      }, 5000);
      
      // Check for subscription status
      const checkInterval = setInterval(() => {
        if (_channelRegistry['system-status']?.subscribed) {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          logger.info('Realtime connection confirmed ready');
          resolve();
        }
      }, 100);
    } catch (error) {
      logger.error(`Error checking realtime connection: ${String(error?.message || error)}`);
      reject(error);
    }
  });
}

// NOTE: The legacy onJobsChange and its related singleton channel manager have been removed.
// Realtime subscriptions for jobs are now handled by the useJobsRealtime hook to prevent subscription errors.

// Remove legacy dev logger in favor of centralized logger

/**
 * Maps OAuth provider data to a standardized profile format
 * for consistent profile creation and updates
 */
export const mapOAuthToProfileData = (provider, userData) => {
  const userMetadata = userData?.user_metadata || {};
  const appMetadata = userData?.app_metadata || {};
  const mappedData = {};
  
  // Common fields across providers
  if (userMetadata.full_name) mappedData.full_name = userMetadata.full_name;
  if (userMetadata.email) mappedData.email = userMetadata.email;
  if (userMetadata.avatar_url) mappedData.avatar_url = userMetadata.avatar_url;
  
  // Provider-specific mapping
  if (provider === 'google') {
    // Map Google profile data
    if (userMetadata.name) mappedData.full_name = userMetadata.name;
    if (userMetadata.email) mappedData.email = userMetadata.email;
    if (userMetadata.picture) mappedData.avatar_url = userMetadata.picture;
    
    // Parse name into components if available
    if (userMetadata.given_name) mappedData.first_name = userMetadata.given_name;
    if (userMetadata.family_name) mappedData.last_name = userMetadata.family_name;
  } 
  else if (provider === 'linkedin') {
    // Map LinkedIn profile data
    if (userMetadata.name) mappedData.full_name = userMetadata.name;
    if (userMetadata.email) mappedData.email = userMetadata.email;
    if (userMetadata.picture) mappedData.avatar_url = userMetadata.picture;
    
    // LinkedIn may provide these separately
    if (userMetadata.given_name) mappedData.first_name = userMetadata.given_name;
    if (userMetadata.family_name) mappedData.last_name = userMetadata.family_name;
    
    // Professional data if available
    if (userMetadata.headline) mappedData.job_title = userMetadata.headline;
    if (userMetadata.linkedInUrl) mappedData.linkedin_url = userMetadata.linkedInUrl;
  }
  
  // Dev-only informational log (redacted, no-op in prod)
  logger.info(`OAuth profile data mapped from ${provider}`);
  
  return mappedData;
};

// Auth helper functions
export const signInWithEmail = async (email, password, otpCode = null) => {
  const params = {
    email,
    password,
  };
  
  // Add OTP code if provided (for 2FA)
  if (otpCode) {
    params.options = {
      twoFactorToken: otpCode
    };
  }
  
  const { data, error } = await supabase.auth.signInWithPassword(params);
  
  // Check if 2FA is required
  if (error?.message?.includes('two-factor')) {
    return { data, error, requiresTwoFactor: true };
  }
  
  return { data, error };
};

export const signUpWithEmail = async (email, password, options = {}) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: options,
    },
  });
  return { data, error };
};

export const signInWithGoogle = async () => {
  // Fix Google sign-in access denied issue by properly configuring OAuth
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`, // Send to OAuth callback route for processing
      scopes: 'email profile',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
      // Pass additional data to be stored in user_metadata
      // This will help with profile creation
      meta: {
        provider_name: 'google',
        provider_type: 'oauth' 
      }
    },
  });
  
  return { data, error };
};

export const signInWithLinkedIn = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'linkedin',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`, // Send to OAuth callback route for processing
      scopes: 'r_liteprofile r_emailaddress',
      // Pass additional data to be stored in user_metadata
      // This will help with profile creation
      meta: {
        provider_name: 'linkedin',
        provider_type: 'oauth'
      }
    },
  });
  
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
};

// Database helper functions
export const fetchProfiles = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  return { data, error };
};

export const fetchProfile = async (id) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  return { data, error };
};

export const updateProfile = async (id, updates) => {
  // Clean updates object by removing null/undefined and converting empty strings for numbers to null
  const cleanUpdates = {};
  
  Object.entries(updates).forEach(([key, value]) => {
    // Skip null/undefined values
    if (value === null || value === undefined) return;
    
    // Handle empty strings for numeric fields
    if (value === '' && ['graduation_year', 'expected_graduation_year', 'mentorship_experience_years'].includes(key)) {
      cleanUpdates[key] = null;
    } else {
      cleanUpdates[key] = value;
    }
  });
  
  // Set updated_at timestamp
  cleanUpdates.updated_at = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('profiles')
    .update(cleanUpdates)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
};

export const fetchEvents = async () => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('event_date', new Date().toISOString())
    .order('event_date', { ascending: true });
  return { data, error };
};

export const fetchEvent = async (id) => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();
  return { data, error };
};

export const createEvent = async (eventData) => {
  const { data, error } = await supabase
    .from('events')
    .insert([eventData])
    .select()
    .single();
  return { data, error };
};

export const fetchJobs = async () => {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  return { data, error };
};

export const fetchJob = async (id) => {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .single();
  return { data, error };
};

export const createJob = async (jobData) => {
  const { data, error } = await supabase
    .from('jobs')
    .insert([jobData])
    .select()
    .single();
  return { data, error };
};

export const applyForJob = async (jobId, applicationData) => {
  const { data, error } = await supabase
    .from('job_applications')
    .insert([{
      job_id: jobId,
      ...applicationData,
      application_date: new Date().toISOString()
    }])
    .select();
  return { data, error };
};

// Conversation functions (aligned with conversation_participants schema)
export const fetchConversations = async (userId) => {
  // Prefer RPC if available for efficient fetching
  try {
    const { data, error } = await supabase.rpc('get_user_conversations_v2', { p_user_id: userId });
    if (error) throw error;
    return { data, error: null };
  } catch (rpcErr) {
    // Fallback: derive conversations via conversation_participants
    try {
      const { data: myConvs, error: convsError } = await supabase
        .from('conversation_participants')
        .select('conversation_id, conversation:conversations(id, last_message_at, created_at)')
        .eq('user_id', userId);
      if (convsError) return { data: null, error: convsError };

      // Deduplicate conversation IDs
      const seen = new Set();
      const convIds = [];
      (myConvs || []).forEach(r => {
        if (!seen.has(r.conversation_id)) {
          seen.add(r.conversation_id);
          convIds.push({ id: r.conversation_id, last_message_at: r.conversation?.last_message_at || null, created_at: r.conversation?.created_at || null });
        }
      });

      // For each conversation, fetch the other participant profile
      const detailed = await Promise.all(convIds.map(async (c) => {
        const { data: otherRow } = await supabase
          .from('conversation_participants')
          .select('user:profiles(id, full_name, avatar_url, is_online)')
          .eq('conversation_id', c.id)
          .neq('user_id', userId)
          .limit(1)
          .maybeSingle();
        return {
          conversation_id: c.id,
          last_message_at: c.last_message_at,
          created_at: c.created_at,
          other_participant: otherRow?.user || null,
        };
      }));

      return { data: detailed, error: null };
    } catch (fbErr) {
      logger.error('Error fetching conversations (fallback):', fbErr);
      return { data: null, error: fbErr };
    }
  }
};

/**
 * Creates or retrieves a DM thread between two users.
 * Primary RPC: get_or_create_dm_thread (preferred)
 *  - Params: p_user1, p_user2 (new) or user1, user2 (alt)
 * Fallback RPC: dm_get_or_create_thread with u1, u2 (legacy)
 */
export const createThread = async (userAId, userBId) => {
  // Try new RPC with primary param names
  try {
    let resp = await supabase.rpc('get_or_create_dm_thread', { p_user1: userAId, p_user2: userBId });
    if (!resp.error && resp.data != null) return { data: resp.data, error: null };
    // Try alternate param names on the same RPC
    resp = await supabase.rpc('get_or_create_dm_thread', { user1: userAId, user2: userBId });
    if (!resp.error && resp.data != null) return { data: resp.data, error: null };
  } catch (_) { /* continue to legacy fallback */ }

  // Legacy fallback RPC name and params
  try {
    const resp = await supabase.rpc('dm_get_or_create_thread', { u1: userAId, u2: userBId });
    return { data: resp.data ?? null, error: resp.error ?? null };
  } catch (error) {
    return { data: null, error };
  }
};

// Legacy alias for backward compatibility during migration
export const createConversation = createThread;

// Legacy alias - now points to createThread
export const createOrGetDmThread = createThread;

// LEGACY messaging helpers below operate on the old 'messages' / 'conversations' tables.
// Kept only for deprecated messaging UI; do not use for new DM features.
export const fetchMessages = async (conversationId) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
    
  return { data, error };
};

export const sendMessage = async (messageData) => {
  // Send the message
  const { data, error } = await supabase
    .from('messages')
    .insert([messageData])
    .select()
    .single();
  
  if (!error && messageData.conversation_id) {
    // Update conversation's last_message_at timestamp
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', messageData.conversation_id);
  }
  
  return { data, error };
};

export const markMessageAsRead = async (messageId) => {
  const { data, error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('id', messageId)
    .select();
  return { data, error };
};

export const markConversationMessagesAsRead = async (conversationId, userId) => {
  // Mark all messages in a conversation as read by the specified user
  const { data, error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId) // Only mark messages sent by the other user
    .is('read_at', null) // Only mark unread messages
    .select();
    
  return { data, error };
};

export const getUnreadMessageCount = async (userId) => {
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .neq('sender_id', userId)
    .is('read_at', null);
    
  return { count: count || 0, error };
};

// Functions for file uploads in messages
export const uploadMessageAttachment = async (file, userId) => {
  const fileName = `${userId}/${Date.now()}-${file.name}`;
  
  const { data, error } = await supabase.storage
    .from('message_attachments')
    .upload(fileName, file);
    
  if (error) {
    return { data: null, error };
  }
  
  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from('message_attachments')
    .getPublicUrl(fileName);
    
  return { data: { path: fileName, url: publicUrlData.publicUrl }, error: null };
};

export const fetchMentors = async () => {
  const { data, error } = await supabase
    .from('mentors')
    .select(`
      *,
      profiles(*)
    `)
    .eq('is_available', true);
  return { data, error };
};

export const createMentorshipRequest = async (requestData) => {
  const { mentor_id, message, goals } = requestData || {};
  const { data, error } = await supabase.rpc('mentorship_request_create', {
    p_mentor_id: mentor_id,
    p_message: message ?? null,
    p_goals: goals ?? null,
  });
  return { data, error };
};

// Networking Groups Functions
// NOTE: Prefer using fetchGroupsRpc from '../api/groups' for new code.
// This function is kept for backward compatibility but the RPC version
// handles role-aware filtering (employer exclusion, alumni_only, etc.) at the DB level.

// Fetch all groups with optional filtering
export const fetchGroups = async (options = {}) => {
  const {
    searchQuery = '',
    tags = [],
    sortBy = 'created_at',
    sortOrder = 'desc',
    limit = 100,
    isAdmin = false,
    currentUserId = null,
    userRole = null,
  } = options;

  // Base selection without profiles embed (avoid RLS errors). If you need creator identity, hydrate from alumni_directory_public at call site.
  // Include alumni_only column for frontend filtering
  const baseSelect = `*`;

  // Admin path: fetch all groups
  if (isAdmin) {
    let adminQ = supabase
      .from('groups')
      .select(baseSelect)
      .eq('is_archived', false)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .limit(limit);
    if (searchQuery) adminQ = adminQ.ilike('name', `%${searchQuery}%`);
    if (tags && tags.length > 0) adminQ = adminQ.contains('tags', tags);
    const { data, error } = await adminQ;
    return { data, error };
  }

  // Special case: Employers only see groups they are explicitly invited to (i.e., where they are members)
  if (userRole === 'employer') {
    if (!currentUserId) return { data: [], error: null };
    const { data: memRows, error: memErr } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', currentUserId);
    if (memErr) return { data: null, error: memErr };
    const groupIds = (memRows || []).map(r => r.group_id);
    if (groupIds.length === 0) return { data: [], error: null };
    let q = supabase
      .from('groups')
      .select(`*`)
      .in('id', groupIds)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .limit(limit);
    if (searchQuery) q = q.ilike('name', `%${searchQuery}%`);
    if (tags && tags.length > 0) q = q.contains('tags', tags);
    const { data, error } = await q;
    // mark is_member true
    const flagged = (data || []).map(g => ({ ...g, is_member: true }));
    return { data: flagged, error };
  }

  // Non-admin path: public groups + private groups where user is a member
  let publicQ = supabase
    .from('groups')
    .select(baseSelect)
    .eq('is_private', false)
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .limit(limit);
  if (searchQuery) publicQ = publicQ.ilike('name', `%${searchQuery}%`);
  if (tags && tags.length > 0) publicQ = publicQ.contains('tags', tags);

  const [{ data: pub, error: pubErr }, memberRes] = await Promise.all([
    publicQ,
    (async () => {
      if (!currentUserId) return { data: [], error: null };
      // Step 1: fetch membership group ids only (avoid nested embeds that can trip RLS recursion)
      const { data: memRows, error: memErr } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', currentUserId);
      if (memErr) return { data: null, error: memErr };
      const groupIds = (memRows || []).map(r => r.group_id);
      if (groupIds.length === 0) return { data: [], error: null };
      // Step 2: fetch those groups separately with the same base select
      const { data: groups, error: gErr } = await supabase
        .from('groups')
        .select(baseSelect)
        .in('id', groupIds);
      if (gErr) return { data: null, error: gErr };
      // Mark membership flag on rows
      const withFlag = (groups || []).map(g => ({ ...g, is_member: true }));
      return { data: withFlag, error: null };
    })()
  ]);

  if (pubErr) return { data: null, error: pubErr };
  if (memberRes.error) return { data: null, error: memberRes.error };

  const membershipMap = new Map();
  (memberRes.data || []).forEach(g => membershipMap.set(g.id, true));

  // Merge public + member groups, prefer member flag
  const merged = [];
  const seen = new Set();
  (pub || []).forEach(g => {
    const is_member = membershipMap.get(g.id) || false;
    merged.push({ ...g, is_member });
    seen.add(g.id);
  });
  (memberRes.data || []).forEach(g => {
    if (!seen.has(g.id)) merged.push(g);
  });

  // Apply client-side filters that weren't applicable to member join select
  // Policy: For non-admins, only show approved, non-archived, public groups (plus any groups the user is a member of)
  let filtered = merged.filter(g => {
    if (isAdmin) return true;
    if (g.is_member) return true;
    return g.is_approved === true && g.is_archived === false && g.is_private === false;
  });
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(g => (g.name || '').toLowerCase().includes(q));
  }
  if (tags && tags.length > 0) {
    filtered = filtered.filter(g => Array.isArray(g.tags) && tags.every(t => g.tags.includes(t)));
  }

  return { data: filtered, error: null };
};

// For backward compatibility
export const fetchPublicGroups = async () => {
  return fetchGroups({ includePrivate: false });
};

// Fetch a single group's details, including members
// PERFORMANCE: Parallelized queries to reduce waterfall latency
export const fetchGroupDetails = async (groupId, options = {}) => {
  const { includeMembers = false, memberLimit = 50 } = options;

  const { data: rpcData, error: rpcError } = await supabase.rpc('get_group_details_secure', {
    p_group_id: groupId,
  });

  if (rpcError) return { data: null, error: rpcError };

  const status = rpcData?.status;
  const base = rpcData?.group || null;

  if (status === 'not_found') {
    return { data: null, error: { message: 'Group not found', code: 'not_found' } };
  }

  if (status === 'restricted') {
    return { data: { ...base, _restricted: true }, error: null };
  }

  if (status === 'invite_pending') {
    // Surface a richer private view for invited users, including minimal group info
    // and readonly invitation metadata so the UI can show accept/reject actions.
    const invitation = base?.invitation || null;
    const cloned = { ...base };
    delete cloned.invitation;
    return {
      data: {
        ...cloned,
        _invitePending: true,
        _invitationMeta: invitation,
      },
      error: null,
    };
  }

  // status === 'ok'
  const promises = [];

  const creatorPromise = base?.created_by
    ? supabase
        .from('alumni_directory_public')
        .select('id, full_name, avatar_url')
        .eq('id', base.created_by)
        .maybeSingle()
    : Promise.resolve({ data: null });
  promises.push(creatorPromise);

  const membersPromise = includeMembers
    ? fetchGroupMembers(groupId, memberLimit, 0)
    : Promise.resolve({ data: null, error: null });
  promises.push(membersPromise);

  const [creatorResult, membersResult] = await Promise.all(promises);

  let data = {
    ...base,
    creator: creatorResult.data || null,
  };

  if (includeMembers && !membersResult.error) {
    data.members = membersResult.data;
  }

  return { data, error: null };
};

export const acceptGroupInvitation = async (groupId) => {
  const { data, error } = await supabase.rpc('accept_group_invitation', {
    p_group_id: groupId,
  });
  return { data, error };
};

export const rejectGroupInvitation = async (groupId) => {
  const { data, error } = await supabase.rpc('reject_group_invitation', {
    p_group_id: groupId,
  });
  return { data, error };
};

// Fetch current user's membership (role) for a group
export const getMyGroupMembership = async (groupId) => {
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) return { data: null, error: authErr || new Error('Not authenticated') };
  const userId = authData.user.id;
  const { data, error } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();
  return { data, error };
};

// Fetch members for a group (role + profile), load on-demand for Members tab
// PERFORMANCE: Reduced default limit, added lightweight count-only option
export const fetchGroupMembers = async (groupId, limit = 50, offset = 0) => {
  // Use RPC to bypass RLS join restrictions on profiles while keeping row-level auth
  const { data, error } = await supabase.rpc('list_group_members', { p_group_id: groupId });
  if (error) return { data: null, error };
  const rows = Array.isArray(data) ? data : [];
  // Map RPC rows to legacy shape expected by callers
  const mapped = rows
    .slice(offset, offset + limit)
    .map(r => ({
      role: r.role,
      created_at: r.joined_at,
      user: {
        id: r.user_id,
        full_name: r.full_name,
        avatar_url: r.avatar_url,
        headline: r.headline,
      }
    }));
  return { data: mapped, error: null };
};

// PERFORMANCE: Lightweight member count without fetching full profiles
export const fetchGroupMemberCount = async (groupId) => {
  const { count, error } = await supabase
    .from('group_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('group_id', groupId);
  return { count: count ?? 0, error };
};

// Create a new group (backend triggers will set creator/admin membership)
export const createGroup = async (groupData) => {
  await guardEmployers();
  await ensureValidSession();
  // Use the secure RPC function to create group and add admin in one step
  const { data, error } = await supabase.rpc('create_group_and_add_admin', {
    group_name: groupData.name,
    group_description: groupData.description || '',
    group_is_private: groupData.is_private || false,
    group_tags: groupData.tags || [],
  });
  return { data, error };
};

// Legacy group membership helpers (joinGroup, leaveGroup, requestGroupMembership)
// have been deprecated in favor of the RPC-based helpers in src/api/groups.js.
// New code should import from '../api/groups' instead.

/**
 * @deprecated Use joinGroupRpc from '../api/groups' instead.
 * Direct inserts to group_members are blocked by RLS for security.
 * The RPC handles employer exclusion, alumni_only checks, and duplicate prevention.
 */
export const addGroupMember = async (groupId, userId, role = 'member') => {
  await guardEmployers();
  const { data, error } = await supabase
    .from('group_members')
    .insert([{ group_id: groupId, user_id: userId, role }])
    .select()
    .single();
  return { data, error };
};

// Fetch posts from a specific group
export const fetchGroupPosts = async (groupId, options = {}) => {
  const { cursor = null, limit = 10 } = options;
  let q = supabase
    .from('group_posts')
    .select(`
      *,
      author:profiles!group_posts_user_id_fkey(id, full_name, avatar_url, headline)
    `)
    .eq('group_id', groupId)
    .is('parent_post_id', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (cursor) {
    q = q.lt('created_at', cursor.created_at || new Date().toISOString());
  }
  const { data, error } = await q;
  return { data, error };
};

// Fetch comments (replies) for a post
export const fetchPostComments = async (postId) => {
  const { data, error } = await supabase
    .from('group_posts')
    .select(`
      *,
      author:profiles!group_posts_user_id_fkey(id, full_name, avatar_url, headline)
    `)
    .eq('parent_post_id', postId)
    .order('created_at', { ascending: true });
  return { data, error };
};

// Create a new post in a group
export const createGroupPost = async (postData) => {
  await guardEmployers();
  const { data, error } = await supabase
    .from('group_posts')
    .insert([postData])
    .select('*, author:profiles!group_posts_user_id_fkey(id, full_name, avatar_url, headline)')
    .single();
  return { data, error };
};

// Delete a post from a group
export const deleteGroupPost = async (postId) => {
  await guardEmployers();
  const { data, error } = await supabase
    .from('group_posts')
    .delete()
    .eq('id', postId);
  return { data, error };
};

// Update a post in a group (content and/or image)
export const updateGroupPost = async (postId, updates) => {
  await guardEmployers();
  const { data, error } = await supabase
    .from('group_posts')
    .update(updates)
    .eq('id', postId)
    .select('*, author:profiles!group_posts_user_id_fkey(id, full_name, avatar_url, headline)')
    .single();
  return { data, error };
};

// Report a group post
export const reportGroupPost = async ({ post_id, reason, reporter_id }) => {
  await guardEmployers();
  const { data, error } = await supabase
    .from('group_post_reports')
    .insert([{ post_id, reason, reporter_id }])
    .select()
    .single();
  return { data, error };
};

/**
 * @deprecated Use removeMemberRpc from '../api/groups' instead.
 * The RPC enforces last-admin safety and proper authorization.
 */
export const removeGroupMember = async (groupId, userId) => {
  await guardEmployers();
  const { data, error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);
  return { data, error };
};

// Update group details
export const updateGroupDetails = async (groupId, updates) => {
  await guardEmployers();
  const { data, error } = await supabase
    .from('groups')
    .update(updates)
    .eq('id', groupId)
    .select()
    .single();
  return { data, error };
};

// Local helper to guard employer role for group mutations
async function guardEmployers() {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return;
    const { data: prof } = await supabase.from('profiles').select('role').eq('id', uid).maybeSingle();
    if (prof?.role === 'employer') {
      const err = new Error('Employers cannot perform this action.');
      err.code = 'EMPLOYER_POLICY';
      throw err;
    }
  } catch (_) {
    // If profile fetch fails, do not block
  }
}

/**
 * @deprecated Use setMemberRoleRpc from '../api/groups' instead.
 * The RPC enforces last-admin safety and proper authorization.
 */
export const setMemberRole = async (groupId, userId, role) => {
  const { data, error } = await supabase
    .from('group_members')
    .update({ role })
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .select()
    .single();
  return { data, error };
};

/**
 * @deprecated Use deleteGroupRpc from '../api/groups' instead.
 * The RPC enforces proper authorization and cascades deletes safely.
 */
export const deleteGroup = async (groupId) => {
  const { data, error } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId)
    .select()
    .single();
  return { data, error };
};

/**
 * Fetch a compact summary of the current user's most recent group memberships.
 * Combines active memberships (group_members) and pending requests (group_memberships)
 * and annotates each row with a membership state: 'active' | 'pending'.
 */
export async function fetchMyGroupsSummary(limit = 3, userId) {
  if (!userId) return { data: [], error: null };

  const max = Math.max(1, limit || 1);

  // Fetch active memberships and pending requests in parallel
  const [activeRes, pendingRes] = await Promise.all([
    supabase
      .from('group_members')
      .select('group_id, joined_at, created_at')
      .eq('user_id', userId)
      .order('joined_at', { ascending: false })
      .limit(max * 2),
    supabase
      .from('group_memberships')
      .select('group_id, status, created_at')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(max * 2),
  ]);

  if (activeRes.error) return { data: [], error: activeRes.error };
  if (pendingRes.error) return { data: [], error: pendingRes.error };

  const combinedMap = new Map();

  // Active memberships take precedence for a group
  (activeRes.data || []).forEach((m) => {
    const ts = m.joined_at || m.created_at;
    combinedMap.set(m.group_id, {
      group_id: m.group_id,
      ts,
      state: 'active',
    });
  });

  // Pending memberships only fill in groups where there is no active membership
  (pendingRes.data || []).forEach((m) => {
    if (!combinedMap.has(m.group_id)) {
      const ts = m.created_at;
      combinedMap.set(m.group_id, {
        group_id: m.group_id,
        ts,
        state: 'pending',
      });
    }
  });

  const combinedList = Array.from(combinedMap.values())
    .sort((a, b) => {
      const ta = a.ts ? new Date(a.ts).getTime() : 0;
      const tb = b.ts ? new Date(b.ts).getTime() : 0;
      return tb - ta;
    })
    .slice(0, max);

  if (combinedList.length === 0) return { data: [], error: null };

  const ids = combinedList.map((m) => m.group_id);

  // Hydrate group metadata
  const { data: groups, error: gErr } = await supabase
    .from('groups')
    .select('id, name, group_avatar_url, is_private, is_archived, is_admin_only_posts, is_approved, approval_status, tags, created_at')
    .in('id', ids);
  if (gErr) return { data: [], error: gErr };

  const byId = Object.fromEntries((groups || []).map((g) => [g.id, g]));
  const merged = combinedList
    .map((m) => {
      const g = byId[m.group_id];
      if (!g) return null; // RLS may hide some groups
      return { ...g, joined_at: m.ts, state: m.state };
    })
    .filter(Boolean);

  return { data: merged, error: null };
}

// Upload group avatar
export const uploadGroupAvatar = async (file, groupId) => {
  try {
    const fileExt = file.name.split('.').pop();
    const filePath = `${groupId}/avatar.${fileExt}`;
    const bucketName = 'group_avatars';
    
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'image/png',
      });
      
    if (uploadError) {
      logger.error('Upload error:', uploadError);
      return { error: uploadError };
    }
    
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
      
    // Update group with new avatar URL
    const { data, error } = await updateGroupDetails(groupId, {
      group_avatar_url: urlData.publicUrl
    });
    
    return { data, error, url: urlData.publicUrl };
  } catch (err) {
    logger.error('Error in uploadGroupAvatar:', err);
    return { error: err };
  }
};

// Upload post image to group_posts/{groupId}/{postId}/...
export const uploadPostImage = async (file, groupId, postId) => {
  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const filePath = `${groupId}/${postId}/${Date.now()}-${safeName}`;
    const bucketName = 'group_posts';
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'image/png',
      });
    if (uploadError) {
      return { error: uploadError };
    }
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    return { url: urlData.publicUrl, error: null };
  } catch (err) {
    return { error: err };
  }
};

export const fetchMentorshipRequests = async (userId) => {
  const [sentRes, receivedRes] = await Promise.all([
    supabase
      .from('v_my_mentorship_requests')
      .select('*')
      .eq('mentee_id', userId),
    supabase
      .from('v_my_mentorship_dashboard')
      .select('*')
      .eq('mentor_id', userId),
  ]);

  if (sentRes.error) return { data: null, error: sentRes.error };
  if (receivedRes.error) return { data: null, error: receivedRes.error };

  const sentRows = sentRes.data || [];
  const receivedRows = receivedRes.data || [];

  const data = [
    ...receivedRows.map((r) => ({
      id: r.id,
      status: r.status,
      created_at: r.created_at,
      mentor_id: r.mentor_id,
      mentee_id: r.mentee_id,
      mentor: { id: r.mentor_id },
      mentee: { id: r.mentee_id },
    })),
    ...sentRows.map((r) => ({
      id: r.id,
      status: r.status,
      created_at: r.created_at,
      mentor_id: r.mentor_id,
      mentee_id: r.mentee_id,
      mentor: { id: r.mentor_id },
      mentee: { id: r.mentee_id },
    })),
  ];

  return { data, error: null };
};

/**
 * Check if two users are connected (accepted/connected status)
 * @param {string} currentUserId - Current user's ID
 * @param {string} peerId - Other user's ID
 * @returns {Promise<boolean>} - True if connected, false otherwise
 */
export const checkConnectionStatus = async (currentUserId, peerId) => {
  if (!currentUserId || !peerId || currentUserId === peerId) {
    return false;
  }
  
  try {
    // Try RPC function first (most efficient)
    const { data, error } = await supabase.rpc('are_users_connected', {
      a: currentUserId,
      b: peerId
    });
    
    if (!error && data !== null) {
      return data;
    }
    
    // Fallback: direct query if RPC not available
    const { data: connection, error: connError } = await supabase
      .from('connections')
      .select('id, status')
      .or(`and(requester_id.eq.${currentUserId},recipient_id.eq.${peerId}),and(requester_id.eq.${peerId},recipient_id.eq.${currentUserId})`)
      .in('status', ['accepted', 'connected'])
      .maybeSingle();
    
    if (connError) {
      logger.error('Error checking connection status:', connError);
      return false;
    }
    
    return !!connection;
  } catch (err) {
    logger.error('Error in checkConnectionStatus:', err);
    return false;
  }
};

