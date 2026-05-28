import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import EventsList from '../components/Events/EventsList';
import CreateEvent from '../components/Events/CreateEvent';
import EventDetail from '../components/Events/EventDetail';
import EditEvent from '../components/Events/EditEvent';
import EventFeedback from '../components/Events/EventFeedback';
import EventFeedbackDashboard from '../components/Events/EventFeedbackDashboard';

const EventsPage = () => {
  const { user, hasPermission } = useAuth();
  const isAdmin = hasPermission('events:create');

  return (
    <Routes>
      <Route path="/" element={<EventsList isAdmin={isAdmin} />} />
      <Route 
        path="new" 
        element={
          isAdmin ? (
            <CreateEvent />
          ) : (
            <Navigate to="/events" replace state={{ error: 'You do not have permission to create events' }} />
          )
        } 
      />
      <Route path=":id" element={<EventDetail isAdmin={isAdmin} />} />
      <Route 
        path=":id/edit" 
        element={
          isAdmin ? (
            <EditEvent />
          ) : (
            <Navigate to="/events" replace state={{ error: 'You do not have permission to edit events' }} />
          )
        } 
      />
      <Route 
        path=":id/feedback" 
        element={
          user ? (
            <EventFeedback />
          ) : (
            <Navigate to="/login" replace state={{ from: window.location.pathname }} />
          )
        } 
      />
      <Route 
        path=":id/feedback-dashboard" 
        element={
          user ? (
            <EventFeedbackDashboard />
          ) : (
            <Navigate to="/login" replace state={{ from: window.location.pathname }} />
          )
        } 
      />
    </Routes>
  );
};

export default EventsPage;
