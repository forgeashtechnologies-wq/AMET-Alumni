import React, { useState } from 'react';
import { supabase } from '../../utils/supabase';
import logger from '../../utils/logger';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Grid,
  Divider,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  Download, 
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  FileSpreadsheet,
  FileDown
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const SUPPORTED_TABLES = [
  { 
    value: 'profiles', 
    label: 'User Profiles', 
    description: 'Export all user profiles data including contact information and settings',
    customHeaders: {
      'id': 'User ID',
      'first_name': 'First Name',
      'last_name': 'Last Name',
      'email': 'Email Address',
      'batch': 'Batch/Year',
      'department': 'Department',
      'location': 'Location',
      'created_at': 'Registration Date'
    }
  },
  { 
    value: 'events', 
    label: 'Events', 
    description: 'Export all events data including dates, locations, and registrations',
    customHeaders: {
      'id': 'Event ID',
      'title': 'Event Title',
      'description': 'Description',
      'location': 'Location',
      'event_date': 'Date',
      'created_by': 'Created By',
      'created_at': 'Created On'
    }
  },
  { 
    value: 'companies', 
    label: 'Companies', 
    description: 'Export company profiles and information',
    customHeaders: {
      'id': 'Company ID',
      'name': 'Company Name',
      'industry': 'Industry',
      'description': 'Description',
      'website': 'Website',
      'location': 'Location',
      'contact_email': 'Contact Email',
      'public_profile': 'Public Profile'
    }
  },
  { 
    value: 'job_postings', 
    label: 'Job Postings', 
    description: 'Export all job postings including requirements and contact details',
    customHeaders: {
      'id': 'Job ID',
      'title': 'Job Title',
      'company_id': 'Company ID',
      'company_name': 'Company Name',
      'location': 'Location',
      'job_type': 'Job Type',
      'description': 'Description',
      'requirements': 'Requirements',
      'created_at': 'Posted On',
      'expires_at': 'Expires On',
      'status': 'Status'
    }
  },
  { 
    value: 'mentorship_requests', 
    label: 'Mentorship Requests', 
    description: 'Export mentorship request data including statuses and matches',
    customHeaders: {
      'id': 'Request ID',
      'mentee_id': 'Mentee ID',
      'mentor_id': 'Mentor ID',
      'status': 'Status',
      'request_message': 'Request Message',
      'response_message': 'Response/Feedback',
      'created_at': 'Requested On',
      'updated_at': 'Last Updated'
    }
  },
  { 
    value: 'group_posts', 
    label: 'Group Posts', 
    description: 'Export group posts and discussions',
    customHeaders: {
      'id': 'Post ID',
      'group_id': 'Group ID',
      'user_id': 'Author ID',
      'content': 'Content',
      'created_at': 'Posted On',
      'updated_at': 'Last Updated'
    }
  }
];

const CSVExport = () => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [exportHistory, setExportHistory] = useState([]);

  const handleExport = async (tableName) => {
    setLoading(prev => ({ ...prev, [tableName]: true }));
    setError('');
    setSuccess('');
    
    try {
      // Get the table configuration
      const tableConfig = SUPPORTED_TABLES.find(t => t.value === tableName) || {};
      const customHeaders = tableConfig.customHeaders || {};
      
      // Fetch data from the selected table
      const { data, error } = await supabase
        .from(tableName)
        .select('*');
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
        setError(`No data found in table ${tableName}`);
        setLoading(prev => ({ ...prev, [tableName]: false }));
        return;
      }
      
      // Format data for CSV export
      const dataKeys = Object.keys(data[0]);
      
      // Create friendly header row with custom headers
      const headerRow = dataKeys.map(key => {
        const friendlyName = customHeaders[key] || key.replace(/_/g, ' ').split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        return `"${friendlyName}"`;
      }).join(',');
      
      // Create data rows with proper escaping
      const dataRows = data.map(row => {
        return dataKeys.map(key => {
          const value = row[key];
          
          // Handle different data types
          if (value === null || value === undefined) {
            return '';
          } else if (typeof value === 'string') {
            // Escape double quotes and wrap in quotes
            return `"${value.replace(/"/g, '""')}"`;
          } else if (value instanceof Date) {
            return `"${value.toISOString().split('T')[0]}"`;  // Format as YYYY-MM-DD
          } else if (typeof value === 'object') {
            // Convert objects to JSON strings
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;  
          } else {
            // Numbers, booleans, etc.
            return value;
          }
        }).join(',');
      }).join('\n');
      
      // Combine headers and data into full CSV content
      const csvContent = `${headerRow}\n${dataRows}`;
      
      // Format current date for filename
      const currentDate = new Date().toISOString().split('T')[0];
      const timestamp = new Date().toISOString().replace(/[:.-]/g, '_').replace('T', '_').split('Z')[0];
      
      // Create download link with improved filename
      const fileName = `AMET_${tableConfig.label.replace(/\s+/g, '_')}_${timestamp}.csv`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Check if we need BOM for Excel compatibility
      const BOM = '\uFEFF'; // UTF-8 BOM
      const blobWithBOM = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      
      const url = URL.createObjectURL(blobWithBOM);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
      setSuccess(`${tableConfig.label} data exported successfully to ${fileName}`);
      
      // Record export action
      const { error: recordError } = await supabase
        .from('csv_import_history')
        .insert([{
          user_id: user.id,
          filename: fileName,
          target_table: tableName,
          status: 'success',
          action_type: 'export'
        }]);
      
      if (recordError) logger.error('Error logging export action:', recordError);
      
    } catch (err) {
      logger.error('Error exporting data:', err);
      setError(`Failed to export data: ${err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, [tableName]: false }));
    }
  };

  if (!isAdmin) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning">
          You don't have permission to access this feature. Please contact an administrator.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 0 }}>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}
      
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 'medium' }}>CSV Export</Typography>
      
      <Grid container spacing={3}>
        {SUPPORTED_TABLES.map((table) => (
          <Grid item xs={12} md={6} lg={4} key={table.value}>
            <Card 
              variant="outlined" 
              sx={{ 
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  boxShadow: 3,
                  transform: 'translateY(-2px)'
                }
              }}
            >
              <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <FileSpreadsheet size={24} style={{ marginRight: 8, color: '#1976d2' }} />
                  <Typography variant="h6" component="div">
                    {table.label}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                  {table.description}
                </Typography>
                <Button
                  fullWidth
                  variant="outlined"
                  color="primary"
                  startIcon={loading[table.value] ? <CircularProgress size={20} /> : <FileDown size={18} />}
                  onClick={() => handleExport(table.value)}
                  disabled={loading[table.value]}
                >
                  {loading[table.value] ? 'Exporting...' : 'Export CSV'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      <Box sx={{ mt: 4, mb: 2 }}>
        <Divider>
          <Chip label="Export Tips" />
        </Divider>
      </Box>
      
      <Paper variant="outlined" sx={{ p: 3, bgcolor: '#f8f9fa' }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
          Tips for Working with CSV Exports
        </Typography>
        <Typography variant="body2" component="div">
          <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
            <li>Exported data is in CSV format with friendly column headers</li>
            <li>Files can be opened in Microsoft Excel, Google Sheets, or any spreadsheet software</li>
            <li>UTF-8 encoding ensures proper display of special characters</li>
            <li>All date fields are in YYYY-MM-DD format</li>
            <li>Text is properly escaped and quoted to preserve data integrity</li>
            <li>Files are named with table name and timestamp for easy organization</li>
            <li>Export history is automatically logged for administrative tracking</li>
          </ul>
        </Typography>
        
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'medium' }}>
            Company Profile Access
          </Typography>
          <Typography variant="body2">
            Public company profiles are available at <code>/companies/[id]</code> where <code>[id]</code> is the company ID.
            For example: <code>/companies/1</code> for the first company.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default CSVExport;
