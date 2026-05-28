// frontend/src/utils/applicants.js
import { isInternal } from './jobs';

export function getApplicantsCount(job) {
  // Only show for in_app; hide entirely for quick_link
  if (!isInternal(job)) return null;
  const n = job?.applicant_count;
  return (typeof n === 'number' && n >= 0) ? n : null;
}
