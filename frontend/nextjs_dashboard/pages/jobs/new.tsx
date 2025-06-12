/**
 * Create new job page for TalentTriage
 * 
 * This page provides a form for creating new job postings with title,
 * description, required skills, and experience requirements.
 */
import React, { useState } from 'react';
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
  ArrowBack as BackIcon
} from '@mui/icons-material';
import Layout from '@/components/Layout';
import { supabase } from '@/utils/supabase';

/**
 * CreateJob page component
 */
export default function CreateJob() {
  const router = useRouter();
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [minYearsExperience, setMinYearsExperience] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [preferredSkillInput, setPreferredSkillInput] = useState('');
  const [preferredSkills, setPreferredSkills] = useState<string[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Handle adding a required skill
  const handleAddSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };
  
  // Handle removing a required skill
  const handleDeleteSkill = (skillToDelete: string) => {
    setSkills(skills.filter(skill => skill !== skillToDelete));
  };
  
  // Handle adding a preferred skill
  const handleAddPreferredSkill = () => {
    if (preferredSkillInput.trim() && !preferredSkills.includes(preferredSkillInput.trim())) {
      setPreferredSkills([...preferredSkills, preferredSkillInput.trim()]);
      setPreferredSkillInput('');
    }
  };
  
  // Handle removing a preferred skill
  const handleDeletePreferredSkill = (skillToDelete: string) => {
    setPreferredSkills(preferredSkills.filter(skill => skill !== skillToDelete));
  };
  
  // Handle skill input key press (Enter)
  const handleKeyPress = (e: React.KeyboardEvent, isPreferred = false) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isPreferred) {
        handleAddPreferredSkill();
      } else {
        handleAddSkill();
      }
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
      setLoading(true);
      setError(null);
      
      // Create job in database
      const { data, error: insertError } = await supabase
        .from('job')
        .insert({
          title: title.trim(),
          description: description.trim(),
          required_skills: skills,
          preferred_skills: preferredSkills.length > 0 ? preferredSkills : ['None'], // Ensure we never send null
          min_years_experience: minYearsExperience ? parseInt(minYearsExperience) : null
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      // Show success message
      setSuccess(true);
      
      // Redirect to job page after a delay
      setTimeout(() => {
        router.push(`/job/${data.id}`);
      }, 1500);
      
    } catch (err) {
      console.error('Error creating job:', err);
      setError('Failed to create job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Create New Job">
      {/* Back button */}
      <Box sx={{ mb: 3 }}>
        <Button 
          startIcon={<BackIcon />} 
          variant="outlined"
          onClick={() => router.push('/')}
        >
          Back to Dashboard
        </Button>
      </Box>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Create New Job
        </Typography>
        <Divider sx={{ mb: 3 }} />
        
        {/* Success message */}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Job created successfully! Redirecting...
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
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
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
            disabled={loading}
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
            disabled={loading}
            InputProps={{
              inputProps: { min: 0, max: 30 }
            }}
            sx={{ mb: 3 }}
          />
          
          {/* Required Skills */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Required Skills
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <TextField
                fullWidth
                id="skills"
                label="Add Required Skill"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e)}
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        onClick={handleAddSkill}
                        disabled={!skillInput.trim() || loading}
                        size="small"
                        variant="contained"
                        startIcon={<AddIcon />}
                      >
                        Add
                      </Button>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {skills.map((skill) => (
                <Chip
                  key={skill}
                  label={skill}
                  onDelete={() => handleDeleteSkill(skill)}
                  disabled={loading}
                />
              ))}
            </Box>
          </Box>
          
          {/* Preferred Skills */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Preferred Skills
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <TextField
                fullWidth
                id="preferredSkills"
                label="Add Preferred Skill"
                value={preferredSkillInput}
                onChange={(e) => setPreferredSkillInput(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, true)}
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        onClick={handleAddPreferredSkill}
                        disabled={!preferredSkillInput.trim() || loading}
                        size="small"
                        variant="contained"
                        startIcon={<AddIcon />}
                      >
                        Add
                      </Button>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {preferredSkills.map((skill) => (
                <Chip
                  key={skill}
                  label={skill}
                  onDelete={() => handleDeletePreferredSkill(skill)}
                  disabled={loading}
                  color="secondary"
                />
              ))}
            </Box>
            <Typography variant="caption" color="text.secondary">
              Optional: Add skills that are nice-to-have but not required
            </Typography>
          </Box>
          
          {/* Submit button */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            disabled={loading}
            sx={{ mt: 2 }}
          >
            {loading ? 'Creating...' : 'Create Job'}
          </Button>
        </Box>
      </Paper>
    </Layout>
  );
}
