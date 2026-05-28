import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo';
const AboutPage = () => {
  useEffect(() => {
    // Ensure About page always starts at the top when navigated to
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  }, []);
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-ocean-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-ocean-700 hover:bg-ocean-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
            <span className="text-sm font-medium">Back</span>
          </button>
          <a href="/" target="_self" className="inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2" aria-label="AMET Alumni Home">
            <Logo className="h-8 w-auto" />
            <span className="text-lg font-semibold text-gray-900">AMET Alumni</span>
          </a>
        </div>

        <div className="bg-white shadow-xl rounded-2xl p-6 md:p-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">AMET Alumni Association</h1>
          <div className="prose prose-lg max-w-none text-gray-700">
            <p className="text-lg leading-relaxed mb-6">
              The AMET Alumni Association (A3) is a registered body under the Tamil Nadu Societies Registration Act (1975), formally certified on 6th October 2015. Conceived by the Founder Chancellor Dr. J. Ramachandran in 2008, the Association has now grown into a strong network of over 15,000 registered alumni worldwide, acting as a bridge between alumni, students, and the university management.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Objectives</h2>
            <p className="mb-4">The Association is dedicated to:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
              <li>Strengthening alumni engagement with their Alma Mater.</li>
              <li>Providing scholarships, awards, and career guidance for students.</li>
              <li>Supporting the academic, cultural, and extracurricular growth of AMET.</li>
              <li>Encouraging fellowship, professional collaboration, and knowledge-sharing among alumni.</li>
              <li>Raising funds, endowments, and student welfare initiatives.</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Key Activities</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
              <li><strong>Alumni Guest Lectures:</strong> Alumni regularly deliver sessions on maritime skills, industry trends, and career guidance, helping students gain real-world insights.</li>
              <li><strong>Alumni Meets:</strong> The Association organizes Alumni Meets in different cities and on campus, fostering networking, mentoring, and reconnecting.</li>
              <li><strong>Board of Studies (BOS):</strong> Alumni actively participate in BOS meetings, contributing their industry expertise to strengthen AMET's curriculum.</li>
              <li><strong>Alumni Database Maintenance:</strong> A structured alumni database and portal (A3) is maintained to keep alumni connected, track achievements, and enable collaboration.</li>
              <li><strong>Job Postings & Opportunities:</strong> Alumni share job openings, internships, and placement opportunities through the Alumni Association, helping students and fresh graduates enter the global maritime workforce.</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Contributions & Social Impact</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
              <li><strong>Student Mentorship:</strong> Alumni conduct structured mentorship programs to guide and support students in their academic growth and career development.</li>
              <li><strong>Career Development:</strong> With many alumni in prestigious global positions, they actively create pathways for student placements and internships.</li>
              <li><strong>Support to Alma Mater:</strong> Many alumni are extending financial and moral support to the University.</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Legacy</h2>
            <p>
              The AMET Alumni Association continues to symbolize fellowship, mentorship, and service. By nurturing industry connections, guiding students, and upholding the values of AMET, it plays a vital role in the growth, reputation, and global reach of the institution.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
