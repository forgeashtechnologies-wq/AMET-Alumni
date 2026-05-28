import React, { useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';
import { useDegreePrograms } from '../../hooks/useDegreePrograms';
import AvatarService from '../../services/avatar';

export default function ProfileCompletion() {
  const { user, profile, getUserRole, fetchUserProfile } = useAuth();
  const role = getUserRole();
  const { options: degreeOptions } = useDegreePrograms();

  const [form, setForm] = useState({
    email: profile?.email || user?.email || '',
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    degree_program: profile?.degree_program || profile?.degree || '',
    department: profile?.department || '',
    graduation_year: profile?.graduation_year || '',
    expected_graduation_year: profile?.expected_graduation_year || '',
    company_name: profile?.company_name || '',
    job_title: profile?.current_job_title || profile?.job_title || '',
    student_id: profile?.student_id || '',
    avatar_file: null,
    prefill_avatar_url: profile?.avatar_url || null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // DB-level required fields (also used by is_profile_complete)
  // Avatar is optional: users can complete profile without a profile photo
  const required = useMemo(() => {
    const base = ['email','first_name','last_name','degree_program','company_name','job_title'];
    // Only alumni are strictly required to provide graduation_year in this step.
    // Students and other roles are not blocked on graduation_year here; their
    // expected graduation year can be captured via other flows.
    if (role === 'alumni') {
      return [...base, 'graduation_year'];
    }
    return base;
  }, [role]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const validate = () => {
    const errs = [];
    const isNonEmpty = (v) => v !== undefined && v !== null && String(v).trim() !== '';
    if (!isNonEmpty(form.email)) errs.push('email');
    if (!isNonEmpty(form.first_name) || !/^[A-Za-z ]+$/.test(form.first_name)) errs.push('first_name');
    if (!isNonEmpty(form.last_name) || !/^[A-Za-z ]+$/.test(form.last_name)) errs.push('last_name');
    // Only enforce graduation_year for alumni in this lightweight completion step.
    if (role === 'alumni') {
      const yr = Number(form.graduation_year);
      if (!yr || yr < 1980 || yr > new Date().getFullYear() + 1) errs.push('graduation_year');
    }
    if (!isNonEmpty(form.degree_program)) errs.push('degree_program');
    if (!isNonEmpty(form.company_name)) errs.push('company_name');
    if (!isNonEmpty(form.job_title)) errs.push('job_title');
    return errs;
  };

  const uploadAvatarIfAny = async () => {
    if (!form.avatar_file) return form.prefill_avatar_url || null;
    const file = form.avatar_file;
    const { publicUrl } = await AvatarService.uploadAvatar(file);
    return publicUrl || form.prefill_avatar_url || null;
  };

  const onSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const errs = validate();
    if (errs.length) {
      setError('Please fill all required fields correctly.');
      return;
    }
    setSaving(true);
    try {
      await uploadAvatarIfAny();
      const payload = {
        email: form.email.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        degree_program: form.degree_program || null,
        degree: form.degree_program || null,
        department: form.department || null,
        graduation_year: form.graduation_year ? Number(form.graduation_year) : null,
        expected_graduation_year: role === 'student' ? (form.expected_graduation_year ? Number(form.expected_graduation_year) : null) : profile?.expected_graduation_year ?? null,
        company_name: form.company_name || null,
        job_title: form.job_title || null,
        student_id: role === 'student' ? (form.student_id || null) : profile?.student_id ?? null,
      };
      const { error: upErr } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', user?.id);
      if (upErr) throw upErr;

      if (user?.id && typeof fetchUserProfile === 'function') {
        try {
          await fetchUserProfile(user.id, true);
        } catch (_) {
          void 0;
        }
      }
      setSuccess('Profile updated successfully.');
    } catch (e2) {
      setError(e2.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, name, type = 'text', placeholder }) => (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label} {required.includes(name) && <span className="text-rose-600">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={form[name] ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
      />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Complete your profile</h1>
      <p className="mt-1 text-sm text-slate-600">Please provide the required details below to continue.</p>

      {error && <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      {success && <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>}

      <form onSubmit={onSave} className="mt-6 space-y-4">
        <Field label="Email" name="email" type="email" placeholder="name@example.com" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="First Name" name="first_name" placeholder="First name" />
          <Field label="Last Name" name="last_name" placeholder="Last name" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Degree Program <span className="text-rose-600">*</span></label>
            <select
              name="degree_program"
              value={form.degree_program}
              onChange={onChange}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="" disabled>Select degree</option>
              {degreeOptions.map((o) => (
                <option key={o.code} value={o.code}>{o.label}</option>
              ))}
            </select>
          </div>
          <Field label="Department (optional)" name="department" placeholder="e.g., Marine Engineering" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Graduation Year" name="graduation_year" type="number" placeholder="e.g., 2015" />
          <Field label="Current Company" name="company_name" placeholder="e.g., Maersk" />
        </div>
        <Field label="Current Position" name="job_title" placeholder="e.g., Chief Officer" />

        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">Avatar (optional)</label>
          <input type="file" accept="image/*" onChange={(e)=> setForm((f)=>({ ...f, avatar_file: e.target.files?.[0] || null }))} className="w-full" />
          {form.prefill_avatar_url && <p className="text-xs text-slate-500">Existing avatar will be kept if you don't upload a new one.</p>}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save and Continue'}
          </button>
        </div>
      </form>
    </div>
  );
}
