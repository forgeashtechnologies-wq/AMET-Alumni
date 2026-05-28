import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import JobsList from '../components/Jobs/JobsList';
import JobDetail from '../components/Jobs/JobDetail';
import JobApplyForm from '../components/Jobs/JobApplyForm';
import JobAdminPanel from '../components/Jobs/JobAdminPanel';
import { useAuth } from '../contexts/AuthContext';

const JobsPage = () => {
  const { user, isAdmin } = useAuth();
  return (
    <Routes>
      <Route path="/" element={<JobsList />} />
      <Route path=":id" element={<JobDetail />} />
      <Route path=":id/apply" element={user ? <JobApplyForm /> : <Navigate to="/login" replace />} />
      {isAdmin && (
        <Route path="admin" element={<JobAdminPanel />} />
      )}
    </Routes>
  );
};

export default JobsPage;
