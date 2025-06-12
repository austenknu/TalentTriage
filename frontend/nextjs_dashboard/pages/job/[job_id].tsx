/**
 * Job-specific page for TalentTriage
 * 
 * This page displays details about a specific job and its candidates.
 */
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  Box, 
  Grid, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  Chip,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Card,
  CardContent
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { Bar } from 'react-chartjs-2';
import Layout from '@/components/Layout';
import CandidateTable from '@/components/CandidateTable';
import UploadDropZone from '@/components/UploadDropZone';
import { supabase, Job, CandidateWithScore } from '@/utils/supabase';

// Tab panel props interface
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Tab panel component
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`job-tabpanel-${index}`}
      aria-labelledby={`job-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

/**
 * Job page component
 */
export default function JobPage() {
  const router = useRouter();
  const { job_id } = router.query;
  
  // State for job data
  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<CandidateWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for tabs
  const [tabValue, setTabValue] = useState(0);
  
  // State for category counts
  const [categoryCounts, setCategoryCounts] = useState({
    top: 0,
    moderate: 0,
    reject: 0
  });
  
  // Fetch job data and candidates
  useEffect(() => {
    async function fetchJobData() {
      if (!job_id) return;
      
      try {
        setLoading(true);
        
        // Fetch job details
        const { data: jobData, error: jobError } = await supabase
          .from('job')
          .select('*')
          .eq('id', job_id)
          .single();
        
        if (jobError) throw jobError;
        if (!jobData) throw new Error('Job not found');
        
        setJob(jobData);
        
        // Fetch candidates with scores for this job
        const { data: candidateData, error: candidateError } = await supabase
          .from('parsed_resume')
          .select(`
            *,
            score:candidate_score(*),
            upload:uploads(*)
          `)
          .eq('job_id', job_id);
        
        if (candidateError) throw candidateError;
        
        // Process and format candidate data
        const formattedCandidates = candidateData.map((candidate: any) => ({
          ...candidate,
          work_experience: candidate.work_experience ? JSON.parse(candidate.work_experience) : [],
          education: candidate.education ? JSON.parse(candidate.education) : []
        }));
        
        setCandidates(formattedCandidates);
        
        // Count candidates by category
        const counts = {
          top: 0,
          moderate: 0,
          reject: 0
        };
        
        formattedCandidates.forEach((candidate: any) => {
          if (candidate.score && candidate.score.category) {
            const category = candidate.score.category.toLowerCase();
            if (category in counts) {
              counts[category as keyof typeof counts]++;
            }
          }
        });
        
        setCategoryCounts(counts);
        
      } catch (err) {
        console.error('Error fetching job data:', err);
        setError('Failed to load job data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchJobData();
  }, [job_id]);
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Handle refresh
  const handleRefresh = () => {
    if (job_id) {
      router.replace(router.asPath);
    }
  };
  
  // Handle upload complete
  const handleUploadComplete = (count: number) => {
    // Show success message
    alert(`${count} files uploaded successfully! Processing will begin shortly.`);
    
    // Refresh after a delay to allow processing to start
    setTimeout(handleRefresh, 2000);
  };
  
  // Prepare chart data for candidates by category
  const categoryChartData = {
    labels: ['Top', 'Moderate', 'Reject'],
    datasets: [
      {
        label: 'Candidates',
        data: [
          categoryCounts.top,
          categoryCounts.moderate,
          categoryCounts.reject
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(255, 99, 132, 0.6)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(255, 99, 132, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  return (
    <Layout title={job ? `Job: ${job.title}` : 'Job Details'}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>
      ) : job ? (
        <>
          {/* Job Header */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="h5" component="h1" gutterBottom>
                  {job.title}
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    Created: {new Date(job.created_at).toLocaleDateString()}
                  </Typography>
                  {job.min_years_experience && (
                    <Typography variant="body2" color="textSecondary">
                      Experience Required: {job.min_years_experience} years
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {job.required_skills && job.required_skills.map((skill, index) => (
                    <Chip 
                      key={index} 
                      label={skill} 
                      color="primary" 
                      variant="outlined" 
                      size="small" 
                    />
                  ))}
                </Box>
              </Box>
              <Box>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  sx={{ mr: 1 }}
                  onClick={() => router.push(`/job/${job_id}/edit`)}
                >
                  Edit
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefresh}
                >
                  Refresh
                </Button>
              </Box>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle1" gutterBottom>
              Job Description
            </Typography>
            <Typography variant="body2" paragraph>
              {job.description}
            </Typography>
          </Paper>
          
          {/* Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Total Candidates
                  </Typography>
                  <Typography variant="h3" component="div">
                    {candidates.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Top Candidates
                  </Typography>
                  <Typography variant="h3" component="div" sx={{ color: 'success.main' }}>
                    {categoryCounts.top}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Category Distribution
                  </Typography>
                  <Box sx={{ height: 100 }}>
                    <Bar 
                      data={categoryChartData} 
                      options={{ 
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true
                          }
                        }
                      }} 
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* Tabs */}
          <Paper sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange}
                aria-label="job tabs"
              >
                <Tab label="Candidates" id="job-tab-0" />
                <Tab label="Upload Resumes" id="job-tab-1" />
              </Tabs>
            </Box>
            
            {/* Candidates Tab */}
            <TabPanel value={tabValue} index={0}>
              {candidates.length > 0 ? (
                <CandidateTable candidates={candidates} jobId={job_id as string} />
              ) : (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography variant="body1" paragraph>
                    No candidates found for this job.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<UploadIcon />}
                    onClick={() => setTabValue(1)}
                  >
                    Upload Resumes
                  </Button>
                </Box>
              )}
            </TabPanel>
            
            {/* Upload Tab */}
            <TabPanel value={tabValue} index={1}>
              <Typography variant="h6" gutterBottom>
                Upload Resumes
              </Typography>
              <Typography variant="body2" paragraph>
                Upload candidate resumes in PDF or DOCX format. Files will be automatically processed and scored against this job description.
              </Typography>
              <UploadDropZone jobId={job_id as string} onUploadComplete={handleUploadComplete} />
            </TabPanel>
          </Paper>
        </>
      ) : (
        <Alert severity="error">Job not found</Alert>
      )}
    </Layout>
  );
}
