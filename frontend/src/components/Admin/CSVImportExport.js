import React, { useState, useEffect } from 'react';
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
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Chip,
  IconButton,
  Grid,
  TextField,
  Tooltip
} from '@mui/material';
import { 
  Upload, 
  Download, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  RefreshCw,
  List
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const SUPPORTED_TABLES = [
  { value: 'profiles', label: 'User Profiles' },
  { value: 'events', label: 'Events' },
  { value: 'companies', label: 'Companies' },
  { value: 'job_postings', label: 'Job Postings' }
];

const MAX_FILE_SIZE_MB = 5;

// Validation mode options
const VALIDATION_MODES = [
  { value: 'strict', label: 'Strict - Reject all invalid rows' },
  { value: 'lenient', label: 'Lenient - Skip invalid rows, import valid ones' },
  { value: 'preview', label: 'Preview Only - Validate without importing' },
];

// Duplicate handling strategies
const DUPLICATE_STRATEGIES = [
  { value: 'skip', label: 'Skip - Ignore duplicate records' },
  { value: 'update', label: 'Update - Overwrite existing records' },
  { value: 'error', label: 'Error - Fail on duplicates' },
];

const CSVImportExport = () => {
  const { user, isAdmin } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedTable, setSelectedTable] = useState('');
  const [previewData, setPreviewData] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [importHistory, setImportHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  // New: Validation and duplicate handling options
  const [validationMode, setValidationMode] = useState('strict');
  const [duplicateStrategy, setDuplicateStrategy] = useState('skip');

  useEffect(() => {
    if (isAdmin) {
      fetchImportHistory();
    }
  }, [isAdmin]);

  const fetchImportHistory = async () => {
    setHistoryLoading(true);
    setError('');
    try {
      const { data, error } = await supabase
        .from('csv_import_history')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setImportHistory(data || []);
    } catch (err) {
      logger.error('Error fetching import history:', err);
      setError('Failed to load import history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleFileChange = (event) => {
    setError('');
    setSuccess('');
    
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Only CSV files are supported');
      return;
    }
    
    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      setError(`File size exceeds the maximum allowed size (${MAX_FILE_SIZE_MB}MB)`);
      return;
    }
    
    setSelectedFile(file);
    parseCSVPreview(file);
  };

  const parseCSVPreview = (file) => {
    setLoading(true);
    setError('');
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\\n');
        
        if (lines.length < 2) {
          throw new Error('CSV file must contain a header row and at least one data row');
        }
        
        // Parse header row
        const header = lines[0].split(',').map(col => col.trim().replace(/^"|"$/g, ''));
        
        // Parse first few data rows for preview
        const dataRows = [];
        for (let i = 1; i < Math.min(lines.length, 6); i++) {
          if (lines[i].trim()) {
            const row = lines[i].split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
            dataRows.push(row);
          }
        }
        
        setPreviewData({ header, dataRows });
        
        // Initialize column mapping
        const initialMapping = {};
        header.forEach((col, index) => {
          initialMapping[index] = '';
        });
        setColumnMapping(initialMapping);
        
        setLoading(false);
        setActiveStep(1);
      } catch (err) {
        logger.error('Error parsing CSV:', err);
        setError(`Error parsing CSV file: ${err.message}`);
        setLoading(false);
      }
    };
    
    reader.onerror = () => {
      setError('Error reading the file');
      setLoading(false);
    };
    
    reader.readAsText(file);
  };

  const fetchTableColumns = async (tableName) => {
    setLoading(true);
    setError('');
    
    try {
      // Using system tables to get column information
      const { data, error } = await supabase.rpc('get_table_columns', { table_name: tableName });
      
      if (error) throw error;
      
      // Filter out system columns or columns that shouldn't be imported
      const filteredColumns = data.filter(col => 
        !['id', 'created_at', 'updated_at'].includes(col.column_name)
      );
      
      setTableColumns(filteredColumns);
    } catch (err) {
      logger.error('Error fetching table columns:', err);
      setError(`Failed to fetch columns for table ${tableName}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (event) => {
    const tableName = event.target.value;
    setSelectedTable(tableName);
    if (tableName) {
      fetchTableColumns(tableName);
    } else {
      setTableColumns([]);
    }
  };

  const handleColumnMappingChange = (csvColIndex, tableColumn) => {
    setColumnMapping(prev => ({
      ...prev,
      [csvColIndex]: tableColumn
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Upload CSV file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${fileName}`;
      
      const { error: uploadError } = await supabase
        .storage
        .from('csv_files')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });
        
      if (uploadError) throw uploadError;
      
      // Create import record with validation options
      const { error: recordError } = await supabase
        .from('csv_import_history')
        .insert([{
          user_id: user.id,
          filename: selectedFile.name,
          record_count: previewData.dataRows.length, // This is just the preview count
          status: validationMode === 'preview' ? 'preview' : 'pending',
          target_table: selectedTable,
          mapping_config: columnMapping,
          validation_mode: validationMode,
          duplicate_strategy: duplicateStrategy,
        }]);
        
      if (recordError) throw recordError;
      
      setSuccess('CSV file uploaded successfully and queued for processing');
      fetchImportHistory();
      resetForm();
    } catch (err) {
      logger.error('Error submitting CSV import:', err);
      setError(`Failed to import CSV: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setSelectedTable('');
    setPreviewData([]);
    setTableColumns([]);
    setColumnMapping({});
    setActiveStep(0);
    setValidationMode('strict');
    setDuplicateStrategy('skip');
  };

  const handleExport = async (tableName) => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch data from the selected table
      const { data, error } = await supabase
        .from(tableName)
        .select('*');
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
        setError(`No data found in table ${tableName}`);
        setLoading(false);
        return;
      }
      
      // Convert data to CSV
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
          // Handle values with commas by wrapping in quotes
          const value = row[header] === null ? '' : row[header];
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        }).join(','))
      ].join('\\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${tableName}_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      // Clean up
      URL.revokeObjectURL(url);
      setSuccess(`${tableName} data exported successfully`);
    } catch (err) {
      logger.error('Error exporting data:', err);
      setError(`Failed to export data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = (status) => {
    switch (status) {
      case 'pending':
        return <Chip icon={<RefreshCw size={16} />} label="Pending" color="warning" size="small" />;
      case 'success':
        return <Chip icon={<CheckCircle size={16} />} label="Success" color="success" size="small" />;
      case 'failed':
        return <Chip icon={<XCircle size={16} />} label="Failed" color="error" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  const steps = ['Select File & Table', 'Map Columns', 'Review & Submit'];

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
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>CSV Import & Export</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<List />}
            onClick={() => setShowHistory(!showHistory)}
            sx={{ mr: 2 }}
          >
            {showHistory ? 'Hide History' : 'Show History'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={() => {
              const dropdown = document.getElementById('export-dropdown');
              dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
            }}
          >
            Export Data
          </Button>
          <Box
            id="export-dropdown"
            sx={{
              display: 'none',
              position: 'absolute',
              right: 0,
              mt: 1,
              zIndex: 1000,
              bgcolor: 'background.paper',
              boxShadow: 3,
              borderRadius: 1,
              p: 1
            }}
          >
            {SUPPORTED_TABLES.map(table => (
              <MenuItem key={table.value} onClick={() => handleExport(table.value)}>
                {table.label}
              </MenuItem>
            ))}
          </Box>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}
      
      {showHistory ? (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>Import History</Typography>
          {historyLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : importHistory.length === 0 ? (
            <Alert severity="info">No import history found</Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>File Name</TableCell>
                    <TableCell>Target Table</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Records</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {importHistory.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{item.filename}</TableCell>
                      <TableCell>{item.target_table}</TableCell>
                      <TableCell>{new Date(item.created_at).toLocaleString()}</TableCell>
                      <TableCell>{getStatusChip(item.status)}</TableCell>
                      <TableCell>{item.record_count || '-'}</TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton size="small">
                            <Info size={18} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              startIcon={<RefreshCw size={18} />}
              onClick={fetchImportHistory}
              disabled={historyLoading}
            >
              Refresh
            </Button>
          </Box>
        </Paper>
      ) : (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          {activeStep === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>Step 1: Select a CSV file and target table</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box
                    sx={{
                      border: '2px dashed #ccc',
                      borderRadius: 2,
                      p: 3,
                      textAlign: 'center',
                      mb: 2,
                      cursor: 'pointer'
                    }}
                    onClick={() => document.getElementById('csv-file-input').click()}
                  >
                    <input
                      id="csv-file-input"
                      type="file"
                      accept=".csv"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                    <Upload size={48} color="#666" style={{ marginBottom: '16px' }} />
                    <Typography variant="h6" gutterBottom>Drop CSV file here</Typography>
                    <Typography variant="body2" color="textSecondary">
                      or click to browse (max {MAX_FILE_SIZE_MB}MB)
                    </Typography>
                  </Box>
                  {selectedFile && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Selected file: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                    </Alert>
                  )}
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel id="target-table-label">Target Table</InputLabel>
                    <Select
                      labelId="target-table-label"
                      id="target-table-select"
                      value={selectedTable}
                      label="Target Table"
                      onChange={handleTableChange}
                    >
                      <MenuItem value="">
                        <em>Select a table</em>
                      </MenuItem>
                      {SUPPORTED_TABLES.map(table => (
                        <MenuItem key={table.value} value={table.value}>
                          {table.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Typography variant="body2" color="textSecondary">
                    Select the table where you want to import the CSV data
                  </Typography>
                </Grid>
              </Grid>
              <Divider sx={{ my: 3 }} />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  disabled={!selectedFile || !selectedTable || loading}
                  onClick={() => setActiveStep(1)}
                >
                  Next
                </Button>
              </Box>
            </Box>
          )}
          
          {activeStep === 1 && previewData.header && previewData.dataRows && (
            <Box>
              <Typography variant="h6" gutterBottom>Step 2: Map CSV columns to database fields</Typography>
              <Alert severity="info" sx={{ mb: 3 }}>
                Map each column from your CSV file to the corresponding field in the database
              </Alert>
              <TableContainer sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>CSV Column</strong></TableCell>
                      <TableCell><strong>Preview</strong></TableCell>
                      <TableCell><strong>Database Field</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewData.header.map((colName, index) => (
                      <TableRow key={index}>
                        <TableCell>{colName}</TableCell>
                        <TableCell>{previewData.dataRows[0]?.[index] || '-'}</TableCell>
                        <TableCell>
                          <FormControl fullWidth size="small">
                            <Select
                              value={columnMapping[index] || ''}
                              onChange={(e) => handleColumnMappingChange(index, e.target.value)}
                              displayEmpty
                            >
                              <MenuItem value="">
                                <em>Skip column</em>
                              </MenuItem>
                              {tableColumns.map(col => (
                                <MenuItem 
                                  key={col.column_name} 
                                  value={col.column_name}
                                >
                                  {col.column_name} ({col.data_type})
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button 
                  onClick={() => setActiveStep(0)}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button 
                  variant="contained" 
                  onClick={() => setActiveStep(2)}
                  disabled={loading || Object.values(columnMapping).filter(Boolean).length === 0}
                >
                  Next
                </Button>
              </Box>
            </Box>
          )}
          
          {activeStep === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>Step 3: Review and Confirm Import</Typography>
              <Alert severity="warning" sx={{ mb: 3 }}>
                <AlertTriangle size={16} style={{ marginRight: '8px' }} />
                Please review your import carefully. This action may modify existing data.
              </Alert>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom><strong>File:</strong> {selectedFile?.name}</Typography>
                <Typography variant="subtitle1" gutterBottom><strong>Target Table:</strong> {selectedTable}</Typography>
                <Typography variant="subtitle1" gutterBottom><strong>Mapped Columns:</strong> {Object.values(columnMapping).filter(Boolean).length} of {Object.keys(columnMapping).length}</Typography>
              </Box>

              {/* Import Options */}
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}><strong>Import Options:</strong></Typography>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel id="validation-mode-label">Validation Mode</InputLabel>
                    <Select
                      labelId="validation-mode-label"
                      value={validationMode}
                      label="Validation Mode"
                      onChange={(e) => setValidationMode(e.target.value)}
                    >
                      {VALIDATION_MODES.map(mode => (
                        <MenuItem key={mode.value} value={mode.value}>
                          {mode.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                    How to handle rows that fail validation
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel id="duplicate-strategy-label">Duplicate Handling</InputLabel>
                    <Select
                      labelId="duplicate-strategy-label"
                      value={duplicateStrategy}
                      label="Duplicate Handling"
                      onChange={(e) => setDuplicateStrategy(e.target.value)}
                    >
                      {DUPLICATE_STRATEGIES.map(strategy => (
                        <MenuItem key={strategy.value} value={strategy.value}>
                          {strategy.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                    What to do when a record already exists
                  </Typography>
                </Grid>
              </Grid>
              
              <Typography variant="subtitle1" gutterBottom><strong>Column Mapping:</strong></Typography>
              <TableContainer sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>CSV Column</strong></TableCell>
                      <TableCell><strong>Database Field</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(columnMapping).map(([csvIndex, dbField]) => 
                      dbField ? (
                        <TableRow key={csvIndex}>
                          <TableCell>{previewData.header[csvIndex]}</TableCell>
                          <TableCell>{dbField}</TableCell>
                        </TableRow>
                      ) : null
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button 
                  onClick={() => setActiveStep(1)}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={handleSubmit}
                  disabled={loading || Object.values(columnMapping).filter(Boolean).length === 0}
                >
                  {loading ? <CircularProgress size={24} /> : 'Import Data'}
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default CSVImportExport;
