import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MentorshipDirectory from '../components/Mentorship/MentorshipDirectory';
import MentorshipProfile from '../components/Mentorship/MentorshipProfile';
import MentorshipRequestsDashboard from '../components/Mentorship/MentorshipRequestsDashboard';
import { useAuth } from '../contexts/AuthContext';

const MentorshipPage = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={<MentorshipDirectory />} />
      <Route path="profile/:id" element={<MentorshipProfile />} />
      <Route path="requests" element={user ? <MentorshipRequestsDashboard /> : <Navigate to="/login" replace />} />
    </Routes>
  );
};

export default MentorshipPage;
