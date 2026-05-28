import React, { useEffect, useState } from 'react';
import SupportPageHeader from '../components/common/SupportPageHeader';

const ContactUs = () => {
  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    role: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!formValues.name.trim()) nextErrors.name = 'Please enter your name.';
    if (!formValues.email.trim()) {
      nextErrors.email = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }
    if (!formValues.subject.trim()) nextErrors.subject = 'Please add a short subject.';
    if (!formValues.message.trim()) nextErrors.message = 'Please tell us a bit more about your question.';
    return nextErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(false);
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      // Create WhatsApp message with form content
      const roleText = formValues.role ? ` (${formValues.role})` : '';
      const message = `*New Contact Form Submission*

Name: ${formValues.name}${roleText}
Email: ${formValues.email}
Subject: ${formValues.subject}

Message:
${formValues.message}`;
      
      // Open WhatsApp with pre-filled message
      const whatsappUrl = `https://wa.me/916382111569?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-ocean-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <SupportPageHeader />

        <div className="bg-white shadow-xl rounded-2xl p-6 md:p-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
          <p className="text-gray-700 mb-6">
            Have questions or feedback? Share a few details below and we&apos;ll get back to you shortly.
          </p>

          {submitted && (
            <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              WhatsApp has been opened with your message. Please send it to reach us!
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Your name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formValues.name}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-ocean-500 focus:ring-2 focus:ring-ocean-500 focus:ring-offset-1"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-600">{errors.name}</p>
                )}
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formValues.email}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-ocean-500 focus:ring-2 focus:ring-ocean-500 focus:ring-offset-1"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  I am a
                </label>
                <select
                  id="role"
                  name="role"
                  value={formValues.role}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-ocean-500 focus:ring-2 focus:ring-ocean-500 focus:ring-offset-1"
                >
                  <option value="">Select one</option>
                  <option value="student">Student</option>
                  <option value="alumni">Alumni</option>
                  <option value="employer">Employer</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                  Subject
                </label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  value={formValues.subject}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-ocean-500 focus:ring-2 focus:ring-ocean-500 focus:ring-offset-1"
                />
                {errors.subject && (
                  <p className="mt-1 text-xs text-red-600">{errors.subject}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                How can we help?
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                value={formValues.message}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-ocean-500 focus:ring-2 focus:ring-ocean-500 focus:ring-offset-1 resize-y min-h-[120px]"
              />
              {errors.message && (
                <p className="mt-1 text-xs text-red-600">{errors.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                We&apos;ll use your details only to follow up on this request.
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-lg bg-ocean-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-ocean-700 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
              >
                {submitting ? 'Sending…' : 'Send message'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
