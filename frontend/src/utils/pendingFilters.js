// src/utils/pendingFilters.js
// Pending = (not approved) AND (not rejected)
// Treat NULL as false for both flags on the client side, without RPC.

/**
 * Applies consistent filters for pending content
 * - Not approved: false OR null
 * - Not rejected: NOT true (includes null and false)
 * 
 * @param {PostgrestFilterBuilder<T>} q The query builder to apply filters to
 * @returns {PostgrestFilterBuilder<T>} The query with filters applied
 */
export function applyPendingFilters(q) {
  // (A) Not approved: allow false or NULL via OR
  q = q.or('is_approved.is.null,is_approved.eq.false');

  // (B) Not rejected: simplest is "NOT (is_rejected = true)" which includes NULL and false
  q = q.not('is_rejected', 'eq', true);

  return q;
}
