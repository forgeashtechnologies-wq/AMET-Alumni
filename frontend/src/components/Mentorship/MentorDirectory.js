import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { Container, Typography, Grid, Card, CardContent, CardActions, Button, Chip, Box, CircularProgress } from '@mui/material';

const MentorDirectory = () => {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMentors = async () => {
      setLoading(true);
      try {
        // Fetch mentor profiles that are approved
        const { data: mentorData, error: mentorError } = await supabase
          .from('mentors')
          .select(`
            user_id,
            status,
            expertise,
            mentoring_statement,
            profiles ( full_name, avatar_url, headline )
          `)
          .eq('status', 'approved');

        if (mentorError) {
          throw mentorError;
        }

        setMentors(mentorData);
      } catch (err) {
        setError(err.message);
        logger.error('Error fetching mentors:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMentors();
  }, []);

  if (loading) {
    return <Container sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Container>;
  }

  if (error) {
    return <Container><Typography color="error">Error loading mentors: {error}</Typography></Container>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Mentor Directory
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Find and connect with experienced mentors from our community.
      </Typography>

      <Grid container spacing={4}>
        {mentors.length > 0 ? (
          mentors.map((mentor) => (
            <Grid item key={mentor.user_id} xs={12} sm={6} md={4}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <img src={mentor.profiles?.avatar_url || `https://api.dicebear.com/6.x/initials/svg?seed=${mentor.profiles?.full_name}`} alt={mentor.profiles?.full_name} style={{ width: 60, height: 60, borderRadius: '50%', marginRight: 16 }} />
                    <Box>
                      <Typography variant="h6">{mentor.profiles?.full_name}</Typography>
                      <Typography color="text.secondary" variant="body2">{mentor.profiles?.headline}</Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: '60px' }}>
                    {mentor.mentoring_statement ? `${mentor.mentoring_statement.substring(0, 100)}...` : 'No statement provided.'}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {mentor.expertise?.slice(0, 3).map((exp, index) => (
                      <Chip key={index} label={exp} size="small" />
                    ))}
                  </Box>
                </CardContent>
                <CardActions>
                  <Button component={Link} to={`/mentorship/mentor/${mentor.user_id}`} size="small" variant="contained">
                    View Profile
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))
        ) : (
          <Typography sx={{ ml: 3 }}>No approved mentors found at this time.</Typography>
        )}
      </Grid>
    </Container>
  );
};

export default MentorDirectory;
