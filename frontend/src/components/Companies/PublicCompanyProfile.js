import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Chip,
  Divider,
  Button,
  Avatar,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Building,
  Globe,
  MapPin,
  Calendar,
  Users,
  Briefcase,
  Mail,
  Phone,
  Linkedin,
  Twitter,
  Facebook,
  Instagram
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import logger from '../../utils/logger';

const PublicCompanyProfile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [company, setCompany] = useState(null);
  const [jobPostings, setJobPostings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCompanyData();
  }, [id]);

  const fetchCompanyData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch company details
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();

      if (companyError) throw companyError;
      
      if (!companyData) {
        setError('Company not found');
        setLoading(false);
        return;
      }

      // Only allow public profiles to be viewed unless the viewer is the owner or an admin
      if (!companyData.public_profile && 
          (!user || (user.id !== companyData.user_id && !user.is_admin))) {
        setError('This company profile is private');
        setLoading(false);
        return;
      }

      setCompany(companyData);

      // Fetch job postings for this company
      const { data: jobData, error: jobError } = await supabase
        .from('job_postings')
        .select('*')
        .eq('company_id', id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (!jobError) {
        setJobPostings(jobData || []);
      }

      setLoading(false);
    } catch (err) {
      logger.error('Error fetching company data:', err);
      setError('Failed to load company profile');
      setLoading(false);
    }
  };

  const getSocialIcon = (platform) => {
    switch (platform.toLowerCase()) {
      case 'linkedin':
        return <Linkedin size={18} />;
      case 'twitter':
        return <Twitter size={18} />;
      case 'facebook':
        return <Facebook size={18} />;
      case 'instagram':
        return <Instagram size={18} />;
      default:
        return <Globe size={18} />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Box sx={{ mt: 2 }}>
          <Button component={Link} to="/companies" variant="outlined">
            Back to Companies
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ overflow: 'hidden', mb: 4, borderRadius: 2 }}>
        {/* Cover and Logo Section */}
        <Box 
          sx={{ 
            height: { xs: 140, sm: 180, md: 200 },
            bgcolor: 'primary.main', 
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-end'
          }}
        >
          {/* Company Logo */}
          <Avatar
            src={company.logo_url}
            alt={company.name}
            sx={{
              width: { xs: 72, sm: 100, md: 120 },
              height: { xs: 72, sm: 100, md: 120 },
              border: '4px solid white',
              position: 'absolute',
              bottom: { xs: -30, sm: -36, md: -40 },
              left: { xs: 16, sm: 24, md: 40 },
              bgcolor: 'white'
            }}
          >
            {company.name.charAt(0)}
          </Avatar>
          
          {/* Edit Button (if owner) */}
          {user && (user.id === company.user_id || user.is_admin) && (
            <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
              <Button 
                component={Link}
                to="/company/edit"
                variant="contained"
                color="secondary"
              >
                Edit Profile
              </Button>
            </Box>
          )}
        </Box>
        
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, pt: { xs: 6, sm: 8 } }}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={8}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', mr: 2 }}>
                  {company.name}
                </Typography>
                {company.verified && (
                  <Chip 
                    label="Verified" 
                    color="primary" 
                    size="small" 
                    sx={{ fontWeight: 'bold' }}
                  />
                )}
              </Box>
              
              <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {company.industry && (
                  <Chip 
                    icon={<Briefcase size={16} />} 
                    label={company.industry} 
                    variant="outlined" 
                    size="small" 
                  />
                )}
                {company.location && (
                  <Chip 
                    icon={<MapPin size={16} />} 
                    label={company.location} 
                    variant="outlined" 
                    size="small" 
                  />
                )}
                {company.size && (
                  <Chip 
                    icon={<Users size={16} />} 
                    label={company.size} 
                    variant="outlined" 
                    size="small" 
                  />
                )}
                {company.founded_year && (
                  <Chip 
                    icon={<Calendar size={16} />} 
                    label={`Founded ${company.founded_year}`} 
                    variant="outlined" 
                    size="small" 
                  />
                )}
              </Box>
              
              <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 1 }}>
                About
              </Typography>
              <Typography variant="body1" sx={{ mb: 3, whiteSpace: 'pre-line' }}>
                {company.description || 'No company description available.'}
              </Typography>
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" gutterBottom>
                Current Openings
              </Typography>
              
              {jobPostings.length > 0 ? (
                <Grid container spacing={2}>
                  {jobPostings.map(job => (
                    <Grid item xs={12} sm={6} key={job.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" component={Link} to={`/jobs/${job.id}`} sx={{ textDecoration: 'none', color: 'primary.main' }}>
                            {job.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {job.location} • {job.job_type}
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                            {job.skills && job.skills.slice(0, 3).map((skill, index) => (
                              <Chip key={index} label={skill} size="small" />
                            ))}
                            {job.skills && job.skills.length > 3 && (
                              <Typography variant="body2" color="text.secondary">
                                +{job.skills.length - 3} more
                              </Typography>
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Alert severity="info">
                  No open positions at the moment. Check back later!
                </Alert>
              )}
            </Grid>
            
            {/* Sidebar */}
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Company Information
                </Typography>
                <List dense disablePadding>
                  {company.website && (
                    <ListItem disablePadding sx={{ py: 1 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Globe size={18} />
                      </ListItemIcon>
                      <ListItemText 
                        primary={
                          <a 
                            href={company.website.startsWith('http') ? company.website : `https://${company.website}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: 'inherit', textDecoration: 'none' }}
                          >
                            {company.website}
                          </a>
                        }
                      />
                    </ListItem>
                  )}
                  {company.contact_email && (
                    <ListItem disablePadding sx={{ py: 1 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Mail size={18} />
                      </ListItemIcon>
                      <ListItemText 
                        primary={
                          <a 
                            href={`mailto:${company.contact_email}`} 
                            style={{ color: 'inherit', textDecoration: 'none' }}
                          >
                            {company.contact_email}
                          </a>
                        }
                      />
                    </ListItem>
                  )}
                  {company.contact_phone && (
                    <ListItem disablePadding sx={{ py: 1 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Phone size={18} />
                      </ListItemIcon>
                      <ListItemText 
                        primary={
                          <a 
                            href={`tel:${company.contact_phone}`} 
                            style={{ color: 'inherit', textDecoration: 'none' }}
                          >
                            {company.contact_phone}
                          </a>
                        }
                      />
                    </ListItem>
                  )}
                </List>
              </Paper>
              
              {/* Social Media Links */}
              {company.social_links && Object.keys(company.social_links).length > 0 && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Connect With Us
                  </Typography>
                  <List dense disablePadding>
                    {Object.entries(company.social_links).map(([platform, url]) => (
                      <ListItem disablePadding key={platform} sx={{ py: 1 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {getSocialIcon(platform)}
                        </ListItemIcon>
                        <ListItemText 
                          primary={
                            <a 
                              href={url.startsWith('http') ? url : `https://${url}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ color: 'inherit', textDecoration: 'none' }}
                            >
                              {platform.charAt(0).toUpperCase() + platform.slice(1)}
                            </a>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}
              
              {/* Call to Action */}
              <Box sx={{ mt: 3, textAlign: 'center' }}>
                {jobPostings.length > 0 ? (
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    component={Link}
                    to={`/jobs?company=${company.id}`}
                  >
                    View All {jobPostings.length} Jobs
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    component={Link}
                    to="/companies"
                    fullWidth
                  >
                    Explore Other Companies
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default PublicCompanyProfile;
