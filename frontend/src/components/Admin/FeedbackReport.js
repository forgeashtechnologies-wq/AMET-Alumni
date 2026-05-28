import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import logger from '../../utils/logger';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  TablePagination,
  IconButton,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  Chip
} from '@mui/material';
import { 
  FilterList as FilterIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  CalendarMonth as CalendarIcon,
  BugReport as BugIcon,
  LightbulbCircle as FeatureIcon,
  Difference as ImprovementIcon,
  HelpOutline as OtherIcon,
  CheckCircleOutline as CompletedIcon,
  Pending as PendingIcon,
  BuildCircle as InProgressIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import moment from 'moment';

const FEEDBACK_TYPES = [
  { id: 'bug', name: 'Bug Report', color: 'error', icon: <BugIcon /> },
  { id: 'feature', name: 'Feature Request', color: 'primary', icon: <FeatureIcon /> },
  { id: 'improvement', name: 'Improvement', color: 'success', icon: <ImprovementIcon /> },
  { id: 'other', name: 'Other', color: 'secondary', icon: <OtherIcon /> }
];

const STATUS_TYPES = [
  { id: 'pending', name: 'Pending', color: 'warning', icon: <PendingIcon /> },
  { id: 'in_progress', name: 'In Progress', color: 'info', icon: <InProgressIcon /> },
  { id: 'completed', name: 'Completed', color: 'success', icon: <CompletedIcon /> }
];

const FeedbackReport = () => {
  const { userRole, isAdmin } = useAuth();
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [screenshotHref, setScreenshotHref] = useState(null);

  const isHttpUrl = (s) => typeof s === 'string' && /^https?:\/\//i.test(s);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const s = selectedFeedback?.screenshot_url;
      if (!s) {
        setScreenshotHref(null);
        return;
      }
      if (isHttpUrl(s)) {
        setScreenshotHref(s);
        return;
      }
      try {
        const { data, error } = await supabase.storage
          .from('feedback_screenshots')
          .createSignedUrl(s, 60 * 10);
        if (cancelled) return;
        if (error) throw error;
        setScreenshotHref(data?.signedUrl || null);
      } catch (e) {
        if (!cancelled) setScreenshotHref(null);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [selectedFeedback]);

  // Authorization via AuthContext only (ban direct role reads)
  const [isAuthorized, setIsAuthorized] = useState(false);
  useEffect(() => {
    const allowed = userRole === 'super_admin' || isAdmin;
    setIsAuthorized(!!allowed);
    if (allowed) fetchFeedback();
    else toast.error('You do not have permission to view this page');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole, isAdmin]);

  const fetchFeedback = async () => {
    setLoading(true);

    try {
      // Build query with filters
      let query = supabase
        .from('user_feedback')
        .select('*, profiles:user_id(full_name, email)', { count: 'exact' });

      if (typeFilter !== 'all') {
        query = query.eq('feedback_type', typeFilter);
      }
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (dateFilter !== 'all') {
        const now = new Date();
        let startDate;

        switch (dateFilter) {
          case 'today':
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 1);
            break;
          default:
            break;
        }

        if (startDate) {
          query = query.gte('created_at', startDate.toISOString());
        }
      }

      if (searchTerm) {
        query = query.textSearch('description', searchTerm);
      }

      // Add pagination
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(page * rowsPerPage, page * rowsPerPage + rowsPerPage - 1);

      if (error) throw error;
      
      setFeedback(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      logger.error('Error fetching feedback:', error);
      toast.error('Failed to load feedback data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchFeedback();
    }
  }, [page, rowsPerPage, typeFilter, dateFilter, searchTerm, isAuthorized]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewFeedback = (feedbackItem) => {
    setSelectedFeedback(feedbackItem);
    setOpenViewDialog(true);
  };

  const handleCloseViewDialog = () => {
    setOpenViewDialog(false);
  };

  const getTypeChip = (type) => {
    const feedbackType = FEEDBACK_TYPES.find(t => t.id === type) || FEEDBACK_TYPES[3]; // Default to 'other'
    return (
      <Chip 
        icon={feedbackType.icon}
        label={feedbackType.name}
        color={feedbackType.color}
        size="small"
      />
    );
  };

  const getStatusChip = (status) => {
    const statusType = STATUS_TYPES.find(s => s.id === status) || STATUS_TYPES[0]; // Default to 'pending'
    return (
      <Chip 
        icon={statusType.icon}
        label={statusType.name}
        color={statusType.color}
        size="small"
      />
    );
  };

  const handleUpdateStatus = async (feedbackId, newStatus) => {
    try {
      const { error } = await supabase
        .from('user_feedback')
        .update({ status: newStatus })
        .eq('id', feedbackId);
        
      if (error) throw error;
      
      // Update local state
      setFeedback(prev => prev.map(item => {
        if (item.id === feedbackId) {
          return { ...item, status: newStatus };
        }
        return item;
      }));
      
      // If we're viewing this feedback, update the selected feedback too
      if (selectedFeedback && selectedFeedback.id === feedbackId) {
        setSelectedFeedback(prev => ({ ...prev, status: newStatus }));
      }
      
      toast.success(`Feedback marked as ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      logger.error('Error updating feedback status:', error);
      toast.error('Failed to update feedback status');
    }
  };

  if (!isAuthorized) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Access Denied
        </Typography>
        <Typography>
          You do not have permission to view the feedback report.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        User Feedback Report
      </Typography>

      <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <TextField
          label="Search"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: { xs: '100%', sm: 'auto', flexGrow: 1 } }}
        />
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="feedback-type-label">Feedback Type</InputLabel>
          <Select
            labelId="feedback-type-label"
            value={typeFilter}
            label="Feedback Type"
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <MenuItem value="all">All Types</MenuItem>
            {FEEDBACK_TYPES.map(type => (
              <MenuItem key={type.id} value={type.id}>
                {type.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select
            labelId="status-filter-label"
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">All Status</MenuItem>
            {STATUS_TYPES.map(status => (
              <MenuItem key={status.id} value={status.id}>
                {status.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="date-filter-label">Time Period</InputLabel>
          <Select
            labelId="date-filter-label"
            value={dateFilter}
            label="Time Period"
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <MenuItem value="all">All Time</MenuItem>
            <MenuItem value="today">Today</MenuItem>
            <MenuItem value="week">Last 7 Days</MenuItem>
            <MenuItem value="month">Last 30 Days</MenuItem>
          </Select>
        </FormControl>

        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<FilterIcon />}
          onClick={fetchFeedback}
        >
          Filter
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="feedback table">
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Page</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Screenshot</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : feedback.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No feedback found
                </TableCell>
              </TableRow>
            ) : (
              feedback.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{getTypeChip(item.feedback_type)}</TableCell>
                  <TableCell>{moment(item.created_at).format('MMM DD, YYYY')}</TableCell>
                  <TableCell>
                    {item.profiles?.full_name || 'Anonymous'}<br />
                    <Typography variant="caption" color="text.secondary">
                      {item.profiles?.email || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={item.page || '/'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {item.description.length > 50
                      ? `${item.description.substring(0, 50)}...`
                      : item.description}
                  </TableCell>
                  <TableCell>
                    {item.screenshot_url ? (
                      <Chip 
                        label="Has Screenshot" 
                        size="small" 
                        color="info"
                        variant="outlined"
                      />
                    ) : (
                      <Chip 
                        label="No Screenshot" 
                        size="small"
                        variant="outlined"
                        color="default"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusChip(item.status || 'pending')}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleViewFeedback(item)}
                      color="primary"
                      title="View details"
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={totalCount}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      {/* Feedback Detail Dialog */}
      <Dialog 
        open={openViewDialog} 
        onClose={handleCloseViewDialog}
        maxWidth="md"
        fullWidth
      >
        {selectedFeedback && (
          <>
            <DialogTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Feedback Details</Typography>
                <IconButton edge="end" color="inherit" onClick={handleCloseViewDialog} aria-label="close">
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Box display="flex" gap={1}>
                    {getTypeChip(selectedFeedback.feedback_type)}
                    {getStatusChip(selectedFeedback.status || 'pending')}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    <CalendarIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                    {moment(selectedFeedback.created_at).format('MMMM DD, YYYY [at] h:mm A')}
                  </Typography>
                </Box>
                <Typography variant="body2" gutterBottom>
                  <strong>User:</strong> {selectedFeedback.profiles?.full_name || 'Anonymous'} ({selectedFeedback.profiles?.email || 'N/A'})
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Page:</strong> {selectedFeedback.page || '/'}
                </Typography>
              </Box>
              
              <Typography variant="subtitle1" gutterBottom>Description:</Typography>
              <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
                <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                  {selectedFeedback.description}
                </Typography>
              </Paper>
              
              {selectedFeedback.screenshot_url && (
                <>
                  <Typography variant="subtitle1" gutterBottom>Screenshot:</Typography>
                  <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <a href={screenshotHref || undefined} target="_blank" rel="noopener noreferrer">
                      <img 
                        src={screenshotHref || undefined} 
                        alt="Feedback screenshot" 
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '400px', 
                          border: '1px solid #ddd' 
                        }} 
                      />
                    </a>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Button 
                      variant="outlined" 
                      component="a"
                      href={screenshotHref || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Full Size Image
                    </Button>
                  </Box>
                </>
              )}
              
              {/* Status update section */}
              <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #eee' }}>
                <Typography variant="subtitle1" gutterBottom>Update Status:</Typography>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  {STATUS_TYPES.map(status => (
                    <Button
                      key={status.id}
                      variant={selectedFeedback.status === status.id ? 'contained' : 'outlined'}
                      color={status.color}
                      startIcon={status.icon}
                      onClick={() => handleUpdateStatus(selectedFeedback.id, status.id)}
                      disabled={selectedFeedback.status === status.id}
                    >
                      {status.name}
                    </Button>
                  ))}
                </Box>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default FeedbackReport;
