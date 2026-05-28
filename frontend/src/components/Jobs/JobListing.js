import React from 'react';
import PropTypes from 'prop-types';
import ImageWithFallback from '../common/ImageWithFallback';
import { getJobLogoUrl, getJobCompanyName } from '../../utils/jobs';

const JobListing = ({ job }) => {
  if (!job) {
    return null;
  }

  const { title, location, description } = job;
  const companyName = getJobCompanyName(job) || job.company || '';
  const companyLogo = getJobLogoUrl(job) || job.company_logo || '';

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-4 flex items-start">
      <div className="w-16 h-16 mr-6 rounded-md overflow-hidden bg-gray-100">
        <ImageWithFallback
          src={companyLogo}
          alt={`${companyName || 'Company'} logo`}
          className="w-16 h-16"
          placeholderSrc="/default-avatar.svg"
          emptyMessage="Employer logo to be uploaded"
        />
      </div>
      <div>
        <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        <p className="text-md text-gray-600">{companyName}</p>
        <p className="text-sm text-gray-500 mb-2">{location}</p>
        <p className="text-gray-700">{description}</p>
        <button className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Apply Now
        </button>
      </div>
    </div>
  );
};

JobListing.propTypes = {
  job: PropTypes.shape({
    title: PropTypes.string.isRequired,
    company: PropTypes.string.isRequired,
    location: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    company_logo: PropTypes.string,
  }).isRequired,
};

export default JobListing;
