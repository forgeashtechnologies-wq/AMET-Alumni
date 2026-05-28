import toast from 'react-hot-toast';

export const useNotification = () => {
  const showSuccess = (message) => {
    toast.success(message);
  };

  const showError = (message) => {
    toast.error(message);
  };

  const showInfo = (message) => {
    toast(message, {
      icon: '🔔',
    });
  };

  return { showSuccess, showError, showInfo };
};
