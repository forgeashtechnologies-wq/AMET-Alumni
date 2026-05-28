import React from 'react';
import { Link } from 'react-router-dom';
import { 
  CalendarIcon, 
  MapPinIcon, 
  UsersIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

const LandingPage = () => {
  const upcomingEvents = [
    {
      id: 1,
      title: 'Annual Alumni Reunion',
      date: 'May 15, 2025',
      location: 'Grand Marina Hotel',
      attendees: 87,
      type: 'reunion'
    },
    {
      id: 2,
      title: 'Career Networking Mixer',
      date: 'June 2, 2025',
      location: 'Virtual (Zoom)',
      attendees: 42,
      type: 'networking'
    },
    {
      id: 3,
      title: 'Industry Expert Panel',
      date: 'June 18, 2025',
      location: 'AMET Auditorium',
      attendees: 65,
      type: 'panel'
    }
  ];

  const features = [
    {
      icon: UsersIcon,
      title: 'Alumni Directory',
      description: 'Connect with fellow AMET graduates worldwide'
    },
    {
      icon: CalendarIcon,
      title: 'Events & Reunions',
      description: 'Stay updated on alumni gatherings and networking events'
    },
    {
      icon: BriefcaseIcon,
      title: 'Job Portal',
      description: 'Discover career opportunities from alumni network'
    },
    {
      icon: AcademicCapIcon,
      title: 'Mentorship',
      description: 'Connect with experienced alumni for career guidance. Mentorship options available after you sign up!'
    }
  ];

  const benefits = [
    'Access to exclusive alumni network',
    'Career development opportunities',
    'Mentorship programs',
    'Industry networking events',
    'Professional development resources',
    'Alumni-only job postings'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-500 to-blue-800">
      {/* Navigation Header */}
      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-ocean-600 font-bold text-xl">A</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AMET</h1>
              <p className="text-sm text-ocean-100">Alumni Network</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link
              to="/login"
              className="text-white hover:text-ocean-200 transition-colors duration-200 font-medium"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="bg-white text-ocean-600 px-6 py-2 rounded-lg font-medium hover:bg-ocean-50 transition-all duration-200 shadow-lg"
            >
              Join Network
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              <div className="space-y-6">
                <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
                  Connect With Your{' '}
                  <span className="text-yellow-300">AMET Alumni Network</span>
                </h1>
                
                <p className="text-xl text-ocean-100 leading-relaxed max-w-2xl">
                  A comprehensive platform for connecting with fellow alumni, exploring 
                  events, finding job opportunities, and building mentorship relationships. 
                  <span className="opacity-90">Mentorship options available after you sign up!</span>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/register"
                  className="bg-white text-ocean-600 px-8 py-4 rounded-lg font-semibold hover:bg-ocean-50 transition-all duration-200 shadow-lg text-center flex items-center justify-center"
                >
                  Register Now
                  <ArrowRightIcon className="w-5 h-5 ml-2" />
                </Link>
                <Link
                  to="/login"
                  className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-ocean-600 transition-all duration-200 text-center"
                >
                  Learn More
                </Link>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-6 pt-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">1,500+</div>
                  <div className="text-ocean-200 text-sm">Alumni Members</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">50+</div>
                  <div className="text-ocean-200 text-sm">Countries</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">200+</div>
                  <div className="text-ocean-200 text-sm">Job Opportunities</div>
                </div>
              </div>
            </div>

            {/* Upcoming Events Card */}
            <div className="lg:col-span-1">
              <div className="glass-card rounded-2xl p-6 backdrop-blur-lg bg-white/10 border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-6">Upcoming Events</h3>
                
                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                      <h4 className="font-semibold text-white text-sm mb-2">{event.title}</h4>
                      <div className="flex items-center text-ocean-100 text-xs mb-1">
                        <CalendarIcon className="w-3 h-3 mr-1" />
                        {event.date}
                      </div>
                      <div className="flex items-center text-ocean-100 text-xs mb-2">
                        <MapPinIcon className="w-3 h-3 mr-1" />
                        {event.location}
                      </div>
                      <div className="flex items-center text-ocean-100 text-xs">
                        <UsersIcon className="w-3 h-3 mr-1" />
                        {event.attendees} Attending
                      </div>
                    </div>
                  ))}
                </div>

                <Link
                  to="/events"
                  className="block mt-6 text-center bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/30 transition-all duration-200"
                >
                  View All Events
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Ocean Wave Animation */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden">
          <svg viewBox="0 0 1200 120" className="w-full h-20 fill-white/10">
            <path d="M0,120 C300,80 600,140 1200,100 L1200,120 Z" className="animate-pulse" />
          </svg>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Join AMET Alumni?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Unlock the power of our maritime education community and advance your career 
              through meaningful connections.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center p-6 rounded-xl hover:shadow-lg transition-all duration-200">
                  <div className="w-16 h-16 bg-ocean-gradient rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-ocean-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Exclusive Member Benefits
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Join thousands of AMET alumni who are advancing their careers and 
                staying connected with our maritime community.
              </p>
              
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
                      <CheckIcon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <Link
                  to="/register"
                  className="bg-ocean-gradient text-white px-8 py-4 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 inline-flex items-center"
                >
                  Join Now - It's Free
                  <ArrowRightIcon className="w-5 h-5 ml-2" />
                </Link>
              </div>
            </div>

            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1689785380577-93f35f4d6bf9?w=600&h=400&fit=crop"
                alt="Alumni celebrating graduation"
                className="rounded-2xl shadow-2xl w-full h-96 object-cover"
              />
              <div className="absolute inset-0 bg-ocean-gradient opacity-20 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-ocean-600 to-blue-700 py-20">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Reconnect with Your Alumni Network?
          </h2>
          <p className="text-xl text-ocean-100 mb-8">
            Join the AMET Alumni network today and unlock exclusive opportunities, 
            connect with fellow graduates, and advance your maritime career.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-white text-ocean-600 px-8 py-4 rounded-lg font-semibold hover:bg-ocean-50 transition-all duration-200 shadow-lg"
            >
              Create Your Profile
            </Link>
            <Link
              to="/login"
              className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-ocean-600 transition-all duration-200"
            >
              Sign In to Network
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-ocean-gradient rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">A</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">AMET Alumni</h3>
                  <p className="text-gray-400 text-sm">Maritime Education Network</p>
                </div>
              </div>
              <p className="text-gray-400 max-w-md">
                Connecting AMET graduates worldwide through professional networking, 
                career opportunities, and lifelong learning.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/about" className="hover:text-white transition-colors">About AMET</Link></li>
                <li><Link to="/events" className="hover:text-white transition-colors">Events</Link></li>
                <li><Link to="/jobs" className="hover:text-white transition-colors">Career Center</Link></li>
                <li><Link to="/directory" className="hover:text-white transition-colors">Alumni Directory</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} AMET Alumni. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;