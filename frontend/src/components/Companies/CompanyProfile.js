import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { BuildingOffice2Icon, MapPinIcon, LinkIcon, BriefcaseIcon, CheckBadgeIcon, PencilIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import EmployerGuard from '../Auth/EmployerGuard';
import LoadingScreen from '../common/LoadingScreen';
import ImageWithFallback from '../common/ImageWithFallback';
import logger from '../../utils/logger';

const CompanyProfile = () => {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        setLoading(true);
        // Fetch company details
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', id)
          .single();

        if (companyError) throw companyError;
        setCompany(companyData);
        
        // Check if the logged-in user is the company owner
        if (user && companyData) {
          setIsOwner(companyData.user_id === user.id);
        }

        // Fetch active jobs for the company
        const { data: jobsData, error: jobsError } = await supabase
          .from('jobs')
          .select('*')
          .eq('company_id', id)
          .eq('is_active', true)
          .eq('is_approved', true)
          .order('created_at', { ascending: false });

        if (jobsError) throw jobsError;
        setJobs(jobsData);

      } catch (err) {
        logger.error('Error fetching company data:', err);
        setError('Failed to load company profile. Please try again later.');
        toast.error('Could not load company details.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCompanyData();
    }
  }, [id]);

  if (loading) {
    return <div className="text-center p-10">Loading company profile...</div>;
  }

  if (error) {
    return <div className="text-center p-10 text-red-500">{error}</div>;
  }

  if (!company) {
    return <div className="text-center p-10">Company not found.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Company Header */}
      <div className="glass-card rounded-lg p-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="w-24 h-24 rounded-lg overflow-hidden border bg-white shadow-md">
            <ImageWithFallback
              src={company.logo_url}
              alt={`${company.name} logo`}
              className="w-24 h-24"
              placeholderSrc="/default-avatar.svg"
              emptyMessage="Employer logo to be uploaded"
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
                {company.is_verified && (
                  <div className="flex items-center gap-1 text-blue-600">
                    <CheckBadgeIcon className="w-6 h-6" />
                    <span className="font-semibold text-sm">Verified Employer</span>
                  </div>
                )}
              </div>
              
              {/* Edit Company Button - Only visible to the owner or admin */}
              <EmployerGuard companyId={id} strict={false}>
                {(isOwner || isAdmin) && (
                  <Link to={`/company/${id}/edit`} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-ocean-600 hover:bg-ocean-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ocean-500">
                    <PencilIcon className="-ml-1 mr-2 h-5 w-5" />
                    Edit Company
                  </Link>
                )}
              </EmployerGuard>
            </div>
            <p className="mt-2 text-gray-600">{company.description || 'No description provided.'}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500">
              {company.location && (
                <div className="flex items-center gap-1.5">
                  <MapPinIcon className="w-4 h-4" />
                  <span>{company.location}</span>
                </div>
              )}
              {company.website_url && (
                <div className="flex items-center gap-1.5">
                  <LinkIcon className="w-4 h-4" />
                  <a href={company.website_url} target="_blank" rel="noopener noreferrer" className="text-ocean-600 hover:underline">
                    Visit Website
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Open Positions */}
      <div className="glass-card rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <BriefcaseIcon className="w-6 h-6 text-ocean-500" />
            <span>Open Positions ({jobs.length})</span>
          </h2>
          
          {/* Post Job Button - Only visible to the company owner or admin */}
          <EmployerGuard companyId={id} strict={false}>
            {(isOwner || isAdmin) && (
              <Link to="/jobs/post" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-ocean-600 hover:bg-ocean-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ocean-500">
                Post a Job
              </Link>
            )}
          </EmployerGuard>
        </div>
        <div className="space-y-4">
          {jobs.length > 0 ? (
            jobs.map(job => (
              <div key={job.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <Link to={`/jobs/${job.id}`} className="text-lg font-semibold text-ocean-700 hover:underline">
                      {job.title}
                    </Link>
                    <p className="text-sm text-gray-500">{job.location} • {job.job_type}</p>
                  </div>
                  <Link to={`/jobs/${job.id}`} className="btn-ocean-outline text-sm">
                    View Job
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500">This company has no open positions at the moment.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyProfile;
