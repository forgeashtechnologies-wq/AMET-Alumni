-- ============================================================================
-- SECURITY QUESTION PASSWORD RESET FLOW
-- Team: OPIB-∞ + Supreme DB Architect + UUX-∞
-- Date: 2025-12-12
-- ============================================================================
-- This migration implements a secure password reset flow using security questions:
--   - Rate limiting table to prevent brute force
--   - Password reset tokens table for short-lived reset capability
--   - RPCs with rate limiting and account lockout
-- ============================================================================

-- ============================================================================
-- 1. RATE LIMITING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.security_question_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  attempt_type text NOT NULL CHECK (attempt_type IN ('lookup', 'verify')),
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups by email and time window
CREATE INDEX IF NOT EXISTS idx_sq_attempts_email_created 
  ON public.security_question_attempts(email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sq_attempts_ip_created 
  ON public.security_question_attempts(ip_address, created_at DESC) 
  WHERE ip_address IS NOT NULL;

-- Auto-cleanup old attempts (keep 24 hours)
CREATE INDEX IF NOT EXISTS idx_sq_attempts_cleanup
  ON public.security_question_attempts(created_at)
  WHERE created_at < now() - interval '24 hours';

-- No RLS needed - this is managed by SECURITY DEFINER RPCs only
-- We explicitly DISABLE RLS and use service role in RPCs
ALTER TABLE public.security_question_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role / definer functions can access
CREATE POLICY "service_role_only_sq_attempts"
  ON public.security_question_attempts
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- 2. PASSWORD RESET TOKENS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_reset_token_hash UNIQUE (token_hash)
);

-- Index for token lookup
CREATE INDEX IF NOT EXISTS idx_reset_tokens_hash
  ON public.password_reset_tokens(token_hash);

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires
  ON public.password_reset_tokens(expires_at);

-- No RLS - managed by SECURITY DEFINER RPCs only
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only_reset_tokens"
  ON public.password_reset_tokens
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- 3. HELPER: Check rate limit
-- ============================================================================

CREATE OR REPLACE FUNCTION public._check_sq_rate_limit(
  p_email text,
  p_ip_address text,
  p_attempt_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email_attempts int;
  v_ip_attempts int;
  v_failed_verify_attempts int;
  v_lockout_until timestamptz;
  -- Rate limits
  c_max_lookups_per_hour int := 10;
  c_max_verify_per_hour int := 5;
  c_max_failed_verify int := 3; -- Lockout after 3 failed verifications
  c_lockout_duration interval := interval '30 minutes';
BEGIN
  -- Count email attempts in last hour
  SELECT count(*) INTO v_email_attempts
  FROM public.security_question_attempts
  WHERE email = lower(trim(p_email))
    AND attempt_type = p_attempt_type
    AND created_at > now() - interval '1 hour';

  -- Count IP attempts in last hour (if provided)
  IF p_ip_address IS NOT NULL THEN
    SELECT count(*) INTO v_ip_attempts
    FROM public.security_question_attempts
    WHERE ip_address = p_ip_address
      AND attempt_type = p_attempt_type
      AND created_at > now() - interval '1 hour';
  ELSE
    v_ip_attempts := 0;
  END IF;

  -- Check for account lockout (failed verify attempts)
  SELECT count(*) INTO v_failed_verify_attempts
  FROM public.security_question_attempts
  WHERE email = lower(trim(p_email))
    AND attempt_type = 'verify'
    AND success = false
    AND created_at > now() - c_lockout_duration;

  -- If locked out, calculate when lockout ends
  IF v_failed_verify_attempts >= c_max_failed_verify THEN
    SELECT created_at + c_lockout_duration INTO v_lockout_until
    FROM public.security_question_attempts
    WHERE email = lower(trim(p_email))
      AND attempt_type = 'verify'
      AND success = false
    ORDER BY created_at DESC
    LIMIT 1;

    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'account_locked',
      'lockout_until', v_lockout_until,
      'message', 'Too many failed attempts. Please try again later or use email reset.'
    );
  END IF;

  -- Check rate limits
  IF p_attempt_type = 'lookup' AND v_email_attempts >= c_max_lookups_per_hour THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit_email',
      'message', 'Too many requests. Please try again later.'
    );
  END IF;

  IF p_attempt_type = 'verify' AND v_email_attempts >= c_max_verify_per_hour THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit_email',
      'message', 'Too many verification attempts. Please try again later.'
    );
  END IF;

  IF v_ip_attempts >= c_max_lookups_per_hour * 2 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit_ip',
      'message', 'Too many requests from your location. Please try again later.'
    );
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- ============================================================================
-- 4. HELPER: Record attempt
-- ============================================================================

CREATE OR REPLACE FUNCTION public._record_sq_attempt(
  p_email text,
  p_ip_address text,
  p_attempt_type text,
  p_success boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_question_attempts (email, ip_address, attempt_type, success)
  VALUES (lower(trim(p_email)), p_ip_address, p_attempt_type, p_success);
END;
$$;

-- ============================================================================
-- 5. RPC: Get security question for email (unauthenticated, rate-limited)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_security_question_for_email(
  p_email text,
  p_ip_address text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate_check jsonb;
  v_profile_id uuid;
  v_question text;
  v_email_normalized text;
BEGIN
  v_email_normalized := lower(trim(p_email));

  -- Validate email format
  IF v_email_normalized !~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_email',
      'message', 'Please enter a valid email address.'
    );
  END IF;

  -- Check rate limit
  v_rate_check := public._check_sq_rate_limit(v_email_normalized, p_ip_address, 'lookup');
  IF NOT (v_rate_check->>'allowed')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', v_rate_check->>'reason',
      'message', v_rate_check->>'message'
    );
  END IF;

  -- Look up profile by email
  SELECT p.id INTO v_profile_id
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE u.email = v_email_normalized;

  -- Always record the lookup attempt (even if no account found)
  -- This prevents enumeration timing attacks
  PERFORM public._record_sq_attempt(v_email_normalized, p_ip_address, 'lookup', v_profile_id IS NOT NULL);

  -- If no account, return generic message (don't reveal if email exists)
  IF v_profile_id IS NULL THEN
    -- Add small delay to prevent timing attacks
    PERFORM pg_sleep(0.1 + random() * 0.2);
    RETURN jsonb_build_object(
      'success', true,
      'has_question', false,
      'message', 'If you have a security question set, it will appear here.'
    );
  END IF;

  -- Get security question
  SELECT sq.question INTO v_question
  FROM public.security_questions sq
  WHERE sq.profile_id = v_profile_id;

  IF v_question IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'has_question', false,
      'message', 'No security question set. Please use email reset instead.'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'has_question', true,
    'question', v_question
  );
END;
$$;

-- ============================================================================
-- 6. RPC: Verify security answer and issue reset token (unauthenticated)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.verify_security_answer_for_reset(
  p_email text,
  p_answer text,
  p_ip_address text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate_check jsonb;
  v_profile_id uuid;
  v_stored_hash text;
  v_email_normalized text;
  v_answer_matches boolean;
  v_reset_token text;
  v_token_hash text;
  v_expires_at timestamptz;
BEGIN
  v_email_normalized := lower(trim(p_email));

  -- Validate inputs
  IF v_email_normalized IS NULL OR v_email_normalized = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_email',
      'message', 'Email is required.'
    );
  END IF;

  IF p_answer IS NULL OR length(trim(p_answer)) < 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_answer',
      'message', 'Answer is required.'
    );
  END IF;

  -- Check rate limit
  v_rate_check := public._check_sq_rate_limit(v_email_normalized, p_ip_address, 'verify');
  IF NOT (v_rate_check->>'allowed')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', v_rate_check->>'reason',
      'message', v_rate_check->>'message',
      'lockout_until', v_rate_check->>'lockout_until'
    );
  END IF;

  -- Look up profile and security question
  SELECT p.id, sq.answer_hash 
  INTO v_profile_id, v_stored_hash
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.security_questions sq ON sq.profile_id = p.id
  WHERE u.email = v_email_normalized;

  -- If no account or no security question, return generic error
  IF v_profile_id IS NULL OR v_stored_hash IS NULL THEN
    -- Record failed attempt
    PERFORM public._record_sq_attempt(v_email_normalized, p_ip_address, 'verify', false);
    -- Add delay
    PERFORM pg_sleep(0.2 + random() * 0.3);
    RETURN jsonb_build_object(
      'success', false,
      'error', 'verification_failed',
      'message', 'Unable to verify. Please check your email and answer, or use email reset.'
    );
  END IF;

  -- Verify the answer
  v_answer_matches := v_stored_hash = crypt(lower(trim(p_answer)), v_stored_hash);

  -- Record the attempt
  PERFORM public._record_sq_attempt(v_email_normalized, p_ip_address, 'verify', v_answer_matches);

  IF NOT v_answer_matches THEN
    -- Check remaining attempts
    DECLARE
      v_failed_count int;
      v_remaining int;
    BEGIN
      SELECT count(*) INTO v_failed_count
      FROM public.security_question_attempts
      WHERE email = v_email_normalized
        AND attempt_type = 'verify'
        AND success = false
        AND created_at > now() - interval '30 minutes';

      v_remaining := 3 - v_failed_count;
      
      IF v_remaining <= 0 THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'account_locked',
          'message', 'Too many failed attempts. Your account is temporarily locked. Please use email reset or try again in 30 minutes.'
        );
      ELSE
        RETURN jsonb_build_object(
          'success', false,
          'error', 'wrong_answer',
          'message', 'Incorrect answer. ' || v_remaining || ' attempt(s) remaining.',
          'remaining_attempts', v_remaining
        );
      END IF;
    END;
  END IF;

  -- Answer is correct! Generate reset token
  -- Token is 32 random bytes encoded as hex (64 chars)
  v_reset_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_reset_token, 'sha256'), 'hex');
  v_expires_at := now() + interval '15 minutes';

  -- Invalidate any existing tokens for this user
  UPDATE public.password_reset_tokens
  SET used_at = now()
  WHERE profile_id = v_profile_id AND used_at IS NULL;

  -- Store new token
  INSERT INTO public.password_reset_tokens (profile_id, token_hash, expires_at)
  VALUES (v_profile_id, v_token_hash, v_expires_at);

  -- Log to activity_events
  INSERT INTO public.activity_events (
    actor_id, category, action_code, action_label,
    entity_type, entity_id, metadata
  ) VALUES (
    v_profile_id, 'update', 'security_question_reset_initiated', 
    'Password reset initiated via security question',
    'profile', v_profile_id, 
    jsonb_build_object('method', 'security_question', 'ip', p_ip_address)
  );

  RETURN jsonb_build_object(
    'success', true,
    'reset_token', v_reset_token,
    'expires_at', v_expires_at,
    'message', 'Verification successful. You can now set a new password.'
  );
END;
$$;

-- ============================================================================
-- 7. RPC: Reset password using security token (unauthenticated)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reset_password_with_security_token(
  p_token text,
  p_new_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_hash text;
  v_token_record record;
  v_user_id uuid;
BEGIN
  -- Validate inputs
  IF p_token IS NULL OR length(p_token) != 64 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_token',
      'message', 'Invalid or malformed reset token.'
    );
  END IF;

  IF p_new_password IS NULL OR length(p_new_password) < 8 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'weak_password',
      'message', 'Password must be at least 8 characters.'
    );
  END IF;

  -- Hash the token to look up
  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

  -- Find valid token
  SELECT prt.*, prt.profile_id as user_id
  INTO v_token_record
  FROM public.password_reset_tokens prt
  WHERE prt.token_hash = v_token_hash
    AND prt.expires_at > now()
    AND prt.used_at IS NULL;

  IF v_token_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'token_expired',
      'message', 'Reset token is invalid or has expired. Please start over.'
    );
  END IF;

  v_user_id := v_token_record.user_id;

  -- Mark token as used FIRST (prevent race conditions)
  UPDATE public.password_reset_tokens
  SET used_at = now()
  WHERE id = v_token_record.id;

  -- Update the user's password in auth.users
  -- This requires the service role, which SECURITY DEFINER provides
  UPDATE auth.users
  SET 
    encrypted_password = crypt(p_new_password, gen_salt('bf')),
    updated_at = now()
  WHERE id = v_user_id;

  -- Log to activity_events
  INSERT INTO public.activity_events (
    actor_id, category, action_code, action_label,
    entity_type, entity_id, metadata
  ) VALUES (
    v_user_id, 'update', 'password_reset_completed', 
    'Password reset completed via security question',
    'profile', v_user_id, 
    jsonb_build_object('method', 'security_question')
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Your password has been reset successfully. Please sign in with your new password.'
  );
END;
$$;

-- ============================================================================
-- 8. CLEANUP JOB (run periodically via cron or manually)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempts_deleted int;
  v_tokens_deleted int;
BEGIN
  -- Delete old attempts (older than 24 hours)
  DELETE FROM public.security_question_attempts
  WHERE created_at < now() - interval '24 hours';
  GET DIAGNOSTICS v_attempts_deleted = ROW_COUNT;

  -- Delete old/used tokens (older than 1 hour after expiry or use)
  DELETE FROM public.password_reset_tokens
  WHERE expires_at < now() - interval '1 hour'
     OR used_at < now() - interval '1 hour';
  GET DIAGNOSTICS v_tokens_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'attempts_deleted', v_attempts_deleted,
    'tokens_deleted', v_tokens_deleted
  );
END;
$$;

-- ============================================================================
-- 9. GRANT EXECUTE TO anon (for unauthenticated access)
-- ============================================================================

-- These RPCs need to be callable without authentication
GRANT EXECUTE ON FUNCTION public.get_security_question_for_email(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_security_answer_for_reset(text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.reset_password_with_security_token(text, text) TO anon;

-- Cleanup is admin-only (service role or authenticated admin)
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_reset_data() FROM anon;

-- ============================================================================
-- DONE
-- ============================================================================
