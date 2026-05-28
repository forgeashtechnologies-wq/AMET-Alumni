import logger from '../../utils/logger';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import LoadingSpinner from '../common/LoadingSpinner';
import { saveOnboardingDraft, loadOnboardingDraft, clearOnboardingDraft } from '../../utils/localDrafts';
import { sanitizeProfilePayload } from '../../utils/payload';
import { useDegreePrograms } from '../../hooks/useDegreePrograms';
import { useDepartments } from '../../hooks/useDepartments';
import AvatarService from '../../services/avatar';

export default function OnboardingForm() {
  const navigate = useNavigate();
  const { options: degreeOptions } = useDegreePrograms();
  const { options: deptOptions, labelMap: deptLabelMap } = useDepartments();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [dbError, setDbError] = useState('');
  const [status, setStatus] = useState({ state: 'idle' }); // idle | saving | awaiting_confirmation | done | error

  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    graduation_year: '',
    degree_program: '',
    department: '', // optional
    company_name: '',
    current_job_title: '',
    location: '',
    avatar_file: null,
    prefill_avatar_url: null,
  });

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate('/login', { replace: true }); return; }
        setUser(user);
        // Prefill name/email from auth or existing profile
        const authEmail = user.email || '';
        let existingProfile = null;
        try {
          const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
          existingProfile = data || null;
        } catch (e) {
          // Log error but continue; profile may not exist yet
          logger.warn('Error fetching existing profile for onboarding:', e);
        }
        // Derive names from profile or user metadata
        const meta = user.user_metadata || {};
        const full = (existingProfile?.full_name || meta.full_name || meta.name || '').trim();
        const [firstGuess, ...rest] = full ? full.split(/\s+/) : ['',''];
        const lastGuess = rest.length ? rest[rest.length - 1] : '';
        const avatarGuess = existingProfile?.avatar_url || meta.avatar_url || null;

        // Prefill from profile/auth, then overlay with any locally saved draft
        const draft = loadOnboardingDraft();
        setForm((f) => ({
          ...f,
          email: existingProfile?.email || draft.email || authEmail,
          first_name: existingProfile?.first_name || draft.first_name || firstGuess || '',
          last_name: existingProfile?.last_name || draft.last_name || lastGuess || '',
          graduation_year: existingProfile?.graduation_year || draft.graduation_year || '',
          degree_program: existingProfile?.degree_program || draft.degree_program || '',
          department: existingProfile?.department || draft.department || '',
          company_name: existingProfile?.company_name || draft.company_name || '',
          current_job_title: existingProfile?.current_job_title || existingProfile?.job_title || draft.current_job_title || '',
          location: existingProfile?.location || draft.location || '',
          prefill_avatar_url: avatarGuess,
        }));
        // Does profile already exist?
        const { data: prof } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
        if (prof) {
          // If exists and complete, redirect to app; otherwise, let them complete onboarding
          // We still allow onboarding to update any missing required fields
        }
      } finally {
        setLoading(false);
      }
    })();
    // If redirected with check-email hint, show confirmation state
    if (new URLSearchParams(window.location.search).get('check-email') === '1') {
      setStatus({ state: 'awaiting_confirmation' });
    }
  }, [navigate]);

  const onChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'avatar_file') {
      setForm((f) => ({ ...f, avatar_file: files?.[0] || null }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const validate = () => {
    const errs = {};
    // Names: letters and spaces only
    if (!form.first_name.trim()) errs.first_name = 'First name is required.';
    else if (!/^[A-Za-z ]+$/.test(form.first_name.trim())) errs.first_name = 'Use letters and spaces only.';
    if (!form.last_name.trim()) errs.last_name = 'Last name is required.';
    else if (!/^[A-Za-z ]+$/.test(form.last_name.trim())) errs.last_name = 'Use letters and spaces only.';
    // Email required (readonly)
    if (!form.email.trim()) errs.email = 'Email is required.';
    // Year range
    const yr = Number(form.graduation_year);
    if (!yr || yr < 1980 || yr > currentYear + 1) errs.graduation_year = `Enter a valid year between 1980 and ${currentYear + 1}`;
    // Required select/code
    if (!form.degree_program) errs.degree_program = 'Select your degree.';
    // Job/company
    if (!form.company_name.trim()) errs.company_name = 'Company is required.';
    if (!form.current_job_title.trim()) errs.current_job_title = 'Current job title is required.';
    // Avatar is optional: if provided, it will be uploaded via AvatarService
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const uploadAvatarIfAny = async () => {
    if (!form.avatar_file) return form.prefill_avatar_url || null;
    const file = form.avatar_file;
    const { publicUrl } = await AvatarService.uploadAvatar(file);
    return publicUrl || form.prefill_avatar_url || null;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setDbError('');
    if (!validate()) return;
    if (status.state === 'saving') return;
    setSaving(true);
    setStatus({ state: 'saving' });
    try {
      await uploadAvatarIfAny();
      // Build minimal payload for profile UPDATE (do not include id/email)
      const rawPayload = {
        first_name: form.first_name,
        last_name: form.last_name,
        graduation_year: form.graduation_year,
        degree_program: form.degree_program,
        // Department optional; store label if provided, else NULL (map code to label if present)
        department: form.department ? (deptLabelMap[form.department] || form.department) : null,
        company_name: form.company_name,
        current_job_title: form.current_job_title,
        location: form.location,
      };
      const payload = sanitizeProfilePayload(rawPayload);
      // Ensure we have an authenticated user ID before writing; if not, persist draft and ask for email confirmation
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user?.id) {
        saveOnboardingDraft({
          email: form.email.trim(),
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          graduation_year: form.graduation_year,
          degree_program: form.degree_program,
          department: form.department,
          company_name: form.company_name,
          current_job_title: form.current_job_title,
          location: form.location,
        });
        setStatus({ state: 'awaiting_confirmation' });
        return;
      }

      // Update existing profile (row is created by backend trigger)
      logger.log('Submitting onboarding payload:', payload);
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ ...payload, id: authData.user.id })
        .select()
        .maybeSingle();
      
      if (error) {
        logger.error('Profile update error:', error);
        throw error;
      }
      
      logger.log('Profile update result:', data);
      clearOnboardingDraft();
      setStatus({ state: 'done' });
      
      // Wait a bit for the profile to be reflected in context, then redirect
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 500);
    } catch (err) {
      let msg = err?.message || 'Failed to save. Please try again.';
      if (/foreign key/i.test(msg)) msg = 'Please choose a valid option.';
      if (/permission|rls|403|401/i.test(msg)) msg = "Permission error — please re-login.";
      setDbError(msg);
      setStatus({ state: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ocean-50 flex items-center justify-center">
        <div className="text-slate-600">Loading…</div>
      </div>
    );
  }

  if (status.state === 'done') {
    return (
      <div className="min-h-screen bg-ocean-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Profile Complete!</h1>
          <p className="text-slate-700 mb-4">Your profile has been saved successfully. Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  if (status.state === 'awaiting_confirmation') {
    return (
      <div className="min-h-screen bg-ocean-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow p-8 text-center">
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Confirm your email</h1>
          <p className="text-slate-700 mb-4">We sent a confirmation link. After confirming, click “I’ve confirmed”.</p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={async () => {
                try {
                  const draft = loadOnboardingDraft();
                  if (!draft?.email) return;
                  await supabase.auth.resend({
                    type: 'signup',
                    email: draft.email,
                    options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
                  });
                } catch (e) {
                  // ignore
                }
              }}
              className="btn-ocean px-4 py-2 rounded-lg"
            >
              Resend link
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user?.id) setStatus({ state: 'idle' });
                } catch (e) { /* ignore */ }
              }}
              className="btn-gray px-4 py-2 rounded-lg"
            >
              I’ve confirmed
            </button>
          </div>
          <div className="mt-4">
            <button onClick={() => navigate('/login')} className="underline text-sm text-slate-600">Back to Login</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ocean-50 flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-2xl bg-white rounded-xl shadow p-6 space-y-5">
        <h1 className="text-xl font-semibold text-slate-900">Complete your onboarding</h1>
        {dbError && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{dbError}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">First Name *</label>
            <input name="first_name" type="text" value={form.first_name} onChange={onChange} className={`w-full rounded-lg border ${errors.first_name ? 'border-rose-400' : 'border-slate-300'} px-3 py-2`} placeholder="First name" />
            {errors.first_name && <p className="text-xs text-rose-600 mt-1">{errors.first_name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Last Name *</label>
            <input name="last_name" type="text" value={form.last_name} onChange={onChange} className={`w-full rounded-lg border ${errors.last_name ? 'border-rose-400' : 'border-slate-300'} px-3 py-2`} placeholder="Last name" />
            {errors.last_name && <p className="text-xs text-rose-600 mt-1">{errors.last_name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Email *</label>
            <input name="email" type="email" value={form.email} readOnly className={`w-full rounded-lg border ${errors.email ? 'border-rose-400' : 'border-slate-300'} bg-slate-50 px-3 py-2`} />
            {errors.email && <p className="text-xs text-rose-600 mt-1">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Avatar (optional)</label>
            <input name="avatar_file" type="file" accept="image/*" onChange={onChange} className="w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Graduation Year *</label>
            <input name="graduation_year" type="number" min="1980" max={currentYear + 1} value={form.graduation_year} onChange={onChange} className={`w-full rounded-lg border ${errors.graduation_year ? 'border-rose-400' : 'border-slate-300'} px-3 py-2`} placeholder="YYYY" />
            {errors.graduation_year && <p className="text-xs text-rose-600 mt-1">{errors.graduation_year}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Degree Program *</label>
            <select name="degree_program" value={form.degree_program} onChange={onChange} className={`w-full rounded-lg border ${errors.degree_program ? 'border-rose-400' : 'border-slate-300'} px-3 py-2 bg-white`}>
              <option value="" disabled>Select degree</option>
              {degreeOptions.map((opt) => (
                <option key={opt.code} value={opt.code}>{opt.label}</option>
              ))}
            </select>
            {errors.degree_program && <p className="text-xs text-rose-600 mt-1">{errors.degree_program}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Department (optional)</label>
            <select name="department" value={form.department} onChange={onChange} className={`w-full rounded-lg border border-slate-300 px-3 py-2 bg-white`}>
              <option value="">Select department (optional)</option>
              {deptOptions.map((opt) => (
                <option key={opt.code} value={opt.code}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Current Company *</label>
            <input name="company_name" type="text" value={form.company_name} onChange={onChange} className={`w-full rounded-lg border ${errors.company_name ? 'border-rose-400' : 'border-slate-300'} px-3 py-2`} placeholder="e.g., Maersk" />
            {errors.company_name && <p className="text-xs text-rose-600 mt-1">{errors.company_name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Current Job Title *</label>
            <input name="current_job_title" type="text" value={form.current_job_title} onChange={onChange} className={`w-full rounded-lg border ${errors.current_job_title ? 'border-rose-400' : 'border-slate-300'} px-3 py-2`} placeholder="e.g., Chief Officer" />
            {errors.current_job_title && <p className="text-xs text-rose-600 mt-1">{errors.current_job_title}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Location (optional)</label>
            <input name="location" type="text" value={form.location} onChange={onChange} className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="City, Country" />
          </div>
        </div>

        <div className="pt-2">
          <button disabled={saving} className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save and continue'}
          </button>
        </div>
      </form>
    </div>
  );
}
