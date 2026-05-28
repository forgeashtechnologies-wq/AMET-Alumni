import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../../utils/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useToggleMentorAvailability } from '../../../hooks/useMentorshipMutations';
import logger from '../../../utils/logger';
import MentorRegistrationForm from '../MentorRegistrationForm';

/**
 * Panel for mentorship settings (mentee goals and mentor profile).
 * Integrates MentorRegistrationForm for mentor mode.
 */
export default function MentorshipSettingsPanel({ mode }) {
  const isMenteeMode = mode === 'mentee';
  const isMentorMode = mode === 'mentor';
  const { user, profile, fetchUserProfile } = useAuth();
  const isStudent = (profile?.role || '').toLowerCase() === 'student';
  const [isAvailable, setIsAvailable] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const toggleAvailabilityMutation = useToggleMentorAvailability();

  // Read initial availability from profiles for the current user
  useEffect(() => {
    let isCancelled = false;

    const readAvailability = async () => {
      if (!user?.id) {
        setLoadingAvailability(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_available_for_mentorship')
          .eq('id', user.id)
          .maybeSingle();

        if (isCancelled) return;

        if (!error && data) {
          setIsAvailable(!!data.is_available_for_mentorship);
        } else if (
          profile &&
          typeof profile.is_available_for_mentorship === 'boolean'
        ) {
          setIsAvailable(!!profile.is_available_for_mentorship);
        }
      } finally {
        if (!isCancelled) {
          setLoadingAvailability(false);
        }
      }
    };

    readAvailability();

    return () => {
      isCancelled = true;
    };
  }, [user?.id, profile?.is_available_for_mentorship]);

  const handleToggleAvailability = async (next) => {
    if (!user?.id) return;

    setIsSaving(true);
    const previous = isAvailable;
    setIsAvailable(next);

    try {
      await toggleAvailabilityMutation.mutateAsync(next);
      if (fetchUserProfile) {
        await fetchUserProfile(user.id);
      }
      toast.success('Availability updated');
    } catch (err) {
      logger.error('Failed to update availability', err);
      setIsAvailable(previous);
      toast.error('Failed to update availability');
    } finally {
      setIsSaving(false);
    }
  };
  
  const renderStudentRestrictionCard = () => (
    <div className="bg-white rounded-lg border border-red-100 p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-1 text-red-500 text-xl">⚠️</div>
        <div>
          <h2 className="text-lg font-semibold text-red-700">Trainer access is limited to alumni & employers</h2>
          <p className="text-sm text-slate-600 mt-2">
            Student accounts can participate as trainees only. Once you graduate or your role is upgraded by the admin
            team, you’ll be able to submit a trainer profile for approval.
          </p>
        </div>
      </div>
    </div>
  );

  // If mentor mode, show the registration form
  if (isMentorMode) {
    if (isStudent) {
      return (
        <div className="space-y-6">
          {renderStudentRestrictionCard()}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900">Trainer availability</h2>
          <p className="text-sm text-slate-600 mt-1">
            Control whether you are visible in the trainer directory and can receive new mentorship requests.
          </p>

          <div className="mt-4 flex items-center gap-3">
            {loadingAvailability ? (
              <div className="h-5 w-24 bg-slate-200 rounded animate-pulse" />
            ) : (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-5 w-10"
                  checked={isAvailable}
                  onChange={(e) => handleToggleAvailability(e.target.checked)}
                  disabled={isSaving || toggleAvailabilityMutation.isLoading}
                />
                <span className="text-sm font-medium">Accepting trainees</span>
              </label>
            )}
          </div>
          {!loadingAvailability && (
            <p className="text-xs text-slate-500 mt-1">
              {isAvailable
                ? "You’re visible in the trainer directory and can receive new requests."
                : "You’re hidden from the trainer directory and cannot receive new requests."}
            </p>
          )}
        </div>

        <MentorRegistrationForm />
      </div>
    );
  }
  
  // Mentee settings (placeholder for now)
  if (isMenteeMode) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Mentee Settings</h2>
          <p className="text-sm text-slate-600 mt-1">
            Manage your mentorship goals and preferences
          </p>
        </div>
        
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Your Mentorship Goals
          </h3>
          <p className="text-slate-600">
            Mentee settings coming soon. You can already browse mentors and send requests!
          </p>
        </div>
      </div>
    );
  }
  
  // Default: show both options
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Mentorship Settings</h2>
        <p className="text-sm text-slate-600 mt-1">
          Choose how you want to participate in the mentorship program
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Become a Trainer */}
        {!isStudent ? (
          <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="text-4xl mb-4">👨‍🏫</div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Become a Trainer
            </h3>
            <p className="text-slate-600 mb-4">
              Share your experience and guide students or younger alumni
            </p>
            <a
              href="/mentorship?tab=settings&mode=mentor"
              className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Set up trainer profile
            </a>
          </div>
        ) : (
          renderStudentRestrictionCard()
        )}
        
        {/* Trainee Goals */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="text-4xl mb-4">🎓</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Find a Trainer
          </h3>
          <p className="text-slate-600 mb-4">
            Browse experienced alumni and request mentorship
          </p>
          <a
            href="/mentorship?tab=find"
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Browse trainers
          </a>
        </div>
      </div>
    </div>
  );
}
