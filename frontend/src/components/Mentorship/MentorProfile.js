import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import logger from '../../utils/logger';
import MentorContactPanel from './MentorContactPanel';
import ApprovedGuard from '../guards/ApprovedGuard';
import { useApproval } from '../../hooks/useApproval';
import { createMentorshipRequest, mapMentorshipError } from '../../services/mentorship';
import { useMentorshipSummary } from '../../hooks/useMentorshipSummary';
import { getPublicIdentity } from '../../lib/hydrateIdentity';
import { useOpenMentorshipChat } from '../../hooks/useOpenMentorshipChat';

const MentorProfile = () => {
  const { id: mentorId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [mentor, setMentor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [requestGoals, setRequestGoals] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingRequest, setExistingRequest] = useState(null);

  const { isApprovedMentee } = useApproval();
  const { relationships } = useMentorshipSummary();
  const { openChat, loadingId } = useOpenMentorshipChat();

  const { activeRelationship, relationshipState } = useMemo(() => {
    if (!user?.id) return { activeRelationship: null, relationshipState: 'none' };

    // Prefer the mentor.user_id when we have loaded the mentors row; fall back to the
    // route param so existing URLs using the user id still work.
    const effectiveMentorUserId = mentor?.user_id || mentorId;

    const rels = relationships.filter(
      (r) => r.mentor_id === effectiveMentorUserId && r.mentee_id === user.id
    );

    const activeRel = rels.find((r) => r.status === 'active');
    if (activeRel) return { activeRelationship: activeRel, relationshipState: 'accepted' };

    return { activeRelationship: null, relationshipState: 'none' };
  }, [relationships, mentorId, user?.id, mentor?.user_id]);

  const qs = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const handleRequestSubmit = async () => {
    if (!requestMessage.trim() && !requestGoals.trim()) {
      toast.error('Please enter a short message or your goals.');
      return;
    }
    if (!user) {
      toast.error('You need to be logged in to send a request.');
      return;
    }
    if (!isApprovedMentee) {
      toast.error('Your profile is not approved. Kindly contact administrator.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Resolve the canonical mentor profile id (profiles.id) to use everywhere
      const effectiveMentorUserId = mentor?.user_id || mentorId;

      // Prevent duplicate pending requests from this mentee to this mentor (extra UX guard; RPC also enforces)
      const { data: dup, error: dupErr } = await supabase
        .from('mentorship_requests')
        .select('id, status')
        .eq('mentor_id', effectiveMentorUserId)
        .eq('mentee_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();
      if (!dupErr && dup) {
        // UX: surface the error, then close and reset the modal so the
        // mentee sees the pending state + "View your request" CTA instead
        // of being stuck on the form after a no-op submit.
        toast.error('You already have a pending request for this mentor.');
        setExistingRequest(dup);
        setShowRequestModal(false);
        setRequestMessage('');
        setRequestGoals('');
        return;
      }

      const data = await createMentorshipRequest(effectiveMentorUserId, {
        message: requestMessage || undefined,
        goals: requestGoals || undefined,
      });

      setExistingRequest(data);
      setShowRequestModal(false);
      setRequestMessage('');
      setRequestGoals('');
      toast.success('Request sent to mentor.');
    } catch (error) {
      const mapped = mapMentorshipError(error);
      toast.error(mapped.message || error.message || 'Failed to send request. Please try again or contact support.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchMentorAndRequestStatus = async () => {
      if (!user) return;

      try {
        setLoading(true);
        // 2) Try to fetch mentor core row (capacity, expertise, etc.).
        // We support both URL shapes:
        // - /mentorship/mentor/:id where :id = mentors.user_id (new)
        // - /mentorship/mentor/:id where :id = mentors.id (legacy)
        // RLS may block this for some viewers, so treat errors as "no row"
        // and still render a profile shell using just the public identity.
        let mentorRow = null;

        // Primary: assume route param is user_id
        const { data: mentorByUser, error: errByUser } = await supabase
          .from('mentors')
          .select('*')
          .eq('user_id', mentorId)
          .maybeSingle();

        if (!errByUser && mentorByUser) {
          mentorRow = mentorByUser;
        } else {
          // Fallback: try treating param as mentors.id
          const { data: mentorById, error: errById } = await supabase
            .from('mentors')
            .select('*')
            .eq('id', mentorId)
            .maybeSingle();

          if (!errById && mentorById) {
            mentorRow = mentorById;
          } else if (errByUser || errById) {
            logger.warn('MentorProfile: mentors row not accessible', errByUser || errById);
          }
        }

        // 1) Hydrate identity using the shared helper so we always get the
        // canonical name/avatar from alumni_directory_public or profiles.
        const effectiveMentorUserIdForIdentity = mentorRow?.user_id || mentorId;
        const ident = await getPublicIdentity(effectiveMentorUserIdForIdentity).catch((e) => {
          logger.warn('MentorProfile: getPublicIdentity failed', e);
          return null;
        });

        if (!mentorRow && !ident) {
          toast.error('Mentor not found.');
          setLoading(false);
          return;
        }

        setMentor({ ...(mentorRow || {}), profile: ident || { full_name: 'Mentor', avatar_url: null } });

        // Check for the latest mentorship request (pending or accepted) between
        // this mentee and mentor. Use order/limit so we never trigger the
        // PostgREST "JSON object requested, multiple (or no) rows returned" error.
        const effectiveMentorUserId = mentorRow?.user_id || mentorId;
        const { data: requestData, error: requestError } = await supabase
          .from('mentorship_requests')
          .select('*')
          .eq('mentor_id', effectiveMentorUserId)
          .eq('mentee_id', user.id)
          .in('status', ['pending', 'accepted'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // PGRST116 = no rows in single mode; treat as non-fatal
        if (requestError && requestError.code !== 'PGRST116') throw requestError;
        if (requestData) setExistingRequest(requestData);

      } catch (error) {
        toast.error('Failed to fetch mentor details: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMentorAndRequestStatus();
  }, [mentorId, user]);

  const pendingRequest = existingRequest && existingRequest.status === 'pending';
  const acceptedRequest = existingRequest && existingRequest.status === 'accepted';
  const hasActiveMentorship = !!activeRelationship || acceptedRequest;
  const isOpening = !!activeRelationship && loadingId === activeRelationship.id;
  const isSelf = user?.id && (user.id === (mentor?.profile?.id || mentor?.user_id || mentorId));

  const shouldAutoOpenRequest = useMemo(() => {
    const flag = qs.get('openRequest');
    const wantsOpen = flag === '1' || flag === 'true';
    if (!wantsOpen) return false;
    // Only auto-open when the viewer is not the mentor, there is no
    // active or pending mentorship, and the mentor profile is approved.
    if (isSelf) return false;
    if (hasActiveMentorship || pendingRequest) return false;
    if (mentor?.status !== 'approved') return false;
    return true;
  }, [qs, isSelf, hasActiveMentorship, pendingRequest, mentor?.status]);

  useEffect(() => {
    if (shouldAutoOpenRequest) {
      setShowRequestModal(true);
    }
  }, [shouldAutoOpenRequest]);

  useEffect(() => {
    if (!showRequestModal) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setShowRequestModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showRequestModal]);

  if (loading) {
    return <div className="text-center p-8">Loading mentor profile...</div>;
  }

  if (!mentor) {
    return <div className="text-center p-8">Mentor not found.</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center space-x-4 mb-6">
          <img
            src={mentor.profile?.avatar_url || '/default-avatar.svg'}
            alt={mentor.profile?.full_name}
            className="w-24 h-24 rounded-full object-cover"
          />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              {mentor.profile?.full_name}
              {hasActiveMentorship && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Your mentor
                </span>
              )}
            </h1>
            <p className="text-xl text-gray-600">
              {mentor.profile?.current_job_title || 'Professional'}
              {mentor.profile?.company_name && ` at ${mentor.profile.company_name}`}
            </p>
            {activeRelationship?.start_date && (
              <p className="mt-1 text-sm text-gray-500">
                Mentoring you since{' '}
                {new Date(activeRelationship.start_date).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">About Me</h2>
            <p className="text-gray-700 whitespace-pre-wrap">
              {mentor.mentoring_statement && String(mentor.mentoring_statement).trim().length > 0
                ? mentor.mentoring_statement
                : 'This mentor has not added a bio yet.'}
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Expertise</h3>
            {Array.isArray(mentor.expertise) && mentor.expertise.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {mentor.expertise.map((skill, index) => (
                  <span
                    key={index}
                    className="bg-ocean-100 text-ocean-800 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No expertise tags added yet.</p>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Mentorship Details</h3>
            <ul className="space-y-3 text-gray-700">
              <li>
                <strong>Experience:</strong>{' '}
                {mentor.mentoring_experience_years != null
                  ? `${mentor.mentoring_experience_years} years`
                  : 'Not specified'}
              </li>
              <li>
                <strong>Max Mentees:</strong>{' '}
                {mentor.max_mentees != null ? mentor.max_mentees : 'Not specified'}
              </li>
              <li>
                <strong>Capacity:</strong>{' '}
                {mentor.mentoring_capacity_hours_per_month != null
                  ? `${mentor.mentoring_capacity_hours_per_month} hours/month`
                  : 'Not specified'}
              </li>
              <li>
                <strong>Preferences:</strong>
                {typeof mentor.mentoring_preferences === 'object' && mentor.mentoring_preferences ? (
                  <ul className="list-disc list-inside pl-4 mt-1 text-sm">
                    {Object.entries(mentor.mentoring_preferences).map(([key, value]) => (
                      <li key={key}><span className="capitalize font-medium">{key}:</span> {String(value)}</li>
                    ))}
                  </ul>
                ) : (
                  <span> {String(mentor.mentoring_preferences || 'Not specified')}</span>
                )}
              </li>
            </ul>

            {/* Contact unlock panel: only shows contact post-acceptance; otherwise CTA */}
            <div className="mt-4">
              <MentorContactPanel mentorId={mentor.profile?.id || mentor.user_id || mentorId} />
            </div>

            {hasPermission?.('request:mentorship') && mentor?.status === 'approved' && (
              <div className="mt-6 space-y-3">
                {isSelf ? (
                  <button className="btn-ocean w-full py-2" disabled>
                    This is your profile
                  </button>
                ) : hasActiveMentorship && activeRelationship ? (
                  <button
                    className="btn-ocean w-full py-2"
                    onClick={() =>
                      openChat(activeRelationship.id)
                    }
                    disabled={isOpening}
                  >
                    {isOpening ? 'Opening chat…' : 'Go to chat'}
                  </button>
                ) : pendingRequest ? (
                  <div className="space-y-2">
                    <button className="btn-secondary-outline w-full py-2" disabled>
                      Request pending
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/mentorship/my-requests')}
                      className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm"
                    >
                      View your request
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn-ocean w-full py-2 disabled:opacity-50"
                    onClick={() => setShowRequestModal(true)}
                    disabled={loading}
                  >
                    Request mentorship
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-lg w-full">
            <h2 className="text-2xl font-bold mb-4">Send Mentorship Request</h2>
            <p className="mb-4 text-gray-600">Send a message to {mentor.profile?.full_name} to start your mentorship journey.</p>
            <textarea
              className="w-full border rounded-md p-2 h-32"
              placeholder="Write a brief message about your goals and why you'd like to connect..."
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
            />
            <input
              type="text"
              className="w-full border rounded-md p-2 mt-3"
              placeholder="Your goals (optional)"
              value={requestGoals}
              onChange={(e) => setRequestGoals(e.target.value)}
            />
            <div className="flex justify-end gap-4 mt-6">
              <button onClick={() => setShowRequestModal(false)} className="btn-secondary-outline">Cancel</button>
              <button onClick={handleRequestSubmit} className="btn-primary" disabled={isSubmitting || (!requestMessage.trim() && !requestGoals.trim())}>
                {isSubmitting ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorProfile;
