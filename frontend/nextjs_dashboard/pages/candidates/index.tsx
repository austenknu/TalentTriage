/**
 * Candidates page for TalentTriage
 * 
 * This page displays a list of all candidates across all jobs.
 */
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Search as SearchIcon
} from '@mui/icons-material';
import Layout from '@/components/Layout';
import CandidateTable from '@/components/CandidateTable';
import { supabase, CandidateWithScore } from '@/utils/supabase';

/**
 * Candidates page component
 */
export default function CandidatesPage() {
  // State for candidates data
  const [candidates, setCandidates] = useState<CandidateWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch all candidates
  useEffect(() => {
    async function fetchCandidates() {
      try {
        setLoading(true);
        
        // Fetch candidates with scores across all jobs
        const { data: candidateData, error: candidateError } = await supabase
          .from('parsed_resume')
          .select(`
            candidate_id,
            job_id,
            upload_id,
            raw_text,
            name,
            email,
            phone,
            skills,
            work_experience,
            education,
            total_years_exp,
            created_at,
            updated_at,
            candidate_score(id, candidate_id, job_id, semantic_score, skills_score, experience_score, education_score, composite_score, category),
            uploads(id, file_key, original_filename, status)
          `);
        
        if (candidateError) throw candidateError;
        
        // Process and format candidate data
        const formattedCandidates = candidateData.map((candidate: any) => ({
          ...candidate,
          // Parse JSON strings if they're stored as strings
          work_experience: typeof candidate.work_experience === 'string' ? 
            JSON.parse(candidate.work_experience) : candidate.work_experience || [],
          education: typeof candidate.education === 'string' ? 
            JSON.parse(candidate.education) : candidate.education || [],
          // Rename fields to match expected structure
          score: candidate.candidate_score?.[0] || null,
          upload: candidate.uploads?.[0] || null
        }));
        
        setCandidates(formattedCandidates);
        
      } catch (err) {
        console.error('Error fetching candidates:', err);
        setError('Failed to load candidates data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchCandidates();
  }, []);
  
  // Filter candidates based on search term
  const filteredCandidates = candidates.filter(candidate => {
    const searchLower = searchTerm.toLowerCase();
    
    // Search in name, email, skills
    return (
      (candidate.name && candidate.name.toLowerCase().includes(searchLower)) ||
      (candidate.email && candidate.email.toLowerCase().includes(searchLower)) ||
      (candidate.skills && 
        Array.isArray(candidate.skills) && 
        candidate.skills.some(skill => skill.toLowerCase().includes(searchLower)))
    );
  });
  
  // Count candidates by category
  const categoryCounts = {
    top: candidates.filter(c => c.score?.category === 'top').length,
    moderate: candidates.filter(c => c.score?.category === 'moderate').length,
    reject: candidates.filter(c => c.score?.category === 'reject').length,
    unscored: candidates.filter(c => !c.score).length
  };

  return (
    <Layout title="Candidates | TalentTriage">
      <Box sx={{ width: '100%', mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          All Candidates
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          View and manage all candidates across all job postings
        </Typography>
        
        {/* Stats cards */}
        <Grid container spacing={3} sx={{ mt: 1, mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="h6" color="text.secondary">Total Candidates</Typography>
              <Typography variant="h3">{candidates.length}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="h6" color="text.secondary">Top Candidates</Typography>
              <Typography variant="h3" color="success.main">{categoryCounts.top}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="h6" color="text.secondary">Moderate Fit</Typography>
              <Typography variant="h3" color="warning.main">{categoryCounts.moderate}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="h6" color="text.secondary">Not Recommended</Typography>
              <Typography variant="h3" color="error.main">{categoryCounts.reject}</Typography>
            </Paper>
          </Grid>
        </Grid>
        
        {/* Search and filters */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search candidates by name, email, or skills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        
        {/* Status chips */}
        <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip 
            label={`All (${candidates.length})`} 
            color="primary" 
            variant={searchTerm === '' ? 'filled' : 'outlined'} 
            onClick={() => setSearchTerm('')}
          />
          <Chip 
            label={`Top (${categoryCounts.top})`} 
            color="success" 
            variant={searchTerm === 'top' ? 'filled' : 'outlined'} 
            onClick={() => setSearchTerm('top')}
          />
          <Chip 
            label={`Moderate (${categoryCounts.moderate})`} 
            color="warning" 
            variant={searchTerm === 'moderate' ? 'filled' : 'outlined'} 
            onClick={() => setSearchTerm('moderate')}
          />
          <Chip 
            label={`Not Recommended (${categoryCounts.reject})`} 
            color="error" 
            variant={searchTerm === 'reject' ? 'filled' : 'outlined'} 
            onClick={() => setSearchTerm('reject')}
          />
          <Chip 
            label={`Unscored (${categoryCounts.unscored})`} 
            color="default" 
            variant={searchTerm === 'unscored' ? 'filled' : 'outlined'} 
            onClick={() => setSearchTerm('unscored')}
          />
        </Box>
        
        {/* Main content */}
        <Paper sx={{ width: '100%', mb: 2, overflow: 'hidden' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
          ) : filteredCandidates.length === 0 ? (
            <Alert severity="info" sx={{ m: 2 }}>No candidates found matching your search criteria.</Alert>
          ) : (
            <Box>
              <Typography variant="subtitle1" sx={{ p: 2, pb: 0 }}>
                Showing {filteredCandidates.length} of {candidates.length} candidates
              </Typography>
              <CandidateTable candidates={filteredCandidates} jobId="" />
            </Box>
          )}
        </Paper>
      </Box>
    </Layout>
  );
}
