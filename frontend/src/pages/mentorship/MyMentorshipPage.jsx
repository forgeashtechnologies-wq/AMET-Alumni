import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logger from '../../utils/logger';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { getRelationshipStatusUI } from '../../utils/mentorshipStatus';
import MentorCapacityPill from '../../components/Mentorship/MentorCapacityPill';
import { endMentorshipRelationship } from '../../services/mentorship';
import { ConfirmationDialog } from '../../components/shared';

/**
 * My Mentorship page - View all active and past mentorship relationships
 * Data: v_my_mentorship_relationships + profiles/mentors for capacity
 */
export default function MyMentorshipPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mentorData, setMentorData] = useState(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => {
    if (user?.id) {
      fetchRelationships();
      fetchMentorData();
    }
  }, [user?.id]);

  async function fetchRelationships() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('v_my_mentorship_relationships')
        .select('*');

      if (error) throw error;
      setRelationships(data || []);
    } catch (error) {
      logger.error('Error fetching relationships:', error);
      toast.error('We could not load your mentorships. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleEndRelationship(relationshipId) {
    try {
      await endMentorshipRelationship(relationshipId);
      toast.success('The mentorship has been ended.');
      await fetchRelationships();
    } catch (error) {
      logger.error('Error ending mentorship relationship:', error);
      toast.error('We could not end this mentorship. Please try again.');
    }
  }

  async function fetchMentorData() {
    try {
      // Check if user is a mentor
      const { data: mentorRow, error: mentorError } = await supabase
        .from('mentors')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!mentorError && mentorRow) {
        setMentorData(mentorRow);
      }

      // Get availability from profile
      if (profile?.is_available_for_mentorship !== undefined) {
        setIsAvailable(profile.is_available_for_mentorship);
      }
    } catch (error) {
      logger.error('Error fetching mentor data:', error);
    }
  }

  async function handleToggleAvailability() {
    try {
      setToggleLoading(true);
      const newValue = !isAvailable;

      const { error } = await supabase
        .from('profiles')
        .update({ is_available_for_mentorship: newValue })
        .eq('id', user.id);

      if (error) throw error;

      setIsAvailable(newValue);
      toast.success(newValue ? 'You are now accepting new mentees.' : 'You are no longer accepting new mentees.');
    } catch (error) {
      logger.error('Error toggling availability:', error);
      toast.error('We could not update your availability. Please try again.');
    } finally {
      setToggleLoading(false);
    }
  }

  async function handleOpenChat(otherId, relationshipId) {
    try {
      // Navigate to messages with context
      navigate(`/messages?userId=${otherId}&source=mentorship&relationshipId=${relationshipId}`);
    } catch (error) {
      logger.error('Error opening chat:', error);
      toast.error('We could not open this chat. Please try again.');
    }
  }

  // Separate relationships by role
  const myMentors = relationships.filter((r) => r.mentee_id === user?.id);
  const myMentees = relationships.filter((r) => r.mentor_id === user?.id);

  // Further separate by status
  const activeMentors = myMentors.filter((r) => r.status === 'active');
  const pastMentors = myMentors.filter((r) => r.status !== 'active');
  const activeMentees = myMentees.filter((r) => r.status === 'active');
  const pastMentees = myMentees.filter((r) => r.status !== 'active');

  // Mentor capacity and availability logic
  const maxMentees = mentorData?.max_mentees || 0;
  const isAtCapacity = mentorData && maxMentees > 0 && activeMentees.length >= maxMentees;
  const effectiveAvailable = !isAtCapacity && isAvailable;

  return (
    <div>
      {/* Overview Band */}
      <div className="mb-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your mentorship roles</h2>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            Mentee
          </span>
          {mentorData && (
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                mentorData.status === 'approved'
                  ? 'bg-green-100 text-green-800'
                  : mentorData.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              Mentor – {mentorData.status === 'approved' ? 'approved' : mentorData.status === 'pending' ? 'pending' : 'not approved'}
            </span>
          )}
        </div>

        {/* Mentor profile CTAs */}
        <div className="mt-2 flex flex-wrap gap-3">
          {!mentorData && (
            <button
              type="button"
              onClick={() => navigate('/mentorship/become-mentor')}
              className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Become a mentor
            </button>
          )}
          {mentorData && (
            <button
              type="button"
              onClick={() => navigate('/mentorship/become-mentor')}
              className="inline-flex items-center px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 bg-white shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Edit mentor profile
            </button>
          )}
        </div>

        {/* Mentor Controls */}
        {mentorData && mentorData.status === 'approved' && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Your mentoring capacity</p>
                  <MentorCapacityPill
                    current={activeMentees.length}
                    max={maxMentees}
                    isAvailable={effectiveAvailable}
                    size="md"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-700">Accepting new mentees</span>
                  <button
                    onClick={handleToggleAvailability}
                    disabled={toggleLoading || isAtCapacity}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      effectiveAvailable ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                    role="switch"
                    aria-checked={effectiveAvailable}
                    aria-label="Toggle accepting new mentees"
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        effectiveAvailable ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((activeMentees.length / (maxMentees || 1)) * 100, 100)}%` }}
                  aria-label={`${activeMentees.length} of ${maxMentees} mentee slots filled`}
                />
              </div>
              {isAtCapacity && (
                <p className="text-xs text-gray-500">
                  You are currently full. Increase <span className="font-medium">Max mentees</span> or move someone to
                  <span className="font-medium"> Past mentees</span> to accept new requests.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* People Mentoring You */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">People mentoring you</h2>
        <p className="text-sm text-gray-600 mb-4">These are mentors who are currently supporting you.</p>
        
        {loading ? (
          <div className="space-y-4" role="status" aria-label="Loading mentors">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 bg-gray-200 rounded-full flex-shrink-0"></div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      </div>
                      <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <div className="h-9 bg-gray-200 rounded w-24"></div>
                      <div className="h-9 bg-gray-200 rounded w-28"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <span className="sr-only">Loading your mentors...</span>
          </div>
        ) : activeMentors.length === 0 && pastMentors.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="max-w-sm mx-auto">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No active mentors yet</h3>
              <p className="text-gray-600 mb-4">
                Once a mentor accepts your request, they will appear here.
              </p>
              <button
                onClick={() => navigate('/mentorship/find')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Find a mentor
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Active Mentors */}
            {activeMentors.length > 0 && (
              <ul className="space-y-4 mb-6" role="list" aria-label="Active mentors">
                {activeMentors.map((rel) => {
                  const statusUI = getRelationshipStatusUI(rel.status);
                  return (
                    <li key={rel.id} className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-start gap-4">
                        <img
                          src={rel.mentor_avatar || '/default-avatar.svg'}
                          alt={`${rel.mentor_name}'s profile picture`}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {rel.mentor_name || 'Mentor'}
                              </h3>
                              {rel.start_date && (
                                <p className="text-sm text-gray-600">
                                  Since {new Date(rel.start_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </p>
                              )}
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusUI.bgClass} ${statusUI.textClass}`}>
                              {statusUI.text}
                            </span>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              onClick={() => handleOpenChat(rel.mentor_id, rel.id)}
                              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                              aria-label={`Go to chat with ${rel.mentor_name}`}
                            >
                              Go to chat
                            </button>
                            <button
                              onClick={() => navigate(`/mentorship/mentor/${rel.mentor_id}`)}
                              className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                              aria-label={`View ${rel.mentor_name}'s profile`}
                            >
                              View mentor
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDialog({
                                type: 'end-relationship',
                                relationshipId: rel.id,
                                description: 'Are you sure you want to end this mentorship?',
                              })}
                              className="px-4 py-2 text-sm border border-red-300 text-red-700 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                            >
                              End mentorship
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Past Mentors */}
            {pastMentors.length > 0 && (
              <details className="bg-white rounded-lg shadow p-6">
                <summary className="cursor-pointer font-semibold text-gray-900">
                  Past mentors ({pastMentors.length})
                </summary>
                <div className="mt-4 space-y-4">
                  {pastMentors.map((rel) => {
                    const statusUI = getRelationshipStatusUI(rel.status);
                    return (
                      <div key={rel.id} className="flex items-center justify-between opacity-75">
                        <div>
                          <p className="font-medium text-gray-900">{rel.mentor_name || 'Mentor'}</p>
                          {rel.start_date && (
                            <p className="text-xs text-gray-600">
                              {new Date(rel.start_date).toLocaleDateString()} – {rel.end_date ? new Date(rel.end_date).toLocaleDateString() : 'ended'}
                            </p>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${statusUI.bgClass} ${statusUI.textClass}`}>
                          {statusUI.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </>
        )}
      </div>

      {/* People You Mentor */}
      {mentorData && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">People you mentor</h2>
          <p className="text-sm text-gray-600 mb-4">These are mentees you have accepted to mentor.</p>
          
          {activeMentees.length === 0 && pastMentees.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="max-w-sm mx-auto">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">You are not mentoring anyone yet</h3>
                <p className="text-gray-600 mb-4">
                  Once you accept a mentorship request, your mentees will appear here.
                </p>
                <button
                  onClick={() => navigate('/mentorship/requests-to-me')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  View mentorship requests
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Active Mentees */}
              {activeMentees.length > 0 && (
                <ul className="space-y-4 mb-6" role="list" aria-label="Active mentees">
                  {activeMentees.map((rel) => {
                    const statusUI = getRelationshipStatusUI(rel.status);
                    return (
                      <li key={rel.id} className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-start gap-4">
                          <img
                            src={rel.mentee_avatar || '/default-avatar.svg'}
                            alt={`${rel.mentee_name}'s profile picture`}
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {rel.mentee_name || 'Mentee'}
                                </h3>
                                {rel.start_date && (
                                  <p className="text-sm text-gray-600">
                                    Since {new Date(rel.start_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                  </p>
                                )}
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusUI.bgClass} ${statusUI.textClass}`}>
                                {statusUI.text}
                              </span>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                onClick={() => handleOpenChat(rel.mentee_id, rel.id)}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                                aria-label={`Go to chat with ${rel.mentee_name}`}
                              >
                                Go to chat
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDialog({
                                  type: 'end-relationship',
                                  relationshipId: rel.id,
                                  description: 'Are you sure you want to end this mentorship?',
                                })}
                                className="px-4 py-2 text-sm border border-red-300 text-red-700 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                              >
                                End mentorship
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Past Mentees */}
              {pastMentees.length > 0 && (
                <details className="bg-white rounded-lg shadow p-6">
                  <summary className="cursor-pointer font-semibold text-gray-900">
                    Past mentees ({pastMentees.length})
                  </summary>
                  <div className="mt-4 space-y-4">
                    {pastMentees.map((rel) => {
                      const statusUI = getRelationshipStatusUI(rel.status);
                      return (
                        <div key={rel.id} className="flex items-center justify-between opacity-75">
                          <div>
                            <p className="font-medium text-gray-900">{rel.mentee_name || 'Mentee'}</p>
                            {rel.start_date && (
                              <p className="text-xs text-gray-600">
                                {new Date(rel.start_date).toLocaleDateString()} – {rel.end_date ? new Date(rel.end_date).toLocaleDateString() : 'ended'}
                              </p>
                            )}
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${statusUI.bgClass} ${statusUI.textClass}`}>
                            {statusUI.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      )}
      <ConfirmationDialog
        isOpen={confirmDialog?.type === 'end-relationship'}
        onClose={() => setConfirmDialog(null)}
        onConfirm={async () => {
          if (!confirmDialog?.relationshipId) return;
          const id = confirmDialog.relationshipId;
          setConfirmDialog(null);
          await handleEndRelationship(id);
        }}
        title="End mentorship"
        description={confirmDialog?.description || 'Are you sure you want to end this mentorship?'}
        variant="warning"
      />
    </div>
  );
}
