/**
 * @fileoverview Job service - centralized API for all job operations
 * Uses RPCs instead of direct DB writes for security
 */

import { supabase } from '../utils/supabase';
import { mapJobError, isRetryableError } from '../utils/jobErrors';
import { sanitizeUrl, sanitizeText } from '../utils/sanitize';
import logger from '../utils/logger';

/**
 * Fetches job alerts for a user with error mapping
 * @param {string} userId - Authenticated user ID
 * @returns {Promise<{ success: boolean, data?: object[], error?: string }>}
 */
export async function fetchJobAlerts(userId) {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    const { data, error } = await supabase
      .from('job_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('fetchJobAlerts error:', error);
      return { success: false, error: mapJobError(error) };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    logger.error('fetchJobAlerts exception:', err);
    return { success: false, error: mapJobError(err) };
  }
}

/**
 * Creates a new job using validated RPC
 * @param {object} jobData - Job data to create
 * @returns {Promise<{ success: boolean, job_id?: string, error?: string }>}
 */
export async function createJob(jobData) {
  try {
    // Sanitize URLs before sending
    const applicationUrl = jobData.application_url 
      ? sanitizeUrl(jobData.application_url, ['http', 'https', 'mailto'])
      : { valid: true, url: null };
    
    if (!applicationUrl.valid) {
      return { success: false, error: applicationUrl.error };
    }
    
    // Prepare payload
    const payload = {
      title: sanitizeText(jobData.title),
      company_name: sanitizeText(jobData.company_name),
      location: sanitizeText(jobData.location),
      job_type: jobData.job_type,
      description: sanitizeText(jobData.description),
      requirements: sanitizeText(jobData.requirements),
      salary_range: jobData.salary_range,
      salary_min: jobData.salary_min ? parseInt(jobData.salary_min, 10) : null,
      salary_max: jobData.salary_max ? parseInt(jobData.salary_max, 10) : null,
      application_url: applicationUrl.url,
      deadline: jobData.deadline,
      skills: Array.isArray(jobData.skills) 
        ? jobData.skills.map(s => sanitizeText(s)).filter(Boolean)
        : null,
      education_requirements: jobData.education_requirements,
      contact_name: sanitizeText(jobData.contact_name),
      contact_email: jobData.contact_email,
      contact_phone: jobData.contact_phone,
      logo_url: jobData.logo_url,
    };
    
    const { data, error } = await supabase.rpc('create_job_validated', {
      p_job_data: payload,
    });
    
    if (error) {
      logger.error('createJob RPC error:', error);
      return { success: false, error: mapJobError(error) };
    }
    
    // RPC returns jsonb with success/error
    if (data && typeof data === 'object') {
      return data;
    }
    
    return { success: false, error: 'Unexpected response from server' };
  } catch (err) {
    logger.error('createJob exception:', err);
    return { success: false, error: mapJobError(err) };
  }
}

/**
 * Updates an existing job using validated RPC
 * @param {string} jobId - Job ID to update
 * @param {object} jobData - Job data to update
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function updateJob(jobId, jobData) {
  try {
    if (!jobId) {
      return { success: false, error: 'Job ID is required' };
    }
    
    // Sanitize URLs before sending
    if (jobData.application_url !== undefined) {
      const applicationUrl = sanitizeUrl(jobData.application_url, ['http', 'https', 'mailto']);
      if (!applicationUrl.valid) {
        return { success: false, error: applicationUrl.error };
      }
      jobData.application_url = applicationUrl.url;
    }
    
    // Prepare payload - only include fields that are being updated
    const payload = {};
    
    if (jobData.title !== undefined) payload.title = sanitizeText(jobData.title);
    if (jobData.company_name !== undefined) payload.company_name = sanitizeText(jobData.company_name);
    if (jobData.location !== undefined) payload.location = sanitizeText(jobData.location);
    if (jobData.job_type !== undefined) payload.job_type = jobData.job_type;
    if (jobData.description !== undefined) payload.description = sanitizeText(jobData.description);
    if (jobData.requirements !== undefined) payload.requirements = sanitizeText(jobData.requirements);
    if (jobData.salary_range !== undefined) payload.salary_range = jobData.salary_range;
    if (jobData.salary_min !== undefined) payload.salary_min = jobData.salary_min ? parseInt(jobData.salary_min, 10) : null;
    if (jobData.salary_max !== undefined) payload.salary_max = jobData.salary_max ? parseInt(jobData.salary_max, 10) : null;
    if (jobData.application_url !== undefined) payload.application_url = jobData.application_url;
    if (jobData.deadline !== undefined) payload.deadline = jobData.deadline;
    if (jobData.skills !== undefined) {
      payload.skills = Array.isArray(jobData.skills) 
        ? jobData.skills.map(s => sanitizeText(s)).filter(Boolean)
        : null;
    }
    if (jobData.contact_name !== undefined) payload.contact_name = sanitizeText(jobData.contact_name);
    if (jobData.contact_email !== undefined) payload.contact_email = jobData.contact_email;
    if (jobData.contact_phone !== undefined) payload.contact_phone = jobData.contact_phone;
    if (jobData.logo_url !== undefined) payload.logo_url = jobData.logo_url;
    
    const { data, error } = await supabase.rpc('update_job_validated', {
      p_job_id: jobId,
      p_job_data: payload,
    });
    
    if (error) {
      logger.error('updateJob RPC error:', error);
      return { success: false, error: mapJobError(error) };
    }
    
    if (data && typeof data === 'object') {
      return data;
    }
    
    return { success: false, error: 'Unexpected response from server' };
  } catch (err) {
    logger.error('updateJob exception:', err);
    return { success: false, error: mapJobError(err) };
  }
}

/**
 * Toggles job visibility (pause/resume) using RPC
 * @param {string} jobId - Job ID
 * @param {boolean} isActive - Whether to activate or deactivate
 * @returns {Promise<{ success: boolean, is_active?: boolean, error?: string }>}
 */
export async function toggleJobVisibility(jobId, isActive) {
  try {
    if (!jobId) {
      return { success: false, error: 'Job ID is required' };
    }
    
    const { data, error } = await supabase.rpc('toggle_job_visibility', {
      p_job_id: jobId,
      p_is_active: isActive,
    });
    
    if (error) {
      logger.error('toggleJobVisibility RPC error:', error);
      return { success: false, error: mapJobError(error) };
    }
    
    if (data && typeof data === 'object') {
      return data;
    }
    
    return { success: false, error: 'Unexpected response from server' };
  } catch (err) {
    logger.error('toggleJobVisibility exception:', err);
    return { success: false, error: mapJobError(err) };
  }
}

/**
 * Fetches job listings with proper error handling
 * @param {object} options - Query options
 * @returns {Promise<{ data: object[], total: number, error?: string }>}
 */
export async function fetchJobs(options = {}) {
  const {
    searchQuery = null,
    sortBy = 'created_at',
    sortOrder = 'desc',
    limit = 12,
    offset = 0,
    jobType = null,
    experienceLevel = null,
    location = null,
    salaryMin = null,
    salaryMax = null,
    postedSinceDays = null,
    matchMyEducation = false,
  } = options;
  
  try {
    let rpcName = 'get_jobs_public_v5';
    let params = {
      p_search_query: searchQuery,
      p_sort_by: sortBy,
      p_sort_order: sortOrder,
      p_limit: limit,
      p_offset: offset,
      p_job_type: jobType !== 'all' ? jobType : null,
      p_experience_level: experienceLevel !== 'all' ? experienceLevel : null,
      p_location: location,
      p_salary_min: salaryMin,
      p_salary_max: salaryMax,
      p_posted_since_days: postedSinceDays,
    };
    
    // Use education-matching RPC if requested
    if (matchMyEducation) {
      rpcName = 'search_jobs_with_education';
      params = {
        p_search_query: searchQuery,
        p_sort_by: sortBy,
        p_sort_order: sortOrder,
        p_limit: limit,
        p_offset: offset,
        p_job_type: jobType !== 'all' ? jobType : null,
        p_experience_level: experienceLevel !== 'all' ? experienceLevel : null,
        p_salary_min: salaryMin,
        p_salary_max: salaryMax,
        p_posted_since_days: postedSinceDays,
        p_match_my_education: true,
      };
    }
    
    const { data, error } = await supabase.rpc(rpcName, params);
    
    if (error) {
      logger.error('fetchJobs RPC error:', error);
      return { data: [], total: 0, error: mapJobError(error) };
    }
    
    const items = Array.isArray(data)
      ? data
      : Array.isArray(data?.items)
        ? data.items
        : [];
    const total = typeof data?.total_count === 'number'
      ? data.total_count
      : (items.length > 0 ? (items[0]?.total_count || items.length) : 0);
    
    return { data: items, total, error: null };
  } catch (err) {
    logger.error('fetchJobs exception:', err);
    return { data: [], total: 0, error: mapJobError(err) };
  }
}

/**
 * Fetches a single job by ID
 * @param {string} jobId - Job ID
 * @returns {Promise<{ data: object|null, error?: string }>}
 */
export async function fetchJobById(jobId) {
  try {
    if (!jobId) {
      return { data: null, error: 'Job ID is required' };
    }
    
    const { data, error } = await supabase.rpc('get_job_details', {
      p_id: jobId,
    });
    
    if (error) {
      logger.error('fetchJobById RPC error:', error);
      return { data: null, error: mapJobError(error) };
    }
    
    return { data, error: null };
  } catch (err) {
    logger.error('fetchJobById exception:', err);
    return { data: null, error: mapJobError(err) };
  }
}

/**
 * Fetches job for editing (owner/admin only)
 * @param {string} jobId - Job ID
 * @returns {Promise<{ data: object|null, error?: string }>}
 */
export async function fetchJobForEdit(jobId) {
  try {
    if (!jobId) {
      return { data: null, error: 'Job ID is required' };
    }
    
    const { data, error } = await supabase.rpc('get_job_for_edit', {
      p_job_id: jobId,
    });
    
    if (error) {
      logger.error('fetchJobForEdit RPC error:', error);
      return { data: null, error: mapJobError(error) };
    }
    
    return { data, error: null };
  } catch (err) {
    logger.error('fetchJobForEdit exception:', err);
    return { data: null, error: mapJobError(err) };
  }
}

/**
 * Creates a job alert with rate limiting
 * @param {object} alertData - Alert configuration
 * @returns {Promise<{ success: boolean, alert_id?: string, error?: string }>}
 */
export async function createJobAlert(alertData) {
  try {
    const { data, error } = await supabase.rpc('create_job_alert', {
      p_alert_name: sanitizeText(alertData.alert_name),
      p_keywords: alertData.keywords?.map(k => sanitizeText(k)).filter(Boolean) || null,
      p_location: sanitizeText(alertData.location),
      p_job_type: alertData.job_type,
      p_experience_level: alertData.experience_level,
      p_min_salary: alertData.min_salary ? parseInt(alertData.min_salary, 10) : null,
      p_max_salary: alertData.max_salary ? parseInt(alertData.max_salary, 10) : null,
      p_frequency: alertData.frequency || 'weekly',
      p_is_active: alertData.is_active !== false,
    });
    
    if (error) {
      logger.error('createJobAlert RPC error:', error);
      return { success: false, error: mapJobError(error) };
    }
    
    if (data && typeof data === 'object') {
      return { success: true, alert_id: data.alert_id };
    }
    
    return { success: false, error: 'Unexpected response from server' };
  } catch (err) {
    logger.error('createJobAlert exception:', err);
    return { success: false, error: mapJobError(err) };
  }
}

/**
 * Updates a job alert
 * @param {string} alertId - Alert ID
 * @param {object} alertData - Alert data to update
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function updateJobAlert(alertId, alertData) {
  try {
    if (!alertId) {
      return { success: false, error: 'Alert ID is required' };
    }
    
    const { error } = await supabase.rpc('update_job_alert', {
      p_id: alertId,
      p_alert_name: alertData.alert_name ? sanitizeText(alertData.alert_name) : null,
      p_keywords: alertData.keywords?.map(k => sanitizeText(k)).filter(Boolean) || null,
      p_location: alertData.location ? sanitizeText(alertData.location) : null,
      p_job_type: alertData.job_type || null,
      p_experience_level: alertData.experience_level || null,
      p_min_salary: alertData.min_salary ? parseInt(alertData.min_salary, 10) : null,
      p_max_salary: alertData.max_salary ? parseInt(alertData.max_salary, 10) : null,
      p_frequency: alertData.frequency || null,
      p_is_active: alertData.is_active,
    });
    
    if (error) {
      logger.error('updateJobAlert RPC error:', error);
      return { success: false, error: mapJobError(error) };
    }
    
    return { success: true };
  } catch (err) {
    logger.error('updateJobAlert exception:', err);
    return { success: false, error: mapJobError(err) };
  }
}

/**
 * Deletes a job alert
 * @param {string} alertId - Alert ID
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function deleteJobAlert(alertId) {
  try {
    if (!alertId) {
      return { success: false, error: 'Alert ID is required' };
    }
    
    const { error } = await supabase.rpc('delete_job_alert', {
      p_id: alertId,
    });
    
    if (error) {
      logger.error('deleteJobAlert RPC error:', error);
      return { success: false, error: mapJobError(error) };
    }
    
    return { success: true };
  } catch (err) {
    logger.error('deleteJobAlert exception:', err);
    return { success: false, error: mapJobError(err) };
  }
}

/**
 * Applies to a job
 * @param {string} jobId - Job ID
 * @param {string} resumePath - Path to uploaded resume
 * @param {string} coverLetter - Optional cover letter
 * @returns {Promise<{ success: boolean, application_id?: string, error?: string }>}
 */
export async function applyToJob(jobId, resumePath, coverLetter = null) {
  try {
    if (!jobId) {
      return { success: false, error: 'Job ID is required' };
    }
    
    if (!resumePath) {
      return { success: false, error: 'Resume is required' };
    }
    
    const { data, error } = await supabase.rpc('job_apply', {
      p_job_id: jobId,
      p_resume_path: resumePath,
      p_cover_letter: coverLetter ? sanitizeText(coverLetter) : null,
    });
    
    if (error) {
      logger.error('applyToJob RPC error:', error);
      return { success: false, error: mapJobError(error) };
    }
    
    return { success: true, application_id: data };
  } catch (err) {
    logger.error('applyToJob exception:', err);
    return { success: false, error: mapJobError(err) };
  }
}

export default {
  createJob,
  updateJob,
  toggleJobVisibility,
  fetchJobs,
  fetchJobById,
  fetchJobForEdit,
  fetchJobAlerts,
  createJobAlert,
  updateJobAlert,
  deleteJobAlert,
  applyToJob,
};
