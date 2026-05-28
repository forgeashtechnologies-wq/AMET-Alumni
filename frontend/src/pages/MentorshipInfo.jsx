import React from 'react';
import { Link } from 'react-router-dom';
import { InformationCircleIcon, ChatBubbleLeftRightIcon, CheckBadgeIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

const Section = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
    <div className="text-sm text-slate-700 space-y-1.5">{children}</div>
  </section>
);

export default function MentorshipInfo() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <header className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-ocean-50 text-ocean-700 border border-ocean-100">
            <InformationCircleIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-slate-900">Mentorship — How it works</h1>
            <p className="text-slate-600 text-sm">
              A quick guide for alumni and students to find mentors/trainees, send requests, and manage your mentorship journey.
            </p>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <CheckBadgeIcon className="w-5 h-5 text-ocean-600" />
              Roles & visibility
            </div>
            <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
              <li>Mentor: visible in the trainer directory; can receive requests.</li>
              <li>Trainee: can browse mentors and send requests.</li>
              <li>Admins may review/approve mentor visibility based on profile completeness.</li>
            </ul>
          </div>

          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-ocean-600" />
              Core actions
            </div>
            <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
              <li>Find mentors (filters inside Mentorship tabs).</li>
              <li>Send/accept/decline requests.</li>
              <li>Message your mentors/trainees after they’re connected.</li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm space-y-4">
          <Section title="Quick start (students/trainees)">
            <p>1) Open <Link to="/mentorship" className="text-ocean-600 hover:underline">Mentorship</Link> → 2) Go to “Find Trainers” → 3) Open a mentor profile → 4) Send a request with context (goals, availability).</p>
            <p className="text-xs text-slate-600">Tip: Complete your profile first so mentors can learn about you.</p>
          </Section>

          <Section title="Quick start (alumni/mentors)">
            <p>1) Open <Link to="/mentorship" className="text-ocean-600 hover:underline">Mentorship</Link> → 2) In Settings, enable mentor visibility (if available) → 3) Review incoming requests in “Requests” tab → 4) Accept/decline and message trainees.</p>
            <p className="text-xs text-slate-600">Admins may approve mentor visibility before you appear in search.</p>
          </Section>

          <Section title="Tabs inside Mentorship">
            <ul className="list-disc list-inside space-y-1.5">
              <li><span className="font-medium">Find Trainers:</span> browse mentors, view profiles, send requests.</li>
              <li><span className="font-medium">My Trainers / My Trainees:</span> see active relationships and status chips.</li>
              <li><span className="font-medium">Requests:</span> sent/received requests; accept/decline with notes.</li>
              <li><span className="font-medium">Settings:</span> mentor visibility, role preferences (mentor/mentee), and any profile requirements.</li>
            </ul>
          </Section>

          <Section title="Status & approvals">
            <ul className="list-disc list-inside space-y-1.5">
              <li><span className="font-medium">Visibility:</span> Mentors appear in search when marked visible and approved (if required).</li>
              <li><span className="font-medium">Requests:</span> Pending → Accepted/Declined; messaging is best-effort after acceptance.</li>
              <li><span className="font-medium">Profiles:</span> Keep headline and expertise updated for better matches.</li>
            </ul>
          </Section>

          <Section title="Good outreach etiquette">
            <ul className="list-disc list-inside space-y-1.5">
              <li>State your goal (career advice, interview prep, domain mentorship).</li>
              <li>Share availability/time zone; be concise and respectful.</li>
              <li>Follow up politely; avoid spamming multiple mentors at once.</li>
            </ul>
          </Section>

          <Section title="Troubleshooting">
            <ul className="list-disc list-inside space-y-1.5">
              <li>Can’t see mentors? Ensure you’re signed in and, if required, profile completeness is met.</li>
              <li>Requests not sending? Check you have permission “request:mentorship” and retry after a refresh.</li>
              <li>Messages disabled? Ensure the relationship is accepted and you have messaging access.</li>
            </ul>
          </Section>

          <Section title="Need more help?">
            <p>Visit <Link to="/help#mentorship" className="text-ocean-600 hover:underline">Help Center</Link> or <Link to="/contact" className="text-ocean-600 hover:underline">Contact us</Link> for support.</p>
          </Section>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheckIcon className="w-4 h-4" />
          <span>Respect privacy and follow community guidelines. Admins may review mentor visibility and requests.</span>
        </div>
      </div>
    </div>
  );
}
