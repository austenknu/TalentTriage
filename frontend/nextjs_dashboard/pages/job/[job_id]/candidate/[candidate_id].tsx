/**
 * Candidate detail page for TalentTriage
 * 
 * This page displays detailed information about a specific candidate,
 * including their resume data, scores, and comparison to job requirements.
 */
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  Box, 
  Grid, 
  Typography, 
  Paper, 
  Button,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  Card,
  CardContent,
  Link as MuiLink
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  School as EducationIcon,
  Work as WorkIcon
} from '@mui/icons-material';
import Link from 'next/link';
import Layout from '@/components/Layout';
import ScoreRadar from '@/components/ScoreRadar';
import { supabase, Job, CandidateWithScore, getFileUrl } from '@/utils/supabase';

/**
 * CandidateDetail page component
 */
export default function CandidateDetail() {
  const router = useRouter();
  const { job_id, candidate_id } = router.query;
  
  // State for candidate and job data
  const [candidate, setCandidate] = useState<CandidateWithScore | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [averageScores, setAverageScores] = useState({
    semantic_score: 0,
    skills_score: 0,
    experience_score: 0,
    education_score: 0,
    composite_score: 0
  });
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch candidate and job data
  useEffect(() => {
    async function fetchData() {
      if (!job_id || !candidate_id) return;
      
      try {
        setLoading(true);
        
        // Fetch candidate details
        const { data: candidateData, error: candidateError } = await supabase
          .from('parsed_resume')
          .select(`
            *,
            score:candidate_score(*),
            upload:uploads(*)
          `)
          .eq('candidate_id', candidate_id)
          .single();
        
        if (candidateError) throw candidateError;
        if (!candidateData) throw new Error('Candidate not found');
        
        // Parse JSON strings
        const formattedCandidate = {
          ...candidateData,
          work_experience: candidateData.work_experience ? JSON.parse(candidateData.work_experience) : [],
          education: candidateData.education ? JSON.parse(candidateData.education) : []
        };
        
        setCandidate(formattedCandidate);
        
        // Fetch job details
        const { data: jobData, error: jobError } = await supabase
          .from('job')
          .select('*')
          .eq('id', job_id)
          .single();
        
        if (jobError) throw jobError;
        if (!jobData) throw new Error('Job not found');
        
        setJob(jobData);
        
        // Fetch average scores for this job
        const { data: avgScores, error: avgError } = await supabase
          .from('candidate_score')
          .select(`
            semantic_score,
            skills_score,
            experience_score,
            education_score,
            composite_score
          `)
          .eq('job_id', job_id);
        
        if (avgError) throw avgError;
        
        if (avgScores && avgScores.length > 0) {
          // Calculate averages
          const avgData = {
            semantic_score: 0,
            skills_score: 0,
            experience_score: 0,
            education_score: 0,
            composite_score: 0
          };
          
          avgScores.forEach(score => {
            avgData.semantic_score += score.semantic_score;
            avgData.skills_score += score.skills_score;
            avgData.experience_score += score.experience_score;
            avgData.education_score += score.education_score;
            avgData.composite_score += score.composite_score;
          });
          
          // Calculate averages
          const count = avgScores.length;
          Object.keys(avgData).forEach(key => {
            avgData[key as keyof typeof avgData] /= count;
          });
          
          setAverageScores(avgData);
        }
        
        // Get signed URL for resume file
        if (formattedCandidate.upload && formattedCandidate.upload.file_key) {
          try {
            const url = await getFileUrl(formattedCandidate.upload.file_key);
            setResumeUrl(url);
          } catch (urlErr) {
            console.error('Error getting resume URL:', urlErr);
          }
        }
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load candidate data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [job_id, candidate_id]);
  
  // Format score as percentage
  const formatScore = (score: number) => {
    return `${(score * 100).toFixed(1)}%`;
  };
  
  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'top':
        return 'success';
      case 'moderate':
        return 'warning';
      case 'reject':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Layout title={candidate ? `Candidate: ${candidate.name || 'Unnamed'}` : 'Candidate Details'}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>
      ) : candidate && job ? (
        <>
          {/* Back button */}
          <Box sx={{ mb: 3 }}>
            <Link href={`/job/${job_id}`} passHref>
              <Button startIcon={<BackIcon />} variant="outlined">
                Back to Job
              </Button>
            </Link>
          </Box>
          
          {/* Candidate Header */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h5" component="h1">
                    {candidate.name || 'Unnamed Candidate'}
                  </Typography>
                  {candidate.score && (
                    <Chip 
                      label={candidate.score.category} 
                      color={getCategoryColor(candidate.score.category) as any}
                      sx={{ ml: 2 }}
                    />
                  )}
                </Box>
                
                {/* Contact Info */}
                <Box sx={{ mb: 3 }}>
                  {candidate.email && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <EmailIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      <MuiLink href={`mailto:${candidate.email}`}>
                        {candidate.email}
                      </MuiLink>
                    </Box>
                  )}
                  {candidate.phone && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        {candidate.phone}
                      </Typography>
                    </Box>
                  )}
                </Box>
                
                {/* Skills */}
                <Typography variant="subtitle1" gutterBottom>
                  Skills
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                  {candidate.skills && candidate.skills.length > 0 ? (
                    candidate.skills.map((skill, index) => (
                      <Chip 
                        key={index} 
                        label={skill} 
                        variant="outlined" 
                        size="small"
                        color={job.required_skills.includes(skill) ? 'primary' : 'default'}
                      />
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No skills extracted
                    </Typography>
                  )}
                </Box>
                
                {/* Experience */}
                <Typography variant="subtitle1" gutterBottom>
                  Experience
                </Typography>
                {candidate.total_years_exp > 0 && (
                  <Typography variant="body2" paragraph>
                    Total: <strong>{candidate.total_years_exp} years</strong>
                  </Typography>
                )}
                {candidate.work_experience && candidate.work_experience.length > 0 ? (
                  <List dense disablePadding>
                    {candidate.work_experience.map((exp: any, index: number) => (
                      <ListItem key={index} disablePadding sx={{ mb: 1 }}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <WorkIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                              <Typography variant="body1">
                                {exp.title} {exp.company && `at ${exp.company}`}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            (exp.start || exp.end) ? 
                            `${exp.start || 'N/A'} - ${exp.end || 'Present'}` : 
                            null
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No experience data extracted
                  </Typography>
                )}
                
                {/* Education */}
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
                  Education
                </Typography>
                {candidate.education && candidate.education.length > 0 ? (
                  <List dense disablePadding>
                    {candidate.education.map((edu: any, index: number) => (
                      <ListItem key={index} disablePadding sx={{ mb: 1 }}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <EducationIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                              <Typography variant="body1">
                                {edu.degree} {edu.institution && `from ${edu.institution}`}
                              </Typography>
                            </Box>
                          }
                          secondary={edu.year ? `Year: ${edu.year}` : null}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No education data extracted
                  </Typography>
                )}
              </Grid>
              
              <Grid item xs={12} md={4}>
                {/* Score Summary */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Match Scores
                    </Typography>
                    
                    {candidate.score ? (
                      <>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">Overall:</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {formatScore(candidate.score.composite_score)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">Semantic:</Typography>
                          <Typography variant="body2">
                            {formatScore(candidate.score.semantic_score)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">Skills:</Typography>
                          <Typography variant="body2">
                            {formatScore(candidate.score.skills_score)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">Experience:</Typography>
                          <Typography variant="body2">
                            {formatScore(candidate.score.experience_score)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Education:</Typography>
                          <Typography variant="body2">
                            {formatScore(candidate.score.education_score)}
                          </Typography>
                        </Box>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No scores available
                      </Typography>
                    )}
                  </CardContent>
                </Card>
                
                {/* Resume Link */}
                {resumeUrl && (
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Original Resume
                      </Typography>
                      <Button 
                        variant="contained" 
                        fullWidth
                        href={resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Resume
                      </Button>
                    </CardContent>
                  </Card>
                )}
                
                {/* Upload Info */}
                {candidate.upload && (
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        File Details
                      </Typography>
                      <Typography variant="body2">
                        Filename: {candidate.upload.original_filename}
                      </Typography>
                      <Typography variant="body2">
                        Size: {(candidate.upload.file_size / 1024).toFixed(2)} KB
                      </Typography>
                      <Typography variant="body2">
                        Uploaded: {new Date(candidate.upload.created_at).toLocaleString()}
                      </Typography>
                      <Typography variant="body2">
                        Status: {candidate.upload.status}
                      </Typography>
                    </CardContent>
                  </Card>
                )}
              </Grid>
            </Grid>
          </Paper>
          
          {/* Score Radar Chart */}
          {candidate.score && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <ScoreRadar 
                  candidateScore={candidate.score} 
                  averageScores={averageScores}
                  candidateName={candidate.name || 'Candidate'}
                />
              </Grid>
            </Grid>
          )}
          
          {/* Raw Text */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Extracted Text
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ 
              whiteSpace: 'pre-wrap', 
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              p: 2,
              backgroundColor: 'grey.100',
              borderRadius: 1,
              maxHeight: '400px',
              overflow: 'auto'
            }}>
              {candidate.raw_text || 'No text extracted'}
            </Box>
          </Paper>
        </>
      ) : (
        <Alert severity="error">Candidate not found</Alert>
      )}
    </Layout>
  );
}
