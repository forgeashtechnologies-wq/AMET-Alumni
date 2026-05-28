import logger from './logger';
// Helper functions for sharing content

/**
 * Share a job listing using the Web Share API if available, 
 * otherwise fall back to clipboard copy
 * @param {object} job - The job object to share
 */
export async function shareJob(job) {
  const url = `${window.location.origin}/jobs/${job.id}`;
  const title = `${job.title}${job.company_name ? ' — ' + job.company_name : ''}`;
  
  try {
    if (navigator.share) {
      await navigator.share({ title, url });
    } else {
      await navigator.clipboard.writeText(url);
      // You can optionally call a toast notification here
      // toast.success('URL copied to clipboard!');
    }
  } catch (e) { 
    logger.error('Error sharing job:', e); 
  }
}
