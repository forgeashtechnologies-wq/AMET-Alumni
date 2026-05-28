/**
 * This file wraps the singleton Supabase client from ./supabase.js
 * with timeout and retry capabilities for improved reliability.
 */

import { supabase } from './supabase';
import { TIMEOUT_CONFIG, withTimeout, withRetry } from './timeoutConfig';

// Enhanced wrapper around the main Supabase client instance
// This uses the singleton client from ./supabase.js but adds timeout functionality
export const supabaseWithTimeout = {
  // Forward core client properties
  auth: supabase.auth,
  storage: supabase.storage,
  functions: supabase.functions,
  
  // Forward channel methods
  channel: (...args) => supabase.channel(...args),
  removeChannel: (...args) => supabase.removeChannel(...args),
  
  // Add timeout to database operations
  from: (table) => ({
    select: (columns = '*') => withTimeout(supabase.from(table).select(columns)),
    insert: (data, options) => withTimeout(supabase.from(table).insert(data, options)),
    update: (data, options) => withTimeout(supabase.from(table).update(data, options)),
    delete: (options) => withTimeout(supabase.from(table).delete(options)),
    upsert: (data, options) => withTimeout(supabase.from(table).upsert(data, options))
  }),
  
  // Add timeout to RPC calls
  rpc: (fn, params) => withTimeout(supabase.rpc(fn, params))
};

// Helper functions for common Supabase operations with both timeout and retry
export const supabaseQuery = {
  // Select operations
  select: (table, columns = '*', filters = {}) => 
    withRetry(() => 
      withTimeout(
        supabase
          .from(table)
          .select(columns)
          .match(filters)
      )
    ),
  
  // Insert operations
  insert: (table, data) => 
    withRetry(() => 
      withTimeout(
        supabase
          .from(table)
          .insert(data)
          .select()
      )
    ),
  
  // Update operations
  update: (table, data, filters = {}) => 
    withRetry(() => 
      withTimeout(
        supabase
          .from(table)
          .update(data)
          .match(filters)
          .select()
      )
    ),
  
  // Delete operations
  delete: (table, filters = {}) => 
    withRetry(() => 
      withTimeout(
        supabase
          .from(table)
          .delete()
          .match(filters)
      )
    ),
  
  // RPC calls
  rpc: (functionName, params = {}) => 
    withRetry(() => 
      withTimeout(
        supabase.rpc(functionName, params)
      )
    )
};

export default supabaseWithTimeout;
