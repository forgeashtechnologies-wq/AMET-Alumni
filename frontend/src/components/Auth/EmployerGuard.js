import logger from '../../utils/logger';
import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';
import LoadingScreen from '../common/LoadingScreen';

/**
 * EmployerGuard
 * - Works in both strict and non-strict modes.
 * - Does NOT rely on PostgREST relationship aliases.
 * - Supports multiple companies per employer.
 * - Retries base-table fetches on transient 401/403/406 once.
 * - Children can be a node or a render function ({ hasAccess, loading }).
 */
const EmployerGuard = ({
  children,
  companyId,
  jobId,
  strict = false,
}) => {
  const { user, userRole, isAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const location = useLocation();
  const retriedRef = useRef(false);

  useEffect(() => {
    const run = async () => {
      // While auth is loading, keep our spinner up
      if (authLoading) { setLoading(true); return; }

      // No session
      if (!user) {
        logger.debug('[EmployerGuard] no user; strict=', strict);
        setHasAccess(!strict); // allow through in non-strict
        setLoading(false);
        return;
      }

      // Admins always pass
      if (isAdmin) {
        logger.debug('[EmployerGuard] admin bypass');
        setHasAccess(true);
        setLoading(false);
        return;
      }

      // Must be employer in strict mode
      const isEmployer = userRole === 'employer';
      if (!isEmployer) {
        logger.debug('[EmployerGuard] role is not employer; strict=', strict, 'role=', userRole);
        setHasAccess(!strict);
        setLoading(false);
        return;
      }

      // Gather all companies owned by this employer (support multiple)
      let myCompanyIds = [];
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('id')
          .eq('created_by', user.id);

        if (error) {
          logger.warn('[EmployerGuard] companies fetch error', error);
        } else {
          myCompanyIds = (data || []).map(r => r.id);
        }
      } catch (e) {
        logger.warn('[EmployerGuard] companies fetch threw', e);
      }

      // If we only need to guard by companyId
      if (companyId && !jobId) {
        const ok = myCompanyIds.includes(companyId);
        logger.debug('[EmployerGuard] company check', { companyId, myCompanyIds, ok });
        setHasAccess(ok || isAdmin);
        setLoading(false);
        return;
      }

      // If nothing specific is requested, allow employer who has at least one company
      if (!companyId && !jobId) {
        const ok = myCompanyIds.length > 0;
        logger.debug('[EmployerGuard] employer baseline access', { ok, myCompanyIds });
        setHasAccess(ok || isAdmin);
        setLoading(false);
        return;
      }

      // Job ownership path: fetch the job row (base table, no joins).
      if (jobId) {
        // Make sure we have a fresh JWT in case of timing
        await supabase.auth.getSession();

        const fetchOnce = async () => {
          const { data, error, status } = await supabase
            .from('jobs')
            .select('id, posted_by, user_id, created_by, company_id')
            .eq('id', jobId)
            .single();

          return { data, error, status };
        };

        let jobRow = null;
        let last = await fetchOnce();

        // Retry once on transient auth/RLS timing codes
        if ((last.error?.status && [401, 403, 406].includes(last.error.status)) && !retriedRef.current) {
          retriedRef.current = true;
          await new Promise(r => setTimeout(r, 300));
          last = await fetchOnce();
        }

        if (last.error) {
          logger.debug('[EmployerGuard] job fetch error', {
            status: last.error.status, code: last.error.code, msg: last.error.message,
            path: location.pathname, jobId
          });
          setHasAccess(false);
          setLoading(false);
          return;
        }

        jobRow = last.data;
        if (!jobRow) {
          logger.debug('[EmployerGuard] job not found by RLS or missing', { jobId });
          setHasAccess(false);
          setLoading(false);
          return;
        }

        const ownerIds = [jobRow.posted_by, jobRow.user_id, jobRow.created_by].filter(Boolean);
        const ownsCompany = jobRow.company_id && myCompanyIds.includes(jobRow.company_id);
        const isOwner = ownerIds.includes(user.id);

        const ok = isOwner || ownsCompany || isAdmin;
        logger.debug('[EmployerGuard] job ownership decision', {
          jobId,
          ownerIds,
          me: user.id,
          myCompanyIds,
          jobCompanyId: jobRow.company_id,
          isOwner,
          ownsCompany,
          ok
        });

        setHasAccess(ok);
        setLoading(false);
        return;
      }

      // Fallback – should never hit
      setHasAccess(false);
      setLoading(false);
    };

    run();
    // re-run when auth or target changes
  }, [authLoading, user, userRole, isAdmin, companyId, jobId, location.pathname]);

  if (loading || authLoading) return <LoadingScreen />;

  if (strict && !hasAccess) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Employer access only (or you’re not the owner of this resource).
      </div>
    );
  }

  // Support render-prop usage
  if (typeof children === 'function') {
    return children({ hasAccess, loading: loading || authLoading });
  }

  return children;
};

export default EmployerGuard;
