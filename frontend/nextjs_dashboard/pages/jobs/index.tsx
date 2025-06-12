/**
 * Jobs listing page for TalentTriage
 * 
 * This page displays all available jobs with filtering and sorting options.
 */
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  Box, 
  Typography, 
  Paper, 
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Divider,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  ArrowForward as ArrowIcon
} from '@mui/icons-material';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { supabase, Job } from '@/utils/supabase';

/**
 * JobsList page component
 */
export default function JobsList() {
  const router = useRouter();
  
  // State for jobs data
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for search
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch jobs data
  useEffect(() => {
    async function fetchJobs() {
      try {
        setLoading(true);
        
        // Fetch all jobs
        const { data: jobsData, error: jobsError } = await supabase
          .from('job')
          .select('*, uploads(count)')
          .order('created_at', { ascending: false });
        
        if (jobsError) throw jobsError;
        
        setJobs(jobsData || []);
        setFilteredJobs(jobsData || []);
        
      } catch (err) {
        console.error('Error fetching jobs:', err);
        setError('Failed to load jobs data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchJobs();
  }, []);
  
  // Filter jobs when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredJobs(jobs);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = jobs.filter(job => {
      // Search in title
      if (job.title.toLowerCase().includes(query)) return true;
      
      // Search in description
      if (job.description.toLowerCase().includes(query)) return true;
      
      // Search in skills
      if (job.required_skills && job.required_skills.some(skill => 
        skill.toLowerCase().includes(query)
      )) return true;
      
      return false;
    });
    
    setFilteredJobs(filtered);
  }, [searchQuery, jobs]);
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <Layout title="Jobs">
      {/* Header with search and add button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1">
          All Jobs
        </Typography>
        
        <Link href="/jobs/new" passHref>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
          >
            Add Job
          </Button>
        </Link>
      </Box>
      
      {/* Search box */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search jobs by title, description, or skills..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>
      
      {/* Jobs list */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>
      ) : filteredJobs.length > 0 ? (
        <Grid container spacing={3}>
          {filteredJobs.map(job => (
            <Grid item xs={12} md={6} lg={4} key={job.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {job.title}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Created: {formatDate(job.created_at)}
                  </Typography>
                  
                  {job.min_years_experience && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Experience: {job.min_years_experience}+ years
                    </Typography>
                  )}
                  
                  <Box sx={{ my: 2 }}>
                    <Typography variant="body2" noWrap sx={{ mb: 1 }}>
                      {job.description.substring(0, 100)}
                      {job.description.length > 100 ? '...' : ''}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                    {job.required_skills && job.required_skills.slice(0, 3).map((skill, index) => (
                      <Chip 
                        key={index} 
                        label={skill} 
                        size="small" 
                        variant="outlined" 
                      />
                    ))}
                    {job.required_skills && job.required_skills.length > 3 && (
                      <Chip 
                        label={`+${job.required_skills.length - 3}`} 
                        size="small" 
                        variant="outlined" 
                        color="primary"
                      />
                    )}
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary">
                    {job.uploads?.count || 0} candidate{(job.uploads?.count !== 1) ? 's' : ''}
                  </Typography>
                </CardContent>
                
                <CardActions>
                  <Button 
                    size="small" 
                    endIcon={<ArrowIcon />}
                    onClick={() => router.push(`/job/${job.id}`)}
                  >
                    View Details
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" paragraph>
            No jobs found
          </Typography>
          {searchQuery ? (
            <Typography variant="body1">
              No jobs match your search criteria. Try a different search or clear the filter.
            </Typography>
          ) : (
            <>
              <Typography variant="body1" paragraph>
                You haven't created any jobs yet. Create your first job to get started.
              </Typography>
              <Link href="/jobs/new" passHref>
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />}
                >
                  Add Job
                </Button>
              </Link>
            </>
          )}
        </Paper>
      )}
    </Layout>
  );
}
