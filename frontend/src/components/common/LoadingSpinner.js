import React from 'react';
import { Box, Typography } from '@mui/material';
import './LoadingSpinner.css';

const LoadingSpinner = ({ message = 'Loading...' }) => {
  return (
    <Box 
      display="flex" 
      flexDirection="column" 
      alignItems="center" 
      justifyContent="center" 
      py={6}
    >
      <img 
        src="/logo.png" 
        alt="Loading..." 
        className="loading-spinner-logo"
        style={{ width: '60px', height: '60px', marginBottom: '16px' }}
      />
      <Typography color="text.secondary">{message}</Typography>
    </Box>
  );
};

export default LoadingSpinner;
