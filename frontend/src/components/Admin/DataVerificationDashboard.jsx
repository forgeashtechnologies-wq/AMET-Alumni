import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '../../utils/supabase';

const Section = ({ title, children, actions }) => (
  <div className="glass-card rounded-lg p-6">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {actions}
    </div>
    {children}
  </div>
);

const Table = ({ columns, rows, empty = 'No rows' }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          {columns.map((c) => (
            <th key={c.key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {rows.length === 0 ? (
          <tr><td className="px-4 py-3 text-sm text-gray-500" colSpan={columns.length}>{empty}</td></tr>
        ) : rows.map((r, idx) => (
          <tr key={idx}>
            {columns.map((c) => (
              <td key={c.key} className="px-4 py-2 text-sm text-gray-700">{c.render ? c.render(r) : String(r[c.key] ?? '')}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default function DataVerificationDashboard() {
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [jobsResp, appsResp, compsResp] = await Promise.all([
        supabase.from('jobs').select('id,title,created_by,posted_by,company_id,is_active,is_approved,deadline,application_url,apply_url,external_url,created_at,updated_at').limit(200),
        supabase.from('job_applications').select('id,job_id,applicant_id,status,resume_url,created_at').limit(200),
        supabase.from('companies').select('id,name,created_by').limit(200)
      ]);
      if (jobsResp.error) throw jobsResp.error;
      if (appsResp.error) throw appsResp.error;
      if (compsResp.error) throw compsResp.error;
      setJobs(jobsResp.data || []);
      setApplications(appsResp.data || []);
      setCompanies(compsResp.data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const companyMap = useMemo(() => {
    const m = new Map();
    companies.forEach(c => m.set(c.id, c));
    return m;
  }, [companies]);

  // Jobs checks
  const jobIssues = useMemo(() => {
    const now = Date.now();
    return jobs.map(j => {
      const urlFlags = [j.application_url, j.apply_url, j.external_url].filter(Boolean).length;
      const deadlineTs = j.deadline ? new Date(j.deadline).getTime() : null;
      return {
        id: j.id,
        title: j.title,
        created_by: j.created_by,
        posted_by: j.posted_by,
        company_id: j.company_id,
        company_owner: j.company_id ? (companyMap.get(j.company_id)?.created_by || null) : null,
        is_active: j.is_active,
        is_approved: j.is_approved,
        deadline: j.deadline,
        url_fields: urlFlags,
        missing_created_by: !j.created_by,
        url_exclusive_violation: urlFlags > 1,
        deadline_past_active_approved: Boolean(j.is_active && j.is_approved && deadlineTs && deadlineTs < now),
      };
    });
  }, [jobs, companyMap]);

  const jobIssueRows = useMemo(() => jobIssues.filter(i => i.missing_created_by || i.url_exclusive_violation || i.deadline_past_active_approved), [jobIssues]);

  // Applications checks (resume_url presence; best-effort join to job type)
  const jobById = useMemo(() => {
    const m = new Map();
    jobs.forEach(j => m.set(j.id, j));
    return m;
  }, [jobs]);

  const appIssues = useMemo(() => {
    return applications.map(a => {
      const j = jobById.get(a.job_id);
      const isQuick = j ? Boolean(j.application_url || j.apply_url || j.external_url) : null;
      const needsResume = (isQuick === false); // in-app requires resume
      return {
        id: a.id,
        job_id: a.job_id,
        applicant_id: a.applicant_id,
        status: a.status,
        resume_url: a.resume_url,
        resume_missing_for_inapp: needsResume && !a.resume_url,
        created_at: a.created_at,
      };
    });
  }, [applications, jobById]);

  const appIssueRows = useMemo(() => appIssues.filter(i => i.resume_missing_for_inapp), [appIssues]);

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin: Data Verification</h1>
            <p className="text-gray-600">Read-only checks for Jobs, Applications, and Companies</p>
          </div>
          <button onClick={fetchAll} disabled={loading} className="btn-ocean px-4 py-2 rounded-lg">{loading ? 'Refreshing…' : 'Refresh'}</button>
        </div>
        {error && <div className="mt-3 p-3 rounded bg-red-50 text-red-700 border border-red-200 text-sm">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="glass-card rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-ocean-600">{jobs.length}</div>
            <div className="text-sm text-gray-600">Jobs (sample)</div>
          </div>
          <div className="glass-card rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{applications.length}</div>
            <div className="text-sm text-gray-600">Applications (sample)</div>
          </div>
          <div className="glass-card rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{companies.length}</div>
            <div className="text-sm text-gray-600">Companies (sample)</div>
          </div>
        </div>
      </div>

      <Section title="Jobs: Issues">
        <Table
          columns={[
            { key: 'id', label: 'Job ID' },
            { key: 'title', label: 'Title' },
            { key: 'created_by', label: 'Created By' },
            { key: 'posted_by', label: 'Posted By' },
            { key: 'company_id', label: 'Company' },
            { key: 'company_owner', label: 'Company Owner' },
            { key: 'is_active', label: 'Active' },
            { key: 'is_approved', label: 'Approved' },
            { key: 'deadline', label: 'Deadline' },
            { key: 'url_fields', label: 'URL Fields' },
            { key: 'missing_created_by', label: 'Missing created_by' },
            { key: 'url_exclusive_violation', label: '>1 URL set' },
            { key: 'deadline_past_active_approved', label: 'Past deadline & visible' },
          ]}
          rows={jobIssueRows}
          empty="No issues detected in sampled jobs"
        />
      </Section>

      <Section title="Applications: Issues">
        <Table
          columns={[
            { key: 'id', label: 'Application ID' },
            { key: 'job_id', label: 'Job ID' },
            { key: 'applicant_id', label: 'Applicant' },
            { key: 'status', label: 'Status' },
            { key: 'resume_url', label: 'Resume URL' },
            { key: 'created_at', label: 'Applied' },
            { key: 'resume_missing_for_inapp', label: 'Missing resume (in-app)' },
          ]}
          rows={appIssueRows}
          empty="No issues detected in sampled applications"
        />
      </Section>

      <Section title="Companies (sample)">
        <Table
          columns={[
            { key: 'id', label: 'Company ID' },
            { key: 'name', label: 'Name' },
            { key: 'created_by', label: 'Created By' },
          ]}
          rows={companies}
          empty="No companies in sample"
        />
      </Section>
    </div>
  );
}
