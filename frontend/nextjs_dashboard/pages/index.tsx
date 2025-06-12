/**
 * Home page / Dashboard for TalentTriage
 * 
 * This is the main dashboard page showing an overview of jobs and candidates.
 */
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Typography, 
  Card, 
  CardContent, 
  Button,
  Paper,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Work as WorkIcon,
  Person as PersonIcon,
  Description as FileIcon
} from '@mui/icons-material';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { supabase, Job } from '@/utils/supabase';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Dashboard stats interface
interface DashboardStats {
  totalJobs: number;
  totalCandidates: number;
  totalResumes: number;
  candidatesByCategory: {
    top: number;
    moderate: number;
    reject: number;
  };
  recentJobs: Job[];
  processingStatus: {
    stored: number;
    parsed: number;
    embedded: number;
    scored: number;
    error: number;
  };
}

/**
 * Home page component
 */
export default function Home() {
  // State for dashboard stats
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard stats
  useEffect(() => {
    async function fetchDashboardStats() {
      try {
        setLoading(true);
        
        // Get total jobs count
        const { count: jobsCount, error: jobsError } = await supabase
          .from('job')
          .select('*', { count: 'exact', head: true });
        
        if (jobsError) throw jobsError;
        
        // Get total candidates count
        const { count: candidatesCount, error: candidatesError } = await supabase
          .from('parsed_resume')
          .select('*', { count: 'exact', head: true });
        
        if (candidatesError) throw candidatesError;
        
        // Get total resumes count
        const { count: resumesCount, error: resumesError } = await supabase
          .from('uploads')
          .select('*', { count: 'exact', head: true });
        
        if (resumesError) throw resumesError;
        
        // Get candidates by category
        const { data: categoryData, error: categoryError } = await supabase
          .from('candidate_score')
          .select('category');
        
        if (categoryError) throw categoryError;
        
        const categoryCount = {
          top: 0,
          moderate: 0,
          reject: 0
        };
        
        if (categoryData) {
          categoryData.forEach((item: any) => {
            const category = item.category.toLowerCase();
            if (category in categoryCount) {
              categoryCount[category as keyof typeof categoryCount]++;
            }
          });
        }
        
        // Get recent jobs
        const { data: recentJobs, error: recentJobsError } = await supabase
          .from('job')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (recentJobsError) throw recentJobsError;
        
        // Get processing status counts
        const { data: statusData, error: statusError } = await supabase
          .from('uploads')
          .select('status');
        
        if (statusError) throw statusError;
        
        const statusCount = {
          stored: 0,
          parsed: 0,
          embedded: 0,
          scored: 0,
          error: 0
        };
        
        if (statusData) {
          statusData.forEach((item: any) => {
            const status = item.status.toLowerCase();
            if (status in statusCount) {
              statusCount[status as keyof typeof statusCount]++;
            }
          });
        }
        
        // Set dashboard stats
        setStats({
          totalJobs: jobsCount || 0,
          totalCandidates: candidatesCount || 0,
          totalResumes: resumesCount || 0,
          candidatesByCategory: categoryCount,
          recentJobs: recentJobs || [],
          processingStatus: statusCount
        });
        
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchDashboardStats();
  }, []);

  // Prepare chart data for candidates by category
  const categoryChartData = {
    labels: ['Top', 'Moderate', 'Reject'],
    datasets: [
      {
        data: stats ? [
          stats.candidatesByCategory.top,
          stats.candidatesByCategory.moderate,
          stats.candidatesByCategory.reject
        ] : [0, 0, 0],
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

  // Prepare chart data for processing status
  const statusChartData = {
    labels: ['Stored', 'Parsed', 'Embedded', 'Scored', 'Error'],
    datasets: [
      {
        label: 'Resumes',
        data: stats ? [
          stats.processingStatus.stored,
          stats.processingStatus.parsed,
          stats.processingStatus.embedded,
          stats.processingStatus.scored,
          stats.processingStatus.error
        ] : [0, 0, 0, 0, 0],
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }
    ]
  };

  return (
    <Layout title="Dashboard">
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>
      ) : (
        <>
          {/* Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                  <WorkIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h4" component="div">
                      {stats?.totalJobs || 0}
                    </Typography>
                    <Typography color="textSecondary">
                      Active Jobs
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                  <PersonIcon sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h4" component="div">
                      {stats?.totalCandidates || 0}
                    </Typography>
                    <Typography color="textSecondary">
                      Candidates
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                  <FileIcon sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h4" component="div">
                      {stats?.totalResumes || 0}
                    </Typography>
                    <Typography color="textSecondary">
                      Resumes Processed
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* Charts */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Candidates by Category
                </Typography>
                <Box sx={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {stats && (stats.candidatesByCategory.top + stats.candidatesByCategory.moderate + stats.candidatesByCategory.reject) > 0 ? (
                    <Pie data={categoryChartData} options={{ maintainAspectRatio: false }} />
                  ) : (
                    <Typography color="textSecondary">No candidate data available</Typography>
                  )}
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Resume Processing Status
                </Typography>
                <Box sx={{ height: 300 }}>
                  {stats && stats.totalResumes > 0 ? (
                    <Bar 
                      data={statusChartData} 
                      options={{ 
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true
                          }
                        }
                      }} 
                    />
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <Typography color="textSecondary">No resume data available</Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
          
          {/* Recent Jobs */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Recent Jobs
              </Typography>
              <Link href="/jobs/new" passHref>
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />}
                  size="small"
                >
                  Add Job
                </Button>
              </Link>
            </Box>
            
            {stats?.recentJobs && stats.recentJobs.length > 0 ? (
              <Box>
                {stats.recentJobs.map((job, index) => (
                  <React.Fragment key={job.id}>
                    <Box sx={{ py: 2 }}>
                      <Link href={`/job/${job.id}`} passHref style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Box sx={{ cursor: 'pointer' }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                            {job.title}
                          </Typography>
                          <Typography variant="body2" color="textSecondary" noWrap>
                            {job.required_skills.join(', ')}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Created: {new Date(job.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Link>
                    </Box>
                    {index < stats.recentJobs.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </Box>
            ) : (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography color="textSecondary">
                  No jobs available. Create your first job to get started.
                </Typography>
                <Link href="/jobs/new" passHref>
                  <Button 
                    variant="contained" 
                    startIcon={<AddIcon />}
                    sx={{ mt: 2 }}
                  >
                    Add Job
                  </Button>
                </Link>
              </Box>
            )}
          </Paper>
        </>
      )}
    </Layout>
  );
}
