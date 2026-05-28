import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { logActivity } from '../../utils/activityLogger';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { getFriendlyErrorMessage } from '../../utils/errors';
import logger from '../../utils/logger';
import { safeObjectName } from '../../utils/files';
import { computeJobApplyState } from '../../utils/jobs';

export default function ApplyDialog({ open, onClose, jobId, deadline, onSuccess }) {
  const { user, userRole, getUserRole } = useAuth();
  const [file, setFile] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef(null);
  const prevFocusRef = useRef(null);
  const MAX_SIZE = 3 * 1024 * 1024; // 3 MB bucket limit

  const formatKolkata = (iso) => {
    try {
      return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(iso));
    } catch (_) { return new Date(iso).toLocaleDateString(); }
  };

  useEffect(() => {
    if (!open) return;
    // Save and restore focus
    prevFocusRef.current = document.activeElement;
    // Focus first focusable in dialog
    const t = setTimeout(() => {
      try {
        if (!dialogRef.current) return;
        const focusables = dialogRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusables.length) (focusables[0]).focus();
      } catch (_) { void 0; }
    }, 0);
    return () => {
      clearTimeout(t);
      const el = prevFocusRef.current;
      if (el && typeof el.focus === 'function') {
        try { el.focus(); } catch (_) { void 0; }
      }
    };
  }, [open]);

  const deadlinePassed = deadline ? new Date(deadline).getTime() < Date.now() : false;

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key === 'Tab') {
      // Trap focus
      const focusables = dialogRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in to apply.');
      return;
    }
    const role = userRole || (typeof getUserRole === 'function' ? getUserRole() : null);
    if (role === 'employer') {
      toast.error('Employer accounts cannot apply to jobs from this portal.');
      return;
    }

    // Guard against quick-link or closed jobs using latest job state
    try {
      const { data: jobRow, error: jobErr } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (jobErr || !jobRow) {
        toast.error('This opportunity is no longer available.');
        return;
      }

      const applyState = computeJobApplyState(jobRow);
      if (applyState.isQuickLink) {
        toast.error('This role only accepts applications on the external site. Please use "Apply on employer site" from the job page.');
        return;
      }
      if (!applyState.canApplyInApp) {
        toast.error('Applications are closed for this role.');
        return;
      }
    } catch (err) {
      logger.error('Apply guard failed:', err);
      toast.error('We could not process your application right now. Please try again.');
      return;
    }
    if (deadlinePassed) {
      toast.error('Applications are closed for this role.');
      return;
    }
    if (!file) {
      toast.error('Please upload your resume to continue.');
      return;
    }
    // Enforce MIME type (PDF/DOC/DOCX)
    if (!/(pdf|msword|officedocument\.wordprocessingml\.document)$/i.test(file.type || '')) {
      toast.error('Only PDF, DOC, or DOCX files are allowed.');
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error('Your file is too large (max 3 MB). Please upload a smaller resume.');
      return;
    }
    const allowedExt = ['pdf','doc','docx'];
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!allowedExt.includes(ext)) {
      toast.error('Unsupported file type. Upload a PDF, DOC, or DOCX resume.');
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading('Submitting your application...');
    try {
      // Upload resume to storage: resumes/{userId}/{uuid}-{safeName}
      const uid = user.id;
      const uuid = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const key = `${uid}/${uuid}-${safeObjectName(file.name)}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('resumes')
        .upload(key, file, {
          upsert: true,
          cacheControl: '3600',
          contentType: file?.type || 'application/pdf',
        });
      if (uploadErr) throw uploadErr;

      const storagePath = uploadData?.path || key;

      // Create application via canonical RPC so all server-side rules apply
      const { error: applyError } = await supabase.rpc('job_apply', {
        p_job_id: jobId,
        p_resume_path: storagePath,
        p_cover_letter: note || null,
      });

      if (applyError) {
        const code = applyError.code;
        const msgText = applyError.message || '';

        if (code === '23505' || /already applied/i.test(msgText)) {
          throw new Error('You have already applied to this role. Check My applications for your status.');
        }
        if (code === '42501' || /not fully approved|not allowed|forbidden|Only alumni and students/i.test(msgText)) {
          throw new Error('You do not have access to apply to this job.');
        }
        if (/Job is not open for applications|closed|inactive|deadline/i.test(msgText)) {
          throw new Error('Applications are closed for this role.');
        }

        throw new Error(msgText || 'We could not submit your application. Please try again.');
      }

      if (onSuccess) onSuccess({ path: storagePath });
      logActivity({ action: 'job_application', meta: { job_id: jobId } }).catch(() => {});
      toast.success('Your application has been submitted successfully.', { id: toastId });
      onClose();
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'We could not submit your application. Please try again.'), { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 ${open ? 'flex' : 'hidden'} items-center justify-center`} role="dialog" aria-modal="true" aria-labelledby="apply-dialog-title" onKeyDown={handleKeyDown}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close apply dialog" />
      <div ref={dialogRef} className="relative z-10 w-full max-w-md bg-white rounded-xl shadow-xl p-6">
        <h3 id="apply-dialog-title" className="text-lg font-semibold mb-4">Apply for this role</h3>
        {deadline && (
          <div className="text-xs text-gray-500 mb-2">Apply by {formatKolkata(deadline)} (local time)</div>
        )}
        {deadlinePassed && (
          <div className="mb-3 p-2 rounded bg-red-50 text-red-600 border border-red-200 text-sm">Applications are closed for this role.</div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Resume (PDF, DOC, or DOCX)</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                if (!f) { setFile(null); return; }
                if (f.size > MAX_SIZE) { toast.error('Your file is too large (max 3 MB). Please upload a smaller resume.'); e.target.value=''; setFile(null); return; }
                const ext = (f.name.split('.').pop() || '').toLowerCase();
                if (!['pdf','doc','docx'].includes(ext)) { toast.error('Unsupported file type. Upload a PDF, DOC, or DOCX resume.'); e.target.value=''; setFile(null); return; }
                if (!/(pdf|msword|officedocument\.wordprocessingml\.document)$/i.test(f.type || '')) { toast.error('Only PDF, DOC, or DOCX files are allowed.'); e.target.value=''; setFile(null); return; }
                setFile(f);
              }}
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              required
            />
            {submitting && (
              <div className="mt-2 text-xs text-gray-500" aria-live="polite">Uploading and submitting…</div>
            )}
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
            <textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Write a short note to the employer (optional)."
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2" aria-label="Cancel and close apply dialog">Cancel</button>
            <button type="submit" disabled={submitting || deadlinePassed} className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2" aria-label="Submit application">
              {submitting ? 'Submitting application...' : 'Submit application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
