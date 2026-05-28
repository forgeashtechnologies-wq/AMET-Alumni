import React, { useEffect } from 'react';
import SupportPageHeader from '../components/common/SupportPageHeader';

const PrivacyPolicy = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-ocean-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <SupportPageHeader hideBackWhenFromRegistration />

        <div className="bg-white shadow-xl rounded-2xl p-6 md:p-10">
          <h1 className="text-3xl font-bold mb-6 text-center">Alumni Policy</h1>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Title of the Policy</h2>
            <p className="text-gray-700 leading-relaxed">Alumni Policy</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Policy Reference Number</h2>
            <p className="text-gray-700 leading-relaxed">AMET/AP/2025/05</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Effective Date / Review Cycle</h2>
            <p className="text-gray-700 leading-relaxed">Academic Year 2025-2026 onwards</p>
            <p className="text-gray-700 leading-relaxed">Review Cycle: Every 3 years or as mandated by statutory bodies</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Prelude / Introduction</h2>
            <p className="text-gray-700 leading-relaxed">
              Alumni are valued stakeholders and lifelong ambassadors of AMET University. This policy aims to nurture and strengthen the relationship between the University and its alumni by creating a structured framework for continuous engagement, collaboration, and contribution. Alumni are an integral part of the University's growth and play a vital role in mentoring, placements, research, social outreach, and institutional development.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Scope and Applicability</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Applicable to all graduates of AMET University across undergraduate, postgraduate, diploma, and doctoral programs.</li>
              <li>Extends to alumni chapters (regional, national, and international).</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Vision, Mission & Quality Policy of the University</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li><strong>Vision:</strong> To build a vibrant, global alumni community that contributes to the University's progress and reputation.</li>
              <li><strong>Mission:</strong> To engage alumni meaningfully through mentorship, networking, placements, research collaboration, and voluntary contributions.</li>
              <li><strong>Quality Policy:</strong> Ensure transparent, inclusive, and sustainable alumni engagement for mutual benefit.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Objectives of the Policy</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Create and maintain a dynamic alumni database.</li>
              <li>Encourage alumni involvement in academics, placements, and career development.</li>
              <li>Establish global alumni chapters to strengthen outreach.</li>
              <li>Facilitate financial and non-financial contributions to university initiatives.</li>
              <li>Recognize and celebrate alumni achievements and contributions.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Guiding Principles</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li><strong>Lifelong Bond:</strong> Alumni remain connected to AMET beyond graduation.</li>
              <li><strong>Mutual Growth:</strong> Alumni benefit from networking while the University benefits from their expertise and support.</li>
              <li><strong>Transparency:</strong> Contributions and collaborations are acknowledged and utilized responsibly.</li>
              <li><strong>Inclusivity:</strong> Equal opportunity for all alumni to participate in institutional initiatives.</li>
              <li><strong>Global Outlook:</strong> Promote international alumni networking, especially within the maritime and allied sectors.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Policy Framework (Step-by-Step Process)</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-medium mb-2">A. Alumni Database & Registration</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  <li>Establish and maintain an updated alumni database through the Alumni Relations Cell and online portal.</li>
                  <li>The alumni database is collected while they submit their No-dues forms.</li>
                  <li>Regular data verification and updation.</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-medium mb-2">B. Alumni Association & Chapters</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  <li>Alumni Association registered under statutory guidelines.</li>
                  <li>Creation of regional, national, and international chapters.</li>
                  <li>Alumni Meets are conducted in various locations, and regular meetings are conducted with the nominated office bearers.</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-medium mb-2">C. Alumni Engagement in Academics & Career Development</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  <li>Alumni as guest speakers, mentors, and advisors.</li>
                  <li>Facilitation of internships, placements, and industry linkages.</li>
                  <li>Alumni contributions in curriculum enrichment and skill development programs.</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-medium mb-2">D. Alumni Contributions</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  <li>Voluntary financial contributions, endowments, and sponsorships.</li>
                  <li>Non-financial contributions, including mentoring, networking, equipment donations, and industry linkages.</li>
                  <li>Recognition of contributors through university events and publications.</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-medium mb-2">E. Recognition & Awards</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  <li>Distinguished Alumni Awards for exemplary achievements.</li>
                  <li>Certificates of appreciation for active contributors.</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-medium mb-2">F. Communication & Networking</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  <li>Quarterly alumni newsletter and dedicated alumni web portal.</li>
                  <li>Social media groups and networking events.</li>
                  <li>Dedicated alumni section in University magazine.</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-medium mb-2">G. Documentation & Reporting</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  <li>Systematic recording of alumni activities, contributions, and meetings.</li>
                  <li>Preparation of an annual alumni activity and impact report for stakeholders.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Roles and Responsibilities</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li><strong>Alumni Relations Cell:</strong> Coordination, communication, and record-keeping.</li>
              <li><strong>Director-Alumni Relations:</strong> Oversight of alumni-related initiatives.</li>
              <li><strong>Heads of Departments:</strong> Facilitate alumni interaction in academics and industry linkages.</li>
              <li><strong>Registrar:</strong> Maintenance of official alumni records.</li>
              <li><strong>Alumni Members:</strong> Active participation in mentoring, networking, and supporting university initiatives.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Feedback, Review & Revision Mechanism</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Annual alumni feedback survey to improve engagement initiatives.</li>
              <li>Policy reviewed once every 3 years by the Alumni Relations Cell in consultation with the University management.</li>
              <li>Updates made in line with alumni needs and emerging best practices.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Approval and Authority</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Approved by the Academic Council and Board of Management.</li>
              <li>Authority vested with the Vice-Chancellor and Alumni Relations Cell for implementation.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. References</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>UGC Guidelines on Alumni Engagement.</li>
              <li>AICTE Quality Mandates.</li>
              <li>Best practices of higher education institutions and industry-linked universities.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
