import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  Avatar,
  Divider,
  Alert,
  Rating,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Star as StarIcon,
  FileDownload as FileDownloadIcon,
  Person as PersonIcon,
  ChatBubble as ChatBubbleIcon
} from '@mui/icons-material';
import LoadingSpinner from '../common/LoadingSpinner';
import { formatInIST } from '../../utils/timezone';

const EventFeedbackDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    averageRating: 0,
    totalResponses: 0,
    commentsCount: 0
  });
  
  const isMounted = useRef(true);
  
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }

    const fetchAllData = async () => {
      try {
        if (!isMounted.current) return;
        setLoading(true);
        setError(null);

        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();

        if (eventError) throw eventError;
        if (!eventData) throw new Error('Event not found');

        if (!isAdmin && eventData.organizer_id !== user.id) {
          navigate('/events', {
            state: { error: 'You do not have permission to view this feedback dashboard' },
          });
          return;
        }

        if (isMounted.current) {
          setEvent(eventData);
          await Promise.all([fetchFeedback(), fetchAttendees()]);
        }
      } catch (err) {
        if (isMounted.current) {
          setError(err.message || 'Failed to load data');
          setLoading(false);
        }
      }
    };

    fetchAllData();
  }, [id, user, isAdmin, navigate]);

  const fetchFeedback = async () => {
    try {
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('event_feedback')
        .select('id, rating, comments, submitted_at, profiles(id, full_name, avatar_url)')
        .eq('event_id', id)
        .order('submitted_at', { ascending: false });

      if (feedbackError) throw feedbackError;

      if (isMounted.current) {
        setFeedback(feedbackData || []);
        calculateStats(feedbackData || []);
        setLoading(false);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err.message || 'Failed to load feedback');
        setLoading(false);
      }
    }
  };

  const fetchAttendees = async () => {
    try {
      const { data: attendeeData, error: attendeeError } = await supabase
        .from('event_attendees')
        .select('id, attendance_status, registration_date, profiles(id, full_name, email)')
        .eq('event_id', id);

      if (attendeeError) throw attendeeError;

      if (isMounted.current) {
        setAttendees(attendeeData || []);
      }
    } catch (err) {
      if (isMounted.current) {
        setAttendees([]);
      }
    }
  };

  const calculateStats = (feedbackData) => {
    if (!feedbackData || feedbackData.length === 0) {
      setStats({ averageRating: 0, totalResponses: 0, commentsCount: 0 });
      return;
    }

    const totalResponses = feedbackData.length;
    const commentsCount = feedbackData.filter(item => item.comments).length;
    const totalRating = feedbackData.reduce((acc, item) => acc + item.rating, 0);
    const averageRating = totalResponses > 0 ? totalRating / totalResponses : 0;

    if (isMounted.current) {
        setStats({ averageRating, totalResponses, commentsCount });
    }
  };

  const exportFeedbackCSV = () => {
    const headers = ['Submitted At', 'Full Name', 'Rating', 'Comments'];
    const rows = feedback.map(item => [
      item.submitted_at ? formatInIST(item.submitted_at, 'yyyy-MM-dd HH:mm:ss') : 'N/A',
      item.profiles?.full_name || 'Anonymous',
      item.rating,
      `"${item.comments ? item.comments.replace(/"/g, '""') : ''}"`
    ]);

    let csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `event-feedback-${id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAttendeesCSV = () => {
    const headers = ['Full Name', 'Email', 'Attendance Status', 'Registration Date'];
    const rows = attendees.map(item => [
      item.profiles?.full_name || 'Anonymous',
      item.profiles?.email || '',
      item.attendance_status || '',
      item.registration_date ? formatInIST(item.registration_date, 'yyyy-MM-dd HH:mm:ss') : 'N/A',
    ]);

    let csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `event-attendees-${id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <LoadingSpinner message="Loading feedback data..." />;
  }

  if (error) {
    return <Alert severity="error" sx={{ m: 4 }}>{error}</Alert>;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        component={Link}
        to={`/events/${id}`}
        sx={{ mb: 3 }}
      >
        Back to Event
      </Button>

      <Paper elevation={1} sx={{ mb: 4, p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {event?.title || 'Event Feedback'}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {event?.date ? formatInIST(event.date, 'PPP') : 'Date not available'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Reports are generated per individual event. Open a specific event and its feedback dashboard to download feedback and attendee reports for that event.
        </Typography>
      </Paper>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={1} sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <StarIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Avg. Rating</Typography>
              </Box>
              <Typography variant="h3" fontWeight="bold">{stats.averageRating.toFixed(1)}</Typography>
              <Rating value={stats.averageRating} precision={0.5} readOnly />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={1} sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <PersonIcon color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6">Responses</Typography>
              </Box>
              <Typography variant="h3" fontWeight="bold">{stats.totalResponses}</Typography>
              <Typography variant="body2" color="text.secondary">Feedback submissions</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={1} sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <ChatBubbleIcon color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6">Comments</Typography>
              </Box>
              <Typography variant="h3" fontWeight="bold">{stats.commentsCount}</Typography>
              <Typography variant="body2" color="text.secondary">Written feedback received</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box display="flex" justifyContent="flex-end" mb={3} sx={{ gap: 2 }}>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<FileDownloadIcon />}
          onClick={exportFeedbackCSV}
          disabled={feedback.length === 0}
        >
          Export feedback CSV
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<FileDownloadIcon />}
          onClick={exportAttendeesCSV}
          disabled={attendees.length === 0}
        >
          Export attendees CSV
        </Button>
      </Box>

      <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box p={3} borderBottom={1} borderColor="divider">
          <Typography variant="h6">All Feedback</Typography>
        </Box>
        <List disablePadding>
          {feedback.map((item) => (
            <React.Fragment key={item.id}>
              <ListItem alignItems="flex-start" sx={{ py: 2, px: 3 }}>
                <ListItemAvatar>
                  <Avatar src={item.profiles?.avatar_url} alt={item.profiles?.full_name || 'User'}>
                    {(item.profiles?.full_name || 'U').charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle1">{item.profiles?.full_name || 'Anonymous User'}</Typography>
                      <Rating value={item.rating} readOnly size="small" />
                    </Box>
                  }
                  secondaryTypographyProps={{ component: 'div' }}
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {item.submitted_at ? formatInIST(item.submitted_at, 'PPP') : 'No date available'}
                      </Typography>
                      {item.comments && (
                        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{item.comments}</Typography>
                        </Paper>
                      )}
                    </>
                  }
                />
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Container>
  );
};

export default EventFeedbackDashboard;
