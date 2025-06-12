/**
 * Edit job page for TalentTriage
 * 
 * This page provides a form for editing existing job postings with title,
 * description, required skills, and experience requirements.
 */
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField,
  Button,
  Chip,
  InputAdornment,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import {
  Save as SaveIcon,
  Add as AddIcon,
  ArrowBack as BackIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import Layout from '@/components/Layout';
import { supabase, Job } from '@/utils/supabase';

/**
 * EditJob page component
 */
export default function EditJob() {
  const router = useRouter();
  const { job_id } = router.query;
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [minYearsExperience, setMinYearsExperience] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Fetch job data
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
        
        // Populate form fields
        setTitle(jobData.title || '');
        setDescription(jobData.description || '');
        setMinYearsExperience(jobData.min_years_experience ? jobData.min_years_experience.toString() : '');
        setSkills(jobData.required_skills || []);
        
      } catch (err) {
        console.error('Error fetching job data:', err);
        setError('Failed to load job data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchJobData();
  }, [job_id]);
  
  // Handle adding a skill
  const handleAddSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };
  
  // Handle removing a skill
  const handleDeleteSkill = (skillToDelete: string) => {
    setSkills(skills.filter(skill => skill !== skillToDelete));
  };
  
  // Handle skill input key press (Enter)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill();
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!title.trim()) {
      setError('Job title is required');
      return;
    }
    
    if (!description.trim()) {
      setError('Job description is required');
      return;
    }
    
    if (skills.length === 0) {
      setError('At least one required skill is needed');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      // Update job in database
      const { data, error: updateError } = await supabase
        .from('job')
        .update({
          title: title.trim(),
          description: description.trim(),
          required_skills: skills,
          min_years_experience: minYearsExperience ? parseInt(minYearsExperience) : null
        })
        .eq('id', job_id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      // Show success message
      setSuccess(true);
      
      // Redirect to job page after a delay
      setTimeout(() => {
        router.push(`/job/${job_id}`);
      }, 1500);
      
    } catch (err) {
      console.error('Error updating job:', err);
      setError('Failed to update job. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  // Handle job deletion
  const handleDelete = async () => {
    // Confirm deletion
    if (!window.confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      return;
    }
    
    try {
      setDeleting(true);
      setError(null);
      
      // Delete job from database
      const { error: deleteError } = await supabase
        .from('job')
        .delete()
        .eq('id', job_id);
      
      if (deleteError) throw deleteError;
      
      // Redirect to dashboard
      router.push('/');
      
    } catch (err) {
      console.error('Error deleting job:', err);
      setError('Failed to delete job. Please try again.');
      setDeleting(false);
    }
  };

  return (
    <Layout title="Edit Job">
      {/* Back button */}
      <Box sx={{ mb: 3 }}>
        <Button 
          startIcon={<BackIcon />} 
          variant="outlined"
          onClick={() => router.push(`/job/${job_id}`)}
        >
          Back to Job
        </Button>
      </Box>
      
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h1">
            Edit Job
          </Typography>
          
          {/* Delete button */}
          <Button
            variant="outlined"
            color="error"
            startIcon={deleting ? <CircularProgress size={20} color="error" /> : <DeleteIcon />}
            onClick={handleDelete}
            disabled={loading || saving || deleting}
          >
            Delete Job
          </Button>
        </Box>
        <Divider sx={{ mb: 3 }} />
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Success message */}
            {success && (
              <Alert severity="success" sx={{ mb: 3 }}>
                Job updated successfully! Redirecting...
              </Alert>
            )}
            
            {/* Error message */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}
            
            {/* Job form */}
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                id="title"
                label="Job Title"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={saving}
                sx={{ mb: 3 }}
              />
              
              <TextField
                margin="normal"
                required
                fullWidth
                id="description"
                label="Job Description"
                name="description"
                multiline
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={saving}
                sx={{ mb: 3 }}
                placeholder="Provide a detailed job description including responsibilities, qualifications, and any other relevant information."
              />
              
              <TextField
                margin="normal"
                fullWidth
                id="minYearsExperience"
                label="Minimum Years of Experience"
                name="minYearsExperience"
                type="number"
                value={minYearsExperience}
                onChange={(e) => setMinYearsExperience(e.target.value)}
                disabled={saving}
                InputProps={{
                  inputProps: { min: 0, max: 30 }
                }}
                sx={{ mb: 3 }}
              />
              
              <TextField
                margin="normal"
                fullWidth
                id="skills"
                label="Required Skills"
                name="skills"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={saving}
                placeholder="Type a skill and press Enter"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button 
                        onClick={handleAddSkill}
                        disabled={!skillInput.trim() || saving}
                      >
                        <AddIcon />
                      </Button>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />
              
              {/* Skills chips */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                {skills.map((skill, index) => (
                  <Chip
                    key={index}
                    label={skill}
                    onDelete={() => handleDeleteSkill(skill)}
                    color="primary"
                    variant="outlined"
                    disabled={saving}
                  />
                ))}
                {skills.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No skills added yet. Add at least one required skill.
                  </Typography>
                )}
              </Box>
              
              {/* Submit button */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                disabled={saving || deleting}
                sx={{ mt: 2 }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Layout>
  );
}
