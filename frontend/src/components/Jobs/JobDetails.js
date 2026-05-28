import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import toast from 'react-hot-toast';
import logger from '../../utils/logger';
import { 
  MapPinIcon,
  BriefcaseIcon,
  CurrencyRupeeIcon,
  ClockIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  UserGroupIcon,
  BookmarkIcon as BookmarkIconOutline,
  ShareIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  PhoneIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkIconSolid } from '@heroicons/react/24/solid';
// REMOVED: JobApplicationForm - legacy direct-insert component, use ApplyDialog via JobDetailsInApp instead
import { useAuth } from '../../contexts/AuthContext';
import EmployerGuard from '../Auth/EmployerGuard';
import { coalesceAppUrl, isQuickLink, getJobLogoUrl, getJobCompanyName } from '../../utils/jobs';
import { toggleBookmarkRPC } from '../../utils/bookmarks';
import JobDetailsQuickLink from './JobDetailsQuickLink';
import JobDetailsInApp from './JobDetailsInApp';

// Helper function to safely convert string data to arrays
const convertToArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'string') {
    if (data.includes(',')) return data.split(',').map(item => item.trim());
    if (data.includes('|')) return data.split('|').map(item => item.trim());
    if (data.includes(';')) return data.split(';').map(item => item.trim());
    return [data];
  }
  return [];
};

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const { user, profile, getUserRole } = useAuth();
  const [bookmarking, setBookmarking] = useState(false); // For loading state of bookmark action
  const [sharing, setSharing] = useState(false); // For loading state of share action
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  


  // Fetch job data from Supabase
  useEffect(() => {
    const fetchJobDetails = async () => {
      if (!isMountedRef.current) return;
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .rpc('get_job_details', { p_id: id });

        if (error) throw error;

        const row = Array.isArray(data) ? data[0] : data;
        // Fallback: fetch contact + logo directly from jobs if RPC omits
        let contact = {};
        let logoExtras = {};
        try {
          const { data: contactRow } = await supabase
            .from('jobs')
            .select('contact_name, contact_email, contact_phone, logo_url')
            .eq('id', id)
            .maybeSingle();
          if (contactRow) {
            contact = {
              contact_name: contactRow.contact_name,
              contact_email: contactRow.contact_email,
              contact_phone: contactRow.contact_phone,
            };
            logoExtras = {
              logo_url: contactRow.logo_url || null,
            };
          }
        } catch (_) { /* ignore */ }

        if (row) {
          // Process data to ensure arrays and new RPC fields are handled properly
          const processedData = {
            ...row,
            ...contact,
            ...logoExtras,
            // New/normalized fields from get_job_details
            location: row.location ?? null,
            job_type: row.job_type ?? row.jobType ?? null,
            department: row.department ?? null,
            experience_level: row.experience_level ?? null,
            industry: row.industry ?? null,
            status: row.status ?? null,
            salary_display_inr: row.salary_display_inr ?? row.salaryDisplayInr ?? null,
            // Array conversions
            requirements: convertToArray(row.requirements),
            responsibilities: convertToArray(row.responsibilities),
            preferredQualifications: convertToArray(row.preferredQualifications),
            benefits: convertToArray(row.benefits),
            applicationProcess: convertToArray(row.applicationProcess),
            skills: convertToArray(row.skills),
            companyInfo: row.companyInfo ? {
              ...row.companyInfo,
              values: row.companyInfo?.values ? convertToArray(row.companyInfo.values) : []
            } : null,
            similarJobs: Array.isArray(row.similarJobs) ? row.similarJobs : [],
            logoUrl: (
              logoExtras.logo_url ||
              row.logo_url ||
              row.logoUrl ||
              null
            ) ?? null,
            company_logo_url: row.logo_url || row.logoUrl || null,
          };

          if (isMountedRef.current) {
            setJob(processedData);
            logger.log('Fetched job data:', processedData);
          }
        } else {
          if (isMountedRef.current) {
            setError('Job not found');
          }
          toast.error('Job not found');
        }
      } catch (err) {
        logger.error('Error fetching job details:', err);
        if (isMountedRef.current) {
          setError(err.message || 'Failed to load job details');
        }
        toast.error('Failed to load job details');
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    if (id) {
      fetchJobDetails();
    }
  }, [id]); // Initial fetchJobDetails trigger

  // New useEffect to fetch bookmark status when job and user are available
  useEffect(() => {
    const fetchBookmarkStatus = async () => {
      if (job && job.id && user && user.id) {
        // logger.log(`Fetching bookmark status for job ${job.id} and user ${user.id}`); // For debugging
        try {
          const { data: bookmark, error } = await supabase
            .from('job_bookmarks')
            .select('id')
            .eq('job_id', job.id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (error) {
            logger.error('Error fetching bookmark status:', error.message);
            // toast.error('Could not check bookmark status.');
            return;
          }
          if (isMountedRef.current) {
            setIsBookmarked(!!bookmark);
          }
          // logger.log('Bookmark status set to:', !!bookmark); // For debugging
        } catch (err) {
          logger.error('Exception fetching bookmark status:', err.message);
        }
      }
    };

    fetchBookmarkStatus();
  }, [job, user]); // Runs when job or user state changes

  const handleBookmark = async () => {
    if (!user) {
      toast.error('Please log in to bookmark jobs.');
      // Optionally, navigate to login: navigate('/login');
      return;
    }

    if (!job || !job.id) {
      toast.error('Job details not available to bookmark.');
      return;
    }

    if (!isMountedRef.current) return;
    setBookmarking(true);
    try {
      const nowBookmarked = await toggleBookmarkRPC(supabase, job.id);
      if (isMountedRef.current) {
        setIsBookmarked(nowBookmarked);
      }
      toast.success(nowBookmarked ? 'Job bookmarked!' : 'Bookmark removed!');
    } catch (error) {
      logger.error('Error handling bookmark:', error.message || error);
      toast.error(error.message || 'Failed to update bookmark. Please try again.');
    } finally {
      if (isMountedRef.current) {
        setBookmarking(false);
      }
    }
  };

  const handleShare = async () => {
    if (!job) {
      toast.error('Job details not available to share.');
      return;
    }
    const companyName = getJobCompanyName(job) || job.company || 'our company';
    if (navigator.share) {
      if (!isMountedRef.current) return;
      setSharing(true);
      try {
        await navigator.share({
          title: `${job.title} at ${companyName}`,
          text: `Check out this job opportunity: ${job.title} at ${companyName}`,
          url: window.location.href
        });
        // logger.log('Shared successfully'); // Optional: log success
      } catch (error) {
        if (error.name === 'AbortError') {
          logger.log('Share canceled by user.'); // Not an actual error, user dismissed UI
          // toast.info('Share canceled.'); // Optional: inform user
        } else {
          logger.error('Error sharing:', error);
          toast.error('Could not share. Please try again.');
        }
      } finally {
        if (isMountedRef.current) {
          setSharing(false);
        }
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      } catch (err) {
        logger.error('Failed to copy link:', err);
        toast.error('Could not copy link.');
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-100 min-h-screen flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-ocean-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading job details...</h2>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="bg-gray-100 min-h-screen flex items-center justify-center py-12">
        <div className="text-center max-w-md mx-auto glass-card p-8 rounded-lg shadow-lg">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Job</h2>
          <p className="text-gray-600 mb-6">{error || 'Job not found'}</p>
          <Link to="/jobs" className="bg-ocean-600 hover:bg-ocean-700 text-white px-6 py-3 rounded-md inline-block">
            Return to Jobs
          </Link>
        </div>
      </div>
    );
  }

  // Compute props and delegate to minimal views
  const userRole = getUserRole();
  const isOwner = !!(
    user?.id &&
    [job?.posted_by, job?.user_id, job?.created_by, job?.employer_id]
      .filter(Boolean)
      .some((ownerId) => ownerId === user.id)
  );
  const isAdminFlag = userRole === 'admin' || userRole === 'super_admin';
  const companyName = getJobCompanyName(job);
  const companyLogo = getJobLogoUrl(job);

  const viewProps = { job, companyName, companyLogo, isOwner, isAdmin: isAdminFlag };
  if (isQuickLink(job)) return <JobDetailsQuickLink {...viewProps} />;
  return <JobDetailsInApp {...viewProps} />;
};

export default JobDetails;