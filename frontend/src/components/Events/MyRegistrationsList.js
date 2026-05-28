import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useMyRegistrations } from '../../hooks/useEventData';
import EventsList from './EventsList';
import LoadingSpinner from '../common/LoadingSpinner';

const MyRegistrationsList = () => {
  const { user } = useAuth();
  const { data, isLoading, error } = useMyRegistrations(user?.id);

  if (!user) {
    return null;
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading your registrations..." />;
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        Failed to load your registrations.
      </div>
    );
  }

  return (
    <EventsList
      isAdmin={false}
      eventsOverride={Array.isArray(data) ? data : []}
      titleOverride="My Registrations"
      hideCreateButton
    />
  );
};

export default MyRegistrationsList;
